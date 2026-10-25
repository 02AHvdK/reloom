import {
  Hct,
  themeFromSourceColor,
  argbFromHex,
  hexFromArgb,
} from "@material/material-color-utilities";
export const APPEARANCE_KEY = "atlas.appearance.v1";
export const PRESETS = [
  {
    name: "晴蓝 · Expressive",
    accent: "#0061a4",
    background: "#f3f6fc",
    surface: "#fdfcff",
  },
  {
    name: "鸢尾 · Expressive",
    accent: "#6750a4",
    background: "#f7f2fa",
    surface: "#fffbfe",
  },
  {
    name: "苔绿 · 暖纸",
    accent: "#617458",
    background: "#f3f1e9",
    surface: "#fffef9",
  },
  {
    name: "海盐 · 雾蓝",
    accent: "#526f7b",
    background: "#eef1f0",
    surface: "#fbfdfc",
  },
  {
    name: "燕麦 · 栗棕",
    accent: "#806649",
    background: "#f2eee6",
    surface: "#fffaf2",
  },
  {
    name: "石墨 · 素白",
    accent: "#555b53",
    background: "#eeeeea",
    surface: "#fcfcf8",
  },
];
export const DEFAULT_APPEARANCE = { ...PRESETS[0] };
export function normalizeHex(color) {
  if (typeof color !== "string") return null;
  let s = color.trim();
  if (/^#[\da-f]{3}$/i.test(s))
    s =
      "#" +
      s
        .slice(1)
        .split("")
        .map((c) => c + c)
        .join("");
  return /^#[\da-f]{6}$/i.test(s) ? s.toLowerCase() : null;
}
export function normalizeAppearance(value) {
  if (
    !value ||
    !["accent", "background", "surface"].every((k) => normalizeHex(value[k]))
  )
    throw Error("请输入有效的 HEX 颜色，例如 #617458");
  return {
    opening: value.opening !== false,
    mode: ["system","light","dark"].includes(value.mode) ? value.mode : "system",
    darkBackground: normalizeHex(value.darkBackground) || "#111318",
    darkSurface: normalizeHex(value.darkSurface) || "#1c1f26",
    name: typeof value.name === "string" ? value.name.slice(0, 60) : "自定义",
    ...Object.fromEntries(
      ["accent", "background", "surface"].map((k) => [
        k,
        normalizeHex(value[k]),
      ]),
    ),
  };
}
function rgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
export function mix(a, b, weight) {
  return (
    "#" +
    rgb(a)
      .map((v, i) =>
        Math.round(v * (1 - weight) + rgb(b)[i] * weight)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
function luminance(hex) {
  const c = rgb(hex).map((v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
}
export function contrast(a, b) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function readable(color, bg, ratio = 4.5) {
  if (contrast(color, bg) >= ratio) return color;
  const target =
    contrast("#000000", bg) > contrast("#ffffff", bg) ? "#000000" : "#ffffff";
  for (let i = 1; i <= 100; i++) {
    const next = mix(color, target, i / 100);
    if (contrast(next, bg) >= ratio) return next;
  }
  return target;
}
export function appearanceTokens(value) {
  const c = normalizeAppearance(value);
  const ink = readable("#2c3028", c.surface, 12);
  const muted = readable(mix(ink, c.surface, 0.3), c.surface, 7);
  const accentInk = readable(c.accent, c.surface);
  const accentSoft = mix(c.surface, c.accent, 0.09);
  const raised = mix(c.surface, ink, 0.035);
  const scheme = themeFromSourceColor(argbFromHex(c.accent)).schemes[
    luminance(c.surface) < 0.2 ? "dark" : "light"
  ].toJSON();
  const roles = Object.fromEntries(
    Object.entries(scheme).map(([k, v]) => [
      "md" + k[0].toUpperCase() + k.slice(1),
      hexFromArgb(v),
    ]),
  );
  return {
    ...roles,
    ...c,
    ink,
    muted,
    accentInk,
    accentSoft,
    raised,
    onAccent:
      contrast("#ffffff", c.accent) >= contrast("#000000", c.accent)
        ? "#ffffff"
        : "#000000",
    chromeInk: readable("#2c3028", c.background, 7),
    chromeMuted: readable("#696b61", c.background),
    line: mix(c.surface, ink, 0.13),
    control: mix(c.surface, ink, 0.33),
    edge: readable(c.accent, c.surface, 3),
    softInk: readable(accentInk, accentSoft),
    isDark: luminance(c.surface) < 0.2,
  };
}

export function generateTheme(seed, random = Math.random, dark = false) {
 const accent = normalizeHex(seed);
 if (!accent) throw Error("请选择有效的主色");
 const hct = Hct.fromInt(argbFromHex(accent));
 const chroma = 3 + random() * 9;
 if(dark)return {name:"主色衍生",accent,darkBackground:hexFromArgb(Hct.from(hct.hue,chroma,5+random()*4).toInt()),darkSurface:hexFromArgb(Hct.from(hct.hue,chroma,12+random()*5).toInt())};
 return {name:"主色衍生",accent,background:hexFromArgb(Hct.from(hct.hue,chroma,93 + random()*3).toInt()),surface:hexFromArgb(Hct.from(hct.hue,chroma*.5,98 + random()).toInt())};
}

export function resolveAppearance(value, systemDark = false) {
 const c=normalizeAppearance(value);
 const dark=c.mode === "dark" || (c.mode === "system" && systemDark);
 return dark ? {...c,background:c.darkBackground,surface:c.darkSurface} : c;
}
