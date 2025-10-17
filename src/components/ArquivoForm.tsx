// src/components/ArquivoForm.tsx
import React, { useState } from "react";
import type { ArquivoDto } from "../services/arquivoService";
import { create as createArquivo } from "../services/arquivoService";

interface ArquivoFormProps {
  /**
   * Optional initial values to pre-fill the form when creating.
   * Useful for reusing the form for "clone" flows or quick edits before create.
   */
  initialValues?: Partial<ArquivoDto>;

  /**
   * Callback invoked after successful creation with the created DTO returned from the server.
   */
  onCreated?: (created: ArquivoDto) => void;

  /**
   * Optional: whether to clear the form after successful creation (default: true).
   */
  clearOnSuccess?: boolean;
}

/**
 * ArquivoForm
 *
 * Small reusable creation form for Arquivo resources.
 *
 * Responsibilities:
 * - Provide inputs for the common ArquivoDto fields used by the app (nomearquivo and numeric counters).
 * - Perform basic client-side validation (required nomearquivo, numeric fields >= 0).
 * - Submit to arquivoService.create and show success / error feedback.
 *
 * Decisions / notes:
 * - We intentionally do not surface codigoarquivo since the server should generate it on create;
 *   the legacy service enforced codigoarquivo must be null on create. We omit it from request payload.
 *
 * - Numeric inputs use type="number" to provide native browser affordances; we still validate on submit
 *   to ensure integer & non-negative values. Inputs allow empty string to indicate "unset" and default to 0 on submit.
 *
 * - The component is designed to be "controlled" internally but lightweight to reuse in pages or modals.
 *
 * TODO: (REVIEW) If the API returns structured validation errors, consider mapping them to field-level messages.
 */
export default function ArquivoForm({
  initialValues,
  onCreated,
  clearOnSuccess = true,
}: ArquivoFormProps) {
  // Form fields (keep names matching legacy DTO keys for clarity)
  const [nomearquivo, setNomearquivo] = useState<string>(
    String(initialValues?.nomearquivo ?? "")
  );
  const [quantidaderegistro, setQuantidaderegistro] = useState<string>(
    initialValues?.quantidaderegistro != null
      ? String(initialValues.quantidaderegistro)
      : "0"
  );
  const [aptos, setAptos] = useState<string>(
    initialValues?.aptos != null ? String(initialValues.aptos) : "0"
  );
  const [semdocumento, setSemdocumento] = useState<string>(
    initialValues?.semdocumento != null
      ? String(initialValues.semdocumento)
      : "0"
  );
  const [comcodigosetps, setComcodigosetps] = useState<string>(
    initialValues?.comcodigosetps != null
      ? String(initialValues.comcodigosetps)
      : "0"
  );
  const [comerro, setComerro] = useState<string>(
    initialValues?.comerro != null ? String(initialValues.comerro) : "0"
  );

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Field-level validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Helper to parse numeric inputs to integer >= 0
  const parseNonNegInt = (v: string) => {
    if (v === "" || v == null) return 0;
    const n = Number(v);
    if (!Number.isFinite(n)) return NaN;
    // Accept floats by flooring to integer to be forgiving; legacy UI used integers.
    return Math.max(0, Math.floor(n));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!nomearquivo || nomearquivo.trim().length === 0) {
      errs.nomearquivo = "Nome do arquivo é obrigatório.";
    } else if (nomearquivo.trim().length < 2) {
      errs.nomearquivo = "Informe um nome de arquivo mais descritivo.";
    }

    const qr = parseNonNegInt(quantidaderegistro);
    if (Number.isNaN(qr)) errs.quantidaderegistro = "Qtd Registro deve ser um número válido.";
    const a = parseNonNegInt(aptos);
    if (Number.isNaN(a)) errs.aptos = "Aptos deve ser um número válido.";
    const sd = parseNonNegInt(semdocumento);
    if (Number.isNaN(sd)) errs.semdocumento = "Sem Documento deve ser um número válido.";
    const ccs = parseNonNegInt(comcodigosetps);
    if (Number.isNaN(ccs)) errs.comcodigosetps = "Com Código SETPS deve ser um número válido.";
    const ce = parseNonNegInt(comerro);
    if (Number.isNaN(ce)) errs.comerro = "Com Erro deve ser um número válido.";

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const resetForm = () => {
    setNomearquivo("");
    setQuantidaderegistro("0");
    setAptos("0");
    setSemdocumento("0");
    setComcodigosetps("0");
    setComerro("0");
    setFieldErrors({});
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!validate()) {
      return;
    }

    // Build DTO for create. Note: codigoarquivo should be null/omitted on create per legacy rules.
    const payload: Partial<ArquivoDto> = {
      nomearquivo: nomearquivo.trim(),
      // numeric fields -> ensure numbers
      quantidaderegistro: parseNonNegInt(quantidaderegistro),
      aptos: parseNonNegInt(aptos),
      semdocumento: parseNonNegInt(semdocumento),
      comcodigosetps: parseNonNegInt(comcodigosetps),
      comerro: parseNonNegInt(comerro),
    };

    setLoading(true);
    try {
      const created = await createArquivo(payload);
      // Provide user feedback
      setSuccessMessage("Arquivo criado com sucesso.");
      setErrorMessage(null);
      // Notify parent if provided
      onCreated?.(created);

      // Optionally clear the form for fresh create flow
      if (clearOnSuccess) {
        resetForm();
      }

      // TODO: (REVIEW) The legacy backend returned Location header and created DTO; here we just display message.
      // If additional UX is required (navigate to detail view), parent can handle via onCreated callback.
    } catch (err: unknown) {
      // Surface helpful message while preserving original error in console for debugging.
      // TODO: (ENHANCEMENT) Map structured server-side validation errors to fieldErrors if present.
      // e.g. if error.response.data includes violations, iterate and setFieldErrors accordingly.
      console.error("Failed to create Arquivo:", err);
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Erro desconhecido ao criar arquivo.";
      setErrorMessage(String(msg));
      setSuccessMessage(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
      className="bg-white p-4 rounded shadow-sm max-w-xl"
      aria-live="polite"
    >
      <h2 className="text-lg font-semibold mb-3">Criar novo Arquivo</h2>

      {successMessage && (
        <div className="mb-3 p-2 bg-emerald-100 text-emerald-800 rounded">{successMessage}</div>
      )}
      {errorMessage && (
        <div className="mb-3 p-2 bg-red-100 text-red-800 rounded">{errorMessage}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium mb-1" htmlFor="nomearquivo">
            Nome do arquivo
          </label>
          <input
            id="nomearquivo"
            type="text"
            value={nomearquivo}
            onChange={(ev) => setNomearquivo(ev.target.value)}
            className="w-full px-3 py-2 border rounded text-sm"
            placeholder="Ex: envio_2025-10-01.txt"
            aria-invalid={!!fieldErrors.nomearquivo}
            aria-describedby={fieldErrors.nomearquivo ? "nomearquivo-error" : undefined}
            required
          />
          {fieldErrors.nomearquivo && (
            <div id="nomearquivo-error" className="text-sm text-red-600 mt-1">
              {fieldErrors.nomearquivo}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="quantidaderegistro">
            Qtd Registro
          </label>
          <input
            id="quantidaderegistro"
            type="number"
            min={0}
            step={1}
            value={quantidaderegistro}
            onChange={(ev) => setQuantidaderegistro(ev.target.value)}
            className="w-full px-3 py-2 border rounded text-sm"
            aria-invalid={!!fieldErrors.quantidaderegistro}
            aria-describedby={
              fieldErrors.quantidaderegistro ? "quantidaderegistro-error" : undefined
            }
          />
          {fieldErrors.quantidaderegistro && (
            <div id="quantidaderegistro-error" className="text-sm text-red-600 mt-1">
              {fieldErrors.quantidaderegistro}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="aptos">
            Aptos
          </label>
          <input
            id="aptos"
            type="number"
            min={0}
            step={1}
            value={aptos}
            onChange={(ev) => setAptos(ev.target.value)}
            className="w-full px-3 py-2 border rounded text-sm"
            aria-invalid={!!fieldErrors.aptos}
            aria-describedby={fieldErrors.aptos ? "aptos-error" : undefined}
          />
          {fieldErrors.aptos && (
            <div id="aptos-error" className="text-sm text-red-600 mt-1">
              {fieldErrors.aptos}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="semdocumento">
            Sem Documento
          </label>
          <input
            id="semdocumento"
            type="number"
            min={0}
            step={1}
            value={semdocumento}
            onChange={(ev) => setSemdocumento(ev.target.value)}
            className="w-full px-3 py-2 border rounded text-sm"
            aria-invalid={!!fieldErrors.semdocumento}
            aria-describedby={fieldErrors.semdocumento ? "semdocumento-error" : undefined}
          />
          {fieldErrors.semdocumento && (
            <div id="semdocumento-error" className="text-sm text-red-600 mt-1">
              {fieldErrors.semdocumento}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="comcodigosetps">
            Com Código SETPS
          </label>
          <input
            id="comcodigosetps"
            type="number"
            min={0}
            step={1}
            value={comcodigosetps}
            onChange={(ev) => setComcodigosetps(ev.target.value)}
            className="w-full px-3 py-2 border rounded text-sm"
            aria-invalid={!!fieldErrors.comcodigosetps}
            aria-describedby={fieldErrors.comcodigosetps ? "comcodigosetps-error" : undefined}
          />
          {fieldErrors.comcodigosetps && (
            <div id="comcodigosetps-error" className="text-sm text-red-600 mt-1">
              {fieldErrors.comcodigosetps}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="comerro">
            Com Erro
          </label>
          <input
            id="comerro"
            type="number"
            min={0}
            step={1}
            value={comerro}
            onChange={(ev) => setComerro(ev.target.value)}
            className="w-full px-3 py-2 border rounded text-sm"
            aria-invalid={!!fieldErrors.comerro}
            aria-describedby={fieldErrors.comerro ? "comerro-error" : undefined}
          />
          {fieldErrors.comerro && (
            <div id="comerro-error" className="text-sm text-red-600 mt-1">
              {fieldErrors.comerro}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
        >
          {loading ? "Criando..." : "Criar Arquivo"}
        </button>

        <button
          type="button"
          onClick={() => {
            resetForm();
          }}
          className="px-4 py-2 border rounded bg-white hover:bg-slate-50"
          disabled={loading}
        >
          Limpar
        </button>
      </div>
    </form>
  );
}
