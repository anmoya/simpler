# Guía: pensar como PM cuando ya piensas como TL

Esta guía no enseña gestión de producto desde cero. Enseña la diferencia entre dos formas de mirar el mismo problema, para alguien que ya domina una de ellas. Simpler es el gimnasio: pequeño, real, usado a diario, y sin nadie a quien rendirle cuentas si el ejercicio sale mal.

## El obstáculo central

Venir de TL es la posición **más difícil** desde la cual aprender la lente de producto, más difícil que empezar de cero. No por falta de habilidad: por exceso. Un TL mira una fricción y ve la implementación en tres segundos —el handler que falta, la condición mal puesta, el estado que no se propaga— y a partir de ese instante ya no puede ver el problema, solo la solución. La competencia es lo que estorba.

La consecuencia práctica: un PM con background técnico no tiene que aprender a resolver, tiene que aprender a **postergar la resolución**. Todo lo demás sale de ahí.

Segundo obstáculo, más silencioso: muchos TL creen que ya hacen producto porque priorizan backlog. Priorizar es ordenar dentro de un marco que alguien más definió. Producto es **elegir el marco**. Son actividades distintas y la primera no entrena la segunda.

## Las seis diferencias

| | Lente TL | Lente PM |
| --- | --- | --- |
| Unidad de trabajo | El cambio | El resultado para quien usa |
| Dirección | De la solución hacia atrás | Del problema hacia adelante |
| "Listo" significa | Pasa tests, revisado, en `main` | La persona logró lo que venía a lograr |
| Decir que no | "No ahora" (capacidad) | "No nunca" (identidad) |
| Relación con la evidencia | El código es la verdad y está disponible | La evidencia es parcial y sesgada, y aun así hay que decidir |
| Qué se optimiza | Costo de cambio futuro | Valor entregado ahora |

Las tres primeras son de método y se corrigen con disciplina. Las tres últimas son de carácter y cuestan años.

**Sobre decir que no.** La diferencia entre "no ahora" y "no nunca" es la más grande de la tabla. Un TL aplaza por capacidad y todo vuelve eventualmente al backlog. Un PM rechaza por identidad: esto no es lo que este producto es, y por eso no va a estar nunca. `CONTEXT.md` ya contiene un "no nunca" bien construido —wikilinks, backlinks, tags, búsqueda semántica— y sostenerlo cuando duela es el ejercicio, no escribirlo.

**Sobre el conflicto entre las dos últimas filas.** Aquí es donde las lentes se pelean de verdad. El TL quiere refactorizar `ClassicShell` antes de tocar la estética, porque el costo de cambio va a subir. El PM quiere la mejora visible ahora, aunque el código empeore. Los dos tienen razón. Aprender producto no es aprender a darle la razón al PM siempre: es aprender a **nombrar el trade-off en voz alta** en lugar de resolverlo por reflejo hacia el lado que te resulta cómodo. Si tu reflejo es siempre el del TL —y lo va a ser— ese es tu punto ciego, no tu criterio.

## Los tres músculos

### 1. Quedarse en el problema

El ejercicio es incómodo a propósito: ante cada fricción de la bitácora, escribir tres formulaciones distintas del problema **antes** de permitirse pensar en soluciones.

> No pude mover la nota arrastrándola.
> Mover notas entre carpetas requiere descubrir el menú contextual.
> Reorganizar el Workspace es lo bastante costoso como para que acumule notas sin ordenar.

Las tres describen el mismo evento y llevan a productos distintos. La primera pide drag-and-drop. La tercera pregunta si el problema es mover notas o si es que la estructura de carpetas exige demasiado mantenimiento. Un TL agarra la primera porque es la accionable. La tercera es donde vive el producto.

### 2. Distinguir lo que quieres construir de lo que hace falta

Es la calibración del freeze, y no tiene atajo: comparar lo que la bitácora registró contra lo que `docs/backlog.md` predijo. La brecha es la medida de tu sesgo, y una vez que la ves con números propios ya no se te olvida.

Mientras tanto, una pregunta de bolsillo ante cada idea: *si esto costara diez veces más de implementar, ¿lo seguiría queriendo?* Si la respuesta es no, lo que te atrae no es el valor, es la implementación.

### 3. Salir de tu propio contexto

Tú sabes qué es un Workspace, por qué Sync no muestra plumbing de Git, y qué significa "Focus Active Note". Nada de eso está en la cabeza de quien abre la app por primera vez. El ejercicio no requiere usuarios reales: tomar una pantalla, taparse el conocimiento previo y preguntar qué comunica sola. La pantalla de Simpler sin Workspace abierto es el mejor caso de práctica que tienes.

## Ejercicios del freeze

**Semana 1 — definición de 1.0 y non-goals.** Escribir qué tiene que funcionar sin excusas para llamarlo 1.0, y qué queda fuera de forma permanente. La regla que hace que el ejercicio enseñe: cada cosa que entra a 1.0 obliga a sacar otra. Sin ese tope, es una lista de deseos y no entrena nada. Fuente de la lista: la bitácora hasta ese momento, no la memoria.

**Semana 2 — riesgos y política de datos.** Qué promete Simpler sobre las notas de quien lo usa, y qué pasa cuando no puede cumplirlo: escritura interrumpida, `schema_version` que sube, Sync que falla a medias, actualización que rompe. Esto se ve técnico y no lo es — es la definición del contrato con el usuario. La parte de producto es decidir **qué se promete**; la implementación viene después y es lo fácil.

**Cierre — triage y calibración.** Agrupar por tema, ordenar por severidad × frecuencia, recién ahí convertir en tickets bajo `.scratch/`. Y responder por escrito las tres preguntas de calibración de `freeze-2026-08.md`.

## Cómo leer la bitácora sin engañarse

Tres sesgos que van a aparecer, garantizado:

- **Vividez sobre frecuencia.** La entrada que recuerdas con más rabia no es la más importante. Cuenta las repeticiones; no confíes en la memoria del malestar.
- **Lo reciente sobre lo persistente.** Lo del último día pesa el doble al momento del triage. El antídoto es que las entradas tienen fecha: úsalas.
- **Lo arreglable sobre lo importante.** Un `bloqueó` que exige repensar un modelo se posterga solito frente a tres `noté` que se arreglan en una tarde. Si al final del triage tu lista son puras cosas fáciles, el sesgo ganó.

## Señales

**Estás aprendiendo si**: describes una fricción sin mencionar ni un archivo; rechazas una idea tuya que te gustaba; el "listo" de algo cambia porque el resultado no se logró aunque el código funcione; te descubres eligiendo la formulación incómoda del problema.

**Estás fingiendo si**: cada entrada de la bitácora ya trae solución adentro; el 1.0 incluye todo lo que estaba en el backlog; los non-goals son cosas que igual no querías hacer; ninguna decisión de este mes te costó nada.

## Qué no es esto

No es una certificación ni un framework. No hay OKRs, ni RICE, ni story points — con un usuario serían teatro. Es una sola cosa practicada muchas veces: **mirar el mismo hecho desde el resultado en vez de desde la implementación**, hasta que sea el reflejo por defecto y no un esfuerzo consciente.

Lo que sí se transfiere a un equipo real, después, es exactamente eso.
