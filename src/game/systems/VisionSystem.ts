import type { NearbyObject, Position } from '@/types'
import { AMOEBA_VISION_CM, ENEMY_VISION_CM, FOOD_HALO_MULTIPLIER } from '../constants'
import type { Amoeba } from '../entities/Amoeba'
import type { Enemy } from '../entities/Enemy'
import type { FoodItem } from '../entities/FoodItem'
import type { PoisonItem } from '../entities/PoisonItem'

function distanceCm(a: Position, b: Position): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

export class VisionSystem {
  getSurroundings(
    viewer: Amoeba,
    amoebas: Amoeba[],
    enemies: Enemy[],
    foods: FoodItem[],
    poisons: PoisonItem[],
    visionRadius: number = AMOEBA_VISION_CM,
  ): NearbyObject[] {
    const pos = viewer.positionCm
    const result: NearbyObject[] = []

    for (const food of foods) {
      if (food.depleted) continue
      const fPos = food.positionCm
      const dist = distanceCm(pos, fPos)
      const reachCm = food.radiusCm * FOOD_HALO_MULTIPLIER
      if (dist <= visionRadius + reachCm) {
        result.push({
          type: 'food',
          relativePosition: { x: fPos.x - pos.x, y: fPos.y - pos.y },
          distance: dist,
          details: {
            radius: food.radiusCm,
            energy: food.remainingEnergy,
            energyAtPosition: food.getEnergyAtDistance(dist),
          },
        })
      }
    }

    for (const poison of poisons) {
      if (poison.depleted) continue
      const pPos = poison.positionCm
      const dist = distanceCm(pos, pPos)
      const reachCm = poison.radiusCm * FOOD_HALO_MULTIPLIER
      if (dist <= visionRadius + reachCm) {
        result.push({
          type: 'poison',
          relativePosition: { x: pPos.x - pos.x, y: pPos.y - pos.y },
          distance: dist,
          details: {
            radius: poison.radiusCm,
          },
        })
      }
    }

    for (const enemy of enemies) {
      if (!enemy.alive) continue
      const ePos = enemy.positionCm
      const dist = distanceCm(pos, ePos)
      if (dist <= visionRadius) {
        result.push({
          type: 'enemy',
          relativePosition: { x: ePos.x - pos.x, y: ePos.y - pos.y },
          distance: dist,
        })
      }
    }

    for (const other of amoebas) {
      if (!other.alive || other.amoebaId === viewer.amoebaId) continue
      const oPos = other.positionCm
      const dist = distanceCm(pos, oPos)
      if (dist <= visionRadius) {
        result.push({
          type: 'amoeba',
          relativePosition: { x: oPos.x - pos.x, y: oPos.y - pos.y },
          distance: dist,
          details: {
            energy: other.energy,
          },
        })
      }
    }

    result.sort((a, b) => a.distance - b.distance)
    return result
  }

  getEnemySurroundings(
    enemy: Enemy,
    amoebas: Amoeba[],
    poisons: PoisonItem[],
  ): { nearestAmoeba: Amoeba | null; inPoison: boolean } {
    const pos = enemy.positionCm
    let nearestAmoeba: Amoeba | null = null
    let nearestDist = Infinity

    for (const amoeba of amoebas) {
      if (!amoeba.alive) continue
      const dist = distanceCm(pos, amoeba.positionCm)
      if (dist <= ENEMY_VISION_CM && dist < nearestDist) {
        nearestDist = dist
        nearestAmoeba = amoeba
      }
    }

    let inPoison = false
    for (const poison of poisons) {
      if (poison.depleted) continue
      const dist = distanceCm(pos, poison.positionCm)
      if (poison.isInRange(dist)) {
        inPoison = true
        break
      }
    }

    return { nearestAmoeba, inPoison }
  }
}
