import Phaser from 'phaser'
import {
  WORLD_WIDTH_PX,
  WORLD_HEIGHT_PX,
  WORLD_WIDTH_CM,
  WORLD_HEIGHT_CM,
  cmToPx,
  INITIAL_FOOD_COUNT,
  INITIAL_POISON_COUNT,
  INITIAL_ENEMY_COUNT,
  MIN_FOOD_RADIUS_CM,
  MAX_FOOD_RADIUS_CM,
  FOOD_MIN_ENERGY,
  FOOD_MAX_ENERGY,
  MIN_POISON_RADIUS_CM,
  MAX_POISON_RADIUS_CM,
  POISON_MIN_ENERGY,
  POISON_MAX_ENERGY,
  MIN_ENEMY_SPAWN_DISTANCE_CM,
  PIXELS_PER_CM,
} from '../constants'
import { Amoeba } from '../entities/Amoeba'
import { Enemy } from '../entities/Enemy'
import { FoodItem } from '../entities/FoodItem'
import { PoisonItem } from '../entities/PoisonItem'
import { Tombstone } from '../entities/Tombstone'
import { CycleManager } from '../systems/CycleManager'
import { CameraController } from '../CameraController'
import { registerScene } from '../PhaserGame'
import { gameStore } from '@/stores/gameStore'
import { rng, seedRng } from '../rng'

export class GameScene extends Phaser.Scene {
  public amoebas: Amoeba[] = []
  public enemies: Enemy[] = []
  public foods: FoodItem[] = []
  public poisons: PoisonItem[] = []
  public tombstones: Tombstone[] = []

  public cycleManager!: CycleManager
  public cameraController!: CameraController

  constructor() {
    super({ key: 'GameScene' })
  }

  create(): void {
    this.drawBackground()
    this.spawnInitialEntities()

    this.cycleManager = new CycleManager(
      this,
      this.amoebas,
      this.enemies,
      this.foods,
      this.poisons,
      this.tombstones,
    )

    this.cameraController = new CameraController(this)

    if (this.amoebas.length > 0) {
      this.cameraController.followEntity(this.amoebas[0])
      gameStore.selectedAmoebaId = this.amoebas[0].amoebaId
    }

    this.input.on('gameobjectdown', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (obj instanceof Amoeba && obj.alive) {
        gameStore.selectedAmoebaId = obj.amoebaId
        this.cameraController.followEntity(obj)
      }
    })

    this.input.on('gameobjectover', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      const text = this.getTooltipText(obj)
      if (text) {
        gameStore.tooltip.text = text
        gameStore.tooltip.visible = true
      }
    })

    this.input.on('gameobjectout', () => {
      gameStore.tooltip.visible = false
    })

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const ev = pointer.event as MouseEvent
      gameStore.tooltip.x = ev.clientX
      gameStore.tooltip.y = ev.clientY
    })

    this.updateStats()
    registerScene(this)
  }

  private getTooltipText(obj: Phaser.GameObjects.GameObject): string | null {
    if (obj instanceof Amoeba && obj.alive) {
      return `${obj.amoebaId}\nEnergy: ${obj.energy.toFixed(1)}`
    }
    if (obj instanceof Enemy && obj.alive) {
      return `${obj.enemyId}\nEnergy: ${obj.energy.toFixed(1)}`
    }
    if (obj instanceof FoodItem && !obj.depleted) {
      return `${obj.foodId}\nEnergy: ${obj.remainingEnergy.toFixed(1)} / ${obj.maxEnergy}`
    }
    if (obj instanceof PoisonItem && !obj.depleted) {
      return `${obj.poisonId}\nEnergy: ${obj.remainingEnergy.toFixed(1)}`
    }
    if (obj instanceof Tombstone) {
      return `${obj.tombstoneId}\n(avoid — stay 2+ body-lengths away)`
    }
    return null
  }

  update(time: number, delta: number): void {
    for (const amoeba of this.amoebas) {
      if (amoeba.alive) amoeba.update(time, delta)
    }
    for (const enemy of this.enemies) {
      if (enemy.alive) enemy.update(time, delta)
    }
    for (const poison of this.poisons) {
      poison.update(time, delta)
    }
  }

  startGame(): void {
    this.cycleManager.start()
    gameStore.stats.running = true
  }

  pauseGame(): void {
    this.cycleManager.stop()
    gameStore.stats.running = false
  }

  resetGame(): void {
    this.cycleManager.stop()
    this.cycleManager.clearHistory()
    gameStore.stats.running = false
    gameStore.stats.cycleCount = 0
    gameStore.stats.promptTokens = 0
    gameStore.stats.generatedTokens = 0
    gameStore.clearLog()

    for (const a of this.amoebas) a.destroy()
    for (const e of this.enemies) e.destroy()
    for (const f of this.foods) f.destroy()
    for (const p of this.poisons) p.destroy()
    for (const t of this.tombstones) t.destroy()

    this.amoebas.length = 0
    this.enemies.length = 0
    this.foods.length = 0
    this.poisons.length = 0
    this.tombstones.length = 0

    this.spawnInitialEntities()

    if (this.amoebas.length > 0) {
      this.cameraController.followEntity(this.amoebas[0])
      gameStore.selectedAmoebaId = this.amoebas[0].amoebaId
    }

    this.updateStats()
  }

  private drawBackground(): void {
    const bg = this.add.graphics()
    bg.setDepth(0)

    bg.fillStyle(0x0a0e1a, 1)
    bg.fillRect(0, 0, WORLD_WIDTH_PX, WORLD_HEIGHT_PX)

    // subtle grid to convey scale
    bg.lineStyle(0.5, 0x1a2040, 0.3)
    const gridSpacingPx = PIXELS_PER_CM * 0.1 // grid every 0.1 cm
    for (let x = 0; x <= WORLD_WIDTH_PX; x += gridSpacingPx) {
      bg.lineBetween(x, 0, x, WORLD_HEIGHT_PX)
    }
    for (let y = 0; y <= WORLD_HEIGHT_PX; y += gridSpacingPx) {
      bg.lineBetween(0, y, WORLD_WIDTH_PX, y)
    }

    // heavier grid every 1 cm
    bg.lineStyle(1, 0x1a2040, 0.5)
    for (let x = 0; x <= WORLD_WIDTH_PX; x += PIXELS_PER_CM) {
      bg.lineBetween(x, 0, x, WORLD_HEIGHT_PX)
    }
    for (let y = 0; y <= WORLD_HEIGHT_PX; y += PIXELS_PER_CM) {
      bg.lineBetween(0, y, WORLD_WIDTH_PX, y)
    }
  }

  private spawnInitialEntities(): void {
    seedRng(gameStore.gameSettings.randomSeed)

    const centerX = cmToPx(WORLD_WIDTH_CM / 2)
    const centerY = cmToPx(WORLD_HEIGHT_CM / 2)
    const amoeba = new Amoeba(this, centerX, centerY)
    this.amoebas.push(amoeba)

    for (let i = 0; i < INITIAL_FOOD_COUNT; i++) {
      const x = rng() * WORLD_WIDTH_CM
      const y = rng() * WORLD_HEIGHT_CM
      const radius =
        MIN_FOOD_RADIUS_CM + rng() * (MAX_FOOD_RADIUS_CM - MIN_FOOD_RADIUS_CM)
      const energy =
        FOOD_MIN_ENERGY + Math.floor(rng() * (FOOD_MAX_ENERGY - FOOD_MIN_ENERGY))
      const food = new FoodItem(this, cmToPx(x), cmToPx(y), radius, energy)
      this.foods.push(food)
    }

    for (let i = 0; i < INITIAL_POISON_COUNT; i++) {
      const x = rng() * WORLD_WIDTH_CM
      const y = rng() * WORLD_HEIGHT_CM
      const radius =
        MIN_POISON_RADIUS_CM + rng() * (MAX_POISON_RADIUS_CM - MIN_POISON_RADIUS_CM)
      const energy =
        POISON_MIN_ENERGY + Math.floor(rng() * (POISON_MAX_ENERGY - POISON_MIN_ENERGY))
      const poison = new PoisonItem(this, cmToPx(x), cmToPx(y), radius, energy)
      this.poisons.push(poison)
    }

    for (let i = 0; i < INITIAL_ENEMY_COUNT; i++) {
      let x: number, y: number
      do {
        x = rng() * WORLD_WIDTH_CM
        y = rng() * WORLD_HEIGHT_CM
      } while (
        Math.sqrt(
          (x - WORLD_WIDTH_CM / 2) ** 2 + (y - WORLD_HEIGHT_CM / 2) ** 2,
        ) < MIN_ENEMY_SPAWN_DISTANCE_CM
      )
      const enemy = new Enemy(this, cmToPx(x), cmToPx(y))
      this.enemies.push(enemy)
    }
  }

  private updateStats(): void {
    const alive = this.amoebas.filter((a) => a.alive)
    gameStore.stats.amoebaCount = alive.length
    gameStore.stats.foodCount = this.foods.filter((f) => !f.depleted).length
    gameStore.stats.enemyCount = this.enemies.filter((e) => e.alive).length
    gameStore.stats.poisonCount = this.poisons.length
    gameStore.stats.amoebas = alive.map((a) => ({ id: a.amoebaId, energy: a.energy }))

    if (alive.length > 0) {
      gameStore.stats.selectedAmoebaEnergy = alive[0].energy
    }
  }
}
