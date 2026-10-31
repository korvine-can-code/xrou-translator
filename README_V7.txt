Dvandva Xrou-Haxa Translator — Contractions & Clean Layout Update

Upload all site files to your GitHub Pages repository root, preserving the assets/ folder.

Changes:
- Common English contractions (straight or curly apostrophes) are expanded before translation.
- Negative auxiliary contractions and common pronoun contractions are supported.
- The version-information banner above the translator has been removed.
- Offline cache version bumped for easier updates.

Caveats: English contractions like “he’s” (he is/he has) and “I’d” (I would/I had) are ambiguous; this release defaults to “is” and “would”. Possessives such as “Ravael’s book” are never expanded as contractions. The dictionary and phrasebook are unchanged.
