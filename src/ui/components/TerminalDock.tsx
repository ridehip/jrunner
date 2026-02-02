import React, { useEffect, useRef, useState } from "react";

export type TerminalEntry = {
  id: string;
  title: string;
  lines: string[];
  status: "running" | "done" | "error";
  collapsed: boolean;
};

type TerminalDockProps = {
  terminals: TerminalEntry[];
  activeId: string | null;
  isOpen: boolean;
  runningCount: number;
  onToggleOpen: () => void;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
};

export default function TerminalDock({
  terminals,
  activeId,
  isOpen,
  runningCount,
  onToggleOpen,
  onSelect,
  onClose
}: TerminalDockProps) {
  const [height, setHeight] = useState(240);
  const [isMaximized, setIsMaximized] = useState(false);
  const dragState = useRef<{ startY: number; startHeight: number } | null>(null);

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

  function handleToggleOpen() {
    onToggleOpen();
  }

  function handleSelect(id: string) {
    if (!isOpen) {
      onToggleOpen();
    }
    onSelect(id);
  }

  const tabs = terminals.map((term) => (
    <button
      key={term.id}
      type="button"
      className={`terminal-tab${term.id === activeId ? " active" : ""}`}
      onClick={() => handleSelect(term.id)}
    >
      <span className={`terminal-dot ${term.status}`} />
      {term.title}
    </button>
  ));

  return (
    <div className="terminal-dock">
      <div
        className={`terminal-container${isOpen ? " open" : ""}`}
        style={isOpen ? { height } : undefined}
      >
        <header className="terminal-header" onMouseDown={startDrag}>
          <button
            type="button"
            className={`terminal-toggle${runningCount > 0 ? " running" : ""}`}
            onClick={handleToggleOpen}
            aria-label="Toggle terminals"
          >
            Terminal
            {runningCount > 0 && <span className="terminal-badge">{runningCount}</span>}
          </button>
          <div className="terminal-actions">
            <button
              type="button"
              className="icon-button"
              onClick={toggleMaximize}
              aria-label="Maximize terminals"
              title="Maximize"
            >
              ☐
            </button>
            {active && (
              <button
                type="button"
                className="icon-button"
                onClick={handleToggleOpen}
                aria-label="Minimize terminal"
                title="Minimize"
              >
                ×
              </button>
            )}
          </div>
        </header>

        <div className="terminal-tabs">{tabs}</div>

        <div className="terminal-body">
          {!active ? (
            <div className="terminal-line">No active terminals.</div>
          ) : active.lines.length === 0 ? (
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
    </div>
  );
}
