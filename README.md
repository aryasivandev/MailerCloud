# MailerCloud - Ingestion Service & Live Dashboard

A high-performance system to ingest email engagement events and display campaign stats in real time.

---

## 🚀 Quick Start (Setup in 3 Steps)

### Step 1: Set up the Database
1. Open XAMPP and start **Apache** and **MySQL**.
2. Run this command in your terminal to create the database and tables:
   ```bash
   mysql -u root < backend/sql/schema.sql
   ```

### Step 2: Seed Test Data (Optional)
To insert some test data for campaign `123` so you can see numbers immediately on the dashboard, run:
```bash
mysql -u root -e "INSERT INTO mailercloud.campaign_stats (campaign_id, sent_count, opened_count, clicked_count, bounced_count) VALUES ('123', 1000, 450, 200, 5);"
```

### Step 3: Run the Frontend
1. Open a terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies and start the app:
   ```bash
   npm install
   npm run dev
   ```
3. Open the URL shown in your terminal (usually `http://localhost:5175/`) in your browser.

---

## 🧪 How to Test Ingestion (using Curl)

Open your terminal and run these commands to test the API directly:

### 1. Send a new event (Sent count increases)
```bash
curl -i -X POST -H "Content-Type: application/json" -d "{\"event_id\":\"evt-001\",\"campaign_id\":\"camp-999\",\"type\":\"sent\",\"timestamp\":\"2026-06-21T10:00:00Z\"}" http://localhost/MailerCloud/backend/events
```
*Response:* `{"success":true,"duplicate":false}`

### 2. Send the same event again (Deduplication prevents double-counting)
```bash
curl -i -X POST -H "Content-Type: application/json" -d "{\"event_id\":\"evt-001\",\"campaign_id\":\"camp-999\",\"type\":\"sent\",\"timestamp\":\"2026-06-21T10:00:00Z\"}" http://localhost/MailerCloud/backend/events
```
*Response:* `{"success":true,"duplicate":true}` *(Count is NOT incremented).*

### 3. Check stats for `camp-999`
```bash
curl -i http://localhost/MailerCloud/backend/campaigns/camp-999/stats
```
*Response:* `{"sent":1,"opened":0,"clicked":0,"bounced":0}`

---

## 💡 How it Works & Design Decisions

1. **Pre-Aggregated Stats (`campaign_stats` table)**:
   Instead of counting millions of raw events every time someone loads the dashboard, we update pre-aggregated counters during ingestion. This makes loading the dashboard instant (`O(1)` complexity).
2. **Duplicate Prevention**:
   The `events` table has a `UNIQUE(event_id)` key. If a duplicate event arrives (e.g. due to network retries), the database rejects the insert, and we skip updating the counters.
3. **PDO & Prepared Statements**:
   Built using raw PHP 8 and PDO with prepared statements to prevent SQL Injection and ensure transaction safety.

---

## 📈 Scaling to 20,000 events/second (Architecture Discussion)

To handle peak loads of 20,000 events/sec or 2 million events/min without losing data:
1. **Decouple with Message Queues (Kafka / Redis Streams)**:
   Instead of writing directly to MySQL in the HTTP request (which blocks connections), the API puts events into a message queue and returns `202 Accepted` immediately (takes < 3ms).
2. **Fast Deduplication Cache (Redis)**:
   API nodes check event uniqueness in Redis in-memory cache using `SET event_id EX 86400 NX` at 100,000+ ops/sec before queueing them.
3. **Batch DB Workers**:
   Background consumer processes fetch events in batches of 2,000 and run bulk `INSERT IGNORE` and bulk `ON DUPLICATE KEY UPDATE` queries to MySQL, reducing disk I/O commit overhead by **99.9%**.
4. **Dead Letter Queue (DLQ)**:
   Failed writes are sent to a DLQ for retry/recovery so no events are ever lost.
