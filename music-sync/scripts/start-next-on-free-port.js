#!/usr/bin/env node
"use strict";

/*
Auto-port Next.js dev launcher
- Scans a port range for the first free port and starts Next.js dev on that port.
- Behavior is configurable via environment variables.
*/

const net = require('net');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT_MIN = parseInt(process.env.PORT_MIN ?? '3000', 10);
const PORT_MAX = parseInt(process.env.PORT_MAX ?? String(PORT_MIN), 10);
const OPEN_BROWSER = (process.env.OPEN_BROWSER ?? 'true').toLowerCase() === 'true';
const OPEN_DELAY_MS = parseInt(process.env.OPEN_DELAY_MS ?? '1500', 10);
const CLEAN_LOCKS = (process.env.CLEAN_LOCKS ?? 'false').toLowerCase() === 'true';
const DEBUG = (process.env.DEBUG ?? 'false').toLowerCase() === 'true';
const DRY_RUN = (process.env.DRY_RUN ?? 'false').toLowerCase() === 'true';

const LOCK_PATH = path.resolve(process.cwd(), '.next', 'dev', 'lock');

function log(...args) {
  if (DEBUG) console.log('[auto-port] ', ...args);
}

function checkPortFree(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', (err) => {
        // If in use or any error, consider it not free
        tester.close();
        resolve(false);
      })
      .once('listening', () => {
        tester.close();
        resolve(true);
      })
      .on('error', () => {
        resolve(false);
      });
    tester.listen(port, '127.0.0.1');
  });
}

async function findFreePort(min, max) {
  for (let p = min; p <= max; p++) {
    // eslint-disable-next-line no-await-in-loop
    const free = await checkPortFree(p);
    if (free) {
      return p;
    }
  }
  return null;
}

async function openBrowser(url) {
  const cmd = (() => {
    switch (process.platform) {
      case 'win32': return `start \"\" \"${url}\"`;
      case 'darwin': return `open \"${url}\"`;
      default: return `xdg-open \"${url}\"`;
    }
  })();
  try {
    if (DEBUG) log('opening browser with', cmd);
    return new Promise((resolve) => {
      exec(cmd, (err) => {
        resolve(!err);
      });
    });
  } catch (e) {
    return false;
  }
}

async function cleanLock() {
  try {
    if (fs.existsSync(LOCK_PATH)) {
      fs.unlinkSync(LOCK_PATH);
      log('Lock file removed:', LOCK_PATH);
    }
  } catch (e) {
    log('Failed to remove lock:', e?.message);
  }
}

async function main() {
  if (PORT_MIN > PORT_MAX) {
    console.error(`Invalid port range: PORT_MIN=${PORT_MIN} PORT_MAX=${PORT_MAX}`);
    process.exit(1);
  }

  log(`Scanning ports ${PORT_MIN}-${PORT_MAX} for first free port...`);
  const freePort = await findFreePort(PORT_MIN, PORT_MAX);
  if (!freePort) {
    console.error(`No free port found in range ${PORT_MIN}-${PORT_MAX}.`);
    process.exit(1);
  }

  const chosenPort = freePort;
  console.log(`Using port ${chosenPort} for Next.js dev.`);

  if (DRY_RUN) {
    console.log('[DRY RUN] Would run: npx next dev -p ' + chosenPort);
    if (OPEN_BROWSER) console.log('[DRY RUN] Would open browser to http://localhost:' + chosenPort);
    if (CLEAN_LOCKS) console.log('[DRY RUN] Would clean lock at', LOCK_PATH);
    process.exit(0);
  }

  // Clean locks if requested
  if (CLEAN_LOCKS) {
    await cleanLock();
  }

  // Start Next.js on the chosen port
  log('Starting Next.js dev on port', chosenPort);
  const nextDev = spawn('npx', ['next', 'dev', '-p', String(chosenPort)], {
    stdio: 'inherit',
    shell: true,
  });

  nextDev.on('error', (err) => {
    console.error('Failed to start Next.js dev:', err?.message ?? err);
    process.exit(1);
  });

  // Open browser after a delay if requested
  if (OPEN_BROWSER) {
    setTimeout(async () => {
      const url = `http://localhost:${chosenPort}`;
      const opened = await openBrowser(url);
      if (!opened) {
        console.log('Could not automatically open browser. Visit', url);
      }
    }, OPEN_DELAY_MS);
  }
}

main().catch((e) => {
  console.error('Unexpected error in auto-port launcher:', e?.message ?? e);
  process.exit(1);
});
