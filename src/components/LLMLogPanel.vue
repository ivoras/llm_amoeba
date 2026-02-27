<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue'
import { gameStore } from '@/stores/gameStore'
import type { LLMLogEntry } from '@/types'

const MIN_HEIGHT_PX = 104  // header + ~3 log entries
const DEFAULT_HEIGHT_PX = 150
const MAX_HEIGHT_PX = 400

const minimized = ref(false)
const logContentRef = ref<HTMLElement | null>(null)
const height = ref(DEFAULT_HEIGHT_PX)
const modalEntry = ref<LLMLogEntry | null>(null)

function openRawModal(entry: LLMLogEntry) {
  modalEntry.value = entry
}

function closeModal() {
  modalEntry.value = null
}

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
          <button
            v-if="entry.promptMessages"
            class="log-raw-btn"
            title="View raw prompt &amp; response"
            @click="openRawModal(entry)"
          >{}</button>
          <span class="log-cycle">C{{ entry.cycle }}</span>
          <span class="log-amoeba">{{ entry.amoebaId }}</span>
          <span class="log-action">{{ entry.action }}</span>
          <span v-if="entry.details" class="log-details">{{ entry.details }}</span>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="modalEntry" class="raw-modal-overlay" @click.self="closeModal">
        <div class="raw-modal">
          <header class="raw-modal-header">
            <span>C{{ modalEntry.cycle }} &mdash; {{ modalEntry.amoebaId }} &mdash; {{ modalEntry.action }}</span>
            <button class="raw-modal-close" @click="closeModal">&times;</button>
          </header>
          <div class="raw-modal-body">
            <section v-if="modalEntry.promptMessages">
              <h3>Prompt</h3>
              <div
                v-for="(msg, mi) in modalEntry.promptMessages"
                :key="mi"
                class="raw-msg"
              >
                <span class="raw-msg-role">{{ msg.role }}</span>
                <pre class="raw-msg-content">{{ msg.content }}</pre>
              </div>
            </section>
            <section v-if="modalEntry.rawResponse">
              <h3>Response</h3>
              <pre class="raw-msg-content">{{ modalEntry.rawResponse }}</pre>
            </section>
            <section v-if="!modalEntry.promptMessages && !modalEntry.rawResponse">
              <p class="raw-empty">No raw data available for this entry.</p>
            </section>
          </div>
        </div>
      </div>
    </Teleport>
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

.log-raw-btn {
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 3px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 9px;
  line-height: 1;
  padding: 1px 4px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.log-raw-btn:hover {
  background: rgba(88, 166, 255, 0.2);
  color: var(--text-primary);
}

.raw-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.raw-modal {
  background: #161b22;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  width: min(720px, 90vw);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
}

.raw-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.raw-modal-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 20px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.raw-modal-close:hover {
  color: var(--text-primary);
}

.raw-modal-body {
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.raw-modal-body h3 {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  margin: 0 0 8px;
}

.raw-msg {
  margin-bottom: 8px;
}

.raw-msg-role {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--accent);
  margin-bottom: 4px;
}

.raw-msg-content {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  padding: 10px 12px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  max-height: 300px;
  overflow-y: auto;
}

.raw-empty {
  color: var(--text-secondary);
  font-size: 12px;
}
</style>
