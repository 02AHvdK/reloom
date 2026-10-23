export function readRules(content) {
  const match = content.match(/```atlas-rules\r?\n([\s\S]*?)\r?\n```/);
  if (!match) return [];
  const rules = JSON.parse(match[1]);
  if (
    !Array.isArray(rules) ||
    rules.some(
      (r) =>
        !r ||
        typeof r !== "object" ||
        !["skill", "plugin", "search", "scrape", "software"].includes(r.action),
    )
  )
    throw new Error("现有规则格式无法识别，请在原文中修正后再编辑。");
  return rules;
}
export function writeRules(content, rules) {
  for (const r of rules) {
    if (!r.when?.trim() || !r.target?.trim())
      throw new Error("请填写触发条件和调用目标。");
    if (["search", "scrape"].includes(r.action)) {
      let url;
      try {
        url = new URL(r.target);
      } catch {
        throw new Error("网站地址需要完整的 https:// 或 http:// 地址。");
      }
      if (!["https:", "http:"].includes(url.protocol))
        throw new Error("只支持 HTTP / HTTPS 网站。");
    }
  }
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const block =
    "```atlas-rules" +
    newline +
    JSON.stringify(rules, null, 2).replace(/\n/g, newline) +
    newline +
    "```";
  if (/```atlas-rules\r?\n[\s\S]*?\r?\n```/.test(content))
    return content.replace(/```atlas-rules\r?\n[\s\S]*?\r?\n```/, () => block);
  return (
    content +
    (content.endsWith(newline) ? newline : newline + newline) +
    block +
    newline
  );
}
export function trialRules(rules, task) {
  return rules.map((r, index) => {
    if (
      typeof r.when !== "string" ||
      !r.when.trim() ||
      typeof r.target !== "string" ||
      !r.target.trim()
    )
      return {
        index,
        status: "配置不完整",
        reason: "请先填写触发条件和调用目标。",
        rule: r,
      };
    const words = (typeof r.keywords === "string" ? r.keywords : "")
      .split(/[,，\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!words.length)
      return {
        index,
        status: "待判定",
        reason:
          "此规则只有自然语言条件。请填写试跑关键词，避免把字面匹配误当成语义判断。",
        rule: r,
      };
    const matched = words.filter((w) =>
      task.toLocaleLowerCase().includes(w.toLocaleLowerCase()),
    );
    const hit =
      r.match === "all" ? matched.length === words.length : matched.length > 0;
    return {
      index,
      status: hit ? "命中" : "未命中",
      reason: `${r.match === "all" ? "全部" : "任一"}关键词匹配；命中：${matched.join("、") || "无"}；未命中：${words.filter((w) => !matched.includes(w)).join("、") || "无"}。`,
      rule: r,
    };
  });
}
