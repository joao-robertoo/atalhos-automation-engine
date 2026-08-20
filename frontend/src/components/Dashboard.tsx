import {
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { listCandidates, retryCandidate, extractApiError } from "../api/client";
import type { Candidate, AutomationStatus } from "../types/candidate";
import "./Dashboard.css";

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Intervalo de polling em ms. 3 000 = 3 segundos. */
const POLL_INTERVAL_MS = 3_000;

// ─── Mapa de labels e variantes visuais por status ───────────────────────────

const STATUS_LABELS: Record<AutomationStatus, string> = {
  PENDENTE: "Pendente",
  PROCESSANDO: "Processando",
  SUCESSO: "Sucesso",
  FALHA: "Falha",
};

const STATUS_VARIANT: Record<AutomationStatus, string> = {
  PENDENTE: "badge--gray",
  PROCESSANDO: "badge--blue",
  SUCESSO: "badge--green",
  FALHA: "badge--red",
};

// ─── Sub-componente: Badge de status ─────────────────────────────────────────

function StatusBadge({ status }: { status: AutomationStatus }): ReactNode {
  return (
    <span className={`badge ${STATUS_VARIANT[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DashboardProps {
  /**
   * Versão externa que força um refetch imediato.
   * O App incrementa esse valor ao criar um candidato com sucesso,
   * e o useEffect do Dashboard reage recarregando a lista.
   */
  refreshToken: number;
}

// ─── Componente principal ────────────────────────────────────────────────────

export function Dashboard({ refreshToken }: DashboardProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

  // ── Fetch da lista ──────────────────────────────────────────────────────────
  const fetchCandidates = useCallback(async () => {
    try {
      const data = await listCandidates();
      setCandidates(data);
      setError(null);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Polling: busca ao montar, depois a cada POLL_INTERVAL_MS ──────────────
  // O refreshToken funciona como "sinal externo": qualquer mudança no seu
  // valor dispara um fetch imediato além do ciclo normal do polling.
  useEffect(() => {
    fetchCandidates();

    const intervalId = setInterval(fetchCandidates, POLL_INTERVAL_MS);

    // Cleanup: cancela o interval quando o componente desmonta ou
    // quando fetchCandidates muda (o que na prática não acontece).
    return () => clearInterval(intervalId);
  }, [fetchCandidates, refreshToken]);

  // ── Retry manual ────────────────────────────────────────────────────────────
  async function handleRetry(id: string) {
    setRetryingIds((prev) => new Set(prev).add(id));
    try {
      await retryCandidate(id);
      // Refetch imediato para refletir o novo status (PENDENTE/PROCESSANDO)
      await fetchCandidates();
    } catch (err) {
      // Erro pontual — exibe no console sem derrubar a tabela inteira
      console.error(`[Dashboard] Erro ao reprocessar ${id}:`, extractApiError(err));
    } finally {
      setRetryingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  // ── Renderização ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <section className="dashboard" aria-labelledby="dashboard-title">
        <h2 id="dashboard-title" className="dashboard-title">Candidatos</h2>
        <div className="dashboard-state">
          <div className="spinner" aria-label="Carregando…" />
          <p>Carregando candidatos…</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="dashboard" aria-labelledby="dashboard-title">
        <h2 id="dashboard-title" className="dashboard-title">Candidatos</h2>
        <div className="dashboard-state dashboard-state--error" role="alert">
          <p>⚠️ Não foi possível carregar os candidatos.</p>
          <p className="error-detail">{error}</p>
          <button className="btn btn--ghost" onClick={fetchCandidates}>
            Tentar novamente
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard" aria-labelledby="dashboard-title">
      <header className="dashboard-header">
        <h2 id="dashboard-title" className="dashboard-title">
          Candidatos
          <span className="candidate-count">{candidates.length}</span>
        </h2>
        <p className="dashboard-hint">Atualiza automaticamente a cada 3s</p>
      </header>

      {candidates.length === 0 ? (
        <div className="dashboard-state">
          <p>Nenhum candidato cadastrado ainda.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="candidates-table" aria-label="Lista de candidatos">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">E-mail</th>
                <th scope="col">Cargo</th>
                <th scope="col">Status</th>
                <th scope="col">Tentativas</th>
                <th scope="col">Ação</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.id} className={c.status === "FALHA" ? "row--failed" : ""}>
                  <td className="cell--name">{c.nome}</td>
                  <td className="cell--email">{c.email}</td>
                  <td>{c.cargo}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="cell--center">{c.attempts}</td>
                  <td className="cell--action">
                    {c.status === "FALHA" && (
                      <button
                        id={`retry-${c.id}`}
                        className="btn btn--danger-ghost"
                        onClick={() => handleRetry(c.id)}
                        disabled={retryingIds.has(c.id)}
                        aria-label={`Reprocessar candidato ${c.nome}`}
                      >
                        {retryingIds.has(c.id) ? "…" : "Reprocessar"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
