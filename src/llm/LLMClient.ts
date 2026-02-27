import type { LLMChatRequest, LLMChatResponse, LLMUsage, LLMMessage, LLMSettings } from '@/types'

// Models that require max_completion_tokens instead of max_tokens
// (o1 series, GPT-5.x, gpt-oss, etc.)
const MAX_COMPLETION_TOKENS_MODEL_PATTERNS = [
  /\bo[1-9]\b/, /\bo[1-9][-_]/, // o1, o3, o3-mini, etc.
  /\bgpt-5/,                    // gpt-5-mini, gpt-5, gpt-5.1, gpt-5-nano-v1, etc.
  /\bgpt-oss\b/,                // gpt-oss-20b, gpt-oss-175b, etc.
]

function useMaxCompletionTokens(model: string): boolean {
  const lower = model.toLowerCase()
  return MAX_COMPLETION_TOKENS_MODEL_PATTERNS.some((re) => re.test(lower))
}

const RESPONSE_FORMAT = { type: 'json_object' as const }

export class LLMClient {
  async chat(
    settings: LLMSettings,
    messages: LLMMessage[],
  ): Promise<{ content: string; usage?: LLMUsage }> {
    const url = `${settings.apiUrl.replace(/\/+$/, '')}/chat/completions`

    const useCompletionTokens = useMaxCompletionTokens(settings.model)
    const maxTokens = useCompletionTokens ? 2048 : settings.maxTokens
    const body: LLMChatRequest = {
      model: settings.model,
      messages,
      response_format: RESPONSE_FORMAT,
      ...(!useCompletionTokens && { temperature: settings.temperature }),
      ...(useCompletionTokens
        ? { max_completion_tokens: maxTokens }
        : { max_tokens: maxTokens }),
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

    return {
      content: data.choices[0].message.content,
      usage: data.usage,
    }
  }
}
