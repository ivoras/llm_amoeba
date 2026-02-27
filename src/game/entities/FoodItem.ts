import Phaser from 'phaser'
import {
  cmToPx,
  pxToCm,
  FOOD_HALO_MULTIPLIER,
  FOOD_POISON_DECAY_PER_CYCLE,
  DECAY_DEPLETION_THRESHOLD,
} from '../constants'
import type { FoodState, Position } from '@/types'
import { gameStore } from '@/stores/gameStore'

let nextFoodId = 0

export class FoodItem extends Phaser.GameObjects.Graphics {
  public foodId: string
  public radiusCm: number
  public maxEnergy: number
  public remainingEnergy: number

  private radiusPx: number
  private haloPx: number

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    radiusCm: number,
    energy: number,
  ) {
    super(scene, { x, y })
    this.foodId = `food-${nextFoodId++}`
    this.radiusCm = radiusCm
    this.maxEnergy = energy
    this.remainingEnergy = energy
    this.radiusPx = cmToPx(radiusCm)
    this.haloPx = this.radiusPx * FOOD_HALO_MULTIPLIER

    scene.add.existing(this)
    this.setDepth(2)
    this.setInteractive(
      new Phaser.Geom.Circle(0, 0, this.haloPx),
      Phaser.Geom.Circle.Contains,
    )
    this.drawShape()
  }

  get positionCm(): Position {
    return { x: pxToCm(this.x), y: pxToCm(this.y) }
  }

  get energyRatio(): number {
    return Math.max(0, this.remainingEnergy / this.maxEnergy)
  }

  get effectiveRadiusCm(): number {
    return this.radiusCm * this.energyRatio
  }

  get effectiveHaloRadiusCm(): number {
    return this.effectiveRadiusCm * FOOD_HALO_MULTIPLIER
  }

  getState(): FoodState {
    return {
      id: this.foodId,
      position: this.positionCm,
      radius: this.radiusCm,
      maxEnergy: this.maxEnergy,
      remainingEnergy: this.remainingEnergy,
    }
  }

  getIntensityAtDistance(distanceCm: number): number {
    const r = this.effectiveRadiusCm
    if (r <= 0) return 0.0
    if (distanceCm <= r) return 1.0
    const haloR = r * FOOD_HALO_MULTIPLIER
    if (distanceCm > haloR) return 0.0
    return 1.0 - (distanceCm - r) / r
  }

  getEnergyAtDistance(distanceCm: number): number {
    return this.getIntensityAtDistance(distanceCm) * this.remainingEnergy
  }

  canFeedAt(distanceCm: number): boolean {
    return this.getEnergyAtDistance(distanceCm) >= 1
  }

  consumeEnergy(): number {
    if (this.remainingEnergy <= 0) return 0
    const consumed = Math.min(1, this.remainingEnergy)
    this.remainingEnergy -= consumed
    this.drawShape()
    return consumed
  }

  decay(): void {
    this.remainingEnergy -= FOOD_POISON_DECAY_PER_CYCLE
    this.drawShape()
  }

  drainEnergy(amount: number): void {
    this.remainingEnergy = Math.max(0, this.remainingEnergy - amount)
    this.drawShape()
  }

  get depleted(): boolean {
    return this.remainingEnergy < DECAY_DEPLETION_THRESHOLD
  }

  drawShape(): void {
    this.clear()

    const ratio = this.energyRatio
    const coreR = this.radiusPx * ratio
    const haloR = this.haloPx * ratio

    // halo gradient (concentric rings with decreasing alpha)
    const rings = 8
    for (let i = rings; i >= 1; i--) {
      const t = i / rings
      const ringR = coreR + (haloR - coreR) * t
      const alpha = 0.08 * (1 - t)
      this.fillStyle(0x44cc44, alpha)
      this.fillCircle(0, 0, Math.max(0, ringR))
    }

    // core
    this.fillStyle(0x44cc44, 0.5 * ratio + 0.2)
    this.fillCircle(0, 0, coreR)
    this.lineStyle(1, 0x228822, 0.6)
    this.strokeCircle(0, 0, coreR)

    // dashed halo outline (optional)
    if (haloR > 0 && gameStore.gameSettings.showDebugOverlays) {
      const dashCount = 32
      const gapFraction = 0.4
      const arcPerSegment = (Math.PI * 2) / dashCount
      const dashArc = arcPerSegment * (1 - gapFraction)
      this.lineStyle(1, 0x000000, 0.35)
      for (let i = 0; i < dashCount; i++) {
        const a = i * arcPerSegment
        this.beginPath()
        this.arc(0, 0, haloR, a, a + dashArc, false)
        this.strokePath()
      }
    }
  }

  remove(): void {
    this.scene?.tweens.add({
      targets: this,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.destroy()
      },
    })
  }
}
