import type { LLMChatRequest, LLMChatResponse, LLMMessage, LLMSettings } from '@/types'

export class LLMClient {
  async chat(
    settings: LLMSettings,
    messages: LLMMessage[],
  ): Promise<string> {
    const url = `${settings.apiUrl.replace(/\/+$/, '')}/chat/completions`

    const body: LLMChatRequest = {
      model: settings.model,
      messages,
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`LLM API error ${response.status}: ${text}`)
    }

    const data: LLMChatResponse = await response.json()

    if (!data.choices?.length) {
      throw new Error('LLM returned no choices')
    }

    return data.choices[0].message.content
  }
}
