import { Router, Request, Response } from "express";
import prisma from "../db/prisma";
import { CreateCandidateInput, ApiError } from "../types/candidate";

const router = Router();

// ─────────────────────────────────────────────
// POST /candidates
// Cria um novo candidato com status PENDENTE
// ─────────────────────────────────────────────
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { nome, email, cargo, linkedin }: CreateCandidateInput = req.body;

    // Validação dos campos obrigatórios
    const missing: string[] = [];
    if (!nome) missing.push("nome");
    if (!email) missing.push("email");
    if (!cargo) missing.push("cargo");

    if (missing.length > 0) {
      const errorBody: ApiError = {
        error: "Campos obrigatórios ausentes",
        details: `Os seguintes campos são obrigatórios: ${missing.join(", ")}`,
      };
      res.status(400).json(errorBody);
      return;
    }

    // Validação básica de formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const errorBody: ApiError = { error: "Formato de e-mail inválido" };
      res.status(400).json(errorBody);
      return;
    }

    const candidate = await prisma.candidate.create({
      data: {
        nome: nome.trim(),
        email: email.toLowerCase().trim(),
        cargo: cargo.trim(),
        linkedin: linkedin?.trim() ?? null,
        // status e attempts usam os defaults do Prisma: PENDENTE e 0
      },
    });

    res.status(201).json(candidate);
  } catch (err) {
    // Prisma lança P2002 quando há violação de unique constraint (email duplicado)
    if (isPrismaUniqueConstraintError(err)) {
      const errorBody: ApiError = {
        error: "E-mail já cadastrado",
        details: "Já existe um candidato com este endereço de e-mail",
      };
      res.status(409).json(errorBody);
      return;
    }

    console.error("[POST /candidates] Erro inesperado:", err);
    const errorBody: ApiError = { error: "Erro interno do servidor" };
    res.status(500).json(errorBody);
  }
});

// ─────────────────────────────────────────────
// GET /candidates
// Lista todos os candidatos, ordenados por createdAt desc
// ─────────────────────────────────────────────
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const candidates = await prisma.candidate.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(candidates);
  } catch (err) {
    console.error("[GET /candidates] Erro inesperado:", err);
    const errorBody: ApiError = { error: "Erro interno do servidor" };
    res.status(500).json(errorBody);
  }
});

// ─────────────────────────────────────────────
// Helper — type-guard para erro de unique constraint do Prisma
// ─────────────────────────────────────────────
function isPrismaUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as Record<string, unknown>)["code"] === "P2002"
  );
}

export default router;
