/**
 * Placeholder module documenting the legacy ArquivoController endpoints, expected
 * request/response shapes and integration notes for the backend team.
 *
 * Location: src/services/legacy/ArquivoController.placeholder.ts
 *
 * Purpose:
 * - Serve as a single-source-of-truth documentation artifact in the frontend
 *   codebase explaining how the legacy JSP/Controller interacted with the backend.
 * - Provide TypeScript interfaces for the expected request and response shapes
 *   so frontend developers can integrate with the backend when it is implemented.
 * - Offer example curl requests and important notes (auth, encoding, pagination).
 *
 * Important:
 * - This file originally contained a throwing placeholder. It now attempts to call
 *   the legacy endpoint using the shared `api` axios instance so the frontend can
 *   perform real requests during integration testing or development.
 *
 * - The function remains a "placeholder" in the sense that it documents expectations
 *   and defensive response handling, but it performs a real network request instead
 *   of throwing immediately.
 *
 * TODOs / Decisions:
 * - TODO: (REVIEW) We document GET /listaarquivoscarregados with query params
 *   because the legacy frontend used an HTML form and forwarded to that action.
 *   If backend requires POST (form data) instead, adjust frontend calls accordingly.
 * - TODO: (BACKEND) Ensure the response encoding is UTF-8 by default. Legacy pages
 *   used iso-8859-1 and set response headers; modern APIs should use UTF-8.
 * - TODO: (BACKEND) Prefer returning an array of arquivo objects or a JSON object
 *   with a top-level "arquivo" array. The frontend arquivoService is defensive and
 *   can handle both shapes.
 */

import api from "../api";
import type { AxiosResponse } from "axios";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

/**
 * Legacy request query parameters (field names used by JSP form, Portuguese).
 *
 * Notes:
 * - The legacy form provided these fields:
 *   inicialdia, inicialmes, inicialano, finaldia, finalmes, finalano
 * - Each field was a select control (strings).
 * - Frontend currently maps Period -> these param names in src/services/arquivoService.ts.
 */
export interface PeriodLegacyRequest {
  inicialdia: string; // day (1-31) as string
  inicialmes: string; // month (1-12) as string
  inicialano: string; // year as string, e.g. "2024"
  finaldia: string;
  finalmes: string;
  finalano: string;
}

/**
 * One arquivo item as returned by the legacy backend.
 *
 * Legacy fields (examples):
 * - nomearquivo (string)
 * - quantidaderegistro (number or numeric string)
 * - aptos (number or numeric string)
 * - semdocumento (number or numeric string)
 * - comcodigosetps (number or numeric string)
 * - comerro (number or numeric string)
 *
 * Important: casing and exact key names were inconsistent in legacy systems.
 * Frontend mapping should be defensive (arquivoService.mapToArquivo).
 */
export interface LegacyArquivoItem {
  // common legacy keys (all optional to be flexible)
  nomearquivo?: string;
  nome_arquivo?: string;
  nome?: string;

  quantidaderegistro?: number | string;
  quantidade_registro?: number | string;
  quantidade?: number | string;

  aptos?: number | string;

  semdocumento?: number | string;
  sem_documento?: number | string;

  comcodigosetps?: number | string;
  com_codigo_setps?: number | string;

  comerro?: number | string;
  comerros?: number | string;
  erros?: number | string;

  // catch-all for extra legacy fields
  [key: string]: unknown;
}

/**
 * Typical successful response shapes observed/expected:
 *
 * 1) Direct array:
 *    [
 *      { nomearquivo: "file1.txt", quantidaderegistro: "123", aptos: "120", ... },
 *      ...
 *    ]
 *
 * 2) Wrapped in an object with 'arquivo' key (matches the legacy JSP request attribute):
 *    { arquivo: [ { ... }, { ... } ] }
 *
 * 3) Other wrappers (data/result)
 *    { data: [...], meta: { total: 20 } }
 *
 * Frontend should be defensive and locate the first array-like property if possible.
 */
export type LegacyListResponse =
  | LegacyArquivoItem[]
  | { arquivo?: LegacyArquivoItem[] }
  | { data?: LegacyArquivoItem[] }
  | { result?: LegacyArquivoItem[] }
  | Record<string, unknown>;

/**
 * Example endpoint documented for integration:
 *
 * Endpoint: /listaarquivoscarregados
 * Method: GET (recommended) or POST (if backend prefers form-encoded body)
 * Query params (example):
 *   ?inicialdia=01&inicialmes=01&inicialano=2024&finaldia=31&finalmes=12&finalano=2024
 *
 * Sample curl:
 *   curl -i -X GET "https://api.example.com/listaarquivoscarregados?inicialdia=01&inicialmes=01&inicialano=2024&finaldia=31&finalmes=12&finalano=2024" \
 *     -H "Accept: application/json" \
 *     -H "Cookie: JSESSIONID=..."   # NOTE: legacy used server-side session auth
 *
 * Response: JSON (see LegacyListResponse shapes above)
 *
 * Notes for backend:
 * - Ensure CORS allows the frontend origin and preserves session cookies if using cookie auth.
 * - If cookie (JSESSIONID) auth is used, frontend must call with credentials (axios: { withCredentials: true }).
 * - Prefer returning UTF-8 encoded JSON; legacy JSP set iso-8859-1 which complicates modern clients.
 * - Consider supporting pagination params:
 *     page (number, 0-based or 1-based) and size (page size)
 *   Because the legacy display tag used a pagesize of 20.
 *
 * - Suggested response with pagination:
 *   {
 *     "data": [ { ... }, { ... } ],
 *     "meta": { "page": 1, "size": 20, "totalItems": 124, "totalPages": 7 }
 *   }
 *
 * - Backwards compatible behavior: If returning a wrapped object, keep the "arquivo" key
 *   to ease phased migration. Frontend arquivoService is resilient and will detect arrays.
 */

/**
 * Authentication & session notes (legacy behavior):
 *
 * - Legacy JSP checked session attributes:
 *     session.getAttribute("informacoesusuario") and session.getAttribute("login")
 *   and redirected to DigitacaoLogin.jsp if missing or access not allowed.
 *
 * - This implies the legacy controller expected the user to be authenticated via server session.
 * - Frontend integration options:
 *   1) Continue using server-side session cookie (JSESSIONID). Frontend must call API with credentials:
 *      axios.get(url, { withCredentials: true })
 *   2) Migrate to token-based auth (Authorization: Bearer <token>). If so, update frontend auth flows accordingly.
 *
 * - TODO: (BACKEND) Provide a clear decision whether the API will rely on session cookies or tokens.
 */

/**
 * Pagination parameters we recommend the backend support:
 */
export interface PaginationParams {
  page?: number; // 1-based preferred for human readability
  size?: number; // items per page, legacy pagesize default was 20
  sort?: string; // optional, e.g. "nomearquivo,asc"
}

/**
 * Combined request type (period + pagination).
 */
export interface ListArquivosRequest extends Partial<PaginationParams> {
  period: PeriodLegacyRequest;
}

/**
 * Implementation: attempt a real GET to the legacy endpoint using the shared api client.
 *
 * Behavior notes / decisions:
 * - Uses api (from src/services/api.ts) which already sets withCredentials: true so server-side
 *   session authentication (JSESSIONID) continues to work during migration testing.
 * - Sends period fields as query params using the legacy names (inicialdia, inicialmes, ...).
 * - If pagination params (page, size, sort) are provided on the request they are forwarded as query params.
 * - The function is defensive when interpreting the response: it returns the raw response in case
 *   it's not an immediately-recognizable array/wrapper so callers can inspect it.
 *
 * TODO:
 * - (REVIEW) If backend prefers POST with form-encoded body, change api.get -> api.post and encode body accordingly.
 * - (REVIEW) Consider adding a small timeout and retry/backoff strategy if network instability is observed.
 */
export async function fetchArquivosControllerPlaceholder(
  req: ListArquivosRequest
): Promise<LegacyListResponse> {
  // Build query params using legacy param names; ensure all values are strings
  const params: Record<string, string | number | undefined> = {
    inicialdia: String(req.period?.inicialdia ?? ""),
    inicialmes: String(req.period?.inicialmes ?? ""),
    inicialano: String(req.period?.inicialano ?? ""),
    finaldia: String(req.period?.finaldia ?? ""),
    finalmes: String(req.period?.finalmes ?? ""),
    finalano: String(req.period?.finalano ?? ""),
  };

  // Forward pagination/sort if provided (backend may choose to ignore)
  if (typeof req.page !== "undefined") params.page = req.page;
  if (typeof req.size !== "undefined") params.size = req.size;
  if (typeof req.sort !== "undefined") params.sort = req.sort;

  try {
    // Real network call: GET /listaarquivoscarregados with query params.
    // Note: api is configured with withCredentials: true to preserve legacy session cookie auth.
    const resp: AxiosResponse<unknown> = await api.get("/listaarquivoscarregados", {
      params,
    });

    const data = resp.data;

    // Try to return sensible shapes similar to arquivoService.getArquivos
    if (Array.isArray(data)) {
      return data as LegacyArquivoItem[];
    }

    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      // Common wrappers
      if (Array.isArray(obj["arquivo"])) return { arquivo: obj["arquivo"] as LegacyArquivoItem[] };
      if (Array.isArray(obj["data"])) return { data: obj["data"] as LegacyArquivoItem[] };
      if (Array.isArray(obj["result"])) return { result: obj["result"] as LegacyArquivoItem[] };

      // Fallback: return the entire object so callers can inspect it; this matches the documented return type.
      return obj;
    }

    // If data is primitive or unexpected, wrap it in an object for downstream inspection.
    return { result: { value: data } } as unknown as LegacyListResponse;
  } catch (err: unknown) {
    // Preserve original error information while providing a clearer message for callers.
    // TODO: (ENHANCEMENT) Consider returning a structured error object instead of throwing to keep UI code simpler.
    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";
    // Annotate the thrown error so callers can distinguish placeholder/backend integration failures.
    throw new Error(`Failed to fetch /listaarquivoscarregados: ${String(message)}`);
  }
}

/**
 * Utility: example mapping of legacy item keys to a normalized shape (for reference).
 *
 * This is intentionally lightweight documentation. The real mapping lives in:
 *   src/services/arquivoService.ts -> mapToArquivo(...)
 *
 * Keep in sync with that implementation to avoid mismatches.
 */

/* ===========================
   QUICK REFERENCE / CHECKLIST
   ===========================
 - Endpoint: /listaarquivoscarregados
 - Methods: GET (preferred) or POST (if required)
 - Query params: inicialdia, inicialmes, inicialano, finaldia, finalmes, finalano
 - Auth: server session cookie OR token (to be decided)
 - Encoding: UTF-8 preferred (legacy used iso-8859-1)
 - Response shapes: array | { arquivo: [...] } | { data: [...] } (frontend is defensive)
 - Pagination: support page & size; legacy display used pagesize 20
 - Backend TODOs annotated above
 =========================== */

export default {
  fetchArquivosControllerPlaceholder,
};
