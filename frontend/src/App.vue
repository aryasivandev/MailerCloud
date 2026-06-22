<template>
  <div class="dashboard-container">
    <header class="dashboard-header">
      <div class="logo-area">
        <span class="logo-icon">🚀</span>
        <h1>MailerCloud Ingestion</h1>
      </div>
      <p class="subtitle">High-Throughput Analytics & Real-Time Dashboard</p>
    </header>

    <div class="control-panel card">
      <div class="search-box">
        <input
          v-model="campaignId"
          placeholder="Enter Campaign ID (e.g. camp-999)"
          @keyup.enter="getStats"
          class="campaign-input"
        />
        <button @click="getStats" class="btn-primary" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          <span>{{ loading ? 'Updating...' : 'Fetch Stats' }}</span>
        </button>
      </div>

      <!-- Realtime Sync & Connection Status -->
      <div class="status-panel" v-if="campaignIdLoaded">
        <div class="realtime-status">
          <span class="pulse-indicator" :class="connectionStatus"></span>
          <span class="status-text">{{ connectionStatusText }}</span>
        </div>
        <div class="last-updated" v-if="lastUpdatedText">
          <span>Last Sync: {{ lastUpdatedText }}</span>
        </div>
      </div>
    </div>

    <!-- In-Browser Load Simulation Panel -->
    <div class="simulation-panel card" v-if="campaignIdLoaded">
      <div class="simulation-header" @click="toggleSimPanel">
        <div class="sim-title">
          <span class="sim-icon">⚡</span>
          <h2>In-Browser Load Simulator</h2>
        </div>
        <span class="collapse-arrow">{{ showSimPanel ? '▲' : '▼' }}</span>
      </div>
      
      <div v-show="showSimPanel" class="simulation-body">
        <p class="sim-desc">Simulate live traffic for campaign <strong>"{{ campaignIdLoaded }}"</strong> directly from this browser to see real-time updates.</p>
        <div class="sim-controls">
          <div class="sim-field">
            <label>Event Count</label>
            <select v-model="simCount" class="sim-select" :disabled="simulating">
              <option :value="50">50 events</option>
              <option :value="200">200 events</option>
              <option :value="1000">1000 events</option>
            </select>
          </div>
          <div class="sim-field checkbox-field">
            <input type="checkbox" id="include-dupes" v-model="simIncludeDuplicates" :disabled="simulating" />
            <label for="include-dupes">Simulate Duplicates (15%)</label>
          </div>
          <button @click="runSimulation" class="btn-secondary" :disabled="simulating">
            <span v-if="simulating" class="spinner"></span>
            <span>{{ simulating ? `Sending (${simSent}/${simCount})...` : 'Start Simulation' }}</span>
          </button>
        </div>
        
        <!-- Simulation Progress Bar -->
        <div v-if="simulating || simCompleted" class="sim-progress-area">
          <div class="sim-progress-bar">
            <div class="sim-progress-fill" :style="{ width: (simSent / simCount) * 100 + '%' }"></div>
          </div>
          <div class="sim-stats">
            <span>Sent: {{ simSent }}/{{ simCount }}</span>
            <span class="sim-stat-success">Success: {{ simSuccess }}</span>
            <span class="sim-stat-duplicate">Duplicates: {{ simDuplicates }}</span>
            <span class="sim-stat-error">Errors: {{ simErrors }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- General Error State (Initial Load Failed) -->
    <div v-if="error && !stats" class="alert-box error card">
      <div class="alert-icon">⚠️</div>
      <div class="alert-content">
        <h4>Request Failed</h4>
        <p>Could not load campaign statistics. Ensure XAMPP is running, the database is configured, and CORS is allowed.</p>
      </div>
    </div>

    <!-- UI States depending on whether campaign data exists -->
    <div v-if="!campaignIdLoaded" class="empty-state-panel card welcome-state">
      <div class="empty-state-icon">🔍</div>
      <h3>No Campaign Selected</h3>
      <p>Enter a campaign ID above to load and track real-time engagement analytics.</p>
    </div>

    <div v-else-if="isEmptyState" class="empty-state-panel card">
      <div class="empty-state-icon">📭</div>
      <h3>No Activity Recorded Yet</h3>
      <p>We haven't received any email engagement events for campaign <strong>"{{ campaignIdLoaded }}"</strong> yet.</p>
      <p class="empty-state-action">Use the Load Simulator above or run the CLI load generator script to seed some events!</p>
    </div>

    <div v-else class="dashboard-active-content">
      <!-- Main Stats Dashboard -->
      <div class="stats-grid">
        <StatsCard 
          title="Sent" 
          :value="stats.sent" 
          variant="sent" 
          icon="📨" 
        />
        <StatsCard 
          title="Opened" 
          :value="stats.opened" 
          :rate="getRate(stats.opened, stats.sent)" 
          rate-label="Open Rate" 
          variant="opened" 
          icon="📖" 
        />
        <StatsCard 
          title="Clicked" 
          :value="stats.clicked" 
          :rate="getRate(stats.clicked, stats.sent)" 
          rate-label="CTR" 
          variant="clicked" 
          icon="⚡" 
        />
        <StatsCard 
          title="Bounced" 
          :value="stats.bounced" 
          :rate="getRate(stats.bounced, stats.sent)" 
          rate-label="Bounce Rate" 
          variant="bounced" 
          icon="❌" 
        />
      </div>

      <!-- Conversion & Performance Progress Bars -->
      <div v-if="stats && stats.sent > 0" class="performance-panel card">
        <h2>Engagement Distribution</h2>
        <div class="progress-container">
          <div class="progress-label">
            <span>Open Rate</span>
            <span>{{ getRate(stats.opened, stats.sent) }}%</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill opened" :style="{ width: getRate(stats.opened, stats.sent) + '%' }"></div>
          </div>
        </div>

        <div class="progress-container">
          <div class="progress-label">
            <span>Click-Through Rate (CTR)</span>
            <span>{{ getRate(stats.clicked, stats.sent) }}%</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill clicked" :style="{ width: getRate(stats.clicked, stats.sent) + '%' }"></div>
          </div>
        </div>

        <div class="progress-container">
          <div class="progress-label">
            <span>Bounce Rate</span>
            <span>{{ getRate(stats.bounced, stats.sent) }}%</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill bounced" :style="{ width: getRate(stats.bounced, stats.sent) + '%' }"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import StatsCard from './components/StatsCard.vue'
import api from './services/api'

const campaignId = ref('')
const campaignIdLoaded = ref('')
const stats = ref(null)
const loading = ref(false)
const error = ref(false)

// Resiliency and Synchronization variables
const connectionStatus = ref('connected') // 'connected', 'connecting', 'disconnected'
const lastUpdatedText = ref('')
let refreshInterval = null

const connectionStatusText = computed(() => {
  if (connectionStatus.value === 'connected') {
    return 'Connected (Auto-refreshing every 5s)'
  } else if (connectionStatus.value === 'connecting') {
    return 'Syncing statistics...'
  } else {
    return 'Connection lost. Retrying automatically...'
  }
})

// Empty state checker
const isEmptyState = computed(() => {
  return stats.value &&
         stats.value.sent === 0 &&
         stats.value.opened === 0 &&
         stats.value.clicked === 0 &&
         stats.value.bounced === 0;
})

// Simulation Panel state
const showSimPanel = ref(false)
const simCount = ref(50)
const simIncludeDuplicates = ref(true)
const simulating = ref(false)
const simSent = ref(0)
const simSuccess = ref(0)
const simDuplicates = ref(0)
const simErrors = ref(0)
const simCompleted = ref(false)

async function getStats() {
  const queryId = campaignId.value.trim()
  if (!queryId) return

  loading.value = true
  error.value = false
  connectionStatus.value = 'connecting'

  try {
    const response = await api.getCampaignStats(queryId)
    stats.value = response.data
    campaignIdLoaded.value = queryId
    connectionStatus.value = 'connected'
    lastUpdatedText.value = new Date().toLocaleTimeString()
    startAutoRefresh()
  } catch (e) {
    console.error('Fetch error:', e)
    error.value = true
    stats.value = null
    campaignIdLoaded.value = ''
    stopAutoRefresh()
  } finally {
    loading.value = false
  }
}

function startAutoRefresh() {
  stopAutoRefresh()
  refreshInterval = setInterval(async () => {
    if (!campaignIdLoaded.value) return
    
    try {
      const response = await api.getCampaignStats(campaignIdLoaded.value)
      stats.value = response.data
      connectionStatus.value = 'connected'
      lastUpdatedText.value = new Date().toLocaleTimeString()
    } catch (e) {
      console.error('Auto-refresh error:', e)
      connectionStatus.value = 'disconnected'
    }
  }, 5000)
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

onUnmounted(() => {
  stopAutoRefresh()
  simulating.value = false
})

function getRate(part, total) {
  if (!total || total === 0) return '0.0'
  return ((part / total) * 100).toFixed(1)
}

// In-Browser Load Simulator Helper Methods
function toggleSimPanel() {
  showSimPanel.value = !showSimPanel.value
}

function getSimEventType() {
  const rand = Math.random() * 100
  if (rand < 60) return 'sent'
  if (rand < 85) return 'opened'
  if (rand < 95) return 'clicked'
  return 'bounced'
}

async function runSimulation() {
  if (simulating.value || !campaignIdLoaded.value) return
  
  simulating.value = true
  simCompleted.value = false
  simSent.value = 0
  simSuccess.value = 0
  simDuplicates.value = 0
  simErrors.value = 0
  
  const total = simCount.value
  const campaign = campaignIdLoaded.value
  const includeDupes = simIncludeDuplicates.value
  const cachedEventIds = []
  
  const batchSize = 5
  
  for (let i = 0; i < total; i += batchSize) {
    if (!simulating.value) break
    
    const promises = []
    for (let j = 0; j < batchSize && (i + j) < total; j++) {
      let eventId
      if (includeDupes && cachedEventIds.length > 5 && Math.random() * 100 < 15) {
        eventId = cachedEventIds[Math.floor(Math.random() * cachedEventIds.length)]
      } else {
        eventId = `evt-sim-${Math.floor(Math.random() * 1e12).toString(16)}-${Date.now()}`
        cachedEventIds.push(eventId)
      }
      
      const payload = {
        event_id: eventId,
        campaign_id: campaign,
        type: getSimEventType(),
        timestamp: new Date().toISOString()
      }
      
      promises.push(
        api.ingestEvent(payload)
          .then(res => {
            simSent.value++
            if (res.data && res.data.success) {
              if (res.data.duplicate) {
                simDuplicates.value++
              } else {
                simSuccess.value++
              }
            } else {
              simErrors.value++
            }
          })
          .catch(() => {
            simSent.value++
            simErrors.value++
          })
      )
    }
    
    await Promise.all(promises)
    await new Promise(resolve => setTimeout(resolve, 80))
  }
  
  simulating.value = false
  simCompleted.value = true
  
  // Immediately refresh statistics upon simulation completion
  try {
    const response = await api.getCampaignStats(campaign)
    stats.value = response.data
    lastUpdatedText.value = new Date().toLocaleTimeString()
  } catch (e) {
    console.error('Post-simulation stats retrieval failed:', e)
  }
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

:root {
  --bg-gradient: linear-gradient(135deg, #090616 0%, #11092a 50%, #030107 100%);
  --panel-bg: rgba(255, 255, 255, 0.02);
  --panel-border: rgba(255, 255, 255, 0.05);
  --accent-color: #6366f1;
  --accent-glow: rgba(99, 102, 241, 0.25);
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --primary-glow: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  
  --sent-color: #3b82f6;
  --opened-color: #10b981;
  --clicked-color: #f59e0b;
  --bounced-color: #ef4444;
}

body {
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  background: var(--bg-gradient);
  color: var(--text-primary);
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 40px 20px;
  box-sizing: border-box;
}

#app {
  width: 100%;
  max-width: 900px;
}

.dashboard-container {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.dashboard-header {
  text-align: center;
}

.logo-area {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.logo-icon {
  font-size: 2.2rem;
}

.dashboard-header h1 {
  font-size: 2.4rem;
  font-weight: 700;
  margin: 0;
  background: var(--primary-glow);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 1.1rem;
  margin-top: 8px;
  margin-bottom: 0;
}

.card {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  padding: 24px;
}

.control-panel {
  display: flex;
  flex-direction: column;
  gap: 15px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
}

.search-box {
  display: flex;
  gap: 12px;
}

.campaign-input {
  flex-grow: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 14px 20px;
  color: #fff;
  font-size: 1rem;
  outline: none;
  transition: all 0.3s ease;
  font-family: inherit;
}

.campaign-input:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 15px var(--accent-glow);
  background: rgba(255, 255, 255, 0.08);
}

.btn-primary {
  background: var(--primary-glow);
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 0 28px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  font-family: inherit;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Status Panel */
.status-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 5px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 12px;
}

.realtime-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pulse-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.pulse-indicator.connected {
  background-color: var(--opened-color);
  box-shadow: 0 0 8px var(--opened-color);
  animation: pulse 2s infinite;
}

.pulse-indicator.connecting {
  background-color: var(--clicked-color);
  box-shadow: 0 0 8px var(--clicked-color);
  animation: pulse 1s infinite;
}

.pulse-indicator.disconnected {
  background-color: var(--bounced-color);
  box-shadow: 0 0 8px var(--bounced-color);
  animation: pulse 0.5s infinite;
}

.status-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.last-updated {
  font-family: monospace;
  opacity: 0.8;
}

/* Empty State / Welcome States */
.empty-state-panel {
  text-align: center;
  padding: 45px 30px;
  border: 1px dashed rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.01);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-state-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.1));
}

.empty-state-panel h3 {
  margin: 0 0 10px 0;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--text-primary);
}

.empty-state-panel p {
  margin: 0 0 5px 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
  max-width: 480px;
  line-height: 1.5;
}

.empty-state-action {
  font-size: 0.85rem !important;
  color: var(--accent-color) !important;
  margin-top: 15px !important;
  font-weight: 500;
}

.welcome-state {
  border-style: solid;
}

/* In-Browser Load Simulation Panel Styling */
.simulation-panel {
  border: 1px solid var(--panel-border);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.simulation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.sim-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sim-icon {
  font-size: 1.25rem;
}

.sim-title h2 {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0;
}

.collapse-arrow {
  font-size: 0.8rem;
  color: var(--text-secondary);
  transition: transform 0.2s ease;
}

.simulation-body {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.sim-desc {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0 0 15px 0;
}

.sim-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
  background: rgba(255, 255, 255, 0.02);
  padding: 14px 20px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.sim-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sim-field label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sim-select {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px 12px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
}

.checkbox-field {
  flex-direction: row !important;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-field input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--accent-color);
  cursor: pointer;
}

.checkbox-field label {
  text-transform: none;
  font-size: 0.9rem;
  letter-spacing: 0;
  cursor: pointer;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  border-radius: 8px;
  padding: 8px 16px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  transition: all 0.2s ease;
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sim-progress-area {
  margin-top: 15px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sim-progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  overflow: hidden;
}

.sim-progress-fill {
  height: 100%;
  background: var(--primary-glow);
  border-radius: 3px;
  transition: width 0.1s ease;
}

.sim-stats {
  display: flex;
  justify-content: flex-start;
  gap: 20px;
  font-size: 0.8rem;
  font-family: monospace;
  color: var(--text-secondary);
}

.sim-stat-success { color: var(--opened-color); }
.sim-stat-duplicate { color: var(--clicked-color); }
.sim-stat-error { color: var(--bounced-color); }

/* Dashboard content */
.dashboard-active-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.performance-panel h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 20px;
}

.progress-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 18px;
}

.progress-container:last-child {
  margin-bottom: 0;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.progress-bar-bg {
  height: 8px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-bar-fill.opened { background-color: var(--opened-color); }
.progress-bar-fill.clicked { background-color: var(--clicked-color); }
.progress-bar-fill.bounced { background-color: var(--bounced-color); }

/* Alert Box */
.alert-box {
  display: flex;
  gap: 15px;
  align-items: flex-start;
}

.alert-box.error {
  border-left: 4px solid var(--bounced-color);
  background: rgba(239, 68, 68, 0.02);
}

.alert-icon {
  font-size: 1.5rem;
}

.alert-content h4 {
  margin: 0 0 6px 0;
  color: var(--text-primary);
  font-size: 1rem;
}

.alert-content p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.4;
}

/* Animations */
@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.6; }
  100% { transform: scale(1); opacity: 1; }
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>