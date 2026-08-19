import {
  AutomationResult,
  AutomationSuccess,
  AutomationFailure,
  ExternalApiErrorType,
} from "../types/candidate";

// ─── Configuração ─────────────────────────────────────────────────────────────

/** Probabilidade de FALHA da API simulada (0–1). 0.6 = 60% de falha. */
const FAILURE_RATE = 0.6;

/** Latência mínima simulada (ms). */
const MIN_LATENCY_MS = 1_000;

/** Latência máxima simulada (ms). */
const MAX_LATENCY_MS = 2_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Retorna uma Promise que resolve após `ms` milissegundos.
 * Simula a latência de rede de uma chamada real.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sorteia um inteiro aleatório entre min e max (inclusive).
 */
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Simulador ────────────────────────────────────────────────────────────────

/**
 * Simula uma chamada a uma API externa instável.
 *
 * Comportamento:
 * - Aguarda entre MIN_LATENCY_MS e MAX_LATENCY_MS para simular latência real.
 * - Falha em aproximadamente FAILURE_RATE (60%) das chamadas.
 * - Quando falha, alterna aleatoriamente entre SERVER_ERROR (HTTP 500)
 *   e RATE_LIMITED (HTTP 429), permitindo distinguir os tipos de erro
 *   nos logs e em futuras estratégias de retry diferenciado.
 *
 * @returns AutomationResult — união discriminada (ok: true | ok: false)
 */
export async function callExternalApi(): Promise<AutomationResult> {
  const start = Date.now();

  // Simula latência de rede
  const latency = randomBetween(MIN_LATENCY_MS, MAX_LATENCY_MS);
  await delay(latency);

  const durationMs = Date.now() - start;

  // Decide se esta tentativa falha
  const shouldFail = Math.random() < FAILURE_RATE;

  if (!shouldFail) {
    const result: AutomationSuccess = { ok: true, durationMs };
    return result;
  }

  // Alterna aleatoriamente entre os dois tipos de erro simulados
  const errorType: ExternalApiErrorType =
    Math.random() < 0.5 ? "SERVER_ERROR" : "RATE_LIMITED";

  const result: AutomationFailure = { ok: false, errorType, durationMs };
  return result;
}
