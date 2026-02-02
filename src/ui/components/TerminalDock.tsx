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
  const [width, setWidth] = useState(640);
  const [isMaximized, setIsMaximized] = useState(false);
  const dragState = useRef<
    | { mode: "height"; startY: number; startHeight: number }
    | { mode: "width"; startX: number; startWidth: number }
    | { mode: "both"; startX: number; startY: number; startWidth: number; startHeight: number }
    | null
  >(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const active = terminals.find((term) => term.id === activeId) ?? null;
  const minHeight = 160;
  const maxHeight = Math.max(300, Math.floor(window.innerHeight * 0.9));
  const minWidth = 360;
  const maxWidth = Math.floor(window.innerWidth * 0.95);

  useEffect(() => {
    function onMove(event: MouseEvent) {
      if (!dragState.current) {
        return;
      }
      if (isMaximized) {
        return;
      }
      if (dragState.current.mode === "height") {
        const delta = dragState.current.startY - event.clientY;
        const next = Math.min(
          maxHeight,
          Math.max(minHeight, dragState.current.startHeight + delta)
        );
        setHeight(next);
      }
      if (dragState.current.mode === "width") {
        const delta = dragState.current.startX - event.clientX;
        const next = Math.min(
          maxWidth,
          Math.max(minWidth, dragState.current.startWidth + delta)
        );
        setWidth(next);
      }
      if (dragState.current.mode === "both") {
        const deltaX = dragState.current.startX - event.clientX;
        const deltaY = dragState.current.startY - event.clientY;
        const nextWidth = Math.min(
          maxWidth,
          Math.max(minWidth, dragState.current.startWidth + deltaX)
        );
        const nextHeight = Math.min(
          maxHeight,
          Math.max(minHeight, dragState.current.startHeight + deltaY)
        );
        setWidth(nextWidth);
        setHeight(nextHeight);
      }
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

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (!bodyRef.current) {
      return;
    }
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [activeId, terminals, isOpen]);

  function startDrag(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest(".terminal-actions")) {
      return;
    }
    dragState.current = { mode: "height", startY: event.clientY, startHeight: height };
  }

  function startResizeWidth(event: React.MouseEvent<HTMLDivElement>) {
    dragState.current = { mode: "width", startX: event.clientX, startWidth: width };
  }

  function startResizeDiagonal(event: React.MouseEvent<HTMLDivElement>) {
    dragState.current = {
      mode: "both",
      startX: event.clientX,
      startY: event.clientY,
      startWidth: width,
      startHeight: height
    };
  }

  function toggleMaximize() {
    setIsMaximized((prev) => {
      const next = !prev;
      setHeight(next ? maxHeight : 240);
      setWidth(next ? maxWidth : 640);
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
    <div key={term.id} className={`terminal-tab${term.id === activeId ? " active" : ""}`}>
      <button type="button" className="terminal-tab-main" onClick={() => handleSelect(term.id)}>
        <span className={`terminal-dot ${term.status}`} />
        {term.title}
      </button>
      <button
        type="button"
        className="terminal-tab-close"
        onClick={() => onClose(term.id)}
        aria-label={`Close ${term.title}`}
        title="Close"
      >
        ×
      </button>
    </div>
  ));

  return (
    <div className="terminal-dock">
      <div
        className={`terminal-container${isOpen ? " open" : ""}`}
        style={isOpen ? { height, width } : undefined}
      >
        <div className="terminal-resize-handle" onMouseDown={startResizeWidth} />
        <div className="terminal-resize-corner" onMouseDown={startResizeDiagonal} />
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

        <div className="terminal-body" ref={bodyRef}>
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
