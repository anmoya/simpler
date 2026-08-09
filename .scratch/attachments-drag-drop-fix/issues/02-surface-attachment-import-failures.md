# Hacer visible el fallo de import de adjuntos

Status: done

## Parent

`.scratch/attachments-drag-drop-fix/spec.md`

## What to build

Cuando el guardado o el import de una imagen falla, hoy el usuario no se entera de nada: la invocación se lanza como una promesa descartada sin captura de error, así que un fallo de permisos, de disco lleno o de ruta ilegible desaparece por completo. Desde fuera es indistinguible de "la app me ignoró" — que es exactamente el síntoma que reporta el usuario con el drag-and-drop.

Esta rebanada enruta los fallos de adjuntos por el mismo canal de error que ya usa el resto de la app, de modo que cualquier error se vea en la UI.

Aplica a **las dos rutas**, no solo a la del drop:

- El drop de imagen (import por ruta absoluta).
- El pegado con Ctrl+V (guardado por bytes desde el portapapeles GTK), que tiene el mismo patrón de promesa sin capturar.

Esta rebanada es útil gane la rama que gane el diagnóstico, y tiene valor diagnóstico propio: si resulta que el import del drop **sí** se está ejecutando y fallando en silencio, esta entrega lo revela por sí sola.

No se inventa un sistema de notificaciones nuevo — se usa el mecanismo de error existente en la app. El mensaje debe decir qué operación falló, sin volcar detalles internos crudos al usuario.

## Acceptance criteria

- [x] Un import de adjunto que falla produce un error visible en la UI en vez de desaparecer
- [x] Un guardado de adjunto pegado que falla produce igualmente un error visible
- [x] Ninguna de las dos rutas deja una promesa sin captura de error
- [x] El fallo de un adjunto no rompe el editor ni pierde el contenido de la nota en curso
- [x] Existe cobertura automatizada de que un import fallido llega a la UI
- [x] El camino feliz del pegado con Ctrl+V, ya confirmado como funcional, sigue funcionando
- [x] `npm run test` pasa y `tsc` está limpio

## Blocked by

- None - can start immediately
