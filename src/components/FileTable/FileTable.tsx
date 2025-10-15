// src/components/FileTable/FileTable.tsx
import React from "react";
import { UploadedFile } from "../../services/arquivoService";

export type Column<T = any> = {
  key: string;
  title: string;
  /**
   * Optional custom renderer for the cell. If not provided, the component will
   * stringify the value at item[key].
   */
  render?: (item: T) => React.ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
};

export type FileTableProps = {
  items: UploadedFile[];
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  columns: Column<UploadedFile>[];
  /**
   * Optional label for accessibility (used as table caption)
   */
  caption?: string;
  /**
   * Optional test id for automated tests
   */
  "data-testid"?: string;
};

/**
 * FileTable
 *
 * Reusable, accessible table component for displaying uploaded files with simple pagination.
 *
 * Decisions / Notes:
 * - We accept a flexible columns prop so the caller can control which fields to show and
 *   supply custom renderers when needed (e.g. formatting numbers or adding links).
 * - The component uses semantic table elements (<table>, <thead>, <tbody>) for accessibility.
 * - Pagination is simple: previous / page buttons / next. We limit visible page buttons to a max
 *   (default 5) and center the current page when possible.
 * - Styling uses Tailwind utility classes (project includes Tailwind). Keep classes minimal so
 *   pages can override or extend via wrapper styles.
 * - We avoid coupling to any global state or routing; parent components drive data fetching and
 *   supply the items / page / totalPages / onPageChange callback.
 *
 * TODO: (REVIEW) Consider exposing pageSize and totalItems so this component can show "Showing X of Y".
 */
const MAX_PAGE_BUTTONS = 5;

function clampPage(p: number, total: number) {
  if (Number.isNaN(p) || p < 1) return 1;
  if (p > total) return total || 1;
  return p;
}

/**
 * Compute an array of page numbers to render given current and total pages.
 * Tries to center the current page within MAX_PAGE_BUTTONS when possible.
 */
function getPageRange(current: number, total: number, maxButtons = MAX_PAGE_BUTTONS) {
  const safeTotal = Math.max(1, total);
  const safeCurrent = clampPage(current, safeTotal);

  if (safeTotal <= maxButtons) {
    return Array.from({ length: safeTotal }, (_, i) => i + 1);
  }

  const half = Math.floor(maxButtons / 2);
  let start = safeCurrent - half;
  let end = safeCurrent + half;

  if (start < 1) {
    start = 1;
    end = maxButtons;
  } else if (end > safeTotal) {
    end = safeTotal;
    start = safeTotal - maxButtons + 1;
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

const FileTable: React.FC<FileTableProps> = ({
  items,
  page,
  totalPages,
  onPageChange,
  columns,
  caption = "Lista de arquivos carregados",
  "data-testid": dataTestId,
}) => {
  const safePage = clampPage(page, totalPages);

  const handlePrev = () => {
    if (safePage > 1) onPageChange(safePage - 1);
  };

  const handleNext = () => {
    if (safePage < Math.max(1, totalPages)) onPageChange(safePage + 1);
  };

  const handleGoTo = (p: number) => {
    const np = clampPage(p, totalPages);
    if (np !== safePage) onPageChange(np);
  };

  const pageRange = getPageRange(safePage, totalPages);

  return (
    <div className="w-full" data-testid={dataTestId}>
      <div className="overflow-x-auto">
        <table
          className="min-w-full divide-y divide-gray-200 bg-white text-sm"
          role="table"
          aria-label={caption}
        >
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider ${
                    col.className ?? ""
                  }`}
                >
                  <div
                    className={
                      col.align === "center"
                        ? "text-center"
                        : col.align === "right"
                        ? "text-right"
                        : "text-left"
                    }
                  >
                    {col.title}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {items.length === 0 ? (
              <tr>
                <td colSpan={Math.max(1, columns.length)} className="px-3 py-4 text-center text-sm text-gray-500">
                  Sem arquivos para exibir.
                </td>
              </tr>
            ) : (
              items.map((item, rowIndex) => (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  {columns.map((col) => {
                    const content = col.render ? col.render(item) : (item as any)[col.key];
                    return (
                      <td
                        key={col.key}
                        className={`px-3 py-2 align-top text-sm text-gray-800 ${col.className ?? ""}`}
                        role="cell"
                      >
                        <div
                          className={
                            col.align === "center"
                              ? "text-center"
                              : col.align === "right"
                              ? "text-right"
                              : "text-left"
                          }
                        >
                          {content ?? "-"}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <nav
        className="mt-3 flex items-center justify-between space-x-2"
        role="navigation"
        aria-label="Pagination"
      >
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={safePage <= 1}
            aria-disabled={safePage <= 1}
            className={`inline-flex items-center px-3 py-1.5 border rounded text-sm ${
              safePage <= 1
                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Anterior
          </button>

          <div className="hidden sm:flex items-center text-sm text-gray-600">
            Página <span className="mx-2 font-medium">{safePage}</span> de <span className="font-medium">{Math.max(1, totalPages)}</span>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {/* Page number buttons (visible on wider screens) */}
          <div className="hidden sm:flex items-center space-x-1">
            {pageRange.length > 0 && (
              <>
                {pageRange[0] > 1 && (
                  <>
                    <PageButton page={1} current={safePage} onClick={handleGoTo} />
                    {pageRange[0] > 2 && <span className="px-2 text-sm text-gray-500">…</span>}
                  </>
                )}

                {pageRange.map((p) => (
                  <PageButton key={p} page={p} current={safePage} onClick={handleGoTo} />
                ))}

                {pageRange[pageRange.length - 1] < totalPages && (
                  <>
                    {pageRange[pageRange.length - 1] < totalPages - 1 && <span className="px-2 text-sm text-gray-500">…</span>}
                    <PageButton page={totalPages} current={safePage} onClick={handleGoTo} />
                  </>
                )}
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={safePage >= Math.max(1, totalPages)}
            aria-disabled={safePage >= Math.max(1, totalPages)}
            className={`inline-flex items-center px-3 py-1.5 border rounded text-sm ${
              safePage >= Math.max(1, totalPages)
                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Próximo
          </button>
        </div>
      </nav>
    </div>
  );
};

export default FileTable;

/**
 * Small internal page button component used by FileTable.
 * Kept simple and accessible.
 */
function PageButton({
  page,
  current,
  onClick,
}: {
  page: number;
  current: number;
  onClick: (p: number) => void;
}) {
  const isCurrent = page === current;
  return (
    <button
      type="button"
      onClick={() => onClick(page)}
      aria-current={isCurrent ? "page" : undefined}
      className={`px-3 py-1 rounded text-sm border ${
        isCurrent
          ? "bg-indigo-600 text-white border-indigo-600"
          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
      }`}
    >
      {page}
    </button>
  );
}

// TODO: (REVIEW) If consumers need server-driven page size or total items, consider
// adding props like pageSize and totalItems so the component can display "Mostrando X de Y".
// TODO: (REVIEW) Provide a lightweight skeleton variant for loading states if required by pages.
