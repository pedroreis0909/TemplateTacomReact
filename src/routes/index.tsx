import { Route, Routes } from "react-router";
import Example from "../pages/Example";
import ListarArquivos from "../pages/ListarArquivos";
import ArquivoCreate from "../pages/ArquivoCreate";
import ArquivoDetail from "../pages/ArquivoDetail";

/**
 * Navigation
 *
 * Registers application routes.
 *
 * Decisions / notes:
 * - Added route '/listaarquivoscarregados' to mirror the legacy JSP action path so
 *   users/scripts expecting that URL can reach the migrated ListarArquivos page.
 * - Added new routes to align with migrated controller endpoints:
 *     - '/arquivos/novo'  -> ArquivoCreate (creation page)
 *     - '/arquivos/:id'   -> ArquivoDetail (resource detail view)
 *   These paths provide a more RESTful, discoverable frontend surface matching the backend.
 *
 * - Kept existing /example route intact to avoid overwriting prior work.
 *
 * - TODO: (REVIEW) The project currently imports router primitives from "react-router".
 *   If the app standardizes on "react-router-dom" in the future (for browser-specific utilities
 *   like useNavigate), update imports and route setup accordingly.
 *
 * - TODO: (REVIEW) Consider grouping Arquivo routes under a common parent (e.g. /arquivos)
 *   and adding an index/list route there to improve route organization when the app grows.
 */
const Navigation: React.FC = () => {
  return (
    <Routes>
      <Route path="/example" element={<Example />} />

      {/* Legacy URL mapping: keep parity with JSP action 'listaarquivoscarregados' */}
      <Route path="/listaarquivoscarregados" element={<ListarArquivos />} />

      {/* New routes mapping to migrated controller endpoints */}
      <Route path="/arquivos/novo" element={<ArquivoCreate />} />
      <Route path="/arquivos/:id" element={<ArquivoDetail />} />
    </Routes>
  );
};

export default Navigation;