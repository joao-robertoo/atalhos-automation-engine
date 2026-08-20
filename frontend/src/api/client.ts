import axios, { AxiosError } from "axios";
import type {
  Candidate,
  CreateCandidatePayload,
  ApiErrorResponse,
} from "../types/candidate";

// ─── Instância do Axios ───────────────────────────────────────────────────────

/**
 * Instância configurada para apontar ao proxy do Vite (/api → localhost:3000).
 * Em produção, trocar baseURL para o endereço real do back-end.
 */
const http = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 10_000,
});

// ─── Helper de erro ───────────────────────────────────────────────────────────

/**
 * Extrai a mensagem de erro da resposta da API ou de uma falha de rede.
 * Garante que o chamador sempre receba uma string legível, sem depender de `any`.
 */
export function extractApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<ApiErrorResponse>;
    const data = axiosErr.response?.data;
    if (data?.details) return `${data.error}: ${data.details}`;
    if (data?.error) return data.error;
    return axiosErr.message;
  }
  if (err instanceof Error) return err.message;
  return "Erro desconhecido";
}

// ─── Funções de API ───────────────────────────────────────────────────────────

/**
 * POST /candidates
 * Cria um novo candidato. O back-end responde 201 com o candidato criado
 * (status PENDENTE) e dispara a automação em background.
 */
export async function createCandidate(
  data: CreateCandidatePayload
): Promise<Candidate> {
  const response = await http.post<Candidate>("/candidates", data);
  return response.data;
}

/**
 * GET /candidates
 * Retorna todos os candidatos ordenados por createdAt desc.
 */
export async function listCandidates(): Promise<Candidate[]> {
  const response = await http.get<Candidate[]>("/candidates");
  return response.data;
}

/**
 * POST /candidates/:id/retry
 * Força nova tentativa de automação para um candidato com status FALHA.
 * O back-end retorna 202 com { message }. Não devolve o candidato atualizado —
 * quem chama esta função deve buscar a lista novamente (ex: fetchCandidates)
 * para refletir o novo status.
 */
export async function retryCandidate(id: string): Promise<void> {
  await http.post(`/candidates/${id}/retry`);
}