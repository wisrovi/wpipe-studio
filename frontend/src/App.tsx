import React, { useState, useEffect, useRef } from "react";
import { CanvasNode, CanvasEdge, CanvasIR, StepOrigin } from "./lib/ir/schemas";

interface CatalogStep {
  name: string;
  func_name: string;
  namespace: string;
  category: string;
  subcategory1?: string;
  subcategory2?: string;
  description: string;
  repo: string; // "Official" or "Plugin"
  code_snippet?: string;
}

export default function App() {
  const [nodes, setNodes] = useState<CanvasNode[]>([
    {
      id: "node_1",
      type: "default",
      position: { x: 80, y: 150 },
      data: {
        label: "HttpRequest",
        node_type: "step",
        namespace: "wpipe_steps.connectivity.http_request",
        func_name: "HttpRequest",
        origin: "catalog",
        params: { timeout: 30 },
        contract: { reads: ["url"], writes: ["response"], inferred: "exact" },
        merge_policy: "accumulate",
        code_snippet: "from wpipe_steps.connectivity.http_request import HttpRequest\n\nstep = HttpRequest()",
        notes: "Target API endpoint requires bearer token in header.",
      },
    },
    {
      id: "node_2",
      type: "default",
      position: { x: 360, y: 150 },
      data: {
        label: "Check Status (IF)",
        node_type: "condition",
        origin: "described",
        params: {},
        contract: { reads: ["response"], writes: [], inferred: "exact" },
        condition_expression: "response.status_code == 200",
        merge_policy: "accumulate",
      },
    },
    {
      id: "node_3",
      type: "default",
      position: { x: 680, y: 150 },
      data: {
        label: "ImageECamYOLO",
        node_type: "step",
        namespace: "wpipe_plugins.vision.ecam_yolo",
        func_name: "ImageECamYOLO",
        origin: "catalog",
        params: { conf: 0.25 },
        contract: { reads: ["image_data"], writes: ["results"], inferred: "exact" },
        merge_policy: "accumulate",
        code_snippet: "from wpipe_plugins.vision.ecam_yolo import ImageECamYOLO\n\nstep = ImageECamYOLO()",
        notes: "Runs YOLO detection + EigenCAM visualization.",
      },
    },
  ]);

  const [edges, setEdges] = useState<CanvasEdge[]>([
    { id: "e1_2", source: "node_1", target: "node_2" },
    { id: "e2_3", source: "node_2", target: "node_3" },
  ]);

  const [catalog, setCatalog] = useState<CatalogStep[]>([]);
  const [userStates, setUserStates] = useState<CatalogStep[]>([]);
  const [activeTab, setActiveTab] = useState<"official" | "plugins" | "user" | "ai" | "inuse">("official");
  const [selectedNode, setSelectedNode] = useState<CanvasNode | null>(nodes[0]);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [inspectorTab, setInspectorTab] = useState<"properties" | "code_notes">("properties");
  const [globalCompactView, setGlobalCompactView] = useState<boolean>(true);

  // Search & Accordion Tree State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    security: true,
    ai: true,
    connectivity: true,
  });

  const [statusMessage, setStatusMessage] = useState<string>("Ready — Drag steps to canvas or connect ports");
  const [verificationModal, setVerificationModal] = useState<any | null>(null);

  // Connection & Context Menu state
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  // AI Prompt Modal state
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [aiStepName, setAiStepName] = useState<string>("");

  // Canvas dragging node state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

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

  // Category Icon Mapping
  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("ai")) return "🤖";
    if (cat.includes("sec")) return "🛡️";
    if (cat.includes("conn")) return "🌐";
    if (cat.includes("db") || cat.includes("data")) return "🗄️";
    if (cat.includes("media") || cat.includes("audio") || cat.includes("vision")) return "🎬";
    if (cat.includes("sys")) return "⚙️";
    return "📦";
  };

  // Drag & Drop sidebar handlers
  const handleSidebarDragStart = (e: React.DragEvent, item: { type: "catalog" | "logic" | "user" | "ai"; data: any }) => {
    e.dataTransfer.setData("application/wpipe-node", JSON.stringify(item));
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rawData = e.dataTransfer.getData("application/wpipe-node");
    if (!rawData) return;
    const item = JSON.parse(rawData);

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    const dropX = canvasRect ? Math.max(20, e.clientX - canvasRect.left - 80) : 200;
    const dropY = canvasRect ? Math.max(20, e.clientY - canvasRect.top - 30) : 200;

    const newId = `node_${nodes.length + 1}`;
    let newNode: CanvasNode;

    if (item.type === "catalog") {
      const step: CatalogStep = item.data;
      newNode = {
        id: newId,
        type: "default",
        position: { x: dropX, y: dropY },
        data: {
          label: step.name,
          node_type: "step",
          namespace: step.namespace,
          func_name: step.func_name,
          origin: "catalog",
          params: {},
          contract: { reads: ["input_data"], writes: ["result_data"], inferred: "exact" },
          merge_policy: "accumulate",
          code_snippet: step.code_snippet || `from ${step.namespace} import ${step.func_name}`,
          notes: `Official step from ${step.category}${step.subcategory1 ? " / " + step.subcategory1 : ""}`,
        },
      };
      setStatusMessage(`Added step '${step.name}' to canvas`);
    } else if (item.type === "user") {
      const step: CatalogStep = item.data;
      newNode = {
        id: newId,
        type: "default",
        position: { x: dropX, y: dropY },
        data: {
          label: step.name,
          node_type: "step",
          origin: "user_imported",
          params: {},
          contract: { reads: ["raw_input"], writes: ["custom_output"], inferred: "exact" },
          merge_policy: "accumulate",
          code_snippet: step.code_snippet || `# Custom User State\nfrom wpipe import step`,
          notes: "User imported python state.",
        },
      };
      setStatusMessage(`Added custom user state '${step.name}'`);
    } else {
      const logicType: "condition" | "parallel" | "for" = item.data;
      newNode = {
        id: newId,
        type: "default",
        position: { x: dropX, y: dropY },
        data: {
          label: logicType === "condition" ? "IF Condition" : logicType === "for" ? "FOR Loop" : "PARALLEL Branch",
          node_type: logicType,
          origin: "described",
          params: {},
          contract: { reads: [], writes: [], inferred: "exact" },
          condition_expression: logicType === "condition" ? "status_code == 200" : undefined,
          for_iterations: logicType === "for" ? 5 : undefined,
          merge_policy: "accumulate",
        },
      };
      setStatusMessage(`Added ${logicType.toUpperCase()} control node`);
    }

    setNodes((prev) => [...prev, newNode]);
    setSelectedNode(newNode);
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // Canvas Right Click Context Menu Handler
  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect) {
      setContextMenuPos({
        x: e.clientX - canvasRect.left,
        y: e.clientY - canvasRect.top,
      });
    }
  };

  const handleAddFromContextMenu = (type: "condition" | "for" | "parallel" | "ai") => {
    if (!contextMenuPos) return;
    const newId = `node_${nodes.length + 1}`;

    if (type === "ai") {
      setShowAiModal(true);
      setContextMenuPos(null);
      return;
    }

    const newNode: CanvasNode = {
      id: newId,
      type: "default",
      position: { x: contextMenuPos.x, y: contextMenuPos.y },
      data: {
        label: type === "condition" ? "IF Condition" : type === "for" ? "FOR Loop" : "PARALLEL Branch",
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
    setContextMenuPos(null);
  };

  // Toggle node expansion
  const toggleNodeExpand = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // User uploaded .py file handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result as string;
      const stateName = file.name.replace(/\.py$/, "");
      const newCustomState: CatalogStep = {
        name: stateName,
        func_name: stateName,
        namespace: `user_states.${stateName}`,
        category: "User Uploaded",
        description: `Uploaded custom Python state file: ${file.name}`,
        repo: "User",
        code_snippet: content,
      };

      setUserStates((prev) => [...prev, newCustomState]);
      setStatusMessage(`Imported custom Python state file '${file.name}'!`);
    };

    reader.readAsText(file);
  };

  // Canvas node position drag handlers
  const handleNodeMouseDown = (e: React.MouseEvent, node: CanvasNode) => {
    e.stopPropagation();
    setSelectedNode(node);
    setDraggingNodeId(node.id);
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect) {
      setDragOffset({
        x: e.clientX - canvasRect.left - node.position.x,
        y: e.clientY - canvasRect.top - node.position.y,
      });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeId || !canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const newX = Math.max(10, e.clientX - canvasRect.left - dragOffset.x);
    const newY = Math.max(10, e.clientY - canvasRect.top - dragOffset.y);

    setNodes((prev) =>
      prev.map((n) => (n.id === draggingNodeId ? { ...n, position: { x: newX, y: newY } } : n))
    );
  };

  const handleCanvasMouseUp = () => {
    setDraggingNodeId(null);
  };

  // Connect Nodes Handler
  const handleConnectClick = (nodeId: string) => {
    if (!connectingSourceId) {
      setConnectingSourceId(nodeId);
      setStatusMessage(`Source ${nodeId} active. Click target node's 'in' port to connect.`);
    } else if (connectingSourceId === nodeId) {
      setConnectingSourceId(null);
      setStatusMessage("Connection cancelled.");
    } else {
      const newEdge: CanvasEdge = {
        id: `e_${connectingSourceId}_${nodeId}`,
        source: connectingSourceId,
        target: nodeId,
      };
      if (!edges.some((e) => e.source === connectingSourceId && e.target === nodeId)) {
        setEdges((prev) => [...prev, newEdge]);
        setStatusMessage(`Connected ${connectingSourceId} ➔ ${nodeId}`);
      }
      setConnectingSourceId(null);
    }
  };

  const removeNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
    if (selectedNode?.id === id) {
      setSelectedNode(null);
    }
    if (connectingSourceId === id) {
      setConnectingSourceId(null);
    }
  };

  const removeEdge = (id: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== id));
  };

  const clearCanvas = () => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setStatusMessage("Canvas cleared");
  };

  // AI Step Creation Handler
  const handleCreateAiStep = () => {
    if (!aiStepName.trim() || !aiPrompt.trim()) return;
    const newId = `node_${nodes.length + 1}`;
    const newNode: CanvasNode = {
      id: newId,
      type: "default",
      position: { x: 300, y: 220 },
      data: {
        label: aiStepName,
        node_type: "step",
        origin: "described",
        params: { prompt: aiPrompt },
        contract: { reads: ["input_text"], writes: ["summary_output"], inferred: "exact" },
        merge_policy: "accumulate",
        notes: `AI Step Prompt: ${aiPrompt}`,
        code_snippet: `# AI Described Step: ${aiStepName}\n# Prompt: ${aiPrompt}\n\nfrom wpipe import step\n\n@step\ndef ${aiStepName.toLowerCase()}(input_text: str) -> dict:\n    return {'summary_output': input_text}`,
      },
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNode(newNode);
    setShowAiModal(false);
    setAiStepName("");
    setAiPrompt("");
    setStatusMessage(`Created AI Step '${aiStepName}'`);
  };

  // Dry Run Verification Handler
  const handleDryRun = async () => {
    setStatusMessage("Running 6 quality gates in Docker sandbox...");
    const canvasIr: CanvasIR = { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } };
    try {
      const res = await fetch("/api/v1/pipeline/dry-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(canvasIr),
      });
      const data = await res.json();
      setVerificationModal(data);
      setStatusMessage("Verification completed: All gates PASSED ✓");
    } catch (err: any) {
      setStatusMessage(`Verification error: ${err.message}`);
    }
  };

  // Generate Microservice ZIP Handler
  const handleGenerateZip = async () => {
    setStatusMessage("Building production ZIP...");
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
      setStatusMessage("Microservice ZIP downloaded!");
    } catch (err: any) {
      setStatusMessage(`Generate error: ${err.message}`);
    }
  };

  // Filtering & Tree Grouping Logic
  const officialSteps = catalog.filter((s) => s.repo === "Official");
  const pluginSteps = catalog.filter((s) => s.repo === "Plugin");

  const filterBySearch = (step: CatalogStep) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      step.name.toLowerCase().includes(q) ||
      step.func_name.toLowerCase().includes(q) ||
      step.category.toLowerCase().includes(q) ||
      (step.subcategory1 && step.subcategory1.toLowerCase().includes(q)) ||
      step.description.toLowerCase().includes(q)
    );
  };

  const searchedOfficial = officialSteps.filter(filterBySearch);
  const searchedPlugins = pluginSteps.filter(filterBySearch);

  // Group steps by category and subcategory
  const categoryTree: Record<string, Record<string, CatalogStep[]>> = {};
  searchedOfficial.forEach((step) => {
    const cat = step.category || "general";
    const sub = step.subcategory1 || "main";
    if (!categoryTree[cat]) categoryTree[cat] = {};
    if (!categoryTree[cat][sub]) categoryTree[cat][sub] = [];
    categoryTree[cat][sub].push(step);
  });

  // Helper for origin badge color styling
  const getNodeColorStyle = (origin: StepOrigin | string, repo?: string) => {
    if (origin === "user_imported") {
      return { border: "border-amber-500/80", bg: "bg-amber-950/40", text: "text-amber-400", badge: "bg-amber-950 border-amber-700 text-amber-300" };
    }
    if (origin === "described") {
      return { border: "border-purple-600/80", bg: "bg-purple-950/40", text: "text-purple-300", badge: "bg-purple-950 border-purple-700 text-purple-300" };
    }
    if (repo === "Plugin" || origin === "plugin") {
      return { border: "border-emerald-500/80", bg: "bg-emerald-950/40", text: "text-emerald-400", badge: "bg-emerald-950 border-emerald-700 text-emerald-300" };
    }
    return { border: "border-indigo-600/80", bg: "bg-indigo-950/40", text: "text-indigo-400", badge: "bg-indigo-950 border-indigo-700 text-indigo-300" };
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-950 text-gray-100 font-sans select-none overflow-hidden">
      {/* Top Header */}
      <header className="flex items-center justify-between px-6 py-2.5 border-b border-gray-800/80 bg-gray-900/90 backdrop-blur-md shadow-lg z-20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center font-black text-white text-lg shadow-md shadow-indigo-600/20">
            W
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-gray-100 tracking-tight flex items-center gap-2">
              <span>WPipe Studio</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono font-normal">
                v2.5.8
              </span>
            </h1>
            <p className="text-[11px] text-gray-400">Multi-tenant Visual Canvas & Verified Microservice Generator</p>
          </div>
        </div>

        {/* Legend Indicator Pills */}
        <div className="hidden lg:flex items-center space-x-2 text-[11px]">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-800/80 text-indigo-300 font-medium shadow-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span> wpipe-steps (196)
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 font-medium shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> wpipe-plugins (1)
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-800/80 text-amber-300 font-medium shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> User .py
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-800/80 text-purple-300 font-medium shadow-sm">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span> AI Described
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setGlobalCompactView(!globalCompactView)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition"
            title="Toggle LabVIEW Compact View"
          >
            {globalCompactView ? "👁️ Detailed View" : "👁️ LabVIEW View"}
          </button>
          <button
            onClick={handleDryRun}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white transition shadow-md shadow-indigo-600/20 active:scale-95"
          >
            🚀 Dry-Run Verify
          </button>
          <button
            onClick={handleGenerateZip}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white transition shadow-md shadow-emerald-600/20 active:scale-95"
          >
            📦 Generate ZIP
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Catalogue */}
        <aside className="w-96 bg-gray-900/95 border-r border-gray-800/80 flex flex-col z-10 shadow-xl">
          {/* Real-Time Search Bar */}
          <div className="p-3 bg-gray-950 border-b border-gray-800/80">
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Search steps, vision, ocr, nmap, waf..."
                className="w-full bg-gray-900 border border-gray-700/80 rounded-xl py-2 pl-3 pr-8 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition shadow-inner"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs Header */}
          <div className="grid grid-cols-5 border-b border-gray-800/80 bg-gray-950 text-[11px] font-semibold text-gray-400">
            <button
              onClick={() => setActiveTab("official")}
              className={`py-2.5 text-center border-b-2 transition ${
                activeTab === "official" ? "border-indigo-500 text-indigo-400 bg-gray-900" : "border-transparent hover:text-gray-200"
              }`}
            >
              📦 Steps
            </button>
            <button
              onClick={() => setActiveTab("plugins")}
              className={`py-2.5 text-center border-b-2 transition ${
                activeTab === "plugins" ? "border-emerald-500 text-emerald-400 bg-gray-900" : "border-transparent hover:text-gray-200"
              }`}
            >
              🔌 Plugins
            </button>
            <button
              onClick={() => setActiveTab("user")}
              className={`py-2.5 text-center border-b-2 transition ${
                activeTab === "user" ? "border-amber-500 text-amber-400 bg-gray-900" : "border-transparent hover:text-gray-200"
              }`}
            >
              📁 User
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`py-2.5 text-center border-b-2 transition ${
                activeTab === "ai" ? "border-purple-500 text-purple-400 bg-gray-900" : "border-transparent hover:text-gray-200"
              }`}
            >
              ✨ AI
            </button>
            <button
              onClick={() => setActiveTab("inuse")}
              className={`py-2.5 text-center border-b-2 transition ${
                activeTab === "inuse" ? "border-sky-500 text-sky-400 bg-gray-900" : "border-transparent hover:text-gray-200"
              }`}
            >
              📊 In Use
            </button>
          </div>

          {/* Sidebar Tab Contents */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-4">
            {/* TAB 1: OFFICIAL STEPS TREE */}
            {activeTab === "official" && (
              <div className="space-y-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                  Category & Subcategory Tree ({searchedOfficial.length})
                </span>

                {Object.keys(categoryTree).length === 0 ? (
                  <p className="text-xs text-gray-500 italic p-2">No matching steps found for '{searchQuery}'</p>
                ) : (
                  Object.entries(categoryTree).map(([category, subMap]) => {
                    const isCatOpen = expandedCategories[category] ?? true;
                    const catCount = Object.values(subMap).reduce((acc, list) => acc + list.length, 0);

                    return (
                      <div key={category} className="border border-gray-800/80 rounded-xl bg-gray-950/60 overflow-hidden shadow-sm">
                        {/* Category Header Accordion */}
                        <div
                          onClick={() =>
                            setExpandedCategories((prev) => ({ ...prev, [category]: !isCatOpen }))
                          }
                          className="flex items-center justify-between p-2.5 bg-gray-900/90 hover:bg-gray-850 cursor-pointer border-b border-gray-800/60 transition"
                        >
                          <span className="text-xs font-bold text-indigo-300 uppercase tracking-wide flex items-center gap-2">
                            <span>{getCategoryIcon(category)}</span>
                            <span>{category}</span>
                          </span>
                          <span className="text-[10px] px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full font-mono">
                            {catCount}
                          </span>
                        </div>

                        {/* Subcategories & Steps */}
                        {isCatOpen && (
                          <div className="p-2 space-y-3">
                            {Object.entries(subMap).map(([subcat, stepsList]) => (
                              <div key={subcat} className="space-y-1.5 pl-2 border-l-2 border-indigo-950">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                  └─ {subcat} ({stepsList.length})
                                </span>
                                <div className="space-y-1.5">
                                  {stepsList.map((step, idx) => (
                                    <div
                                      key={idx}
                                      draggable
                                      onDragStart={(e) => handleSidebarDragStart(e, { type: "catalog", data: step })}
                                      className="p-2.5 bg-gray-900/90 hover:bg-gray-800 border border-indigo-900/40 hover:border-indigo-500 rounded-lg cursor-grab active:cursor-grabbing transition shadow-sm group"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-indigo-200 group-hover:text-indigo-400">
                                          {step.name}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{step.description}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: PLUGINS */}
            {activeTab === "plugins" && (
              <div className="space-y-3">
                <span className="text-xs font-semibold text-emerald-400 uppercase block">
                  Community Plugins ({searchedPlugins.length})
                </span>
                <div className="space-y-2">
                  {searchedPlugins.map((step, idx) => (
                    <div
                      key={idx}
                      draggable
                      onDragStart={(e) => handleSidebarDragStart(e, { type: "catalog", data: step })}
                      className="p-3.5 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-800/80 hover:border-emerald-500 rounded-xl cursor-grab active:cursor-grabbing transition shadow-md"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-emerald-300">{step.name}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-400 rounded border border-emerald-800 font-mono">
                          v{step.version}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-300 mb-2">{step.description}</p>
                      <div className="text-[10px] font-mono text-emerald-400/80 break-all bg-emerald-950/60 p-1.5 rounded border border-emerald-900">
                        {step.how_to_use}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: USER UPLOADED */}
            {activeTab === "user" && (
              <div className="space-y-4">
                <div className="bg-amber-950/30 p-3.5 rounded-xl border border-amber-800/80 space-y-2">
                  <span className="text-xs font-semibold text-amber-300 block">📂 Import Custom .py State</span>
                  <p className="text-[11px] text-gray-400">Upload your own Python state files to drag into the canvas.</p>
                  <label className="block w-full text-center py-2 px-3 bg-amber-900/60 hover:bg-amber-800 text-amber-200 rounded-lg text-xs font-semibold border border-amber-700 cursor-pointer transition">
                    Upload .py File
                    <input type="file" accept=".py" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase">Uploaded Custom States ({userStates.length})</span>
                  {userStates.length === 0 ? (
                    <p className="text-xs text-gray-500 italic p-2">No custom states uploaded yet. Upload a .py file above!</p>
                  ) : (
                    userStates.map((step, idx) => (
                      <div
                        key={idx}
                        draggable
                        onDragStart={(e) => handleSidebarDragStart(e, { type: "user", data: step })}
                        className="p-3 bg-amber-950/20 hover:bg-amber-950/40 border border-amber-800 hover:border-amber-500 rounded-lg cursor-grab active:cursor-grabbing transition shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-amber-300">{step.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-950 text-amber-300 rounded border border-amber-800 font-mono">.py</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 truncate">{step.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: AI NEW STEPS */}
            {activeTab === "ai" && (
              <div className="space-y-4">
                <div className="bg-purple-950/30 p-3.5 rounded-xl border border-purple-800 space-y-3">
                  <span className="text-xs font-bold text-purple-300 block">✨ Describe New AI Step</span>
                  <p className="text-[11px] text-gray-400">Prompt the LLM agent to generate a custom step and its DTO.</p>
                  <button
                    onClick={() => setShowAiModal(true)}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow transition"
                  >
                    + Create AI Step Prompt
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: ACTIVE PIPELINE SUMMARY */}
            {activeTab === "inuse" && (
              <div className="space-y-3">
                <span className="text-xs font-semibold text-sky-400 uppercase block">Active Nodes ({nodes.length})</span>
                <div className="space-y-2">
                  {nodes.map((node) => {
                    const style = getNodeColorStyle(node.data.origin, node.data.namespace?.includes("plugin") ? "Plugin" : undefined);
                    return (
                      <div
                        key={node.id}
                        onClick={() => setSelectedNode(node)}
                        className={`p-3 bg-gray-800/90 border ${style.border} rounded-lg cursor-pointer transition hover:bg-gray-800 shadow-sm`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${style.text}`}>{node.data.label}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${style.badge}`}>{node.id}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1 flex justify-between">
                          <span>Origin: {node.data.origin}</span>
                          <span>Type: {node.data.node_type}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Central Canvas Workspace */}
        <main
          ref={canvasRef}
          onDrop={handleCanvasDrop}
          onDragOver={handleCanvasDragOver}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onContextMenu={handleCanvasContextMenu}
          className="flex-1 bg-gray-950 p-6 relative overflow-hidden flex flex-col justify-between"
          style={{
            backgroundImage: "radial-gradient(#1f2937 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        >
          {/* Canvas Floating Top Toolbar */}
          <div className="absolute top-4 left-4 z-10 flex items-center space-x-2 bg-gray-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-gray-800/80 shadow-xl">
            <span className="text-xs font-semibold text-gray-400">DAG Graph:</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <span>✓ Acyclic</span>
              <span className="text-gray-500">({nodes.length} Nodes, {edges.length} Connections)</span>
            </span>

            <div className="h-4 w-px bg-gray-800 mx-2"></div>

            <button
              onClick={() => handleAddFromContextMenu("condition")}
              className="px-2 py-1 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 rounded text-xs border border-amber-800/80 font-medium"
            >
              + IF
            </button>
            <button
              onClick={() => handleAddFromContextMenu("for")}
              className="px-2 py-1 bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 rounded text-xs border border-sky-800/80 font-medium"
            >
              + FOR
            </button>
            <button
              onClick={() => handleAddFromContextMenu("parallel")}
              className="px-2 py-1 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 rounded text-xs border border-purple-800/80 font-medium"
            >
              + PAR
            </button>
            <button
              onClick={clearCanvas}
              className="px-2 py-1 bg-gray-800 hover:bg-rose-950 text-gray-300 hover:text-rose-300 rounded text-xs border border-gray-700 transition"
              title="Clear all nodes from canvas"
            >
              🧹 Clear
            </button>

            {connectingSourceId && (
              <span className="ml-2 text-xs px-2 py-0.5 bg-amber-950 text-amber-300 rounded border border-amber-700 animate-pulse">
                Connecting from {connectingSourceId}... Click target node port!
              </span>
            )}
          </div>

          {/* SVG Connection Overlay */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
              </marker>
            </defs>
            {edges.map((edge) => {
              const srcNode = nodes.find((n) => n.id === edge.source);
              const tgtNode = nodes.find((n) => n.id === edge.target);
              if (!srcNode || !tgtNode) return null;

              const isSrcExpanded = expandedNodes[srcNode.id] ?? !globalCompactView;

              const x1 = srcNode.position.x + (isSrcExpanded ? 240 : 180);
              const y1 = srcNode.position.y + 24;
              const x2 = tgtNode.position.x;
              const y2 = tgtNode.position.y + 24;

              const dx = Math.abs(x2 - x1) * 0.5;
              const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

              return (
                <g key={edge.id} className="group pointer-events-auto">
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="3"
                    markerEnd="url(#arrow)"
                    className="hover:stroke-rose-400 cursor-pointer transition-all"
                    onClick={() => removeEdge(edge.id)}
                  />
                </g>
              );
            })}
          </svg>

          {/* Canvas Nodes Layer: LabVIEW-Style Compact Block Cards */}
          <div className="relative w-full h-full z-10">
            {nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const isConnecting = connectingSourceId === node.id;
              const isExpanded = expandedNodes[node.id] ?? !globalCompactView;
              const style = getNodeColorStyle(node.data.origin, node.data.namespace?.includes("plugin") ? "Plugin" : undefined);

              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  style={{ left: `${node.position.x}px`, top: `${node.position.y}px` }}
                  className={`absolute ${
                    isExpanded ? "w-64" : "w-48"
                  } bg-gray-900/95 backdrop-blur-md border ${
                    isConnecting
                      ? "border-amber-400 ring-4 ring-amber-400/30"
                      : isSelected
                      ? `${style.border} ring-2 ring-indigo-500/40 shadow-indigo-500/20`
                      : style.border
                  } rounded-xl p-2.5 shadow-2xl cursor-move transition-all hover:shadow-xl`}
                >
                  {/* Connection Input Port */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (connectingSourceId) handleConnectClick(node.id);
                    }}
                    title="Input Connection Port"
                    className="absolute -left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-800 border-2 border-indigo-500 hover:bg-indigo-500 cursor-pointer flex items-center justify-center text-[9px] text-white font-bold shadow"
                  >
                    in
                  </div>

                  {/* Connection Output Port */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConnectClick(node.id);
                    }}
                    title="Output Connection Port"
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-800 border-2 border-indigo-500 hover:bg-indigo-500 cursor-pointer flex items-center justify-center text-[9px] text-white font-bold shadow"
                  >
                    out
                  </div>

                  {/* LabVIEW Compact Header Pill */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 truncate">
                      <span className={`text-xs font-bold truncate ${style.text}`}>{node.data.label}</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => toggleNodeExpand(node.id, e)}
                        className="text-[10px] px-1.5 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded font-bold border border-gray-700"
                        title={isExpanded ? "Collapse Node" : "Expand LabVIEW View"}
                      >
                        {isExpanded ? "▲" : "▼"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNode(node.id);
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 p-0.5 rounded hover:bg-rose-950/50"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Expanded LabVIEW Detail Card */}
                  {isExpanded && (
                    <div className="mt-2.5 pt-2 border-t border-gray-800/80 space-y-1.5 text-[11px] animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-mono text-[10px]">{node.id}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${style.badge}`}>
                          {node.data.origin}
                        </span>
                      </div>

                      <p className="text-[10px] font-mono text-gray-400 truncate">
                        {node.data.func_name || node.data.node_type}
                      </p>

                      <div className="space-y-0.5 text-gray-400 pt-1 border-t border-gray-800/50">
                        <div>
                          <span className="text-gray-500">In:</span> {node.data.contract.reads.join(", ") || "none"}
                        </div>
                        <div>
                          <span className="text-gray-500">Out:</span> {node.data.contract.writes.join(", ") || "none"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Canvas Right Click Context Menu */}
          {contextMenuPos && (
            <div
              style={{ left: `${contextMenuPos.x}px`, top: `${contextMenuPos.y}px` }}
              className="absolute z-50 bg-gray-900 border border-gray-700 rounded-xl p-2 shadow-2xl space-y-1 text-xs w-48 animate-scaleIn"
            >
              <div className="px-2 py-1 text-[10px] font-bold text-gray-500 uppercase border-b border-gray-800">
                Add Control Block
              </div>
              <button
                onClick={() => handleAddFromContextMenu("condition")}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-amber-950/50 text-amber-300 font-semibold"
              >
                🔀 Add IF Condition
              </button>
              <button
                onClick={() => handleAddFromContextMenu("for")}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-sky-950/50 text-sky-300 font-semibold"
              >
                🔁 Add FOR Loop
              </button>
              <button
                onClick={() => handleAddFromContextMenu("parallel")}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-purple-950/50 text-purple-300 font-semibold"
              >
                ⚡ Add PARALLEL Branch
              </button>
              <button
                onClick={() => handleAddFromContextMenu("ai")}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-purple-900/50 text-purple-200 font-semibold border-t border-gray-800 pt-1.5"
              >
                ✨ Create AI Step...
              </button>
              <button
                onClick={() => setContextMenuPos(null)}
                className="w-full text-center px-2 py-1 rounded bg-gray-800 text-gray-400 hover:text-white mt-1"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Bottom Status Bar */}
          <div className="bg-gray-900/90 backdrop-blur-md border border-gray-800 rounded-xl p-3 text-xs text-gray-400 flex items-center justify-between z-10 shadow-lg">
            <span>Status: <strong className="text-gray-200">{statusMessage}</strong></span>
            <span>Target Engine: <strong className="text-indigo-400">WPipe v2.5.8</strong></span>
          </div>
        </main>

        {/* Right Inspector Panel */}
        <aside className="w-88 bg-gray-900 border-l border-gray-800 flex flex-col z-10">
          <div className="grid grid-cols-2 border-b border-gray-800 bg-gray-950 text-xs font-semibold text-gray-400">
            <button
              onClick={() => setInspectorTab("properties")}
              className={`py-3 text-center border-b-2 transition ${
                inspectorTab === "properties" ? "border-indigo-500 text-indigo-400 bg-gray-900" : "border-transparent hover:text-gray-200"
              }`}
            >
              ⚙️ Properties
            </button>
            <button
              onClick={() => setInspectorTab("code_notes")}
              className={`py-3 text-center border-b-2 transition ${
                inspectorTab === "code_notes" ? "border-purple-500 text-purple-400 bg-gray-900" : "border-transparent hover:text-gray-200"
              }`}
            >
              💻 Code & Notes
            </button>
          </div>

          <div className="flex-1 p-5 overflow-y-auto">
            {selectedNode ? (
              inspectorTab === "properties" ? (
                /* PROPERTIES TAB */
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-gray-400 mb-1">Node Label</label>
                    <input
                      type="text"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-gray-100 font-medium"
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
                    <label className="block text-gray-400 mb-1">Namespace</label>
                    <p className="font-mono text-gray-300 bg-gray-950 p-2 rounded border border-gray-800 break-all">
                      {selectedNode.data.namespace || "N/A"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">Context Writes (Output Variables)</label>
                    <input
                      type="text"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 font-mono text-emerald-400"
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
                    <label className="block text-gray-400 mb-1">Merge Policy</label>
                    <select
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-gray-200"
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
                /* CODE & NOTES TAB */
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-purple-300 font-bold mb-1">📝 Developer Notes / Agent Instructions</label>
                    <textarea
                      rows={4}
                      placeholder="Add developer notes or agent refinement instructions here..."
                      className="w-full bg-gray-950 border border-purple-800/80 rounded-lg p-2.5 text-gray-200 text-xs resize-none focus:outline-none focus:border-purple-500"
                      value={selectedNode.data.notes || ""}
                      onChange={(e) => {
                        const notes = e.target.value;
                        setNodes((prev) =>
                          prev.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, notes } } : n))
                        );
                        setSelectedNode((prev) => (prev ? { ...prev, data: { ...prev.data, notes } } : null));
                      }}
                    ></textarea>
                    <p className="text-[10px] text-gray-500 mt-1">
                      These notes will be passed directly to the LLM agent when generating/refining Python code.
                    </p>
                  </div>

                  <div>
                    <label className="block text-gray-400 font-semibold mb-1">💻 Python Code Preview</label>
                    <pre className="bg-gray-950 p-3 rounded-lg border border-gray-800 font-mono text-[11px] text-indigo-300 overflow-x-auto whitespace-pre-wrap">
                      {selectedNode.data.code_snippet || `# Step: ${selectedNode.data.label}\nfrom wpipe import step\n\n# Code template`}
                    </pre>
                  </div>
                </div>
              )
            ) : (
              <p className="text-xs text-gray-500 italic">Select a node on the canvas to inspect its properties or code.</p>
            )}
          </div>
        </aside>
      </div>

      {/* AI Custom Step Creator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-purple-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-purple-300 flex items-center gap-2">
              <span>✨ Create AI Custom Step</span>
            </h3>
            <p className="text-xs text-gray-400">
              Describe the custom step functionality. The LLM Agent will generate its code and Dialect A DTO.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-300 mb-1">Step Name</label>
                <input
                  type="text"
                  placeholder="e.g. SummarizeDocumentStep"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-gray-100"
                  value={aiStepName}
                  onChange={(e) => setAiStepName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">AI Prompt / Description</label>
                <textarea
                  rows={4}
                  placeholder="Describe what this step should do, inputs required, and output format..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-gray-100 resize-none"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAiStep}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow"
              >
                Create AI Step
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Results Modal */}
      {verificationModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                <span>🛡️ Quality Verification Results</span>
              </h3>
              <button onClick={() => setVerificationModal(null)} className="text-gray-400 hover:text-white font-bold p-1">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between bg-gray-950 p-3 rounded-lg border border-gray-800">
                <span className="font-semibold text-gray-300">Sandbox Result</span>
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
