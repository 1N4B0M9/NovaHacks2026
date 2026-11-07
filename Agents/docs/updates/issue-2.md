# Backend logic — issue 2
Branch: codex/backend-ordering. Lead owns server and app/api. Ready for review.

SQLite persists versioned drafts and one immutable receipt per draft. Amounts come from the fixture catalog. Five service tests passed under Node 24, including reopen/retry, edit invalidation and empty order. TypeScript and the production build passed. Production HTTP checks verified $24 skip and $78 buy and identical receipts for simultaneous approvals. Frontend rehearsal belongs to issue #5.
