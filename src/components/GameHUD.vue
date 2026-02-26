<script setup lang="ts">
import { computed } from 'vue'
import { gameStore } from '@/stores/gameStore'

const energyPercent = computed(() =>
  Math.max(0, Math.min(100, gameStore.stats.selectedAmoebaEnergy)),
)

const energyColor = computed(() => {
  const e = energyPercent.value
  if (e >= 60) return 'var(--success)'
  if (e >= 30) return 'var(--warning)'
  return 'var(--danger)'
})

const statusText = computed(() =>
  gameStore.stats.running ? 'RUNNING' : 'PAUSED',
)

const statusColor = computed(() =>
  gameStore.stats.running ? 'var(--success)' : 'var(--text-secondary)',
)
</script>

<template>
  <div class="hud">
    <div class="hud-row">
      <span class="hud-status" :style="{ color: statusColor }">{{ statusText }}</span>
      <span class="hud-label">Cycle</span>
      <span class="hud-value">{{ gameStore.stats.cycleCount }}</span>
    </div>

    <div class="hud-row">
      <span class="hud-label">Energy</span>
      <div class="energy-bar-bg">
        <div
          class="energy-bar-fill"
          :style="{ width: energyPercent + '%', background: energyColor }"
        />
      </div>
      <span class="hud-value energy-num">{{ gameStore.stats.selectedAmoebaEnergy.toFixed(1) }}</span>
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
  min-width: 200px;
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

.energy-bar-bg {
  flex: 1;
  height: 8px;
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
  min-width: 42px;
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
</style>
