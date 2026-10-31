Dvandva Xrou-Haxa Translator — Version 19 (Synonym Suggestions)

New functionality:
- For English words that are unknown to the translator, offers synonyms that
  ALREADY have entries in the lexicon, along with their existing Xrou forms.
- Suggestions never auto-replace words. Click a suggestion to replace only the
  unrecognized word in your input and translate again.
- Similar-spelling suggestions are kept separate so they are not mistaken for synonyms.
- Empty dictionary searches also display available alternatives when found.
- A bundled, editable synonyms.json file provides the meaning-based relationships.
- When a word has no available synonyms, the translator continues to mark it unknown.

Scope: Synonym suggestions currently target English input. Unknown Xrou words
still receive similar-spelling suggestions; invented Xrou synonyms are not guessed.
This is a curated, offline list, not a comprehensive semantic dictionary; choose
alternatives carefully because synonyms can vary in tone or nuance.

Everything from V18 is preserved, including:
- All dictionary entries, phrasebook items, sentence patterns and grammar engine.
- Favorites, translation history, clickable definitions, dictionary themes.
- Dvandva crest, title art and cave background, and monochrome design.

Installation: Extract this ZIP and upload files to your GitHub Pages repository,
including synonyms.json. Commit and reload after publishing. Keep your existing
CNAME file for your custom domain; this ZIP intentionally does not contain CNAME.
