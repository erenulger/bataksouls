# Game Feel Developer Report — BatakSouls
**Generated:** 2026-02-20
**Role:** Player Feedback Systems & Polish Engineering

---

## Current Feel Assessment

BatakSouls is currently **entirely feedback-free** in both modes:

- **Terminal mode:** Pure ASCII text. State transitions are instant. No visual pause between actions.
- **Web mode (combat.html):** SSE-driven HTML rendering. No animations, no audio, no particle effects.
- **Map mode (HTML5 Canvas):** Movement renders, but combat triggers, forge triggers, and enemy contacts have no feedback (no sound, no screen flash, no dialogue pop-up).

The game is mechanically correct but emotionally flat. A trick win, trump reveal, or enemy death are all rendered identically — as text updates. This represents a significant gap for player satisfaction.

---

## High-Impact Moments Without Feedback

### 1. Trump Reveal
The moment the trump element is revealed after bidding is the most dramatic beat in each round. Currently it appears as a text line update. No pause, no emphasis, no build-up.
**Target feel:** Should feel like a card flip reveal — a brief hold, then a visual/audio "punch" showing the winning element.

### 2. Trick Win
Winning a trick (12 per round) should feel satisfying. Currently it's a text update. In real-life card games, winning a trick involves taking cards off the table — a physical action.
**Target feel:** Brief flash/highlight on the winning card, a satisfying click/snap sound.

### 3. Damage Taken / HP Bar Change
HP bars exist in web mode but update instantly. Taking damage in a soulslike should *hurt* — a red flash, a shake, a descending bar animation.
**Target feel:** Red screen edge flash on player damage; HP bar animates down smoothly.

### 4. Enemy Death / Souls Reward
An enemy dying and souls being awarded is the ultimate payoff per encounter. No fanfare exists.
**Target feel:** Soulslike "YOU DIED" / "VICTORY ACHIEVED" equivalent — brief full-screen moment, soul counter animating up.

### 5. Panic State
High-panic players play first (disadvantage). This is invisible to the player in meaningful terms. High panic should feel chaotic — UI elements could shift or shake for high-panic combatants.
**Target feel:** Visual indicator on high-panic entities (shaking name plate, red tint).

### 6. Card Play
Selecting and playing a card has zero feedback. The card is just gone.
**Target feel:** Slide animation of card being placed, followed by power number appearing.

---

## Platform Constraints

- **Terminal:** Limited to ASCII art tricks (flashing text, `readline.clearLine`, pause with setTimeout). Sound impossible.
- **Web (SSE):** CSS animations, JavaScript transitions, and Web Audio API are all available via combat.html. Full game feel capability.
- **Map Canvas:** `requestAnimationFrame` loop running — particle-style effects and screen shake are feasible.

---

## Audio Strategy Recommendation

No audio exists. For a minimal viable audio implementation:

| Event | Sound |
|-------|-------|
| Trump reveal | Mystical sting (2-3 note motif) |
| Card played | Paper/card shuffle SFX |
| Trick won | Satisfying click/snap |
| Damage taken | Low thud, HP bar scrape |
| Enemy defeated | Souls absorbed hum (like DS) |
| Forge upgrade | Metallic ring |
| Map movement | Footstep (looping) |

**Implementation approach:** HTML5 Web Audio API in combat.html; map audio via MapEngine canvas layer.

---

## Animation Priority List

For web mode (highest ROI):

1. HP bar smooth descent (CSS transition, ~500ms)
2. Combat result screen fade-in ("VICTORY" / "DEFEATED")
3. Trump element reveal — scale-up animation on element badge
4. Card play slide animation (CSS transform)
5. Panic indicator pulse on high-panic entities
6. Screen edge red flash on player damage (CSS overlay)
7. Souls counter roll-up animation (number ticks up)

---

## Game Feel Developer Backlog

| ID | Priority | Task | Notes |
|----|----------|------|-------|
| GF-01 | Critical | Design trump reveal moment (web mode) | Biggest dramatic beat in each round |
| GF-02 | Critical | Design combat result screen (victory/defeat) with animation | Currently text-only |
| GF-03 | High | Implement HP bar smooth animation (CSS transition) | Immediate visual improvement |
| GF-04 | High | Implement player damage feedback (red flash overlay) | Soulslike essential |
| GF-05 | High | Design and implement souls counter animation (roll-up) | Reward moment |
| GF-06 | High | Create audio SFX plan: list of 8-10 essential sounds | Work with Sr Artist for direction |
| GF-07 | High | Implement card play animation (slide + power number reveal) | Web mode |
| GF-08 | Medium | Implement trick win visual highlight | Brief flash on winning card |
| GF-09 | Medium | Design panic indicator (visual state for high-panic entities) | Gameplay clarity + atmosphere |
| GF-10 | Medium | Add CSS transitions between SSE state updates | Smooths web mode generally |
| GF-11 | Medium | Implement screen edge red flash for map combat triggers | Map mode feedback |
| GF-12 | Medium | Add forge upgrade sound + visual (card glowing) | Reward moment |
| GF-13 | Low | Design terminal mode "feel" improvements (ASCII art, timing) | For players using CLI |
| GF-14 | Low | Investigate HTML5 Web Audio API for simple sound layer | No external dependencies |
| GF-15 | Low | Add ambient audio loop for map exploration | Atmosphere |
