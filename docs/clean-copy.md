# Clean repository preparation

Prepared on 2026-11-04 for `domlen2003/grip-vis`.

The SvelteKit application is at the repository root. Application source, configuration, dependency lockfile and retained test fixtures were copied without runtime changes. The original working folder was left intact.

Included notes cover requirements, design, force conventions, simulator integration research, timestamped video analysis, outline provenance, the Windows/SimHub roadmap and the draft AI setup-engineering skill. Relative links were updated for the standalone layout.

Excluded: raw videos, audio, transcripts/captions, reference photographs, UI screenshots, PDFs, download metadata, private deployment history, superseded implementation plans, unrelated projects, dependency directories and generated build output. Original source URLs and video timestamps remain in the notes.

## Fresh verification

- A clean install with `npm ci` completed using the committed lockfile.
- `npm run check`: 0 errors and 0 warnings.
- `npm test`: 47 passed, 0 failed.
- `npm run build`: succeeded with the existing advisory for the lazy Three.js chunk.
- Source and test files were compared against the original copy and matched exactly.
- Included notes were audited for broken local links, personal machine paths, private deployment identifiers and accidental archive assets.

Dependency and generated build folders were removed after verification. Recreate them with the commands in the root README. The browser evidence in `../verification.md` is the historical 2026-10-30 record; this packaging task did not change UI behavior.
