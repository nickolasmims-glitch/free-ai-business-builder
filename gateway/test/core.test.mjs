import test from "node:test";
import assert from "node:assert/strict";
import { lotterySignal } from "../lottery.mjs";
import { ensureCoreAgents } from "../agents.mjs";

test("lottery signal stays within 1-10 and is explicitly heuristic", () => {
  const r = lotterySignal("Powerball", []);
  assert.ok(r.signal >= 1 && r.signal <= 10);
  assert.match(r.basis, /research|heuristic|probability/i);
});

test("core AI2 and AI3 agents are present and active", () => {
  const state = { bots: [] };
  ensureCoreAgents(state);
  assert.deepEqual(state.bots.map(x => x.name), ["AI2", "AI3"]);
  assert.ok(state.bots.every(x => x.status === "active"));
});
