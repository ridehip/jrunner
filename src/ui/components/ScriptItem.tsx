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
  const detail = description && description.trim().length > 0 ? description : command;
  const formattedCommand = command
    .split("&&")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n");
  const commandLines = formattedCommand.split("\n");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

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

  async function handleCopyCommand() {
    closeMenu();
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = command;
      textarea.style.position = "fixed";
      textarea.style.top = "-1000px";
      textarea.style.left = "-1000px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (!hovered || menuOpen) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
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
  }, [hovered, menuOpen]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (!hovered || menuOpen) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "c") {
        event.preventDefault();
        handleCopyCommand();
      } else if (key === "d") {
        event.preventDefault();
        runAction(() => onDuplicate(name));
      } else if (key === "h") {
        event.preventDefault();
        runAction(() => onToggleHidden(name, !hidden));
      } else if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        runAction(() => onDelete(name));
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [hovered, menuOpen, name, hidden, onDuplicate, onToggleHidden, onDelete]);

  function handleRun(event: React.MouseEvent<HTMLDivElement>) {
    if (!menuOpen) {
      if (event.altKey) {
        onEdit(name);
      } else if (event.shiftKey) {
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
      onMouseEnter={() => {
        setHovered(true);
        showTooltip();
      }}
      onMouseLeave={() => {
        setHovered(false);
        hideTooltip();
      }}
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
            <div className="card-tooltip-command">
              {commandLines.map((line, index) => (
                <div className="card-tooltip-line" key={`${line}-${index}`}>
                  {line}
                </div>
              ))}
            </div>
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
                Edit (Opt)
              </button>
              <button type="button" onClick={() => runAction(() => onDuplicate(name))}>
                Duplicate (d)
              </button>
              <button type="button" onClick={handleCopyCommand}>
                Copy command (c)
              </button>
              <button type="button" onClick={() => runAction(() => onStackAdd(name))}>
                Stack (Shift)
              </button>
              <button type="button" onClick={() => runAction(() => onToggleHidden(name, !hidden))}>
                {hidden ? "Unhide (h)" : "Hide (h)"}
              </button>
              <button type="button" onClick={() => runAction(() => onDelete(name))}>
                Delete (Del/BS)
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
