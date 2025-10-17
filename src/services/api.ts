import axios from "axios";

/**
 * API client
 *
 * Decisions:
 * - withCredentials: true is enabled to support legacy server-side session authentication
 *   (e.g. JSESSIONID cookie). Backends must be configured to allow credentials (Access-Control-Allow-Credentials: true)
 *   and to return a specific origin in Access-Control-Allow-Origin (not "*").
 *
 * - Default Accept header is set to "application/json" so the client expresses its expectation
 *   for JSON responses from the API, matching modern API usage and the legacy frontend's assumptions.
 *
 * TODO: (REVIEW) If the project migrates to token-based auth (Authorization: Bearer ...),
 * we may remove withCredentials and add an Authorization header via an interceptor or auth layer.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

export default api;
