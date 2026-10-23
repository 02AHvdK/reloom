export function alignNodes(nodes, ids, mode) {
  const chosen = nodes.filter((n) => ids.includes(n.id));
  if (chosen.length < 2) return nodes;
  const positions = new Map(chosen.map((n) => [n.id, { ...n.position }]));
  const xs = chosen.map((n) => n.position.x),
    ys = chosen.map((n) => n.position.y);
  if (mode === "left" || mode === "top")
    chosen.forEach((n) => {
      positions.get(n.id)[mode === "left" ? "x" : "y"] = Math.min(
        ...(mode === "left" ? xs : ys),
      );
    });
  else {
    const axis = mode === "horizontal" ? "x" : "y";
    const sorted = [...chosen].sort(
      (a, b) => a.position[axis] - b.position[axis],
    );
    const min = sorted[0].position[axis],
      max = sorted.at(-1).position[axis];
    const step = Math.max(
      (max - min) / (sorted.length - 1),
      axis === "x" ? 330 : 260,
    );
    sorted.forEach((n, i) => (positions.get(n.id)[axis] = min + i * step));
  }
  return nodes.map((n) =>
    positions.has(n.id) ? { ...n, position: positions.get(n.id) } : n,
  );
}
export function placeNode(position, nodes, snap = true) {
  let p = { ...position };
  if (snap) {
    p = { x: Math.round(p.x / 20) * 20, y: Math.round(p.y / 20) * 20 };
    const near = nodes.find((n) => Math.abs(n.position.y - p.y) < 70);
    if (near) p.y = near.position.y;
  }
  while (
    nodes.some(
      (n) =>
        Math.abs(n.position.x - p.x) < 280 &&
        Math.abs(n.position.y - p.y) < 230,
    )
  )
    p.y += 260;
  return p;
}
export function treePositions(sections, edges) {
  const ids = new Set(sections.map((s) => s.id)),
    children = new Map(sections.map((s) => [s.id, []])),
    parents = new Set();
  edges.forEach((e) => {
    if (ids.has(e.source) && ids.has(e.target) && !parents.has(e.target)) {
      children.get(e.source).push(e.target);
      parents.add(e.target);
    }
  });
  let row = 0;
  const positions = {},
    seen = new Set();
  function visit(id, depth) {
    if (seen.has(id)) return;
    seen.add(id);
    const kids = children.get(id).filter((x) => !seen.has(x));
    kids.forEach((k) => visit(k, depth + 1));
    const actual = kids.filter((k) => positions[k]);
    const y = actual.length
      ? (positions[actual[0]].y + positions[actual.at(-1)].y) / 2
      : row++ * 260;
    positions[id] = { x: depth * 340, y };
  }
  sections
    .filter((s) => !parents.has(s.id))
    .forEach((s) => {
      visit(s.id, 0);
      row++;
    });
  sections.forEach((s) => visit(s.id, 0));
  return positions;
}
