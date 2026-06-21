<template>
  <div class="stat-card" :class="variant">
    <div class="stat-icon">{{ icon }}</div>
    <div class="stat-info">
      <h3>{{ title }}</h3>
      <p class="stat-val">{{ formatNumber(value) }}</p>
      <span v-if="rate !== null" class="rate-badge" :class="{ danger: variant === 'bounced' }">
        {{ rate }}% {{ rateLabel }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  value: {
    type: Number,
    required: true,
    default: 0
  },
  rate: {
    type: [Number, String],
    default: null
  },
  rateLabel: {
    type: String,
    default: 'Rate'
  },
  variant: {
    type: String,
    default: 'sent'
  },
  icon: {
    type: String,
    default: '📨'
  }
})

function formatNumber(num) {
  if (num === undefined || num === null) return '0'
  return new Intl.NumberFormat().format(num)
}
</script>

<style scoped>
/* Scoped styling for clean layout isolated from parent styling */
.stat-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 24px;
  display: flex;
  align-items: flex-start;
  gap: 18px;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), border-color 0.3s ease;
  backdrop-filter: blur(12px);
}

.stat-card:hover {
  transform: translateY(-6px);
  border-color: rgba(255, 255, 255, 0.15);
}

.stat-icon {
  font-size: 2rem;
  background: rgba(255, 255, 255, 0.03);
  padding: 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-info h3 {
  font-size: 0.95rem;
  color: #94a3b8;
  font-weight: 500;
  margin: 0 0 6px 0;
}

.stat-val {
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.5px;
}

/* Variant styles mapping to specific branding colors */
.sent .stat-val { color: #3b82f6; }
.opened .stat-val { color: #10b981; }
.clicked .stat-val { color: #f59e0b; }
.bounced .stat-val { color: #ef4444; }

.rate-badge {
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  padding: 4px 8px;
  border-radius: 8px;
  margin-top: 8px;
  width: fit-content;
}

.rate-badge.danger {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}
</style>
