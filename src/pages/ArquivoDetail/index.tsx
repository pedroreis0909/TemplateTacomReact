// src/pages/ArquivoDetail/index.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import useSession from "../../hooks/useSession";
import { getById } from "../../services/arquivoService";
import type { ArquivoDto } from "../../services/arquivoService";

/**
 * ArquivoDetail page
 *
 * Responsibilities:
 * - Guard access using useSession() to replicate legacy JSP checks.
 * - Read route param ":id" and fetch the Arquivo via arquivoService.getById.
 * - Render a readable, defensive view of the Arquivo fields for the user.
 *
 * Notes / decisions:
 * - We use window.location.href to redirect to /login when session is invalid to remain
 *   consistent with other pages in the codebase that avoid coupling to a specific router instance.
 * - The backend may return DTOs with inconsistent key casing/variants (legacy). To be defensive
 *   we attempt several common key names (both Portuguese and camelCase variants) when rendering.
 * - We intentionally avoid importing internal mapping helpers from arquivoService (mapToArquivo)
 *   to keep this component lightweight and focused on presentation; instead we use a small local
 *   helper to extract and normalize values for display.
 * - If the resource is not found or an error occurs during fetch, we present a friendly message
 *   and an action to go back to the previous page.
 * - TODO: (REVIEW) If the app standardizes on react-router navigation (useNavigate), convert redirects
 *   and back actions to client-side navigation to avoid full page reloads.
 */

export default function ArquivoDetailPage(): JSX.Element {
  const { user, shouldRedirectToLogin } = useSession();
  const params = useParams<{ id?: string }>();

  const [arquivo, setArquivo] = useState<ArquivoDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Guard: mirror legacy behavior by redirecting to /login when the session is invalid.
  useEffect(() => {
    if (shouldRedirectToLogin) {
      window.location.href = "/login";
    }
  }, [shouldRedirectToLogin]);

  // Fetch the Arquivo when id is present
  useEffect(() => {
    const id = params.id;
    if (!id) {
      setError("ID do arquivo não fornecido.");
      setLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const dto = await getById(id);
        if (!mounted) return;
        setArquivo(dto ?? null);
      } catch (err: unknown) {
        console.error("Erro ao buscar arquivo por id:", err);
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === "string"
            ? err
            : "Falha ao buscar arquivo.";
        if (mounted) setError(String(msg));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [params.id]);

  // Defensive helpers to read possibly-variant keys from the DTO
  const getString = (dto: ArquivoDto | null, keys: string[], fallback = "—") => {
    if (!dto) return fallback;
    for (const k of keys) {
      if (k in dto && dto[k] != null) {
        const v = dto[k];
        if (typeof v === "string") return v;
        if (typeof v === "number") return String(v);
        // for other shapes attempt JSON stringify (rare)
        try {
          return JSON.stringify(v);
        } catch {
          return String(v);
        }
      }
      // case-insensitive search
      const foundKey = Object.keys(dto).find((objK) => objK.toLowerCase() === k.toLowerCase());
      if (foundKey && dto[foundKey] != null) {
        const v = dto[foundKey];
        if (typeof v === "string") return v;
        if (typeof v === "number") return String(v);
        try {
          return JSON.stringify(v);
        } catch {
          return String(v);
        }
      }
    }
    return fallback;
  };

  const getNumber = (dto: ArquivoDto | null, keys: string[]) => {
    const s = getString(dto, keys, "0");
    // strip non-digits and parse as integer for display
    const cleaned = String(s).replace(/[^\d-]+/g, "");
    const n = parseInt(cleaned, 10);
    return Number.isFinite(n) ? n : 0;
  };

  // Render helpers
  const renderRow = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4 py-2 border-b last:border-b-0">
      <div className="text-sm text-slate-600">{label}</div>
      <div className="text-sm font-medium text-slate-900">{value}</div>
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 bg-slate-800 text-white rounded p-4">
        <h1 className="text-xl font-semibold">Detalhes do Arquivo</h1>
        <div className="mt-2 text-sm">
          {user?.nome ? <div>Usuário: <strong>{user.nome}</strong></div> : null}
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow-sm">
        {loading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-600 mb-4">{error}</div>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="px-4 py-2 border rounded bg-white hover:bg-slate-50"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  // retry fetch by reloading the page; keeps logic simple and consistent
                  window.location.reload();
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        ) : !arquivo ? (
          <div className="text-center py-8">Arquivo não encontrado.</div>
        ) : (
          <>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Resumo</h2>
              <p className="text-sm text-slate-600">Informações básicas do arquivo carregado.</p>
            </div>

            <div className="divide-y">
              {/*
                Field selection:
                - codigoarquivo (id)
                - nomearquivo
                - quantidaderegistro
                - aptos
                - semdocumento
                - comcodigosetps
                - comerro
                We attempt multiple common key variants for each field to be robust against legacy naming.
              */}

              {renderRow(
                "ID (codigoarquivo)",
                getString(arquivo, ["codigoarquivo", "codigoArquivo", "id", "codigo"]) || "—"
              )}
              {renderRow(
                "Nome do arquivo (nomearquivo)",
                getString(arquivo, [
                  "nomearquivo",
                  "nomeArquivo",
                  "nome_arquivo",
                  "nome",
                ], "—")
              )}
              {renderRow(
                "Qtd Registro (quantidaderegistro)",
                getNumber(arquivo, ["quantidaderegistro", "quantidadeRegistro", "quantidade_registro"])
              )}
              {renderRow(
                "Aptos (aptos)",
                getNumber(arquivo, ["aptos"])
              )}
              {renderRow(
                "Sem Documento (semdocumento)",
                getNumber(arquivo, ["semdocumento", "semDocumento", "sem_documento"])
              )}
              {renderRow(
                "Com Código SETPS (comcodigosetps)",
                getNumber(arquivo, ["comcodigosetps", "comCodigoSetps", "com_codigo_setps"])
              )}
              {renderRow(
                "Com Erro (comerro)",
                getNumber(arquivo, ["comerro", "comErro", "erros", "com_erros"])
              )}

              {/* Show raw JSON for debugging if available (collapsible would be nicer, keep simple for now) */}
              <div className="pt-3">
                <div className="text-sm text-slate-600 mb-2">Dados brutos (raw):</div>
                <pre className="text-xs bg-slate-50 p-3 rounded overflow-x-auto">
                  {JSON.stringify(arquivo, null, 2)}
                </pre>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="px-4 py-2 border rounded bg-white hover:bg-slate-50"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={() => {
                  // Navigate to the legacy list page to mirror other pages' behaviors
                  window.location.href = "/listaarquivoscarregados";
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
              >
                Ir para lista
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
