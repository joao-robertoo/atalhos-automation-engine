import cors from "cors";
import express, { Application, Request, Response, NextFunction } from "express";
import candidatesRouter from "./routes/candidates";
import { ApiError } from "./types/candidate";

const app: Application = express();
app.use(cors());
const PORT = process.env.PORT ?? 3000;

// ─── Middlewares globais ─────────────────────────────────────────────────────
app.use(express.json()); // Parseia bodies JSON nas requisições

// ─── Rotas ───────────────────────────────────────────────────────────────────
app.use("/candidates", candidatesRouter);

// Rota de health check — útil para verificar que o servidor está de pé
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Handler 404 — rota não encontrada ───────────────────────────────────────
app.use((_req: Request, res: Response) => {
  const body: ApiError = { error: "Rota não encontrada" };
  res.status(404).json(body);
});

// ─── Handler de erros globais ─────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Global Error Handler]", err);
  const body: ApiError = {
    error: "Erro interno do servidor",
    details: process.env.NODE_ENV !== "production" ? err.message : undefined,
  };
  res.status(500).json(body);
});

// ─── Inicialização ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Engine Resiliente rodando em http://localhost:${PORT}`);
  console.log(`   → POST /candidates   (criar candidato)`);
  console.log(`   → GET  /candidates   (listar candidatos)`);
  console.log(`   → GET  /health       (health check)`);
});

export default app;
