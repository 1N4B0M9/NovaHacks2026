# Agent operating protocol

## Authority and current phase
- The human project owner is the decision-maker. Do not infer approval from an agent's agreement.
- PHASE is recorded in `docs/progress.md`: `PLANNING`, `APPROVED`, or `BUILD`.
- In PLANNING, do not implement app features, install project dependencies, modify deployment configuration, or create implementation branches unless the owner explicitly authorizes a scoped technical spike and the event rules permit it.
- Propose, critique, and document. Do not claim you have implemented work you only proposed.
- In BUILD, work only on a specifically assigned GitHub Issue or approved task; use a feature branch or separate Git worktree; never push to main or merge without owner review.

## Shared source of truth
Read relevant files before any substantial work:
1. `docs/brief.md`: goals, constraints, event rules and evaluation criteria.
2. `docs/requirements.md`: approved product behaviors and acceptance criteria.
3. `docs/architecture.md` and `docs/api-contracts.md`: approved technical design.
4. `docs/decisions/`: accepted and proposed design decisions.
5. `docs/progress.md`: current state, blockers, owner approvals.
6. The relevant GitHub Issue: live discussion/task details.

If these contradict each other, flag the conflict and request owner judgment; don't silently resolve it.

## Planning council
- Use roles as perspectives, NOT automatic authority: Strategist (value), Skeptic/Judge (weaknesses), Architect (feasibility), UX/Demo (user journey), Researcher (evidence), Recorder (synthesis).
- First round: independent proposals. Do not read other agent's proposal until you've prepared your own.
- Second round: critique proposals and reply directly to disagreements.
- Third round: synthesize recommendations and explicitly record dissent and open questions.
- Do not spin in endless debate. After at most two critique exchanges, prepare choices for the owner.
- Separate: verified findings (with links), estimates, assumptions, decisions, and unanswered questions.
- No code generation or features before explicit owner approval.

## Documentation (part of the definition of done)
- Both owners maintain their feature checkboxes and evidence in `docs/roadmap.md` in the same PR as each feature or scope change. The lead maintains the integration section.
- Every meaningful scope change updates `docs/requirements.md`.
- Every meaningful structural or integration change updates `docs/architecture.md` or `docs/api-contracts.md`.
- Every major tradeoff/decision adds or updates one Architecture Decision Record under `docs/decisions/` with status, context, options, rationale, downsides, and source issue.
- Each agent writes its own per-task note under `docs/updates/issue-N.md` with outcome, evidence, risks, and next step. Only the lead/coordinator updates the shared `docs/progress.md` after reviewing or merging results, to avoid parallel edit conflicts.
- On a PR, link to the issue, link its `docs/updates/issue-N.md` note, and state docs changed or explain convincingly why no change was needed.
- GitHub comment threads are discussion history; committed docs are durable approved decisions. Avoid duplicating long discussions in every file.
- Avoid fabricated citations, tests, accomplishments or statuses. State what was actually verified.

## Communication with human
At any checkpoint, give a concise status in this format:
- **Done**: concrete changes or findings
- **Decisions proposed**: rationale, alternatives, approval status
- **Blocked / disputed**: precise question, owner action if needed
- **Docs**: files created/updated
- **Next**: one or two bounded actions
Raise major cost, API, infrastructure, and scope decisions before proceeding.

## Safety and integrity
- Never paste secrets into GitHub issues or documentation. Use untracked `.env` files or provider secret managers.
- Do not use an OpenRouter hackathon API key for coding-agent execution; if available, it is only for the competition application as authorized.
- Follow the hackathon's rules about pre-event work, external tools, AI attribution, and use of prerecorded demos.
- Do not turn off tests, branch protections, or approval checks to get work merged.
