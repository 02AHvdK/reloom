import { analyze } from "./document.js";
export function appendRevision(doc, next) {
  if (doc.source === next.source) return next;
  const revisions = [
    ...(doc.revisions || []),
    { at: new Date().toISOString(), source: doc.source },
  ].slice(-20);
  while (
    revisions.length > 1 &&
    revisions.reduce((n, r) => n + r.source.length, 0) > 600000
  )
    revisions.shift();
  return { ...next, revisions };
}
export function chapterVersions(doc, section) {
  if (!section) return [];
  const versions = [];
  for (const r of [...(doc.revisions || [])].reverse()) {
    try {
      const parsed = analyze(r.source, doc.name);
      const matches = parsed.sections.filter(
        (s) => s.title === section.title && s.level === section.level,
      );
      if (matches.length === 1) {
        const s = matches[0];
        if (s.content !== section.content)
          versions.push({ ...r, title: s.title, content: s.content });
      }
    } catch {}
  }
  return versions;
}
