# UI/UX Agent Report — BatakSouls
**Generated:** 2026-02-20
**Role:** Interface Design & User Experience Specialist

---

## UX State Assessment

BatakSouls has two distinct UI contexts that must be evaluated separately:

### Terminal Mode (CLI)
- Input: Number selection + Enter key
- Display: Full-screen ASCII text, cleared and redrawn per state
- UX Quality: **Functional but raw.** Experienced card players can use it; newcomers will be lost.
- Accessibility: Zero (screen-reader hostile, terminal-only)

### Web Mode (combat.html + SSE)
- Input: Click or number entry on HTML form
- Display: DOM elements updated via SSE JSON
- UX Quality: **Minimal but extensible.** No animations, no layout polish, no loading state.
- Accessibility: Limited (basic HTML semantics, no ARIA labels)

### Map Mode (Canvas)
- Input: WASD keyboard
- Display: HTML5 Canvas top-down
- UX Quality: **Prototype-level.** No minimap, no UI overlay, no pause menu.
- Accessibility: None (Canvas is inaccessible)

---

## Critical UX Problems

### Problem 1: Card Selection by Number (No Visual Context)
Players select cards by typing a number (1–13) corresponding to position in a sorted hand. The hand layout is shown as text in terminal or a list in web mode. Players must mentally map number → card → power → element. This is cognitively demanding, especially when 13 cards are displayed.

**Recommended Fix:** Visual card picker — cards displayed horizontally with visual click-to-select. Number keys as shortcut, not primary input.

### Problem 2: No Onboarding
New players encounter bidding with no explanation of what trump is, why it matters, or how play order works. Drop-off risk is very high.

**Recommended Fix:** First-time tutorial overlay covering:
1. What a trick is (30 seconds of explanation)
2. What trump does (+4 power)
3. How bidding works (one card determines the trump element)
4. How panic affects who plays first

### Problem 3: No Game State Legibility
During combat, players must remember: trump element, current play order, their card hand, bids made, tricks won by each player, current HP of all combatants. All this information exists in the codebase but how much is visible simultaneously in the UI is unclear.

**Recommended Fix:** Persistent combat HUD with:
- Trump element badge (always visible)
- All combatant HP bars
- Tricks won per player
- Current play order indicator
- Hand remaining (cards left)

### Problem 4: No Confirmation for Destructive Actions
Forge upgrades spend souls permanently. Card play is immediate. No undo, no confirmation.

**Recommended Fix:**
- Forge: "Upgrade [Card Name] to Level 5 for 30 souls? [Yes / No]"
- Card play: Brief 1-second hold with cancel option (or confirm button)

### Problem 5: No Web Main Menu
The web mode starts directly in combat. There is no main menu, no deck view, no forge access from the browser. Players can only use the full game in terminal mode.

**Recommended Fix:** Build a web main menu that mirrors the terminal main menu (Fight / Forge / Deck / Quit).

---

## User Flow Diagrams (Target State)

### Full Game Flow (Web Mode)
```
Load Game
    ↓
Main Menu
    ├── Fight → Map View → [Walk to enemy] → Combat Intro → Combat → Result → Map View
    ├── Forge → Forge UI → [Upgrade cards] → Main Menu
    ├── Deck → Deck Viewer → Main Menu
    └── Quit
```

### Combat Flow (Player Perspective)
```
Combat Intro (NPC name + description)
    ↓
Bidding Phase
    → Each player (AI auto, Human picks card) → Trump Reveal
    ↓
Trick Phase (×12)
    → Play Order shown → Human picks card → AI auto plays → Trick Result
    ↓
Round End → [Next Round or Combat Result]
    ↓
Combat Result (Victory / Defeat) → Souls earned → Return to Map
```

---

## Accessibility Assessment

| Criteria | Terminal | Web Combat | Web Map |
|----------|----------|-----------|---------|
| Color blind safe | N/A | Unknown (colors unspecified) | Likely not |
| Keyboard navigable | Yes (number + enter) | Partial | Yes (WASD) |
| Screen reader | No | Partial | No |
| Scalable text | No | Yes (browser zoom) | No |
| High contrast | N/A | Unknown | No |

**Recommendation:** For web mode, implement accessible color palette (4.5:1 contrast ratio minimum), ARIA labels on interactive elements, and keyboard-full navigation.

---

## UI/UX Backlog

| ID | Priority | Task | Notes |
|----|----------|------|-------|
| UX-01 | Critical | Design visual card selection component (web mode) | Replace number-only input |
| UX-02 | Critical | Design persistent combat HUD layout | Trump, HP bars, tricks won, play order |
| UX-03 | Critical | Design and implement web mode main menu | Mirrors terminal menu |
| UX-04 | Critical | Design tutorial/onboarding flow (step-by-step overlay) | New player essential |
| UX-05 | High | Design NPC encounter intro screen | Name, description, threat level |
| UX-06 | High | Design forge UI (card grid, upgrade cost, confirmation) | Replace terminal forge |
| UX-07 | High | Add confirmation dialog for forge upgrade (irreversible) | Prevent accidental spend |
| UX-08 | High | Design combat result screen (victory / defeat) | Souls earned, performance summary |
| UX-09 | High | Design deck viewer UI (web mode) | Card grid with level and element |
| UX-10 | Medium | Draw user flow diagrams (all modes) | Document for all agents |
| UX-11 | Medium | Implement ARIA labels on all interactive web elements | Accessibility |
| UX-12 | Medium | Verify color contrast ratios meet 4.5:1 (WCAG AA) | Blocked by SA-02 (palette) |
| UX-13 | Medium | Design map UI overlay (minimap, current zone name, pause) | Map mode improvement |
| UX-14 | Medium | Design pause menu (web and map modes) | Basic game controls |
| UX-15 | Low | Implement responsive layout for web mode (mobile-friendly) | Future audience expansion |
| UX-16 | Low | Design settings menu (volume, key rebinding) | Quality of life |
| UX-17 | Low | Add keyboard shortcut legend in combat HUD | Discoverability |
