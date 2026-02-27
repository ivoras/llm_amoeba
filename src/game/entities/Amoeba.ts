import Phaser from 'phaser'
import {
  AMOEBA_RADIUS_PX,
  AMOEBA_VISION_PX,
  WOBBLE_SEGMENTS,
  WOBBLE_AMPLITUDE,
  WOBBLE_SPEED,
  MAX_ENERGY,
  MIN_ENERGY,
  AMOEBA_DEATH_ENERGY_THRESHOLD,
  STARTING_ENERGY,
  cmToPx,
  pxToCm,
  WORLD_WIDTH_CM,
  WORLD_HEIGHT_CM,
  MOVE_ENERGY_COST_PER_BODY_LENGTH,
  DIVISION_ENERGY_THRESHOLD,
  MOVE_TWEEN_DURATION_MS,
  DIRECTIONS,
} from '../constants'
import type { AmoebaState, Position, AmoebaAction } from '@/types'
import { gameStore } from '@/stores/gameStore'

let nextId = 0

export function resetAmoebaIds(): void {
  nextId = 0
}

const PASTEL_YELLOW = 0xfff8c8  // RGB(255, 248, 200)

export class Amoeba extends Phaser.GameObjects.Graphics {
  public amoebaId: string
  public energy: number
  public alive: boolean = true
  public feeding: boolean = false

  private wobbleTime: number = 0
  private wobbleOffsets: number[]
  private isAnimating: boolean = false

  constructor(scene: Phaser.Scene, x: number, y: number, energy?: number) {
    super(scene, { x, y })
    this.amoebaId = `amoeba-${nextId++}`
    this.energy = energy ?? STARTING_ENERGY

    this.wobbleOffsets = Array.from(
      { length: WOBBLE_SEGMENTS },
      () => Math.random() * Math.PI * 2,
    )

    scene.add.existing(this)
    this.setDepth(10)
    this.setInteractive(
      new Phaser.Geom.Circle(0, 0, AMOEBA_RADIUS_PX * 1.2),
      Phaser.Geom.Circle.Contains,
    )
    this.drawShape()
  }

  get positionCm(): Position {
    return { x: pxToCm(this.x), y: pxToCm(this.y) }
  }

  getState(): AmoebaState {
    return {
      id: this.amoebaId,
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

    let color: number
    if (this.feeding) {
      const energyRatio = this.energy / MAX_ENERGY
      const green = Math.floor(150 + 105 * energyRatio)
      const t = 0.5 + 0.5 * Math.sin(this.wobbleTime * (4 / 3))
      const r = Math.round(30 + (255 - 30) * t)
      const g = Math.round(green + (255 - green) * t)
      const b = Math.round(60 + (0 - 60) * t)
      color = Phaser.Display.Color.GetColor(r, g, b)
    } else {
      color = PASTEL_YELLOW
    }

    this.fillStyle(color, 0.5)
    this.lineStyle(1.5, 0x1a6b1a, 0.5)

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

    // nucleus
    this.fillStyle(0x0a3a0a, 0.35)
    this.fillCircle(0, 0, AMOEBA_RADIUS_PX * 0.3)

    // vision radius — dashed circle (optional)
    if (gameStore.gameSettings.showDebugOverlays) {
      const dashCount = 36
      const gapFraction = 0.4
      const arcPerSegment = (Math.PI * 2) / dashCount
      const dashArc = arcPerSegment * (1 - gapFraction)
      this.lineStyle(1, 0x333333, 0.45)
      for (let i = 0; i < dashCount; i++) {
        const startAngle = i * arcPerSegment
        this.beginPath()
        this.arc(0, 0, AMOEBA_VISION_PX, startAngle, startAngle + dashArc, false)
        this.strokePath()
      }
    }
  }

  applyAction(action: AmoebaAction, onComplete?: () => void): void {
    if (!this.alive) {
      onComplete?.()
      return
    }

    switch (action.action) {
      case 'move':
        this.moveInDirection(action.direction, action.distance, onComplete)
        break
      case 'feed':
        this.feeding = true
        this.scene.time.delayedCall(MOVE_TWEEN_DURATION_MS, () => {
          this.feeding = false
        })
        onComplete?.()
        break
      case 'divide':
        onComplete?.()
        break
      case 'idle':
        onComplete?.()
        break
    }
  }

  private moveInDirection(direction: number, bodyLengths: number, onComplete?: () => void): void {
    const dir = DIRECTIONS[direction] ?? DIRECTIONS[0]
    const angleRad = Phaser.Math.DegToRad(dir.angle)
    const distPx = bodyLengths * AMOEBA_RADIUS_PX * 2

    let newX = this.x + Math.cos(angleRad) * distPx
    let newY = this.y - Math.sin(angleRad) * distPx // y-axis inverted in screen coords

    newX = Phaser.Math.Clamp(newX, 0, cmToPx(WORLD_WIDTH_CM))
    newY = Phaser.Math.Clamp(newY, 0, cmToPx(WORLD_HEIGHT_CM))

    const actualDistPx = Phaser.Math.Distance.Between(this.x, this.y, newX, newY)
    const actualBodyLengths = actualDistPx / (AMOEBA_RADIUS_PX * 2)
    this.energy -= actualBodyLengths * MOVE_ENERGY_COST_PER_BODY_LENGTH
    this.energy = Math.max(MIN_ENERGY, this.energy)
    this.checkDeath()
    if (!this.alive) {
      onComplete?.()
      return
    }

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

  canDivide(): boolean {
    return this.energy >= DIVISION_ENERGY_THRESHOLD
  }

  divide(): Amoeba | null {
    if (!this.canDivide()) return null

    const childEnergy = this.energy / 2
    this.energy = childEnergy

    const offsetPx = AMOEBA_RADIUS_PX * 3
    const angle = Math.random() * Math.PI * 2
    const childX = Phaser.Math.Clamp(
      this.x + Math.cos(angle) * offsetPx,
      0,
      cmToPx(WORLD_WIDTH_CM),
    )
    const childY = Phaser.Math.Clamp(
      this.y + Math.sin(angle) * offsetPx,
      0,
      cmToPx(WORLD_HEIGHT_CM),
    )

    const child = new Amoeba(this.scene, childX, childY, childEnergy)
    return child
  }

  takeDamage(amount: number): void {
    this.energy -= amount
    this.checkDeath()
  }

  private checkDeath(): void {
    if (this.energy < AMOEBA_DEATH_ENERGY_THRESHOLD) {
      this.energy = 0
      this.die()
    }
  }

  addEnergy(amount: number): void {
    this.energy = Math.min(MAX_ENERGY, this.energy + amount)
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
