// src/pages/ListarArquivos/index.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import PeriodSelector from "../../components/PeriodSelector";
import FileTable from "../../components/FileTable";
import useSession from "../../hooks/useSession";
import { getArquivos, type Arquivo } from "../../services/arquivoService";

/**
 * ListarArquivos page
 *
 * Responsibilities:
 * - Guard access using useSession() to replicate legacy JSP checks.
 * - Render PeriodSelector for the user to choose a date range.
 * - On submit, call arquivoService.getArquivos and display results in FileTable.
 * - Provide a "Fechar" action that attempts to close the window (keeps legacy behavior).
 *
 * Updates:
 * - Row click navigates to detail page `/arquivos/{id}` when an identifier is available.
 * - Added "Novo Arquivo" button linking to `/arquivos/novo` so users can create resources from the list.
 *
 * Notes / decisions:
 * - We attempt to extract the id from the Arquivo._raw payload (common legacy keys such as codigoarquivo, id, codigo).
 *   If no id is found we show a console warning and a small user alert instead of navigating.
 *   TODO: (REVIEW) If backend starts returning normalized ids in the top-level Arquivo shape, prefer that instead of _raw.
 */
export default function ListarArquivosPage(): JSX.Element {
  const { user, shouldRedirectToLogin } = useSession();
  const navigate = useNavigate();

  // Redirect to login if session is not valid (mirrors legacy JSP behavior).
  useEffect(() => {
    if (shouldRedirectToLogin) {
      // TODO: (REVIEW) Adjust route if the application uses a different login path.
      window.location.href = "/login";
    }
  }, [shouldRedirectToLogin]);

  // Full dataset returned from backend for the current filter
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination (client-side)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;

  // When new data arrives reset to first page
  useEffect(() => {
    setCurrentPage(1);
  }, [arquivos]);

  // Compute paged items for FileTable
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return arquivos.slice(start, start + pageSize);
  }, [arquivos, currentPage]);

  // Helper: convert ISO yyyy-mm-dd to legacy Period shape
  const isoToLegacyPeriod = (iso: string) => {
    const parts = iso.split("-");
    // Defensive: if malformed, return zeros which will likely yield no results
    if (parts.length !== 3) {
      return { dia: "01", mes: "01", ano: String(new Date().getFullYear()) };
    }
    return { dia: parts[2], mes: parts[1], ano: parts[0] };
  };

  // Called when PeriodSelector emits a validated range
  const handlePeriodSubmit = async (range: { start: string; end: string }) => {
    setError(null);
    setLoading(true);
    try {
      const start = isoToLegacyPeriod(range.start);
      const end = isoToLegacyPeriod(range.end);

      // Legacy param names expected by backend are built inside the service; here we call it with its Period shape.
      const period = {
        inicialDia: start.dia,
        inicialMes: start.mes,
        inicialAno: start.ano,
        finalDia: end.dia,
        finalMes: end.mes,
        finalAno: end.ano,
      } as unknown as Parameters<typeof getArquivos>[0];

      const items = await getArquivos(period as any);
      setArquivos(items);
    } catch (err: unknown) {
      // Present a friendly error message while preserving the original exception for debugging in console
      // TODO: (ENHANCEMENT) integrate application toast/notification system
      console.error("Erro ao consultar arquivos:", err);
      setError("Falha ao buscar arquivos. Tente novamente mais tarde.");
      setArquivos([]);
    } finally {
      setLoading(false);
    }
  };

  // Extract identifier from Arquivo item (we rely on the raw payload for legacy keys).
  const extractIdFromArquivo = (a: Arquivo): string | null => {
    // The normalized Arquivo shape does not include an id; legacy servers often returned it in the raw object.
    const raw = (a as any)._raw ?? (a as any);
    if (!raw || typeof raw !== "object") return null;

    const candidateKeys = [
      "codigoarquivo",
      "codigo",
      "id",
      "codigoArquivo",
      "codigo_arquivo",
      "codigoArquivo",
    ];

    for (const k of candidateKeys) {
      if (k in raw && raw[k] != null) return String(raw[k]);
      const found = Object.keys(raw).find((rk) => rk.toLowerCase() === k.toLowerCase());
      if (found && raw[found] != null) return String(raw[found]);
    }

    return null;
  };

  // Row click handler: navigate to detail page if id is available
  const handleRowClick = (arquivo: Arquivo) => {
    const id = extractIdFromArquivo(arquivo);
    if (id) {
      // Use client-side navigation to detail route
      navigate(`/arquivos/${encodeURIComponent(String(id))}`);
    } else {
      // Decision: do not navigate to a detail without id. Surface minimal feedback.
      // TODO: (REVIEW) Consider opening a modal with details or navigating to a "create" flow if appropriate.
      console.warn("Não foi possível encontrar ID para o arquivo selecionado:", arquivo);
      // Minimal user-facing feedback to avoid silent failure
      // eslint-disable-next-line no-alert
      alert("ID do arquivo não disponível. Não é possível abrir o detalhe.");
    }
  };

  // "Fechar" action mirrors legacy window.close(); keep as-is
  const handleFechar = () => {
    // In many browsers window.close() only works for windows opened via script.
    // Still attempt to close to keep parity with legacy UI.
    window.close();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 bg-slate-800 text-white rounded p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">SalvadorCARD</h1>
          <div className="mt-2 text-sm">
            {/* Show user name like legacy: usuario.getNome() */}
            {user?.nome ? <div>Usuário: <strong>{user.nome}</strong></div> : null}
          </div>
        </div>

        <div className="flex gap-2 items-center">
          {/* "Novo Arquivo" button: navigates to creation page */}
          <button
            type="button"
            onClick={() => navigate("/arquivos/novo")}
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
          >
            Novo Arquivo
          </button>

          <button
            type="button"
            onClick={handleFechar}
            className="px-4 py-2 border rounded bg-white hover:bg-slate-100"
          >
            Fechar
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="mb-2">
            <span className="text-sm text-amber-600 font-medium">
              Selecione um período:
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-start md:gap-6">
            <div>
              <PeriodSelector onSubmit={handlePeriodSubmit} />
            </div>

            <div className="mt-4 md:mt-0 flex flex-col gap-2 items-start">
              {/* The "Fechar" control is duplicated here for legacy parity in UI; kept for compatibility */}
              <button
                type="button"
                onClick={handleFechar}
                className="px-4 py-2 border rounded bg-white hover:bg-slate-100"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2">
            <span className="text-sm text-white bg-slate-700 px-2 py-1 rounded">
              LISTA DE ARQUIVOS CARREGADOS
            </span>
          </div>

          <div className="bg-white p-4 rounded shadow-sm">
            {loading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : error ? (
              <div className="text-center text-red-600 py-4">{error}</div>
            ) : arquivos.length === 0 ? (
              <div className="text-center text-slate-600 py-8">
                Sem arquivos para exibir.
              </div>
            ) : (
              <FileTable
                arquivos={pagedItems}
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={arquivos.length}
                onPageChange={(p) => setCurrentPage(p)}
                onRowClick={handleRowClick}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
