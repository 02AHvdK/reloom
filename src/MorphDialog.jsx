import React, { useEffect, useRef } from "react";
import { Dialog, Fade, useMediaQuery } from "@mui/material";
import { fluidEase, reducedMotion, sheetSnap, rubberBand } from "./motion.js";
export default function MorphDialog({
  origin,
  sharedTitle,
  children,
  ...props
}) {
  const reduce=useMediaQuery("(prefers-reduced-motion: reduce)");
  const grip = useRef(null),
    offset = useRef(0),
    gesture = useRef(null);
  useEffect(() => {
    offset.current = 0;
  }, [props.open]);
  function settle(paper, target) {
    const start = offset.current;
    offset.current = target;
    paper.style.transform = `translateY(${target}px)`;
    if (!reducedMotion())
      paper.animate(
        [
          { transform: `translateY(${start}px)` },
          { transform: `translateY(${target}px)` },
        ],
        { duration: 420, easing: fluidEase },
      );
  }
  return (
    <Dialog
      {...props}
      slots={{ transition: Fade }}
      slotProps={{
        transition: { timeout: reduce ? 0 : {enter:180,exit:120} },
        paper: { className: "morph-paper" },
      }}
    >
      <div
        className="sheet-grip"
        ref={grip}
        role="slider"
        aria-label="调整面板高度"
        aria-valuemin={0}
        aria-valuemax={2}
        aria-valuenow={0}
        tabIndex={0}
        onKeyDown={(e) => {
          if (["ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
            e.preventDefault();
            const paper = e.currentTarget.closest(".MuiDialog-paper");
            const h = paper.offsetHeight;
            const target =
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? h * 0.7
                  : sheetSnap(
                      offset.current +
                        (e.key === "ArrowUp" ? -h * 0.38 : h * 0.38),
                      0,
                      h,
                    );
            settle(paper, target);
            e.currentTarget.setAttribute(
              "aria-valuenow",
              Math.round(target / (h * 0.35)),
            );
          }
        }}
        onPointerDown={(e) => {
          const paper = e.currentTarget.closest(".MuiDialog-paper");
          paper.getAnimations().forEach((a) => a.cancel());
          e.currentTarget.setPointerCapture(e.pointerId);
          gesture.current = {
            y: e.clientY,
            start: offset.current,
            last: e.clientY,
            time: performance.now(),
            velocity: 0,
            paper,
          };
        }}
        onPointerMove={(e) => {
          const g = gesture.current;
          if (!g) return;
          const now = performance.now();
          g.velocity = (e.clientY - g.last) / Math.max(1, now - g.time);
          g.last = e.clientY;
          g.time = now;
          offset.current = rubberBand(
            g.start + e.clientY - g.y,
            0,
            g.paper.offsetHeight * 0.7,
          );
          g.paper.style.transform = `translateY(${offset.current}px)`;
        }}
        onPointerUp={(e) => {
          const g = gesture.current;
          if (!g) return;
          const velocity = performance.now() - g.time > 100 ? 0 : g.velocity;
          const target = sheetSnap(
            offset.current,
            velocity,
            g.paper.offsetHeight,
          );
          settle(g.paper, target);
          e.currentTarget.setAttribute(
            "aria-valuenow",
            Math.round(target / (g.paper.offsetHeight * 0.35)),
          );
          gesture.current = null;
        }}
        onPointerCancel={() => {
          const g = gesture.current;
          if (g)
            settle(g.paper, sheetSnap(offset.current, 0, g.paper.offsetHeight));
          gesture.current = null;
        }}
      >
        <span />
      </div>
      {children}
    </Dialog>
  );
}
