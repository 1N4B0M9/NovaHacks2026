# Backend extraction — issue 4
Branch: backend-ordering. Lead owns server/interpret.ts and app/api/transcribe.

Typed English/illustrative Spanish uses curated aliases and conservative whole-line parsing. Unfamiliar words, ambiguous items and missing units require review. Optional photo transcription returns editable text before draft creation. Verified invalid images return 400 and missing provider configuration returns 503 via production HTTP. A live provider request and fluent language review remain unverified.
