import React, { useEffect, useRef, useState } from "react";

export type TerminalEntry = {
  id: string;
  title: string;
  lines: string[];
  status: "running" | "done";
  collapsed: boolean;
};

type TerminalDockProps = {
  terminals: TerminalEntry[];
  activeId: string | null;
  onToggle: (id: string) => void;
  onClose: (id: string) => void;
};

export default function TerminalDock({
  terminals,
  activeId,
  onToggle,
  onClose
}: TerminalDockProps) {
  const [height, setHeight] = useState(240);
  const [isMaximized, setIsMaximized] = useState(false);
  const dragState = useRef<{ startY: number; startHeight: number } | null>(null);

  if (terminals.length === 0) {
    return null;
  }

  const active = terminals.find((term) => term.id === activeId) ?? null;
  const minHeight = 160;
  const maxHeight = Math.max(300, Math.floor(window.innerHeight * 0.9));

  useEffect(() => {
    function onMove(event: MouseEvent) {
      if (!dragState.current) {
        return;
      }
      if (isMaximized) {
        return;
      }
      const delta = dragState.current.startY - event.clientY;
      const next = Math.min(maxHeight, Math.max(minHeight, dragState.current.startHeight + delta));
      setHeight(next);
    }

    function onUp() {
      dragState.current = null;
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  function startDrag(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest(".terminal-actions")) {
      return;
    }
    dragState.current = { startY: event.clientY, startHeight: height };
  }

  function toggleMaximize() {
    setIsMaximized((prev) => {
      const next = !prev;
      setHeight(next ? maxHeight : 240);
      return next;
    });
  }
  const tabs = terminals.map((term) => (
    <button
      key={term.id}
      type="button"
      className={`terminal-tab${term.id === activeId ? " active" : ""}`}
      onClick={() => onToggle(term.id)}
    >
      {term.title}
    </button>
  ));

  return (
    <div className="terminal-dock">
      {active && !active.collapsed && (
        <div className={`terminal-window${isMaximized ? " maximized" : ""}`} style={{ height }}>
          <header className="terminal-header" onMouseDown={startDrag}>
            <div className="terminal-title">
              <span>{active.title}</span>
              <span className="terminal-status">{active.status}</span>
            </div>
            <div className="terminal-actions">
              <button
                type="button"
                className="icon-button"
                onClick={() => onToggle(active.id)}
                aria-label="Minimize terminal"
                title="Minimize"
              >
                — 
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={toggleMaximize}
                aria-label="Maximize terminal"
                title="Maximize"
              >
                ☐
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => onClose(active.id)}
                aria-label="Close terminal"
                title="Close"
              >
                ×
              </button>
            </div>
          </header>
          <div className="terminal-body">
            {active.lines.length === 0 ? (
              <div className="terminal-line">Running…</div>
            ) : (
              active.lines.map((line, index) => (
                <div key={`${active.id}-${index}`} className="terminal-line">
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      )}
      <div className="terminal-tabs">{tabs}</div>
    </div>
  );
}
