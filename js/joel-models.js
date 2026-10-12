// The public JoelAI Pro choices and their current AI Gateway model IDs.
// Keep this list small and explicit: the server only accepts these aliases.
export const JOEL_MODELS = [
  { id: "handbook", name: "Handbook Pro", detail: "Longer answers · works everywhere", model: null },
  { id: "joel-tiny", name: "Joel-TinyLlama", detail: "TinyLlama-1.1B · runs in your browser · free", model: null, local: true },
  { id: "joel-3.3", name: "Joel-3.3", detail: "GPT-6 Luna · Default", model: "openai/gpt-6-luna" },
  { id: "joel-3.3-fast", name: "Joel-3.3 Quick", detail: "GPT-6 Luna Fast", model: "openai/gpt-6-luna-fast" },
  { id: "joel-3.3-think", name: "Joel-3.3 Think", detail: "GPT-6 Sol", model: "openai/gpt-6-sol" }
];

// Joel-3.3 is the default model. Where the model server is not reachable the page uses Handbook Pro instead (see joelwallet.js).
export const JOEL_MODEL_DEFAULT = "joel-3.3";
