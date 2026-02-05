import React, { useEffect, useState } from "react";

type ColumnModalProps = {
  open: boolean;
  title: string;
  initialName?: string;
  initialColor?: string;
  onClose: () => void;
  onSave: (name: string, color: string) => void;
};

export default function ColumnModal({
  open,
  title,
  initialName,
  initialColor,
  onClose,
  onSave
}: ColumnModalProps) {
  const [name, setName] = useState(initialName ?? "");
  const [color, setColor] = useState(initialColor ?? "");

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(initialName ?? "");
    setColor(initialColor ?? "");

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, initialName, initialColor, onClose]);

  if (!open) {
    return null;
  }

  function handleBackdrop(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    onSave(trimmed, color);
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={handleBackdrop}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="modal-body">
          <label>
            Column name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Deploy"
            />
          </label>
          <label>
            Color
            <select value={color} onChange={(event) => setColor(event.target.value)}>
              <option value="">Default</option>
              <option value="slate">Slate</option>
              <option value="teal">Teal</option>
              <option value="amber">Amber</option>
              <option value="rose">Rose</option>
              <option value="violet">Violet</option>
              <option value="lime">Lime</option>
              <option value="sky">Sky</option>
              <option value="orange">Orange</option>
            </select>
          </label>
        </div>
        <footer className="modal-footer">
          <button type="button" className="modal-button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="modal-button primary" onClick={handleSave}>
            Save
          </button>
        </footer>
      </div>
    </div>
  );
}
