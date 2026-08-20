// ─── Enums e tipos primitivos ─────────────────────────────────────────────────

/**
 * Status possíveis de uma automação — espelho exato do enum do back-end.
 * Usar um union literal (em vez de enum TypeScript) é mais idiomático em
 * projetos React/Vite e preserva a compatibilidade com JSON sem conversão.
 */
export type AutomationStatus =
  | "PENDENTE"
  | "PROCESSANDO"
  | "SUCESSO"
  | "FALHA";

// ─── Entidades ────────────────────────────────────────────────────────────────

/**
 * Candidato retornado pela API — todos os campos do banco, sem omissões.
 * Datas chegam como string ISO 8601 no JSON; convertemos apenas quando necessário.
 */
export interface Candidate {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  linkedin: string | null;
  status: AutomationStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Payloads de request ──────────────────────────────────────────────────────

/**
 * Body enviado no POST /candidates.
 * linkedin é opcional — ausente ou undefined não é incluído no payload JSON.
 */
export interface CreateCandidatePayload {
  nome: string;
  email: string;
  cargo: string;
  linkedin?: string;
}

// ─── Respostas de erro da API ─────────────────────────────────────────────────

/**
 * Shape do corpo de erro retornado pelo back-end em respostas 4xx/5xx.
 */
export interface ApiErrorResponse {
  error: string;
  details?: string;
}
