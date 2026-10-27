# DDD Modeling Rules

`Docs / 00 Method / DDD Modeling Rules`

The rules that govern how the domain model is shaped and how it may change.

This page states **how we model**. It does not state what the model currently
contains: the contexts and their languages live in
[01 Domain](../01-domain/README.md), the glossary is
[there](../01-domain/03-glossary.md).

## Bounded contexts and what may cross them

**A context is a language, not a package and not a stage.** A context owns a
vocabulary that changes on its own schedule. A deployment unit that carries
several contexts is a container, and a step in a process that produces one
output from another is a stage; neither is a context, and calling one a
context hands the domain vocabulary about things it has no business knowing.

**Only published language crosses a boundary.** A crossing is a versioned
contract owned by the producing context, carrying a description of what it
produced. Forbidden across a boundary: raw external payloads, structural
keys, the internal types that produced the description, and aggregate
instances. A context's internal model may change freely; its published
language changes only by an additive, versioned change.

**Downstream conforms to upstream, never the reverse.** A consumer adapts to
the published language; a producer never bends its output to a consumer's
wishes. This is what stops a new requirement at the top of the stack from
reaching back into the external system.

**The split is a hypothesis, not a conclusion.** If naming turns out to be a
prerequisite of completing the work, the boundary is in the wrong place, and
the change should say so rather than work around it.

## Ubiquitous language discipline

**One term, one definition, one owning context.** Vocabulary is per context.
When two contexts need the same word for different things, the second one gets
a different word — never one word with two definitions.

**No overloaded standalone term.** A word that different contexts use for
different things carries no information, and every sentence using it has to be
re-read to find out which meaning was meant. A term that spans the chain is
fine; a term that means two things at once is not.

**A new term enters the glossary in the same change that introduces it**, and
code identifiers, test names and headings use glossary terms verbatim. A term
without a glossary entry may not appear in a model's public surface.

**Names are provisional; ids are not.** A name may be corrected at any time;
the id it is registered under never changes, and every reference names the id.
A name tied to its meaning would shift on every correction and break every
reference that used it.

## Aggregates, invariants and attribution

**An invariant exists only where a test enforces it.** A stated invariant with
no test is prose, and prose is not a guarantee.

**Every derived value carries its derivation.** A value that cannot carry an
unbroken chain back to what it derives from does not enter the model.

**Cross-aggregate references are by identity only.** The root guarantees
internal consistency, never someone else's.

## Value objects and entities

**Value objects** are compared by content, have no identity of their own, and
are stored inline by their owner: immutable views with structural equality.
Sharing one is free and safe.

**Entities** have identity independent of their values and are referenced from
elsewhere. A reference to an entity must survive a re-derivation of the things
around it, so a reference is an identity and a position, not an inlined copy.

**Anything that is not one of these is either an aggregate or a mistake.** A
catalogue, an order, a reseller account — each is an aggregate with an
identity, not a value object.

## Where behaviour lives

**Every piece of behaviour belongs to a named unit.** Computation is a method
on the unit that owns it; value construction is a factory on the value;
orchestration is the application service's. A module-level function that
belongs to no unit is not untidy, it is unowned: nobody is responsible for its
name, and the only way to find out what depends on it is to read the tree.

A supporting, diagnostics or helper unit is a legitimate home. The question to
ask of a new function is not "is this important enough to be a service?" but
"**which unit is this?**" — and having no answer is a design defect, not a
formatting nit.

**An entry point defines no logic.** It may parse its arguments, traverse, read
and write files, construct and call units, and print. Formatting, rollups and
domain constants belong to a unit.

**A structural fact has exactly one home.** A duplicated list, threshold or
layout is a bug rather than a fallback: the copies drift, and they then
disagree about the same thing.

## Anti-corruption layers

**Translate at the boundary, once.** A volatile external format, or an
external system that is wrong sometimes, is translated where it enters the
model, and never re-read downstream. Nothing above the boundary sees the
external vocabulary; nothing below the boundary pretends to understand the
model's. The reseller APIs are the first such boundary.

**The layer is a vocabulary change, not a wrapper.** Wrapping a foreign type
and passing it along is not an anti-corruption layer; the foreign vocabulary
still leaks. The layer is real when the consumer cannot tell what the producer
read.

## Meaning before pattern

1. **Meaning is the objective; patterns are the means.** A recurring shape is
   worth exactly what the name attached to it is worth. A field mapped and
   unnamed is instrumentation, not progress.
2. **Structural conformance is not meaning.** A mapping can conform perfectly
   while reading the wrong field, because a structural check has nothing to
   compare the field against. Conformance is never a completion signal.
3. **Pattern work is instrumental, not deprioritised.** Adapters, mappers,
   queues and schemas are how understanding is reached. The mistake is
   counting the tool's success as the project's success.
4. **Every layer of pattern work is traceable to what it reveals.** Work that
   cannot be traced to a question about the domain is preparation, and is
   labelled as such.

## Unknowns and guesses

**Guesses never harden into the model.** A hypothesis lives in a doc, or in a
test that is marked as encoding a guess, until evidence promotes it.

**Absence is an explicit value.** An unknown is a value the model can carry,
never a default, a zero or a silent omission. A default is a claim, and an
unexamined one is indistinguishable from an observed fact.

**A name that is not settled must look tentative.** A reader must not be able
to mistake a guess for a fact.

## Versioning the model

**Published languages are versioned, and additive within a major.** A new
field is a minor change; reinterpreting what a field means is a major change,
with a migration note.

**Stored data is never silently reinterpreted.** A record written under a
different major version is refused, not re-read with new assumptions.

**A change in the model and the data it invalidates land together.** A model
change that arrives separately from the migration of what it invalidates makes
the regression suite lie.