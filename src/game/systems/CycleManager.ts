import {
  POISON_DRAIN_PER_CYCLE,
  FEEDING_GAIN_PER_CYCLE,
  FOOD_HALO_MULTIPLIER,
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
  cmToPx,
  FOOD_RESPAWN_INTERVAL_CYCLES,
  POISON_RESPAWN_INTERVAL_CYCLES,
  INITIAL_FOOD_COUNT,
  INITIAL_POISON_COUNT,
  DIVISION_ENERGY_THRESHOLD,
} from '../constants'
import { LLMClient } from '@/llm/LLMClient'
import { PromptBuilder } from '@/llm/PromptBuilder'
import { ResponseParser } from '@/llm/ResponseParser'
import { VisionSystem } from './VisionSystem'
import { EnemyAI } from './EnemyAI'
import type { Amoeba } from '../entities/Amoeba'
import type { Enemy } from '../entities/Enemy'
import { FoodItem } from '../entities/FoodItem'
import { PoisonItem } from '../entities/PoisonItem'
import type { LLMSettings, LLMMessage, AmoebaAction } from '@/types'
import { gameStore } from '@/stores/gameStore'

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

  private cycling = false
  private cycleTimer: number | null = null

  constructor(
    scene: Phaser.Scene,
    amoebas: Amoeba[],
    enemies: Enemy[],
    foods: FoodItem[],
    poisons: PoisonItem[],
  ) {
    this.scene = scene
    this.amoebas = amoebas
    this.enemies = enemies
    this.foods = foods
    this.poisons = poisons
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

  get isRunning(): boolean {
    return this.cycling
  }

  private scheduleNextCycle(): void {
    if (!this.cycling) return
    const interval = gameStore.gameSettings.cycleIntervalMs
    this.cycleTimer = window.setTimeout(() => {
      this.runCycle()
    }, interval)
  }

  private async runCycle(): Promise<void> {
    if (!this.cycling) return

    gameStore.stats.cycleCount++

    const settings: LLMSettings = { ...gameStore.llmSettings }

    const readyAmoebas = this.amoebas.filter((a) => a.alive && !a.isMoving)

    const actionPromises = readyAmoebas
      .map((amoeba) => this.getAmoebaAction(amoeba, settings))

    const actions = await Promise.allSettled(actionPromises)

    for (let i = 0; i < readyAmoebas.length; i++) {
      const result = actions[i]
      const amoeba = readyAmoebas[i]
      if (!amoeba.alive) continue

      let action: AmoebaAction = { action: 'idle' }
      if (result?.status === 'fulfilled') {
        action = result.value
      }

      this.executeAction(amoeba, action)
    }

    this.enemyAI.update(this.enemies, this.amoebas, this.poisons)
    this.applyPassiveEffects()
    this.applyDecay()
    this.removeDeadEntities()
    this.respawnItems()
    this.updateStats()

    this.scheduleNextCycle()
  }

  private static readonly MAX_RETRIES = 3

  private async getAmoebaAction(
    amoeba: Amoeba,
    settings: LLMSettings,
  ): Promise<AmoebaAction> {
    try {
      const surroundings = this.vision.getSurroundings(
        amoeba,
        this.amoebas,
        this.enemies,
        this.foods,
        this.poisons,
      )

      const messages: LLMMessage[] = this.promptBuilder.buildMessages(
        settings.systemPrompt,
        amoeba.getState(),
        surroundings,
      )

      for (let attempt = 0; attempt <= CycleManager.MAX_RETRIES; attempt++) {
        const rawResponse = await this.llmClient.chat(settings, messages)
        const action = this.responseParser.parse(rawResponse)

        const rejection = this.validateAction(amoeba, action)
        if (!rejection) {
          const details = this.formatActionDetails(action)
          gameStore.addLogEntry({
            cycle: gameStore.stats.cycleCount,
            amoebaId: amoeba.amoebaId,
            action: action.action,
            details: attempt > 0 ? `${details ?? ''} (retry ${attempt})`.trim() : details,
            promptMessages: [...messages],
            rawResponse,
          })
          return action
        }

        // Log the rejected attempt
        gameStore.addLogEntry({
          cycle: gameStore.stats.cycleCount,
          amoebaId: amoeba.amoebaId,
          action: 'rejected',
          details: `${action.action}: ${rejection}`,
          promptMessages: [...messages],
          rawResponse,
        })

        if (attempt < CycleManager.MAX_RETRIES) {
          messages.push({ role: 'assistant', content: rawResponse })
          messages.push({ role: 'user', content: rejection })
        }
      }

      gameStore.addLogEntry({
        cycle: gameStore.stats.cycleCount,
        amoebaId: amoeba.amoebaId,
        action: 'idle',
        details: `gave up after ${CycleManager.MAX_RETRIES} retries`,
        promptMessages: [...messages],
      })
      return { action: 'idle' }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`LLM call failed for ${amoeba.amoebaId}:`, err)
      gameStore.addLogEntry({
        cycle: gameStore.stats.cycleCount,
        amoebaId: amoeba.amoebaId,
        action: 'error',
        details: message,
      })
      window.alert(`LLM Error: ${message}`)
      return { action: 'idle' }
    }
  }

  private validateAction(amoeba: Amoeba, action: AmoebaAction): string | null {
    if (action.action === 'feed') {
      const pos = amoeba.positionCm
      const canFeed = this.foods.some((food) => {
        if (food.depleted) return false
        const dx = pos.x - food.positionCm.x
        const dy = pos.y - food.positionCm.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const maxRange = food.radiusCm * FOOD_HALO_MULTIPLIER
        return dist <= maxRange && food.getEnergyAtDistance(dist) >= 1
      })
      if (!canFeed) {
        return 'You cannot feed here — your center is not within any food halo. You must move closer to a food source first. Choose a different action.'
      }
    }

    if (action.action === 'divide') {
      if (amoeba.energy < DIVISION_ENERGY_THRESHOLD) {
        return `You cannot divide — your energy is ${amoeba.energy.toFixed(1)} but you need at least ${DIVISION_ENERGY_THRESHOLD}. Choose a different action.`
      }
    }

    return null
  }

  private formatActionDetails(action: AmoebaAction): string | undefined {
    switch (action.action) {
      case 'move':
        return `dir ${action.direction}, dist ${action.distance}`
      case 'feed':
      case 'divide':
      case 'idle':
        return undefined
    }
  }

  private executeAction(amoeba: Amoeba, action: AmoebaAction): void {
    switch (action.action) {
      case 'move':
        amoeba.applyAction(action)
        break

      case 'feed':
        this.handleFeeding(amoeba)
        break

      case 'divide':
        this.handleDivision(amoeba)
        break

      case 'idle':
        break
    }
  }

  private handleFeeding(amoeba: Amoeba): void {
    const pos = amoeba.positionCm
    let bestFood: FoodItem | null = null
    let bestEnergy = 0

    for (const food of this.foods) {
      if (food.depleted) continue
      const dx = pos.x - food.positionCm.x
      const dy = pos.y - food.positionCm.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const maxRange = food.radiusCm * FOOD_HALO_MULTIPLIER
      if (dist <= maxRange) {
        const energyHere = food.getEnergyAtDistance(dist)
        if (energyHere >= 1 && energyHere > bestEnergy) {
          bestEnergy = energyHere
          bestFood = food
        }
      }
    }

    if (bestFood) {
      const consumed = bestFood.consumeEnergy()
      amoeba.addEnergy(consumed * FEEDING_GAIN_PER_CYCLE)
    }
  }

  private handleDivision(amoeba: Amoeba): void {
    if (!amoeba.canDivide()) return
    const child = amoeba.divide()
    if (child) {
      this.amoebas.push(child)
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
      if (!this.amoebas[i].alive) {
        this.amoebas.splice(i, 1)
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
    const cycle = gameStore.stats.cycleCount

    if (cycle % FOOD_RESPAWN_INTERVAL_CYCLES === 0 && this.foods.length < INITIAL_FOOD_COUNT) {
      this.spawnRandomFood()
    }

    if (cycle % POISON_RESPAWN_INTERVAL_CYCLES === 0 && this.poisons.length < INITIAL_POISON_COUNT) {
      this.spawnRandomPoison()
    }
  }

  private spawnRandomFood(): void {
    const x = Math.random() * WORLD_WIDTH_CM
    const y = Math.random() * WORLD_HEIGHT_CM
    const radius = MIN_FOOD_RADIUS_CM + Math.random() * (MAX_FOOD_RADIUS_CM - MIN_FOOD_RADIUS_CM)
    const energy = FOOD_MIN_ENERGY + Math.floor(Math.random() * (FOOD_MAX_ENERGY - FOOD_MIN_ENERGY))

    const food = new FoodItem(this.scene, cmToPx(x), cmToPx(y), radius, energy)
    this.foods.push(food)
  }

  private spawnRandomPoison(): void {
    const x = Math.random() * WORLD_WIDTH_CM
    const y = Math.random() * WORLD_HEIGHT_CM
    const radius = MIN_POISON_RADIUS_CM + Math.random() * (MAX_POISON_RADIUS_CM - MIN_POISON_RADIUS_CM)
    const energy = POISON_MIN_ENERGY + Math.floor(Math.random() * (POISON_MAX_ENERGY - POISON_MIN_ENERGY))

    const poison = new PoisonItem(this.scene, cmToPx(x), cmToPx(y), radius, energy)
    this.poisons.push(poison)
  }

  private updateStats(): void {
    gameStore.stats.amoebaCount = this.amoebas.filter((a) => a.alive).length
    gameStore.stats.foodCount = this.foods.filter((f) => !f.depleted).length
    gameStore.stats.enemyCount = this.enemies.filter((e) => e.alive).length
    gameStore.stats.poisonCount = this.poisons.length

    const selected = gameStore.selectedAmoebaId
    if (selected) {
      const sel = this.amoebas.find((a) => a.amoebaId === selected && a.alive)
      gameStore.stats.selectedAmoebaEnergy = sel?.energy ?? 0
    } else if (this.amoebas.length > 0) {
      gameStore.stats.selectedAmoebaEnergy = this.amoebas[0]?.energy ?? 0
    }
  }
}
