export const $ = (id) => document.getElementById(id);

export function sanitizeTitle(t) {
  return t.replace(/\s+/g, " ").trim();
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function uniqByName(tags) {
  const seen = new Set();
  return tags.filter(t => {
    const k = (t.name || "").trim();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
