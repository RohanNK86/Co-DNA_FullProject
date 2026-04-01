import { GoogleGenerativeAI } from "@google/generative-ai";

function getApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || String(key).trim().length === 0) {
    const err = new Error(
      'Missing GEMINI_API_KEY. Add it to debtsight-backend/.env (GEMINI_API_KEY="...").'
    );
    err.status = 500;
    throw err;
  }
  return key;
}

function getModelName() {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}

function isModelNotFoundError(e) {
  const msg = String(e?.message || "");
  return (
    msg.includes("404") &&
    (msg.includes("is not found") ||
      msg.includes("not supported") ||
      msg.includes("models/"))
  );
}

let _discoveredModel;
async function discoverWorkingModel() {
  if (_discoveredModel) return _discoveredModel;

  const key = getApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
    key
  )}`;

  const resp = await fetch(url, { method: "GET" });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    const err = new Error(
      `Gemini ListModels failed: ${resp.status} ${resp.statusText} ${text}`.trim()
    );
    err.status = 502;
    throw err;
  }

  const data = await resp.json();
  const models = Array.isArray(data?.models) ? data.models : [];
  const usable = models.filter((m) =>
    Array.isArray(m?.supportedGenerationMethods)
      ? m.supportedGenerationMethods.includes("generateContent")
      : false
  );

  const normalizeName = (fullName) =>
    typeof fullName === "string" ? fullName.replace(/^models\//, "") : "";

  // Prefer fast/cheap models when available.
  const preferredOrder = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
  ];

  for (const pref of preferredOrder) {
    const hit = usable.find((m) => normalizeName(m?.name).startsWith(pref));
    if (hit?.name) {
      _discoveredModel = normalizeName(hit.name);
      return _discoveredModel;
    }
  }

  if (usable[0]?.name) {
    _discoveredModel = normalizeName(usable[0].name);
    return _discoveredModel;
  }

  const err = new Error(
    "No Gemini models available that support generateContent for this API key."
  );
  err.status = 502;
  throw err;
}

async function generateWithModel(modelName, prompt) {
  const model = getClient().getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: Number(process.env.GEMINI_TEMPERATURE ?? 0.2),
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

let _client;
function getClient() {
  if (_client) return _client;
  _client = new GoogleGenerativeAI(getApiKey());
  return _client;
}

export async function generateResponse(prompt) {
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    const err = new Error("Prompt must be a non-empty string.");
    err.status = 500;
    throw err;
  }

  try {
    const primaryModel = getModelName();
    try {
      return await generateWithModel(primaryModel, prompt);
    } catch (e) {
      // If model is invalid (common), auto-discover a working one.
      if (isModelNotFoundError(e)) {
        const discovered = await discoverWorkingModel();
        return await generateWithModel(discovered, prompt);
      }

      throw e;
    }
  } catch (e) {
    // AI failure fallback: keep API stable even when Gemini is unavailable.
    return JSON.stringify({
      explanation: "AI unavailable",
      flowchart: "",
      refactor_plan: [],
    });
  }
}

