# Nightreign Build Lab

A static Elden Ring Nightreign build planner. Open `index.html` or publish it with GitHub Pages. No server, account, database or build tools are needed for visitors.

## Features

- All ten Nightfarers, including Scholar and Undertaker; source-reported levels 1–15.
- Game-style HP, FP, stamina, Vigor, Mind, Endurance, Strength, Dexterity, Intelligence, Faith and Arcane sheets.
- Seven character vessels and four shared Grails for each Nightfarer; standard and Deep of Night colour triplets.
- 84 catalogued fixed relic records and 537 relic-effect/drawback IDs, plus a custom roll builder.
- Colour, type, same-relic compatibility, roll-slot and paired-drawback checks.
- Additive attributes, resource projections, conditional combat factors, conservative duplicate handling and 20 level-15 stat-reallocation models.
- 391 armaments (including shields, catalysts and DLC starter gear), with 5,759 supported affinity/rarity variants.
- Weapon AR recalculates from the selected Nightfarer, level and resulting relic attributes, split into physical, magic, fire, lightning and holy.
- Applicable relic damage factors combine separately from displayed AR. Class, attack scenario, inventory conditions and run progress are respected.
- Search, filter and sort the full armory; compare up to four weapons.
- Save builds locally, share via URL, import/export JSON, pin a build to compare, and undo local changes.

## Data boundary

Checked 26 October 2026. Official version boundary: App 1.03.2 / regulation 1.03.5. Character records: Almanauts, reported regulation 1.03.5 build 22818764. Relic inventory/non-offense facts: community game-data tools and original Nightreign Useful Info research, 1.03.2 + DLC snapshot. Weapon inputs and 134 offensive relic rules were checked against an author-labelled Regulation 1.03.5 community parameter snapshot. The source distribution modifies relic rolling weights; those weights are not used. All curated weapon model fields and 17 curves were compared with CryptidTracker’s baseline, and 16 independent current weapon AR references agree. This is not a live game feed or an official calculator.

Some effects are utility-only or have no verified numerical model; they remain visible and are excluded from totals. Level-dependent swaps calculate at level15 only. Resource projections use observed linear relationships; extrapolations are labelled. Relic damage multipliers are separate from the parameter-based AR model and final enemy damage; their in-game status-screen presentation is not independently verified. Adjusted potential is a comparison aid before enemy defence and attack motion values. Weapon passives, ammunition, temporary weapon buffs, status buildup and spell damage are not simulated; omitted effects are labelled. A fixed record does not guarantee current availability; The Will of Balance is explicitly flagged. Custom roll eligibility does not establish a drop chance or ownership. See the in-page Sources & rules for detailed limitations and links.

## Free GitHub Pages hosting

Upload `index.html`, `.nojekyll`, this README and THIRD_PARTY_NOTICES.txt to the root of a public repository. Open Settings → Pages → Deploy from a branch → main → /(root) → Save. GitHub hosts the site; no computer needs to remain on.

The artwork, data, CSS and JavaScript are embedded in index.html. Google Fonts are optional; system fonts work offline. Changes to source data require updating the embedded dataset.

Builds are saved in the visitor's local browser. Shared links encode the build in their fragment. No game-save access or editing is performed.

Independent fan project, not affiliated with Bandai Namco or FromSoftware. Character artwork is from the official Nightreign gallery. Open-source data notices are included in THIRD_PARTY_NOTICES.txt and embedded in the site.

## Edit and validate

Download and extract `source.zip` for the original source and tests. Run `python build.py` to rebuild `dist/index.html` and `node --test tests/*.test.mjs` for the 32 core/weapon checks (including all 5,759 variants across ten Nightfarers). The committed index.html runs directly without this development step.
