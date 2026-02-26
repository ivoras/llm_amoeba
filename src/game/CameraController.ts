import Phaser from 'phaser'
import {
  WORLD_WIDTH_PX,
  WORLD_HEIGHT_PX,
  CAMERA_MIN_ZOOM,
  CAMERA_MAX_ZOOM,
  CAMERA_ZOOM_STEP,
} from './constants'

export class CameraController {
  private camera: Phaser.Cameras.Scene2D.Camera
  private scene: Phaser.Scene
  private followTarget: Phaser.GameObjects.GameObject | null = null
  private isDragging = false
  private dragStartX = 0
  private dragStartY = 0
  private camStartX = 0
  private camStartY = 0

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.camera = scene.cameras.main

    this.camera.setBounds(0, 0, WORLD_WIDTH_PX, WORLD_HEIGHT_PX)
    this.camera.setZoom(1)
    this.camera.centerOn(WORLD_WIDTH_PX / 2, WORLD_HEIGHT_PX / 2)

    this.setupInput()
  }

  private setupInput(): void {
    const canvas = this.scene.game.canvas
    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -CAMERA_ZOOM_STEP : CAMERA_ZOOM_STEP
      const newZoom = Phaser.Math.Clamp(
        this.camera.zoom + delta,
        CAMERA_MIN_ZOOM,
        CAMERA_MAX_ZOOM,
      )
      this.camera.setZoom(newZoom)
    }, { passive: false })

    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown() || pointer.middleButtonDown()) {
        this.isDragging = true
        this.dragStartX = pointer.x
        this.dragStartY = pointer.y
        this.camStartX = this.camera.scrollX
        this.camStartY = this.camera.scrollY
        if (this.followTarget) {
          this.camera.stopFollow()
          this.followTarget = null
        }
      }
    })

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        const dx = (this.dragStartX - pointer.x) / this.camera.zoom
        const dy = (this.dragStartY - pointer.y) / this.camera.zoom
        this.camera.scrollX = this.camStartX + dx
        this.camera.scrollY = this.camStartY + dy
      }
    })

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.rightButtonDown() && !pointer.middleButtonDown()) {
        this.isDragging = false
      }
    })
  }

  followEntity(target: Phaser.GameObjects.GameObject & { x: number; y: number }): void {
    this.followTarget = target
    this.camera.startFollow(target, true, 0.05, 0.05)
  }

  stopFollow(): void {
    this.camera.stopFollow()
    this.followTarget = null
  }

  centerOn(x: number, y: number): void {
    this.camera.centerOn(x, y)
  }

  get zoom(): number {
    return this.camera.zoom
  }

  setZoom(z: number): void {
    this.camera.setZoom(Phaser.Math.Clamp(z, CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM))
  }
}
