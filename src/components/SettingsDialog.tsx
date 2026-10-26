import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./icons";

export function SettingsDialog({ children, onClose, returnFocusTo }: {
  children: ReactNode; onClose: () => void; returnFocusTo: HTMLElement | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const origin = returnFocusTo ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const dialog = ref.current;
    const first = () => dialog?.querySelector<HTMLElement>("button:not(:disabled), select:not(:disabled), input:not(:disabled), summary, a[href], [tabindex='0']");
    first()?.focus();
    const contain = (event: FocusEvent) => { if (event.target instanceof Node && !dialog?.contains(event.target)) first()?.focus(); };
    document.addEventListener("focusin", contain);
    return () => { document.removeEventListener("focusin", contain); if (origin?.isConnected) origin.focus(); };
  }, []);
  return <div className="dialog-overlay" role="presentation">
    <div ref={ref} role="dialog" aria-modal="true" aria-label="Configuración" className="command-popover settings-dialog"
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") { event.preventDefault(); onClose(); }
        if (event.key === "Tab") {
          const controls = [...(ref.current?.querySelectorAll<HTMLElement>("button:not(:disabled), select:not(:disabled), input:not(:disabled), summary, a[href], [tabindex='0']") ?? [])]
            .filter((element) => !element.closest("details:not([open])") || element.tagName === "SUMMARY");
          const first = controls[0]; const last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }}>
      <header className="command-popover__header"><h2>Configuración</h2>
        <button type="button" aria-label="Cerrar configuración" onClick={onClose}><Icon name="close" /></button>
      </header>
      <div className="settings-dialog__content">{children}</div>
    </div>
  </div>;
}
