# Eliminar el canal perdedor y documentar la decisión

Status: ready-for-agent

## Parent

`.scratch/attachments-drag-drop-fix/spec.md`

## What to build

El drag-and-drop ha pasado por tres iteraciones y deja sedimento: código de un canal que no se usa, y tests que pasaban con el producto roto. Esta rebanada limpia y deja el porqué escrito, para que la próxima persona no repita el ciclo.

**Si ganó la rama A (canal nativo):** se eliminan los handlers DOM `dragover` y `drop` de adjuntos añadidos en la sesión anterior. Decisión ya tomada por el usuario: Simpler es Linux-first, la ruta nativa cubre el caso real y el camino DOM sería código muerto que nadie puede ejercitar. Esto deja macOS y Windows conscientemente sin cubrir para el drag-and-drop de imágenes — queda anotado como decisión, no como olvido.

Antes de borrar, comprueba lo que `03` registró sobre el arrastre de texto interno del editor: si la interceptación nativa lo afecta, dilo aquí en vez de borrar y descubrirlo después.

**Si ganó la rama B (canal DOM):** no hay canal nativo que retirar; se limita a la limpieza de tests y a la documentación.

**En ambos casos:**

- Se retira o se reescribe como test del módulo puro el test de drop del editor que simula `text/uri-list` con `getData` mockeado. Ese test **pasa con la feature completamente inoperante** — construye un evento sintético bien formado y comprueba nuestra propia lógica contra él. Un test que no puede distinguir "funciona" de "no funciona" es peor que ninguno, porque produce la confianza falsa que cerró esta feature dos veces.
- Queda documentado en el repo: el valor efectivo de `dragDropEnabled`, qué canal recibe los drops en WebKitGTK/Tauri, y que la verificación de esta feature es manual porque jsdom no puede validarla.
- Se retira cualquier instrumentación temporal que quede de los tickets anteriores.

## Acceptance criteria

- [ ] El código del canal perdedor está eliminado, o queda escrito por qué se conserva
- [ ] El test de drop que pasaba con el producto roto ya no existe en esa forma
- [ ] La cobertura restante del reconocimiento de rutas vive en los tests del módulo puro
- [ ] Está documentado en el repo qué canal recibe los drops y cuál es el valor efectivo de `dragDropEnabled`
- [ ] Está documentado que la verificación de drag-and-drop es manual y por qué
- [ ] Si se dejaron macOS/Windows sin cubrir, está anotado como decisión explícita
- [ ] No queda instrumentación temporal de diagnóstico en el código
- [ ] El drag-and-drop verificado en la rebanada de arreglo sigue funcionando tras la limpieza
- [ ] `npm run test` pasa, `npm run test:native` pasa y `tsc` está limpio

## Blocked by

- `.scratch/attachments-drag-drop-fix/issues/05-branch-a-insert-at-drop-position.md` (si ganó la rama A)
- `.scratch/attachments-drag-drop-fix/issues/06-branch-b-fix-dom-uri-list-drop.md` (si ganó la rama B)
