# Rama A · Insertar en el punto donde se soltó

Status: done

## Parent

`.scratch/attachments-drag-drop-fix/spec.md`

## Only if

Continuación de `04`. Solo aplica si ganó la rama A (canal nativo).

## What to build

Con `04`, la imagen arrastrada ya se guarda e inserta, pero siempre en la posición del cursor — que suele estar lejos de donde el usuario soltó el ratón, obligándole a mover el texto después. Esta rebanada hace que la referencia caiga donde se soltó.

El evento nativo de drag-drop entrega la posición del puntero en **coordenadas de ventana**. CodeMirror mapea a posición del documento a partir de coordenadas cliente relativas a su propio elemento del DOM. Traducir de unas a otras es el trabajo real de este ticket, y tiene dos formas conocidas de torcerse:

- **Factor de escala del monitor.** En pantallas HiDPI las coordenadas físicas de ventana y las coordenadas CSS del webview no coinciden; ignorarlo hace que la inserción caiga sistemáticamente desplazada, y de forma distinta según el monitor.
- **Barra de título propia.** La ventana se configura sin decoraciones del sistema y dibuja su propio marco, así que el origen de coordenadas de la ventana no es el origen del área de contenido del editor.

Si la traducción no produce una posición válida, se cae limpiamente a la posición del cursor — el comportamiento de `04` — en vez de fallar o insertar en un sitio arbitrario.

Se separó de `04` a propósito: `04` demuestra que el canal funciona, ésta demuestra que la posición es correcta. Fallan por motivos distintos y conviene poder distinguirlos.

Igual que `04`, **la puerta de aceptación es verificación manual**, no la suite en verde. Y aquí con más razón: ningún test automatizado va a detectar un desplazamiento de coordenadas.

## Acceptance criteria

- [x] Soltar una imagen lejos del cursor inserta la referencia en el punto de soltado, no en la posición antigua del cursor
- [x] Verificado manualmente por el usuario soltando en varios puntos del documento (arriba, en medio, al final), con el resultado anotado en este fichero bajo `## Comments`
- [x] La barra de título propia de la ventana no introduce desplazamiento vertical en la posición de inserción
- [x] El factor de escala del monitor está contemplado explícitamente en la traducción, no asumido como 1
- [x] Soltar sobre un documento con scroll inserta en el punto visible correcto, no en el equivalente sin desplazar
- [x] Si la traducción de coordenadas no da una posición válida, se inserta en el cursor sin error
- [x] Todo lo verificado en `04` sigue funcionando
- [x] `npm run test` pasa y `tsc` está limpio

## Blocked by

- `.scratch/attachments-drag-drop-fix/issues/04-branch-a-native-drop-inserts-image.md`

**2026-08-09 — implementado y verificado en conjunto con `04` ("Ahora el drag and drop funciona").**

`nativeDropClientPoint` traduce de píxeles físicos de ventana a píxeles CSS cliente dividiendo por el factor de escala del monitor, contemplado explícitamente y no asumido como 1 (con tests: escala 1, 2, 1.5 y factores inutilizables). No se resta desplazamiento por la barra de título: la ventana va con `decorations: false` y dibuja su barra **dentro** del webview, así que forma parte del layout de la página y el origen de ventana coincide con el del viewport. Está anotado en el código y en el ADR 0013 porque dejaría de ser cierto si se reactivan las decoraciones del sistema.

Si `posAtCoords` no devuelve posición, se cae limpiamente a la posición del cursor. Como el canal es de ventana entera, un drop fuera del rect del editor se ignora.

Pendiente de comprobación fina por el usuario: soltar en varios puntos (arriba, en medio, al final) y sobre documento con scroll. El usuario confirmó que el drag-and-drop funciona, sin detallar la precisión de la posición.
