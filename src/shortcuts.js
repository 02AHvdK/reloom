export const DEFAULT_KEYS = {
  child: "Mod+Alt+n",
  tools: "Mod+Alt+t",
  branch: "Mod+Alt+b",
  undo: "Mod+z",
  redo: "Mod+Shift+z",
  graph: "Mod+Alt+1",
  source: "Mod+Alt+2",
  settings: "Mod+Alt+k",
};
export const KEY_LABELS = {
  child: "增加子节点",
  tools: "触发与工具",
  branch: "添加 IF / ELSE",
  undo: "撤销文档修改",
  redo: "重做文档修改",
  graph: "打开工作流",
  source: "打开源文件",
  settings: "快捷键设置",
};
export function keyCombo(e) {
  if (["Control", "Meta", "Shift", "Alt"].includes(e.key)) return "";
  return [
    (e.ctrlKey || e.metaKey) && "Mod",
    e.altKey && "Alt",
    e.shiftKey && "Shift",
    e.key.toLowerCase(),
  ]
    .filter(Boolean)
    .join("+");
}
export function validateKeys(keys) {
  const values = Object.values(keys);
  if (new Set(values).size !== values.length)
    throw new Error("快捷键重复，请为每个操作分配不同组合。");
  for (const value of values) {
    if (!/^Mod\+(Alt\+)?(Shift\+)?[a-z0-9]$/.test(value))
      throw new Error(
        "请使用 Ctrl / Command 加字母或数字，可组合 Alt / Shift。",
      );
    if (/^Mod\+(w|r|t|n|l|q|p)$/.test(value))
      throw new Error("该组合由浏览器使用，请改用带 Alt 或 Shift 的组合。");
  }
  return keys;
}
