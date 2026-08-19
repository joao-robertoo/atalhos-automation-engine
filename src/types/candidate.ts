/**
 * União de literais representando os status possíveis.
 * SQLite não suporta enum nativo do Prisma, então validamos
 * esse conjunto de valores aqui, na camada TypeScript.
 */
export type AutomationStatus = "PENDENTE" | "PROCESSANDO" | "SUCESSO" | "FALHA";

/**
 * Espelho TypeScript do model Candidate do Prisma.
 * Tipagem explícita — sem uso de `any` em nenhum ponto da aplicação.
 */
export interface Candidate {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  linkedin: string | null;
  status: AutomationStatus;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payload esperado no body do POST /candidates.
 * Campos opcionais têm `?`; obrigatórios são explicitamente requeridos.
 */
export interface CreateCandidateInput {
  nome: string;
  email: string;
  cargo: string;
  linkedin?: string;
}

/**
 * Shape padrão de uma resposta de erro da API.
 */
export interface ApiError {
  error: string;
  details?: string;
}