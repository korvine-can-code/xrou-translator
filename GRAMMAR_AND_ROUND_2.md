# Xrou-Haxa Grammar Canon — V26

## Confirmed by the language creator

- **Default word order: Subject–Verb–Object (SVO).**
- **First-person case:** `adam` serves as both "I" and "me" (casual and formal masculine). Syntactic position determines subject versus object. `adar` and `adal` are formal feminine and neutral forms of that same first-person singular pronoun; `adamys` is casual plural and `Xcsadam` formal plural.
- **Negation:** `vai` precedes the main verb in the approved basic construction.
- **Tense:** `xanathes` (past) and `thanatei` (future) precede the main verb in the approved basic constructions.
- **Yes/no questions:** Xrou **has a dedicated question particle**, but the actual word and exact usage have NOT been approved yet.
- All twelve translations in `grammar_v26.json` have been explicitly approved by the language creator and are enforced by `test_grammar_v26.js`.

## Experimental question particle (NOT CANON)

The site V26 proposes sentence-final `xek` as an optional polar-question marker:

- `Vise pixrit tumu.` = She loves you.
- `Vise pixrit tumu xek?` = Does she love you?
- `Tumu raksha adam.` = You protect me.
- `Tumu raksha adam xek?` = Do you protect me?

Standard English questions generate `xek?` in Xrou. Existing question forms with `?` but no particle are still accepted for backward compatibility with the approved example `Vise pixrit tumu?`. WH questions continue to use words like `kim`, without automatic `xek`.

The language creator should confirm or replace **xek** before it is treated as established vocabulary. Likewise, whether the particle is obligatory and whether it belongs in WH questions remain open questions.

## Review round 2

Proposed (not yet approved) examples are in `review_round_2_proposed.json` and are included in the conversation for review. The examples focus on polar questions, tense, negation, registers, plural pronouns, and multiple sentences. Do not silently canonize them without approval.

## Translation engine limitations

The translator is rule-based and supports simple main clauses. It cannot yet faithfully handle arbitrary dependent clauses, pragmatics, or unfamiliar idioms. Unknown words remain visibly marked rather than guessed. `vise` needs the English context selector for he/she/they.
