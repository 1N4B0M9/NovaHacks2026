# Interface contracts

**Status:** Draft; freeze contract before parallel implementation.

## Example route (replace)
`POST /analyze`

Request JSON:
```json
{"input": "example"}
```
Response JSON:
```json
{"status": "ok", "result": "example"}
```
Error behavior:
Authentication and security:
Owner of contract:

When any consumer-facing contract changes, update this file and notify all affected GitHub Issues before coding proceeds.
