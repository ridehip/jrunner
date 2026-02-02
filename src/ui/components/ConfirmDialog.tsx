import React, { useEffect } from "react";

type ConfirmOption = {
  label: string;
  value: string;
  tone?: "primary" | "danger" | "neutral";
};

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  options: ConfirmOption[];
  onSelect: (value: string) => void;
  onClose: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  options,
  onSelect,
  onClose
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  function handleBackdrop(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
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
          <p className="modal-message">{message}</p>
        </div>
        <footer className="modal-footer">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`modal-button ${option.tone ?? "neutral"}`}
              onClick={() => onSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </footer>
      </div>
    </div>
  );
}
