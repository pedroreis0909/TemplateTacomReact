// src/hooks/useUploadedFiles.ts
import { useCallback, useEffect, useState } from "react";
import arquivoService, {
  UploadedFile,
  ListUploadedFilesParams,
  LegacyDateRangeParams,
} from "../services/arquivoService";

/**
 * useUploadedFiles
 *
 * Custom hook to manage date-range filters, fetching the uploaded-files list,
 * pagination and loading/error state.
 *
 * Responsibilities:
 * - Maintain current list, pagination (page, pageSize, total), loading and error state.
 * - Expose handlers for submitting filters (both normalized and legacy-style),
 *   changing pages and reloading.
 *
 * Notes / Decisions:
 * - The legacy JSP submitted separate select fields for day/month/year. arquivoService
 *   already accepts both normalized (startDate/endDate) and legacy params; the hook
 *   forwards the received params through to the service. This keeps the hook flexible.
 * - We fetch automatically when page/pageSize/filters change to simplify UI usage
 *   (convenient for pagination controls). Consumers can also call reload() explicitly.
 * - We keep the shape of filters generic (Record<string, any>) because backend may
 *   accept legacy param names or normalized names; arquivoService will normalize when needed.
 *
 * TODO: (REVIEW) If backend returns different pagination keys, adapt data extraction below.
 */

export type DateRangeFilters = ListUploadedFilesParams | LegacyDateRangeParams;

export function useUploadedFiles(initialFilters?: DateRangeFilters, initialPage = 1, initialPageSize = 20) {
  const [items, setItems] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [total, setTotal] = useState<number | undefined>(undefined);

  const [filters, setFilters] = useState<DateRangeFilters | undefined>(initialFilters);

  const fetchList = useCallback(
    async (opts?: { page?: number; pageSize?: number; filters?: DateRangeFilters }) => {
      setLoading(true);
      setError(null);

      const query = {
        ...(opts?.filters ?? filters ?? {}),
        page: opts?.page ?? page,
        pageSize: opts?.pageSize ?? pageSize,
      } as DateRangeFilters;

      try {
        const resp = await arquivoService.listUploadedFiles(query as any);
        // NOTE: arquivoService returns AxiosResponse<PaginatedResponse<UploadedFile[]>>
        // We defensively extract items/total/page/pageSize. Backend may vary.
        const data = resp?.data as any;

        // Defensive guards:
        const receivedItems: UploadedFile[] =
          Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];

        setItems(receivedItems);

        if (typeof data?.total === "number") setTotal(data.total);
        else if (typeof resp?.headers?.["x-total-count"] === "string")
          setTotal(Number(resp.headers["x-total-count"]));
        else setTotal(receivedItems.length);

        // Keep local pagination state consistent with server when provided
        if (typeof data?.page === "number") setPage(data.page);
        if (typeof data?.pageSize === "number") setPageSize(data.pageSize);
      } catch (err: any) {
        // Provide a friendly error message; keep original for diagnostics
        const msg =
          err?.response?.data?.error ||
          err?.message ||
          "Erro ao buscar lista de arquivos. Tente novamente.";
        setError(String(msg));
        // Keep previous items in case UI wants to show them on error
      } finally {
        setLoading(false);
      }
    },
    [filters, page, pageSize]
  );

  // Fetch on mount and whenever page/pageSize/filters change.
  useEffect(() => {
    // We intentionally call fetchList without arguments to use current state.
    fetchList();
  }, [fetchList]);

  // Handler invoked by a filter form submit (accepts either normalized or legacy params).
  const handleFilterSubmit = useCallback(
    async (submittedFilters: DateRangeFilters) => {
      // Reset to first page when filters change
      setFilters(submittedFilters);
      setPage(1);
      await fetchList({ filters: submittedFilters, page: 1, pageSize });
    },
    [fetchList, pageSize]
  );

  const goToPage = useCallback(
    async (newPage: number) => {
      setPage(newPage);
      await fetchList({ page: newPage, pageSize });
    },
    [fetchList, pageSize]
  );

  const nextPage = useCallback(async () => {
    const next = (page ?? 1) + 1;
    await goToPage(next);
  }, [page, goToPage]);

  const prevPage = useCallback(async () => {
    const prev = Math.max(1, (page ?? 1) - 1);
    await goToPage(prev);
  }, [page, goToPage]);

  const changePageSize = useCallback(
    async (newPageSize: number) => {
      setPageSize(newPageSize);
      setPage(1); // pragmatic: return to first page when page size changes
      await fetchList({ page: 1, pageSize: newPageSize });
    },
    [fetchList]
  );

  const reload = useCallback(async () => {
    await fetchList();
  }, [fetchList]);

  const clearFilters = useCallback(async () => {
    setFilters(undefined);
    setPage(1);
    await fetchList({ filters: undefined, page: 1, pageSize });
  }, [fetchList, pageSize]);

  return {
    // data
    items,
    total,
    page,
    pageSize,
    filters,
    // status
    loading,
    error,
    // actions
    handleFilterSubmit,
    setFilters, // direct setter for advanced UIs
    goToPage,
    nextPage,
    prevPage,
    changePageSize,
    reload,
    clearFilters,
  };
}

export default useUploadedFiles;
