// src/services/arquivoService.ts
import api from "./api";
import type { AxiosResponse } from "axios";

/**
 * Types representing the period filter used by the legacy form.
 * Note: legacy form fields were named in Portuguese (inicialdia, inicialmes, inicialano, finaldia, finalmes, finalano).
 * We accept both string and number for convenience and convert to strings when sending to the API.
 */
export interface Period {
  inicialDia: string | number;
  inicialMes: string | number;
  inicialAno: string | number;
  finalDia: string | number;
  finalMes: string | number;
  finalAno: string | number;
}

/**
 * Frontend representation of an uploaded file (arquivo) row.
 * Field names are camelCased for idiomatic TS usage.
 */
export interface Arquivo {
  nomeArquivo: string;
  quantidadeRegistro: number;
  aptos: number;
  semDocumento: number;
  comCodigoSetps: number;
  comErro: number;
  // keep original raw payload for debugging if needed
  _raw?: Record<string, unknown>;
}

/**
 * Arquivo DTO shape used by the REST /api/arquivos endpoints.
 *
 * Decision:
 * - The legacy backend used Portuguese keys with varying casing (e.g. codigoarquivo, nomearquivo).
 * - We keep this DTO permissive to accept either snake/camel/case-variants and additional fields from the server.
 * - Consumers can use mapToArquivo to normalize into the Arquivo interface if needed.
 */
export interface ArquivoDto {
  codigoarquivo?: number | null;
  // Keep legacy keys as optional (server may return camelCase as well)
  nomearquivo?: string;
  quantidaderegistro?: number;
  aptos?: number;
  semdocumento?: number;
  comcodigosetps?: number;
  comerro?: number;
  // allow extra server fields
  [key: string]: unknown;
}

/**
 * Helper: normalize backend response objects to the Arquivo type.
 * The legacy backend used Portuguese keys with no consistent casing (e.g. nomearquivo, quantidaderegistro, semdocumento, comcodigosetps, comerro).
 * We defensively try multiple possible key variations.
 */
function mapToArquivo(item: Record<string, unknown>): Arquivo {
  // Utility to fetch value by several possible keys (case-insensitive)
  const getVal = (keys: string[]) => {
    for (const k of keys) {
      if (k in item && item[k] != null) return item[k];
      // try case-insensitive lookup
      const foundKey = Object.keys(item).find((objK) => objK.toLowerCase() === k.toLowerCase());
      if (foundKey) return item[foundKey];
    }
    return undefined;
  };

  const nomeArquivo = String(getVal(["nomearquivo", "nome_arquivo", "nomeArquivo", "nome"]) ?? "");
  const quantidadeRegistroRaw = getVal(["quantidaderegistro", "quantidade_registro", "quantidadeRegistro", "quantidade"]) ?? 0;
  const aptosRaw = getVal(["aptos"]) ?? 0;
  const semDocumentoRaw = getVal(["semdocumento", "sem_documento", "semDocumento"]) ?? 0;
  const comCodigoSetpsRaw = getVal(["comcodigosetps", "com_codigo_setps", "comCodigoSetps", "comCodigosSetps"]) ?? 0;
  const comErroRaw = getVal(["comerro", "com_erro", "comErro", "erros"]) ?? 0;

  const toNumber = (v: unknown) => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = parseInt(v.replace(/\D+/g, ""), 10);
      return Number.isNaN(n) ? 0 : n;
    }
    return 0;
  };

  return {
    nomeArquivo,
    quantidadeRegistro: toNumber(quantidadeRegistroRaw),
    aptos: toNumber(aptosRaw),
    semDocumento: toNumber(semDocumentoRaw),
    comCodigoSetps: toNumber(comCodigoSetpsRaw),
    comErro: toNumber(comErroRaw),
    _raw: item,
  };
}

/**
 * Fetches the list of uploaded files from the backend (legacy endpoint).
 *
 * Endpoint: 'listaarquivoscarregados'
 *
 * Assumptions and decisions:
 * - The legacy JSP posted a form named 'inicialdia', 'inicialmes', 'inicialano', 'finaldia', 'finalmes', 'finalano'.
 *   We send the same parameter names as query params (GET). If backend requires POST, caller can be updated later.
 * - The backend might return the list in several shapes:
 *     - an array directly
 *     - an object with a property 'arquivo' containing the array (matching legacy request attribute)
 *     - other wrapper shapes. We defensively try to locate an array within common properties.
 * - On error we rethrow so callers (UI) can decide how to handle it (toast, retry, etc).
 *
 * TODO: (REVIEW) If backend expects POST form data instead of query params, change api.get -> api.post and send a FormData or appropriate body.
 */
export async function getArquivos(period: Period): Promise<Arquivo[]> {
  // Map Period to the exact param names expected by the legacy backend
  const params = {
    inicialdia: String(period.inicialDia ?? ""),
    inicialmes: String(period.inicialMes ?? ""),
    inicialano: String(period.inicialAno ?? ""),
    finaldia: String(period.finalDia ?? ""),
    finalmes: String(period.finalMes ?? ""),
    finalano: String(period.finalAno ?? ""),
  };

  let response: AxiosResponse<unknown>;
  try {
    // Using GET with query params. If backend requires POST, update accordingly.
    response = await api.get("/listaarquivoscarregados", { params });
  } catch (err) {
    // Re-throw after optionally annotating for upstream handling
    // TODO: (ENHANCEMENT) integrate a logger or user-friendly error wrapper
    throw err;
  }

  const data = response.data;

  // Attempt to find the array payload in the response
  let rawArray: unknown[] = [];

  if (Array.isArray(data)) {
    rawArray = data;
  } else if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj["arquivo"])) rawArray = obj["arquivo"] as unknown[];
    else if (Array.isArray(obj["data"])) rawArray = obj["data"] as unknown[];
    else if (Array.isArray(obj["result"])) rawArray = obj["result"] as unknown[];
    else {
      // fallback: look for the first array property
      const firstArrayProp = Object.values(obj).find((v) => Array.isArray(v)) as unknown[] | undefined;
      if (firstArrayProp) rawArray = firstArrayProp;
    }
  }

  // If still empty, return empty array (no files) rather than throwing.
  if (!rawArray || rawArray.length === 0) return [];

  // Map each raw item to Arquivo
  const arquivos = rawArray.map((it) => {
    if (it && typeof it === "object") {
      return mapToArquivo(it as Record<string, unknown>);
    }
    // If item is primitive, return a mostly empty Arquivo preserving the raw value
    return {
      nomeArquivo: String(it ?? ""),
      quantidadeRegistro: 0,
      aptos: 0,
      semDocumento: 0,
      comCodigoSetps: 0,
      comErro: 0,
      _raw: { value: it },
    } as Arquivo;
  });

  return arquivos;
}

/* ------------------------
   New REST client methods
   ------------------------
   Additions: getAll, getById, create which call the modern REST endpoints:
     GET  /api/arquivos        -> list all ArquivoDto
     GET  /api/arquivos/{id}   -> single ArquivoDto
     POST /api/arquivos        -> create ArquivoDto (body)

   Decisions / notes:
   - These methods are additive and do not change the legacy getArquivos behavior which continues
     to call the legacy endpoint used by the migrated UI.
   - We keep ArquivoDto permissive since server field casing/naming may vary. Consumers can map to
     the Arquivo shape using mapToArquivo if they want a normalized row.
   - All calls use the shared api axios instance which enables withCredentials and default headers.
   - Error handling: we let errors bubble up so UI components decide how to display them.
   - create(...) accepts Partial<ArquivoDto> to allow callers to send minimal payloads (server enforces validation).
   - TODO: (REVIEW) Consider centralizing DTO <-> domain mapping if more endpoints are added.
*/
export async function getAll(): Promise<ArquivoDto[]> {
  const resp = await api.get("/api/arquivos");
  const data = resp.data;

  // If server returns an object with array property, try to locate it. Otherwise if it's an array return as-is.
  if (Array.isArray(data)) return data as ArquivoDto[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj["arquivo"])) return obj["arquivo"] as ArquivoDto[];
    if (Array.isArray(obj["data"])) return obj["data"] as ArquivoDto[];
    if (Array.isArray(obj["result"])) return obj["result"] as ArquivoDto[];
    // fallback: if object itself contains DTO-like keys assume single item wrapped
    // but because this method should return an array, wrap single object in array
    return [obj as ArquivoDto];
  }
  // Fallback to empty array
  return [];
}

export async function getById(id: number | string): Promise<ArquivoDto> {
  const resp = await api.get(`/api/arquivos/${id}`);
  const data = resp.data;
  // Defensive: if server for some reason returns an array, pick first item
  if (Array.isArray(data)) return (data[0] ?? {}) as ArquivoDto;
  return data as ArquivoDto;
}

export async function create(dto: Partial<ArquivoDto>): Promise<ArquivoDto> {
  // POST the DTO to create a new resource. Server is expected to return the created DTO including its generated id.
  const resp = await api.post("/api/arquivos", dto);
  const data = resp.data;
  return data as ArquivoDto;
}

/* ------------------------
   Default export
   ------------------------
   Export both legacy and new methods for convenient imports.
*/
export default {
  getArquivos,
  // new REST client methods
  getAll,
  getById,
  create,
};