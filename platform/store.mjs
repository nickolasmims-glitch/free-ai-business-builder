import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = process.env.OWNER_CLOUD_DATA_DIR || path.resolve("platform/data");
const STATE_FILE = path.join(DATA_DIR, "state.json");

const initialState = {
  version: 1,
  updatedAt: null,
  workers: {
    ai2: { required: true, status: "NOT_STARTED", heartbeatAt: null, lastRunId: null, lastError: null },
    ai3: { required: true, status: "NOT_STARTED", heartbeatAt: null, lastRunId: null, lastError: null }
  },
  runs: [],
  incidents: [],
  guardian: { lastMessageAt: null, lastMessage: null },
  business: {
    traffic: { liveVisitors: 0, impressions: 0, pageViews: 0, uniqueVisitors: 0, conversions: 0, sources: {} },
    payments: { grossRevenueUsd: 0, successfulPayments: 0, refundsUsd: 0, feesUsd: 0, netRevenueUsd: 0, transactions: [] },
    customers: { ageGroups: {}, purchases: 0 },
    offers: {},
    updatedAt: null
  }
};

let writeQueue = Promise.resolve();

async function ensure() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try { await fs.access(STATE_FILE); }
  catch { await fs.writeFile(STATE_FILE, JSON.stringify(initialState, null, 2)); }
}

export async function readState() {
  await ensure();
  const raw = await fs.readFile(STATE_FILE, "utf8");
  return JSON.parse(raw);
}

export async function writeState(next) {
  writeQueue = writeQueue.then(async () => {
    await ensure();
    next.updatedAt = new Date().toISOString();
    const tmp = STATE_FILE + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(next, null, 2));
    await fs.rename(tmp, STATE_FILE);
  });
  return writeQueue;
}

export async function updateState(mutator) {
  const state = await readState();
  const next = await mutator(state) || state;
  await writeState(next);
  return next;
}
