<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { createGame, destroyGame } from '@/game/PhaserGame'
import { gameStore } from '@/stores/gameStore'

const container = ref<HTMLDivElement | null>(null)

onMounted(() => {
  if (container.value) {
    createGame(container.value)
  }
})

onUnmounted(() => {
  destroyGame()
  gameStore.tooltip.visible = false
})

const OFFSET = 16
const TOOLTIP_W = 200
const TOOLTIP_H = 72

const tooltipStyle = computed(() => {
  let x = gameStore.tooltip.x + OFFSET
  let y = gameStore.tooltip.y + OFFSET
  if (x + TOOLTIP_W > window.innerWidth)  x = gameStore.tooltip.x - TOOLTIP_W - OFFSET
  if (y + TOOLTIP_H > window.innerHeight) y = gameStore.tooltip.y - TOOLTIP_H - OFFSET
  return { left: `${x}px`, top: `${y}px` }
})
</script>

<template>
  <div ref="container" class="game-container">
    <div
      v-if="gameStore.tooltip.visible"
      class="game-tooltip"
      :style="tooltipStyle"
    >{{ gameStore.tooltip.text }}</div>
  </div>
</template>

<style scoped>
.game-container {
  width: 1000px;
  height: 1000px;
  flex-shrink: 0;
  position: relative;
}

.game-container canvas {
  display: block;
}

.game-tooltip {
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  font-family: monospace;
  font-size: 11px;
  color: #e6edf3;
  background: rgba(22, 27, 34, 0.93);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 5px;
  padding: 4px 8px;
  white-space: pre;
  line-height: 1.5;
  max-width: 200px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}
</style>
