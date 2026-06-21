-- MailerCloud Analytics Database Schema

CREATE DATABASE IF NOT EXISTS mailercloud;
USE mailercloud;

-- --------------------------------------------------------
-- Table: events
-- Stores raw event logs for auditing and deduplication.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(100) NOT NULL,
    campaign_id VARCHAR(100) NOT NULL,
    event_type ENUM('sent', 'opened', 'clicked', 'bounced') NOT NULL,
    event_timestamp DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- UNIQUE constraint guarantees event idempotency at database level
    UNIQUE KEY idx_unique_event_id (event_id),
    
    -- INDEX on campaign_id for fast audit searches by campaign
    INDEX idx_campaign_id (campaign_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: campaign_stats
-- Stores pre-aggregated stats per campaign for high-performance retrieval.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_stats (
    campaign_id VARCHAR(100) PRIMARY KEY,
    sent_count BIGINT DEFAULT 0,
    opened_count BIGINT DEFAULT 0,
    clicked_count BIGINT DEFAULT 0,
    bounced_count BIGINT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
