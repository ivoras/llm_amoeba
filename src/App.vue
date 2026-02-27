<script setup lang="ts">
import { ref } from 'vue'
import GameView from './components/GameView.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import GameHUD from './components/GameHUD.vue'
import LLMLogPanel from './components/LLMLogPanel.vue'
import { gameStore } from '@/stores/gameStore'
import { getGameScene } from '@/game/PhaserGame'

const settingsOpen = ref(false)

function startGame() {
  const scene = getGameScene()
  if (!scene) {
    window.alert('Game is still loading. Please wait a moment and try again.')
    return
  }
  scene.startGame()
}

function pauseGame() {
  getGameScene()?.pauseGame()
}

function resetGame() {
  getGameScene()?.resetGame()
}
</script>

<template>
  <div class="app-layout">
    <header class="app-header">
      <h1 class="app-title">LLM Amoeba</h1>
      <span class="app-subtitle">Will an AI-powered amoeba survive?</span>
      <div class="game-controls">
        <button
          class="icon-btn"
          title="Start"
          @click="startGame"
          :disabled="gameStore.stats.running"
        >▶</button>
        <button
          class="icon-btn"
          title="Pause"
          @click="pauseGame"
          :disabled="!gameStore.stats.running"
        >⏸</button>
        <button
          class="icon-btn icon-btn-danger"
          title="Reset"
          @click="resetGame"
        >↺</button>
      </div>
      <button class="settings-toggle" @click="settingsOpen = !settingsOpen">
        {{ settingsOpen ? 'Close Settings' : 'Settings' }}
      </button>
    </header>

    <div class="app-body">
      <SettingsPanel v-if="settingsOpen" class="settings-sidebar" />
      <div class="game-area">
        <GameView />
        <GameHUD />
        <LLMLogPanel />
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.app-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.app-subtitle {
  color: var(--text-secondary);
  font-size: 13px;
  font-style: italic;
}

.game-controls {
  display: flex;
  gap: 4px;
  margin-left: auto;
  margin-right: 12px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.icon-btn-danger:hover:not(:disabled) {
  background: #da3633;
  border-color: #f85149;
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.settings-sidebar {
  width: 340px;
  flex-shrink: 0;
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
}

.game-area {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--bg-primary);
}
</style>
