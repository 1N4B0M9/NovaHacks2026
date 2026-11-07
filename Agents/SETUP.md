# Setup and first-run walkthrough

## Prerequisites
Install Git and GitHub CLI (`gh`), then run `gh auth login`.
Install Codex CLI using its official installer or `npm install -g @openai/codex`, then run `codex` and sign in with ChatGPT.
Install Cursor IDE, sign in, and use its Ask or Plan modes during ideation. Optional Cursor CLI: https://cursor.com/docs/cli/overview (`agent login`).

## Initialize this folder as a repository
From this folder (do not run the following in an existing repo without adapting it):
```bash
git init -b main
git add .
git commit -m "Initialize planning council and documentation"
gh repo create hackathon-agent-lab --private --source=. --remote=origin --push
```
You may change the repository name.

## Initial GitHub discussion
After completing `docs/brief.md`:
```bash
gh issue create --title "Planning council: evaluate the hackathon project" --body-file docs/brief.md
```
Find the issue number with `gh issue list`. For replies use `gh issue comment NUMBER --body-file PATH` (if you save an agent's answer into a local text file) or `gh issue comment NUMBER --web`. Mark comments `[Codex / Strategy]` or `[Cursor / Skeptic]`; both GitHub actions usually appear under *your GitHub username*, not separate bot accounts.

## Planning sequence
A. Run `prompts/01-independent-codex.md` in Codex, with `docs/brief.md`. Use `codex --sandbox read-only` for exploration.
B. Run `prompts/02-independent-cursor.md` in a new Cursor Ask session, with the same brief; do not share Codex's answer yet.
C. Post both outputs to the GitHub planning Issue; then give both agents the other proposal plus `prompts/03-cross-examination.md`.
D. Use `prompts/04-synthesis-and-approval.md` in Codex. You make the actual decision and authorize docs updates.
E. Fill and approve the requirements, architecture, contracts, and ADR; change phase to APPROVED in `docs/progress.md`.

## Start parallel coding *after owner approval*
```bash
# In main repo, with clean main and latest approved docs
git switch main
git pull --ff-only
git worktree add -b issue-2-backend ../hackathon-backend main
git worktree add -b issue-3-frontend ../hackathon-frontend main
```
Open `../hackathon-backend` in Codex, and `../hackathon-frontend` as a folder in Cursor. Assign separate GitHub Issues and avoid editing overlapping files. If the scopes are reversed, that's fine.
After each worker has tested their feature and updated docs, have them commit, push their branch and open a PR (`gh pr create`). Review each PR and approve before merge.

Cleanup **after merges and no uncommitted changes**:
```bash
git worktree list
git worktree remove ../hackathon-backend
git worktree remove ../hackathon-frontend
```

## Budget discipline
- Only two independent workers at a time, initially. Other 'roles' are separate passes, not six simultaneously running processes.
- Cursor Ask mode and Codex read-only exploration for planning; don't trigger complex builds before approval.
- Reserve deeper Codex work for integration and difficult engineering, use Cursor for one independent feature.
- Cursor Cloud Agents (`@cursor` in GitHub) are optional, plan-dependent, and share your paid usage pool. Do not turn them on until you need unattended work and understand costs.
