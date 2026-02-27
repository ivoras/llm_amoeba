import { reactive, watch } from 'vue'
import type { LLMSettings, GameSettings, GameStats, LLMLogEntry, AmoebaHUDInfo } from '@/types'

const MAX_LOG_ENTRIES = 200
import { DEFAULT_CYCLE_INTERVAL_MS } from '@/game/constants'

const STORAGE_KEY = 'llm-amoeba-settings'

const DEFAULT_SYSTEM_PROMPT = `You are the brain of a single-celled amoeba living on a microscopic 2D surface. Each cycle you receive your current position, energy level, and a description of nearby objects. You must respond with a single JSON object choosing one action.

Coordinate system:
- Origin is at the top-left of the world: (0, 0).
- +x points right.
- +y points down.

Available actions:
- move: Move in one of 8 compass directions. Distance must be 0.5-5 body lengths per cycle (minimum 0.5). Costs 0.2 energy per body-length.
  Directions: "right", "up-right", "up", "up-left", "left", "down-left", "down", "down-right"
- feed: Consume food at your current location. Gains 1 energy. Only works if you are on or near a food source.
- divide: Split into two amoebas. Requires 90+ energy. Each child gets half your energy.

Response format (respond with ONLY a JSON object, no other text):
{"action": "move", "direction": "up-right", "distance": 1.5}
{"action": "feed", "direction": null, "distance": null}
{"action": "divide", "direction": null, "distance": null}

Survival tips:
- Your goal is to maximize your energy points.
- Eating food gives you energy. You must be close to or on top of food to feed. Food and poison decay 0.1 energy per cycle and disappear when below 0.1.
- Avoid poison (purple) — it drains 3 energy per cycle passively.
- Avoid enemies (red) — they drain 2 energy per cycle when within 4 body-lengths. If you see an enemy nearby, move away immediately. Enemies will chase you, so put as much distance as you can between yourself and them.
- Avoid tombstones (gray) — they mark where amoebas died. Stay at least 2 body-lengths away. Moving too close will be rejected.
- If your energy falls below 0.1, you die.
- If you accumulate 90+ energy, consider dividing to propagate.
- If you are stuck in a loop, repeating the same movements, pick a random direction to move to.
- Be strategic: weigh the energy cost of movement against potential gains. Survival is the priority — always flee from enemies before seeking food.`

function loadSettings(): { llm: LLMSettings; game: GameSettings } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        llm: { ...getDefaultLLMSettings(), ...parsed.llm },
        game: { ...getDefaultGameSettings(), ...parsed.game },
      }
    }
  } catch {
    // ignore corrupt data
  }
  return { llm: getDefaultLLMSettings(), game: getDefaultGameSettings() }
}

function getDefaultLLMSettings(): LLMSettings {
  return {
    apiUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    temperature: 0.2,
    maxTokens: 150,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    responseFormatType: 'json_object',
  }
}

function getDefaultGameSettings(): GameSettings {
  return {
    cycleIntervalMs: DEFAULT_CYCLE_INTERVAL_MS,
    showDebugOverlays: true,
    randomSeed: 0,
    initialFoodCount: 50,
    initialPoisonCount: 15,
    initialEnemyCount: 10,
  }
}

const saved = loadSettings()

export const gameStore = reactive({
  llmSettings: saved.llm,
  gameSettings: saved.game,

  stats: {
    cycleCount: 0,
    amoebaCount: 1,
    foodCount: 0,
    enemyCount: 0,
    poisonCount: 0,
    selectedAmoebaEnergy: 50,
    amoebas: [] as AmoebaHUDInfo[],
    running: false,
    promptTokens: 0,
    generatedTokens: 0,
  } as GameStats,

  selectedAmoebaId: null as string | null,

  tooltip: {
    visible: false,
    text: '',
    x: 0,
    y: 0,
  },

  llmLog: [] as LLMLogEntry[],

  addLogEntry(entry: LLMLogEntry) {
    this.llmLog.push(entry)
    if (this.llmLog.length > MAX_LOG_ENTRIES) {
      this.llmLog.shift()
    }
  },

  addTokenUsage(promptTokens: number, generatedTokens: number) {
    this.stats.promptTokens += promptTokens
    this.stats.generatedTokens += generatedTokens
  },

  clearLog() {
    this.llmLog.length = 0
  },

  resetDefaults() {
    Object.assign(this.llmSettings, getDefaultLLMSettings())
    Object.assign(this.gameSettings, getDefaultGameSettings())
  },

  resetSystemPrompt() {
    this.llmSettings.systemPrompt = getDefaultLLMSettings().systemPrompt
  },
})

watch(
  () => ({ llm: { ...gameStore.llmSettings }, game: { ...gameStore.gameSettings } }),
  (val) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
  },
  { deep: true },
)
