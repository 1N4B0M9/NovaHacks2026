# Hackathon multi-agent starter

A small **Cursor + Codex + GitHub** workflow. No model API key is needed for planning or coding agents.

## Recommended flow
1. Complete `docs/brief.md` and start `docs/progress.md` in PLANNING.
2. Run the prompts in `prompts/` using Codex and Cursor **in separate, initially independent sessions**.
3. Post the resulting proposals and critique to one GitHub planning Issue, clearly marking which tool produced each comment.
4. The owner approves the project, architecture, and MVP; document decisions and move status to APPROVED.
5. Convert approved features into GitHub implementation Issues with acceptance tests.
6. Move to BUILD. Run Codex and Cursor against **different worktrees/issues**. PR → review → tests → owner merge.
7. Keep docs and GitHub status current using `AGENTS.md` and PR checklist.

`SETUP.md` has terminal commands for the first pass. Avoid starting actual competition implementation ahead of event rules.

## Key files
- `AGENTS.md` — read by both tools
- `docs/brief.md` — event problem and owner preferences
- `docs/ideas.md` — comparison and open disagreements
- `docs/requirements.md` — MVP + acceptance criteria
- `docs/architecture.md` — components, data flow, integrations
- `docs/api-contracts.md` — interfaces owned by different agents
- `docs/decisions/` — ADRs for significant choices
- `docs/progress.md` — lead-maintained human-readable current state
- `docs/updates/issue-N.md` — per-agent progress notes, which avoid concurrent edits to one shared file
- `.github/ISSUE_TEMPLATE/` — planning and development Issue templates
- `.github/pull_request_template.md` — verification and docs review
- `prompts/` — reusable agent assignments
