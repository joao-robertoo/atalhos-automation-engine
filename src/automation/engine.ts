import prisma from "../db/prisma";
import { callExternalApi } from "./simulator";

// ─── Configuração do motor de retry ──────────────────────────────────────────

/** Número máximo de tentativas antes de marcar o candidato como FALHA. */
export const MAX_RETRIES = 3;

/**
 * Base do backoff exponencial em milissegundos.
 * Tentativa 1 → 2 000 ms
 * Tentativa 2 → 4 000 ms
 * Tentativa 3 → 8 000 ms
 *
 * Fórmula: BASE_BACKOFF_MS * 2^(attempts)
 */
const BASE_BACKOFF_MS = 2_000;

// ─── Helpers de log ───────────────────────────────────────────────────────────

function log(candidateId: string, message: string): void {
  const ts = new Date().toISOString();
  console.log(`[Engine][${ts}][${candidateId}] ${message}`);
}

// ─── Cálculo do backoff ───────────────────────────────────────────────────────

/**
 * Calcula o intervalo de espera antes da próxima tentativa.
 *
 * A fórmula é backoff exponencial binário:
 *   delay = BASE_BACKOFF_MS × 2^attempts
 *
 * Exemplos com BASE_BACKOFF_MS = 2 000:
 *   attempts = 0  →  2 000 ms  (2 s)   ← primeira falha, agenda retry 1
 *   attempts = 1  →  4 000 ms  (4 s)   ← retry 1 falhou, agenda retry 2
 *   attempts = 2  →  8 000 ms  (8 s)   ← retry 2 falhou, agenda retry 3
 */
function calcBackoffMs(attempts: number): number {
  return BASE_BACKOFF_MS * Math.pow(2, attempts);
}

// ─── Motor principal ──────────────────────────────────────────────────────────

/**
 * Executa a automação para o candidato informado, com retry automático.
 *
 * Fluxo:
 * 1. Marca o candidato como PROCESSANDO no banco.
 * 2. Chama a API externa simulada (pode falhar ~60% das vezes).
 * 3a. Sucesso → marca SUCESSO e encerra.
 * 3b. Falha + attempts < MAX_RETRIES → incrementa attempts, agenda retry
 *     após backoff exponencial via setTimeout (não bloqueia nada).
 * 3c. Falha + attempts >= MAX_RETRIES → marca FALHA e encerra.
 *
 * Esta função é SEMPRE chamada sem await pelo chamador (fire-and-forget),
 * portanto ela gerencia seu próprio ciclo de vida assíncrono via setTimeout.
 *
 * @param candidateId - ID do candidato a processar
 * @param currentAttempts - Número de tentativas já realizadas (padrão 0)
 */
export async function runAutomation(
  candidateId: string,
  currentAttempts = 0
): Promise<void> {
  log(candidateId, `Iniciando tentativa ${currentAttempts + 1}/${MAX_RETRIES}`);

  // ── Passo 1: marcar como PROCESSANDO ─────────────────────────────────────
  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: "PROCESSANDO", attempts: currentAttempts },
  });

  // ── Passo 2: chamar a API externa simulada ────────────────────────────────
  const result = await callExternalApi();

  // ── Passo 3a: sucesso ─────────────────────────────────────────────────────
  if (result.ok) {
    log(
      candidateId,
      `✅ Sucesso na tentativa ${currentAttempts + 1} (${result.durationMs}ms)`
    );
    await prisma.candidate.update({
      where: { id: candidateId },
      data: { status: "SUCESSO" },
    });
    return;
  }

  // ── Passo 3b/3c: falha ────────────────────────────────────────────────────
  const nextAttempts = currentAttempts + 1;

  log(
    candidateId,
    `❌ Falha [${result.errorType}] na tentativa ${currentAttempts + 1} ` +
      `(${result.durationMs}ms). attempts agora: ${nextAttempts}`
  );

  if (nextAttempts < MAX_RETRIES) {
    // ── Passo 3b: ainda tem tentativas — agendar retry com backoff ──────────
    const backoffMs = calcBackoffMs(nextAttempts);

    log(
      candidateId,
      `⏳ Agendando retry ${nextAttempts + 1}/${MAX_RETRIES} em ${backoffMs}ms`
    );

    await prisma.candidate.update({
      where: { id: candidateId },
      data: { attempts: nextAttempts },
    });

    // setTimeout é não-bloqueante: registra o callback no event loop e
    // retorna imediatamente. Nenhuma thread fica suspensa esperando.
    setTimeout(() => {
      // A chamada recursiva cria uma nova Promise que corre de forma
      // independente — erros nela são capturados pelo .catch interno.
      runAutomation(candidateId, nextAttempts).catch((err: unknown) => {
        console.error(
          `[Engine][${candidateId}] Erro não tratado no retry:`,
          err
        );
      });
    }, backoffMs);
  } else {
    // ── Passo 3c: esgotou tentativas — marcar FALHA ─────────────────────────
    log(
      candidateId,
      `🔴 Máximo de tentativas atingido (${MAX_RETRIES}). Marcando como FALHA.`
    );

    await prisma.candidate.update({
      where: { id: candidateId },
      data: { status: "FALHA", attempts: nextAttempts },
    });
  }
}
