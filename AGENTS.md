# AGENTS.md — LLM Amoeba Technical Reference

## Overview

LLM Amoeba is a 2D browser game where a Large Language Model controls a virtual amoeba
on a simulated microscopic surface. The game runs in discrete cycles; each cycle queries
the LLM for a decision, then animates the result. The amoeba must feed, avoid hazards,
and (ideally) accumulate enough energy to divide.

## Tech Stack

- **Vue 3** (Composition API) — UI layer: settings panel, HUD overlay
- **Phaser 3** — game rendering, animation, camera system
- **Vite** — build tooling
- **TypeScript** — all source code

## Architecture

```
Vue App (App.vue)
├── SettingsPanel.vue        LLM configuration, game controls
├── GameHUD.vue              Energy/cycle/amoeba-count overlay
├── LLMLogPanel.vue          Per-cycle LLM decision log with raw prompt/response modal
└── GameView.vue             Mounts Phaser canvas
     └── Phaser.Game
          └── GameScene
               ├── Entities  (Amoeba, Enemy, FoodItem, PoisonItem)
               └── Systems   (CycleManager, VisionSystem, EnemyAI)
                    └── LLM Layer (LLMClient, PromptBuilder, ResponseParser)
```

Communication between Vue and Phaser flows through a shared reactive store
(`src/stores/gameStore.ts`). Vue reads game stats; Phaser reads LLM settings.

## World Scale

- Surface: **5 cm × 5 cm**
- Internal unit: centimeters (all positions and sizes are floats in cm)
- Render scale: **1200 px/cm**
- World in pixels: **6000 × 6000**
- Viewport: **1000 × 1000 px** (shows ~0.83 cm at default zoom)

### Key Dimensions (cm → px at 1200 px/cm)

- Amoeba diameter: 0.025 cm → 30 px
- Amoeba radius: 0.0125 cm → 15 px
- Amoeba vision radius: 0.3 cm → 360 px
- Enemy vision radius: 0.05 cm → 60 px
- Max food radius: 0.1 cm → 120 px
- Max movement per cycle: 5 body-lengths = 0.125 cm → 150 px

## Energy System

Energy is a float in [0, 100]. Starting value: 50.

| Event | Energy change |
|---|---|
| Moving | −0.1 per body-length traveled |
| Feeding (on food) | +1 per cycle (if food available at position) |
| Poison (passive) | −1 per cycle while in poison zone |
| Enemy contact | −2 per cycle (within 2 amoeba radii of enemy) |
| Division | Requires ≥ 90; each child gets parent_energy / 2 |
| Energy = 0 | Entity dies and is removed |

## Food & Poison — Halo Model

Each food/poison item has:
- **center** (x, y) in cm
- **radius** R (random, up to 0.1 cm)
- **energy** (random integer, 2–200 for food; same range for poison)

Both food and poison **decay at 0.1 energy per cycle**. When remaining energy drops below **0.1**, the item is removed from the map.

Spatial intensity at distance `d` from center:
```
d ≤ R        → intensity = 1.0
R < d ≤ 2R   → intensity = 1.0 − (d − R) / R
d > 2R       → intensity = 0.0
```

**Energy available at position** = `intensity × remaining_energy`.

### Feeding Rules
- Amoeba's center of mass must be within the food circle or halo.
- Can feed only if `energy_at_position ≥ 1`.
- Feeding subtracts 1 from the food's energy pool and adds 1 to the amoeba.
- **Not cumulative**: if multiple food halos overlap the amoeba, it feeds from
  only the single best food source (highest energy at position). Only that food
  item loses energy.
- As food depletes, the effective halo shrinks (positions that previously had
  energy ≥ 1 may drop below threshold).

### Poison Rules
- Poison drains 1 energy per cycle from any amoeba/enemy whose center is within
  the poison circle or halo, regardless of action chosen.
- **Cumulative**: if the amoeba's center is within multiple poison halos, it
  takes damage from each one independently (e.g., 3 overlapping poisons = 3
  energy drained per cycle).
- Poison decays 0.1 per cycle like food; when energy &lt; 0.1, it disappears.

## Movement

- 6 hexagonal directions (60° increments):
  - 0 = right (0°), 1 = upper-right (60°), 2 = upper-left (120°),
    3 = left (180°), 4 = lower-left (240°), 5 = lower-right (300°)
- Distance: **0.5–5 body-lengths per cycle** (minimum 0.5 amoeba diameter when moving)
- Cost: 0.1 energy × distance_in_body_lengths
- Clamped to world bounds (0–5 cm on each axis)

## Enemies

- Same physical size as amoeba, rendered in red.
- Vision radius: 0.05 cm.
- AI: greedy — each cycle, move toward the nearest visible amoeba (up to 5
  body-lengths). If no amoeba is visible, wander randomly.
- Drain: 2 energy/cycle from any amoeba within 2 amoeba-radii.
- Affected by poison identically to amoebas.
- Die at 0 energy; start with 50 energy.

## LLM Integration

### Request
- Endpoint: OpenAI-compatible `POST {baseUrl}/chat/completions`
- Model, temperature, max_tokens are user-configurable.
- **Structured outputs**: every request includes `response_format` with
  `type: "json_schema"` and `strict: true`, constraining the LLM to produce
  valid JSON matching the action schema.
- **Reasoning model detection**: models matching `o1`, `o3-*`, `gpt-oss-*`,
  etc. are detected automatically. For these models the client sends
  `max_completion_tokens` instead of `max_tokens` and omits `temperature`.

### System Prompt (default, user-editable)
Tells the LLM it controls an amoeba and must respond with a single JSON object.

### User Message (per cycle, per amoeba)
Contains:
- Amoeba position `(x, y)` in cm
- Current energy
- List of nearby objects within the 0.3 cm vision radius:
  - type (food / poison / enemy / amoeba)
  - relative position (dx, dy) in cm
  - distance in cm
  - additional info (energy remaining for food, etc.)

### Vision Detection
The amoeba detects a food or poison item when any part of the item's halo
intersects the vision circle: `center_distance ≤ vision_radius + item_radius × halo_multiplier`.
Enemies and other amoebas are detected by center-to-center distance only.

### Response JSON Schema
```json
{
  "action": "move" | "feed" | "divide",
  "direction": <integer 0–5 | null>,
  "distance": <number 0.5–5 | null>
}
```

All three fields are always present. For `feed` and `divide`, `direction` and
`distance` are `null`. For `move`, `distance` must be 0.5–5 body lengths.

If the response is unparseable or the action is invalid, the amoeba idles
(no energy cost beyond passive effects like poison).

### LLM Log
The bottom panel shows a per-cycle log of every LLM decision. Each entry has
a **{}** button that opens a modal showing the raw prompt messages and the raw
LLM response for that cycle.

## Visual Indicators

- Each amoeba draws a **dashed dark gray circle** at its vision radius (0.3 cm / 360 px),
  showing exactly what the amoeba can and cannot see.

## Camera System

- Viewport: 1000 × 1000 px
- Zoom range: 0.167 (see full world) to 3.0 (close-up)
- Mouse wheel to zoom, click-drag to pan
- Camera follows selected amoeba by default
- Minimap in corner shows full world overview

## Initial Spawn Defaults

- 1 player amoeba at world center (2.5, 2.5)
- 50 food items at random positions
- 15 poison items at random positions
- 10 enemies at random positions (minimum distance from center)
- Respawn: 1 food every ~5 cycles, 1 poison every ~10 cycles

## File Map

```
src/
  main.ts                     Vue bootstrap
  App.vue                     Root layout
  style.css                   Global styles
  components/
    GameView.vue              Phaser canvas mount
    SettingsPanel.vue          LLM config UI
    GameHUD.vue               Stats overlay
    LLMLogPanel.vue           Decision log + raw prompt/response modal
  game/
    PhaserGame.ts             Phaser.Game factory
    constants.ts              All numeric constants
    CameraController.ts       Zoom, pan, follow, minimap
    scenes/
      GameScene.ts            Main scene
    entities/
      Amoeba.ts               Player amoeba
      Enemy.ts                Bot predator
      FoodItem.ts             Food with halo
      PoisonItem.ts           Poison with halo
    systems/
      CycleManager.ts         Game cycle orchestration
      VisionSystem.ts         Surroundings query
      EnemyAI.ts              Enemy behavior
  llm/
    LLMClient.ts              API client
    PromptBuilder.ts          Prompt construction
    ResponseParser.ts         Response validation
  stores/
    gameStore.ts              Shared reactive state
  types/
    index.ts                  TypeScript interfaces
```
