# Backlog de ideas (2026-08-08)

Resultado de una sesión de brainstorming guiada, contrastada contra `CONTEXT.md` y los ADRs existentes. Alcance deliberadamente **fuera**: cualquier feature de tipo PKM/semántica (wikilinks, backlinks, tags, búsqueda semántica) — quedan excluidas por decisión de producto ya documentada en `CONTEXT.md` (Standard Markdown, Global Search). Alcance de plataforma (mobile, otros OS) quedó fuera de esta ronda, no descartado.

Tres ejes priorizados: **Edición y escritura**, **Sync y multi-dispositivo**, **Organización del Workspace Tree**.

## Edición y escritura

### Adjuntos e imágenes
Pegar/arrastrar una imagen en una nota la guarda como archivo real referenciado con Markdown estándar (`![]()`), no como blob embebido.

- **Ubicación**: subcarpeta `assets/` compartida por directorio (una por carpeta del Workspace que contiene notas), no una por nota.
- **Huérfanos**: no se limpian automáticamente al borrar una nota. Backlog aparte si se vuelve un problema real: acción manual "Buscar adjuntos no usados".
- **Tamaño**: sin límite ni compresión propia en el MVP de esta feature; se confía en el manejo de errores de Sync existente si Git/GitHub rechaza un archivo grande.
- **Nombrado**: timestamp + extensión (ej. `2026-08-08-143022.png`), sin prompt al usuario.

### Continuar listas/checklists al Enter
Al presionar Enter dentro de un ítem de lista (`- `, `1. `, `- [ ] `), la siguiente línea continúa el marcador automáticamente. Incluye el caso de checkbox: Enter en un ítem vacío debería salir de la lista en vez de seguir generando marcadores vacíos.

### Atajos de formato
Ctrl+B / Ctrl+I envuelven la selección con `**`/`_`; atajo similar para enlaces. Reduce fricción de sintaxis manual sin salir de Raw Markdown.

### Plegar secciones por encabezado
Colapsar/expandir el contenido bajo un `#` para navegar notas largas. Más costoso de implementar en CodeMirror — evaluar esfuerzo antes de comprometer.

### Tablas
Ayudas para crear/editar tablas Markdown a mano: insertar tabla, navegar celdas con Tab, reformatear alineación automáticamente.

### Exportar / imprimir
Exportar una nota (o el workspace) a PDF/HTML para compartir fuera de la app.

## Sync y multi-dispositivo

### Historial de versiones por nota
Ver versiones anteriores de una nota y restaurar una versión previa, sin exponer comandos Git crudos al usuario.

- **Granularidad**: un punto en el historial por cada commit de Sync que tocó esa nota (automático o manual) — reutiliza el historial de Git ya existente, no es un sistema de versionado paralelo.
- **Restaurar**: copia el contenido de la versión elegida al archivo actual como un nuevo cambio local (Local Save), listo para Sync normal. No hace checkout destructivo ni reescribe historia — consistente con el modelo "Sync avanza hacia adelante" (ADR 0001).

### Otras ideas de este eje (no profundizadas aún)
- Indicador de estado de Sync más rico (sincronizando…, última vez sincronizado, cambios pendientes por archivo).
- Remotos Git genéricos (GitLab, Gitea, URL + credenciales del sistema), no solo el flujo OAuth de GitHub (ADR 0003/0010).
- Sync automático más inteligente (sync periódico en background además de los triggers actuales: abrir, guardar con debounce, cerrar).

## Organización del Workspace Tree

### Papelera / deshacer borrado
Borrar una nota o carpeta mueve el archivo a una papelera recuperable en vez de borrarlo de inmediato.

- **Alcance**: local por dispositivo, vive en `.simpler/local/trash/` y queda excluida por `.simpler/.gitignore` (ADR 0005) — no se sincroniza. Git y el futuro historial de versiones ya cubren la recuperación a largo plazo; la papelera es solo la red de seguridad del "ups" inmediato.
- **Retención**: purga automática silenciosa a los 30 días.

### Otras ideas de este eje (no profundizadas aún)
- Favoritos / notas fijadas.
- Plantillas de notas al crear una nota nueva.
- Renombrar/mover con mejor UX (drag-and-drop, selección múltiple).

## Fuera de alcance de esta ronda
- Wikilinks, backlinks, tags, búsqueda semántica — excluidos por decisión de producto ya documentada en `CONTEXT.md`.
- Soporte mobile / otros sistemas operativos, accesibilidad, empaquetado adicional — no descartado, solo no cubierto en esta sesión.

# Backlog de ideas (2026-08-09) — UI/UX

Segunda ronda, enfocada en fricciones de uso reportadas directamente (pantalla chica en tiling WM, tamaño de letra, orientación en el árbol). Contrastada contra `CONTEXT.md` (Accordion/Free Tree Mode, Focus Active Note, Theme/Appearance Mode) y el código actual (`ClassicShell.tsx`, `styles.css`).

### Zoom / tamaño de letra
Dos controles independientes: tamaño de fuente del editor, y zoom de la UI general (sidebar, toolbar, etc.).

- **Guardado**: por dispositivo, como Theme/Appearance Mode — no viaja con Sync, no es parte del Workspace.
- **Control**: atajos estilo navegador (Ctrl+/Ctrl-/Ctrl+0) para cada uno, más entrada en el Command Palette. Pasos discretos, no un slider continuo.

### Resaltar la ruta hacia la nota abierta en el árbol
Mientras hay una nota abierta, todas las carpetas en su ruta (raíz → ... → carpeta contenedora) se resaltan con `--color-accent`, siempre automático (no depende de Focus Active Note ni del modo Accordion/Free).

### Sidebar colapsable a rail de íconos
- **Trigger**: automático por debajo de cierto ancho de ventana + toggle manual en cualquier momento.
- **Modo colapsado**: oculta todo el panel (workspace switcher, búsqueda, árbol, acciones) y deja un rail angosto con iconos de acceso rápido (abrir Workspace, búsqueda global, sync, expandir de nuevo). No es un modo de navegación compacta del árbol — es "dame espacio para el editor".
- Incluye arreglar, como parte de esta misma implementación, el bug de layout donde la fila de `tree-actions` se superpone con el árbol en anchos muy chicos (ver captura de pantalla del 2026-08-09).

### Atajos de búsqueda estilo VSCode
- Ctrl+F abre/enfoca la búsqueda dentro de la nota actual; Ctrl+Shift+F abre/enfoca la búsqueda global.
- Ambos inputs pasan a estar **ocultos por defecto** (hoy están siempre visibles) y solo aparecen al usar el atajo o hacer click en su entrada de menú/ícono correspondiente.
- Esc cierra la búsqueda activa y devuelve el foco al editor.

### Historial de nota: extraer a módulo + diff
- Extraer el bloque `note-history` de `ClassicShell.tsx` a un componente propio (`NoteHistoryPanel.tsx`), siguiendo el patrón de componentes dedicados como `MarkdownEditor.tsx`.
- Agregar una vista de diff: compara la versión histórica seleccionada contra el contenido **actual** del archivo (no contra el commit anterior), calculado client-side.

### Pestaña de búsqueda avanzada (anotado, no profundizado)
Mencionado para el futuro, sin especificar todavía — evaluar en una próxima sesión de grill qué significa "avanzada" (filtros por carpeta/fecha, regex, etc.) antes de convertir en issue.
