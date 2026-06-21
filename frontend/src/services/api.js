import axios from 'axios';

// Create an Axios instance with the base URL configured for the backend REST endpoints
const apiClient = axios.create({
  baseURL: 'http://localhost/MailerCloud/backend',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default {
  /**
   * Fetch campaign stats from backend API campaigns/{id}/stats
   * @param {string} campaignId 
   * @returns {Promise}
   */
  getCampaignStats(campaignId) {
    return apiClient.get(`/campaigns/${encodeURIComponent(campaignId.trim())}/stats`);
  },

  /**
   * Push a single engagement event to the ingestion server
   * @param {object} eventData 
   * @returns {Promise}
   */
  ingestEvent(eventData) {
    return apiClient.post('/events', eventData);
  }
};
