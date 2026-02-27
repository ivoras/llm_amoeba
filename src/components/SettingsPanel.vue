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
          :disabled="gameStore.stats.running"
        />
      </div>

      <div class="field">
        <label for="api-key">API Key</label>
        <input
          id="api-key"
          type="password"
          v-model="gameStore.llmSettings.apiKey"
          placeholder="sk-..."
          :disabled="gameStore.stats.running"
        />
      </div>

      <div class="field">
        <label for="model">Model</label>
        <input
          id="model"
          type="text"
          v-model="gameStore.llmSettings.model"
          placeholder="gpt-4o-mini"
          :disabled="gameStore.stats.running"
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
          :disabled="gameStore.stats.running"
        />
      </div>

      <div class="field">
        <label for="response-format">Response Format</label>
        <select
          id="response-format"
          v-model="gameStore.llmSettings.responseFormatType"
          :disabled="gameStore.stats.running"
        >
          <option value="json_object">JSON object (flexible)</option>
          <option value="json_schema">JSON schema (strict)</option>
          <option value="none">None (no format constraint)</option>
        </select>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <h3 class="section-title">System Prompt</h3>
        <button
          class="btn-small"
          :disabled="gameStore.stats.running"
          @click="gameStore.resetSystemPrompt()"
        >Reset to default</button>
      </div>
      <div class="field">
        <textarea
          id="system-prompt"
          rows="10"
          v-model="gameStore.llmSettings.systemPrompt"
          :disabled="gameStore.stats.running"
        />
      </div>
    </section>

    <section class="section">
      <h3 class="section-title">Game Settings</h3>
      <div class="field">
        <label for="initial-food">
          Initial Food Count
          <span class="field-hint">(applies on reset)</span>
        </label>
        <input
          id="initial-food"
          type="number"
          min="0"
          max="200"
          step="1"
          v-model.number="gameStore.gameSettings.initialFoodCount"
        />
      </div>
      <div class="field">
        <label for="initial-poison">
          Initial Poison Count
          <span class="field-hint">(applies on reset)</span>
        </label>
        <input
          id="initial-poison"
          type="number"
          min="0"
          max="50"
          step="1"
          v-model.number="gameStore.gameSettings.initialPoisonCount"
        />
      </div>
      <div class="field">
        <label for="initial-enemies">
          Initial Enemy Count
          <span class="field-hint">(applies on reset)</span>
        </label>
        <input
          id="initial-enemies"
          type="number"
          min="0"
          max="50"
          step="1"
          v-model.number="gameStore.gameSettings.initialEnemyCount"
        />
      </div>
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

.field input:disabled,
.field select:disabled,
.field textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-small:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
