# Nightreign Build Lab

The web planner uses the same planner source and relic calculations as Android version 1.0.2. This includes advisory relic-combination warnings, the Raider conditional bonus, and the fix for duplicate non-stacking effects. Some relic interactions and numerical estimates remain unverified against the game.

An independent **Elden Ring Nightreign build planner** for the web and Android. Choose a Nightfarer, equip relics, explore vessel colours, and compare how your build changes character stats and weapon attack rating.

**[Open the web planner](https://mkeays501.github.io/nightreign-build-lab/)**

## Features

- **10 Nightfarers**, including Scholar and Undertaker, with source-reported stats for levels 1–15.
- HP, FP, stamina, Vigor, Mind, Endurance, Strength, Dexterity, Intelligence, Faith and Arcane.
- **84 fixed relic records** and **537 effect/drawback IDs**, plus custom relic creation.
- Character vessels and shared Grails, with standard and Deep of Night colour combinations.
- **391 armaments** and **5,759 supported affinity/rarity variants**, including starter gear, shields and catalysts.
- Physical, magic, fire, lightning and holy AR breakdowns.
- Relic-aware weapon comparisons: search, filter, sort and compare up to four weapons.
- Conditional bonuses, progress counts, duplicate handling and selected level-15 stat swaps.
- Local saves, shareable build links, JSON import/export, pinned comparisons and undo.

## Web and Android versions

| Version | How to use it |
| --- | --- |
| Web | Visit the [GitHub Pages site](https://mkeays501.github.io/nightreign-build-lab/) in a browser. |
| Android 1.0.1 | Install the signed APK supplied with the Android distribution. |

The web deployment and Android package are separate distributions and may have different update versions.

### Android installation

1. Download `Nightreign-Build-Lab-1.0.1.apk` onto your Android device.
2. Open the file from Downloads and follow Android's installation prompts.
3. Launch **Nightreign Build Lab** from your app drawer.

The APK requires **Android 8.0 or newer** and a current Android System WebView. The planner, artwork, data and fonts are bundled for offline use.

For an update, install the newer APK over the existing app using the same signing identity. Export important builds before uninstalling or changing devices.

### Android 1.0.1: owned relic combinations

Snapshot eligibility rules can incorrectly reject combinations that players actually own. Version 1.0.1 makes these checks **advisory warnings**:

- Same-relic exclusion groups.
- Roll-slot ordering.
- Snapshot effect-type eligibility.
- Paired-drawback assumptions.

A warning does not block equipping the relic or exclude its mapped effects from calculations. Structural limits, repeated effect IDs, relic colours and standard/Deep slot restrictions remain enforced.

Warnings are planning guidance, not proof that a particular combination can drop.

## Saves, sharing and privacy

- Builds are saved locally on the current device.
- Android app storage and browser storage are separate. Transfer builds with JSON export/import.
- Android's **Share build** button opens the system share sheet with a website-compatible build link.
- A shared link contains the build in its URL fragment; people receiving it can open the web planner.
- The Android package requests no permissions, including no internet permission.
- The app uses Android's document picker for importing and exporting JSON. Source links open in the device's browser.
- The web planner imports PC `.sl2` / `.co2` saves locally to read relic inventories. It never uploads or modifies the file. Console saves are not supported.
- Choose **My relics / import**, select your save file, choose a save slot, then confirm the collection. **My relics** lists owned relics compatible with the selected slot; **All relics** keeps the full fixed/custom picker available.
- Add relics manually with **Custom relic → Save to My relics** or the fixed relic save button. Export/import collection JSON to transfer your collection between browsers.
- Import replaces the collection after confirmation; existing builds are kept. Unknown effects remain visible, and relics with unsupported effects cannot be equipped.
- The address bar updates automatically as the build changes. Opening the link restores the build without importing the sender’s whole collection.

## Repository contents

The website repository contains the ready-to-run `index.html`, editable development sources and tests in `web/`, and third-party notices.

The November 10 web update adds larger interface text, clearer mobile relic cards, automatic build URLs, a persistent owned-relic collection and local PC save import. The separately distributed Android APK remains version 1.0.2; these new features are currently available on the website.

The **Android source project is a separate package**. Its structure is:

```text
app/                  Native Android shell, resources and bundled planner
web/src/              Planner interface, calculation engine and game data
web/tests/            Character, relic and weapon regression tests
tests/                Android adapter and URL/document-policy tests
tools/                Asset preparation and APK packaging helpers
app-version.json      Android version name and version code
gradlew               Gradle wrapper for Linux/macOS
gradlew.bat           Gradle wrapper for Windows
```

The Android build commands below run from the extracted Android source project, rather than the website repository root.

## Build the Android app

The supplied Android project pins:

| Component | Version |
| --- | --- |
| JDK | 17 |
| Android SDK Platform | 35 |
| Android SDK Build Tools | 35.0.0 |
| Android Gradle Plugin | 8.9.3 |
| Gradle | 8.11.1 |

Open the Android project in Android Studio and let Gradle sync, or use a terminal with JDK 17 and the Android SDK configured.

**Linux / macOS**

```bash
./gradlew assembleDebug
```

**Windows PowerShell**

```powershell
.\gradlew.bat assembleDebug
```

The development APK is generated under:

```text
app/build/outputs/apk/debug/
```

Debug builds use a separate application ID ending in `.debug`, so they can be installed alongside the release app.

### Rebuild the bundled planner

After editing files in `web/src/`, run:

```bash
python tools/prepare_assets.py
```

This rebuilds the planner, embeds its fonts, and adds the Android sharing, export and Back-button integration. Font retrieval requires an internet connection during asset preparation. The generated Android assets are already included for an initial build.

### Signed release builds

Keep the release keystore and its passwords private. Configure these environment variables:

- `NIGHTREIGN_KEYSTORE`
- `NIGHTREIGN_STORE_PASSWORD`
- `NIGHTREIGN_KEY_PASSWORD`
- `NIGHTREIGN_KEY_ALIAS` — `nightreign`

Then run:

```bash
./gradlew assembleRelease
```

Use `.\gradlew.bat assembleRelease` in Windows PowerShell.

Increment `app-version.json` for subsequent app releases. Reuse the original signing key so users can update their existing installation.

**Never commit the signing backup, keystore, signing passwords or private signing configuration to GitHub.**

## Distributing the Android app

Attach the signed APK and the public Android source ZIP to a GitHub Release to make them available to visitors. Keep the private signing backup separate.

The current APK is intended for direct installation. It is not a published Google Play listing. Google Play submission requires an Android App Bundle and an updated target API level: as of November 2026, new phone apps must target API 36 or higher. See [Google Play target API requirements](https://developer.android.com/google/play/requirements/target-sdk).

## Validation

From the Android source project:

```bash
node --test web/tests/*.test.mjs tests/*.test.mjs
```

Native policy checks:

```bash
javac -d build/policy-tests app/src/main/java/com/mkeays/nightreign/AppPolicy.java tests/AppPolicyTest.java
java -ea -cp build/policy-tests AppPolicyTest
```

Version 1.0.1 has **39 passing planner/adapter tests** and **14 native policy assertions**. Coverage includes 5,759 weapon variants across ten Nightfarers, reference AR values, relic calculations, nonblocking combination warnings, native sharing/export hooks and Back-button behavior.

The Android code compiled, and the APK's manifest, launcher and v2/v3 signatures were checked. Physical-device and emulator launch testing was not available in the build environment.

For the website, run `python web/build.py` and `node --test web/tests/*.test.mjs`. Copy `web/dist/index.html` to the repository root to publish the rebuilt page. The web suite has 46 passing tests. Save parsing was also checked against the upstream public `10slots.sl2` (1,289 and 1 relic in its populated slots) and `allen.sl2` (1,839 relics) fixtures; real save files are not committed here.

## Data sources and limitations

The planner uses versioned community research and parameter snapshots, rather than a live game-data feed.

- Character level tables are reported by [Almanauts](https://almanauts.com/nightreign/) for regulation 1.03.5.
- Relic inventory and non-offense data use the community 1.03.2 + DLC snapshot.
- Weapon parameters and 134 offensive relic rules were checked against an author-labelled 1.03.5 community snapshot from [ip1259's parameter tools](https://github.com/ip1259/Rolling_Pool_Editor). Modified relic rolling weights from that distribution are not used.
- Weapon formula and roster research comes from [CryptidTracker's calculator](https://docs.google.com/spreadsheets/d/1Os2EzEiqE29HKsiv6UjBEQQOZrxj9ssvPAKMDc8CYr8/edit).
- Sixteen independent AR reference values match the implemented model.

**Parameter-based AR and relic-adjusted potential are different figures.** Adjusted potential applies eligible damage factors for comparison; it is not final enemy hit damage. How those factors appear on the in-game status screen has not been independently verified.

Enemy defence, attack motion values, ammunition, status buildup, weapon passives, temporary weapon buffs and spell damage are outside the current model. Utility and unverified effects remain visible without invented numerical values. Selected stat swaps calculate at level 15 only.

The two DLC starting weapons use descriptive labels where exact source item names were unavailable. Fixed relic records do not guarantee current obtainability, and custom eligibility warnings do not establish ownership or drop probability.

See **Sources & rules** inside the planner for more detail.

## Reporting a problem

Please include:

- App version or whether you are using the website.
- Nightfarer, level and selected vessel.
- Exact relic effect names and relic colour.
- Selected weapon, affinity and rarity when relevant.
- What you expected and what the planner displayed.

Screenshots of an in-game relic are especially useful when a snapshot eligibility warning appears for a relic you own.

## Credits

Independent fan project. Not affiliated with or endorsed by **FromSoftware** or **Bandai Namco**.

Game names and official character artwork belong to their respective owners. Numerical data and research retain their original acknowledgements. See [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt) and the in-app notices for third-party terms.

The Android package bundles **DM Sans** and **Cormorant Garamond** under SIL Open Font License 1.1. Their license files are included under `app/src/main/assets/fonts/` in the Android source project. Gradle Wrapper licensing is included separately.
