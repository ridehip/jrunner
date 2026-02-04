import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ScriptItemProps = {
  name: string;
  description?: string;
  command: string;
  hidden?: boolean;
  color?: string;
  onRun: (name: string) => void;
  onStackAdd: (name: string) => void;
  onEdit: (name: string) => void;
  onDuplicate: (name: string) => void;
  onDelete: (name: string) => void;
  onToggleHidden: (name: string, hidden: boolean) => void;
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (event: React.DragEvent<HTMLDivElement>) => void;
};

export default function ScriptItem({
  name,
  description,
  command,
  hidden,
  color,
  onRun,
  onStackAdd,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleHidden,
  draggable,
  onDragStart,
  onDragOver,
  onDrop
}: ScriptItemProps) {
  const detail = description ?? command;
  const formattedCommand = command
    .split("&&")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" && ");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  function openMenu(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setMenuPos({ x: event.clientX, y: event.clientY });
    setMenuOpen(true);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  function runAction(action: () => void) {
    closeMenu();
    const immediate = (globalThis as typeof globalThis & { setImmediate?: (cb: () => void) => void })
      .setImmediate;
    if (immediate) {
      immediate(action);
    } else {
      setTimeout(action, 0);
    }
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      window.addEventListener("keydown", handleKey);
    }

    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  function handleRun(event: React.MouseEvent<HTMLDivElement>) {
    if (!menuOpen) {
      if (event.shiftKey) {
        onStackAdd(name);
      } else {
        onRun(name);
      }
    }
  }

  function showTooltip() {
    setTooltipOpen(true);
  }

  function hideTooltip() {
    setTooltipOpen(false);
  }

  return (
    <div
      className={`card clickable${hidden ? " hidden" : ""}${color ? ` color-${color}` : ""}`}
      onClick={handleRun}
      onContextMenu={openMenu}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", name);
        onDragStart?.(event);
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <h3 className="card-title">{name}</h3>
      <p className="card-meta">{detail}</p>
      {hidden && <span className="card-hidden">Hidden</span>}
      {tooltipOpen &&
        createPortal(
          <div className="card-tooltip">
            <div className="card-tooltip-title">{name}</div>
            <pre className="card-tooltip-command">{formattedCommand}</pre>
          </div>,
          document.body
        )}
      {menuOpen &&
        menuPos &&
        createPortal(
          <div className="context-menu-layer">
            <button
              type="button"
              className="context-menu-backdrop"
              onClick={closeMenu}
              aria-label="Close menu"
            />
            <div
              className="context-menu open"
              role="menu"
              ref={menuRef}
              style={{ left: menuPos.x, top: menuPos.y }}
              onClick={(event) => event.stopPropagation()}
            >
              <button type="button" onClick={() => runAction(() => onEdit(name))}>
                Edit
              </button>
              <button type="button" onClick={() => runAction(() => onDuplicate(name))}>
                Duplicate
              </button>
              <button type="button" onClick={() => runAction(() => onToggleHidden(name, !hidden))}>
                {hidden ? "Unhide" : "Hide"}
              </button>
              <button type="button" onClick={() => runAction(() => onDelete(name))}>
                Delete
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
