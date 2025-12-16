export const DEFAULT_TAG_NAME = "TAG1";

export function createDefaultTags() {
  return [
    { name: DEFAULT_TAG_NAME, color: "#7dffb2" },
    { name: "TAG2", color: "#ffcc66" },
    { name: "Autres", color: "#cfd7ff" }
  ];
}

export function getDefaultTagName(state) {
  return state.tags[0]?.name || DEFAULT_TAG_NAME;
}

export const state = {
  titles: [],
  articleTags: [],
  tags: createDefaultTags(),
  links: []
};

// sélection multi-articles
export let selectedArticles = new Set();
export function setSelectedArticles(nextSet) {
  selectedArticles = nextSet;
}
