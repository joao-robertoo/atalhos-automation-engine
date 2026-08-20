import { useState, useEffect, type FormEvent, type ChangeEvent } from "react";
import { createCandidate, extractApiError } from "../api/client";
import type { CreateCandidatePayload } from "../types/candidate";
import "./CandidateForm.css";

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface FormState {
  nome: string;
  email: string;
  cargo: string;
  linkedin: string;
}

interface FieldErrors {
  nome?: string;
  email?: string;
  cargo?: string;
}

const EMPTY_FORM: FormState = { nome: "", email: "", cargo: "", linkedin: "" };

// ─── Helpers de validação client-side ────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.nome.trim()) errors.nome = "Nome é obrigatório";
  if (!form.email.trim()) {
    errors.email = "E-mail é obrigatório";
  } else if (!EMAIL_REGEX.test(form.email)) {
    errors.email = "Formato de e-mail inválido";
  }
  if (!form.cargo.trim()) errors.cargo = "Cargo é obrigatório";
  return errors;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CandidateFormProps {
  /** Chamado após criação bem-sucedida para que o Dashboard atualize a lista */
  onCreated: () => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function CandidateForm({ onCreated }: CandidateFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Some as mensagens de feedback (erro ou sucesso) sozinhas após 5 segundos
  useEffect(() => {
    if (!apiError && !success) return;
    const timer = setTimeout(() => {
      setApiError(null);
      setSuccess(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [apiError, success]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Limpa o erro do campo conforme o usuário digita
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setApiError(null);
    setSuccess(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Validação client-side
    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    setApiError(null);

    try {
      const payload: CreateCandidatePayload = {
        nome: form.nome.trim(),
        email: form.email.trim(),
        cargo: form.cargo.trim(),
        ...(form.linkedin.trim() ? { linkedin: form.linkedin.trim() } : {}),
      };

      await createCandidate(payload);

      setForm(EMPTY_FORM);
      setFieldErrors({});
      setSuccess(true);
      onCreated(); // dispara refetch imediato no Dashboard
    } catch (err) {
      setApiError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="form-card" aria-labelledby="form-title">
      <h2 id="form-title" className="form-title">
        Cadastrar Candidato
      </h2>

      <form onSubmit={handleSubmit} noValidate className="candidate-form">
        {/* Nome */}
        <div className="field-group">
          <label htmlFor="nome">Nome *</label>
          <input
            id="nome"
            name="nome"
            type="text"
            value={form.nome}
            onChange={handleChange}
            placeholder="Ex: Ana Souza"
            aria-invalid={!!fieldErrors.nome}
            aria-describedby={fieldErrors.nome ? "nome-error" : undefined}
            disabled={loading}
          />
          {fieldErrors.nome && (
            <span id="nome-error" className="field-error" role="alert">
              {fieldErrors.nome}
            </span>
          )}
        </div>

        {/* E-mail */}
        <div className="field-group">
          <label htmlFor="email">E-mail *</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Ex: ana@empresa.com"
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            disabled={loading}
          />
          {fieldErrors.email && (
            <span id="email-error" className="field-error" role="alert">
              {fieldErrors.email}
            </span>
          )}
        </div>

        {/* Cargo */}
        <div className="field-group">
          <label htmlFor="cargo">Cargo *</label>
          <input
            id="cargo"
            name="cargo"
            type="text"
            value={form.cargo}
            onChange={handleChange}
            placeholder="Ex: Desenvolvedor Full Stack"
            aria-invalid={!!fieldErrors.cargo}
            aria-describedby={fieldErrors.cargo ? "cargo-error" : undefined}
            disabled={loading}
          />
          {fieldErrors.cargo && (
            <span id="cargo-error" className="field-error" role="alert">
              {fieldErrors.cargo}
            </span>
          )}
        </div>

        {/* LinkedIn (opcional) */}
        <div className="field-group">
          <label htmlFor="linkedin">LinkedIn (opcional)</label>
          <input
            id="linkedin"
            name="linkedin"
            type="url"
            value={form.linkedin}
            onChange={handleChange}
            placeholder="https://linkedin.com/in/ana"
            disabled={loading}
          />
        </div>

        {/* Feedback da API */}
        {apiError && (
          <div className="alert alert--error" role="alert">
            {apiError}
          </div>
        )}
        {success && (
          <div className="alert alert--success" role="status">
            ✅ Candidato cadastrado! A automação foi disparada em background.
          </div>
        )}

        <button
          type="submit"
          className="btn btn--primary"
          disabled={loading}
          id="submit-candidate"
        >
          {loading ? "Enviando…" : "Cadastrar"}
        </button>
      </form>
    </section>
  );
}