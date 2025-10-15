// src/pages/UploadedFiles/index.tsx
import React, { useMemo, useState } from "react";
import FileTable from "../../components/FileTable/FileTable";
import useUploadedFiles, { DateRangeFilters } from "../../hooks/useUploadedFiles";
import { UploadedFile } from "../../services/arquivoService";
import UploadFileForm from "../../components/UploadFileForm/UploadFileForm";
import { Link } from "react-router";

/**
 * UploadedFiles page
 *
 * Migration notes / decisions:
 * - The legacy JSP submitted separate selects for day/month/year (inicialdia, inicialmes, inicialano,
 *   finaldia, finalmes, finalano). The existing useUploadedFiles hook accepts either normalized
 *   or legacy-shaped filters, so we keep the legacy field names when calling handleFilterSubmit().
 * - For years we generate a reasonable range around the current year (current - 10 .. current + 1).
 * - Pagination: the hook drives fetching; FileTable expects page and totalPages. We compute totalPages
 *   defensively from total/pageSize when available, otherwise fall back to items length.
 * - Close button uses window.close() to preserve legacy behavior. In typical SPAs this may not close
 *   the tab if it wasn't opened by script; that's acceptable and matches simple migration goals.
 *
 * Updates in this migration:
 * - Import and render UploadFileForm so users can upload files from this page.
 * - Add a link renderer for the "nomearquivo" column to navigate to the Details page (/uploaded-files/:id).
 *   We attempt to use item.id when available; if not present we fall back to encoding the filename in the path.
 *   // TODO: (REVIEW) Prefer numeric/UUID id from backend. Using nomearquivo as fallback maintains navigability
 *   // but Details page expects a valid id — backend should ensure list items include an id for robust routing.
 * - Trigger a list reload when upload succeeds by calling reload() from useUploadedFiles hook.
 *
 * TODOs:
 * - If backend does not provide id in list responses, consider updating list endpoint to include id,
 *   or change details route to accept filename-based lookups on the backend.
 */

function range(start: number, end: number) {
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

const days = range(1, 31).map((d) => ({ value: String(d).padStart(2, "0"), label: String(d) }));
const months = range(1, 12).map((m) => ({ value: String(m).padStart(2, "0"), label: String(m) }));
const currentYear = new Date().getFullYear();
const years = range(currentYear - 10, currentYear + 1).map((y) => ({ value: String(y), label: String(y) }));

export default function UploadedFilesPage(): JSX.Element {
  // Use custom hook to manage fetching/pagination
  const {
    items,
    total,
    page,
    pageSize,
    loading,
    error,
    handleFilterSubmit,
    goToPage,
    reload, // used to refresh list after successful upload
  } = useUploadedFiles(undefined, 1, 20);

  // Local form state for legacy-style selects
  const [inicialdia, setInicialdia] = useState<string | "">("");
  const [inicialmes, setInicialmes] = useState<string | "">("");
  const [inicialano, setInicialano] = useState<string | "">("");
  const [finaldia, setFinaldia] = useState<string | "">("");
  const [finalmes, setFinalmes] = useState<string | "">("");
  const [finalano, setFinalano] = useState<string | "">("");

  // Compute totalPages defensively
  const totalPages = useMemo(() => {
    if (typeof total === "number" && pageSize > 0) return Math.max(1, Math.ceil(total / pageSize));
    if (Array.isArray(items)) return Math.max(1, Math.ceil(items.length / pageSize));
    return 1;
  }, [total, items, pageSize]);

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const filters: DateRangeFilters = {
      // only include non-empty values to keep query lean
      ...(inicialdia ? { inicialdia } : {}),
      ...(inicialmes ? { inicialmes } : {}),
      ...(inicialano ? { inicialano } : {}),
      ...(finaldia ? { finaldia } : {}),
      ...(finalmes ? { finalmes } : {}),
      ...(finalano ? { finalano } : {}),
    };

    // TODO: (REVIEW) We intentionally forward legacy-shaped fields to the hook/service because
    // arquivoService provides conversion helpers. If backend expects normalized startDate/endDate,
    // the service will convert for us.
    await handleFilterSubmit(filters);
  };

  const handlePageChange = (newPage: number) => {
    // Delegate to hook's paginator
    goToPage(newPage);
  };

  // Handler invoked when an upload succeeds in the UploadFileForm component.
  // We call reload() so the table refreshes and shows newly uploaded files.
  const handleUploadSuccess = (response?: any) => {
    // TODO: (REVIEW) Could show a toast/snackbar with response message if needed.
    // Trigger a reload of the list to reflect the newly uploaded file.
    reload && reload();
  };

  const columns = useMemo(
    () => [
      {
        key: "nomearquivo",
        title: "Nome do Arquivo",
        // Render the filename as a link to details page. Use id when available, otherwise fall back to encoded filename.
        render: (item: any) => {
          // Decision: some backends may not return an `id` in the list payload.
          // We prefer using item.id; using the filename as fallback preserves navigation but may fail in the details API.
          const targetId = item?.id ?? item?.nomearquivo;
          // NOTE: encodeURIComponent to keep paths safe if using filename fallback.
          const path = `/uploaded-files/${encodeURIComponent(String(targetId))}`;
          return (
            <Link to={path} className="text-indigo-600 hover:underline">
              {item?.nomearquivo ?? "-"}
            </Link>
          );
        },
      },
      { key: "quantidaderegistro", title: "Qtd Registro", align: "right" as const },
      { key: "aptos", title: "Alunos Reenviados", align: "right" as const },
      { key: "semdocumento", title: "Sem Documento", align: "right" as const },
      { key: "comcodigosetps", title: "Com Código SETPS", align: "right" as const },
      { key: "comerro", title: "Com Erro", align: "right" as const },
    ],
    []
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-teal-800 text-white rounded-md p-4 mb-6">
        <h1 className="text-center text-xl font-semibold">LISTA DE ARQUIVOS CARREGADOS</h1>
      </div>

      {/* Upload form: allow users to upload a file and refresh list on success */}
      <div className="bg-white shadow-sm rounded p-4 mb-6">
        <h2 className="text-lg font-medium mb-3">Enviar novo arquivo</h2>
        <UploadFileForm
          submitLabel="Enviar arquivo"
          onSuccess={handleUploadSuccess}
        />
      </div>

      <form
        onSubmit={onSubmit}
        className="bg-white shadow-sm rounded p-4 mb-6"
        aria-label="Formulário de seleção de período"
      >
        <div className="text-center text-yellow-700 font-medium mb-4">
          Selecione um período:
        </div>

        <div className="flex flex-wrap gap-2 justify-center items-end mb-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-700">De</label>
            <select
              className="border rounded px-2 py-1"
              value={inicialdia}
              onChange={(e) => setInicialdia(e.target.value)}
              aria-label="Dia inicial"
            >
              <option value="">Dia</option>
              {days.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>

            <select
              className="border rounded px-2 py-1"
              value={inicialmes}
              onChange={(e) => setInicialmes(e.target.value)}
              aria-label="Mês inicial"
            >
              <option value="">Mês</option>
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <select
              className="border rounded px-2 py-1"
              value={inicialano}
              onChange={(e) => setInicialano(e.target.value)}
              aria-label="Ano inicial"
            >
              <option value="">Ano</option>
              {years.map((y) => (
                <option key={y.value} value={y.value}>
                  {y.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-700">À</label>
            <select
              className="border rounded px-2 py-1"
              value={finaldia}
              onChange={(e) => setFinaldia(e.target.value)}
              aria-label="Dia final"
            >
              <option value="">Dia</option>
              {days.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>

            <select
              className="border rounded px-2 py-1"
              value={finalmes}
              onChange={(e) => setFinalmes(e.target.value)}
              aria-label="Mês final"
            >
              <option value="">Mês</option>
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <select
              className="border rounded px-2 py-1"
              value={finalano}
              onChange={(e) => setFinalano(e.target.value)}
              aria-label="Ano final"
            >
              <option value="">Ano</option>
              {years.map((y) => (
                <option key={y.value} value={y.value}>
                  {y.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Consultando..." : "Consultar"}
          </button>

          <button
            type="button"
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
            onClick={() => window.close()}
          >
            Fechar
          </button>
        </div>
      </form>

      <div className="mb-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded">
            {String(error)}
          </div>
        )}
      </div>

      <div className="bg-white shadow-sm rounded p-4">
        <FileTable
          items={(items as UploadedFile[]) ?? []}
          page={page ?? 1}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          columns={columns}
          caption="Lista de arquivos carregados"
          data-testid="uploaded-files-table"
        />
      </div>
    </div>
  );
}
