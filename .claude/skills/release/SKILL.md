---
name: release
description: >-
  Prepara una nueva versión publicable de ziurcast-base: preflight, verificación, previsualización
  del CHANGELOG, commit de release y tag — y PARA antes de los dos comandos irreversibles
  (git push --follow-tags y npm publish), que lanza el usuario.
  USAR cuando el usuario pida una release, subir la versión, sacar un tag nuevo o publicar en npm.
  NO usar para commitear el cambio que se va a publicar (eso va antes, por PR) ni para auditar
  el generador: la release no es el momento de revisar código que nadie ha tocado.
---

# Release de `ziurcast-base`

Es un CLI **publicado en npm** que la gente ejecuta con `npx ziurcast-base@latest`: lo que se
publique es lo que genera los proyectos nuevos de todo el mundo desde ese momento. Además, los
proyectos generados declaran `ziurcast-base: ^<versión>` como dependencia de desarrollo, así que un
salto mal elegido cambia qué versión instalan.

El trabajo pesado lo hace `npm run release` (`scripts/release.mjs` + `scripts/release-notes.mjs`):
genera el CHANGELOG desde los Conventional Commits, sube la versión, hace el commit y el tag. **Nunca
empuja ni publica.** Esta receta añade lo que el script no puede hacer: mirar, decidir el salto,
esperar al CI y parar a tiempo.

---

## 0 · Preflight — solo lectura

```bash
LAST=$(git describe --tags --abbrev=0 --match 'v[0-9]*' 2>/dev/null || echo "")
echo "── rama ──────"; git rev-parse --abbrev-ref HEAD
echo "── sucio ─────"; git status --short
echo "── sync ──────"; git fetch --quiet origin main && git rev-list --left-right --count HEAD...origin/main
echo "── último tag "; echo "${LAST:-(ninguno: el CHANGELOG incluirá todo el historial)}"
echo "── versión ───"; node -p "require('./package.json').version"
echo "── en npm ────"; npm view ziurcast-base versions --json
echo "── npm login ─"; npm whoami 2>&1 | tail -1
echo "── commits ───"; git log ${LAST:+"$LAST"..}HEAD --no-merges --oneline
echo "── CI HEAD ───"; gh run list --commit "$(git rev-parse HEAD)" --workflow CI --limit 1 --json databaseId,status,conclusion
```

Lee la salida contra esta tabla y, **si algo salta, dilo ANTES de tocar la versión**:

| Qué mirar | Cuándo parar y avisar |
| --- | --- |
| **Rama** | Si no es `main`. Las releases salen de `main`, que es lo que ya pasó por PR y CI. |
| **Árbol sucio** | Siempre. La release solo debe tocar `CHANGELOG.md`, `package.json` y `package-lock.json`. |
| **Sync** | Si `rev-list` no da `0 0`. Hay que hacer `git pull` (o subir lo pendiente por PR) antes. |
| **CI de HEAD** | Si no hay run o terminó distinto de `success`: parar. Si está `in_progress` o `queued`: **esperar**, no parar — `gh run watch <databaseId> --exit-status`. El CI corre la prueba de humo completa en Node 22 con los cuatro presets, que es la validación que no se repite en local. |
| **npm login** | `npm whoami` con `E401`/`ENEEDAUTH` no bloquea la preparación, pero **avísalo**: el usuario tendrá que hacer `npm login` con la cuenta personal `yjrcds` (nunca una de trabajo) antes de publicar. |
| **Ningún commit relevante** | Si desde el tag solo hay `chore(release)`, `test` o `style`, el script se niega (no hay nada que contar). Decirlo. |
| **Rotura sin marcar** | Si algún commit rompe el CLI, los flags, la estructura generada o el contrato de `architecture/` y no lleva `!` ni footer `BREAKING CHANGE:`, la rotura queda invisible. Decirlo ahora: se corrige antes, no en la release. |

## 1 · Verificar

```bash
npm test && npm run typecheck && npm run lint && npm run build
```

Completa, sin atajos. Si falla, se arregla por su propio PR y **se vuelve a empezar desde el paso 0**.

`npm run release:smoke` **no** se repite aquí: ya lo corrió el CI sobre este mismo commit (el
preflight exige ese CI en verde), y en local necesita Node.js ≥ 22.13.

## 2 · Decidir el salto y previsualizar

**La versión:**

- Si el usuario indicó una (`/release 1.0.0`, `/release minor`), se usa esa.
- **Primera versión estable: `1.0.0`.** Mientras `package.json` siga en `0.x`, la siguiente release es
  `1.0.0` — decisión del usuario (2026-10-04). `0.1.0` ya está en npm y no se toca.
- Después, según los commits desde el último tag: alguno con `!` o `BREAKING CHANGE:` → `major`;
  algún `feat` → `minor`; si no → `patch`. Si dudas entre dos, pregunta.

```bash
npm run release -- <versión|major|minor|patch> --dry-run
```

Enseña al usuario la versión y las notas tal cual salen. Contrasta con el preflight: los `chore`
aparecen en *Maintenance*; `chore(release)`, `test` y `style` no aparecen nunca.

## 3 · Preparar

```bash
npm run release -- <la misma versión del paso 2>
```

Escribe `CHANGELOG.md`, actualiza `package.json` y `package-lock.json`, hace el commit
`chore(release): vX.Y.Z` y crea el tag anotado `vX.Y.Z`. Repite los gates del preflight y se niega si
alguno falla.

## 4 · AQUÍ SE PARA

**No ejecutar nada más.** Reportar:

- La versión y el tag creados.
- El resumen de lo que quedó en el CHANGELOG.
- Cualquier aviso del preflight (sobre todo el login de npm).
- El único comando que falta, para que lo lance el usuario:

```bash
git push origin main --follow-tags && npm publish
```

`npm publish` reconstruye `dist/` solo (`prepack`) y pedirá el código de un solo uso si la cuenta lo
tiene activado. Es **irreversible**: una versión publicada en npm no se reutiliza nunca, solo se
depreca.

Mientras no se haya empujado, deshacerlo es trivial:

```bash
git tag -d vX.Y.Z && git reset --hard HEAD~1
```

### Después de publicar

Ofrecer, no lanzar:

- Comprobar lo publicado: `npx ziurcast-base@latest --version`.
- Crear el GitHub Release del tag con la sección de `CHANGELOG.md` de esa versión
  (`gh release create vX.Y.Z --title vX.Y.Z --notes-file <sección>`).

---

## Qué NO hacer

- Empujar o publicar por iniciativa propia, aunque todo esté en verde.
- Editar `CHANGELOG.md` a mano: se genera. Si la release sale mal, se deshace (paso 4) y se repite.
- Arreglar «de paso» lo que salte en el preflight o la verificación. Cada cosa va en su propio PR:
  mezclarlo con la release ensucia el commit y el CHANGELOG.
- Saltarse el CI con `--skip-ci-check` sin que el usuario lo pida expresamente.

## Casos que se salen de la receta

- **El push se rechaza** porque `main` avanzó: deshacer (paso 4), `git pull` y empezar de nuevo. No
  rebasar un commit de release ya taggeado.
- **`npm publish` falla después del push** (login, OTP, red): el tag ya es público y está bien que lo
  sea. Arreglar la causa y repetir solo `npm publish` desde ese mismo commit. **No** crear otra versión
  ni mover el tag.
- **El paquete o el bin cambian de nombre**: publicar con otro `name` es publicar otro paquete.
  Confirmarlo con el usuario y revisar `npm view <nombre> versions` antes.

## Dónde está el resto

- Lógica del CHANGELOG y de las versiones → `scripts/release-notes.mjs` (con tests en
  `scripts/release-notes.test.mjs`).
- Gates y pasos locales → `scripts/release.mjs`.
- Estado de publicación y auditoría → `RELEASE_READINESS.md`. Si este archivo y la documentación
  divergen, **manda este archivo**.
