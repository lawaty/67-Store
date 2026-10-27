# TDD Rules

`Docs / 00 Method / TDD Rules`

The rules that govern how work is tested and how behaviour is preserved
across change.

This page states **how we test**. The measurements the tests are compared
against live with the inputs they describe, in
[03 Specs](../03-specs/README.md); nothing here cites a value, a count or a
conclusion.

## The loop: red before green, vocabulary first

**No implementation without a failing test that specifies it.** A test written
after the fact to bless behaviour that already exists is a characterisation
test: it is allowed, it is labelled as one, and it carries the obligation to
be replaced by a specifying test.

**A failing test is first a vocabulary question.** Before changing code, ask
whether the language names the concept the test is about. In a model-driven
codebase most defects are naming defects, and a code-first fix freezes the
wrong concept into the model. Write the term down, write the failing example,
then make it pass.

**The test names the behaviour, not the implementation.** A test that asserts
an internal call sequence breaks on every refactor and proves nothing about
the behaviour.

## Fixtures and expected outputs

**Fixtures are content-addressed and immutable.** Each is keyed by the
provenance of the input it was taken from, so an identical input yields an
identical fixture and a changed input yields a new one. A fixture is never
edited in place: an edited expectation silently redefines "correct" and the
regression suite keeps passing against the new definition.

**The fixture that belongs to an input the system still supports stays.** When
the input changes, the new fixture is added alongside the old one, and the old
one survives until support for its input is dropped.

**Use the smallest input that pins the behaviour.** A fast test takes the
minimal slice; whole journeys are reserved for the tier that is meant to cover
them. The smallest failing case found by a property failure becomes the next
fixture.

## Test cadence: three tiers

| Tier | Cost | Runs |
| --- | --- | --- |
| **Fixture tests** | milliseconds, in memory | on every change |
| **Property tests** | seconds | on every change |
| **End-to-end tests** | minutes | when the integration layer or the reseller world changes |

The tiers exist to match cost to change risk. A behaviour that can be pinned
by a small slice is not pinned by a full journey, and an end-to-end test that
runs on every commit buys nothing that the property tier does not already
cover. No ratio between the tiers is fixed: a ratio is a preference, and a
preference is not a rule.

## Properties over examples

**Round-trip identity.** A value serialized and deserialized is unchanged.

**Exact accounting.** The parts of a computed total account for the whole
exactly — no gap, no overlap, nothing unaccounted for.

**Structural invariants against a recorded baseline.** Counts and
distributions are compared with a recorded expectation. The baseline is
recorded with the input it belongs to, so a change in the world and a change
in the code are distinguishable.

**Generators are weighted so rare cases occur.** A generator that produces the
common case only tests the common case.

**A property failure reports the smallest failing case.** That case is the
next fixture.

## Independent verification

**No implementation certifies itself.** An oracle that checks an
implementation must re-declare what it checks, independently, and import
nothing from the thing it grades. An oracle that shares the implementation's
assumptions certifies the assumptions, not the behaviour. That is the whole
reason an oracle is worth having, and it is why the independence is worth
stating as an exemption rather than hiding.

## Determinism

**Output is a pure function of input.** No clock, no randomness, no locale
dependence, no dependence on iteration order. A stable result and the
regression check are meaningless without it.

**The same input produces the same result.** That is directly testable, and
it is the primary regression check.

## Regression when the world changes

**A change in the world is recorded before the code adapts to it.** The world
here is the reseller: an endpoint that changes shape, a price that moves, a
status code that means something new. The recorded change says what the world
now does and what the expectation now is; the code change follows. Adapting
the code to an unrecorded world makes the regression suite report green
against a behaviour nobody chose.

**Expected breaks are annotated.** A test that encodes an assumption is marked
and is expected to break when the world changes; a test that encodes an
observed fact is not. A broken fact-test is a result to explain, never a
number to update.

**A model change lands with the migration of the data it invalidates.**
Splitting them makes the suite lie about which change broke what.

## Banned test patterns

1. **Vacuous passes.** A test that can succeed on an empty result is a broken
   test. Assert a non-empty result.
2. **Asserting an interpreted value while the interpretation is unproven.**
   Assert structure — fields, types, invariants — and do not assert a meaning
   the system has not established.
3. **Asserting whole rendered outputs.** Assert counts, distributions and
   shape; a rendered blob diff is unreadable and unread diffs stop being
   reviewed.
4. **Pinning a count that belongs to the world.** The size of an input
   collection is not a property of the code. A suite that breaks when inputs
   are added has encoded the collection instead of the rule. Where a figure
   must be held, hold it against a stated input count, and treat a failure as
   a result to explain.
5. **Fitting a bound to what has been observed.** A ceiling fitted to the
   inputs seen so far turns a real case into a failure. A bound may exist only
   where the world itself states one.
6. **Depending on a network or a live device.** Inputs come from committed
   fixtures. Reseller calls in tests go to recorded or sandbox responses,
   never to a live production account.
7. **Deleting a failing test to go green.** Quarantine it with a recorded
   reason, or fix it. Deleting removes the evidence that the defect existed.

## For this project

- TBD — test framework per surface (web, mobile, scripts).
- TBD — where tests live and their naming convention.
- TBD — definition of done.