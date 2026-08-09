# Rama A · Drop nativo inserta la imagen (en el cursor)

Status: ready-for-human

## Parent

`.scratch/attachments-drag-drop-fix/spec.md`

## Only if

El diagnóstico (`03`) concluyó que el drop llega por el **canal nativo de Tauri** y no por el `drop` DOM. Si concluyó lo contrario, implementa `06` en su lugar y cierra ésta sin trabajo.

## What to build

El tracer bullet de la rama A: arrastrar una imagen desde el gestor de archivos al editor la guarda en el Workspace e inserta su referencia Markdown. De punta a punta, por el canal nativo.

Se escucha el evento nativo de drag-drop de la ventana webview, que entrega rutas absolutas del sistema de ficheros. La ruta se pasa al módulo puro de reconocimiento (`01`) para decidir si es una imagen importable, y de serlo se importa con la acción nativa de import de adjunto que **ya existe** y ya está probada — no dupliques esa lógica ni toques el lado Rust.

**Deliberadamente fuera de esta rebanada: la traducción de coordenadas.** La referencia se inserta en la posición actual del cursor, no en el punto donde se soltó el ratón. Insertar en el punto de soltado es trabajo de `05`, separado porque es donde la rama A se tuerce con más facilidad (factor de escala del monitor, desplazamiento de la barra de título propia). Aquí lo que se demuestra es que el canal funciona y el fichero acaba en disco.

Reglas de guardado idénticas a las del pegado, porque es el mismo handler nativo: carpeta `assets/` hermana de la nota, nombre `<timestamp>.<ext>`, resolución de colisiones dentro del mismo segundo. La ruta *origen* del arrastre es absoluta y externa al Workspace — es el único lugar donde se acepta una ruta absoluta, y solo como origen de lectura; todo destino relativo al Workspace sigue pasando por la validación existente.

El adaptador que conecta el canal con el import se mantiene fino a propósito: no contiene lógica de parseo (vive en `01`) ni de guardado (vive en el handler Rust). Por eso no lleva tests propios — ver Testing Decisions del PRD.

**La puerta de aceptación de esta rebanada es una verificación manual con log capturado, no la suite en verde.** jsdom no puede validar este camino: la feature ya se dio por terminada dos veces con 126/126 tests pasando y sin funcionar.

## Acceptance criteria

- [ ] Arrastrar un PNG desde el gestor de archivos del usuario a una nota abierta guarda el fichero en la carpeta `assets/` hermana de la nota
- [ ] Se inserta `![](assets/<timestamp>.<ext>)` en el documento
- [ ] Verificado manualmente por el usuario con su gestor de archivos real, con la salida capturada y anotada en este fichero bajo `## Comments`
- [ ] Funciona con una nota situada en una subcarpeta del Workspace, resolviendo `assets/` relativo a la carpeta de la nota
- [ ] Dos imágenes soltadas dentro del mismo segundo no se pisan
- [ ] Arrastrar una imagen con espacios o acentos en el nombre funciona
- [ ] Arrastrar un fichero que no es imagen (PDF, `.zip`) no inserta nada ni produce error
- [ ] Soltar varias imágenes a la vez importa solo la primera, sin fallo a medias
- [ ] El pegado con Ctrl+V, ya confirmado como funcional, sigue funcionando
- [ ] `npm run test` pasa, `npm run test:native` pasa y `tsc` está limpio

## Blocked by

- `.scratch/attachments-drag-drop-fix/issues/03-diagnose-which-drop-channel-fires.md`
- `.scratch/attachments-drag-drop-fix/issues/01-extract-dropped-image-path-module.md`
