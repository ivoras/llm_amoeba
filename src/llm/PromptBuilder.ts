import type { AmoebaState, NearbyObject, LLMMessage } from '@/types'

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

    lines.push(`Position: (${amoeba.position.x.toFixed(4)}, ${amoeba.position.y.toFixed(4)})`)
    lines.push(`Energy: ${amoeba.energy.toFixed(1)}`)
    lines.push('')

    if (surroundings.length === 0) {
      lines.push('Surroundings: Nothing detected nearby.')
    } else {
      lines.push(`Nearby objects (${surroundings.length}):`)
      for (const obj of surroundings) {
        const dx = obj.relativePosition.x.toFixed(4)
        const dy = obj.relativePosition.y.toFixed(4)
        const dist = obj.distance.toFixed(4)
        let detail = `- ${obj.type} at relative (${dx}, ${dy}), distance: ${dist} cm`
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
