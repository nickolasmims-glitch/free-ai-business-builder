export const WORKER_STATES = Object.freeze({
  NOT_STARTED: "NOT_STARTED",
  STARTING: "STARTING",
  RUNNING: "RUNNING",
  COMPLETE: "AI_COMPLETE",
  FAILED: "FAILED",
  RESTARTING: "RESTARTING"
});

export function workerSnapshot({ worker, status, runId = null, error = null }) {
  return {
    worker,
    status,
    runId,
    error: error ? String(error).slice(0, 2000) : null,
    heartbeatAt: new Date().toISOString()
  };
}
