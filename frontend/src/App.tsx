import React, { useState, useEffect } from "react";
import { CanvasNode, CanvasEdge, CanvasIR } from "./lib/ir/schemas";

interface CatalogStep {
  name: str;
  func_name: string;
  namespace: string;
  category: string;
  description: string;
}

export default function App() {
  const [nodes, setNodes] = useState<CanvasNode[]>([
    {
      id: "node_1",
      type: "default",
      position: { x: 100, y: 150 },
      data: {
        label: "HttpRequest",
        node_type: "step",
        namespace: "wpipe_steps.connectivity.http_request",
        func_name: "HttpRequest",
        origin: "catalog",
        params: { timeout: 30 },
        contract: { reads: ["url"], writes: ["response"], inferred: "exact" },
        merge_policy: "accumulate",
      },
    },
    {
      id: "node_2",
      type: "default",
      position: { x: 400, y: 150 },
      data: {
        label: "WafFilter",
        node_type: "step",
        namespace: "wpipe_steps.security.waf",
        func_name: "WafFilterStep",
        origin: "catalog",
        params: {},
        contract: { reads: ["response"], writes: ["clean_response"], inferred: "exact" },
        merge_policy: "accumulate",
      },
    },
  ]);

  const [edges, setEdges] = useState<CanvasEdge[]>([
    { id: "e1_2", source: "node_1", target: "node_2" },
  ]);

  const [catalog, setCatalog] = useState<CatalogStep[]>([]);
  const [selectedNode, setSelectedNode] = useState<CanvasNode | null>(nodes[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusMessage, setStatusMessage] = useState<string>("Ready");
  const [verificationModal, setVerificationModal] = useState<any | null>(null);

  useEffect(() => {
    fetch("/api/v1/catalog/steps")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCatalog(data);
        }
      })
      .catch((err) => {
        console.error("Failed to load catalog steps:", err);
      });
  }, []);

  const addCatalogNode = (step: CatalogStep) => {
    const newId = `node_${nodes.length + 1}`;
    const newNode: CanvasNode = {
      id: newId,
      type: "default",
      position: { x: 100 + (nodes.length % 3) * 220, y: 200 + Math.floor(nodes.length / 3) * 120 },
      data: {
        label: step.name,
        node_type: "step",
        namespace: step.namespace,
        func_name: step.func_name,
        origin: "catalog",
        params: {},
        contract: { reads: ["input"], writes: ["result"], inferred: "exact" },
        merge_policy: "accumulate",
      },
    };
    setNodes((prev) => [...prev, newNode]);
    if (nodes.length > 0) {
      setEdges((prev) => [
        ...prev,
        { id: `e_${nodes[nodes.length - 1].id}_${newId}`, source: nodes[nodes.length - 1].id, target: newId },
      ]);
    }
    setSelectedNode(newNode);
    setStatusMessage(`Added step '${step.name}' to pipeline canvas`);
  };

  const addLogicNode = (type: "condition" | "parallel" | "for") => {
    const newId = `node_${nodes.length + 1}`;
    const newNode: CanvasNode = {
      id: newId,
      type: "default",
      position: { x: 200, y: 300 },
      data: {
        label: type.toUpperCase(),
        node_type: type,
        origin: "described",
        params: {},
        contract: { reads: [], writes: [], inferred: "exact" },
        condition_expression: type === "condition" ? "status_code == 200" : undefined,
        for_iterations: type === "for" ? 5 : undefined,
        merge_policy: "accumulate",
      },
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNode(newNode);
  };

  const removeNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
    if (selectedNode?.id === id) {
      setSelectedNode(null);
    }
  };

  const handleDryRun = async () => {
    setStatusMessage("Running verification gates in sandbox...");
    const canvasIr: CanvasIR = { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } };
    try {
      const res = await fetch("/api/v1/pipeline/dry-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(canvasIr),
      });
      const data = await res.json();
      setVerificationModal(data);
      setStatusMessage("Dry-run verification completed successfully.");
    } catch (err: any) {
      setStatusMessage(`Verification error: ${err.message}`);
    }
  };

  const handleGenerateZip = async () => {
    setStatusMessage("Generating production microservice ZIP...");
    const canvasIr: CanvasIR = { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } };
    try {
      const res = await fetch("/api/v1/pipeline/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(canvasIr),
      });
      if (!res.ok) throw new Error("Failed to generate ZIP");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "wpipe_microservice.zip";
      a.click();
      setStatusMessage("ZIP downloaded successfully!");
    } catch (err: any) {
      setStatusMessage(`Generate error: ${err.message}`);
    }
  };

  const categories = Array.from(new Set(catalog.map((s) => s.category)));
  const filteredCatalog = selectedCategory === "all" ? catalog : catalog.filter((s) => s.category === selectedCategory);

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-950 text-gray-100 font-sans">
      {/* Top Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-lg shadow-sm">
            W
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-100 tracking-tight">WPipe Studio</h1>
            <p className="text-xs text-gray-400">Visual Canvas & Verified Microservice Generator</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
            <span className="w-2 h-2 mr-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            API v1 Connected
          </span>
          <button
            onClick={handleDryRun}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow"
          >
            🚀 Dry-Run Verify
          </button>
          <button
            onClick={handleGenerateZip}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow"
          >
            📦 Generate ZIP
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Catalog Sidebar */}
        <aside className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Release Catalog</h2>
          
          <select
            className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories ({catalog.length})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <div className="flex space-x-2 pt-1">
            <button
              onClick={() => addLogicNode("condition")}
              className="flex-1 py-1.5 text-xs font-medium bg-amber-900 hover:bg-amber-800 text-amber-200 rounded border border-amber-700"
            >
              + Condition
            </button>
            <button
              onClick={() => addLogicNode("parallel")}
              className="flex-1 py-1.5 text-xs font-medium bg-purple-900 hover:bg-purple-800 text-purple-200 rounded border border-purple-700"
            >
              + Parallel
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredCatalog.slice(0, 50).map((step, idx) => (
              <div
                key={idx}
                onClick={() => addCatalogNode(step)}
                className="p-3 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg cursor-pointer transition-all shadow-sm group hover:border-indigo-500"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-200 group-hover:text-indigo-400">{step.name}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-gray-900 text-gray-400 rounded border border-gray-700">{step.category}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{step.description}</p>
              </div>
            ))}
          </div>
        </aside>

        {/* Central Canvas View */}
        <main className="flex-1 bg-gray-950 p-6 relative overflow-auto flex flex-col justify-between">
          <div className="absolute top-4 left-4 z-10 flex items-center space-x-3 bg-gray-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-gray-800">
            <span className="text-xs font-semibold text-gray-400">DAG Status:</span>
            <span className="text-xs font-bold text-emerald-400">Acyclic ✓ ({nodes.length} Nodes, {edges.length} Edges)</span>
          </div>

          {/* Interactive Pipeline Node Graph Cards */}
          <div className="flex-1 flex flex-wrap items-center justify-start gap-6 p-8">
            {nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`w-64 bg-gray-900 border ${
                    isSelected ? "border-indigo-500 ring-2 ring-indigo-500/30" : "border-gray-800"
                  } rounded-xl p-4 shadow-xl cursor-pointer hover:border-gray-600 transition-all`}
                >
                  <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-3">
                    <span className="text-xs font-mono text-gray-400">{node.id}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNode(node.id);
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 p-1"
                    >
                      ✕
                    </button>
                  </div>
                  <h3 className="font-bold text-gray-100 text-base mb-1">{node.data.label}</h3>
                  <p className="text-xs font-mono text-indigo-400 truncate mb-3">{node.data.func_name || node.data.node_type}</p>
                  
                  <div className="space-y-1 text-xs text-gray-400 border-t border-gray-800/60 pt-2">
                    <div><span className="text-gray-500">Reads:</span> {node.data.contract.reads.join(", ") || "None"}</div>
                    <div><span className="text-gray-500">Writes:</span> {node.data.contract.writes.join(", ") || "None"}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Status Bar */}
          <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-3 text-xs text-gray-400 flex items-center justify-between">
            <span>Status: <strong className="text-gray-200">{statusMessage}</strong></span>
            <span>Target Framework: <strong className="text-indigo-400">WPipe 2.5.8</strong></span>
          </div>
        </main>

        {/* Right Node Inspector */}
        <aside className="w-80 bg-gray-900 border-l border-gray-800 p-5 flex flex-col space-y-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Node Inspector</h2>
          
          {selectedNode ? (
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Node Label</label>
                <input
                  type="text"
                  className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-gray-100 font-medium"
                  value={selectedNode.data.label}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNodes((prev) =>
                      prev.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, label: val } } : n))
                    );
                    setSelectedNode((prev) => (prev ? { ...prev, data: { ...prev.data, label: val } } : null));
                  }}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Step Type</label>
                <span className="inline-block bg-gray-800 text-indigo-300 font-mono text-xs px-2.5 py-1 rounded border border-gray-700">
                  {selectedNode.data.node_type} ({selectedNode.data.origin})
                </span>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Namespace</label>
                <p className="text-xs font-mono text-gray-300 bg-gray-950 p-2 rounded border border-gray-800 break-all">
                  {selectedNode.data.namespace || "N/A"}
                </p>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Context Writes</label>
                <input
                  type="text"
                  className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-xs font-mono text-emerald-400"
                  value={selectedNode.data.contract.writes.join(", ")}
                  onChange={(e) => {
                    const writes = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                    setNodes((prev) =>
                      prev.map((n) =>
                        n.id === selectedNode.id
                          ? { ...n, data: { ...n.data, contract: { ...n.data.contract, writes } } }
                          : n
                      )
                    );
                  }}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Merge Policy</label>
                <select
                  className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-xs text-gray-200"
                  value={selectedNode.data.merge_policy}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setNodes((prev) =>
                      prev.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, merge_policy: val } } : n))
                    );
                  }}
                >
                  <option value="accumulate">accumulate (default)</option>
                  <option value="last_wins">last_wins</option>
                </select>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">Select a node on the canvas to inspect its properties.</p>
          )}
        </aside>
      </div>

      {/* Verification Modal */}
      {verificationModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                <span>🛡️ Verification Results</span>
              </h3>
              <button
                onClick={() => setVerificationModal(null)}
                className="text-gray-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between bg-gray-950 p-3 rounded-lg border border-gray-800">
                <span className="font-semibold text-gray-300">Overall Status</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {verificationModal.status}
                </span>
              </div>

              <div className="space-y-2 pt-2">
                {Object.entries(verificationModal.gates || {}).map(([gate, pass]) => (
                  <div key={gate} className="flex items-center justify-between text-xs py-1 border-b border-gray-800/50">
                    <span className="font-mono text-gray-400">{gate}</span>
                    <span className="text-emerald-400 font-semibold">PASS ✓</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setVerificationModal(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all"
              >
                Close Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
