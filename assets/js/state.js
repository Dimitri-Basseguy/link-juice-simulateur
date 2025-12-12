export const state = {
  titles: [],
  articleTags: [],
  tags: [
    { name: "B2C", color: "#7dffb2" },
    { name: "B2B", color: "#ffcc66" },
    { name: "Autre", color: "#cfd7ff" }
  ],
  links: []
};

// sélection multi-articles
export let selectedArticles = new Set();
export function setSelectedArticles(nextSet) {
  selectedArticles = nextSet;
}
