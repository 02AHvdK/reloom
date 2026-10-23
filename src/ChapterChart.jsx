import React, { useEffect, useRef, useState } from "react";
import { reducedMotion } from "./motion.js";
function Ticker({ value }) {
  return (
    <span className="ticker" aria-label={String(value)}>
      {String(value)
        .split("")
        .map((digit, i) => (
          <span className="ticker-window" key={i} aria-hidden="true">
            <span
              className="ticker-reel"
              style={{ transform: `translateY(-${Number(digit) * 10}%)` }}
            >
              {"0123456789".split("").map((n) => (
                <span key={n}>{n}</span>
              ))}
            </span>
          </span>
        ))}
    </span>
  );
}
export default function ChapterChart({ sections, onChoose }) {
  const [active, setActive] = useState(0),
    scroll = useRef(null),
    drag = useRef(null);
  const chosen = sections[Math.min(active, sections.length - 1)];
  const max = Math.max(1, ...sections.map((s) => s.content.length));
  useEffect(() => {
    setActive(0);
    if (scroll.current) scroll.current.scrollLeft = 0;
  }, [sections]);
  if (!chosen) return null;
  const point = (s, i) =>
    `${i * 88 + 44},${115 - (s.content.length / max) * 90}`;
  return (
    <section className="chapter-chart">
      <header>
        <div>
          <span className="eyebrow">章节篇幅</span>
          <h2>{chosen.title}</h2>
        </div>
        <div className="chart-value">
          <Ticker value={chosen.content.length} />
          <span>字符</span>
        </div>
      </header>
      <p>高亮圆点为当前章节。可拖动图表、点击序号或使用左右方向键。</p>
      <div
        className="chart-scroll"
        ref={scroll}
        tabIndex={0}
        role="region"
        aria-label="章节字数折线图"
        onScroll={(e) =>
          setActive(
            Math.min(
              sections.length - 1,
              Math.round(e.currentTarget.scrollLeft / 88),
            ),
          )
        }
        onKeyDown={(e) => {
          if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
            e.preventDefault();
            scroll.current.scrollTo({
              left:
                Math.max(
                  0,
                  Math.min(
                    sections.length - 1,
                    active + (e.key === "ArrowRight" ? 1 : -1),
                  ),
                ) * 88,
              behavior: reducedMotion() ? "instant" : "smooth",
            });
          }
        }}
        onPointerDown={(e) => {
          if (e.pointerType === "touch") return;
          drag.current = { x: e.clientX, left: e.currentTarget.scrollLeft };
          e.currentTarget.setPointerCapture(e.pointerId);
          e.currentTarget.style.scrollSnapType = "none";
        }}
        onPointerMove={(e) => {
          if (drag.current)
            e.currentTarget.scrollLeft =
              drag.current.left + drag.current.x - e.clientX;
        }}
        onPointerUp={(e) => {
          if (!drag.current) return;
          drag.current = null;
          e.currentTarget.style.scrollSnapType = "";
          const index = Math.round(e.currentTarget.scrollLeft / 88);
          e.currentTarget.scrollTo({
            left: index * 88,
            behavior: reducedMotion() ? "instant" : "smooth",
          });
        }}
        onPointerCancel={(e) => {
          drag.current = null;
          e.currentTarget.style.scrollSnapType = "";
        }}
      >
        <div className="chart-track" style={{ width: sections.length * 88 }}>
          <svg width={sections.length * 88} height="145" aria-hidden="true">
            <rect x={active*88+16} y="6" width="56" height="132" rx="18" fill="var(--md-primary-container)"/>
            <line x1={active*88+44} x2={active*88+44} y1="10" y2="138" stroke="var(--md-primary)" strokeDasharray="3 5" opacity=".45"/>
            <polyline
              points={sections.map(point).join(" ")}
              fill="none"
              stroke="var(--md-primary)"
              strokeWidth="3"
            />
            {sections.map((s, i) => (
              <circle
                key={s.id}
                cx={i * 88 + 44}
                cy={115 - (s.content.length / max) * 90}
                r={i === active ? 7 : 4}
                fill={i === active ? "var(--md-primary)" : "var(--md-surface)"}
                stroke="var(--md-primary)"
                strokeWidth="2"
              />
            ))}
          </svg>
          {sections.map((s, i) => (
            <button className={`chart-snap ${i===active ? "active" : ""}`} aria-label={`查看第 ${i+1} 章：${s.title}`} aria-current={i===active ? "true" : undefined} key={s.id} style={{ left: i * 88 }} onPointerDown={e=>e.stopPropagation()} onClick={()=>scroll.current.scrollTo({left:i*88,behavior:reducedMotion()?"instant":"smooth"})}>
              {" "}
              {i + 1}{" "}
            </button>
          ))}
        </div>
      </div>
      <span className="chart-position" aria-hidden="true"><i style={{transform:`translateX(${sections.length>1?active/(sections.length-1)*98:0}px)`}}/></span>
      <footer>
        <span>
          第 {active + 1} / {sections.length} 章
        </span>
        <button onClick={(e) => onChoose(chosen, e.currentTarget)}>
          查看此章详情
        </button>
      </footer>
    </section>
  );
}
