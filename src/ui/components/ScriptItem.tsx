import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ScriptItemProps = {
  name: string;
  description?: string;
  command: string;
  hidden?: boolean;
  onRun: (name: string) => void;
  onEdit: (name: string) => void;
  onDuplicate: (name: string) => void;
  onDelete: (name: string) => void;
  onToggleHidden: (name: string, hidden: boolean) => void;
};

export default function ScriptItem({
  name,
  description,
  command,
  hidden,
  color,
  onRun,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleHidden
}: ScriptItemProps) {
  const detail = description ?? command;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  function handleRun() {
    if (!menuOpen) {
      onRun(name);
    }
  }

  return (
    <div
      className={`card clickable${hidden ? " hidden" : ""}${color ? ` color-${color}` : ""}`}
      onClick={handleRun}
      onContextMenu={openMenu}
    >
      <h3 className="card-title">{name}</h3>
      <p className="card-meta">{detail}</p>
      {hidden && <span className="card-hidden">Hidden</span>}
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
