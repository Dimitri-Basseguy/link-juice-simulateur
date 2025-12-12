import { uniqByName } from "./utils.js";

const LS_KEY = "lj_tw_customtags_v1";

export function saveToLocalStorage(state) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

export function loadFromLocalStorage(state) {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return;

  try {
    const obj = JSON.parse(raw);
    if (obj && Array.isArray(obj.titles) && Array.isArray(obj.articleTags) && Array.isArray(obj.tags) && Array.isArray(obj.links)) {
      state.titles = obj.titles;
      state.articleTags = obj.articleTags;
      state.tags = uniqByName(obj.tags);
      state.links = obj.links;
    }
  } catch {}
}

export function exportStateToFile(state) {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    state
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

        if (!incoming || !Array.isArray(incoming.titles) || !Array.isArray(incoming.links)) {
          return reject(new Error("Invalid structure"));
        }

        state.titles = incoming.titles || [];
        state.articleTags = incoming.articleTags || [];
        state.tags = uniqByName(incoming.tags || []);
        state.links = incoming.links || [];

        ensureArticleTags();

        resolve(true);
      } catch (err) {
        reject(err);
      }
    };

    reader.readAsText(file);
  });
}
