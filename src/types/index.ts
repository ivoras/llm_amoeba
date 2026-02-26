export interface Position {
  x: number
  y: number
}

export type AmoebaActionType = 'move' | 'feed' | 'divide' | 'idle'

export interface MoveAction {
  action: 'move'
  direction: number // 0-5
  distance: number  // 1-5 body lengths
}

export interface FeedAction {
  action: 'feed'
}

export interface DivideAction {
  action: 'divide'
}

export interface IdleAction {
  action: 'idle'
}

export type AmoebaAction = MoveAction | FeedAction | DivideAction | IdleAction

export interface AmoebaState {
  id: string
  position: Position
  energy: number
  alive: boolean
}

export interface EnemyState {
  id: string
  position: Position
  energy: number
  alive: boolean
}

export interface FoodState {
  id: string
  position: Position
  radius: number        // cm
  maxEnergy: number
  remainingEnergy: number
}

export interface PoisonState {
  id: string
  position: Position
  radius: number        // cm
}

export interface NearbyObject {
  type: 'food' | 'poison' | 'enemy' | 'amoeba'
  relativePosition: Position
  distance: number      // cm
  details?: Record<string, number | string>
}

export interface LLMSettings {
  apiUrl: string
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
}

export interface GameSettings {
  cycleIntervalMs: number
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMChatRequest {
  model: string
  messages: LLMMessage[]
  temperature: number
  max_tokens: number
}

export interface LLMChatResponse {
  choices: {
    message: {
      content: string
    }
  }[]
}

export interface GameStats {
  cycleCount: number
  amoebaCount: number
  foodCount: number
  enemyCount: number
  poisonCount: number
  selectedAmoebaEnergy: number
  running: boolean
}

export interface LLMLogEntry {
  cycle: number
  amoebaId: string
  action: string
  details?: string
}
