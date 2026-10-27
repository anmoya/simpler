# Handoff: Tema Mate Cerámico (Editor de Texto Personal)

## Overview
"Mate Cerámico" es uno de los 4 temas (`mate`, `light`, `dark`, `nes`) del editor de notas prototipado en este proyecto. Es un tema cálido de baja saturación inspirado en cerámica cruda, yerba, madera y acero, con un acento de esmalte cerámico (teal) reservado para búsqueda. Este paquete documenta el tema Mate Cerámico para implementarlo en una app real.

## About the Design Files
Los archivos incluidos (`Editor de Texto Personal.dc.html`, `Mate Ceramico - Tokens.dc.html`) son **referencias de diseño en HTML** — prototipos que muestran look & behavior, no código para copiar directamente. La tarea es **recrear este diseño en el stack real** (React, Vue, SwiftUI, etc.) usando los patrones y librerías ya existentes en el codebase — o, si no existe stack aún, elegir el framework más apropiado.

## Fidelity
**Alta fidelidad (hifi).** Colores, tipografía y espaciados son finales — deben reproducirse con precisión.

## Design Tokens

### Colores — tema `mate`
| Token | Valor | Uso |
|---|---|---|
| `--app-bg` | `#D9D2C6` | Fondo de la aplicación (barra de estado) |
| `--sidebar-bg` | `#D3CBBE` | Barra lateral, topbar |
| `--editor-bg` | `#E8E1D3` | Superficie de escritura |
| `--surface-raised` | `#EFE9DC` | Campos, popovers, tarjetas |
| `--surface-sunken` | `#E1D8C7` | Bloques de código, zonas hundidas |
| `--border` | `#BEBFBD` | Bordes por defecto (acero velado) |
| `--border-strong` / `--quote-bar` / `--markdown-mark` | `#B9793B` | Hover de campos, barra de cita, marcas Markdown (madera) |
| `--separator` | `#C9C8C4` | Divisores, filas |
| `--text-primary` | `#2D1B12` | Texto principal |
| `--text-secondary` | `#5A473B` | Subtítulos, listas |
| `--text-muted` | `#736A62` | Metadatos, rutas |
| `--text-placeholder` | `#8A7F76` | Placeholders |
| `--text-disabled` | `#9C948C` | Elementos inactivos |
| `--text-on-accent` | `#F4F0E6` | Texto sobre botón primario |
| `--accent` (yerba viva) | `#3F7A44` | Activo, títulos, links, cursor, botón primario |
| `--accent-hover` | `#4F8F54` | Hover del acento |
| `--accent-pressed` | `#2C5A31` | Pressed |
| `--accent-soft` | `#DCEBDA` | Fondo de fila/badge activo |
| `--accent-secondary` (focus ring) | `#5C7A5E` | Anillo de foco, H2 |
| `--search-accent` (esmalte, teal) | `#1F6E5C` | Comando `/` de búsqueda, borde de campo de búsqueda, subrayado de pestaña activa, remache junto al logotipo |
| `--search-bg` | `#CFE3DB` | Fondo de coincidencia de búsqueda resaltada |
| `--steel` | `#9DA1A3` | Iconos inactivos |
| `--success` | `#3F7A44` | Guardado / sincronizado (comparte el verde vivo) |
| `--warning` | `#8A6A3C` | Cambios sin guardar |
| `--error` | `#7A4034` | Conflicto de versión |
| `--info` | `#6E7477` | Solo lectura |

**Nota de evolución:** la primera versión de este tema usaba un verde "yerba" casi negro (`#2C3A26`) y madera apagada (`#A98B76`). Tras feedback de que el tema se sentía "apagado", se subió la vivacidad del verde a `#3F7A44` y la madera a `#B9793B`, y las superficies se aclararon/calentaron un paso. **Usar siempre los valores de esta tabla, no los tonos antiguos.**

### Tipografía
- Display/prosa: **Newsreader** (serif), 300/400, itálica para citas.
- UI: **Instrument Sans**, 400/500/600.
- Interfaz del editor real (`Editor de Texto Personal.dc.html`) usa **Josefin Sans** (headers/tabs) + **DM Sans** (UI) + **DM Mono** (código/metadatos) — son dos sets tipográficos ligeramente distintos entre el prototipo de editor y la hoja de tokens; usar el del editor si se implementa el editor, el de la hoja si se generaliza el sistema.
- Escala: 42 / 30 / 22 / 17 / 15 / 13.5 / 12 / 11px. Prosa a 17px, line-height 1.75.

### Radios
4px controles · 5px campos/filas · 8px paneles/tarjetas · 999px píldoras de estado.

### Sombras (siempre con tinte café, nunca negro puro)
- `--shadow-sm`: `0 1px 2px rgba(45,27,18,0.06)`
- `--shadow-md`: `0 1px 2px rgba(45,27,18,0.06), 0 6px 18px rgba(45,27,18,0.07)`

## Screens / Views

### Editor de Texto Personal (`Editor de Texto Personal.dc.html`)
Editor de notas markdown con 3 variantes de layout (Clásico, Enfoque, Editorial) y 4 temas intercambiables. El tema Mate Cerámico es el default.

- **Topbar** (54px alto): logo + selector de variante (3 tabs) + botón de tema. En modo mate, junto al título "Editor de Texto Personal" hay un remache decorativo de 8×8px en `--search-accent` con halo de 2px en `--search-bg`. La pestaña activa lleva un subrayado interno de 2px en `--search-accent` (`box-shadow: inset 0 -2px 0 var(--search-accent)`).
- **Sidebar** (260px Clásico / 220px Enfoque / 240px Editorial): lista de carpetas → archivos, buscador, panel de sync colapsable, botón "Clonar desde GitHub". Archivo activo: fondo `--accent-soft`, texto `--text-primary` con acento, ícono en `--accent`.
- **Editor**: líneas numeradas (gutter en `--text-muted`, `--accent` si la línea está resaltada por goto/find), H1/H2 en `--accent` (Josefin Sans bold/semibold), blockquote con borde izquierdo 2px `--border-strong`, código inline con `--surface-sunken`.
- **Comandos estilo vim**: `:N` (ir a línea, acento `--accent`) y `/` (buscar, acento `--search-accent` — el teal, deliberadamente distinto del verde de navegación). El resaltado de coincidencias usa `--search-bg`/`--search-accent`.
- **Bottom bar**: badge "NORMAL" en `--accent`/`--accent-soft`, contador de líneas, leyenda de atajos.
- **Modales** (búsqueda global, clonar GitHub): overlay `rgba(20,16,12,0.45)`, tarjeta `--surface-raised`, radio 20px.

### Hoja de tokens (`Mate Ceramico - Tokens.dc.html`)
Documento de referencia visual: swatches de materiales (Cerámica, Yerba, Madera, Acero, Esmalte), espécimen de la UI completa, tabla de todos los tokens por categoría, y bloque CSS `:root{...}` listo para copiar (toggle "Hoja" en el panel de tweaks).

## Interactions & Behavior
- Cambio de tema: botón circular en la topbar cicla `mate → light → dark → nes → mate`, con ícono distinto por tema.
- Drag & drop de archivos entre carpetas.
- Atajos vim: `gg`/`G` (inicio/fin), `:N↵` (ir a línea), `/texto↵` + `n`/`N` (buscar, con contador de coincidencias), `Esc` (cancelar).
- Hover: filas/botones pasan a `--hover-bg` (`#E2DED8`); inputs cambian borde a `--border-strong` en hover, a `--accent-secondary` + anillo en focus.
- Todas las transiciones son instantáneas o casi (sin easing elaborado) — el tema no usa animación como device de marca.

## State Management
Prototipado con un solo componente con estado local: tema activo, variante de layout, archivo activo, contenido de archivos, estado de búsqueda/vim, estado de sync (idle/syncing), modal de GitHub. En una implementación real esto se traduce naturalmente a estado de aplicación (editor de archivos + preferencia de tema persistida).

## Assets
Sin imágenes ni iconos externos — todos los iconos son SVG inline (stroke, sin relleno). Fuentes vía Google Fonts (Newsreader, Instrument Sans, IBM Plex Mono para la hoja de tokens; Josefin Sans, DM Sans, DM Mono, Press Start 2P, VT323 para el editor — estas dos últimas solo para el tema `nes`, no usadas en `mate`).

## Files
- `Editor de Texto Personal.dc.html` — prototipo funcional del editor con los 4 temas y 3 variantes de layout.
- `Mate Ceramico - Tokens.dc.html` — hoja de especificación visual del tema Mate Cerámico, con export de CSS variables.
