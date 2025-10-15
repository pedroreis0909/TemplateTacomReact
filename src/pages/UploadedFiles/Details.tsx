// src/pages/UploadedFiles/Details.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { getUploadedFileById, UploadedFileDetail } from "../../services/arquivoService";

/**
 * Uploaded File Details page
 *
 * Responsibilities:
 * - Read :id from route params
 * - Call getUploadedFileById(id) from arquivoService
 * - Display key fields:
 *   nomearquivo, quantidaderegistro, aptos, semdocumento, comcodigosetps, comerro, uploadedAt, uploadedBy
 * - Handle loading and error states consistent with project styles (Tailwind + existing global styles)
 *
 * Decisions / notes:
 * - We use useParams from "react-router" to match the project's existing imports in routes.
 * - The service returns an AxiosResponse; we extract .data and defensively render fields.
 * - uploadedAt is formatted with toLocaleString for friendly display. If backend returns unexpected shapes,
 *   fields are rendered defensively with fallback '-' values.
 *
 * TODO: (REVIEW) If authentication/redirect behavior is required for 401 responses, handle it at a higher
 *              level (app-level auth guard) so individual pages remain focused on data rendering.
 */

export default function UploadedFileDetailsPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [file, setFile] = useState<UploadedFileDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Defensive: ensure we have an id param
    if (!id) {
      setError("ID do arquivo não fornecido.");
      setFile(null);
      return;
    }

    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const resp = await getUploadedFileById(id);
        if (!mounted) return;
        setFile(resp?.data ?? null);
      } catch (err: any) {
        if (!mounted) return;
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Erro ao carregar detalhes do arquivo.";
        setError(String(msg));
        setFile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [id]);

  const handleBack = () => {
    // Navigate back to uploaded files listing. Use absolute path to be explicit.
    navigate("/uploaded-files");
  };

  // Simple formatter for uploadedAt
  const formatDate = (iso?: string) => {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-teal-800 text-white rounded-md p-4 mb-6">
        <h1 className="text-center text-xl font-semibold">DETALHES DO ARQUIVO</h1>
      </div>

      <div className="mb-4">
        <button
          type="button"
          onClick={handleBack}
          className="px-3 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
        >
          Voltar
        </button>
      </div>

      <div className="bg-white shadow-sm rounded p-4">
        {loading ? (
          <div className="text-center text-gray-600">Carregando detalhes...</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded">
            {String(error)}
          </div>
        ) : !file ? (
          <div className="text-center text-gray-600">Nenhum detalhe disponível para este arquivo.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailRow label="Nome do Arquivo" value={file.nomearquivo ?? "-"} />
              <DetailRow label="Qtd Registro" value={formatNumber(file.quantidaderegistro)} align="right" />
              <DetailRow label="Alunos Reenviados" value={formatNumber(file.aptos)} align="right" />
              <DetailRow label="Sem Documento" value={formatNumber(file.semdocumento)} align="right" />
              <DetailRow label="Com Código SETPS" value={formatNumber(file.comcodigosetps)} align="right" />
              <DetailRow label="Com Erro" value={formatNumber(file.comerro)} align="right" />
              <DetailRow label="Enviado em" value={formatDate(file.uploadedAt)} />
              <DetailRow
                label="Enviado por"
                value={
                  file.uploadedBy
                    ? file.uploadedBy.nome ?? String(file.uploadedBy.id ?? "-")
                    : "-"
                }
              />
            </div>

            {/* Raw JSON for debugging when needed (kept unobtrusive) */}
            <details className="mt-3 text-sm text-gray-700">
              <summary className="cursor-pointer text-indigo-600">Mostrar payload bruto</summary>
              <pre className="mt-2 p-2 bg-gray-100 text-xs rounded overflow-auto">
                {JSON.stringify(file, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * DetailRow
 *
 * Small presentational helper to render a label/value pair consistently.
 * Kept local to avoid creating an extra file for a simple UI piece.
 */
function DetailRow({
  label,
  value,
  align = "left",
}: {
  label: string;
  value: React.ReactNode;
  align?: "left" | "right" | "center";
}) {
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <div className="border rounded p-3 bg-gray-50">
      <div className={`text-xs text-gray-500 mb-1 uppercase tracking-wide ${alignClass}`}>{label}</div>
      <div className={`text-sm font-medium text-gray-800 ${alignClass}`}>{value ?? "-"}</div>
    </div>
  );
}

/* Small utility to format numbers safely */
function formatNumber(n?: number) {
  if (n === null || n === undefined) return "-";
  try {
    return Intl.NumberFormat("pt-BR").format(n);
  } catch {
    return String(n);
  }
}

// TODO: (REVIEW) Consider adding an "Reprocess" action or download link if backend exposes those endpoints.
//       This page intentionally focuses on read-only details to keep migration scope limited.
