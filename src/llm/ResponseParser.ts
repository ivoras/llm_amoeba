import type { AmoebaAction } from '@/types'
import { MIN_MOVE_BODY_LENGTHS, MAX_MOVE_BODY_LENGTHS } from '@/game/constants'

const DIRECTION_MAP: Record<string, number> = {
  'right':      0,
  'up-right':   1,
  'up':         2,
  'up-left':    3,
  'left':       4,
  'down-left':  5,
  'down':       6,
  'down-right': 7,
}

export class ResponseParser {
  parse(raw: string): AmoebaAction {
    const jsonStr = this.extractJson(raw)
    if (!jsonStr) {
      throw new Error('LLM response contained no valid JSON. Expected a single JSON object with action, direction (for move), and distance (for move).')
    }

    let obj: unknown
    try {
      obj = JSON.parse(jsonStr)
    } catch {
      throw new Error('LLM response could not be parsed as JSON.')
    }

    const result = this.validate(obj)
    if (result.action === 'idle') {
      throw new Error('LLM response had invalid or missing action. Expected move, feed, or divide with valid parameters.')
    }
    return result
  }

  private extractJson(text: string): string | null {
    const braceMatch = text.match(/\{[^}]*\}/)
    return braceMatch ? braceMatch[0] : null
  }

  private validate(obj: unknown): AmoebaAction {
    if (!obj || typeof obj !== 'object') return { action: 'idle' }

    const data = obj as Record<string, unknown>

    switch (data.action) {
      case 'move': {
        const directionIndex = DIRECTION_MAP[String(data.direction ?? '').toLowerCase()]
        const distance = Number(data.distance)
        if (
          directionIndex !== undefined &&
          Number.isFinite(distance) &&
          distance >= MIN_MOVE_BODY_LENGTHS &&
          distance <= MAX_MOVE_BODY_LENGTHS
        ) {
          return {
            action: 'move',
            direction: directionIndex,
            distance: Math.max(MIN_MOVE_BODY_LENGTHS, Math.min(distance, MAX_MOVE_BODY_LENGTHS)),
          }
        }
        return { action: 'idle' }
      }
      case 'feed':
        return { action: 'feed' }
      case 'divide':
        return { action: 'divide' }
      default:
        return { action: 'idle' }
    }
  }
}
