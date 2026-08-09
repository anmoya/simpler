# Rama B · Arreglar el drop DOM por `text/uri-list`

Status: ready-for-human

## Parent

`.scratch/attachments-drag-drop-fix/spec.md`

## Only if

El diagnóstico (`03`) concluyó que el `drop` DOM **sí dispara** en la app real. Si concluyó que el evento llega por el canal nativo de Tauri, implementa `04` y `05` en su lugar y cierra ésta sin trabajo. Esta rebanada y `04`/`05` son alternativas excluyentes: solo una se implementa.

## What to build

Si el `drop` DOM dispara, entonces el canal nunca fue el problema y el handler actual está fallando por otro motivo — el arreglo del intento anterior no funcionó por una razón que el diagnóstico habrá dejado a la vista. Esta rebanada arregla esa razón, con la cadena `text/uri-list` **cruda literal** capturada en `03` como caso de prueba de partida.

Sospechosos ya identificados por lectura del código actual, en orden de probabilidad:

- El prefijo se recorta como `file://`, lo que deja la ruta sin la barra inicial cuando la URI trae tres barras (`file:///home/…` → `home/…`). Una ruta relativa así no existe y la copia falla. Este es el candidato más fuerte y ya queda corregido por el módulo puro de `01`.
- El error del import se traga sin capturar, así que un fallo real es indistinguible de "no pasó nada" — cubierto por `02`, que puede haber revelado la causa por sí solo.
- La comprobación de extensión o la decodificación percent-encoding fallando con el fichero concreto que el usuario probó.

El orden de trabajo aquí es: mete la cadena cruda de `03` como caso de prueba en el módulo puro de `01`, comprueba si ya pasa, y sigue desde el primer punto donde el comportamiento real se desvía del esperado. No teorices más allá de eso: éste es el tercer intento de arreglo y los dos anteriores fueron a ciegas.

El handler DOM se conserva y se arregla; no se introduce el canal nativo.

**La puerta de aceptación es una verificación manual con el gestor de archivos del usuario**, no la suite en verde. El test de drop existente pasa con la feature completamente inoperante — no lo tomes como señal.

## Acceptance criteria

- [ ] La cadena `text/uri-list` cruda capturada en `03` está incorporada como caso de prueba del módulo puro y se reconoce correctamente
- [ ] Arrastrar un PNG desde el gestor de archivos guarda el fichero en la carpeta `assets/` hermana de la nota e inserta `![](assets/<timestamp>.<ext>)`
- [ ] Verificado manualmente por el usuario con su gestor de archivos real, con la salida capturada y anotada en este fichero bajo `## Comments`
- [ ] La referencia se inserta en el punto donde se soltó el ratón, no en la posición antigua del cursor
- [ ] Funciona con una nota situada en una subcarpeta del Workspace
- [ ] Dos imágenes soltadas dentro del mismo segundo no se pisan
- [ ] Arrastrar una imagen con espacios o acentos en el nombre funciona
- [ ] Arrastrar un fichero que no es imagen no inserta nada ni produce error
- [ ] Arrastrar texto seleccionado dentro del editor sigue moviéndolo
- [ ] El pegado con Ctrl+V sigue funcionando
- [ ] `npm run test` pasa, `npm run test:native` pasa y `tsc` está limpio

## Blocked by

- `.scratch/attachments-drag-drop-fix/issues/03-diagnose-which-drop-channel-fires.md`
- `.scratch/attachments-drag-drop-fix/issues/01-extract-dropped-image-path-module.md`
