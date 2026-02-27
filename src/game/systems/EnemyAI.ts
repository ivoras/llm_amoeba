import {
  ENEMY_DRAIN_PER_CYCLE,
  ENEMY_DRAIN_RADIUS_MULTIPLIER,
  AMOEBA_RADIUS_CM,
  POISON_DRAIN_PER_CYCLE,
} from '../constants'
import type { Amoeba } from '../entities/Amoeba'
import type { Enemy } from '../entities/Enemy'
import type { PoisonItem } from '../entities/PoisonItem'
import { VisionSystem } from './VisionSystem'

export class EnemyAI {
  private vision = new VisionSystem()

  update(
    enemies: Enemy[],
    amoebas: Amoeba[],
    poisons: PoisonItem[],
  ): void {
    for (const enemy of enemies) {
      if (!enemy.alive || enemy.isMoving) continue

      const { nearestAmoeba, inPoison } = this.vision.getEnemySurroundings(
        enemy,
        amoebas,
        poisons,
      )

      if (inPoison) {
        enemy.takeDamage(POISON_DRAIN_PER_CYCLE)
      }

      if (!enemy.alive) continue

      if (nearestAmoeba) {
        enemy.moveToward(nearestAmoeba.x, nearestAmoeba.y)
      } else {
        enemy.wander()
      }

      enemy.feeding = this.applyDrainToNearbyAmoebas(enemy, amoebas)
    }
  }

  private applyDrainToNearbyAmoebas(enemy: Enemy, amoebas: Amoeba[]): boolean {
    const drainRadiusCm = AMOEBA_RADIUS_CM * ENEMY_DRAIN_RADIUS_MULTIPLIER
    const ePos = enemy.positionCm
    let draining = false

    for (const amoeba of amoebas) {
      if (!amoeba.alive) continue
      const aPos = amoeba.positionCm
      const dx = aPos.x - ePos.x
      const dy = aPos.y - ePos.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= drainRadiusCm) {
        amoeba.takeDamage(ENEMY_DRAIN_PER_CYCLE)
        draining = true
      }
    }
    return draining
  }
}
