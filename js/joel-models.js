// The public JoelAI Pro choices. Keep this list small and explicit: the server only accepts the ids with a `model`.
//  Joel-3.0      the regular JoelAI handbook (the default; free)
//  Joel-2.2/2.4  small server models: the smaller the number, the fewer tokens an answer uses (reply cap + reserve)
//  Joel-3.3 Pro  the Pro handbook (longer answers, timetable facts, a page to explore): a flat JoelToken price per answer
//  Joel-4.3 NEO  TinyLlama in the visitor's browser, with the handbook answer under it: a flat JoelToken price per answer
// The flat prices are mirrored by FLAT in cloud/index.js, which is what actually charges them. Accounts listed under
// "freeModels" in the Control Tower's perks pay nothing for Joel-3.3 Pro and Joel-4.3 NEO.
// The `model` ids for 2.2 and 2.4 are AI Gateway ids: change them here to change the model.
export const JOEL_MODELS = [
  { id: "joel-3.0", name: "Joel-3.0", detail: "Regular JoelAI · free · works everywhere", model: null, kind: "regular" },
  { id: "joel-2.2", name: "Joel-2.2", detail: "Smallest · fewest tokens", model: "openai/gpt-5-nano", maxOut: 150, reserve: 300 },
  { id: "joel-2.4", name: "Joel-2.4", detail: "Small · few tokens", model: "openai/gpt-5-mini", maxOut: 400, reserve: 600 },
  { id: "joel-3.3pro", name: "Joel-3.3 Pro", detail: "Pro handbook · 150 JoelTokens an answer", model: null, kind: "handbook", flat: 150 },
  { id: "joel-4.3neo", name: "Joel-4.3 NEO", detail: "TinyLlama in your browser · 400 JoelTokens an answer", model: null, local: true, flat: 400 }
];

export const JOEL_MODEL_DEFAULT = "joel-3.0";
// choices saved before the rename
export const JOEL_MODEL_RENAMED = { handbook: "joel-3.3pro", "joel-tiny": "joel-4.3neo", "joel-3.3": null, "joel-3.3-fast": null, "joel-3.3-think": null };
