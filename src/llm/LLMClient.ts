import type { LLMChatRequest, LLMChatResponse, LLMMessage, LLMSettings } from '@/types'

const REASONING_MODEL_PATTERNS = [
  /\bo[1-9]\b/, /\bo[1-9][-_]/, // o1, o3, o3-mini, etc.
  /\bgpt-oss\b/,                 // gpt-oss-20b, gpt-oss-175b, etc.
]

function isReasoningModel(model: string): boolean {
  const lower = model.toLowerCase()
  return REASONING_MODEL_PATTERNS.some((re) => re.test(lower))
}

const ACTION_RESPONSE_FORMAT: LLMChatRequest['response_format'] = {
  type: 'json_schema',
  json_schema: {
    name: 'amoeba_action',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['move', 'feed', 'divide'] },
        direction: { enum: ['right', 'upper-right', 'upper-left', 'left', 'lower-left', 'lower-right', null] },
        distance: { type: ['number', 'null'] },
      },
      required: ['action', 'direction', 'distance'],
      additionalProperties: false,
    },
  },
}

export class LLMClient {
  async chat(
    settings: LLMSettings,
    messages: LLMMessage[],
  ): Promise<string> {
    const url = `${settings.apiUrl.replace(/\/+$/, '')}/chat/completions`

    const reasoning = isReasoningModel(settings.model)
    const body: LLMChatRequest = {
      model: settings.model,
      messages,
      response_format: ACTION_RESPONSE_FORMAT,
      ...(!reasoning && { temperature: settings.temperature }),
      ...(reasoning
        ? { max_completion_tokens: settings.maxTokens }
        : { max_tokens: settings.maxTokens }),
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
