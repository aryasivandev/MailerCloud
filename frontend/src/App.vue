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
          placeholder="Enter Campaign ID (e.g. camp-1)"
          @keyup.enter="getStats"
          class="campaign-input"
        />
        <button @click="getStats" class="btn-primary" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          <span>{{ loading ? 'Updating...' : 'Fetch Stats' }}</span>
        </button>
      </div>
      <div class="realtime-status" v-if="stats">
        <span class="pulse-indicator"></span>
        <span class="status-text">Connected to live stats (auto-refreshing every 5s)</span>
      </div>
    </div>

    <!-- Error state -->
    <div v-if="error" class="alert-box error card">
      <div class="alert-icon">⚠️</div>
      <div class="alert-content">
        <h4>Request Failed</h4>
        <p>Could not load statistics. Ensure XAMPP is running, the database is configured, and CORS is allowed.</p>
      </div>
    </div>

    <!-- Main Stats Dashboard -->
    <div v-if="stats" class="stats-grid">
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
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import StatsCard from './components/StatsCard.vue'
import api from './services/api'

const campaignId = ref('')
const stats = ref(null)
const loading = ref(false)
const error = ref(false)
let refreshInterval = null

async function getStats() {
  if (!campaignId.value.trim()) return

  loading.value = true
  error.value = false

  try {
    const response = await api.getCampaignStats(campaignId.value)
    stats.value = response.data
    // Start auto-refreshing once stats are loaded successfully
    startAutoRefresh()
  } catch (e) {
    console.error('Fetch error:', e)
    error.value = true
    stopAutoRefresh()
  } finally {
    loading.value = false
  }
}

function startAutoRefresh() {
  stopAutoRefresh()
  refreshInterval = setInterval(async () => {
    try {
      const response = await api.getCampaignStats(campaignId.value)
      stats.value = response.data
    } catch (e) {
      console.error('Auto-refresh error:', e)
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
})

function getRate(part, total) {
  if (!total || total === 0) return '0.0'
  return ((part / total) * 100).toFixed(1)
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

.realtime-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pulse-indicator {
  width: 8px;
  height: 8px;
  background-color: var(--opened-color);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--opened-color);
  animation: pulse 2s infinite;
}

.status-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
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