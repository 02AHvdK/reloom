import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ThemeProvider,
  createTheme,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import { Palette, Check, RotateCcw } from "lucide-react";
import {
  resolveAppearance,
  generateTheme,
  APPEARANCE_KEY,
  DEFAULT_APPEARANCE,
  PRESETS,
  normalizeHex,
  normalizeAppearance,
  appearanceTokens,
} from "./appearance.js";
const AppearanceContext = createContext(null);
export const useAppearance = () => useContext(AppearanceContext);
function load() {
  try {
    return normalizeAppearance(
      JSON.parse(localStorage.getItem(APPEARANCE_KEY)),
    );
  } catch {
    return DEFAULT_APPEARANCE;
  }
}
export function AppearanceProvider({ children }) {
  const [saved, setSaved] = useState(load),
    [preview, setPreview] = useState(null),
    [open, setOpen] = useState(false),
    [draft, setDraft] = useState(saved),
    [error, setError] = useState("");
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
  const effectiveDark = draft.mode === "dark" || ((draft.mode || "system") === "system" && systemDark);
  const tokens = useMemo(
    () => appearanceTokens(resolveAppearance(preview || saved, systemDark)),
    [preview, saved, systemDark],
  );
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(tokens).forEach(([k, v]) => {
      if (typeof v === "string")
        root.style.setProperty(
          "--org-" + k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()),
          v,
        );
    });
    root.dataset.appearance = "expressive";
    root.dataset.colorMode = tokens.isDark ? "dark" : "light";
    root.style.colorScheme = tokens.isDark ? "dark" : "light";
  }, [tokens]);
  useEffect(() => {
    const handler = (e) => {
      if (e.key === APPEARANCE_KEY) setSaved(load());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: tokens.isDark ? "dark" : "light",
          primary: { main: tokens.accent, contrastText: tokens.onAccent },
          secondary: { main: tokens.accentInk },
          background: { default: tokens.background, paper: tokens.surface },
          text: { primary: tokens.ink, secondary: tokens.muted },
        },
        typography: {
          fontFamily: 'ReeloomFutura, ReeloomChinese, "Noto Sans SC", "Microsoft YaHei UI", sans-serif',
          fontSize: 14,
          button: { textTransform: "none", fontWeight: 600 },
        },
        shape: { borderRadius: 24 },
        components: {
          MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: { root: { minHeight: 44, borderRadius: 24 } },
          },
          MuiTextField: {
            defaultProps: {
              size: "small",
              slotProps: { inputLabel: { shrink: true } },
            },
          },
          MuiMenu: {defaultProps:{transitionDuration:100}},
          MuiDialog: {defaultProps:{transitionDuration:180}},
          MuiButtonBase: {defaultProps:{disableRipple:true}},
          MuiTooltip: { defaultProps: { arrow: false } },
        },
      }),
    [tokens],
  );
  function openSettings() {
    setDraft(saved);
    setPreview(null);
    setError("");
    setOpen(true);
  }
  function update(next) {
    setDraft(next);
    try {
      setPreview(normalizeAppearance(next));
      setError("");
    } catch {
      setError("颜色需要 3 位或 6 位 HEX，如 #617458");
    }
  }
  function close() {
    setPreview(null);
    setOpen(false);
    setError("");
  }
  const valid = ["accent", "background", "surface", ...["darkBackground","darkSurface"].filter(k=>draft[k]!==undefined)].every((k) =>
    normalizeHex(draft[k]),
  );
  return (
    <AppearanceContext.Provider value={{ tokens, openSettings }}>
      <ThemeProvider theme={theme}>
        {children}
        <Dialog
          className="appearance-dialog"
          open={open}
          onClose={close}
          fullWidth
          maxWidth="sm"
          aria-labelledby="appearance-title"
        >
          <DialogTitle id="appearance-title">主题与颜色</DialogTitle>
          <DialogContent>
            <p className="appearance-description">
              选一个主色，让工作区、卡片和操作保持统一。修改即时预览，保存后在此浏览器生效。
            </p>
            <div className="theme-modes" role="group" aria-label="显示模式">{[["system","跟随系统"],["light","浅色"],["dark","深色"]].map(([mode,label])=><Button key={mode} aria-pressed={(draft.mode||"system")===mode} onClick={()=>update({...draft,mode})}>{label}</Button>)}</div>
            <label className="opening-preference"><input type="checkbox" checked={draft.opening !== false} onChange={e=>update({...draft,opening:e.target.checked})}/> 开启品牌开场动画 <small>Esc 可跳过</small></label><div className="appearance-presets" aria-label="主题预设">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  aria-pressed={["accent", "background", "surface"].every(
                    (k) => normalizeHex(draft[k]) === p[k],
                  )}
                  onClick={() => update({ ...draft, ...p })}
                >
                  <span className="preset-swatches" aria-hidden="true">
                    {["accent"].map((k) => (
                      <i key={k} style={{ background: p[k] }} />
                    ))}
                  </span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
            <div className="theme-generator"><div><strong>围绕主色，生成新搭配</strong><p>保留当前主色，随机调整同色系底色与纸面。</p></div><Button variant="contained" disabled={!normalizeHex(draft.accent)} onClick={()=>update({...draft,...generateTheme(draft.accent,Math.random,effectiveDark)})}>随机生成主题</Button></div>
            <div className="appearance-colors">
              {[
                ["accent", "主题主色", "按钮、选中节点和执行路径"],
                [effectiveDark ? "darkBackground" : "background", "工作区底色", "导航与画布外的留白"],
                [effectiveDark ? "darkSurface" : "surface", "纸面颜色", "节点、编辑面板与对话框"],
              ].map(([key, label, hint]) => (
                <div className="appearance-color-row" key={key}>
                  <div>
                    <label htmlFor={"theme-" + key}>{label}</label>
                    <p>{hint}</p>
                  </div>
                  <input
                    type="color"
                    aria-label={label + "拾色器"}
                    value={normalizeHex(draft[key]) || saved[key] || (key === "darkBackground" ? "#111318" : "#1c1f26")}
                    onChange={(e) =>
                      update({
                        ...draft,
                        name: "自定义",
                        [key]: e.target.value,
                      })
                    }
                  />
                  <TextField
                    id={"theme-" + key}
                    label={label + " HEX"}
                    value={draft[key] || (key === "darkBackground" ? "#111318" : "#1c1f26")}
                    onChange={(e) =>
                      update({
                        ...draft,
                        name: "自定义",
                        [key]: e.target.value,
                      })
                    }
                    error={!!draft[key] && !normalizeHex(draft[key])}
                    slotProps={{
                      htmlInput: { maxLength: 9, spellCheck: false },
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="appearance-preview">
              <span>预览</span>
              <strong>当前章节 · 执行规则</strong>
              <p>选中状态、正文与主操作的实时效果。</p>
              <Button
                variant="contained"
                tabIndex={-1}
                aria-hidden="true"
                style={{ pointerEvents: "none" }}
              >
                应用修改
              </Button>
            </div>
            <p className="appearance-note">
              文字和按钮文字会自动选择可读颜色；错误与成功状态保留各自含义。主题独立保存，不写入工作流或
              Markdown。
            </p>
            {error && <Alert severity="error">{error}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button
              startIcon={<RotateCcw size={15} />}
              onClick={() => update({ ...DEFAULT_APPEARANCE })}
            >
              恢复默认
            </Button>
            <span style={{ flex: 1 }} />
            <Button onClick={close}>取消</Button>
            <Button
              variant="contained"
              disabled={!valid}
              startIcon={<Check size={15} />}
              onClick={() => {
                try {
                  const next = normalizeAppearance(draft);
                  localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next));
                  setSaved(next);
                  close();
                } catch (e) {
                  setError("保存失败：" + e.message);
                }
              }}
            >
              保存主题
            </Button>
          </DialogActions>
        </Dialog>
      </ThemeProvider>
    </AppearanceContext.Provider>
  );
}
export function AppearanceButton() {
  const { openSettings } = useAppearance();
  return (
    <Tooltip title="主题与颜色">
      <IconButton onClick={openSettings} aria-label="主题与颜色">
        <Palette size={18} />
      </IconButton>
    </Tooltip>
  );
}
