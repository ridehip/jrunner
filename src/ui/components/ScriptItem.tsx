import React, { useEffect, useRef, useState } from "react";

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
  onRun,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleHidden
}: ScriptItemProps) {
  const detail = description ?? command;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  function openMenu(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setMenuOpen(true);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current || menuRef.current.contains(event.target as Node)) {
        return;
      }
      setMenuOpen(false);
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      window.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("keydown", handleKey);
    }

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
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
      className={`card clickable${hidden ? " hidden" : ""}`}
      onClick={handleRun}
      onContextMenu={openMenu}
    >
      <h3 className="card-title">{name}</h3>
      <p className="card-meta">{detail}</p>
      {hidden && <span className="card-hidden">Hidden</span>}
      <div
        className={`context-menu${menuOpen ? " open" : ""}`}
        role="menu"
        ref={menuRef}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" onClick={() => onEdit(name)}>
          Edit
        </button>
        <button type="button" onClick={() => onDuplicate(name)}>
          Duplicate
        </button>
        <button type="button" onClick={() => onToggleHidden(name, !hidden)}>
          {hidden ? "Unhide" : "Hide"}
        </button>
        <button type="button" onClick={() => onDelete(name)}>
          Delete
        </button>
      </div>
    </div>
  );
}
