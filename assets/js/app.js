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
    "Les Trois Lois de la Robotique : fondements et dilemmes",
    "Psychohistoire : science et prédiction dans Fondation",
    "L’Empire Galactique : essor, chute et renaissance",
    "Les Robots positroniques : évolution et société",
    "La Terre face à la crise radioactive",
    "Daneel Olivaw : l’androïde derrière l’Histoire",
    "La psychohistoire peut-elle échouer ?",
    "La Première Fondation : science contre religion"
  ];

  // On vide les tags avant d'ajouter ceux de l'exemple
  state.tags = [];
  const needed = [
    { name: "Robotique", color: "#7dffb2" },
    { name: "Psychohistoire", color: "#ffcc66" },
    { name: "Empire", color: "#cfd7ff" }
  ];
  for (const t of needed) {
    state.tags.push(t);
  }

  state.articleTags = [
    "Robotique",
    "Psychohistoire",
    "Empire",
    "Robotique",
    "Empire",
    "Robotique",
    "Psychohistoire",
    "Empire"
  ];
  state.links = [
    // Liens existants
    { from: 0, to: 3, type: "pillar", weight: 1 }, // Robotique -> Robotique
    { from: 1, to: 6, type: "pillar", weight: 1 }, // Psychohistoire -> Psychohistoire
    { from: 2, to: 4, type: "pillar", weight: 1 }, // Empire -> Empire
    { from: 5, to: 0, type: "classic", weight: 1 }, // Robotique -> Robotique
    { from: 6, to: 1, type: "classic", weight: 1 }, // Psychohistoire -> Psychohistoire
    { from: 7, to: 2, type: "pillar", weight: 1 }, // Empire -> Empire
    { from: 3, to: 5, type: "classic", weight: 1 }, // Robotique -> Robotique
    // Liens entre tags différents
    { from: 0, to: 1, type: "classic", weight: 1 }, // Robotique -> Psychohistoire
    { from: 1, to: 2, type: "classic", weight: 1 }, // Psychohistoire -> Empire
    { from: 2, to: 0, type: "classic", weight: 1 }, // Empire -> Robotique
    { from: 4, to: 6, type: "pillar", weight: 1 }, // Empire -> Psychohistoire
    { from: 5, to: 7, type: "classic", weight: 1 }, // Robotique -> Empire
    { from: 6, to: 3, type: "classic", weight: 1 }, // Psychohistoire -> Robotique
    { from: 7, to: 4, type: "pillar", weight: 1 }  // Empire -> Empire
  ];

  saveAndRender();
}

function wire() {
  $("addTitles").addEventListener("click", () => addTitlesFromTextarea(state, saveAndRender));
  $("addTagBtn").addEventListener("click", () => addTagFromInputs(state, saveAndRender));
  $("addLink").addEventListener("click", () => addLinkFromInputs(state, saveAndRender));

  $("clearLinks").addEventListener("click", () => { state.links = []; saveAndRender(); });
  $("resetAll").addEventListener("click", () => {
    if (!confirm("Tout réinitialiser ? Articles, liens et tags seront supprimés.")) return;

    // reset contenu
    state.titles = [];
    state.articleTags = [];
    state.links = [];

    // reset tags (état par défaut)
    state.tags = [
      { name: "Tag1", color: "#7dffb2" },
      { name: "Tag2", color: "#ffcc66" },
      { name: "Autre", color: "#cfd7ff" }
    ];

    // reset sélection
    selectedArticles.clear();

    saveToLocalStorage(state);
    renderAll();
  });
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
