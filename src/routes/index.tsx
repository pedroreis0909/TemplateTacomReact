import React from "react";
import { Route, Routes } from "react-router";
import Example from "../pages/Example";
import UploadedFiles from "../pages/UploadedFiles";
// Import the details page for individual uploaded file view
import UploadedFileDetails from "../pages/UploadedFiles/Details";

/**
 * Navigation
 *
 * Routes registration for the application.
 *
 * Decisions:
 * - Register both modern route "/uploaded-files" and legacy action route
 *   "/listaarquivoscarregados" to preserve backward compatibility with any
 *   links/bookmarks that might still reference the old Struts action.
 * - Added detail routes so users can navigate directly to a file details page:
 *     - /uploaded-files/:id   (modern)
 *     - /arquivos/:id         (legacy compatibility)
 *
 * TODO: (REVIEW) If the project uses react-router-dom instead of react-router,
 * update imports accordingly. Also consider adding a top-level route for "/"
 * to redirect to a safe landing page.
 *
 * TODO: (REVIEW) We map both "/uploaded-files/:id" and "/arquivos/:id" to the same
 * component to preserve legacy deep-links. Ensure backend supports lookup by the id
 * shape used in lists (prefer numeric id or UUID). If backend only supports filename-based
 * lookups, consider normalizing ids in the list response or adapting the details service.
 */
const Navigation: React.FC = () => {
  return (
    <Routes>
      <Route path="/example" element={<Example />} />

      {/* Modern route for the migrated Uploaded Files page */}
      <Route path="/uploaded-files" element={<UploadedFiles />} />

      {/* Route to view details for a specific uploaded file (modern) */}
      <Route path="/uploaded-files/:id" element={<UploadedFileDetails />} />

      {/* Legacy compatibility route: map the old Struts action path to the same page.
          This preserves reachability for bookmarks/external links that used the old path. */}
      <Route path="/listaarquivoscarregados" element={<UploadedFiles />} />

      {/* Legacy-compatible detail route so legacy links like /arquivos/:id still work */}
      <Route path="/arquivos/:id" element={<UploadedFileDetails />} />
    </Routes>
  );
};

export default Navigation;
