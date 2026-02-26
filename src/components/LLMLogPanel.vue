<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue'
import { gameStore } from '@/stores/gameStore'

const MIN_HEIGHT_PX = 104  // header + ~3 log entries
const DEFAULT_HEIGHT_PX = 150
const MAX_HEIGHT_PX = 400

const minimized = ref(false)
const logContentRef = ref<HTMLElement | null>(null)
const height = ref(DEFAULT_HEIGHT_PX)

function onResizeStart(e: MouseEvent) {
  e.preventDefault()
  const startY = e.clientY
  const startHeight = height.value

  function onMove(moveEvent: MouseEvent) {
    const delta = startY - moveEvent.clientY
    const newHeight = Math.max(MIN_HEIGHT_PX, Math.min(MAX_HEIGHT_PX, startHeight + delta))
    height.value = newHeight
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
  document.body.style.cursor = 'ns-resize'
  document.body.style.userSelect = 'none'
}

onUnmounted(() => {
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
})

watch(
  () => gameStore.llmLog.length,
  () => {
    if (!minimized.value && logContentRef.value) {
      nextTick(() => {
        logContentRef.value?.scrollTo({ top: logContentRef.value.scrollHeight, behavior: 'smooth' })
      })
    }
  },
)
</script>

<template>
  <div
    class="log-panel"
    :class="{ minimized }"
    :style="{ height: minimized ? undefined : `${height}px` }"
  >
    <div
      v-show="!minimized"
      class="log-resize-handle"
      @mousedown="onResizeStart"
    />
    <header class="log-header" @click="minimized = !minimized">
      <span class="log-title">LLM Log</span>
      <button
        class="log-toggle"
        type="button"
        :title="minimized ? 'Expand' : 'Minimize'"
        @click.stop="minimized = !minimized"
      >
        {{ minimized ? '▲' : '▼' }}
      </button>
    </header>
    <div v-show="!minimized" ref="logContentRef" class="log-content">
      <div v-if="gameStore.llmLog.length === 0" class="log-empty">
        No decisions yet. Start the game to see LLM output.
      </div>
      <div v-else class="log-entries">
        <div
          v-for="(entry, i) in gameStore.llmLog"
          :key="i"
          class="log-entry"
          :class="{ 'log-entry-error': entry.action === 'error' }"
        >
          <span class="log-cycle">C{{ entry.cycle }}</span>
          <span class="log-amoeba">{{ entry.amoebaId }}</span>
          <span class="log-action">{{ entry.action }}</span>
          <span v-if="entry.details" class="log-details">{{ entry.details }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.log-panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(13, 17, 23, 0.95);
  border-top: 1px solid var(--border-color);
  z-index: 10;
  display: flex;
  flex-direction: column;
  min-height: 104px;
  backdrop-filter: blur(6px);
}

.log-panel.minimized {
  height: auto;
}

.log-resize-handle {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  cursor: ns-resize;
  z-index: 1;
}

.log-resize-handle:hover {
  background: rgba(88, 166, 255, 0.2);
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  cursor: pointer;
  flex-shrink: 0;
  user-select: none;
}

.log-header:hover {
  background: rgba(255, 255, 255, 0.03);
}

.log-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.log-toggle {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px 8px;
  font-size: 10px;
}

.log-toggle:hover {
  color: var(--text-primary);
}

.log-content {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding: 0 12px 8px;
}

.log-empty {
  font-size: 12px;
  color: var(--text-secondary);
  padding: 8px 0;
}

.log-entries {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-family: var(--font-mono);
  font-size: 11px;
}

.log-entry {
  display: flex;
  gap: 10px;
  padding: 2px 0;
  color: var(--text-primary);
}

.log-entry-error {
  color: var(--danger);
}

.log-cycle {
  flex-shrink: 0;
  color: var(--text-secondary);
  min-width: 36px;
}

.log-amoeba {
  flex-shrink: 0;
  color: var(--accent);
  min-width: 90px;
}

.log-action {
  flex-shrink: 0;
  font-weight: 600;
  min-width: 60px;
}

.log-details {
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
