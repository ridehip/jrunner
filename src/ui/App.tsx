import React, { useEffect, useMemo, useState } from "react";
import AppHeader from "./components/AppHeader";
import AddScriptModal from "./components/AddScriptModal";
import ScriptColumn from "./components/ScriptColumn";
import TerminalDock, { TerminalEntry } from "./components/TerminalDock";

type PackageScripts = Record<string, string>;

type CustomScript = {
  name: string;
  command: string[] | string;
  description?: string;
};

type ScriptsResponse = {
  packageScripts: PackageScripts;
  customScripts: CustomScript[];
};

export default function App() {
  const [data, setData] = useState<ScriptsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [terminals, setTerminals] = useState<TerminalEntry[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [modalInitial, setModalInitial] = useState<{
    name: string;
    description?: string;
    commands: string[];
  } | null>(null);
  const [originalName, setOriginalName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/scripts");
        if (!res.ok) {
          throw new Error("Failed to load scripts");
        }
        const json = (await res.json()) as ScriptsResponse;
        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const packageEntries = Object.entries(data?.packageScripts ?? {});
  const customEntries = data?.customScripts ?? [];

  const packageScripts = useMemo(() => {
    return packageEntries.map(([name, command]) => ({
      name,
      command
    }));
  }, [packageEntries]);

  const customScripts = useMemo(() => {
    return customEntries.map((script) => ({
      name: script.name,
      description: script.description,
      command: Array.isArray(script.command) ? script.command.join(" && ") : script.command
    }));
  }, [customEntries]);

  const packageScriptMap = useMemo(() => {
    return Object.fromEntries(packageEntries);
  }, [packageEntries]);

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

  function closeTerminal(id: string) {
    setTerminals((prev) => prev.filter((term) => term.id !== id));
    setActiveTerminalId((current) => (current === id ? null : current));
  }

  async function handleSaveCustom(payload: {
    name: string;
    description: string;
    command: string[];
  }) {
    try {
      setSaving(true);
      const endpoint = modalMode === "edit" ? "/api/custom-scripts" : "/api/custom-scripts";
      const method = modalMode === "edit" ? "PUT" : "POST";
      const body =
        modalMode === "edit"
          ? JSON.stringify({ ...payload, originalName })
          : JSON.stringify(payload);
      const res = await fetch(endpoint, {
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
      setShowModal(false);
      setModalInitial(null);
      setOriginalName(null);
      setModalMode("add");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function openAddModal() {
    setModalMode("add");
    setModalInitial(null);
    setOriginalName(null);
    setShowModal(true);
  }

  function openEditModal(name: string, command: string | string[], description?: string) {
    setModalMode("edit");
    setModalInitial({
      name,
      description,
      commands: Array.isArray(command) ? command : [command]
    });
    setOriginalName(name);
    setShowModal(true);
  }

  async function handleDelete(name: string) {
    try {
      setSaving(true);
      const res = await fetch("/api/custom-scripts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      if (!res.ok) {
        throw new Error("Failed to delete custom script");
      }
      const json = (await res.json()) as { customScripts: CustomScript[] };
      setData((prev) => ({
        packageScripts: prev?.packageScripts ?? {},
        customScripts: json.customScripts
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
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
      <AppHeader
        title="jrunner"
        subtitle="Script runner UI (package.json + jrunner-conf.json)"
        notice={null}
      />

      {error && <div>{error}</div>}

      <section className="board">
        <ScriptColumn
          title="package.json scripts"
          scripts={packageScripts}
          emptyLabel="No scripts found."
          actionLabel="Add script"
          onAction={openAddModal}
          onRun={handleRunFromPackage}
          onEdit={(name) => openEditModal(name, packageScriptMap[name] ?? "")}
          onDuplicate={handleDuplicateFromPackage}
          onDelete={() => setError("package.json scripts cannot be deleted here.")}
        />
        <ScriptColumn
          title="custom scripts"
          scripts={customScripts}
          emptyLabel="No custom scripts found."
          actionLabel="Add script"
          onAction={openAddModal}
          onRun={handleRunFromCustom}
          onEdit={(name) => {
            const script = customEntries.find((item) => item.name === name);
            if (script) {
              openEditModal(script.name, script.command, script.description);
            }
          }}
          onDuplicate={handleDuplicateFromCustom}
          onDelete={handleDelete}
        />
      </section>

      <AddScriptModal
        open={showModal}
        packageScripts={packageScriptMap}
        existingNames={customEntries.map((script) => script.name)}
        mode={modalMode}
        initial={modalInitial ?? undefined}
        originalName={originalName}
        onClose={() => setShowModal(false)}
        onSave={handleSaveCustom}
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
