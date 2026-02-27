<script setup lang="ts">
import { computed } from 'vue'
import { gameStore } from '@/stores/gameStore'
import { APP_VERSION } from '@/version'

const statusText = computed(() =>
  gameStore.stats.running ? 'RUNNING' : 'PAUSED',
)

const statusColor = computed(() =>
  gameStore.stats.running ? 'var(--success)' : 'var(--text-secondary)',
)

function energyPercent(energy: number): number {
  return Math.max(0, Math.min(100, energy))
}

function energyColor(energy: number): string {
  if (energy >= 60) return 'var(--success)'
  if (energy >= 30) return 'var(--warning)'
  return 'var(--danger)'
}

function shortId(id: string): string {
  // "amoeba-3" → "A3"
  return id.replace('amoeba-', 'A')
}
</script>

<template>
  <div class="hud">
    <div class="hud-row">
      <span class="hud-status" :style="{ color: statusColor }">{{ statusText }}</span>
      <span class="hud-label">Cycle</span>
      <span class="hud-value">{{ gameStore.stats.cycleCount }}</span>
    </div>

    <div class="amoeba-list">
      <div
        v-for="a in gameStore.stats.amoebas"
        :key="a.id"
        class="amoeba-row"
      >
        <span class="amoeba-label">{{ shortId(a.id) }}</span>
        <div class="energy-bar-bg">
          <div
            class="energy-bar-fill"
            :style="{ width: energyPercent(a.energy) + '%', background: energyColor(a.energy) }"
          />
        </div>
        <span class="hud-value energy-num">{{ a.energy.toFixed(1) }}</span>
      </div>
    </div>

    <div class="hud-stats">
      <div class="stat">
        <span class="stat-dot amoeba-dot" />
        <span>{{ gameStore.stats.amoebaCount }} amoeba{{ gameStore.stats.amoebaCount !== 1 ? 's' : '' }}</span>
      </div>
      <div class="stat">
        <span class="stat-dot food-dot" />
        <span>{{ gameStore.stats.foodCount }} food</span>
      </div>
      <div class="stat">
        <span class="stat-dot poison-dot" />
        <span>{{ gameStore.stats.poisonCount }} poison</span>
      </div>
      <div class="stat">
        <span class="stat-dot enemy-dot" />
        <span>{{ gameStore.stats.enemyCount }} enem{{ gameStore.stats.enemyCount !== 1 ? 'ies' : 'y' }}</span>
      </div>
    </div>

    <div class="token-box">
      <span class="hud-label">Tokens ({{ gameStore.llmSettings.model }})</span>
      <span class="token-values">
        {{ gameStore.stats.promptTokens.toLocaleString() }} in / {{ gameStore.stats.generatedTokens.toLocaleString() }} out
      </span>
    </div>

    <div class="github-box">
      <span class="version-line">v{{ APP_VERSION }}</span>
      <a
        href="https://github.com/ivoras/llm_amoeba"
        target="_blank"
        rel="noopener noreferrer"
        class="github-link"
      ><i class="fa-brands fa-github"></i> GitHub</a>
    </div>
  </div>
</template>

<style scoped>
.hud {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(13, 17, 23, 0.88);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
  z-index: 10;
  min-width: 220px;
  backdrop-filter: blur(6px);
}

.hud-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hud-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.hud-value {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
}

.hud-status {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-right: auto;
}

.amoeba-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 160px;
  overflow-y: auto;
}

.amoeba-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.amoeba-label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
  min-width: 26px;
}

.energy-bar-bg {
  flex: 1;
  height: 7px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.energy-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease, background 0.4s ease;
}

.energy-num {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  min-width: 38px;
  text-align: right;
}

.hud-stats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.stat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.amoeba-dot { background: #3fb950; }
.food-dot   { background: #44cc44; }
.poison-dot { background: #aa22cc; }
.enemy-dot  { background: #cc2222; }

.token-box {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 6px;
  border-top: 1px solid var(--border-color);
  margin-top: 2px;
}

.token-values {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
}

.github-box {
  padding-top: 6px;
  border-top: 1px solid var(--border-color);
  margin-top: 2px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.version-line {
  font-size: 11px;
  color: var(--text-secondary);
}

.github-link {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  text-decoration: none;
  pointer-events: auto;
  transition: color 0.15s;
}

.github-link:hover {
  color: var(--accent);
}

.github-link i {
  font-size: 1.1em;
}
</style>
