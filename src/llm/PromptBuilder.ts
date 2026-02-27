import type { AmoebaState, NearbyObject, LLMMessage } from '@/types'
import { AMOEBA_DIAMETER_CM } from '@/game/constants'

function cmToBodyLengths(cm: number): number {
  return cm / AMOEBA_DIAMETER_CM
}

export class PromptBuilder {
  buildMessages(
    systemPrompt: string,
    amoeba: AmoebaState,
    surroundings: NearbyObject[],
  ): LLMMessage[] {
    const userContent = this.buildUserMessage(amoeba, surroundings)
    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ]
  }

  private buildUserMessage(
    amoeba: AmoebaState,
    surroundings: NearbyObject[],
  ): string {
    const lines: string[] = []

    const px = cmToBodyLengths(amoeba.position.x).toFixed(1)
    const py = cmToBodyLengths(amoeba.position.y).toFixed(1)
    lines.push(`Position: (${px}, ${py}) units`)
    lines.push(`Energy: ${amoeba.energy.toFixed(1)}`)
    lines.push('')

    if (surroundings.length === 0) {
      lines.push('Surroundings: Nothing detected nearby.')
    } else {
      lines.push(`Nearby objects (${surroundings.length}):`)
      for (const obj of surroundings) {
        const dx = cmToBodyLengths(obj.relativePosition.x).toFixed(1)
        const dy = cmToBodyLengths(obj.relativePosition.y).toFixed(1)
        const dist = cmToBodyLengths(obj.distance).toFixed(1)
        let detail = `- ${obj.type} at relative (${dx}, ${dy}), distance: ${dist} units`
        if (obj.details) {
          const extras = Object.entries(obj.details)
            .map(([k, v]) => `${k}: ${typeof v === 'number' ? (v as number).toFixed(1) : v}`)
            .join(', ')
          detail += ` [${extras}]`
        }
        lines.push(detail)
      }
    }

    return lines.join('\n')
  }
}
