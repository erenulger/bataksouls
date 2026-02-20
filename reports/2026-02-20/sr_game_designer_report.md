# Sr Game Designer Report — BatakSouls
**Generated:** 2026-02-20
**Role:** Vision Owner & Design Authority

---

## Game Vision Assessment

BatakSouls has a **compelling core concept** with a mechanically sound foundation, but lacks a formal vision document. The design intent is inferred from the codebase rather than documented. This must be addressed immediately.

### Inferred Design Intent (Needs Validation)
> "A Dark Souls-inspired trick-taking card game where players navigate a cursed world, confronting enemies through elemental card duels powered by Batak mechanics — bidding for trump advantage, managing panic, and upgrading a fixed collection of elemental cards to survive increasingly powerful foes."

---

## Core Pillars Assessment (Observed from Code)

### Pillar 1: Elemental Mastery
The dual-wheel system (Mystical: Light > Dark > Magic > Fire > Poison > Bleed; Physical: Armor > Slash > Pierce) creates genuine strategic depth. Trump selection through bidding is clever and original. **Status: Implemented, underdocumented.**

### Pillar 2: Tension Through Risk
The bidding phase creates meaningful risk — revealing your strongest element to claim trump advantage exposes your strategy. Panic mechanics punish aggression. **Status: Implemented. Design intent not communicated to players.**

### Pillar 3: Soulslike Atmosphere
NPC names (Solaire, Patches, Siegmeyer) directly reference Dark Souls. Souls currency, HP-based death, and AI personalities with moods create character. **Status: Partially implemented. Narrative context missing.**

---

## Critical Design Gaps

### 1. No Victory Condition
The game has no defined end state. There is no final boss, no "you cleared the game" screen, no meta-progression across deaths. The player can fight enemies on a single map but there is no arc.

**Recommendation:** Define one of:
- A) **Boss Rush:** A linear sequence of escalating NPCs with a final boss
- B) **Roguelike Run:** Procedural selection of enemies per run with permadeath
- C) **Story Campaign:** Fixed narrative with chapters and unlocking new map zones

### 2. No Player Onboarding
Trick-taking is not intuitive for players unfamiliar with the genre (Batak, Spades, etc.). The game drops the player directly into complex mechanics without explanation.

**Recommendation:** Design a structured tutorial covering:
1. What a trick is (one card per player per round)
2. How trump works and why bidding matters
3. How panic affects play order
4. How elemental interactions apply bonuses

### 3. No Narrative Context
Why is the player fighting? Who are they? Why do souls matter? Dark Souls succeeds partly because vague lore creates mystery — but there must be *some* hook. Currently none exists.

**Recommendation:** Write a 3-sentence premise. Example: *"You are a cursed undead. The only way to lift the curse is to accumulate enough souls by defeating the hollow warriors that roam these ruins. Lose all your HP and your souls are lost — try again from the beginning."*

### 4. Map Is a Dead End
The sample map has enemies and a forge but no progression. Defeating an enemy has no persistent consequence — they respawn. There is no next zone, no escalating threat, no boss.

**Recommendation:** Design a world map with 3-5 zones:
- Zone 1: Tutorial enemies (low HP, single personality types)
- Zone 2: Mid-tier with mixed parties
- Zone 3: Elite enemies (higher panic, specialized cards)
- Boss Zone: Unique boss encounter with special rules

### 5. No Player Identity
The player deck starts with a fixed set of cards. There is no character archetype, no class, no playstyle differentiation. The forge allows upgrades but there is no build identity.

**Recommendation:** Consider 2-3 starting deck archetypes (Aggressive, Defensive, Trickster) that give the player a playstyle identity from the start.

---

## Systems That Are Well-Designed

- **Panic mechanic**: Play-order pressure is original and creates interesting decisions
- **AI personalities with moods**: Adds replayability and enemy variety
- **Endurance system**: Elegant punishment for running out of cards
- **Soul rewards**: Clean economy, feels earned

---

## Sr Game Designer Backlog

| ID | Priority | Task | Notes |
|----|----------|------|-------|
| SD-01 | Critical | Write Game Vision Document (GDD v1) | Core pillars, player journey, success metrics |
| SD-02 | Critical | Define victory condition and game arc | Choose between Boss Rush / Roguelike / Campaign |
| SD-03 | Critical | Design tutorial / onboarding flow | Must teach trick-taking to newcomers |
| SD-04 | High | Write world/narrative premise (3-5 sentences minimum) | Sets tone for all other systems |
| SD-05 | High | Design zone/world structure (3-5 zones + boss) | Defines map content needs |
| SD-06 | High | Design difficulty ramp: NPC stats per zone | Feed to Mid Designer for content spec |
| SD-07 | High | Decide on player starting archetypes (1 universal or 3 builds) | Impacts deck design |
| SD-08 | Medium | Document all elemental interactions in readable format | Needed for tutorial + marketing |
| SD-09 | Medium | Review panic mechanic balance (current: bid -20, trick -5, floor 10) | May need tuning after playtesting |
| SD-10 | Medium | Design post-death flow (souls lost? run restart? checkpoint?) | Define soulslike rules for this game |
| SD-11 | Low | Design optional lore pickups (item descriptions, NPC dialogue) | Dark Souls style environmental storytelling |
| SD-12 | Low | Spec a PvP or co-op mode feasibility study | Long-term potential |
