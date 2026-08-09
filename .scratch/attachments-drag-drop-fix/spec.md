# Drag-and-drop de imágenes: diagnóstico y remediación

Status: ready-for-agent

## Source

Continuación de `.scratch/attachments/spec.md` (issue `02-drag-and-drop-image-from-os.md`, implementada pero **no funcional en la app real**). Handoff de la sesión anterior: `/tmp/simpler-handoff-attachments-drag-drop-2026-08-08.md`. Producido vía `/to-prd` el 2026-08-08.

## Problem Statement

Arrastro una imagen desde mi gestor de archivos hasta el editor de una nota y **no pasa nada**. Ni se guarda el fichero en `assets/`, ni se inserta la referencia Markdown, ni aparece ningún mensaje de error. El pegado con Ctrl+V sí funciona (confirmado), así que la diferencia es específica del gesto de arrastrar.

Peor aún: la funcionalidad ya se ha dado por terminada **dos veces**, ambas con la suite en verde (126/126 TS, 69/69 Rust). Los tests automatizados no distinguen entre "funciona" y "no funciona" en este camino, porque validan nuestra propia lógica JS contra un evento sintético bien formado en jsdom, no el comportamiento real de WebKitGTK dentro de una ventana Tauri. Como usuario, no puedo confiar en la señal de "tests pasan" para esta feature.

## Solution

Dos entregables, en este orden estricto:

1. **Una observación diagnóstica antes de tocar nada más.** Instrumentar simultáneamente los dos canales por los que un drop del sistema operativo puede llegar a la app —el evento DOM `drop` de WebKitGTK y el evento nativo de Tauri `onDragDropEvent`— y hacer **un solo arrastre real** desde el gestor de archivos. Ese arrastre dice qué canal recibe el evento y, si es el DOM, entrega además la cadena `text/uri-list` cruda exacta. Sin ese dato, cualquier arreglo es el tercer intento a ciegas.

2. **La remediación que corresponda al canal ganador.** Arrastrar una imagen al editor la guarda en `assets/` con las mismas reglas de nombre y ubicación que el pegado (`<timestamp>.<ext>`, carpeta `assets/` compartida por directorio) e inserta `![](assets/<fichero>.<ext>)` en la posición del documento más cercana al punto donde solté el ratón. Si algo falla en el camino, lo veo: un import fallido nunca vuelve a desaparecer en silencio.

## User Stories

1. Como usuario de Simpler en Linux, quiero arrastrar un PNG desde mi gestor de archivos al editor, para que quede guardado en el Workspace y referenciado en la nota sin pasar por el portapapeles.
2. Como usuario, quiero que la referencia Markdown se inserte en el punto donde solté el ratón, para no tener que mover el texto después desde donde estaba el cursor.
3. Como usuario, quiero que la imagen arrastrada se guarde con las mismas reglas que la pegada (`assets/<timestamp>.<ext>`), para que ambas rutas produzcan un Workspace consistente.
4. Como usuario, quiero que dos imágenes soltadas en el mismo segundo no se pisen entre sí, para no perder la primera.
5. Como usuario, quiero arrastrar imágenes con acentos o espacios en el nombre (`captura año.png`, `mi foto.jpg`), para que funcione con mis ficheros reales y no solo con nombres ASCII.
6. Como usuario, quiero que un fichero con extensión en mayúsculas (`FOTO.PNG`) o variante (`.jpeg`) se reconozca como imagen, para no tener que renombrarlo antes.
7. Como usuario, quiero que arrastrar un fichero que **no** es imagen (un PDF, un `.zip`) no rompa nada ni inserte basura en la nota, conservando el comportamiento actual.
8. Como usuario, quiero que si el import falla (permisos, disco lleno, ruta ilegible) aparezca un error visible en la UI, para saber que ocurrió algo en vez de creer que la app me ignoró.
9. Como usuario, quiero que el drop funcione igual dentro de una nota abierta en cualquier carpeta del Workspace, resolviendo `assets/` relativo a la carpeta de la nota, no a la raíz.
10. Como usuario, quiero que la ventana con `decorations: false` (barra de título propia) no desplace la posición de inserción, para que la imagen caiga donde solté y no unos píxeles más arriba.
11. Como usuario en una pantalla HiDPI, quiero que la posición de inserción sea correcta pese al factor de escala, para que el comportamiento no dependa de mi monitor.
12. Como usuario, quiero que arrastrar varias imágenes a la vez tenga un comportamiento definido y no un fallo a medias, aunque sea insertar solo la primera.
13. Como usuario, quiero que arrastrar sobre el editor muestre algún indicio de que el drop es aceptado, para no soltar a ciegas.
14. Como desarrollador del proyecto, quiero saber por qué canal llega realmente el drop en WebKitGTK/Tauri, para dejar de adivinar entre intentos de arreglo.
15. Como desarrollador, quiero que la lógica de decidir "esta ruta arrastrada es una imagen importable" viva en una función pura sin DOM, para poder probarla exhaustivamente sin webview.
16. Como desarrollador, quiero que el código muerto del canal perdedor se elimine, para no mantener dos rutas de las que una nunca se ejercita.
17. Como desarrollador, quiero que el criterio de aceptación de esta feature sea una verificación manual registrada y no "la suite está verde", para que no se vuelva a dar por cerrada sin funcionar.
18. Como desarrollador, quiero que el valor efectivo de `dragDropEnabled` quede documentado en el repo, para que la próxima persona no vuelva a descubrirlo desde cero.
19. Como usuario, quiero que el arreglo del drop no rompa el pegado con Ctrl+V, que ya funciona y está confirmado.
20. Como usuario, quiero que arrastrar texto seleccionado dentro del propio editor (mover un fragmento) siga funcionando como antes y no se confunda con un drop de fichero.

## Implementation Decisions

### Orden y bifurcación

- La causa raíz **no se da por sentada**. La evidencia actual apunta a la rama A pero no la cierra:
  - A favor de A: `drag_drop_enabled` es `true` por defecto en `tauri-utils` 2 y `tauri.conf.json` no lo sobreescribe, así que la ventana intercepta los drops de fichero a nivel de sistema operativo.
  - En contra de A: el log del handoff muestra que `dragover` **sí se disparó** en el DOM con `types: ["text/uri-list", "text/html"]`. Si Tauri se tragara toda la secuencia de arrastre, no debería haber `dragover`.
  - Además, nadie observó nunca el segundo intento de arreglo — no se capturó consola. Es posible que el `drop` DOM sí dispare y que el fallo sea de parseo o un error tragado.
- Por tanto: **ticket 01 es diagnóstico puro**, y los tickets de arreglo se escriben como `02a` (canal nativo) y `02b` (canal DOM), de los cuales se implementa solo el que corresponda.
- El ticket 01 aprovecha el mismo arrastre manual para una segunda observación gratuita: **arrastrar una selección de texto dentro del propio editor** y anotar si sigue moviéndose. Es la única forma de saber si la interceptación nativa a nivel de ventana también se come los arrastres internos, y es lo que decide si la historia 20 corre peligro al eliminar los handlers DOM.

**Rama A — el drop llega por el canal nativo de Tauri**
- Se escucha el evento nativo de drag-drop de la ventana webview, que entrega rutas absolutas y la posición del puntero.
- La posición viene en coordenadas de ventana y hay que traducirla a coordenadas cliente del elemento DOM de CodeMirror antes de mapearla a posición del documento. Esto es trabajo propio, no una línea: intervienen el factor de escala del monitor y el desplazamiento introducido por la barra de título propia (`decorations: false`).
- Los handlers DOM `dragover`/`drop` actuales **se eliminan** (decisión tomada): Simpler es Linux-first, la ruta nativa cubre el caso real y el código DOM sería código muerto que nadie puede ejercitar.

**Rama B — el drop llega por el canal DOM**
- Se conserva el handler DOM y se arregla lo que realmente falla, con la cadena cruda capturada en el ticket 01 como caso de prueba literal.
- Sospechosos concretos ya identificados en el código actual: el prefijo se recorta como `file://` (deja la ruta sin `/` inicial cuando la URI es `file:///…`), el `decodeURIComponent` puede fallar con secuencias inválidas, y la extensión se extrae con un `split(".").pop()` que no contempla rutas sin extensión ni mayúsculas correctamente en todos los casos.

### Módulos

- **Módulo puro de reconocimiento de ruta arrastrada** (nuevo, sin DOM ni Tauri). Interfaz deliberadamente estrecha: recibe una cadena `text/uri-list` cruda **o** una lista de rutas absolutas, y devuelve la ruta absoluta de imagen a importar, o nada. Encapsula: selección de la primera línea no comentada, normalización `file://` vs `file:///` vs host vacío, decodificación percent-encoding tolerante a fallos, recorte de `\r\n`, y comprobación de extensión insensible a mayúsculas contra el conjunto de extensiones importables. Es el módulo profundo de este PRD: mucha casuística sucia detrás de una firma que no cambia, y probable sin webview.
- **Adaptador de canal de drop** (nuevo o refactor del handler actual). Capa fina: se suscribe al canal ganador, obtiene ruta + coordenadas, delega el reconocimiento al módulo puro, traduce coordenadas a posición del documento y llama al import ya existente. No contiene lógica de parseo.
- **Superficie de error del import** (modificación). Hoy la invocación del import se lanza como promesa descartada sin captura, de modo que un fallo desaparece por completo. Pasa a enrutarse por el mismo canal de error que usa el resto de la app, de forma que cualquier fallo del import sea visible en la UI. Esto se aplica **también a la ruta de pegado**, que tiene el mismo patrón.
- **Handler nativo de import de adjunto (Rust)** — sin cambios. Ya existe, recibe una ruta absoluta, copia a `assets/` con nombre por timestamp y resolución de colisiones, y está cubierto por tests.
- **Configuración de la ventana** — se distinguen dos cosas: el valor efectivo de `dragDropEnabled` (hoy `true` por defecto, sin override) **se documenta en el repo pase lo que pase**, para que nadie vuelva a descubrirlo desde cero; el *cambio* de ese valor en la configuración solo se hace si el ticket 01 lo exige, y en tal caso se escribe explícitamente en vez de quedar implícito por defecto.

### Contratos y comportamiento

- El envelope del bus nativo (`{ domain, action, payload }` → `{ ok, domain, action, data, error }`) no cambia; no se añaden acciones nuevas. El import de adjunto por ruta ya existe en el dominio `filesystem`.
- Reglas de guardado idénticas a las del pegado: carpeta `assets/` hermana de la nota, nombre `<timestamp>.<ext>`, resolución de colisiones dentro del mismo segundo.
- Rutas: toda ruta relativa al Workspace sigue pasando por la validación existente que rechaza rutas absolutas, `..` y nombres internos con punto. La ruta *origen* del arrastre es absoluta y externa al Workspace por definición — es el único lugar donde se acepta una ruta absoluta, y solo como origen de lectura.
- Drop múltiple: si el canal entrega varias rutas, se importa **solo la primera imagen** reconocida. Comportamiento definido y simple; el resto se ignora sin error.
- Drop de no-imagen: no-op, se conserva el comportamiento actual. No se traga ni se convierte en error visible.

## Testing Decisions

Un buen test aquí describe comportamiento externo observable y **puede fallar cuando el producto está roto**. Ese es justamente el criterio que la iteración anterior no cumplió: el test de drop existente pasa con la feature completamente inoperante, porque construye a mano un evento sintético bien formado y comprueba nuestra propia lógica contra él. Un test que no puede distinguir "funciona" de "no funciona" es peor que ninguno, porque produce confianza falsa.

- **jsdom no puede validar este camino.** Queda escrito explícitamente: la puerta de aceptación de esta feature es una **verificación manual con el gestor de archivos del usuario, con log capturado**, no una suite verde. Ningún ticket de arreglo se cierra sin ese registro.
- **Se prueba el módulo puro de reconocimiento de ruta**, exhaustivamente y en aislamiento: `file:///` de tres barras, `file://` con host vacío, percent-encoding (espacios, acentos), `\r\n` final, comentarios `#`, múltiples líneas, extensión en mayúsculas, `.jpeg` y `.jpg`, ruta sin extensión, extensión no-imagen, entrada vacía, entrada malformada. Es el único módulo con cobertura automatizada densa, y es donde vive el riesgo real de bug.
- **Se prueba el surfacing de errores**: un import que falla produce un error visible en la UI en vez de desaparecer. Cubre tanto la ruta de drop como la de pegado.
- **No se añaden tests del adaptador de canal.** Decisión explícita del usuario: mockear un evento nativo sintético reproduce exactamente el patrón que ya dio falsa confianza. El adaptador se mantiene lo bastante fino como para que su corrección sea evidente por inspección, y se valida manualmente.
- **El test de drop existente en el editor** que simula `text/uri-list` con `getData` mockeado se elimina o se reescribe como test del módulo puro. No se conserva como está: pasa con el producto roto.
- Prior art: los tests unitarios en Rust de la lógica de Git/keychain contra implementaciones falsas de los traits son el modelo a seguir — lógica pura, colaboradores externos detrás de una interfaz estrecha. En TS, los tests colocados junto al módulo (`*.test.ts`) siguen la convención del repo.

## Out of Scope

- Renderizado de imágenes en el editor. Simpler edita Raw Markdown; ver `![](...)` como texto es correcto, no un bug.
- Mostrar `assets/` o ficheros no-Markdown en el árbol del Workspace. La lectura del árbol lista solo carpetas y `.md` por diseño; cambiarlo es otra feature.
- Límite de tamaño, compresión o redimensionado de imágenes.
- Limpieza de adjuntos huérfanos al borrar una nota.
- Arrastrar imágenes desde un navegador u otra aplicación (URLs remotas, `text/html` con `<img>`). Solo ficheros locales del gestor de archivos.
- Arrastrar carpetas.
- Soporte de drag-and-drop en macOS o Windows. Si la rama A gana y se elimina el camino DOM, esas plataformas quedan sin cubrir conscientemente; Simpler es Linux-first.
- Insertar más de una imagen por drop.
- Revisión general del código de adjuntos. Se hace después del arreglo, con `/code-review` contra el estado previo a la sesión anterior.

## Further Notes

- El arreglo del pegado por portapapeles es el precedente que valida el enfoque: cuando la API DOM de WebKitGTK no cumple, se rodea por la API nativa (GTK/Tauri). El mismo instinto aplica aquí, pero **solo después** de que el ticket 01 confirme cuál es el fallo.
- La lectura del portapapeles GTK debe ejecutarse en el hilo principal porque GTK no es thread-safe. Si la remediación toca código nativo con la misma restricción, conviene recordarlo.
- DevTools del usuario: clic derecho en la ventana → "Inspect Element", o `F12` / `Ctrl+Shift+I`. El usuario no lo conocía inicialmente; confirmar que lo tiene abierto antes de pedirle logs.
- Los `console.log` colocados en los handlers de eventos DOM de CodeMirror llegan de forma fiable a esa consola (confirmado dos veces la sesión anterior).
- Estado del repo: tres commits en `main` de la sesión anterior, ninguno empujado a `origin` (~10 commits por delante). El tercero es el intento de arreglo que no funcionó.
