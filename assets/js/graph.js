import { $, escapeHtml } from "./utils.js";
import { getTag } from "./ui.js";

let svg = null;
let g = null;
let simulation = null;
let flowTimer = null;

function hexToRGBA(hex, alpha) {
  const h = (hex || "").trim();
  let r = 200, gg = 200, b = 255;

  if (/^#([0-9a-f]{3})$/i.test(h)) {
    const m = h.match(/^#([0-9a-f]{3})$/i)[1];
    r = parseInt(m[0] + m[0], 16);
    gg = parseInt(m[1] + m[1], 16);
    b = parseInt(m[2] + m[2], 16);
  } else if (/^#([0-9a-f]{6})$/i.test(h)) {
    const m = h.match(/^#([0-9a-f]{6})$/i)[1];
    r = parseInt(m.slice(0, 2), 16);
    gg = parseInt(m.slice(2, 4), 16);
    b = parseInt(m.slice(4, 6), 16);
  }
  return `rgba(${r},${gg},${b},${alpha})`;
}

function showTip(x, y, html) {
  const tip = $("tip");
  tip.classList.remove("hidden");
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
  tip.innerHTML = html;
}

function hideTip() {
  $("tip").classList.add("hidden");
}

function initSVG() {
  const wrap = $("viz");
  wrap.querySelector("svg")?.remove();

  const rect = wrap.getBoundingClientRect();
  svg = window.d3.select("#viz").append("svg")
    .attr("width", rect.width)
    .attr("height", rect.height)
    .attr("viewBox", `0 0 ${rect.width} ${rect.height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  g = svg.append("g");
  svg.call(window.d3.zoom().scaleExtent([0.2, 3]).on("zoom", (event) => g.attr("transform", event.transform)));
}

export function renderGraph(state, scores) {
  initSVG();

  const n = state.titles.length;
  if (n === 0) {
    g.append("text")
      .attr("x", 18).attr("y", 34)
      .attr("fill", "rgba(226,232,240,.85)")
      .style("font-size", "14px")
      .text("Ajoute des articles + des liens, puis clique “Calculer + Afficher”.");
    return;
  }

  const nodes = state.titles.map((t, i) => ({
    id: i,
    title: t,
    tag: state.articleTags[i] || state.tags[0]?.name || "B2C",
    tagColor: (getTag(state, state.articleTags[i] || state.tags[0]?.name || "B2C").color),
    score: (scores[i] || 0)
  }));

  const links = state.links.map(l => ({ source: l.from, target: l.to, type: l.type, weight: l.weight }));

  const d3 = window.d3;
  const sMin = d3.min(nodes, d => d.score), sMax = d3.max(nodes, d => d.score);
  const rScale = d3.scaleSqrt().domain([sMin || 0, sMax || 1]).range([10, 44]);
  const lw = d3.scaleLinear().domain([0.1, d3.max(links, d => d.weight) || 1]).range([1, 5]);

  const link = g.append("g")
    .attr("stroke-opacity", 0.68)
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", d => d.type === "pillar" ? "rgba(255,204,102,.85)" : "rgba(122,162,255,.55)")
    .attr("stroke-width", d => (d.type === "pillar" ? 1.25 : 1.0) * lw(d.weight));

  // Flow dots
  const flow = g.append("g")
    .attr("opacity", 0.85)
    .selectAll("circle")
    .data(links)
    .join("circle")
    .attr("r", d => d.type === "pillar" ? 2.6 : 2.2)
    .attr("fill", d => d.type === "pillar" ? "rgba(255,204,102,.95)" : "rgba(122,162,255,.85)");

  const node = g.append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", d => rScale(d.score))
    .attr("fill", d => hexToRGBA(d.tagColor, 0.18))
    .attr("stroke", d => hexToRGBA(d.tagColor, 0.90))
    .attr("stroke-width", 1.7);

  const label = g.append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .text(d => d.title.length > 40 ? d.title.slice(0, 40) + "…" : d.title)
    .attr("fill", "rgba(226,232,240,.86)")
    .style("font-size", "11px")
    .style("pointer-events", "none");

  // drag
  node.call(d3.drag()
    .on("start", (event, d) => { if (!event.active) simulation.alphaTarget(0.25).restart(); d.fx = d.x; d.fy = d.y; })
    .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
    .on("end", (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
  );

  // tooltip
  node.on("mousemove", (event, d) => {
    const [x, y] = d3.pointer(event, $("viz"));
    showTip(x, y, `<b>${escapeHtml(d.title)}</b><br>Tag : ${escapeHtml(d.tag)}<br>Score : ${d.score.toFixed(2)}`);
  }).on("mouseleave", hideTip);

  const rect = $("viz").getBoundingClientRect();
  simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(135).strength(0.22))
    .force("charge", d3.forceManyBody().strength(-560))
    .force("center", d3.forceCenter(rect.width / 2, rect.height / 2))
    .force("collide", d3.forceCollide().radius(d => rScale(d.score) + 10).strength(0.95));

  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);

    label
      .attr("x", d => d.x + rScale(d.score) + 7)
      .attr("y", d => d.y + 4);
  });

  // ✅ single timer (no leak)
  if (flowTimer) flowTimer.stop();
  flowTimer = d3.timer(() => {
    const t = (Date.now() % 1200) / 1200;
    flow
      .attr("cx", d => d.source.x + (d.target.x - d.source.x) * t)
      .attr("cy", d => d.source.y + (d.target.y - d.source.y) * t);
  });
}
