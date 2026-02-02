import React from "react";
import ScriptItem from "./ScriptItem";

type ScriptItem = {
  name: string;
  description?: string;
  command: string;
};

type ScriptColumnProps = {
  title: string;
  scripts: ScriptItem[];
  emptyLabel: string;
  showEmpty?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  addCardLabel?: string;
  onAddCard?: () => void;
  onRun?: (name: string) => void;
  onEdit?: (name: string) => void;
  onDuplicate?: (name: string) => void;
  onDelete?: (name: string) => void;
  onToggleHidden?: (name: string, hidden: boolean) => void;
};

export default function ScriptColumn({
  title,
  scripts,
  emptyLabel,
  showEmpty = true,
  actionLabel,
  onAction,
  addCardLabel,
  onAddCard,
  onRun,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleHidden
}: ScriptColumnProps) {
  return (
    <div className="column">
      <div className="column-header">
        <h2>{title}</h2>
        {actionLabel && onAction && (
          <button className="ghost column-action" type="button" onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </div>
      {scripts.length === 0 && showEmpty ? (
        <div className="card">
          <p>{emptyLabel}</p>
        </div>
      ) : (
        scripts.map((script) => (
          <ScriptItem
            key={script.name}
            name={script.name}
            description={script.description}
            command={script.command}
            hidden={script.hidden}
            onRun={onRun ?? (() => {})}
            onEdit={onEdit ?? (() => {})}
            onDuplicate={onDuplicate ?? (() => {})}
            onDelete={onDelete ?? (() => {})}
            onToggleHidden={onToggleHidden ?? (() => {})}
          />
        ))
      )}
      {addCardLabel && onAddCard && (
        <button className="card add-card" type="button" onClick={onAddCard}>
          {addCardLabel}
        </button>
      )}
    </div>
  );
}
