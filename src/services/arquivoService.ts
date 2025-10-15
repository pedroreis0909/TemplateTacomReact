import api from "./api";
import { AxiosResponse } from "axios";

/**
 * Service module for interacting with backend endpoints related to uploaded files.
 *
 * Notes / Decisions:
 * - The legacy JSP submitted a date range through multiple select fields (inicialdia, inicialmes, inicialano, finaldia, finalmes, finalano).
 *   To keep the frontend simple and modern, this service accepts a normalized date-range shape (ISO strings) or the legacy field set.
 *   Conversion helpers are provided so calling code can pass whichever is more convenient.
 * - We keep the response typing generic (PaginatedResponse) but lightweight because backend contract may evolve.
 * - This module only performs HTTP calls; any UI-level validation/formatting should happen in pages/components.
 */

/* Domain types based on the legacy JSP table columns */
export interface UploadedFile {
  nomearquivo: string;
  quantidaderegistro: number;
  aptos: number;
  semdocumento: number;
  comcodigosetps: number;
  comerro: number;
}

/* Detailed shape for single arquivo resource (may include optional fields returned by backend) */
export interface UploadedFileDetail extends UploadedFile {
  id?: string | number;
  uploadedAt?: string;
  uploadedBy?: {
    id?: string | number;
    nome?: string;
  };
  // Allow backend to return extra fields without breaking callers
  [key: string]: any;
}

/* Pagination wrapper commonly returned by list endpoints */
export interface PaginatedResponse<T> {
  items: T;
  total?: number;
  page?: number;
  pageSize?: number;
  // backend might return different shapes; keep optional fields to be tolerant
}

/* Normalized params for listing uploaded files */
export interface ListUploadedFilesParams {
  startDate?: string; // ISO date: YYYY-MM-DD
  endDate?: string; // ISO date: YYYY-MM-DD
  page?: number;
  pageSize?: number;
  // allow arbitrary extra filters if needed
  [key: string]: any;
}

/* Legacy-style date fields that the old JSP used */
export interface LegacyDateRangeParams {
  inicialdia?: string;
  inicialmes?: string;
  inicialano?: string;
  finaldia?: string;
  finalmes?: string;
  finalano?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Helper: convert legacy date selects into ISO YYYY-MM-DD strings.
 * NOTE: This function is defensive and will return undefined dates if incomplete.
 */
function legacyToNormalized(params: LegacyDateRangeParams): ListUploadedFilesParams {
  const pad = (s?: string) => (s ? s.padStart(2, "0") : undefined);

  const diaI = pad(params.inicialdia);
  const mesI = pad(params.inicialmes);
  const anoI = params.inicialano;
  const diaF = pad(params.finaldia);
  const mesF = pad(params.finalmes);
  const anoF = params.finalano;

  const startDate = anoI && mesI && diaI ? `${anoI}-${mesI}-${diaI}` : undefined;
  const endDate = anoF && mesF && diaF ? `${anoF}-${mesF}-${diaF}` : undefined;

  // Preserve pagination if present
  const result: ListUploadedFilesParams = {
    startDate,
    endDate,
    page: params.page,
    pageSize: params.pageSize,
  };

  return result;
}

/**
 * List uploaded files using the application's API.
 *
 * - Accepts either normalized ListUploadedFilesParams or legacy LegacyDateRangeParams.
 * - Returns the raw AxiosResponse so callers (pages/components) can handle status, headers, etc.
 *
 * Example usage from a React page:
 * const resp = await arquivoService.listUploadedFiles({ startDate: '2023-01-01', endDate: '2023-02-01', page: 1 });
 *
 * TODO: (REVIEW) Confirm backend endpoint path and response shape. Currently using '/arquivos' as a presumed resource path.
 */
export function listUploadedFiles(
  params?: ListUploadedFilesParams | LegacyDateRangeParams
): Promise<AxiosResponse<PaginatedResponse<UploadedFile[]>>> {
  // If legacy-looking params are provided (has inicialdia/inicialmes...), convert them
  const looksLikeLegacy =
    params &&
    (Object.prototype.hasOwnProperty.call(params, "inicialdia") ||
      Object.prototype.hasOwnProperty.call(params, "inicialmes") ||
      Object.prototype.hasOwnProperty.call(params, "inicialano") ||
      Object.prototype.hasOwnProperty.call(params, "finaldia") ||
      Object.prototype.hasOwnProperty.call(params, "finalmes") ||
      Object.prototype.hasOwnProperty.call(params, "finalano"));

  const normalized: ListUploadedFilesParams = looksLikeLegacy
    ? legacyToNormalized(params as LegacyDateRangeParams)
    : ((params as ListUploadedFilesParams) ?? {});

  // Build query params expected by backend. Adjust keys here if backend expects different names.
  const query = {
    startDate: normalized.startDate,
    endDate: normalized.endDate,
    page: normalized.page,
    pageSize: normalized.pageSize,
    // spread any extra filters (keeps this function flexible)
    ...Object.keys(normalized)
      .filter((k) => !["startDate", "endDate", "page", "pageSize"].includes(k))
      .reduce<Record<string, any>>((acc, k) => {
        acc[k] = normalized[k];
        return acc;
      }, {}),
  };

  // NOTE: Endpoint path '/arquivos' is chosen to represent "uploaded files".
  // If backend exposes a different path (e.g. '/listaarquivoscarregados'), update here.
  return api.get<PaginatedResponse<UploadedFile[]>>("/arquivos", { params: query });
}

/* ------------------------------------------------------------------
   Newly added functions: getUploadedFileById, createUploadedFile
   ------------------------------------------------------------------ */

/**
 * Fetch details for a single uploaded file (arquivo) by id.
 *
 * Reasoning/decisions:
 * - We request GET /arquivos/{id} which mirrors the RESTful pattern used elsewhere.
 * - The function returns AxiosResponse<UploadedFileDetail> so callers can access headers/status if needed.
 * - We accept id as string | number to be tolerant to legacy numeric ids or new UUIDs.
 *
 * TODO: (REVIEW) If backend uses a different id path or returns a different field name, adapt here.
 */
export function getUploadedFileById(id: string | number): Promise<AxiosResponse<UploadedFileDetail>> {
  if (id === undefined || id === null || id === "") {
    // Defensive guard: callers should provide a valid id.
    // We throw here so consumers can catch and display meaningful UI feedback; do not convert to a network call.
    return Promise.reject(new Error("Invalid id supplied to getUploadedFileById"));
  }

  // Using template literal to build path; axios will properly encode path segments.
  return api.get<UploadedFileDetail>(`/arquivos/${encodeURIComponent(String(id))}`);
}

/**
 * Upload a new arquivo (multipart/form-data).
 *
 * - Accepts a FormData instance containing file(s) and optional metadata.
 * - Returns the raw AxiosResponse so callers can examine status, headers and response body.
 *
 * Decisions / notes:
 * - Axios automatically sets the multipart boundary when FormData is used; setting Content-Type manually
 *   may strip the boundary in some environments. However some servers expect an explicit header. We keep
 *   the header commented below and rely on Axios default behavior to avoid boundary issues.
 * - We expose an optional config object for upload progress callbacks to enable UI progress bars.
 *
 * Usage example:
 * const fd = new FormData();
 * fd.append('file', fileInput.files[0]);
 * fd.append('origem', 'legacy-ui');
 * await arquivoService.createUploadedFile(fd, { onUploadProgress: (evt) => { ... } });
 *
 * TODO: (REVIEW) If backend expects a JSON metadata field, callers should stringify and append it
 * to the FormData (e.g. fd.append('metadata', JSON.stringify({...}))). Keep validation client-side minimal.
 */
export function createUploadedFile(
  formData: FormData,
  options?: { onUploadProgress?: (progressEvent: ProgressEvent) => void }
): Promise<AxiosResponse<any>> {
  if (!(formData instanceof FormData)) {
    return Promise.reject(new Error("createUploadedFile expects a FormData instance"));
  }

  // Note: Do not manually set 'Content-Type': 'multipart/form-data' because axios/browser
  // will set the correct boundary. If server requires a fixed header, uncomment and adjust.
  return api.post("/arquivos", formData, {
    // headers: { "Content-Type": "multipart/form-data" }, // See note above
    onUploadProgress: options?.onUploadProgress,
  });
}

/* Default export for convenient imports in components/pages */
export default {
  listUploadedFiles,
  getUploadedFileById,
  createUploadedFile,
};
