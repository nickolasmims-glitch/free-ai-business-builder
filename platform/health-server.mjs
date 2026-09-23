import http from "node:http";
import { readState } from "./store.mjs";

const port = Number(process.env.OWNER_CLOUD_PORT || 8787);

const server = http.createServer(async (req, res) => {
  try {
    const state = await readState();
    const body = JSON.stringify({
      ok: state.workers.ai2.status === "AI_COMPLETE" && state.workers.ai3.status === "AI_COMPLETE",
      service: "OwnerCloud",
      ownerAuthority: "OWNER",
      browserRequiredForWorkers: false,
      workers: state.workers,
      lastRun: state.runs.at(-1) || null
    });
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(body);
  } catch (error) {
    res.writeHead(503, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: String(error) }));
  }
});
server.listen(port, () => console.log(JSON.stringify({ service: "OwnerCloudHealth", port })));
