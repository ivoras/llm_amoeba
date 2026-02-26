import Phaser from 'phaser'
import { GameScene } from './scenes/GameScene'
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from './constants'

let gameInstance: Phaser.Game | null = null
let sceneRef: GameScene | null = null

export function registerScene(scene: GameScene): void {
  sceneRef = scene
}

export function createGame(parentEl: HTMLElement): Phaser.Game {
  if (gameInstance) {
    gameInstance.destroy(true)
    gameInstance = null
    sceneRef = null
  }

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
    parent: parentEl,
    backgroundColor: '#0a0e1a',
    scene: [GameScene],
    scale: {
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      mouse: {
        preventDefaultWheel: false,
      },
    },
    render: {
      antialias: true,
      pixelArt: false,
    },
  }

  gameInstance = new Phaser.Game(config)
  return gameInstance
}

export function getGameScene(): GameScene | null {
  return sceneRef
}

export function destroyGame(): void {
  if (gameInstance) {
    gameInstance.destroy(true)
    gameInstance = null
    sceneRef = null
  }
}
