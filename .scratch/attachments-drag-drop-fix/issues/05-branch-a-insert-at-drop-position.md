# Rama A · Insertar en el punto donde se soltó

Status: ready-for-human

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

- [ ] Soltar una imagen lejos del cursor inserta la referencia en el punto de soltado, no en la posición antigua del cursor
- [ ] Verificado manualmente por el usuario soltando en varios puntos del documento (arriba, en medio, al final), con el resultado anotado en este fichero bajo `## Comments`
- [ ] La barra de título propia de la ventana no introduce desplazamiento vertical en la posición de inserción
- [ ] El factor de escala del monitor está contemplado explícitamente en la traducción, no asumido como 1
- [ ] Soltar sobre un documento con scroll inserta en el punto visible correcto, no en el equivalente sin desplazar
- [ ] Si la traducción de coordenadas no da una posición válida, se inserta en el cursor sin error
- [ ] Todo lo verificado en `04` sigue funcionando
- [ ] `npm run test` pasa y `tsc` está limpio

## Blocked by

- `.scratch/attachments-drag-drop-fix/issues/04-branch-a-native-drop-inserts-image.md`
