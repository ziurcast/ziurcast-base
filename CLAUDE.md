# Claude instructions

This repository contains the Project Base Generator. The canonical architecture contract for generated applications is in `architecture/`.

Read `architecture/README.md` first, then the document relevant to the requested change. Do not duplicate the full architecture here. Follow the documented framework boundaries, naming conventions, lazy directory creation, and decision status.

To cut a release, use `/release` (`.claude/skills/release/SKILL.md`); it prepares the release and stops before `git push` and `npm publish`.
