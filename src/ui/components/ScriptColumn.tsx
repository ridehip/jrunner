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
  actionLabel?: string;
  onAction?: () => void;
  onRun?: (name: string) => void;
  onEdit?: (name: string) => void;
  onDuplicate?: (name: string) => void;
  onDelete?: (name: string) => void;
};

export default function ScriptColumn({
  title,
  scripts,
  emptyLabel,
  actionLabel,
  onAction,
  onRun,
  onEdit,
  onDuplicate,
  onDelete
}: ScriptColumnProps) {
  return (
    <div className="column">
      <div className="column-header">
        <h2>{title}</h2>
        {actionLabel && onAction && (
          <button className="ghost" type="button" onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </div>
      {scripts.length === 0 ? (
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
            onRun={onRun ?? (() => {})}
            onEdit={onEdit ?? (() => {})}
            onDuplicate={onDuplicate ?? (() => {})}
            onDelete={onDelete ?? (() => {})}
          />
        ))
      )}
    </div>
  );
}
