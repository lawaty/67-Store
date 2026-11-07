# AGENTS.md — 67 Store

Project rules for agents working in this repository. They sit on top of the
global rules in `~/.config/opencode/AGENTS.md` (subagent policy, context map
check) and do not repeat them. Where the two disagree, the stricter rule wins.

The product is a games topup store. The method is TDD and DDD, defined in
`docs/00-method/`; this file does not restate it.

## Commit review

- **Mechanical edits are staged as part of doing them.** A rename, a move, a
  reorder, a reformat, or another edit that changes no content goes straight
  into the index. The owner does not review mechanical work.
- **Never commit or push without the owner's explicit confirmation of that
  change.** The confirmation comes after the change has been shown, and it is
  for that change: an earlier approval of a different change, or a passing
  "commit", is not a confirmation. Without it, the work stops in the working
  tree.
- **Stage UI work and test artifacts as you produce them.** The agent is
  permitted and encouraged to auto-stage these changes so the owner can review
  them in the index. Staging is not committing: the other rules in this section
  still govern commits and pushes.
- **Never modify the git index except to stage a mechanical edit, UI work, or
  test artifacts.** That bans `git add` for anything else, plus `git commit`,
  `git push`, `git rm --cached`, `git restore --staged` and `git reset`. The
  index is the owner's review state, not ours to manage.
- **Never unstage the owner's files** — not to tidy up, not to make status read
  better. A non-empty index means they are mid-review: leave every entry as it
  is, even if a path looks stale or wrong.
- Reading the index is fine (`git status --short`, `git diff`,
  `git diff --cached`); those report it without changing it.
- A permission to commit is not a permission to push, and neither is a standing
  permission for the next change.
- Show the change and the planned commit message, then wait.

## Documentation

- **Only document what changes a decision.** Every line must say how the system
  behaves, why it is built that way, or what to do next. If deleting a line
  changes no decision, delete it.
- **Current state only.** Docs and code comments describe how things are now:
  no "used to", "previously", "no longer", "before this change". A page that
  changes state is rewritten, not annotated. History belongs in `CHANGELOG.md`,
  one short entry.
- **One home per fact.** State a decision once, in the page that binds it, and
  link to it. Cross-references point at the owning page instead of quoting it.
  Never update a duplicate — delete the copy and point at the home.
- **The canonical page list is `docs/README.md`.** Do not re-list the tree
  anywhere else. **Terms are defined once in
  `docs/01-domain/03-glossary.md`** and carry that meaning in code, docs and
  conversation.
- **Stay inside the page's scope.** A spec documents its deliverable, not the
  deployment; an architecture page documents the system's boundary, not every
  library in the tree. No dependency inventories unless a dependency constrains
  a decision.
- **No invented personas or roles** the system cannot tell apart and no
  requirement depends on.
- **Short is correct.** An inflated page is the failure, not the thorough one.
- **Diagrams are Mermaid.** A diagram is a ` ```mermaid ` fenced block — never
  ASCII box art, hand-placed arrows or a layout in a plain text fence. Mermaid
  is the only diagram syntax; do not mix in PlantUML, Graphviz or generated
  images. An existing ASCII diagram is redrawn when that page is next touched.
- **Document substance, not bookkeeping.** Numbering, ordering, moving and
  renaming files are not achievements: no doc lines and no changelog entry.

## Code

- **One home per fact in code too.** A duplicated constant, price table,
  threshold or vocabulary list is a bug, not a fallback — the copies drift and
  then disagree. The fact belongs to the unit whose behaviour it changes; every
  caller asks that unit.
- **Reseller data models never leak into the core domain.** They are translated
  at the boundary (see `docs/00-method/02-ddd.md`).

## Resources and tests

- **Keep a computation bounded.** Work one unit at a time; do not write a
  "process everything" script whose cost grows with the whole corpus or dataset.
  If a run needs more than roughly one large input in memory, or more than a few
  hundred lines of stdout, re-scope it into smaller pieces first.
- **Stream bulk output to a file**, never accumulate it in a variable or flood
  the session; reduce to counts when the count is the answer.
- **One-time scripts live in `tmp/`, never at the repository root.** A throwaway
  script written to answer one question lives and runs under `tmp/`.
- **Bound the test runner.** Run the suite in bounded batches (one worker at a
  time when it is heavy); never raise concurrency to "go faster". The cap
  applies to ad-hoc commands, package scripts and any config that runs the
  suite.
- **One subagent per question**, not one subagent for everything: separate
  context keeps peak usage bounded and results attributable.

## Reporting

- **The report is written for the owner, in chat, and must read without the docs
  open.** A name obvious from the code is not obvious on the page.
- **Gloss every term the first time it appears** in plain words, then cite the
  page and section that owns its definition. The path is a reference, not the
  explanation — the sentence must stand on its own.
- **Keep a gloss to a line.** The owning page carries the full definition; the
  report carries enough for the finding to land.
- **Do not rely on a previous session.** Every report restates the context its
  finding needs.
