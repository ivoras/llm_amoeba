import {
  POISON_DRAIN_PER_CYCLE,
  POISON_FOOD_DRAIN_PER_CYCLE,
  FEEDING_GAIN_PER_CYCLE,
  ENEMY_DRAIN_PER_CYCLE,

  FOOD_MIN_ENERGY,
  FOOD_MAX_ENERGY,
  MIN_FOOD_RADIUS_CM,
  MAX_FOOD_RADIUS_CM,
  MIN_POISON_RADIUS_CM,
  MAX_POISON_RADIUS_CM,
  POISON_MIN_ENERGY,
  POISON_MAX_ENERGY,
  WORLD_WIDTH_CM,
  WORLD_HEIGHT_CM,
  DIRECTIONS,
  cmToPx,
  pxToCm,
  MIN_ENEMY_SPAWN_DISTANCE_CM,
  DIVISION_ENERGY_THRESHOLD,
  MOVE_ENERGY_COST_PER_BODY_LENGTH,
  AMOEBA_RADIUS_CM,
  AMOEBA_DIAMETER_CM,
  ENEMY_DRAIN_RADIUS_MULTIPLIER,
  TOMBSTONE_AVOID_BODY_LENGTHS,
} from '../constants'
import { LLMClient } from '@/llm/LLMClient'
import { PromptBuilder } from '@/llm/PromptBuilder'
import { ResponseParser } from '@/llm/ResponseParser'
import { VisionSystem } from './VisionSystem'
import { EnemyAI } from './EnemyAI'
import type { Amoeba } from '../entities/Amoeba'
import { Enemy } from '../entities/Enemy'
import { FoodItem } from '../entities/FoodItem'
import { PoisonItem } from '../entities/PoisonItem'
import { Tombstone } from '../entities/Tombstone'
import type { LLMSettings, LLMMessage, AmoebaAction } from '@/types'
import { gameStore } from '@/stores/gameStore'
import { rng } from '../rng'

export class CycleManager {
  private llmClient = new LLMClient()
  private promptBuilder = new PromptBuilder()
  private responseParser = new ResponseParser()
  private vision = new VisionSystem()
  private enemyAI = new EnemyAI()

  private scene: Phaser.Scene
  private amoebas: Amoeba[]
  private enemies: Enemy[]
  private foods: FoodItem[]
  private poisons: PoisonItem[]
  private tombstones: Tombstone[]

  private cycling = false
  private cycleTimer: number | null = null

  // Keeps the last MAX_HISTORY_MESSAGES messages per amoeba (excluding system + current user).
  // Each roundtrip = 1 user + 1 assistant = 2 messages; 5 roundtrips = 10 messages.
  private amoebaHistory = new Map<string, LLMMessage[]>()
  private static readonly MAX_HISTORY_MESSAGES = 10

  // Tracks the last resolved action, outcome, and energy snapshot per amoeba for next-cycle feedback.
  private amoebaLastAction = new Map<string, { description: string; outcome: string; energyBefore: number }>()

  constructor(
    scene: Phaser.Scene,
    amoebas: Amoeba[],
    enemies: Enemy[],
    foods: FoodItem[],
    poisons: PoisonItem[],
    tombstones: Tombstone[],
  ) {
    this.scene = scene
    this.amoebas = amoebas
    this.enemies = enemies
    this.foods = foods
    this.poisons = poisons
    this.tombstones = tombstones
  }

  start(): void {
    if (this.cycling) return
    this.cycling = true
    this.scheduleNextCycle()
  }

  stop(): void {
    this.cycling = false
    if (this.cycleTimer !== null) {
      clearTimeout(this.cycleTimer)
      this.cycleTimer = null
    }
  }

  clearHistory(): void {
    this.amoebaHistory.clear()
    this.amoebaLastAction.clear()
  }

  get isRunning(): boolean {
    return this.cycling
  }

  private scheduleNextCycle(cycleStartTime?: number): void {
    if (!this.cycling) return
    if (this.cycleTimer !== null) return  // a timer is already pending; avoid double-scheduling
    const interval = gameStore.gameSettings.cycleIntervalMs
    let delay = interval
    if (cycleStartTime != null) {
      const elapsed = Date.now() - cycleStartTime
      delay = Math.max(0, interval - elapsed)
    }
    this.cycleTimer = window.setTimeout(() => {
      this.cycleTimer = null
      this.runCycle()
    }, delay)
  }

  private runCycle(): void {
    if (!this.cycling) return
    if (this.amoebas.length === 0) {
      this.stop()
      gameStore.stats.running = false
      return
    }

    const cycleStartTime = Date.now()
    gameStore.stats.cycleCount++
    const cycleNumber = gameStore.stats.cycleCount

    const settings: LLMSettings = { ...gameStore.llmSettings }

    const readyAmoebas = this.amoebas.filter((a) => a.alive && !a.isMoving)

    if (readyAmoebas.length === 0) {
      this.runCycleEnd(cycleStartTime, readyAmoebas, new Map(), new Map())
      return
    }

    const outcomes = new Map<string, string>()
    const preActionEnergy = new Map<string, number>()
    let pendingCount = readyAmoebas.length

    const onAmoebaComplete = (): void => {
      pendingCount--
      if (pendingCount === 0 && this.cycling) {
        this.runCycleEnd(cycleStartTime, readyAmoebas, outcomes, preActionEnergy)
      }
    }

    for (const amoeba of readyAmoebas) {
      this.getAmoebaAction(amoeba, settings, cycleNumber)
        .then((action) => {
          if (!this.cycling) return
          if (!amoeba.alive) {
            onAmoebaComplete()
            return
          }
          preActionEnergy.set(amoeba.amoebaId, amoeba.energy)
          this.executeAction(amoeba, action, (outcome) => {
            outcomes.set(amoeba.amoebaId, outcome)
            onAmoebaComplete()
          })
        })
        .catch(() => {
          if (!this.cycling) return
          preActionEnergy.set(amoeba.amoebaId, amoeba.energy)
          outcomes.set(amoeba.amoebaId, 'Stayed idle — no action taken.')
          onAmoebaComplete()
        })
    }
  }

  private runCycleEnd(
    cycleStartTime: number,
    readyAmoebas: Amoeba[],
    outcomes: Map<string, string>,
    preActionEnergy: Map<string, number>,
  ): void {
    if (!this.cycling) return

    this.enemyAI.update(this.enemies, this.amoebas, this.poisons)
    this.applyPassiveEffects()

    for (const amoeba of readyAmoebas) {
      if (!amoeba.alive && !preActionEnergy.has(amoeba.amoebaId)) continue
      const eBefore = preActionEnergy.get(amoeba.amoebaId) ?? amoeba.energy
      const passiveLines: string[] = []
      const pos = amoeba.positionCm
      for (const poison of this.poisons) {
        const dx = pos.x - poison.positionCm.x
        const dy = pos.y - poison.positionCm.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (poison.isInRange(dist)) {
          passiveLines.push(`Poison (${poison.poisonId}) is draining your energy.`)
        }
      }
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue
        const dx = pos.x - enemy.positionCm.x
        const dy = pos.y - enemy.positionCm.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist <= AMOEBA_RADIUS_CM * ENEMY_DRAIN_RADIUS_MULTIPLIER) {
          passiveLines.push(`Enemy (${enemy.enemyId}) is feeding on you and draining ${ENEMY_DRAIN_PER_CYCLE} energy per cycle! Move away to escape.`)
        }
      }
      if (!amoeba.alive) {
        passiveLines.push('You have died! Energy fell below 0.1.')
      }
      const outcome = outcomes.get(amoeba.amoebaId) ?? 'No action taken.'
      const fullOutcome = passiveLines.length > 0
        ? outcome + ' ' + passiveLines.join(' ')
        : outcome
      this.amoebaLastAction.set(amoeba.amoebaId, {
        description: outcome.split(' — ')[0].replace(/\.$/, ''),
        outcome: fullOutcome,
        energyBefore: eBefore,
      })
    }
    this.applyPoisonFoodInteraction()
    this.applyDecay()
    this.removeDeadEntities()
    this.cleanupAmoebaHistory()
    this.respawnItems()
    this.updateStats()

    if (this.amoebas.length === 0) {
      this.stop()
      gameStore.stats.running = false
      return
    }

    this.scheduleNextCycle(cycleStartTime)
  }

  private static readonly MAX_RETRIES = 3

  private async getAmoebaAction(
    amoeba: Amoeba,
    settings: LLMSettings,
    cycleNumber: number,
  ): Promise<AmoebaAction> {
    let messages: LLMMessage[] = []
    try {
      const surroundings = this.vision.getSurroundings(
        amoeba,
        this.amoebas,
        this.enemies,
        this.foods,
        this.poisons,
        this.tombstones,
      )

      // Snapshot energy before this cycle's actions are applied
      const energyNow = amoeba.energy

      // Build fresh [system, user] for this cycle's state
      const fresh = this.promptBuilder.buildMessages(
        settings.systemPrompt,
        amoeba.getState(),
        surroundings,
      )
      const systemMsg = fresh[0]

      // Prepend previous-action feedback to the user message
      const lastAction = this.amoebaLastAction.get(amoeba.amoebaId)
      let userContent = fresh[1].content
      if (lastAction) {
        const delta = energyNow - lastAction.energyBefore
        const deltaStr = (delta >= 0 ? '+' : '') + delta.toFixed(1)
        userContent =
          `Result of previous action: ${lastAction.outcome} ` +
          `Energy: ${lastAction.energyBefore.toFixed(1)} → ${energyNow.toFixed(1)} (${deltaStr})\n\n` +
          userContent
      }
      const stateMsg: LLMMessage = { role: 'user', content: userContent }

      // Prepend past conversation so the LLM remembers prior decisions
      const history = this.amoebaHistory.get(amoeba.amoebaId) ?? []
      messages = [systemMsg, ...history, stateMsg]

      for (let attempt = 0; attempt <= CycleManager.MAX_RETRIES; attempt++) {
        // Network/API errors propagate to the outer catch; parse errors are handled below
        const { content: rawResponse, usage } = await this.llmClient.chat(settings, messages)
        if (usage?.prompt_tokens != null || usage?.completion_tokens != null) {
          gameStore.addTokenUsage(
            usage.prompt_tokens ?? 0,
            usage.completion_tokens ?? 0,
          )
        }

        let action: AmoebaAction
        let parseError: string | null = null
        try {
          action = this.responseParser.parse(rawResponse)
        } catch (err) {
          parseError = err instanceof Error ? err.message : String(err)
          action = { action: 'idle' }
        }

        if (parseError) {
          // Invalid response format — log and retry immediately with correction
          gameStore.addLogEntry({
            cycle: cycleNumber,
            amoebaId: amoeba.amoebaId,
            action: 'rejected',
            details: `invalid response: ${parseError}`,
            promptMessages: [...messages],
            rawResponse,
          })
          if (attempt < CycleManager.MAX_RETRIES) {
            messages.push({ role: 'assistant', content: rawResponse })
            messages.push({ role: 'user', content: `Your response was invalid: ${parseError}. Please respond with a valid JSON action object.` })
          }
          continue
        }

        const rejection = this.validateAction(amoeba, action)
        if (!rejection) {
          const details = this.formatActionDetails(action)
          gameStore.addLogEntry({
            cycle: cycleNumber,
            amoebaId: amoeba.amoebaId,
            action: action.action,
            details: attempt > 0 ? `${details ?? ''} (retry ${attempt})`.trim() : details,
            promptMessages: [...messages],
            rawResponse,
          })

          // Save only the clean (state → accepted response) exchange to history
          const updated = [...history, stateMsg, { role: 'assistant' as const, content: rawResponse }]
          this.amoebaHistory.set(
            amoeba.amoebaId,
            updated.slice(-CycleManager.MAX_HISTORY_MESSAGES),
          )

          return action
        }

        // Game-logic rejection — log and retry with correction
        gameStore.addLogEntry({
          cycle: cycleNumber,
          amoebaId: amoeba.amoebaId,
          action: 'rejected',
          details: rejection,
          promptMessages: [...messages],
          rawResponse,
        })

        if (attempt < CycleManager.MAX_RETRIES) {
          messages.push({ role: 'assistant', content: rawResponse })
          messages.push({ role: 'user', content: rejection })
        }
      }

      gameStore.addLogEntry({
        cycle: cycleNumber,
        amoebaId: amoeba.amoebaId,
        action: 'idle',
        details: `gave up after ${CycleManager.MAX_RETRIES} retries — chat history cleared`,
        promptMessages: [...messages],
      })
      this.amoebaHistory.delete(amoeba.amoebaId)
      return { action: 'idle' }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`LLM call failed for ${amoeba.amoebaId}:`, err)
      gameStore.addLogEntry({
        cycle: cycleNumber,
        amoebaId: amoeba.amoebaId,
        action: 'error',
        details: message,
        promptMessages: [...messages],
      })
      return { action: 'idle' }
    }
  }

  private validateAction(amoeba: Amoeba, action: AmoebaAction): string | null {
    if (action.action === 'move') {
      const dir = DIRECTIONS[action.direction] ?? DIRECTIONS[0]
      const angleRad = (dir.angle * Math.PI) / 180
      const distCm = action.distance * AMOEBA_DIAMETER_CM
      let newX = amoeba.positionCm.x + Math.cos(angleRad) * distCm
      let newY = amoeba.positionCm.y - Math.sin(angleRad) * distCm
      newX = Math.max(0, Math.min(WORLD_WIDTH_CM, newX))
      newY = Math.max(0, Math.min(WORLD_HEIGHT_CM, newY))
      const avoidRadiusCm = TOMBSTONE_AVOID_BODY_LENGTHS * AMOEBA_DIAMETER_CM
      for (const tombstone of this.tombstones) {
        const tPos = tombstone.positionCm
        const dx = newX - tPos.x
        const dy = newY - tPos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < avoidRadiusCm) {
          return `Move rejected — that position is within ${TOMBSTONE_AVOID_BODY_LENGTHS} body-lengths of a tombstone (${tombstone.tombstoneId}). Stay away from tombstones.`
        }
      }
    }

    if (action.action === 'feed') {
      const pos = amoeba.positionCm
      const canFeed = this.foods.some((food) => {
        if (food.depleted) return false
        const dx = pos.x - food.positionCm.x
        const dy = pos.y - food.positionCm.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        return dist <= food.effectiveHaloRadiusCm && food.getEnergyAtDistance(dist) >= 1
      })
      if (!canFeed) {
        return 'Feeding failed — no food is within range. Move closer to a food source first.'
      }
    }

    if (action.action === 'divide') {
      if (amoeba.energy < DIVISION_ENERGY_THRESHOLD) {
        return `Division failed — energy is ${amoeba.energy.toFixed(1)} but need at least ${DIVISION_ENERGY_THRESHOLD}. Choose a different action.`
      }
    }

    return null
  }

  private formatActionDetails(action: AmoebaAction): string | undefined {
    switch (action.action) {
      case 'move': {
        const label = DIRECTIONS[action.direction]?.label ?? String(action.direction)
        return `${label}, dist ${action.distance}`
      }
      case 'feed':
      case 'divide':
      case 'idle':
        return undefined
    }
  }

  private executeAction(
    amoeba: Amoeba,
    action: AmoebaAction,
    onComplete?: (outcome: string) => void,
  ): string {
    switch (action.action) {
      case 'move': {
        const label = DIRECTIONS[action.direction]?.label ?? String(action.direction)
        const cost = (action.distance * MOVE_ENERGY_COST_PER_BODY_LENGTH).toFixed(1)
        const outcome = `Moved ${label} ${action.distance} body-lengths (cost ${cost} energy).`
        amoeba.applyAction(action, () => onComplete?.(outcome))
        return outcome
      }

      case 'feed': {
        const outcome = this.handleFeeding(amoeba)
        amoeba.applyAction(action, () => onComplete?.(outcome))
        return outcome
      }

      case 'divide': {
        const outcome = this.handleDivision(amoeba)
        amoeba.applyAction(action, () => onComplete?.(outcome))
        return outcome
      }

      case 'idle': {
        const outcome = 'Stayed idle — no action taken.'
        onComplete?.(outcome)
        return outcome
      }
    }
  }

  private handleFeeding(amoeba: Amoeba): string {
    const pos = amoeba.positionCm
    let bestFood: FoodItem | null = null
    let bestEnergy = 0

    for (const food of this.foods) {
      if (food.depleted) continue
      const dx = pos.x - food.positionCm.x
      const dy = pos.y - food.positionCm.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist <= food.effectiveHaloRadiusCm) {
        const energyHere = food.getEnergyAtDistance(dist)
        if (energyHere >= 1 && energyHere > bestEnergy) {
          bestEnergy = energyHere
          bestFood = food
        }
      }
    }

    if (bestFood) {
      const consumed = bestFood.consumeEnergy()
      const gained = consumed * FEEDING_GAIN_PER_CYCLE
      amoeba.addEnergy(gained)
      return `Fed successfully — gained ${gained.toFixed(1)} energy from ${bestFood.foodId}.`
    }

    return 'Feeding failed — no food is within range. Move closer to a food source first.'
  }

  private handleDivision(amoeba: Amoeba): string {
    if (!amoeba.canDivide()) {
      return `Division failed — energy is ${amoeba.energy.toFixed(1)} but need at least ${DIVISION_ENERGY_THRESHOLD}. Choose a different action.`
    }
    const child = amoeba.divide()
    if (child) {
      this.amoebas.push(child)
      return `Divided successfully — created ${child.amoebaId}. Each child has half the parent's energy.`
    }
    return 'Division failed unexpectedly.'
  }

  private applyPoisonFoodInteraction(): void {
    for (const poison of this.poisons) {
      if (poison.depleted) continue
      const pPos = poison.positionCm
      for (const food of this.foods) {
        if (food.depleted) continue
        const dx = pPos.x - food.positionCm.x
        const dy = pPos.y - food.positionCm.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist <= food.effectiveHaloRadiusCm) {
          food.drainEnergy(POISON_FOOD_DRAIN_PER_CYCLE)
        }
      }
    }
  }

  private applyDecay(): void {
    for (const food of this.foods) {
      if (!food.depleted) food.decay()
    }
    for (const poison of this.poisons) {
      if (!poison.depleted) poison.decay()
    }
  }

  private applyPassiveEffects(): void {
    for (const amoeba of this.amoebas) {
      if (!amoeba.alive) continue
      const pos = amoeba.positionCm
      for (const poison of this.poisons) {
        const dx = pos.x - poison.positionCm.x
        const dy = pos.y - poison.positionCm.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (poison.isInRange(dist)) {
          amoeba.takeDamage(POISON_DRAIN_PER_CYCLE)
        }
      }
    }
  }

  private removeDeadEntities(): void {
    for (let i = this.amoebas.length - 1; i >= 0; i--) {
      const amoeba = this.amoebas[i]
      if (!amoeba.alive) {
        const pos = amoeba.positionCm
        const tombstone = new Tombstone(this.scene, cmToPx(pos.x), cmToPx(pos.y))
        this.tombstones.push(tombstone)
        this.amoebas.splice(i, 1)
        // Amoeba destroys itself when death tween completes
      }
    }
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (!this.enemies[i].alive) {
        this.enemies.splice(i, 1)
      }
    }
    for (let i = this.foods.length - 1; i >= 0; i--) {
      if (this.foods[i].depleted) {
        this.foods[i].remove()
        this.foods.splice(i, 1)
      }
    }
    for (let i = this.poisons.length - 1; i >= 0; i--) {
      if (this.poisons[i].depleted) {
        this.poisons[i].remove()
        this.poisons.splice(i, 1)
      }
    }
  }

  private respawnItems(): void {
    while (this.foods.length < gameStore.gameSettings.initialFoodCount) {
      this.spawnRandomFood()
    }
    while (this.poisons.length < gameStore.gameSettings.initialPoisonCount) {
      this.spawnRandomPoison()
    }
    while (this.enemies.length < gameStore.gameSettings.initialEnemyCount) {
      this.spawnRandomEnemy()
    }
  }

  private spawnRandomFood(): void {
    const x = rng() * WORLD_WIDTH_CM
    const y = rng() * WORLD_HEIGHT_CM
    const radius = MIN_FOOD_RADIUS_CM + rng() * (MAX_FOOD_RADIUS_CM - MIN_FOOD_RADIUS_CM)
    const energy = FOOD_MIN_ENERGY + Math.floor(rng() * (FOOD_MAX_ENERGY - FOOD_MIN_ENERGY))

    const food = new FoodItem(this.scene, cmToPx(x), cmToPx(y), radius, energy)
    this.foods.push(food)
  }

  private spawnRandomPoison(): void {
    const x = rng() * WORLD_WIDTH_CM
    const y = rng() * WORLD_HEIGHT_CM
    const radius = MIN_POISON_RADIUS_CM + rng() * (MAX_POISON_RADIUS_CM - MIN_POISON_RADIUS_CM)
    const energy = POISON_MIN_ENERGY + Math.floor(rng() * (POISON_MAX_ENERGY - POISON_MIN_ENERGY))

    const poison = new PoisonItem(this.scene, cmToPx(x), cmToPx(y), radius, energy)
    this.poisons.push(poison)
  }

  private spawnRandomEnemy(): void {
    let x: number, y: number
    do {
      x = rng() * WORLD_WIDTH_CM
      y = rng() * WORLD_HEIGHT_CM
    } while (
      Math.sqrt(
        (x - WORLD_WIDTH_CM / 2) ** 2 + (y - WORLD_HEIGHT_CM / 2) ** 2,
      ) < MIN_ENEMY_SPAWN_DISTANCE_CM
    )
    const enemy = new Enemy(this.scene, cmToPx(x), cmToPx(y))
    this.enemies.push(enemy)
  }

  private cleanupAmoebaHistory(): void {
    const activeIds = new Set(this.amoebas.map((a) => a.amoebaId))
    for (const id of this.amoebaHistory.keys()) {
      if (!activeIds.has(id)) this.amoebaHistory.delete(id)
    }
    for (const id of this.amoebaLastAction.keys()) {
      if (!activeIds.has(id)) this.amoebaLastAction.delete(id)
    }
  }

  private updateStats(): void {
    const alive = this.amoebas.filter((a) => a.alive)
    gameStore.stats.amoebaCount = alive.length
    gameStore.stats.foodCount = this.foods.filter((f) => !f.depleted).length
    gameStore.stats.enemyCount = this.enemies.filter((e) => e.alive).length
    gameStore.stats.poisonCount = this.poisons.length

    gameStore.stats.amoebas = alive.map((a) => ({ id: a.amoebaId, energy: a.energy }))

    const selected = gameStore.selectedAmoebaId
    if (selected) {
      const sel = alive.find((a) => a.amoebaId === selected)
      gameStore.stats.selectedAmoebaEnergy = sel?.energy ?? 0
    } else if (alive.length > 0) {
      gameStore.stats.selectedAmoebaEnergy = alive[0].energy
    }
  }
}
