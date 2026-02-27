<script setup lang="ts">
import { gameStore } from '@/stores/gameStore'

function resetDefaults() {
  gameStore.resetDefaults()
}
</script>

<template>
  <div class="settings-panel">
    <h2 class="panel-title">Settings</h2>

    <section class="section">
      <h3 class="section-title">LLM Connection</h3>

      <div class="field">
        <label for="api-url">API URL</label>
        <input
          id="api-url"
          type="text"
          v-model="gameStore.llmSettings.apiUrl"
          placeholder="https://api.openai.com/v1"
        />
      </div>

      <div class="field">
        <label for="api-key">API Key</label>
        <input
          id="api-key"
          type="password"
          v-model="gameStore.llmSettings.apiKey"
          placeholder="sk-..."
        />
      </div>

      <div class="field">
        <label for="model">Model</label>
        <input
          id="model"
          type="text"
          v-model="gameStore.llmSettings.model"
          placeholder="gpt-4o-mini"
        />
      </div>

      <div class="field">
        <label for="temperature">Temperature: {{ gameStore.llmSettings.temperature.toFixed(2) }}</label>
        <input
          id="temperature"
          type="range"
          min="0"
          max="2"
          step="0.05"
          v-model.number="gameStore.llmSettings.temperature"
        />
      </div>

      <div class="field">
        <label for="max-tokens">Max Tokens</label>
        <input
          id="max-tokens"
          type="number"
          min="50"
          max="2000"
          v-model.number="gameStore.llmSettings.maxTokens"
        />
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <h3 class="section-title">System Prompt</h3>
        <button class="btn-small" @click="gameStore.resetSystemPrompt()">Reset to default</button>
      </div>
      <div class="field">
        <textarea
          id="system-prompt"
          rows="10"
          v-model="gameStore.llmSettings.systemPrompt"
        />
      </div>
    </section>

    <section class="section">
      <h3 class="section-title">Game Settings</h3>
      <div class="field">
        <label for="cycle-interval">Cycle Interval (ms): {{ gameStore.gameSettings.cycleIntervalMs }}</label>
        <input
          id="cycle-interval"
          type="range"
          min="10"
          max="2000"
          step="10"
          v-model.number="gameStore.gameSettings.cycleIntervalMs"
        />
      </div>
      <div class="field">
        <label for="random-seed">
          Random Seed
          <span class="field-hint">(0 = random each reset)</span>
        </label>
        <input
          id="random-seed"
          type="number"
          min="0"
          step="1"
          placeholder="0"
          v-model.number="gameStore.gameSettings.randomSeed"
        />
      </div>
      <div class="field field-checkbox">
        <input
          id="debug-overlays"
          type="checkbox"
          v-model="gameStore.gameSettings.showDebugOverlays"
        />
        <label for="debug-overlays">Show debug overlays (vision radius, halo outlines)</label>
      </div>
    </section>

    <section class="section">
      <button @click="resetDefaults">Reset everything to Defaults</button>
    </section>
  </div>
</template>

<style scoped>
.settings-panel {
  padding: 16px;
  background: var(--bg-secondary);
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.section {
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section-header .section-title {
  margin-bottom: 0;
}

.btn-small {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.btn-small:hover {
  color: var(--text-primary);
  border-color: var(--accent);
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

.field {
  margin-bottom: 12px;
}

.field textarea {
  resize: vertical;
  min-height: 100px;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
}

.field input[type="range"] {
  width: 100%;
  margin-top: 4px;
}

.field-hint {
  font-weight: 400;
  color: var(--text-secondary);
  font-size: 11px;
  margin-left: 4px;
}

.field-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-checkbox input[type="checkbox"] {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  accent-color: var(--accent);
}

.field-checkbox label {
  margin-bottom: 0;
  cursor: pointer;
}
</style>
