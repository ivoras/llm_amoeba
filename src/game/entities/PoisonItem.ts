import Phaser from 'phaser'
import {
  cmToPx,
  pxToCm,
  FOOD_HALO_MULTIPLIER,
  FOOD_POISON_DECAY_PER_CYCLE,
  DECAY_DEPLETION_THRESHOLD,
} from '../constants'
import type { Position } from '@/types'

let nextPoisonId = 0

export class PoisonItem extends Phaser.GameObjects.Graphics {
  public poisonId: string
  public radiusCm: number
  public remainingEnergy: number

  private radiusPx: number
  private haloPx: number
  private wobbleTime: number = 0

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    radiusCm: number,
    energy: number,
  ) {
    super(scene, { x, y })
    this.poisonId = `poison-${nextPoisonId++}`
    this.radiusCm = radiusCm
    this.remainingEnergy = energy
    this.radiusPx = cmToPx(radiusCm)
    this.haloPx = this.radiusPx * FOOD_HALO_MULTIPLIER

    scene.add.existing(this)
    this.setDepth(1)
    this.drawShape()
  }

  decay(): void {
    this.remainingEnergy -= FOOD_POISON_DECAY_PER_CYCLE
    this.drawShape()
  }

  get depleted(): boolean {
    return this.remainingEnergy < DECAY_DEPLETION_THRESHOLD
  }

  get positionCm(): Position {
    return { x: pxToCm(this.x), y: pxToCm(this.y) }
  }

  getIntensityAtDistance(distanceCm: number): number {
    const r = this.radiusCm
    if (distanceCm <= r) return 1.0
    const haloR = r * FOOD_HALO_MULTIPLIER
    if (distanceCm > haloR) return 0.0
    return 1.0 - (distanceCm - r) / r
  }

  isInRange(distanceCm: number): boolean {
    return this.getIntensityAtDistance(distanceCm) > 0
  }

  update(_time: number, delta: number): void {
    this.wobbleTime += delta * 0.002
    this.drawShape()
  }

  private drawShape(): void {
    this.clear()

    const pulseAlpha = 0.03 * Math.sin(this.wobbleTime) + 0.07

    const rings = 8
    for (let i = rings; i >= 1; i--) {
      const t = i / rings
      const ringR = this.radiusPx + (this.haloPx - this.radiusPx) * t
      const alpha = pulseAlpha * (1 - t)
      this.fillStyle(0xaa22cc, alpha)
      this.fillCircle(0, 0, ringR)
    }

    this.fillStyle(0xaa22cc, 0.45)
    this.fillCircle(0, 0, this.radiusPx)
    this.lineStyle(1, 0x771199, 0.6)
    this.strokeCircle(0, 0, this.radiusPx)

    // dashed halo outline
    const dashCount = 32
    const gapFraction = 0.4
    const arcPerSegment = (Math.PI * 2) / dashCount
    const dashArc = arcPerSegment * (1 - gapFraction)
    this.lineStyle(1, 0x000000, 0.35)
    for (let i = 0; i < dashCount; i++) {
      const a = i * arcPerSegment
      this.beginPath()
      this.arc(0, 0, this.haloPx, a, a + dashArc, false)
      this.strokePath()
    }
  }

  remove(): void {
    this.destroy()
  }
}
