// src/hooks/useSession.ts
import { useCallback, useEffect, useState } from "react";

/**
 * Hook: useSession
 *
 * Purpose:
 * - Read legacy session-like values stored in sessionStorage or localStorage:
 *    - "informacoesusuario" (expected to be a JSON string representing the Usuario)
 *    - "login" (any non-null value indicates a logged-in session)
 * - Expose `user`, `menu` and guard flags to replicate the JSP checks:
 *    - informacoesusuario == null  -> redirect to login
 *    - login == null || !menu.isEnviarArquivos() -> redirect to login
 *
 * Behavior decisions / notes:
 * - We check sessionStorage first (closer to server-session semantics) and fall back to localStorage.
 * - We listen to the "storage" event so multiple tabs keep in sync.
 * - We provide helper setters (setSession / clearSession) so UI code can update storage in a consistent manner.
 * - The legacy Menu object used a method isEnviarArquivos(); modern JSON will likely include a boolean property `enviarArquivos`.
 *   We support both by checking property and method-like shapes defensively.
 *
 * TODOs:
 * - (REVIEW) If authentication migrates to tokens, adapt this hook to read token & decode user claims.
 * - (REVIEW) Consider centralizing session logic (storage keys and shape) with an AuthProvider + context for app-wide usage.
 */

/* ---------------------------
   Types for legacy structures
   --------------------------- */

export interface Menu {
  // Legacy boolean flag (most likely)
  enviarArquivos?: boolean;
  // Some backends may send strings "true"/"false"
  [key: string]: unknown;
}

export interface Usuario {
  nome?: string;
  menu?: Menu;
  // keep original raw payload to help debugging
  [key: string]: unknown;
}

/* ---------------------------
   Storage keys (legacy names)
   --------------------------- */

const KEY_INFORMACOES_USUARIO = "informacoesusuario";
const KEY_LOGIN = "login";

/* ---------------------------
   Utilities
   --------------------------- */

function parseJSONSafe<T = any>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    // If value isn't valid JSON, attempt to coerce a simple value (e.g. plain string name)
    return (value as unknown) as T;
  }
}

function readFromStorages(key: string): string | null {
  // Prefer sessionStorage (closer to server-session semantics); fallback to localStorage
  try {
    const sess = sessionStorage.getItem(key);
    if (sess != null) return sess;
  } catch {
    // Access to sessionStorage may throw in some environments; ignore and fallback
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeToStorages(key: string, value: string, useSession = true) {
  // Prefer sessionStorage for ephemeral session-like data; optionally fallback to localStorage
  try {
    if (useSession) {
      sessionStorage.setItem(key, value);
      return;
    }
  } catch {
    // ignore and continue to localStorage
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore failures
  }
}

function removeFromStorages(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/* ---------------------------
   Hook implementation
   --------------------------- */

export default function useSession() {
  const [user, setUser] = useState<Usuario | null>(() => {
    const raw = readFromStorages(KEY_INFORMACOES_USUARIO);
    return parseJSONSafe<Usuario>(raw) ?? null;
  });

  const [loginValue, setLoginValue] = useState<string | null>(() => {
    return readFromStorages(KEY_LOGIN);
  });

  // Derive menu from user payload if present
  const menu: Menu | null = (() => {
    if (!user) return null;
    // If user has a menu property, prefer it
    const maybeMenu = (user as any).menu ?? null;
    if (maybeMenu && typeof maybeMenu === "object") return maybeMenu as Menu;
    return null;
  })();

  // Legacy JSP checks:
  // 1) if informacoesusuario == null -> redirect to login
  // 2) if login == null || !menu.isEnviarArquivos() -> redirect to login
  // We'll expose flags that allow UI routing to replicate this behavior.
  const isAuthenticated = Boolean(loginValue);
  const canSendFiles = (() => {
    if (!menu) return false;
    // Accept boolean field, or strings like "true" / "false", or numeric 1/0
    const v = menu.enviarArquivos ?? (menu as any).isEnviarArquivos ?? (menu as any).enviar_arquivos;
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return v.toLowerCase() === "true" || v === "1";
    if (typeof v === "number") return v === 1;
    return false;
  })();

  // Should the UI guard redirect the user to login?
  const shouldRedirectToLogin = !user || !isAuthenticated || !canSendFiles;

  /* ---------------------------
     Storage sync: storage events and manual updates
     --------------------------- */

  // Listen to cross-tab storage changes
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (!e.key) {
        // clear event - refresh both
        const raw = readFromStorages(KEY_INFORMACOES_USUARIO);
        setUser(parseJSONSafe<Usuario>(raw));
        setLoginValue(readFromStorages(KEY_LOGIN));
        return;
      }

      if (e.key === KEY_INFORMACOES_USUARIO) {
        setUser(parseJSONSafe<Usuario>(e.newValue ?? readFromStorages(KEY_INFORMACOES_USUARIO)));
      } else if (e.key === KEY_LOGIN) {
        setLoginValue(e.newValue ?? readFromStorages(KEY_LOGIN));
      }
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Provide stable callbacks to update/clear session
  const setSession = useCallback((usuario: Usuario, loginFlag = "true", useSessionStorage = true) => {
    try {
      writeToStorages(KEY_INFORMACOES_USUARIO, JSON.stringify(usuario), useSessionStorage);
    } catch {
      // If serialization fails, store a fallback string
      writeToStorages(KEY_INFORMACOES_USUARIO, String(usuario), useSessionStorage);
    }
    writeToStorages(KEY_LOGIN, String(loginFlag), useSessionStorage);
    // update local states to keep immediate consistency (storage events may not fire in same tab)
    setUser(usuario);
    setLoginValue(String(loginFlag));
  }, []);

  const clearSession = useCallback(() => {
    removeFromStorages(KEY_INFORMACOES_USUARIO);
    removeFromStorages(KEY_LOGIN);
    setUser(null);
    setLoginValue(null);
  }, []);

  // Expose a small helper that mirrors the legacy Menu.isEnviarArquivos() naming (for compatibility)
  const menuAllowsEnviarArquivos = () => canSendFiles;

  return {
    user,
    menu,
    isAuthenticated,
    canSendFiles,
    shouldRedirectToLogin,
    // convenience method keeping legacy naming
    menuAllowsEnviarArquivos,
    // mutators
    setSession,
    clearSession,
  };
}

/* End of file */