import { useState } from "react";
import { CandidateForm } from "./components/CandidateForm";
import { Dashboard } from "./components/Dashboard";
import "./App.css";

/**
 * App.tsx — raiz da aplicação.
 *
 * Estado único relevante: `refreshToken`.
 * Quando o CandidateForm cria um candidato com sucesso, ele chama onCreated(),
 * que incrementa o token. O Dashboard observa esse token via prop e dispara
 * um fetch imediato, sem esperar o próximo ciclo de 3s do polling.
 *
 * Essa abordagem evita elevar o estado dos candidatos para o App:
 * o Dashboard continua sendo dono exclusivo dos dados da lista.
 */
export function App() {
  const [refreshToken, setRefreshToken] = useState(0);

  function handleCandidateCreated() {
    setRefreshToken((prev) => prev + 1);
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-brand">
            <span className="header-logo" aria-hidden="true">⚙️</span>
            <div>
              <h1 className="header-title">Engine Resiliente</h1>
              <p className="header-subtitle">Motor de automações com retry</p>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="layout">
          {/* Coluna esquerda: formulário de cadastro */}
          <aside className="layout-sidebar">
            <CandidateForm onCreated={handleCandidateCreated} />
          </aside>

          {/* Área principal: tabela de candidatos com polling */}
          <section className="layout-content">
            <Dashboard refreshToken={refreshToken} />
          </section>
        </div>
      </main>
    </div>
  );
}
