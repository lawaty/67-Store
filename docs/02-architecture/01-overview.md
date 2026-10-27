# 01 — Architecture Overview

`Docs / 02 Architecture / Overview`

Status: draft

## Principle

One domain, several surfaces. The domain and its rules are shared; the web app,
the mobile apps and the scripts are thin front ends over it.

## Surfaces

| Surface | When | Role |
| --- | --- | --- |
| Web app | First | The topup website customers use. Includes the reseller API integration. |
| Mobile apps | Later | Same domain, mobile clients. |
| Scripts | Supporting | Operations and tooling. |

## Dependencies

TBD — chosen stack, repository/workspace layout, where the domain code lives so
all three surfaces can share it.

## Boundaries

- The reseller is an external system. It sits behind an adapter — see
  [02 Reseller Integration](02-reseller-integration.md) and the
  [anti-corruption rule](../00-method/02-ddd.md).
- No surface talks to a reseller API directly.

## Not yet decided

TBD — language/framework, database, hosting, auth, payment provider, deployment.
