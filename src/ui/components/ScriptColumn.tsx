import React from "react";
import ScriptItem from "./ScriptItem";

type ScriptItem = {
  name: string;
  description?: string;
  command: string;
  hidden?: boolean;
  color?: string;
};

type ScriptColumnProps = {
  title: string;
  scripts: ScriptItem[];
  emptyLabel: string;
  color?: string;
  showEmpty?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  addCardLabel?: string;
  onAddCard?: () => void;
  onEditColumn?: () => void;
  onDeleteColumn?: () => void;
  onDragColumnStart?: () => void;
  onDropColumn?: () => void;
  onRun?: (name: string) => void;
  onStackAdd?: (name: string) => void;
  onEdit?: (name: string) => void;
  onDuplicate?: (name: string) => void;
  onDelete?: (name: string) => void;
  onToggleHidden?: (name: string, hidden: boolean) => void;
  onDragScriptStart?: (name: string) => void;
  onDropScript?: (name: string, index: number) => void;
  onDropToColumnEnd?: () => void;
};

export default function ScriptColumn({
  title,
  scripts,
  emptyLabel,
  color,
  showEmpty = true,
  actionLabel,
  onAction,
  addCardLabel,
  onAddCard,
  onEditColumn,
  onDeleteColumn,
  onDragColumnStart,
  onDropColumn,
  onRun,
  onStackAdd,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleHidden,
  onDragScriptStart,
  onDropScript,
  onDropToColumnEnd
}: ScriptColumnProps) {
  return (
    <div
      className={`column${color ? ` color-${color}` : ""}`}
      onDragOver={(event) => onDropToColumnEnd && event.preventDefault()}
      onDrop={onDropToColumnEnd}
    >
      <div
        className="column-header"
        draggable={!!onDragColumnStart}
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", title);
          onDragColumnStart?.();
        }}
        onDragOver={(event) => onDropColumn && event.preventDefault()}
        onDrop={onDropColumn}
      >
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
      <div className="column-body">
        {scripts.length === 0 && showEmpty ? (
          <div className="card">
            <p>{emptyLabel}</p>
          </div>
        ) : (
          scripts.map((script, index) => (
            <ScriptItem
              key={script.name}
              name={script.name}
              description={script.description}
              command={script.command}
              hidden={script.hidden}
              color={script.color}
              onRun={onRun ?? (() => {})}
              onStackAdd={onStackAdd ?? (() => {})}
              onEdit={onEdit ?? (() => {})}
              onDuplicate={onDuplicate ?? (() => {})}
              onDelete={onDelete ?? (() => {})}
              onToggleHidden={onToggleHidden ?? (() => {})}
              draggable={!!onDragScriptStart}
              onDragStart={() => onDragScriptStart?.(script.name)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => onDropScript?.(script.name, index)}
            />
          ))
        )}
        {addCardLabel && onAddCard && (
          <button className="card add-card" type="button" onClick={onAddCard}>
            {addCardLabel}
          </button>
        )}
      </div>
    </div>
  );
}
