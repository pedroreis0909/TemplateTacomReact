// src/components/FileTable.tsx
import React, { useMemo } from "react";
import type { Arquivo } from "../services/arquivoService";

interface FileTableProps {
  arquivos: Arquivo[];
  // Pagination state (presentational component doesn't fetch)
  currentPage: number; // 1-based
  pageSize: number;
  totalItems?: number; // optional: if not provided we derive from arquivos.length
  onPageChange: (page: number) => void;
  // Optional callback when a row is clicked (keeps component flexible)
  onRowClick?: (arquivo: Arquivo) => void;
}

/**
 * FileTable
 *
 * Presentational component that renders a paginated table of arquivos.
 *
 * Columns (headers use the legacy Portuguese names for familiarity):
 * - nomearquivo
 * - quantidaderegistro
 * - aptos
 * - semdocumento
 * - comcodigosetps
 * - comerro
 *
 * Notes / decisions:
 * - The frontend normalizes backend items to the `Arquivo` interface (camelCased).
 *   We therefore render using Arquivo fields (nomeArquivo, quantidadeRegistro, ...).
 *   Header labels intentionally use the legacy keys to make migration traceability easier.
 *
 * - This component is intentionally "dumb": it receives arquivos for the current page,
 *   pagination metadata and a onPageChange handler. It does not perform data fetching.
 *
 * - Pagination UI renders previous/next and a small page window. We avoid showing
 *   all pages when there are many pages to keep the control compact.
 *
 * - Accessibility: table uses semantic elements and buttons have aria-labels.
 *
 * TODO: (REVIEW) If the backend later returns large totals and requires jump-to-page /
 *        direct page input, consider adding a "go to page" input and page size selector.
 */
export default function FileTable({
  arquivos,
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onRowClick,
}: FileTableProps) {
  const total = totalItems ?? arquivos.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Clamp current page to valid range for UI safety
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  // Decide which page numbers to show (windowed)
  const pageWindow = 5;
  const pages = useMemo(() => {
    const half = Math.floor(pageWindow / 2);
    let start = Math.max(1, safeCurrentPage - half);
    let end = Math.min(totalPages, start + pageWindow - 1);
    // adjust start if we're at the end
    start = Math.max(1, end - pageWindow + 1);
    const arr: number[] = [];
    for (let p = start; p <= end; p++) arr.push(p);
    return arr;
  }, [safeCurrentPage, totalPages]);

  const formatNumber = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="w-full overflow-x-auto bg-white rounded shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-800 text-white">
          <tr>
            <th className="px-3 py-2 font-medium">Nome do Arquivo (nomearquivo)</th>
            <th className="px-3 py-2 font-medium">Qtd Registro (quantidaderegistro)</th>
            <th className="px-3 py-2 font-medium">Alunos Reenviados (aptos)</th>
            <th className="px-3 py-2 font-medium">Sem Documento (semdocumento)</th>
            <th className="px-3 py-2 font-medium">Com Código SETPS (comcodigosetps)</th>
            <th className="px-3 py-2 font-medium">Com Erro (comerro)</th>
          </tr>
        </thead>

        <tbody>
          {arquivos.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-6 text-center text-slate-600">
                Sem arquivos para exibir.
              </td>
            </tr>
          ) : (
            arquivos.map((a, idx) => {
              // NOTE: Arquivo properties are camelCased; legacy headers are shown above for traceability.
              // TODO: (REVIEW) Consider making row key a stable id if backend provides one.
              const key = a.nomeArquivo ?? `${idx}-${String(a._raw ?? "")}`;
              return (
                <tr
                  key={key}
                  className={idx % 2 === 0 ? "bg-slate-50" : "bg-white"}
                >
                  <td
                    className="px-3 py-2 text-slate-900 hover:underline cursor-pointer"
                    onClick={() => onRowClick?.(a)}
                    role={onRowClick ? "button" : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                        onRowClick(a);
                      }
                    }}
                  >
                    {a.nomeArquivo || "—"}
                  </td>

                  <td className="px-3 py-2 text-slate-700">
                    {formatNumber(a.quantidadeRegistro ?? 0)}
                  </td>

                  <td className="px-3 py-2 text-slate-700">
                    {formatNumber(a.aptos ?? 0)}
                  </td>

                  <td className="px-3 py-2 text-slate-700">
                    {formatNumber(a.semDocumento ?? 0)}
                  </td>

                  <td className="px-3 py-2 text-slate-700">
                    {formatNumber(a.comCodigoSetps ?? 0)}
                  </td>

                  <td className="px-3 py-2 text-slate-700">
                    {formatNumber(a.comErro ?? 0)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Pagination controls */}
      <div className="flex items-center justify-between px-3 py-2 border-t bg-slate-50">
        <div className="text-xs text-slate-600">
          {/* Show summary: items range and total */}
          {total === 0 ? (
            "0 arquivos"
          ) : (
            <>
              Mostrando{" "}
              <span className="font-medium">
                {(safeCurrentPage - 1) * pageSize + 1}
              </span>{" "}
              -{" "}
              <span className="font-medium">
                {Math.min(safeCurrentPage * pageSize, total)}
              </span>{" "}
              de <span className="font-medium">{total}</span> arquivos
            </>
          )}
        </div>

        <nav className="flex items-center gap-2" aria-label="Paginação">
          <button
            className="px-3 py-1 rounded border bg-white text-sm disabled:opacity-50"
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage <= 1}
            aria-label="Página anterior"
          >
            Anterior
          </button>

          {/* If first page isn't in window, show first + ellipsis */}
          {pages[0] > 1 && (
            <>
              <button
                className="px-2 py-1 rounded text-sm border bg-white"
                onClick={() => onPageChange(1)}
                aria-label={`Ir para página 1`}
              >
                1
              </button>
              {pages[0] > 2 && <span className="px-2 text-sm">…</span>}
            </>
          )}

          {pages.map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === safeCurrentPage ? "page" : undefined}
              className={`px-3 py-1 rounded text-sm border ${
                p === safeCurrentPage
                  ? "bg-amber-600 text-white"
                  : "bg-white text-slate-700"
              }`}
            >
              {p}
            </button>
          ))}

          {/* If last page isn't in window, show ellipsis + last */}
          {pages[pages.length - 1] < totalPages && (
            <>
              {pages[pages.length - 1] < totalPages - 1 && (
                <span className="px-2 text-sm">…</span>
              )}
              <button
                className="px-2 py-1 rounded text-sm border bg-white"
                onClick={() => onPageChange(totalPages)}
                aria-label={`Ir para página ${totalPages}`}
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            className="px-3 py-1 rounded border bg-white text-sm disabled:opacity-50"
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage >= totalPages}
            aria-label="Próxima página"
          >
            Próximo
          </button>
        </nav>
      </div>
    </div>
  );
}
