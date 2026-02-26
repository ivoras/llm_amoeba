<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { createGame, destroyGame } from '@/game/PhaserGame'

const container = ref<HTMLDivElement | null>(null)

onMounted(() => {
  if (container.value) {
    createGame(container.value)
  }
})

onUnmounted(() => {
  destroyGame()
})
</script>

<template>
  <div ref="container" class="game-container" />
</template>

<style scoped>
.game-container {
  width: 1000px;
  height: 1000px;
  flex-shrink: 0;
}

.game-container canvas {
  display: block;
}
</style>
