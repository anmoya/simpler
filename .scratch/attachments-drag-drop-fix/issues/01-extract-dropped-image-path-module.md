# Extraer el reconocimiento de ruta arrastrada a un módulo puro

Status: done

## Parent

`.scratch/attachments-drag-drop-fix/spec.md`

## What to build

Hoy la lógica que decide "esta cosa arrastrada es una imagen que puedo importar" vive dentro del handler `drop` del editor Markdown, mezclada con el DOM y sin poder probarse en aislamiento. Esta rebanada la extrae a un módulo puro, sin DOM ni Tauri, con una interfaz deliberadamente estrecha.

El módulo recibe **o bien** una cadena `text/uri-list` cruda **o bien** una lista de rutas absolutas (los dos formatos que pueden llegar según el canal por el que entre el drop — ver la rebanada de diagnóstico), y devuelve la ruta absoluta de la imagen a importar, o nada si no hay ninguna reconocible.

Encapsula toda la casuística sucia:

- Selección de la primera línea no vacía y no comentada (`#`) de un `text/uri-list`.
- Normalización de `file://`, `file:///` y `file://host/…`. La implementación actual recorta el prefijo como `file://` y deja la ruta sin la barra inicial cuando la URI trae tres barras — ese es un bug latente concreto a corregir aquí.
- Decodificación percent-encoding tolerante a secuencias inválidas (no debe lanzar).
- Recorte de `\r\n` y espacios sobrantes.
- Extensión insensible a mayúsculas contra el conjunto de extensiones de imagen importables, contemplando rutas sin extensión y nombres con puntos intermedios.

Si llegan varias rutas o varias líneas, devuelve **solo la primera imagen reconocida**; el resto se ignora sin error.

El handler `drop` existente pasa a delegar en este módulo. **No cambia el comportamiento observable de la app** en esta rebanada — es una extracción con cobertura. El drag-and-drop sigue igual de roto que ahora; arreglarlo es trabajo de las rebanadas posteriores. Lo que esta entrega es el módulo donde vive el riesgo real de bug, ya probado, listo para que la rama ganadora lo consuma.

Este módulo es el módulo profundo del PRD: mucha casuística detrás de una firma que no va a cambiar. Sigue el patrón del repo de lógica pura probada en aislamiento (como las funciones puras de Git/keychain contra dobles de los traits).

## Acceptance criteria

- [x] Existe un módulo puro, sin dependencias de DOM ni de Tauri, que expone el reconocimiento de ruta arrastrada
- [x] Acepta tanto una cadena `text/uri-list` cruda como una lista de rutas absolutas
- [x] `file:///home/user/foto.png` devuelve `/home/user/foto.png` (con la barra inicial, no `home/user/foto.png`)
- [x] Rutas con percent-encoding se decodifican (`captura%20a%C3%B1o.png` → `captura año.png`)
- [x] Una secuencia percent-encoding inválida no lanza: devuelve nada o la ruta sin decodificar, de forma definida
- [x] `\r\n` final, líneas en blanco y líneas `#` de comentario se ignoran correctamente
- [x] `FOTO.PNG`, `foto.JPEG` y `foto.jpg` se reconocen como imagen
- [x] Una ruta sin extensión, con extensión no-imagen, o una entrada vacía o malformada devuelve nada
- [x] Con varias líneas o varias rutas, devuelve solo la primera imagen reconocida
- [x] El handler `drop` del editor delega en este módulo en vez de parsear por su cuenta
- [x] `npm run test` pasa y `tsc` está limpio

## Blocked by

- None - can start immediately
