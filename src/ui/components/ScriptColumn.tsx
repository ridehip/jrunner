import React from "react";
import ScriptItem from "./ScriptItem";

type ScriptItem = {
  name: string;
  description?: string;
  command: string;
  color?: string;
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
  onEditColumn?: () => void;
  onDeleteColumn?: () => void;
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
  onEditColumn,
  onDeleteColumn,
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
        {(onEditColumn || onDeleteColumn) && (
          <div className="column-actions">
            {onEditColumn && (
              <button
                type="button"
                className="icon-ghost"
                onClick={onEditColumn}
                aria-label="Edit column"
                title="Edit column"
              >
                <i className="fa-solid fa-pen" />
              </button>
            )}
            {onDeleteColumn && (
              <button
                type="button"
                className="icon-ghost"
                onClick={onDeleteColumn}
                aria-label="Delete column"
                title="Delete column"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
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
            color={script.color}
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
