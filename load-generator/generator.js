#!/usr/bin/env node

/**
 * MailerCloud Load Generator
 * A standalone CLI tool to simulate email engagement events.
 * 
 * Usage:
 *   node load-generator/generator.js [options]
 * 
 * Options:
 *   --campaign <id>      Campaign ID to generate events for (default: camp-test)
 *   --total <number>      Total number of events to send (default: 1000)
 *   --concurrency <num>   Number of parallel requests (default: 10)
 *   --delay <ms>          Delay between requests in milliseconds per worker (default: 0)
 *   --url <endpoint>      The event ingestion endpoint URL (default: http://localhost/MailerCloud/backend/events)
 *   --duplicates <pct>    Percentage of events to be duplicates (default: 10)
 *   --help, -h            Show this help menu
 */

const args = process.argv.slice(2);
const params = {
  campaign: 'camp-test',
  total: 1000,
  concurrency: 10,
  delay: 0,
  url: 'http://localhost/MailerCloud/backend/events',
  duplicates: 10,
  help: false
};

// Parse command line arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--help' || arg === '-h') {
    params.help = true;
  } else if (arg === '--campaign' && args[i + 1]) {
    params.campaign = args[++i];
  } else if (arg === '--total' && args[i + 1]) {
    params.total = parseInt(args[++i], 10);
  } else if (arg === '--concurrency' && args[i + 1]) {
    params.concurrency = parseInt(args[++i], 10);
  } else if (arg === '--delay' && args[i + 1]) {
    params.delay = parseInt(args[++i], 10);
  } else if (arg === '--url' && args[i + 1]) {
    params.url = args[++i];
  } else if (arg === '--duplicates' && args[i + 1]) {
    params.duplicates = parseInt(args[++i], 10);
  }
}

if (params.help) {
  console.log(`
MailerCloud Load Generator - CLI Usage
-------------------------------------
Options:
  --campaign <id>      Campaign ID to generate events for (default: ${params.campaign})
  --total <number>      Total number of events to send (default: ${params.total})
  --concurrency <num>   Number of parallel requests (default: ${params.concurrency})
  --delay <ms>          Delay between requests in milliseconds per worker (default: ${params.delay})
  --url <endpoint>      The event ingestion endpoint URL (default: ${params.url})
  --duplicates <pct>    Percentage of events to be duplicates (default: ${params.duplicates}%)

Example:
  node load-generator/generator.js --campaign camp-999 --total 5000 --concurrency 25
`);
  process.exit(0);
}

// Generate a random event type based on a realistic distribution
function getRandomEventType() {
  const rand = Math.random() * 100;
  if (rand < 60) return 'sent';      // 60% Sent
  if (rand < 85) return 'opened';    // 25% Opened
  if (rand < 95) return 'clicked';   // 10% Clicked
  return 'bounced';                  // 5% Bounced
}

// Generate random Hex-based UUID format
function generateEventId() {
  return `evt-${Math.floor(Math.random() * 1e16).toString(16)}-${Date.now()}`;
}

let totalSent = 0;
let successCount = 0;
let duplicateCount = 0;
let errorCount = 0;
const eventIdsBuffer = [];

async function sendEvent(workerId, index) {
  let eventId;
  let isDuplicate = false;

  // Simulate duplicates by reusing an existing event ID from the buffer
  if (params.duplicates > 0 && eventIdsBuffer.length > 5 && Math.random() * 100 < params.duplicates) {
    eventId = eventIdsBuffer[Math.floor(Math.random() * eventIdsBuffer.length)];
    isDuplicate = true;
  } else {
    eventId = generateEventId();
    // Cache the event ID for future duplicates, keeping buffer size capped
    if (eventIdsBuffer.length < 1000) {
      eventIdsBuffer.push(eventId);
    } else {
      eventIdsBuffer[Math.floor(Math.random() * eventIdsBuffer.length)] = eventId;
    }
  }

  const payload = {
    event_id: eventId,
    campaign_id: params.campaign,
    type: getRandomEventType(),
    timestamp: new Date().toISOString()
  };

  try {
    const res = await fetch(params.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        if (data.duplicate) {
          duplicateCount++;
        } else {
          successCount++;
        }
      } else {
        errorCount++;
      }
    } else {
      errorCount++;
    }
  } catch (err) {
    errorCount++;
  }
}

async function runWorker(workerId) {
  while (true) {
    // Check if we reached the limit
    if (totalSent >= params.total) {
      break;
    }
    
    // Reserve next spot
    const currentEventIndex = totalSent;
    totalSent++;
    
    if (currentEventIndex >= params.total) {
      break;
    }

    await sendEvent(workerId, currentEventIndex);

    if (params.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, params.delay));
    }
  }
}

async function main() {
  console.log(`Starting load simulation for campaign "${params.campaign}"...`);
  console.log(`Target:       ${params.total} events`);
  console.log(`Concurrency:  ${params.concurrency} concurrent workers`);
  console.log(`URL:          ${params.url}`);
  console.log(`Duplicates:   ${params.duplicates}%\n`);

  const startTime = Date.now();
  
  // Start the UI updater
  const updateInterval = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    const completed = successCount + duplicateCount + errorCount;
    const rps = elapsed > 0 ? (completed / elapsed).toFixed(1) : 0;
    const percent = ((completed / params.total) * 100).toFixed(1);
    
    // Draw simple text-based progress bar
    const barWidth = 20;
    const filledWidth = Math.min(barWidth, Math.round((completed / params.total) * barWidth));
    const emptyWidth = Math.max(0, barWidth - filledWidth);
    const bar = '█'.repeat(filledWidth) + '░'.repeat(emptyWidth);

    process.stdout.write(
      `\r[${bar}] ${percent}% | Processed: ${completed}/${params.total} | Success: ${successCount} | Duplicates: ${duplicateCount} | Errors: ${errorCount} | Speed: ${rps} req/s`
    );
  }, 100);

  // Spin up parallel workers
  const workers = [];
  for (let i = 0; i < params.concurrency; i++) {
    workers.push(runWorker(i));
  }

  // Wait for all workers to finish
  await Promise.all(workers);
  
  clearInterval(updateInterval);
  const elapsed = (Date.now() - startTime) / 1000;
  const completed = successCount + duplicateCount + errorCount;
  
  // Print final clean output on new line
  process.stdout.write('\r' + ' '.repeat(100) + '\r'); // clear line
  console.log('--- Simulation Completed ---');
  console.log(`Duration:         ${elapsed.toFixed(2)}s`);
  console.log(`Total Requests:   ${completed}`);
  console.log(`Success (New):    ${successCount}`);
  console.log(`Deduplicated:     ${duplicateCount}`);
  console.log(`Failed/Error:     ${errorCount}`);
  console.log(`Average Rate:     ${(completed / elapsed).toFixed(1)} req/s`);
  console.log('----------------------------\n');
}

main().catch(err => {
  console.error('Fatal load generator error:', err);
});
