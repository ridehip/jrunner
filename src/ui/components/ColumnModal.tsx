import React, { useEffect, useState } from "react";

type ColumnModalProps = {
  open: boolean;
  title: string;
  initialName?: string;
  onClose: () => void;
  onSave: (name: string) => void;
};

export default function ColumnModal({
  open,
  title,
  initialName,
  onClose,
  onSave
}: ColumnModalProps) {
  const [name, setName] = useState(initialName ?? "");

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(initialName ?? "");

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, initialName, onClose]);

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
    onSave(trimmed);
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
