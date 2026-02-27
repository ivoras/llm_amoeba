<script setup lang="ts">
import { ref, onMounted } from 'vue'
import GameView from './components/GameView.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import GameHUD from './components/GameHUD.vue'
import LLMLogPanel from './components/LLMLogPanel.vue'
import { gameStore } from '@/stores/gameStore'
import { getGameScene } from '@/game/PhaserGame'

const INTRO_STORAGE_KEY = 'llm-amoeba-seen-intro'

const settingsOpen = ref(false)
const showIntroDialog = ref(false)

onMounted(() => {
  if (!localStorage.getItem(INTRO_STORAGE_KEY)) {
    showIntroDialog.value = true
  }
})

function dismissIntro() {
  showIntroDialog.value = false
  localStorage.setItem(INTRO_STORAGE_KEY, '1')
}

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
    <div v-if="showIntroDialog" class="intro-overlay" @click.self="dismissIntro">
      <div class="intro-dialog">
        <h2>Welcome to LLM Amoeba</h2>
        <p>An AI controls a virtual amoeba. Each cycle it receives what the amoeba "sees" and decides: move, feed, or divide.</p>
        <ol>
          <li><strong>Configure the LLM first:</strong> Open <strong>Settings</strong> and enter your API URL, API key, and model. The game works with any OpenAI-compatible API (OpenAI, local models, etc.).</li>
          <li><strong>Start:</strong> Click ▶ to begin. The amoeba will send prompts to the LLM each cycle.</li>
          <li><strong>Watch:</strong> Use the mouse wheel to zoom, right-drag to pan. Click an amoeba to follow it.</li>
          <li><strong>LLM Log:</strong> The bottom panel shows each decision; click <strong>{}</strong> to inspect prompts and responses.</li>
        </ol>
        <button class="intro-dismiss" @click="dismissIntro">Got it</button>
      </div>
    </div>
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

.intro-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.intro-dialog {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
}

.intro-dialog h2 {
  font-size: 18px;
  margin-bottom: 12px;
}

.intro-dialog p {
  color: var(--text-secondary);
  margin-bottom: 16px;
  line-height: 1.5;
}

.intro-dialog ol {
  margin: 0 0 20px 1.2em;
  line-height: 1.6;
  color: var(--text-secondary);
}

.intro-dialog li {
  margin-bottom: 8px;
}

.intro-dismiss {
  display: block;
  width: 100%;
  padding: 10px 16px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.intro-dismiss:hover {
  background: var(--accent-hover);
}
</style>
