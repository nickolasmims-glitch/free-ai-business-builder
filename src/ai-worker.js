import { pipeline } from "@huggingface/transformers";

let generatorPromise = null;
let generating = false;

async function getGenerator(progress_callback) {
  if (!generatorPromise) {
    generatorPromise = (async () => {
      // Prefer WebGPU when available, but keep the app usable on browsers/devices
      // where WebGPU is missing or the GPU model load fails.
      try {
        if (typeof navigator !== "undefined" && navigator.gpu) {
          return await pipeline(
            "text-generation",
            "onnx-community/Qwen2.5-0.5B-Instruct",
            {
              dtype: "q4",
              device: "webgpu",
              progress_callback
            }
          );
        }
      } catch (gpuError) {
        self.postMessage({
          type: "status",
          status: "fallback",
          message: "WebGPU unavailable; switching to browser CPU mode."
        });
      }

      return await pipeline(
        "text-generation",
        "onnx-community/Qwen2.5-0.5B-Instruct",
        {
          dtype: "q4",
          device: "wasm",
          progress_callback
        }
      );
    })();
  }
  return generatorPromise;
}

self.onmessage = async (event) => {
  const { type, prompt } = event.data || {};
  if (type !== "generate") return;

  if (generating) {
    self.postMessage({ type: "status", status: "busy" });
    return;
  }
  generating = true;

  try {
    self.postMessage({ type: "status", status: "loading" });
    const generator = await getGenerator((info) => {
      if (info?.status === "progress") {
        self.postMessage({
          type: "progress",
          progress: Math.max(0, Math.min(100, Number(info.progress || 0)))
        });
      }
    });

    self.postMessage({ type: "status", status: "generating" });

    const messages = [
      {
        role: "system",
        content:
          "You are the local AI engine inside AI Business Builder. Give concise, practical business and content ideas. Never invent real customers, revenue, testimonials, sources, or results. Clearly label assumptions."
      },
      { role: "user", content: prompt }
    ];

    const output = await generator(messages, {
      max_new_tokens: 180,
      do_sample: true,
      temperature: 0.7,
      return_full_text: false
    });

    const text = output?.[0]?.generated_text;
    self.postMessage({
      type: "complete",
      text: typeof text === "string" ? text.trim() : JSON.stringify(text)
    });
  } catch (error) {
    // Allow a later request to retry a failed model load instead of keeping
    // a rejected promise cached forever.
    generatorPromise = null;
    self.postMessage({
      type: "error",
      error: error?.message || "Browser AI could not run on this device."
    });
  } finally {
    generating = false;
  }
};
