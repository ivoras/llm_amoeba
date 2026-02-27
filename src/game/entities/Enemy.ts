import Phaser from 'phaser'
import {
  AMOEBA_RADIUS_PX,
  WOBBLE_SEGMENTS,
  WOBBLE_AMPLITUDE,
  WOBBLE_SPEED,
  MIN_ENERGY,
  STARTING_ENERGY,
  cmToPx,
  pxToCm,
  WORLD_WIDTH_CM,
  WORLD_HEIGHT_CM,
  MOVE_TWEEN_DURATION_MS,
  MOVE_ENERGY_COST_PER_BODY_LENGTH,
  MAX_MOVE_BODY_LENGTHS,
} from '../constants'
import type { EnemyState, Position } from '@/types'

let nextEnemyId = 0

export class Enemy extends Phaser.GameObjects.Graphics {
  public enemyId: string
  public energy: number
  public alive: boolean = true

  private wobbleTime: number = 0
  private wobbleOffsets: number[]
  private isAnimating: boolean = false

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, { x, y })
    this.enemyId = `enemy-${nextEnemyId++}`
    this.energy = STARTING_ENERGY

    this.wobbleOffsets = Array.from(
      { length: WOBBLE_SEGMENTS },
      () => Math.random() * Math.PI * 2,
    )

    scene.add.existing(this)
    this.setDepth(9)
    this.setInteractive(
      new Phaser.Geom.Circle(0, 0, AMOEBA_RADIUS_PX * 1.2),
      Phaser.Geom.Circle.Contains,
    )
    this.drawShape()
  }

  get positionCm(): Position {
    return { x: pxToCm(this.x), y: pxToCm(this.y) }
  }

  getState(): EnemyState {
    return {
      id: this.enemyId,
      position: this.positionCm,
      energy: this.energy,
      alive: this.alive,
    }
  }

  get isMoving(): boolean {
    return this.isAnimating
  }

  update(_time: number, delta: number): void {
    if (!this.alive) return
    this.wobbleTime += delta * WOBBLE_SPEED
    this.drawShape()
  }

  private drawShape(): void {
    this.clear()

    const color = 0xcc2222
    this.fillStyle(color, 0.75)
    this.lineStyle(1.5, 0x881111, 0.9)

    this.beginPath()
    for (let i = 0; i <= WOBBLE_SEGMENTS; i++) {
      const idx = i % WOBBLE_SEGMENTS
      const angle = (idx / WOBBLE_SEGMENTS) * Math.PI * 2
      const wobble = Math.sin(this.wobbleTime + this.wobbleOffsets[idx]) * WOBBLE_AMPLITUDE
      const r = AMOEBA_RADIUS_PX * (1 + wobble)
      const px = Math.cos(angle) * r
      const py = Math.sin(angle) * r
      if (i === 0) {
        this.moveTo(px, py)
      } else {
        this.lineTo(px, py)
      }
    }
    this.closePath()
    this.fillPath()
    this.strokePath()

    this.fillStyle(0x440000, 0.5)
    this.fillCircle(0, 0, AMOEBA_RADIUS_PX * 0.25)
  }

  moveToward(targetX: number, targetY: number, onComplete?: () => void): void {
    if (!this.alive || this.isAnimating) {
      onComplete?.()
      return
    }

    const dx = targetX - this.x
    const dy = targetY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 1) {
      onComplete?.()
      return
    }

    const maxDistPx = MAX_MOVE_BODY_LENGTHS * AMOEBA_RADIUS_PX * 2
    const moveDist = Math.min(dist, maxDistPx)
    const ratio = moveDist / dist

    let newX = this.x + dx * ratio
    let newY = this.y + dy * ratio
    newX = Phaser.Math.Clamp(newX, 0, cmToPx(WORLD_WIDTH_CM))
    newY = Phaser.Math.Clamp(newY, 0, cmToPx(WORLD_HEIGHT_CM))

    const actualDist = Phaser.Math.Distance.Between(this.x, this.y, newX, newY)
    const bodyLengths = actualDist / (AMOEBA_RADIUS_PX * 2)
    this.energy -= bodyLengths * MOVE_ENERGY_COST_PER_BODY_LENGTH
    this.energy = Math.max(MIN_ENERGY, this.energy)

    this.isAnimating = true
    this.scene.tweens.add({
      targets: this,
      x: newX,
      y: newY,
      duration: MOVE_TWEEN_DURATION_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.isAnimating = false
        onComplete?.()
      },
    })
  }

  wander(onComplete?: () => void): void {
    if (!this.alive || this.isAnimating) {
      onComplete?.()
      return
    }

    const angle = Math.random() * Math.PI * 2
    const bodyLengths = 1 + Math.random() * 2
    const distPx = bodyLengths * AMOEBA_RADIUS_PX * 2

    let newX = this.x + Math.cos(angle) * distPx
    let newY = this.y + Math.sin(angle) * distPx
    newX = Phaser.Math.Clamp(newX, 0, cmToPx(WORLD_WIDTH_CM))
    newY = Phaser.Math.Clamp(newY, 0, cmToPx(WORLD_HEIGHT_CM))

    const actualDist = Phaser.Math.Distance.Between(this.x, this.y, newX, newY)
    const bl = actualDist / (AMOEBA_RADIUS_PX * 2)
    this.energy -= bl * MOVE_ENERGY_COST_PER_BODY_LENGTH
    this.energy = Math.max(MIN_ENERGY, this.energy)

    this.isAnimating = true
    this.scene.tweens.add({
      targets: this,
      x: newX,
      y: newY,
      duration: MOVE_TWEEN_DURATION_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.isAnimating = false
        onComplete?.()
      },
    })
  }

  takeDamage(amount: number): void {
    this.energy -= amount
    if (this.energy <= MIN_ENERGY) {
      this.energy = MIN_ENERGY
      this.die()
    }
  }

  die(): void {
    this.alive = false
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      duration: 400,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.destroy()
      },
    })
  }
}
