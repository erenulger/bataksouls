# QA Agent Report — BatakSouls
**Generated:** 2026-02-20
**Role:** Quality Assurance & Testing Specialist
**Overall Quality Status:** RED — No automated tests, known integration bugs

---

## Test Coverage Status

| System | Test Coverage | Notes |
|--------|-------------|-------|
| Card power calculation | 0% | No tests |
| Trick resolution | 0% | No tests |
| Bid resolution | 0% | No tests |
| AI decision making | 0% | No tests |
| State machine transitions | 0% | No tests |
| Endurance damage | 0% | No tests |
| Forge upgrade cost | 0% | No tests |
| Deck load/save | 0% | No tests |
| Map collision | 0% | No tests |
| Forge-map integration | N/A | Not functional (dummy) |

**Total automated test coverage: 0%**

---

## Bug Reports

### BUG-QA-001: Forge Entity Does Not Open Forge State
**Priority:** High
**Agent Responsible:** Mechanics Developer
**Reproduction Steps:**
1. Start web/map mode
2. Walk player to forge entity on map
3. Press F near forge
**Expected:** Forge state opens
**Actual:** `forgeOpen` DOM event fires but game state does not transition to forge
**Impact:** Core feature broken in map mode; blocks forge economy testing

---

### BUG-QA-002: Defeated Enemies Respawn on Map Re-Entry
**Priority:** High
**Agent Responsible:** Mechanics Developer
**Reproduction Steps:**
1. Enter map mode
2. Trigger and win a combat encounter
3. Return to map (or refresh)
**Expected:** Defeated enemy entity removed from map
**Actual:** All enemies present again
**Impact:** No consequence to winning — game loop broken

---

### BUG-QA-003: Endurance — All-Empty-Hand Edge Case
**Priority:** Medium
**Agent Responsible:** Mechanics Developer
**Reproduction Steps:**
1. Set up combat with low handSize NPCs (e.g., handSize: 1)
2. After bidding (1 card used), all players have empty hands
3. Observe endurance state behavior
**Expected:** Endurance skipped or all-zero damage, proceed to round end
**Actual:** Unknown — untested; possible infinite loop or incorrect damage
**Impact:** Could crash or corrupt game state in edge-case configurations

---

### BUG-QA-004: Combat with Unregistered NPC Slug
**Priority:** Medium
**Agent Responsible:** Mechanics Developer
**Reproduction Steps:**
1. Launch game with `--npc undeadSpear` or `--npc undeadShieldedSpear`
2. Observe behavior
**Expected:** NPC loads from deck file
**Actual:** Likely throws "file not found" — deck file existence not confirmed
**Impact:** Map entities referencing these slugs will break combat trigger

---

### BUG-QA-005: No Undo for Card Play
**Priority:** Low
**Agent Responsible:** UI/UX Agent
**Description:** Player selects card number and immediately plays it. No confirmation step. Mis-clicks or mis-types cannot be corrected.
**Impact:** Player experience frustration, especially for newcomers

---

## Functional Test Plan (To Be Implemented)

### Combat System Tests
- [ ] Trump element is always from the bid winner's card element
- [ ] Trick winner is the player with highest modified power
- [ ] Tie-breaking: trump card beats non-trump; first player wins on full tie
- [ ] Bid winner panic reduction: -20 points applied
- [ ] Trick winner panic reduction: -5 points applied
- [ ] Panic floor enforced (never below 10)
- [ ] Play order: highest panic first, bid winner last
- [ ] Endurance damage equals average enemy card power

### AI Behavior Tests
- [ ] Aggressive AI: bids weakest card from strongest element
- [ ] Defensive AI: bids weakest card from weakest element
- [ ] Chaotic AI: selects cards randomly
- [ ] Trickster AI: alternates strong/weak on odd/even tricks
- [ ] Supportive AI: plays same element as ally when possible
- [ ] Mood transitions: Aggressive → Desperate below 25% HP
- [ ] Mood transitions: Trickster → Coward below 50% HP

### Forge Tests
- [ ] Upgrade cost formula: 10 + (level × 5)
- [ ] Max level 10 enforced
- [ ] Power increases by 2 per level
- [ ] Player deck saved to disk after upgrade
- [ ] Insufficient souls blocks upgrade

### Deck System Tests
- [ ] Deck loads correctly from JSON files
- [ ] Card levels applied to base power
- [ ] Hand of 13 dealt from collection of 26
- [ ] Hand sorted: mystical elements first, then physical, ascending power

### Map System Tests
- [ ] Player movement responds to WASD
- [ ] Player cannot pass through walls
- [ ] Enemy collision triggers `combatStart` event
- [ ] Forge proximity + F key triggers `forgeOpen` event
- [ ] Camera follows player smoothly

---

## Performance Test Plan

- [ ] Terminal: Full 12-trick combat completes within 30 seconds of play
- [ ] Web: SSE updates arrive within 100ms of state transitions
- [ ] Map: Canvas renders at 60 FPS with 4+ entities on screen
- [ ] Node.js memory: No memory leaks during 10+ consecutive combats
- [ ] Deck save/load: File I/O completes within 100ms

---

## QA Agent Backlog

| ID | Priority | Task | Notes |
|----|----------|------|-------|
| QA-01 | Critical | Write unit tests for card power calculation (card.js) | Highest logic complexity |
| QA-02 | Critical | Write unit tests for trick resolution (trick.js) | Win condition, tie-breaking |
| QA-03 | Critical | Write unit tests for bid resolution (bidding.js) | Trump determination |
| QA-04 | Critical | Verify deck file existence for all NPC slugs referenced in sampleMap.js | Data integrity |
| QA-05 | High | Write integration test: full combat round (bid → tricks → result) | End-to-end combat |
| QA-06 | High | Test all 5 AI personalities through complete combat | Behavioral validation |
| QA-07 | High | Test endurance edge cases (all-empty-hand, single-player-empty) | Stability |
| QA-08 | High | Validate forge upgrade saves correctly and persists across sessions | Data persistence |
| QA-09 | High | Test forge-map integration once ME-01 is complete | Blocker: ME-01 |
| QA-10 | High | Test multi-enemy combat (2v1, 2v2, 3v1 scenarios) | Party dynamics |
| QA-11 | Medium | Write performance baseline: FPS, memory, SSE latency | Create benchmark script |
| QA-12 | Medium | Playtesting checklist: run through full game loop once functional | Manual QA |
| QA-13 | Medium | Test deck load with malformed or missing card IDs | Error resilience |
| QA-14 | Medium | Validate panic floor (10) enforced across all scenarios | Balance integrity |
| QA-15 | Low | Cross-browser test web mode (Chrome, Firefox, Safari) | Platform compatibility |
| QA-16 | Low | Test terminal mode on Linux and macOS | Cross-platform |
