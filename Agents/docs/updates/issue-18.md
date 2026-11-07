# Development runtime repair

Issue #18 · branch `fix-dev-runtime`.

The Windows dev server on port 3000 ran Node 20.17.0. It failed to import `node:sqlite` during transcription module loading. The dev launcher now checks available Node executables and starts Next with a SQLite-capable Node 24+ or exits with setup instructions. HTTP, transcription and research import the shared error class directly.

Restarted the local app on Node 24.22.1. A live synthetic Chinese image returned a transcription and produced a SQLite-backed draft with 24 eggs held for review and one case of oat milk ready. All 30 tests and the TypeScript check passed.
