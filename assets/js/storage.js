import { uniqByName } from "./utils.js";
import { createDefaultTags } from "./state.js";

const LS_KEY = "lj_tw_customtags_v1";

function normalizeState(state) {
  state.titles = Array.isArray(state.titles)
    ? state.titles.map(t => (typeof t === "string" ? t : String(t ?? ""))).map(t => t.trim()).filter(Boolean)
    : [];

  state.tags = Array.isArray(state.tags)
    ? uniqByName(state.tags.map(t => ({
        name: typeof t?.name === "string" ? t.name.trim() : "",
        color: typeof t?.color === "string" ? t.color : "#cfd7ff"
      })).filter(t => t.name))
    : [];

  if (state.tags.length === 0) {
    state.tags = createDefaultTags();
  }

  const defaultTag = state.tags[0].name;
  const tagNames = new Set(state.tags.map(t => t.name));

  state.articleTags = Array.isArray(state.articleTags) ? state.articleTags.slice(0, state.titles.length) : [];
  while (state.articleTags.length < state.titles.length) state.articleTags.push(defaultTag);
  state.articleTags = state.articleTags.map(t => tagNames.has(t) ? t : defaultTag);

  const n = state.titles.length;
  state.links = Array.isArray(state.links) ? state.links : [];
  state.links = state.links
    .filter(l => l && Number.isInteger(l.from) && Number.isInteger(l.to) && l.from >= 0 && l.to >= 0 && l.from < n && l.to < n)
    .map(l => {
      const weight = Number(l.weight);
      return {
        from: l.from,
        to: l.to,
        type: l.type === "pillar" ? "pillar" : "classic",
        weight: Number.isFinite(weight) && weight > 0 ? weight : 1
      };
    });
}

export function saveToLocalStorage(state) {
  normalizeState(state);
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

export function loadFromLocalStorage(state) {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return;

  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return;

    state.titles = Array.isArray(obj.titles) ? obj.titles : [];
    state.articleTags = Array.isArray(obj.articleTags) ? obj.articleTags : [];
    state.tags = Array.isArray(obj.tags) ? obj.tags : [];
    state.links = Array.isArray(obj.links) ? obj.links : [];
    normalizeState(state);
  } catch {}
}

export function exportStateToFile(state) {
  const snapshot = JSON.parse(JSON.stringify(state));
  normalizeState(snapshot);
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    state: snapshot
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `maillage-seo-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importStateFromFile(file, state, ensureArticleTags) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No file"));

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const incoming = parsed && parsed.state ? parsed.state : parsed;

        if (!incoming || !Array.isArray(incoming.titles)) {
          return reject(new Error("Invalid structure"));
        }

        state.titles = incoming.titles || [];
        state.articleTags = incoming.articleTags || [];
        state.tags = uniqByName(incoming.tags || []);
        state.links = incoming.links || [];

        normalizeState(state);
        ensureArticleTags();

        resolve(true);
      } catch (err) {
        reject(err);
      }
    };

    reader.readAsText(file);
  });
}
