# 01 — Test-Driven Development

`Docs / 00 Method / TDD`

Status: placeholder

## Rule

No production code is written without a failing test that demands it.

## Cycle

1. **Red** — write the smallest test that expresses the next required behaviour.
   Run it; it must fail for the expected reason.
2. **Green** — write the least production code that makes it pass. Nothing more.
3. **Refactor** — remove duplication and improve names, with tests green.

Repeat in small steps. A step that cannot be described as one behaviour is too
big.

## Rules for this project

- TBD — test framework(s) per app (web, mobile, scripts).
- TBD — where tests live and their naming convention.
- TBD — what is unit-tested vs. what is contract-tested (reseller APIs).
- TBD — reseller API integration is tested against recorded/sandbox responses,
  never against live production accounts.

## Definition of done

TBD
