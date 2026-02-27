# LLM Amoeba

**Can an AI keep a single-celled organism alive?**

**[Play the game hosted on GitHub Pages →](https://ivoras.github.io/llm_amoeba/)**

LLM Amoeba is a browser-based experiment that puts a large language model in control of a virtual amoeba (front-end only, no backend). The amoeba lives on a simulated microscopic surface — 5 cm by 5 cm of terrain filled with food, poison, and predators. The game sends what the amoeba "sees" to an LLM, and the model decides what to do: move, eat, or reproduce. You watch what happens, and tweak the system prompt to make it more efficient, or more exciting.

It's part game, part simulation, part AI stress test. Some models will thrive. Others will walk straight into poison. The fun is in finding out.

> **Tip:** This game is best run on a local LLM — it spends a lot of tokens. Each cycle sends full prompts and conversation history for every amoeba, so token usage grows quickly with multiple amoebas and long runs.

---

## How It Works

The game runs in **cycles**. Each cycle:

1. The amoeba's surroundings (everything within 0.3 cm) are gathered and described in plain text.
2. That description — along with the amoeba's position and energy level — is sent to an LLM via an OpenAI-compatible API.
3. The LLM responds with a structured JSON action (enforced via JSON schema): move in one of eight compass directions, feed on nearby food, or divide into two amoebas.
4. The game executes the action with smooth animation, then applies passive effects (poison damage, predator attacks).
5. Repeat.

Each amoeba keeps its own conversation history (last 5 roundtrips), and each prompt includes feedback about the previous action's outcome and net energy change. You configure which LLM to use, tweak the system prompt, and see if your amoeba survives — or thrives.

---

## The World

The playing field is a **5 cm × 5 cm** surface rendered at microscopic scale. A realistically-sized amoeba (~0.025 cm diameter) navigates this world with a camera that follows it and lets you zoom and pan.

### Food (green)
Circular patches of nutrients scattered across the surface. Each has a **halo** — a gradient field twice the food's radius where energy is still available but weaker. The amoeba must position itself within this zone and choose to feed. Each feeding cycle transfers 2 energy points from the food. Food decays at **0.1 energy per cycle** (in addition to feeding). As food loses energy, its **core and halo physically shrink** in proportion to remaining energy — a half-depleted food item is half the size. When energy drops below 0.1, the food disappears from the map.

### Poison (purple)
Silent killers. Poison zones look like food but drain **3 energy per cycle** from any amoeba that wanders into their halo. There's no "feeding" on poison — it just hurts. **Poison damage is cumulative** — overlapping poison halos each drain independently. Like food, poison **shrinks proportionally** as it decays at **0.1 energy per cycle**; when energy drops below 0.1, it disappears.

### Movement
When the LLM chooses to move, the distance must be **at least 0.5 amoeba diameter** (0.5 body lengths) per cycle, up to 5 body lengths. The amoeba cannot stand still when moving — it must travel at least this minimum.

### Enemies (red)
Bot-controlled predators the same size as your amoeba. They have a vision radius of 0.25 cm (10 body-lengths) and move aggressively toward any amoeba they spot. If an enemy gets within **4 body-lengths**, it drains **2 energy per cycle** and its sprite pulsates between violet and red to signal active draining. Enemies are also vulnerable to poison, so sometimes the terrain fights your battles for you.

### Tombstones (gray)
When an amoeba dies, a **tombstone** appears at its death location. Tombstones persist until you reset the game. Living amoebas must stay **at least 2 body-lengths** away — move actions that would bring you too close are rejected.

---

## Energy

Energy is the currency of life. It ranges from **0 to 100** and starts at **50**.

| Event | Effect |
|---|---|
| Moving | Costs 0.2 per body-length traveled |
| Feeding | Gains 2 per cycle (single best food source) |
| Food decay | −0.1 per cycle (food disappears when &lt; 0.1) |
| Poison | Drains 3 per cycle per poison (cumulative) |
| Poison decay | −0.1 per cycle (poison disappears when &lt; 0.1) |
| Enemy contact | Drains 2 per cycle (within 4 body-lengths) |
| Division | Requires 90+; each child gets half |
| Reaching 0 | Death (creates a tombstone at that location) |

The most successful amoebas will accumulate enough energy to **divide** — splitting into two independently-controlled organisms, each making their own LLM calls. This is the ultimate measure of success.

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- An API key for any OpenAI-compatible LLM provider

### Setup

```bash
git clone https://github.com/your-username/llm_amoeba.git
cd llm_amoeba
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Configure

1. Click **Settings** in the top-right corner.
2. Enter your **API URL** (e.g., `https://api.openai.com/v1`) and **API Key**.
3. Choose a **model** (e.g., `gpt-5-mini`).
4. Optionally tweak the **system prompt** — the default works well, but experimentation is encouraged.
5. Adjust **temperature** and **cycle interval** to taste.
6. Hit **Start** and watch your amoeba make its first decisions.

All settings are saved in your browser's local storage.

---

## Controls

- **Mouse wheel** — zoom in/out
- **Right-click drag** — pan the camera
- **Click an amoeba** — select it (camera follows)
- **Settings panel** — start, pause, reset, configure LLM
- **LLM Log** — bottom panel shows every decision; click **{}** to see the full prompt/response, or **?** (on rejected entries) to see the raw invalid response

---

## Tech Stack

- **Vue 3** — UI layer (settings, HUD)
- **Phaser 3** — 2D game engine (rendering, animation, camera)
- **Vite** — build tooling
- **TypeScript** — throughout

---

## Project Structure

```
src/
  main.ts                 # App entry point
  App.vue                 # Root layout
  components/             # Vue UI components
  game/
    PhaserGame.ts         # Game instance factory
    constants.ts          # All game parameters
    CameraController.ts   # Zoom, pan, follow
    scenes/GameScene.ts   # Main game scene
    entities/             # Amoeba, Enemy, Food, Poison, Tombstone
    systems/              # CycleManager, VisionSystem, EnemyAI
  llm/                    # LLM client (structured outputs, reasoning model support), prompt builder, response parser
  stores/                 # Shared reactive state
  types/                  # TypeScript interfaces
```

See [AGENTS.md](AGENTS.md) for full technical documentation of game mechanics and architecture.

---

## Ideas to Try

- **Prompt engineering**: Can you write a system prompt that makes the amoeba smarter? Try giving it explicit strategies.
- **Model comparison**: How does GPT-5-mini compare to Sonnet 4-5, or a local model? Does smarter = better survival?
- **Temperature tuning**: Low temperature for cautious play, high for chaotic exploration — what works?
- **Speedrun division**: How fast can you get an amoeba to 90 energy and divide?

---

## License

See [LICENSE](LICENSE).
