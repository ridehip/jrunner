import React, { useEffect, useMemo, useRef, useState } from "react";
import AddScriptModal from "./components/AddScriptModal";
import ColumnModal from "./components/ColumnModal";
import ConfirmDialog from "./components/ConfirmDialog";
import ScriptColumn from "./components/ScriptColumn";
import StackPanel from "./components/StackPanel";
import TerminalDock, { TerminalEntry } from "./components/TerminalDock";

type PackageScripts = Record<string, string>;

type CustomScript = {
  name: string;
  command: string[] | string;
  description?: string;
  hidden?: boolean;
  color?: string;
  columnId?: string;
};

type ScriptsResponse = {
  packageScripts: PackageScripts;
  packageMeta?: { name?: string; version?: string };
  customScripts: CustomScript[];
  initialized?: boolean;
  overridesPresent?: boolean;
  hiddenScripts?: string[];
  columns?: { id: string; name: string }[];
};

export default function App() {
  const [data, setData] = useState<ScriptsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(true);
  const [overridesPresent, setOverridesPresent] = useState(true);
  const [hiddenScripts, setHiddenScripts] = useState<string[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [packageMeta, setPackageMeta] = useState<{ name: string; version: string }>({
    name: "jrunner",
    version: ""
  });
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [terminals, setTerminals] = useState<TerminalEntry[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [addTarget, setAddTarget] = useState<"custom" | "package">("custom");
  const [columnModal, setColumnModal] = useState<{
    open: boolean;
    mode: "add" | "edit";
    id?: string;
    name?: string;
  }>({ open: false, mode: "add" });
  const [modalInitial, setModalInitial] = useState<{
    name: string;
    description?: string;
    commands: string[];
    color?: string;
    columnId?: string;
  } | null>(null);
  const dragState = useRef<{ type: "column" | "script"; id: string; columnId?: string } | null>(
    null
  );
  const [originalName, setOriginalName] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    options: { label: string; value: string; tone?: "primary" | "danger" | "neutral" }[];
    onSelect: (value: string) => void | Promise<void>;
  } | null>(null);
  const [stack, setStack] = useState<
    { id: string; label: string; detail?: string; command: string | string[]; color?: string }[]
  >([]);

  function updateData(updater: (prev: ScriptsResponse) => ScriptsResponse) {
    setData((prev) =>
      updater(
        prev ?? {
          packageScripts: {},
          customScripts: [],
          columns: [{ id: "custom", name: "custom scripts" }]
        }
      )
    );
  }

  async function loadScripts(signal?: AbortSignal) {
    const res = await fetch("/api/scripts", { signal });
    if (!res.ok) {
      throw new Error("Failed to load scripts");
    }
    const json = (await res.json()) as ScriptsResponse;
    setData(json);
    setInitialized(json.initialized !== false);
    setOverridesPresent(json.overridesPresent !== false);
    setHiddenScripts(json.hiddenScripts ?? []);
    setPackageMeta({
      name: json.packageMeta?.name ?? "jrunner",
      version: json.packageMeta?.version ?? ""
    });
  }

  useEffect(() => {
    const controller = new AbortController();
    loadScripts(controller.signal).catch((err) => {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    });
    return () => controller.abort();
  }, []);

  const packageEntries = Object.entries(data?.packageScripts ?? {});
  const customEntries = data?.customScripts ?? [];
  const columns = data?.columns ?? [{ id: "custom", name: "custom scripts" }];

  const packageScripts = useMemo(() => {
    return packageEntries.map(([name, command]) => ({
      name,
      command,
      hidden: hiddenScripts.includes(name),
      color: "grey"
    }));
  }, [packageEntries, hiddenScripts]);

  const customScripts = useMemo(() => {
    return customEntries.map((script) => ({
      name: script.name,
      description: script.description,
      command: Array.isArray(script.command) ? script.command.join(" && ") : script.command,
      hidden: script.hidden === true || hiddenScripts.includes(script.name),
      color: script.color ?? "slate",
      columnId: script.columnId ?? "custom"
    }));
  }, [customEntries, hiddenScripts]);

  const packageScriptMap = useMemo(() => {
    return Object.fromEntries(packageEntries);
  }, [packageEntries]);

  const existingNamesForModal = useMemo(() => {
    if (addTarget === "package") {
      return Object.keys(packageScriptMap);
    }
    return customEntries.map((script) => script.name);
  }, [addTarget, packageScriptMap, customEntries]);

  const visiblePackageScripts = useMemo(() => {
    return showHidden ? packageScripts : packageScripts.filter((script) => !script.hidden);
  }, [packageScripts, showHidden]);

  const visibleCustomScripts = useMemo(() => {
    return showHidden ? customScripts : customScripts.filter((script) => !script.hidden);
  }, [customScripts, showHidden]);

  const customScriptsByColumn = useMemo(() => {
    const grouped = new Map<string, typeof visibleCustomScripts>();
    for (const column of columns) {
      grouped.set(column.id, []);
    }
    for (const script of visibleCustomScripts) {
      const key = script.columnId ?? "custom";
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)?.push(script);
    }
    return grouped;
  }, [columns, visibleCustomScripts]);

  function handleColumnDragStart(id: string) {
    dragState.current = { type: "column", id };
  }

  async function handleColumnDrop(targetId: string) {
    if (!dragState.current || dragState.current.type !== "column") {
      return;
    }
    const fromId = dragState.current.id;
    if (fromId === targetId) {
      return;
    }
    const current = columns.map((col) => col.id);
    const fromIndex = current.indexOf(fromId);
    const toIndex = current.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) {
      return;
    }
    const next = [...current];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    const map = new Map(columns.map((c) => [c.id, c]));
    updateData((prev) => ({
      ...prev,
      columns: next.map((id) => map.get(id)!).filter(Boolean)
    }));
    await fetch("/api/columns/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next })
    });
    dragState.current = null;
  }

  function handleScriptDragStart(name: string, columnId: string) {
    dragState.current = { type: "script", id: name, columnId };
  }

  async function handleScriptDrop(targetName: string, targetIndex: number, targetColumnId: string) {
    if (!dragState.current || dragState.current.type !== "script") {
      return;
    }
    const sourceName = dragState.current.id;
    const sourceColumnId = dragState.current.columnId ?? "custom";
    if (sourceName === targetName && sourceColumnId === targetColumnId) {
      return;
    }
    const ordered = [...customEntries];
    const sourceIndex = ordered.findIndex((s) => s.name === sourceName);
    if (sourceIndex === -1) {
      return;
    }
    const [moved] = ordered.splice(sourceIndex, 1);
    moved.columnId = targetColumnId;
    const targetIndices = ordered
      .map((s, idx) => ({ s, idx }))
      .filter(({ s }) => (s.columnId ?? "custom") === targetColumnId);
    const insertIndex =
      targetIndices[targetIndex]?.idx ?? ordered.length;
    ordered.splice(insertIndex, 0, moved);

    const columnIdByName = Object.fromEntries(
      ordered.map((s) => [s.name, s.columnId ?? "custom"])
    );
    const order = ordered.map((s) => s.name);
    updateData((prev) => ({ ...prev, customScripts: ordered }));

    await fetch("/api/custom-scripts/arrange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order, columnIdByName })
    });
    dragState.current = null;
  }

  async function handleScriptDropToEnd(targetColumnId: string) {
    if (!dragState.current || dragState.current.type !== "script") {
      return;
    }
    const sourceName = dragState.current.id;
    const ordered = [...customEntries];
    const sourceIndex = ordered.findIndex((s) => s.name === sourceName);
    if (sourceIndex === -1) {
      return;
    }
    const [moved] = ordered.splice(sourceIndex, 1);
    moved.columnId = targetColumnId;
    const lastIndex = [...ordered]
      .map((s, idx) => ({ s, idx }))
      .filter(({ s }) => (s.columnId ?? "custom") === targetColumnId)
      .pop()?.idx;
    if (lastIndex === undefined) {
      ordered.push(moved);
    } else {
      ordered.splice(lastIndex + 1, 0, moved);
    }

    const columnIdByName = Object.fromEntries(
      ordered.map((s) => [s.name, s.columnId ?? "custom"])
    );
    const order = ordered.map((s) => s.name);
    updateData((prev) => ({ ...prev, customScripts: ordered }));

    await fetch("/api/custom-scripts/arrange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order, columnIdByName })
    });
    dragState.current = null;
  }

  function handleRunFromPackage(name: string) {
    const command = packageScriptMap[name];
    if (!command) {
      return;
    }
    runScript(name, command);
  }

  function handleRunFromCustom(name: string) {
    const script = customEntries.find((item) => item.name === name);
    if (!script) {
      return;
    }
    runScript(name, script.command);
  }

  function addToStackFromPackage(name: string) {
    const command = packageScriptMap[name];
    if (!command) {
      return;
    }
    setStack((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: name, detail: command, command, color: "grey" }
    ]);
  }

  function addToStackFromCustom(name: string) {
    const script = customEntries.find((item) => item.name === name);
    if (!script) {
      return;
    }
    const detail = Array.isArray(script.command) ? script.command.join(" && ") : script.command;
    setStack((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: name,
        detail,
        command: script.command,
        color: script.color ?? "slate"
      }
    ]);
  }

  function removeFromStack(id: string) {
    setStack((prev) => prev.filter((item) => item.id !== id));
  }

  function reorderStack(from: number, to: number) {
    setStack((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  async function runScript(name: string, command: string | string[]) {
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, command })
      });
      if (!res.ok) {
        throw new Error("Failed to start script");
      }
      const json = (await res.json()) as { id: string };
      const entry: TerminalEntry = {
        id: json.id,
        title: name,
        lines: [],
        status: "running",
        collapsed: false
      };
      setTerminals((prev) => [entry, ...prev]);
      setActiveTerminalId(json.id);
      setTerminalOpen(true);
      streamRun(json.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  function streamRun(id: string) {
    const source = new EventSource(`/api/runs/${id}/stream`);
    source.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { type: string; data: string };
      const cleaned = payload.data.replace(
        /\u001b\[[0-9;]*m|\u001b\][0-9;]*[^\u0007]*\u0007/g,
        ""
      );
      setTerminals((prev) =>
        prev.map((term) =>
          term.id === id
            ? {
              ...term,
              lines: [
                ...term.lines,
                ...cleaned.split(/\\r?\\n/).filter((line) => line.length > 0)
              ]
            }
            : term
        )
      );
    };
    source.addEventListener("end", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as { code: number | null };
      setTerminals((prev) =>
        prev.map((term) =>
          term.id === id
            ? {
              ...term,
              status: payload.code === 0 ? "done" : "error",
              lines: [...term.lines, `exit ${payload.code}`]
            }
            : term
        )
      );
      source.close();
    });
    source.onerror = () => {
      source.close();
    };
  }

  function openConfirmDialog(config: {
    title: string;
    message: string;
    options: { label: string; value: string; tone?: "primary" | "danger" | "neutral" }[];
    onSelect: (value: string) => void | Promise<void>;
  }) {
    setConfirm(config);
  }

  function closeConfirmDialog() {
    setConfirm(null);
  }

  async function closeTerminal(id: string) {
    const target = terminals.find((term) => term.id === id);
    if (target?.status === "running") {
      openConfirmDialog({
        title: "Cancel running script",
        message: `Stop \"${target.title}\" and close its tab?`,
        options: [
          { label: "Keep running", value: "keep" },
          { label: "Cancel run", value: "cancel", tone: "danger" }
        ],
        onSelect: async (value) => {
          closeConfirmDialog();
          if (value !== "cancel") {
            return;
          }
          await fetch(`/api/runs/${id}/stop`, { method: "POST" });
          setTerminals((prev) => prev.filter((term) => term.id !== id));
          setActiveTerminalId((current) => (current === id ? null : current));
        }
      });
      return;
    }
    setTerminals((prev) => prev.filter((term) => term.id !== id));
    setActiveTerminalId((current) => (current === id ? null : current));
  }

  async function handleSaveScript(payload: {
    name: string;
    description: string;
    command: string[];
    color?: string;
    columnId?: string;
  }) {
    try {
      setSaving(true);
      if (addTarget === "package") {
        const res = await fetch("/api/package-scripts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, originalName })
        });
        if (!res.ok) {
          throw new Error("Failed to save package.json script");
        }
        const json = (await res.json()) as { packageScripts: PackageScripts };
        setData((prev) => ({
          packageScripts: json.packageScripts ?? prev?.packageScripts ?? {},
          customScripts: prev?.customScripts ?? []
        }));
      } else {
        const method = modalMode === "edit" ? "PUT" : "POST";
        const body =
          modalMode === "edit"
            ? JSON.stringify({ ...payload, originalName })
            : JSON.stringify(payload);
        const res = await fetch("/api/custom-scripts", {
          method,
          headers: { "Content-Type": "application/json" },
          body
        });
        if (!res.ok) {
          throw new Error("Failed to save custom script");
        }
        const json = (await res.json()) as { customScripts: CustomScript[] };
        setData((prev) => ({
          packageScripts: prev?.packageScripts ?? {},
          customScripts: json.customScripts
        }));
      }
      setShowModal(false);
      setModalInitial(null);
      setOriginalName(null);
      setModalMode("add");
      setAddTarget("custom");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function openAddModal(target: "custom" | "package" = "custom") {
    setModalMode("add");
    setAddTarget(target);
    setModalInitial(null);
    setOriginalName(null);
    setShowModal(true);
  }

  function openEditModal(
    name: string,
    command: string | string[],
    description?: string,
    target: "custom" | "package" = "custom"
  ) {
    setModalMode("edit");
    setAddTarget(target);
    setModalInitial({
      name,
      description,
      commands: Array.isArray(command) ? command : [command],
      color: target === "custom" ? customEntries.find((item) => item.name === name)?.color : undefined,
      columnId:
        target === "custom"
          ? customEntries.find((item) => item.name === name)?.columnId ?? "custom"
          : undefined
    });
    setOriginalName(name);
    setShowModal(true);
  }

  async function handleInit() {
    try {
      setSaving(true);
      const res = await fetch("/api/init", { method: "POST" });
      if (!res.ok) {
        throw new Error("Failed to initialize");
      }
      await loadScripts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function openOverridesPrompt(onContinue: () => void) {
    if (overridesPresent) {
      onContinue();
      return;
    }
    openConfirmDialog({
      title: "Create overrides file",
      message:
        "To apply overrides, .jrunner-conf-overrides.json will be created and added to .gitignore.",
      options: [
        { label: "Cancel", value: "cancel" },
        { label: "Create", value: "create", tone: "primary" }
      ],
      onSelect: async (value) => {
        closeConfirmDialog();
        if (value !== "create") {
          return;
        }
        onContinue();
      }
    });
  }

  async function handleHideToggle(name: string, hidden: boolean) {
    openOverridesPrompt(async () => {
      await fetch("/api/overrides/hide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, hidden })
      });
      await loadScripts();
    });
  }

  async function deleteScript(payload: {
    name: string;
    removeFromPackage: boolean;
    removeFromCustom: boolean;
  }) {
    try {
      setSaving(true);
      const res = await fetch("/api/delete-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error("Failed to delete script");
      }
      const json = (await res.json()) as ScriptsResponse;
      setData((prev) => ({
        packageScripts: json.packageScripts ?? prev?.packageScripts ?? {},
        customScripts: json.customScripts ?? prev?.customScripts ?? []
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCustom(name: string) {
    openConfirmDialog({
      title: "Delete custom script",
      message: `Delete \"${name}\" from jrunner-conf.json?`,
      options: [
        { label: "Cancel", value: "cancel" },
        { label: "Delete", value: "delete", tone: "danger" }
      ],
      onSelect: async (value) => {
        closeConfirmDialog();
        if (value !== "delete") {
          return;
        }
        await deleteScript({ name, removeFromPackage: false, removeFromCustom: true });
      }
    });
  }

  async function handleDeletePackage(name: string) {
    openConfirmDialog({
      title: "Remove script",
      message: `Remove \"${name}\" from package.json? This deletes the script for real.`,
      options: [
        { label: "Cancel", value: "cancel" },
        { label: "Remove from package.json", value: "package", tone: "danger" }
      ],
      onSelect: async (value) => {
        closeConfirmDialog();
        if (value === "cancel") {
          return;
        }
        await deleteScript({
          name,
          removeFromPackage: true,
          removeFromCustom: false
        });
      }
    });
  }

  function handleAddFromPackageColumn() {
    openConfirmDialog({
      title: "Add script",
      message: "Where should the new script be saved?",
      options: [
        { label: "Cancel", value: "cancel" },
        { label: "package.json", value: "package", tone: "primary" },
        { label: "jrunner-conf.json", value: "custom", tone: "primary" }
      ],
      onSelect: async (value) => {
        closeConfirmDialog();
        if (value === "cancel") {
          return;
        }
        if (value === "custom") {
          openAddModal("custom");
          return;
        }
        openAddModal("package");
      }
    });
  }

  function openAddColumnModal() {
    setColumnModal({ open: true, mode: "add" });
  }

  function openEditColumnModal(id: string, name: string) {
    setColumnModal({ open: true, mode: "edit", id, name });
  }

  async function saveColumn(name: string) {
    try {
      setSaving(true);
      if (columnModal.mode === "add") {
        const res = await fetch("/api/columns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name })
        });
        if (!res.ok) {
          throw new Error("Failed to create column");
        }
        const json = (await res.json()) as { columns: { id: string; name: string }[]; customScripts: CustomScript[] };
        setData((prev) => ({
          packageScripts: prev?.packageScripts ?? {},
          customScripts: json.customScripts ?? prev?.customScripts ?? [],
          columns: json.columns ?? prev?.columns ?? []
        }));
      } else if (columnModal.id) {
        const res = await fetch(`/api/columns/${columnModal.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name })
        });
        if (!res.ok) {
          throw new Error("Failed to update column");
        }
        const json = (await res.json()) as { columns: { id: string; name: string }[]; customScripts: CustomScript[] };
        setData((prev) => ({
          packageScripts: prev?.packageScripts ?? {},
          customScripts: json.customScripts ?? prev?.customScripts ?? [],
          columns: json.columns ?? prev?.columns ?? []
        }));
      }
      setColumnModal({ open: false, mode: "add" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteColumn(id: string, name: string) {
    openConfirmDialog({
      title: "Delete column",
      message: `Delete "${name}"? Scripts will move to the default column.`,
      options: [
        { label: "Cancel", value: "cancel" },
        { label: "Delete column", value: "delete", tone: "danger" }
      ],
      onSelect: async (value) => {
        closeConfirmDialog();
        if (value !== "delete") {
          return;
        }
        try {
          setSaving(true);
          const res = await fetch(`/api/columns/${id}`, { method: "DELETE" });
          if (!res.ok) {
            throw new Error("Failed to delete column");
          }
          const json = (await res.json()) as {
            columns: { id: string; name: string }[];
            customScripts: CustomScript[];
          };
          setData((prev) => ({
            packageScripts: prev?.packageScripts ?? {},
            customScripts: json.customScripts ?? prev?.customScripts ?? [],
            columns: json.columns ?? prev?.columns ?? []
          }));
        } catch (err) {
          setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
          setSaving(false);
        }
      }
    });
  }

  function handleDuplicateFromPackage(name: string) {
    const command = packageScriptMap[name];
    if (!command) {
      return;
    }
    openEditModal(`${name}-copy`, command);
    setModalMode("add");
  }

  function handleDuplicateFromCustom(name: string) {
    const script = customEntries.find((item) => item.name === name);
    if (!script) {
      return;
    }
    openEditModal(`${name}-copy`, script.command, script.description);
    setModalMode("add");
  }

  return (
    <main className="app">
      <div className="app-main">
        <StackPanel
          items={stack}
          onRemove={removeFromStack}
          onReorder={reorderStack}
          placeholder={`${packageMeta.name} (${packageMeta.version})`}
          onExecute={async () => {
            if (stack.length === 0) {
              return;
            }
            const commands = stack.flatMap((item) =>
              Array.isArray(item.command) ? item.command : [item.command]
            );
            await runScript("stack", commands);
            setStack([]);
          }}
          onClear={() => setStack([])}
        />

        {error && <div>{error}</div>}

        {!initialized && (
          <div className="wizard">
            <h2>Jrunner is not initialized in this project.</h2>
            <p>Would you like to initialize it?</p>
            <div className="wizard-actions">
              <button type="button" className="run" onClick={handleInit} disabled={saving}>
                Yes, initialize
              </button>
            </div>
          </div>
        )}

        {initialized && (
          <section className="board">
            <ScriptColumn
              title="package.json scripts"
              scripts={visiblePackageScripts}
              emptyLabel="No scripts found."
              actionLabel={showHidden ? "Hide hidden" : "Show hidden"}
              onAction={() => setShowHidden((prev) => !prev)}
              onRun={handleRunFromPackage}
              onStackAdd={addToStackFromPackage}
              onEdit={(name) => openEditModal(name, packageScriptMap[name] ?? "", undefined, "package")}
              onDuplicate={handleDuplicateFromPackage}
              onDelete={handleDeletePackage}
              onToggleHidden={(name, hidden) => handleHideToggle(name, hidden)}
              addCardLabel="+ Add script"
              onAddCard={handleAddFromPackageColumn}
            />
            {columns.map((column) => (
              <ScriptColumn
                key={column.id}
                title={column.name}
                scripts={customScriptsByColumn.get(column.id) ?? []}
                emptyLabel="No custom scripts found."
                showEmpty={false}
                actionLabel={undefined}
                onAction={undefined}
                onRun={handleRunFromCustom}
                onStackAdd={addToStackFromCustom}
                onEdit={(name) => {
                  const script = customEntries.find((item) => item.name === name);
                  if (script) {
                    openEditModal(script.name, script.command, script.description, "custom");
                  }
                }}
                onDuplicate={handleDuplicateFromCustom}
                onDelete={handleDeleteCustom}
                onToggleHidden={(name, hidden) => handleHideToggle(name, hidden)}
                addCardLabel="+ Add script"
                onAddCard={() => openAddModal("custom")}
                onEditColumn={() => openEditColumnModal(column.id, column.name)}
                onDeleteColumn={() => confirmDeleteColumn(column.id, column.name)}
                onDragColumnStart={() => handleColumnDragStart(column.id)}
                onDropColumn={() => handleColumnDrop(column.id)}
                onDragScriptStart={(name) => handleScriptDragStart(name, column.id)}
                onDropScript={(name, index) => handleScriptDrop(name, index, column.id)}
                onDropToColumnEnd={() => handleScriptDropToEnd(column.id)}
              />
            ))}
            <button className="card add-card" type="button" onClick={openAddColumnModal}>
              + Add column
            </button>
          </section>
        )}
      </div>

      <AddScriptModal
        open={showModal}
        packageScripts={packageScriptMap}
        existingNames={existingNamesForModal}
        mode={modalMode}
        initial={modalInitial ?? undefined}
        originalName={originalName}
        target={addTarget}
        columns={columns}
        onClose={() => setShowModal(false)}
        onSave={handleSaveScript}
      />
      <ColumnModal
        open={columnModal.open}
        title={columnModal.mode === "add" ? "Add column" : "Edit column"}
        initialName={columnModal.name}
        onClose={() => setColumnModal({ open: false, mode: "add" })}
        onSave={saveColumn}
      />
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        options={confirm?.options ?? []}
        onSelect={(value) => confirm?.onSelect(value)}
        onClose={closeConfirmDialog}
      />
      {saving && <div className="saving-indicator">Saving…</div>}
      <TerminalDock
        terminals={terminals}
        activeId={activeTerminalId}
        isOpen={terminalOpen}
        runningCount={terminals.filter((term) => term.status === "running").length}
        onToggleOpen={() => setTerminalOpen((prev) => !prev)}
        onSelect={setActiveTerminalId}
        onClose={closeTerminal}
      />
    </main>
  );
}
