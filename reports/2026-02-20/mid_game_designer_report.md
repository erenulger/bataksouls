# Mid Game Designer Report — BatakSouls
**Generated:** 2026-02-20
**Role:** Feature Implementation Specialist

---

## Content State Assessment

The core systems are implemented and functional. The content that populates those systems is sparse and not formally specified. This report identifies what exists, what is missing, and the full content specification backlog.

---

## Existing Content Inventory

### NPCs (8 total)
| Slug | Name | AI Type | HP | Souls Reward | Notes |
|------|------|---------|-----|------------|-------|
| solaire | Solaire | Aggressive | 120 | 100 | Direct DS reference |
| patches | Patches | Trickster | ? | ? | |
| rat | Rat | Chaotic | ? | ? | |
| support | Support | Supportive | ? | ? | Name is placeholder |
| siegmeyer | Siegmeyer | Defensive | ? | ? | Direct DS reference |
| undeadSword | Undead Soldier | ? | ? | ? | Generic |
| undeadShieldedSword | Hollow Knight | ? | ? | ? | |
| undeadSpear / undeadShieldedSpear | Undead variants | ? | ? | ? | |

**Issues:**
- Several NPC slugs used in sampleMap.js but deck files may not all exist (undeadSpear, undeadShieldedSpear need verification)
- NPC "support" has a placeholder name — needs characterization
- No NPC descriptions filled in for most characters
- No boss-tier NPC

### Card Sets
Elements confirmed from constants.js: **Light, Dark, Magic, Fire, Poison, Bleed** (Mystical) + **Armor, Slash, Pierce** (Physical) = 9 elements.
Card files: `data/cards/{element}Cards.json` — content depth per element unknown.

**Issues:**
- Card variety per element not audited
- No named "boss cards" or unique rare cards
- All cards follow same power formula — no special abilities

### Maps
- **sampleMap.js**: 1 map with walls, 4 enemy positions, 1 forge — the only map in the game

---

## Content Gaps (Priority Order)

### Gap 1: Structured NPC Progression Table
No formal spec defines which NPCs appear in which zone, at what difficulty. Without this, the map is just a random assortment of enemies.

**Required Spec:**
```
Zone 1 (Tutorial):  undeadSword, undeadSpear (low HP ~60, panic ~30)
Zone 2 (Midgame):   rat, patches, support (HP ~80-100, panic ~40-50)
Zone 3 (Lategame):  solaire, siegmeyer, undeadShieldedSword (HP ~100-140, panic ~50-70)
Boss Zone:          [New Boss NPC] (HP ~200, unique card set, panic ~80)
```

### Gap 2: Economy Balance (Forge)
The forge cost formula is `10 + level * 5` souls. Whether this is balanced depends on:
- How many souls players earn per combat
- How many upgrades are needed to beat late-game NPCs
- Whether there is a meaningful trade-off between upgrading vs. saving

No balance analysis has been done.

### Gap 3: Missing Boss NPC
There is no boss-tier enemy. Every soulslike needs at least one showdown encounter with unique mechanics or stats.

### Gap 4: Player Starting Deck
`data/decks/player.json` is currently modified (per git status) but the starting state and progression are not specified. What cards should a new player start with? What is the upgrade path?

### Gap 5: NPC Character Descriptions
Only some NPC files have description fields. Rich descriptions add atmosphere and guide player strategy expectations.

---

## Feature Specifications Needed

### Feature: NPC Encounter Intro Screen
**User Story:** As a player, I want to see an NPC's name and description before combat starts, so I can prepare my strategy.
**Acceptance Criteria:**
- [ ] NPC name displayed
- [ ] NPC description (1-2 sentences) displayed
- [ ] NPC stats hint (threat level, element affinity) optionally shown
- [ ] Player can press a key to begin combat

### Feature: Souls Economy UI Feedback
**User Story:** As a player, I want to see how many souls I earn after each victory, so the reward feels tangible.
**Acceptance Criteria:**
- [ ] Souls gained displayed prominently on combat result screen
- [ ] Total souls running total shown
- [ ] Sound/visual cue on soul gain

### Feature: Forge Cost Preview
**User Story:** As a player, I want to see the cost to upgrade each card before committing, so I can plan my economy.
**Acceptance Criteria:**
- [ ] Each card shows current level and upgrade cost
- [ ] Greyed out if insufficient souls
- [ ] Confirmation prompt before spending

---

## Mid Game Designer Backlog

| ID | Priority | Task | Notes |
|----|----------|------|-------|
| MD-01 | Critical | Write NPC progression table (zone assignment + stat targets) | Blocked by SD-05 (zone design) |
| MD-02 | Critical | Audit all card files — count cards per element, identify gaps | Check data/cards/ |
| MD-03 | Critical | Specify player starting deck composition and upgrade path | Modify player.json spec |
| MD-04 | High | Create Boss NPC design spec (name, lore, stats, special deck) | Needs SD-02 (arc definition) |
| MD-05 | High | Balance forge economy (souls income vs. upgrade cost per zone) | Create balance spreadsheet |
| MD-06 | High | Fill in all NPC descriptions and characterization text | 8 existing NPCs |
| MD-07 | High | Rename placeholder NPC "support" with proper character name | Identity and lore |
| MD-08 | Medium | Specify minimum card count per element for variety | Target: 8-12 unique cards per element |
| MD-09 | Medium | Write feature spec for NPC encounter intro screen | Feed to Mechanics Dev |
| MD-10 | Medium | Define multi-NPC combat party compositions (which NPCs group together?) | For zone 2+ encounters |
| MD-11 | Medium | Design alternate map areas (Zone 2, Zone 3) content layout | Feed to Mechanics Dev for map system |
| MD-12 | Low | Spec optional NPC dialogue system (pre/post combat lines) | Atmosphere enhancement |
| MD-13 | Low | Design seasonal or unlockable NPCs for replayability | Post-launch content |
