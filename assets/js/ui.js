import { $, escapeHtml, sanitizeTitle, uniqByName } from "./utils.js";
import { selectedArticles, setSelectedArticles } from "./state.js";

export function ensureArticleTags(state) {
  const defaultTag = (state.tags[0]?.name) || "B2C";

  while (state.articleTags.length < state.titles.length) state.articleTags.push(defaultTag);
  if (state.articleTags.length > state.titles.length) state.articleTags = state.articleTags.slice(0, state.titles.length);

  const tagNames = new Set(state.tags.map(t => t.name));
  state.articleTags = state.articleTags.map(tn => tagNames.has(tn) ? tn : defaultTag);
}

export function getTag(state, name) {
  return state.tags.find(t => t.name === name) || state.tags[0];
}

export function refreshSelects(state) {
  const opts = state.titles.map((t, i) => `<option value="${i}">${escapeHtml(t)}</option>`).join("");
  $("from").innerHTML = opts;
  $("to").innerHTML = opts;
}

export function refreshTagCatalog(state, onChange) {
  $("legend").innerHTML = state.tags.map(t => `
    <span class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1">
      <span class="h-2 w-2 rounded-full border border-white/20" style="background:${t.color}"></span>
      <span>${escapeHtml(t.name)}</span>
    </span>
  `).join("");

  $("tagCatalogRows").innerHTML = state.tags.map((t, idx) => `
    <tr class="border-b border-white/10">
      <td class="px-3 py-2">${escapeHtml(t.name)}</td>
      <td class="px-3 py-2">
        <span class="inline-flex items-center gap-2">
          <span class="h-2 w-2 rounded-full border border-white/20" style="background:${t.color}"></span>
          <span class="font-mono text-[11px] text-slate-300">${escapeHtml(t.color)}</span>
        </span>
      </td>
      <td class="px-3 py-2">
        ${state.tags.length <= 1 ? "" : `<button class="delTag rounded-lg border border-red-400/40 bg-red-400/10 px-2 py-1 hover:bg-red-400/15" data-deltag="${idx}">X</button>`}
      </td>
    </tr>
  `).join("");

  document.querySelectorAll("button.delTag").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-deltag"));
      if (state.tags.length <= 1) return;

      state.tags.splice(idx, 1);
      state.tags = uniqByName(state.tags);
      ensureArticleTags(state);

      onChange();
    });
  });
}

export function refreshArticleTagsTable(state, onChange) {
  ensureArticleTags(state);

  $("bulkTagSelect").innerHTML = state.tags
    .map(t => `<option value="${escapeHtml(t.name)}">${escapeHtml(t.name)}</option>`)
    .join("");

  $("articleTagRows").innerHTML = state.titles.map((title, i) => {
    const tagName = state.articleTags[i] || state.tags[0]?.name || "B2C";
    const tag = getTag(state, tagName);
    const checked = selectedArticles.has(i) ? "checked" : "";

    return `
      <tr class="border-b border-white/10">
        <td class="px-3 py-2">
          <input type="checkbox" class="artPick h-4 w-4 accent-blue-400" data-pick="${i}" ${checked}>
        </td>
        <td class="px-3 py-2">${escapeHtml(title)}</td>
        <td class="px-3 py-2">
          <div class="flex items-center gap-2">
            <select class="artTag w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs outline-none focus:border-white/25" data-arttag="${i}">
              ${state.tags.map(t => `<option value="${escapeHtml(t.name)}" ${t.name === tagName ? "selected" : ""}>${escapeHtml(t.name)}</option>`).join("")}
            </select>
            <span class="h-2 w-2 rounded-full border border-white/20" style="background:${tag.color}"></span>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  document.querySelectorAll("select.artTag").forEach(sel => {
    sel.addEventListener("change", () => {
      const idx = Number(sel.getAttribute("data-arttag"));
      state.articleTags[idx] = sel.value;
      onChange();
    });
  });

  document.querySelectorAll("input.artPick").forEach(cb => {
    cb.addEventListener("change", () => {
      const idx = Number(cb.getAttribute("data-pick"));
      const next = new Set(selectedArticles);
      if (cb.checked) next.add(idx);
      else next.delete(idx);
      setSelectedArticles(next);

      $("selAllArticles").checked = (next.size === state.titles.length && state.titles.length > 0);
    });
  });

  $("selAllArticles").checked = (selectedArticles.size === state.titles.length && state.titles.length > 0);
}

export function refreshLinksTable(state, onChange) {
  $("linkRows").innerHTML = state.links.map((l, idx) => {
    const from = state.titles[l.from] ?? "—";
    const to = state.titles[l.to] ?? "—";
    return `
      <tr class="border-b border-white/10">
        <td class="px-3 py-2">${escapeHtml(from)}</td>
        <td class="px-3 py-2">${escapeHtml(to)}</td>
        <td class="px-3 py-2">${escapeHtml(l.type)}</td>
        <td class="px-3 py-2">${Number(l.weight).toFixed(1)}</td>
        <td class="px-3 py-2">
          <button class="delLink rounded-lg border border-red-400/40 bg-red-400/10 px-2 py-1 hover:bg-red-400/15" data-del="${idx}">X</button>
        </td>
      </tr>
    `;
  }).join("");

  document.querySelectorAll("button.delLink").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-del"));
      state.links.splice(idx, 1);
      onChange();
    });
  });
}

export function renderScoreTable(state, scores, onDeleteArticle) {
  const rows = state.titles
    .map((t, i) => ({ t, i, tag: state.articleTags[i] || state.tags[0]?.name || "B2C", s: scores[i] || 0 }))
    .sort((a, b) => b.s - a.s);

  $("scoreRows").innerHTML = rows.map((r, idx) => {
    const tagObj = state.tags.find(t => t.name === r.tag);
    const color = tagObj ? tagObj.color : "#cfd7ff";

    return `
      <tr class="border-b border-white/10 hover:bg-white/5 transition">
        <td class="px-3 py-2">${idx + 1}</td>
        <td class="px-3 py-2">${escapeHtml(r.t)}</td>
        <td class="px-3 py-2">
          <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
            style="background:${color}22; color:${color}; border:1px solid ${color}55">
            ${escapeHtml(r.tag)}
          </span>
        </td>
        <td class="px-3 py-2">${r.s.toFixed(2)}</td>
        <td class="px-3 py-2 text-right">
          <button class="delScore text-slate-400 hover:text-red-400 transition"
            title="Supprimer cet article" data-del-article="${r.i}">🗑️</button>
        </td>
      </tr>
    `;
  }).join("");

  document.querySelectorAll("button.delScore").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-del-article"));
      if (!Number.isInteger(idx)) return;
      onDeleteArticle(idx);
    });
  });
}

export function addTitlesFromTextarea(state, onChange) {
  const lines = $("titles").value.split("\n").map(sanitizeTitle).filter(Boolean);
  const existing = new Set(state.titles);
  const defaultTag = state.tags[0]?.name || "B2C";

  for (const t of lines) {
    if (!existing.has(t)) {
      state.titles.push(t);
      state.articleTags.push(defaultTag);
      existing.add(t);
    }
  }
  onChange();
}

export function addTagFromInputs(state, onChange) {
  const name = ($("newTagName").value || "").trim();
  const color = $("newTagColor").value || "#ffffff";
  if (!name) return;
  if (state.tags.some(t => t.name === name)) return;

  state.tags.push({ name, color });
  state.tags = uniqByName(state.tags);
  ensureArticleTags(state);

  $("newTagName").value = "";
  onChange();
}

export function addLinkFromInputs(state, onChange) {
  const from = Number($("from").value), to = Number($("to").value);
  if (!Number.isInteger(from) || !Number.isInteger(to) || from === to) return;

  const type = $("type").value;
  const weight = Math.max(0.1, Number($("weight").value || 1));

  state.links.push({ from, to, type, weight });
  onChange();
}
