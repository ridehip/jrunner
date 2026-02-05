import React, { useEffect, useMemo, useState } from "react";

const emptyForm = {
  name: "",
  description: "",
  selectedScript: "",
  customCommand: "",
  color: "slate",
  columnId: "custom",
  commands: [] as string[]
};

type AddScriptModalProps = {
  open: boolean;
  packageScripts: Record<string, string>;
  existingNames: string[];
  mode: "add" | "edit";
  initial?: {
    name: string;
    description?: string;
    commands: string[];
    color?: string;
    columnId?: string;
  };
  originalName?: string | null;
  target: "custom" | "package";
  columns: { id: string; name: string; color?: string }[];
  onClose: () => void;
  onSave: (payload: {
    name: string;
    description: string;
    command: string[];
    color?: string;
    columnId?: string;
  }) => void;
};

export default function AddScriptModal({
  open,
  packageScripts,
  existingNames,
  mode,
  initial,
  originalName,
  target,
  columns,
  onClose,
  onSave
}: AddScriptModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const scriptNames = useMemo(() => Object.keys(packageScripts), [packageScripts]);
  const existingSet = useMemo(
    () => new Set(existingNames.map((name) => name.trim().toLowerCase())),
    [existingNames]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    if (initial) {
      setForm({
        name: initial.name ?? "",
        description: initial.description ?? "",
        selectedScript: "",
        customCommand: "",
        color: initial.color ?? "slate",
        columnId: initial.columnId ?? columns[0]?.id ?? "custom",
        commands: initial.commands ?? []
      });
    } else {
      setForm((prev) => ({
        ...prev,
        columnId: columns[0]?.id ?? "custom"
      }));
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        resetAndClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, initial]);

  function updateField(
    key: "name" | "description" | "selectedScript" | "customCommand" | "color" | "columnId",
    value: string
  ) {
    if (error) {
      setError(null);
    }
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addCommand() {
    const name = form.selectedScript;
    if (!name) {
      return;
    }
    const command = packageScripts[name];
    if (!command) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      commands: [...prev.commands, command]
    }));
  }

  function addCustomCommand(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      commands: [...prev.commands, trimmed],
      customCommand: ""
    }));
  }

  function removeCommand(index: number) {
    setForm((prev) => ({
      ...prev,
      commands: prev.commands.filter((_, i) => i !== index)
    }));
  }

  function resetAndClose() {
    setForm(emptyForm);
    setError(null);
    onClose();
  }

  function handleSave() {
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }

    if (
      existingSet.has(trimmedName.toLowerCase()) &&
      trimmedName.toLowerCase() !== (originalName ?? "").toLowerCase()
    ) {
      setError("Script name already exists.");
      return;
    }

    if (form.commands.length === 0) {
      setError("Add at least one command.");
      return;
    }

    onSave({
      name: trimmedName,
      description: form.description.trim(),
      command: form.commands,
      color: target === "custom" ? form.color : undefined,
      columnId: target === "custom" ? form.columnId : undefined
    });
    setForm(emptyForm);
    setError(null);
  }

  if (!open) {
    return null;
  }

  function handleBackdropClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      resetAndClose();
    }
  }

  const isSaveDisabled =
    !form.name.trim() ||
    form.commands.length === 0 ||
    (existingSet.has(form.name.trim().toLowerCase()) &&
      form.name.trim().toLowerCase() !== (originalName ?? "").toLowerCase());

  return (
    <div className="modal-backdrop" role="presentation" onClick={handleBackdropClick}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Add custom script">
        <header className="modal-header">
          <h2>{mode === "edit" ? "Edit custom script" : "Add custom script"}</h2>
          <button className="modal-close" onClick={resetAndClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="modal-body">
          <label>
            Name
            <input
              type="text"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="deploy-staging"
            />
          </label>

          <label>
            Description
            <input
              type="text"
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Runs the staging deploy steps"
            />
          </label>

          {target === "custom" && (
            <label>
              Color
              <select
                value={form.color}
                onChange={(event) => updateField("color", event.target.value)}
              >
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
          )}

          {target === "custom" && (
            <label>
              Column
              <select
                value={form.columnId}
                onChange={(event) => updateField("columnId", event.target.value)}
              >
                {columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="command-row">
            <label>
              Add command from package.json scripts
              <div className="command-controls">
                <select
                  value={form.selectedScript}
                  onChange={(event) => updateField("selectedScript", event.target.value)}
                >
                  <option value="">Select a script</option>
                  {scriptNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <button type="button" className="ghost" onClick={addCommand}>
                  +
                </button>
              </div>
            </label>
          </div>

          <div className="command-row">
            <label>
              Add custom command
              <div className="command-controls">
                <input
                  type="text"
                  value={form.customCommand}
                  onChange={(event) => updateField("customCommand", event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCustomCommand(form.customCommand);
                    }
                  }}
                  placeholder={`echo "hello"`}
                />
                <button
                  type="button"
                  className="ghost"
                  onClick={() => addCustomCommand(form.customCommand)}
                >
                  +
                </button>
              </div>
            </label>
          </div>

          <div className="command-list">
            <div className="command-title">Commands</div>
            {form.commands.length === 0 ? (
              <div className="command-empty">No commands added.</div>
            ) : (
              form.commands.map((cmd, index) => (
                <div className="command-item" key={`${cmd}-${index}`}>
                  <span className="command-text" title={cmd}>
                    {cmd}
                  </span>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => removeCommand(index)}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
          {error && <div className="form-error">{error}</div>}
        </div>

        <footer className="modal-footer">
          <button type="button" className="ghost" onClick={resetAndClose}>
            Cancel
          </button>
          <button type="button" className="run" onClick={handleSave} disabled={isSaveDisabled}>
            {mode === "edit" ? "Save changes" : "Save"}
          </button>
        </footer>
      </div>
    </div>
  );
}
