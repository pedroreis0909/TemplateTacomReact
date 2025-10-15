// src/components/UploadFileForm/UploadFileForm.tsx
import React, { useState, useRef } from "react";
import { createUploadedFile } from "../../services/arquivoService";

export type UploadFileFormProps = {
  /**
   * Optional callback invoked when upload succeeds.
   * Receives the Axios response (if available) so parent can refresh lists or inspect headers.
   */
  onSuccess?: (response?: any) => void;
  /**
   * Optional label for the submit button
   */
  submitLabel?: string;
  /**
   * Optional className to allow layout customisation by parent
   */
  className?: string;
};

/**
 * UploadFileForm
 *
 * Small, accessible form to upload a file with optional metadata.
 *
 * Features:
 * - File input (required)
 * - Optional metadata fields: origem and descricao
 * - Submit handler builds FormData and calls createUploadedFile(formData, { onUploadProgress })
 * - Shows upload progress, success and error messages
 * - Exposes onSuccess callback prop so parent can refresh lists
 *
 * Decisions / notes:
 * - We accept both single file uploads and send only the first file in the input (legacy UI used single-file semantics).
 * - We don't enforce complex client-side validation beyond requiring a file; server remains authoritative.
 * - We use the named export createUploadedFile from arquivoService to keep network concerns separated.
 * - We reset the file input on successful upload. Because controlled file inputs are awkward, we use a ref to clear the input value.
 *
 * TODO: (REVIEW) If the backend requires additional metadata fields or a different form key for the file,
 * update the append keys here (currently 'file', 'origem', 'descricao').
 */
export default function UploadFileForm({
  onSuccess,
  submitLabel = "Enviar arquivo",
  className = "",
}: UploadFileFormProps): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [origem, setOrigem] = useState<string>("");
  const [descricao, setDescricao] = useState<string>("");
  const [progress, setProgress] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File input ref so we can reset it after successful upload
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setSuccessMessage(null);
    setErrorMessage(null);
    setProgress(null);

    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setFile(f);
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!file) {
      setErrorMessage("Selecione um arquivo antes de enviar.");
      return;
    }

    const fd = new FormData();
    // NOTE: backend expected field name for file may differ. Using 'file' as a common convention.
    fd.append("file", file);
    if (origem) fd.append("origem", origem);
    if (descricao) fd.append("descricao", descricao);

    setLoading(true);
    setProgress(0);

    try {
      const resp = await createUploadedFile(fd, {
        onUploadProgress: (evt: ProgressEvent) => {
          if (evt.lengthComputable) {
            const pct = Math.round((evt.loaded / evt.total) * 100);
            setProgress(pct);
          }
        },
      });

      // Basic success handling: show message and call onSuccess so parent can reload list
      setSuccessMessage("Arquivo enviado com sucesso.");
      setErrorMessage(null);

      // Reset form inputs
      setFile(null);
      setOrigem("");
      setDescricao("");
      setProgress(null);

      // Clear file input element value
      if (fileInputRef.current) {
        try {
          fileInputRef.current.value = "";
        } catch {
          // Some browsers may not allow clearing in strict modes; ignore silently.
        }
      }

      // Invoke callback with full response so parent can inspect or reload
      onSuccess && onSuccess(resp);
    } catch (err: any) {
      // Provide a friendly error message but keep the raw message available.
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Erro ao enviar o arquivo. Tente novamente.";
      setErrorMessage(String(msg));
      setSuccessMessage(null);
    } finally {
      setLoading(false);
      // TODO: (REVIEW) We clear progress after a short delay to give users visual confirmation.
      // Keep it immediate for now to avoid keeping stale UI states.
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-3 ${className}`} aria-label="Formulário de envio de arquivo">
      <div>
        <label htmlFor="upload-file" className="block text-sm font-medium text-gray-700">
          Arquivo <span className="text-xs text-gray-500">(obrigatório)</span>
        </label>
        <input
          id="upload-file"
          ref={fileInputRef}
          type="file"
          accept="*/*"
          onChange={handleFileChange}
          aria-required="true"
          className="mt-1 block w-full text-sm text-gray-700 file:border file:px-3 file:py-1 file:rounded-md file:bg-white"
        />
        {file && (
          <div className="mt-1 text-sm text-gray-600">
            Selecionado: <span className="font-medium">{file.name}</span> ({Math.round(file.size / 1024)} KB)
          </div>
        )}
      </div>

      <div>
        <label htmlFor="origem" className="block text-sm font-medium text-gray-700">
          Origem (opcional)
        </label>
        <input
          id="origem"
          type="text"
          value={origem}
          onChange={(e) => setOrigem(e.target.value)}
          placeholder="Ex: legacy-ui"
          className="mt-1 block w-full border rounded px-2 py-1 text-sm"
        />
      </div>

      <div>
        <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">
          Descrição (opcional)
        </label>
        <textarea
          id="descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={3}
          className="mt-1 block w-full border rounded px-2 py-1 text-sm"
          placeholder="Informações adicionais sobre o arquivo"
        />
      </div>

      {/* Progress / status */}
      <div>
        {progress !== null && (
          <div className="w-full bg-gray-200 rounded overflow-hidden" aria-hidden={loading ? "false" : "true"}>
            <div
              className="h-2 bg-indigo-600"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            />
            <div className="mt-1 text-xs text-gray-600">{progress}%</div>
          </div>
        )}

        {loading && progress === null && (
          <div className="text-sm text-gray-600">Iniciando envio...</div>
        )}

        {successMessage && (
          <div className="mt-2 text-sm text-green-700 bg-green-50 border border-green-100 p-2 rounded">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mt-2 text-sm text-red-800 bg-red-50 border border-red-100 p-2 rounded">
            {errorMessage}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className={`px-4 py-2 rounded text-white ${
            loading ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
          disabled={loading || !file}
          aria-disabled={loading || !file}
        >
          {loading ? "Enviando..." : submitLabel}
        </button>

        <button
          type="button"
          onClick={() => {
            setFile(null);
            setOrigem("");
            setDescricao("");
            setProgress(null);
            setErrorMessage(null);
            setSuccessMessage(null);
            if (fileInputRef.current) {
              try {
                fileInputRef.current.value = "";
              } catch {
                // ignore
              }
            }
          }}
          className="px-3 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
        >
          Limpar
        </button>
      </div>
    </form>
  );
}
