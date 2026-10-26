import { useEffect, useRef, useState } from "react";
import { openImageExternally, previewImage, type ImagePreview } from "../native/commands";
import { Icon } from "./icons";

export function ImagePreviewDialog({ workspacePath, imagePath, onClose }: {
  workspacePath: string;
  imagePath: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<ImagePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let current = true;
    setImage(null);
    setError(null);
    setLoading(true);
    void previewImage(workspacePath, imagePath).then((response) => {
      if (!current) return;
      if (response.ok && response.data) setImage(response.data);
      else setError(response.error ?? "No se pudo previsualizar la imagen");
    }).catch((reason: unknown) => {
      if (current) setError(String(reason));
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [workspacePath, imagePath, attempt]);

  useEffect(() => {
    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLButtonElement>("button")?.focus();
    const containFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog?.contains(event.target)) dialog?.querySelector<HTMLButtonElement>("button")?.focus();
    };
    document.addEventListener("focusin", containFocus);
    return () => {
      document.removeEventListener("focusin", containFocus);
      if (origin?.isConnected) origin.focus();
    };
  }, []);

  const openExternal = async () => {
    try {
      const response = await openImageExternally(workspacePath, imagePath);
      if (!response.ok) setError(response.error ?? "No se pudo abrir la imagen externamente");
    } catch (reason) { setError(String(reason)); }
  };

  return (
    <div className="dialog-overlay" role="presentation">
      <div className="command-popover image-preview" role="dialog" aria-modal="true" aria-label="Vista previa de imagen" ref={dialogRef}
        onKeyDown={(event) => {
          if (event.key === "Escape") { event.stopPropagation(); onClose(); }
          if (event.key === "Tab") {
            const buttons = [...(dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
            const first = buttons[0]; const last = buttons.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }
        }}>
        <div className="command-popover__header">
          <h2>{image?.name ?? imagePath.split("/").at(-1)}</h2>
          <button type="button" aria-label="Cerrar vista previa" onClick={onClose}><Icon name="close" /></button>
        </div>
        <p className="image-preview__path">{imagePath}</p>
        {loading ? <p role="status">Cargando imagen…</p> : null}
        {error ? <p role="alert">{error}</p> : null}
        {image ? <>
          <p>{(image.sizeBytes / 1024).toFixed(1)} KiB · {image.width} × {image.height} px</p>
          <div className="image-preview__canvas"><img src={image.dataUrl} alt={image.name} onError={() => { setImage(null); setError("La imagen no se puede mostrar. Puedes abrirla externamente."); }} /></div>
        </> : null}
        <div className="image-preview__actions">
          {!loading && error ? <button type="button" onClick={() => setAttempt((value) => value + 1)}>Reintentar</button> : null}
          <button type="button" onClick={() => void openExternal()}>Abrir externamente</button>
        </div>
      </div>
    </div>
  );
}
