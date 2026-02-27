import Phaser from 'phaser'
import { AMOEBA_RADIUS_PX, cmToPx, pxToCm } from '../constants'
import type { Position } from '@/types'

let nextTombstoneId = 0

export function resetTombstoneIds(): void {
  nextTombstoneId = 0
}

export class Tombstone extends Phaser.GameObjects.Graphics {
  public tombstoneId: string

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, { x, y })
    this.tombstoneId = `tombstone-${nextTombstoneId++}`

    scene.add.existing(this)
    this.setDepth(5)
    this.setInteractive(
      new Phaser.Geom.Circle(0, 0, AMOEBA_RADIUS_PX * 0.9),
      Phaser.Geom.Circle.Contains,
    )
    this.drawShape()
  }

  get positionCm(): Position {
    return { x: pxToCm(this.x), y: pxToCm(this.y) }
  }

  private drawShape(): void {
    this.clear()
    // Simple tombstone shape: gray rounded rectangle (40% smaller)
    const w = AMOEBA_RADIUS_PX * 0.72
    const h = AMOEBA_RADIUS_PX * 1.2
    this.fillStyle(0x555555, 0.8)
    this.lineStyle(1, 0x333333, 0.6)
    this.fillRoundedRect(-w / 2, -h / 2, w, h, 2)
    this.strokeRoundedRect(-w / 2, -h / 2, w, h, 2)
  }
}
