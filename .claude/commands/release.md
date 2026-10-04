---
description: Prepara una nueva versión de ziurcast-base (preflight + verificar + previsualizar el CHANGELOG + commit y tag de release) y para antes de publicar
argument-hint: '[versión: 1.0.0 | major | minor | patch, opcional]'
---

Invoca el skill `release` y sigue sus instrucciones **al pie de la letra**, sin añadir ni quitar pasos.

Ese archivo (`.claude/skills/release/SKILL.md`) es la fuente de verdad del procedimiento: el preflight,
la verificación, la decisión del salto y la regla de PARAR antes de `git push --follow-tags` y
`npm publish`, que son irreversibles y los lanza el usuario.

Este comando existe solo para que el skill aparezca en el desplegable de `/`. **No dupliques aquí la
receta**: si algo del procedimiento cambia, se cambia en el skill.

Versión o contexto que ha dado el usuario (puede estar vacío): $ARGUMENTS
