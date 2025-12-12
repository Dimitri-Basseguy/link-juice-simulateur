import { $, uniqByName } from "./utils.js";
import { state, selectedArticles, setSelectedArticles } from "./state.js";
import { loadFromLocalStorage, saveToLocalStorage, exportStateToFile, importStateFromFile } from "./storage.js";
import { computeScores } from "./pagerank.js";
import {
  ensureArticleTags,
  refreshSelects,
  refreshTagCatalog,
  refreshArticleTagsTable,
  refreshLinksTable,
  renderScoreTable,
  addTitlesFromTextarea,
  addTagFromInputs,
  addLinkFromInputs
} from "./ui.js";
import { renderGraph } from "./graph.js";

function paramsFromUI() {
  return {
    damping: $("damping").value,
    iters: $("iters").value,
    pillarBoost: $("pillarBoost").value,
    classicBoost: $("classicBoost").value
  };
}

function saveAndRender() {
  saveToLocalStorage(state);
  renderAll();
}

function deleteArticle(idx) {
  // supprimer article
  state.titles.splice(idx, 1);
  state.articleTags.splice(idx, 1);

  // supprimer liens + réindex
  state.links = state.links
    .filter(l => l.from !== idx && l.to !== idx)
    .map(l => ({
      ...l,
      from: l.from > idx ? l.from - 1 : l.from,
      to: l.to > idx ? l.to - 1 : l.to
    }));

  // maintenir sélection bulk cohérente
  const nextSel = new Set([...selectedArticles]
    .filter(i => i !== idx)
    .map(i => i > idx ? i - 1 : i)
  );
  setSelectedArticles(nextSel);

  saveAndRender();
}

function renderAll() {
  state.tags = uniqByName(state.tags);
  ensureArticleTags(state);

  refreshSelects(state);
  refreshTagCatalog(state, saveAndRender);
  refreshArticleTagsTable(state, saveAndRender);
  refreshLinksTable(state, saveAndRender);

  const scores = computeScores(state, paramsFromUI());
  renderScoreTable(state, scores, deleteArticle);
  renderGraph(state, scores);
}

function loadExample() {
  state.titles = [
    "Comment décrocher une mission intérim rapidement",
    "Pourquoi l’intérim est un choix stratégique pour les entreprises",
    "Recrutement intérim : gérer les pics saisonniers efficacement",
    "RSE et intérim : un levier pour l’insertion et l’impact social",
    "Travail de nuit et intérim, c’est compatible ?",
    "Travailler le week-end en intérim ?",
    "Travailleurs reconnus handicapés : emploi, intérim et insertion",
    "Les avantages d’une agence d’emploi pour votre entreprise"
  ];

  const needed = [
    { name: "B2C", color: "#7dffb2" },
    { name: "B2B", color: "#ffcc66" },
    { name: "Autre", color: "#cfd7ff" }
  ];
  for (const t of needed) {
    if (!state.tags.some(x => x.name === t.name)) state.tags.push(t);
  }
  state.tags = uniqByName(state.tags);

  state.articleTags = ["B2C","B2B","B2B","B2B","B2C","B2C","B2C","B2B"];
  state.links = [
    { from: 4, to: 2, type: "pillar", weight: 1 },
    { from: 5, to: 2, type: "pillar", weight: 1 },
    { from: 6, to: 3, type: "pillar", weight: 1 },
    { from: 7, to: 1, type: "pillar", weight: 1 },
    { from: 2, to: 1, type: "pillar", weight: 1 },
    { from: 0, to: 1, type: "pillar", weight: 1 },
    { from: 0, to: 7, type: "classic", weight: 1 }
  ];

  saveAndRender();
}

function wire() {
  $("addTitles").addEventListener("click", () => addTitlesFromTextarea(state, saveAndRender));
  $("addTagBtn").addEventListener("click", () => addTagFromInputs(state, saveAndRender));
  $("addLink").addEventListener("click", () => addLinkFromInputs(state, saveAndRender));

  $("clearLinks").addEventListener("click", () => { state.links = []; saveAndRender(); });
  $("resetAll").addEventListener("click", () => { state.titles = []; state.articleTags = []; state.links = []; setSelectedArticles(new Set()); saveAndRender(); });
  $("loadExample").addEventListener("click", loadExample);

  $("compute").addEventListener("click", renderAll);
  $("compute2").addEventListener("click", renderAll);

  $("selAllArticles").addEventListener("change", () => {
    const next = new Set();
    if ($("selAllArticles").checked) {
      for (let i = 0; i < state.titles.length; i++) next.add(i);
    }
    setSelectedArticles(next);
    renderAll();
  });

  $("clearSelection").addEventListener("click", () => {
    setSelectedArticles(new Set());
    $("selAllArticles").checked = false;
    renderAll();
  });

  $("applyBulkTag").addEventListener("click", () => {
    const tag = $("bulkTagSelect").value;
    if (!tag) return;
    if (selectedArticles.size === 0) return;

    for (const idx of selectedArticles) {
      if (idx >= 0 && idx < state.articleTags.length) state.articleTags[idx] = tag;
    }
    saveAndRender();
  });

  window.addEventListener("resize", renderAll);

  $("exportState").addEventListener("click", () => exportStateToFile(state));

  $("importState").addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      await importStateFromFile(file, state, () => ensureArticleTags(state));
      saveAndRender();
    } catch (err) {
      console.error(err);
      alert("Impossible de lire le fichier (JSON invalide ou structure).");
    } finally {
      e.target.value = "";
    }
  });
}

loadFromLocalStorage(state);
wire();
renderAll();
