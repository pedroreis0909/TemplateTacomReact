// src/pages/ArquivoCreate/index.tsx
import React, { useEffect } from "react";
import ArquivoForm from "../../components/ArquivoForm";
import useSession from "../../hooks/useSession";
import type { ArquivoDto } from "../../services/arquivoService";

/**
 * ArquivoCreate page
 *
 * Responsibilities:
 * - Guard access using useSession() to replicate legacy JSP checks (same approach as ListarArquivos).
 * - Render ArquivoForm to create a new Arquivo.
 * - On successful creation, redirect to a sensible place:
 *     - If server returned a generated codigoarquivo -> redirect to a detail path `/arquivos/{id}`.
 *     - Otherwise fall back to the legacy list page `/listaarquivoscarregados`.
 *
 * Decisions / notes:
 * - We use window.location.href for navigation to avoid coupling to any specific router
 *   implementation in this codebase (consistent with ListarArquivos implementation).
 *   TODO: (REVIEW) If the app standardizes on react-router's navigation hook (useNavigate),
 *   convert this to client-side navigation to avoid full page reloads.
 *
 * - The page shows the user's name in the header when available for parity with legacy UI.
 *
 * - The redirect is immediate after creation. If nicer UX is desired (toast + countdown),
 *   this can be enhanced later without changing create logic.
 */
export default function ArquivoCreatePage(): JSX.Element {
  const { user, shouldRedirectToLogin } = useSession();

  // Guard: mirror legacy behavior by redirecting to /login when the session is invalid.
  useEffect(() => {
    if (shouldRedirectToLogin) {
      // TODO: (REVIEW) If the application uses an in-app login route, consider using router navigation instead.
      window.location.href = "/login";
    }
  }, [shouldRedirectToLogin]);

  // Called when ArquivoForm successfully creates an Arquivo.
  const handleCreated = (created: ArquivoDto) => {
    // If backend returned an id, navigate to its detail page to mirror typical REST UX.
    // Otherwise navigate to the legacy list page used across the migrated app.
    const id = created?.codigoarquivo ?? (created as any)?.id ?? null;
    if (id != null && id !== "") {
      // Prefer numeric id if provided; allow string as fallback.
      window.location.href = `/arquivos/${String(id)}`;
    } else {
      // Legacy list route we kept in routes/index.tsx
      window.location.href = "/listaarquivoscarregados";
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 bg-slate-800 text-white rounded p-4">
        <h1 className="text-xl font-semibold">Criar Arquivo</h1>
        <div className="mt-2 text-sm">
          {user?.nome ? <div>Usuário: <strong>{user.nome}</strong></div> : null}
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow-sm">
        <ArquivoForm onCreated={handleCreated} clearOnSuccess={false} />
        {/* Reasoning:
            - clearOnSuccess is set to false because we immediately redirect on success.
            - If the redirect fails for some reason, the form retains values allowing retry.
            - TODO: (ENHANCEMENT) Consider showing a client-side confirmation and a link to the created resource
              instead of automatic redirect for better UX in some flows.
         */}
      </div>
    </div>
  );
}
