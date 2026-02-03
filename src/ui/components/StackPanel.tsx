import React, { useState } from "react";

type StackItem = {
  id: string;
  label: string;
  detail?: string;
  color?: string;
};

type StackPanelProps = {
  items: StackItem[];
  placeholder: string;
  onExecute: () => void;
  onClear: () => void;
  onRemove: (id: string) => void;
  onReorder: (from: number, to: number) => void;
};

export default function StackPanel({
  items,
  placeholder,
  onExecute,
  onClear,
  onRemove,
  onReorder
}: StackPanelProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      return;
    }
    onReorder(dragIndex, index);
    setDragIndex(null);
  }

  return (
    <div className="stack-panel">
      <div className="stack-placeholder">{placeholder}</div>
      <div className="stack-items">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`stack-item${item.color ? ` color-${item.color}` : ""}`}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(index)}
          >
            <div className="stack-label" title={item.label}>
              {item.label}
            </div>
            <button
              type="button"
              className="stack-remove"
              onClick={() => onRemove(item.id)}
              aria-label={`Remove ${item.label}`}
              title="Remove"
            >
              ×
            </button>
          </div>
        ))}
        {items.length > 0 && (
          <>
            <button type="button" className="stack-execute" onClick={onExecute}>
              Execute
            </button>
            <button type="button" className="stack-clear" onClick={onClear}>
              Clear
            </button>
          </>
        )}
      </div>
    </div>
  );
}
