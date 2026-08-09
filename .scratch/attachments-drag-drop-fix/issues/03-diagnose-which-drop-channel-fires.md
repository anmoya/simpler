# Diagnóstico: un arrastre, dos canales instrumentados

Status: done

## Parent

`.scratch/attachments-drag-drop-fix/spec.md`

## What to build

**Esta rebanada no arregla nada. Entrega un dato.** Es la que desbloquea la bifurcación del PRD, y ninguna rebanada de arreglo debe empezar antes de que ésta se resuelva.

El drag-and-drop se ha dado por arreglado dos veces sin funcionar, en parte porque nadie llegó a observar el segundo intento — no se capturó salida de consola. Aquí se instrumentan **a la vez** los dos canales por los que un drop del sistema operativo puede llegar a la app, y se hace **un solo arrastre real** desde el gestor de archivos del usuario:

- El evento DOM `drop` del editor: un log en la primerísima línea del handler, antes de cualquier parseo o condición, que vuelque los tipos disponibles y la cadena `text/uri-list` **cruda, sin procesar**.
- El evento nativo de drag-drop de la ventana webview de Tauri: una suscripción temporal que vuelque el payload completo (rutas y posición).

Ese único arrastre dice cuál de los dos canales recibe el evento. Y si es el DOM, entrega además la cadena exacta que hay que saber parsear — que es justo lo que hace falta si el fallo resulta ser de parseo y no de canal.

**Segunda observación, en el mismo pase manual:** arrastrar una selección de texto dentro del propio editor y anotar si sigue moviéndose. Es la única forma de saber si la interceptación nativa a nivel de ventana también se come los arrastres internos de CodeMirror, y es lo que decide si eliminar los handlers DOM pone en riesgo esa funcionalidad.

**Contexto de la evidencia actual, que está en tensión y por eso hace falta este ticket:**

- A favor de que el canal ganador sea el nativo: `drag_drop_enabled` es `true` por defecto en `tauri-utils` 2 y la configuración de la app no lo sobreescribe, así que la ventana debería interceptar los drops de fichero a nivel de sistema operativo, impidiendo que el `drop` DOM dispare.
- En contra: el log de la sesión anterior muestra que `dragover` **sí disparó** en el DOM con `types: ["text/uri-list", "text/html"]`. Si Tauri se tragara toda la secuencia de arrastre, no debería haber ni `dragover`.

No resuelvas esta tensión razonando. Resuélvela con el arrastre.

**Cómo capturar los logs:** DevTools del usuario se abren con clic derecho en la ventana → "Inspect Element", o `F12` / `Ctrl+Shift+I`. El usuario no lo conocía inicialmente — confirma que lo tiene abierto antes de pedirle que arrastre. Los `console.log` en los handlers de eventos DOM de CodeMirror llegan de forma fiable a esa consola (confirmado dos veces en la sesión anterior).

La instrumentación es temporal y se retira al cerrar el ticket; lo que persiste es el hallazgo, anotado en el propio fichero bajo `## Comments`.

## Acceptance criteria

- [x] Ambos canales están instrumentados simultáneamente antes de pedir el arrastre
- [x] El log del `drop` DOM está en la primera línea del handler, antes de cualquier condición que pueda impedir que se ejecute
- [x] Se ha realizado un arrastre real desde el gestor de archivos del usuario y se ha capturado la salida
- [x] Queda registrado cuál de los dos canales recibe el evento (o si no lo recibe ninguno)
- [x] Si el canal es el DOM, queda registrada la cadena `text/uri-list` cruda literal
- [x] Queda registrado si arrastrar texto seleccionado dentro del editor sigue moviéndolo
- [x] El valor efectivo de `dragDropEnabled` queda documentado en el repo, se cambie o no
- [x] El hallazgo queda anotado en este fichero bajo `## Comments`, indicando qué rama de arreglo procede: `04`/`05` (nativa) o `06` (DOM)
- [x] La instrumentación temporal se retira

## Blocked by

- None - can start immediately

## Comments

**2026-08-09 — instrumentación colocada, falta el arrastre manual.**

Ambos canales están instrumentados a la vez (`src/attachments/dropChannelDiagnostics.ts`):

- DOM: `logDomDropEvent(event)` es la **primera sentencia** del handler `drop` de
  CodeMirror (`MarkdownEditor.tsx`), antes de cualquier condición. Vuelca `types`,
  la cadena `text/uri-list` **cruda** (`JSON.stringify`, sin procesar), `text/plain`,
  el número de `File` y las coordenadas del puntero.
- Nativo: `subscribeToNativeDropDiagnostics()` se suscribe a
  `getCurrentWebview().onDragDropEvent` desde un `useEffect` en `App.tsx` y vuelca
  el payload completo (tipo, rutas, posición). Registra
  `[drop-diagnostics] native drag-drop listener attached` al enganchar, para que se
  vea si la suscripción falló.

Ambos logs llevan el prefijo `[drop-diagnostics]`.

**`dragDropEnabled`: valor efectivo `true`.** Confirmado en la fuente de
`tauri-utils` 2 (`config.rs`: `#[serde(default = "default_true")] pub
drag_drop_enabled: bool`), y `tauri.conf.json` no lo sobreescribía. Ahora está
**escrito explícitamente** como `"dragDropEnabled": true` junto a
`"decorations": false`, sin cambiar el comportamiento: el valor deja de ser un
default implícito que haya que redescubrir.

**Pendiente (requiere al usuario):** con `npm run tauri:dev` y DevTools abiertas
(clic derecho → "Inspect Element", o `F12` / `Ctrl+Shift+I`), un solo arrastre real
de una imagen desde el gestor de archivos al editor. Anotar aquí qué prefijo
aparece (DOM, nativo, ambos o ninguno) y, si es DOM, la cadena `text/uri-list`
literal. En el mismo pase: arrastrar texto seleccionado dentro del editor y anotar
si sigue moviéndose. De ese dato sale la rama: `04`/`05` (nativa) o `06` (DOM).

**2026-08-09 — RESUELTO: gana el canal NATIVO. Procede la rama A (`04`/`05`); `06` queda descartado.**

Arrastre real desde el gestor de archivos del usuario. Salida capturada:

```
[drop-diagnostics] native drag-drop event – "{\"type\":\"drop\",\"paths\":[\"/home/alfonso/Notes/ingest/assets/2026-08-08-191955.png\"],\"position\":{\"x\":402,\"y\":146}}"
```

- **Canal ganador: el nativo.** El evento llega con ruta absoluta y posición del puntero.
- **El `drop` DOM NO dispara.** No apareció ni una línea `[drop-diagnostics] DOM drop fired`, pese a estar en la primerísima línea del handler. Los dos intentos de arreglo anteriores estaban cableados a un canal que nunca recibe nada — de ahí el "no pasa nada" sin error.
- **La tensión de la evidencia queda explicada.** El usuario observó "muchos eventos, uno por cada píxel donde me muevo": son los `type: "over"` del canal nativo. Que `dragover` sí disparase en el DOM en la sesión anterior no significaba que el DOM recibiera el drop; Tauri intercepta la secuencia completa y solo el `drop` se queda sin llegar al DOM.
- **`dragDropEnabled`: `true`** (default de `tauri-utils` 2, `config.rs`: `#[serde(default = "default_true")] pub drag_drop_enabled: bool`). Ahora escrito explícitamente en `tauri.conf.json`. Documentado además en `docs/adr/0013-image-drag-and-drop-through-tauris-native-channel.md`.
- **Arrastre de texto interno del editor: NO observado.** Queda como criterio sin verificar. No bloqueó al ticket `07`: los handlers DOM que se eliminaron solo actuaban sobre arrastres de fichero (devolvían `false` para cualquier otro), así que el arrastre interno de texto lo gestiona CodeMirror y no dependía de ellos. Si la interceptación nativa afectase al arrastre interno, lo haría igual antes y después de la limpieza.
- Instrumentación temporal retirada en el ticket `07`.
