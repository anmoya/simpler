import type { ReactNode } from "react";
import { relativeOpeningTime, recentNoteKey, type RecentNote } from "../app/recentNotes";
import { Icon } from "./icons";
export function WelcomeScreen({ notes, canCreate, onOpen, onRemove, onContinue, onCreate, onOpenFolder, notice }: {
  notes: RecentNote[]; canCreate: boolean; onOpen: (note: RecentNote) => void;
  onRemove: (note: RecentNote) => void; onContinue: () => void; onCreate: () => void;
  onOpenFolder: () => void; notice?: ReactNode;
}) {
  return <section className="welcome-screen" aria-label="Recientes">
    <header><div><h1>Retoma tu trabajo</h1><p>Las últimas siete notas abiertas en este computador.</p></div>
      <button type="button" aria-label="Continuar" onClick={onContinue}><Icon name="close" /></button></header>
    {notice}
    {notes.length ? <ol>{notes.map((note) => <li key={recentNoteKey(note)}>
      <button type="button" onClick={() => onOpen(note)} aria-label={`${note.notePath} — ${note.workspaceName}${note.available ? "" : " — No disponible"}`}>
        <strong>{note.notePath.split("/").at(-1)}</strong><span>{note.workspaceName} · {note.notePath}</span>
        <small>{relativeOpeningTime(note.openedAt)}{note.available ? "" : " · No disponible"}</small>
      </button>
      {!note.available ? <button type="button" aria-label={`Quitar ${note.notePath} de Recientes`} onClick={() => onRemove(note)}>Quitar</button> : null}
    </li>)}</ol> : <p>Aún no hay notas recientes. Elige una en el árbol o crea una nueva.</p>}
    <div className="welcome-screen__actions"><button type="button" disabled={!canCreate} onClick={onCreate}>Nueva nota</button><button type="button" onClick={onOpenFolder}>Abrir carpeta</button><button type="button" onClick={onContinue}>Continuar con el Workspace</button></div>
  </section>;
}
