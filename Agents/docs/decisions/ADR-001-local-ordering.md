# ADR 001 — Local merchant ordering demo
**Status:** Accepted for the hackathon build. Source: issue #1 and the owner's build handoff.

A single Next.js application lets the partner build against the same origin as the API. Node 24 supplies SQLite without a native add-on. A local database transaction checks draft versions and stores the receipt, allowing double-clicks and retries safely. A hosted multi-instance deployment would need shared durable storage and merchant authentication. Revisit before any live supplier integration.
