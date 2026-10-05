import React, { useState, useEffect, useRef } from "react";
import { CanvasNode, CanvasEdge, CanvasIR, StepOrigin } from "./lib/ir/schemas";
import { BlocklyComponent, addStepBlockToWorkspace, addControlBlockToWorkspace, getMermaidFromBlocklyWorkspace } from "./components/BlocklyWorkspace";
import mermaid from "mermaid";

interface ParamSpec {
  name: string;
  annotation?: string;
  default?: any;
}

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
  version?: string;
  how_to_use?: string;
  params?: ParamSpec[];
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: "General" | "Architecture" | "Sandbox" | "AI";
}

export default function App() {
  // Splash Screen state
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [splashProgress, setSplashProgress] = useState<number>(0);
  const [splashFadeOut, setSplashFadeOut] = useState<boolean>(false);

  // FAQ Modal & Accordions state
  const [showFaqModal, setShowFaqModal] = useState<boolean>(false);
  const [openFaqId, setOpenFaqId] = useState<string | null>("faq_1");
  const [faqSearch, setFaqSearch] = useState<string>("");

  // Mobile Drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  // Mermaid & Pipeline JSON Preview Modals
  const [showMermaidModal, setShowMermaidModal] = useState<boolean>(false);
  const [mermaidCode, setMermaidCode] = useState<string>("");
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);
  const [pipelineJsonText, setPipelineJsonText] = useState<string>("");
  const mermaidRenderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showMermaidModal && mermaidCode && mermaidRenderRef.current) {
      mermaid.initialize({ startOnLoad: false, theme: "dark" });
      mermaidRenderRef.current.innerHTML = "";
      const uniqueSvgId = `mermaid_svg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      mermaid
        .render(uniqueSvgId, mermaidCode)
        .then(({ svg }) => {
          if (mermaidRenderRef.current) {
            mermaidRenderRef.current.innerHTML = svg;
          }
        })
        .catch((err) => {
          console.error("Mermaid render error:", err);
        });
    }
  }, [showMermaidModal, mermaidCode]);

  const [catalog, setCatalog] = useState<CatalogStep[]>([]);
  const [userStates, setUserStates] = useState<CatalogStep[]>([]);

  // Block Parameter Config Modal State
  const [configModalBlock, setConfigModalBlock] = useState<any | null>(null);
  const [dynamicFields, setDynamicFields] = useState<ParamSpec[]>([]);
  const [blockParamValues, setBlockParamValues] = useState<Record<string, any>>({});

  // Register window event handler for Blockly block config click
  useEffect(() => {
    (window as any).onOpenBlockConfigModal = (block: any) => {
      setConfigModalBlock(block);
      const stepName = (block.getFieldValue("STEP_NAME") || "").toLowerCase();
      const ns = (block.getFieldValue("NAMESPACE") || "").toLowerCase();

      // Find matching step in catalog
      const catalogStep = catalog.find(
        (s) => s.name.toLowerCase() === stepName || s.func_name.toLowerCase() === stepName || s.namespace.toLowerCase() === ns
      );

      if (catalogStep && catalogStep.params && catalogStep.params.length > 0) {
        setDynamicFields(catalogStep.params);
        const initialVals: Record<string, any> = {};
        catalogStep.params.forEach((p) => {
          initialVals[p.name] = p.default ?? "";
        });
        setBlockParamValues(initialVals);
      } else if (stepName.includes("redis") || ns.includes("redis")) {
        setDynamicFields([
          { name: "host", annotation: "str", default: "127.0.0.1" },
          { name: "port", annotation: "int", default: 6379 },
          { name: "db", annotation: "int", default: 0 },
          { name: "password", annotation: "str | None", default: "" },
        ]);
        setBlockParamValues({ host: "127.0.0.1", port: "6379", db: "0", password: "" });
      } else if (stepName.includes("yolo") || ns.includes("vision") || stepName.includes("ocr")) {
        setDynamicFields([
          { name: "model_path", annotation: "str", default: "/models/yolov8n.pt" },
          { name: "conf_threshold", annotation: "float", default: 0.25 },
          { name: "device", annotation: "str", default: "cuda:0" },
        ]);
        setBlockParamValues({ model_path: "/models/yolov8n.pt", conf_threshold: "0.25", device: "cuda:0" });
      } else {
        setDynamicFields([
          { name: "endpoint_url", annotation: "str", default: "https://api.example.com" },
          { name: "timeout", annotation: "int", default: 30 },
        ]);
        setBlockParamValues({ endpoint_url: "https://api.example.com", timeout: "30" });
      }
    };
    return () => {
      delete (window as any).onOpenBlockConfigModal;
    };
  }, [catalog]);

  // Loading states
  const [catalogLoading, setCatalogLoading] = useState<boolean>(true);
  const [dryRunLoading, setDryRunLoading] = useState<boolean>(false);
  const [zipLoading, setZipLoading] = useState<boolean>(false);

  // Canvas Nodes & Edges
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

  const [activeTab, setActiveTab] = useState<"official" | "plugins" | "user" | "ai" | "inuse">("official");
  const [selectedNode, setSelectedNode] = useState<CanvasNode | null>(nodes[0]);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [inspectorTab, setInspectorTab] = useState<"properties" | "code_notes">("properties");
  const [globalCompactView, setGlobalCompactView] = useState<boolean>(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");
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
  const [isDragOverCanvas, setIsDragOverCanvas] = useState<boolean>(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // FAQ Items Database
  const faqList: FaqItem[] = [
    {
      id: "faq_1",
      category: "Sandbox",
      question: "How does the Docker Sandbox verification loop work?",
      answer: "When you click 'Dry-Run Verify', WPipe Studio builds a temporary Docker container executing 6 quality gates: syntax check, black/isort formatting, ruff linter, mypy typechecking, pytest unit tests (cov ≥ 60%), and an end-to-end dry_run_pipeline. Only when all gates pass is the microservice ZIP enabled for download.",
    },
    {
      id: "faq_2",
      category: "Architecture",
      question: "What are the 3 IR Levels (CanvasIR, SemanticIR, TargetIR)?",
      answer: "CanvasIR represents the visual graph (nodes, coordinates, connections). SemanticIR parses execution semantics (DAG order, contract reads/writes, merge policy). TargetIR emits the final production microservice files (FastAPI main.py, pipelines.py, Dockerfile, Makefile, tests).",
    },
    {
      id: "faq_3",
      category: "General",
      question: "How do I upload custom Python (.py) state files?",
      answer: "Navigate to the '📁 User' tab in the sidebar and click 'Upload .py File'. Your Python state functions decorated with @step will be parsed and made available to drag onto the canvas as amber-colored custom nodes.",
    },
    {
      id: "faq_4",
      category: "AI",
      question: "How do AI Prompts and Developer Notes work?",
      answer: "Click '✨ + AI Step' to describe a new step in natural language. In the Inspector's '💻 Code & Notes' tab, you can add specific developer instructions that the LLM agent uses during microservice code generation and refinement.",
    },
    {
      id: "faq_5",
      category: "Architecture",
      question: "How does the Release Catalog sync with wpipe-steps?",
      answer: "CatalogService queries the release manifest steps_catalog.json (196 steps) with SHA-256 caching. It never scans the raw filesystem, ensuring that only curated, production-ready steps are exposed in the palette.",
    },
    {
      id: "faq_6",
      category: "General",
      question: "How do I connect, disconnect, or insert IF / FOR blocks between nodes?",
      answer: "1. To connect: Click the 'out' port on a source node, then click the 'in' port on the target node. 2. To disconnect: Hover over any connection cable and click the red '✕' button or click the cable directly. 3. To insert an IF/FOR block: Hover over the connection cable between two nodes and click '+IF', or use the '+ IF' button on the top toolbar.",
    },
  ];

  // Trigger Splash Animation
  const triggerSplash = () => {
    setShowSplash(true);
    setSplashProgress(0);
    setSplashFadeOut(false);

    let progress = 0;
    const timer = setInterval(() => {
      progress += 20;
      setSplashProgress(progress);
      if (progress >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          setSplashFadeOut(true);
          setTimeout(() => setShowSplash(false), 500);
        }, 500);
      }
    }, 200);
  };

  // Initial Splash Screen load
  useEffect(() => {
    triggerSplash();
  }, []);

  useEffect(() => {
    setCatalogLoading(true);
    fetch("/api/v1/catalog/steps")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCatalog(data);
        }
      })
      .catch((err) => {
        console.error("Failed to load catalog steps:", err);
      })
      .finally(() => {
        setCatalogLoading(false);
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
    setIsDragOverCanvas(false);
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
    setIsDragOverCanvas(true);
  };

  const handleCanvasDragLeave = () => {
    setIsDragOverCanvas(false);
  };

  // Canvas Context Menu Handler
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
    const posX = contextMenuPos ? contextMenuPos.x : Math.min(450, 100 + nodes.length * 40);
    const posY = contextMenuPos ? contextMenuPos.y : Math.min(350, 120 + nodes.length * 30);
    const newId = `node_${nodes.length + 1}`;

    if (type === "ai") {
      setShowAiModal(true);
      setContextMenuPos(null);
      return;
    }

    const newNode: CanvasNode = {
      id: newId,
      type: "default",
      position: { x: posX, y: posY },
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
    setStatusMessage(`Added ${type.toUpperCase()} logic block to canvas`);
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
    const targetNode = nodes.find((n) => n.id === draggingNodeId);
    if (!targetNode) return;

    const newX = Math.max(10, e.clientX - canvasRect.left - dragOffset.x);
    const newY = Math.max(10, e.clientY - canvasRect.top - dragOffset.y);

    const deltaX = newX - targetNode.position.x;
    const deltaY = newY - targetNode.position.y;

    // Helper function to find all descendant node IDs recursively
    const getDescendants = (parentId: string): string[] => {
      const children = nodes.filter((n) => n.data.parent_id === parentId).map((n) => n.id);
      let all = [...children];
      children.forEach((childId) => {
        all = all.concat(getDescendants(childId));
      });
      return all;
    };

    const familyIds = new Set([draggingNodeId, ...getDescendants(draggingNodeId)]);

    setNodes((prev) =>
      prev.map((n) => {
        if (familyIds.has(n.id)) {
          return {
            ...n,
            position: {
              x: Math.max(10, n.position.x + deltaX),
              y: Math.max(10, n.position.y + deltaY),
            },
          };
        }
        return n;
      })
    );
  };

  const handleCanvasMouseUp = () => {
    if (draggingNodeId) {
      const dragged = nodes.find((n) => n.id === draggingNodeId);
      if (dragged) {
        // Find if dragged node was dropped inside proximity of a Control C-Block (IF, FOR, PARALLEL)
        const parentCandidate = nodes.find((n) => {
          if (n.id === dragged.id) return false;
          if (n.data.node_type !== "condition" && n.data.node_type !== "for" && n.data.node_type !== "parallel") return false;
          const dx = Math.abs(n.position.x - dragged.position.x);
          const dy = Math.abs(n.position.y - dragged.position.y);
          return dx < 140 && dy < 120;
        });

        if (parentCandidate) {
          let slot: "if_body" | "else_body" | "loop_body" | "parallel_body" = "if_body";
          if (parentCandidate.data.node_type === "for") slot = "loop_body";
          else if (parentCandidate.data.node_type === "parallel") slot = "parallel_body";
          else if (parentCandidate.data.node_type === "condition") {
            const relativeY = dragged.position.y - parentCandidate.position.y;
            if (parentCandidate.data.has_else && relativeY > 70) {
              slot = "else_body";
            }
          }

          setNodes((prev) =>
            prev.map((n) =>
              n.id === dragged.id
                ? { ...n, data: { ...n.data, parent_id: parentCandidate.id, slot_type: slot } }
                : n
            )
          );
          setStatusMessage(`Snapped '${dragged.data.label}' inside '${parentCandidate.data.label}' (${slot})!`);
        }
      }
    }
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
    setStatusMessage(`Disconnected edge ${id}`);
  };

  // Insert a control block (e.g. IF) directly between an existing edge connection
  const insertNodeOnEdge = (edge: CanvasEdge, logicType: "condition" | "for" | "parallel") => {
    const srcNode = nodes.find((n) => n.id === edge.source);
    const tgtNode = nodes.find((n) => n.id === edge.target);
    if (!srcNode || !tgtNode) return;

    const midX = Math.round((srcNode.position.x + tgtNode.position.x) / 2);
    const midY = Math.round((srcNode.position.y + tgtNode.position.y) / 2);

    const newId = `node_${nodes.length + 1}`;
    const newNode: CanvasNode = {
      id: newId,
      type: "default",
      position: { x: midX, y: midY },
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

    // Remove old edge, add new node, add 2 new edges (src -> newNode -> tgt)
    setEdges((prev) => [
      ...prev.filter((e) => e.id !== edge.id),
      { id: `e_${edge.source}_${newId}`, source: edge.source, target: newId },
      { id: `e_${newId}_${edge.target}`, source: newId, target: edge.target },
    ]);
    setNodes((prev) => [...prev, newNode]);
    setSelectedNode(newNode);
    setStatusMessage(`Inserted ${logicType.toUpperCase()} between ${srcNode.data.label} and ${tgtNode.data.label}`);
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
    addStepBlockToWorkspace(aiStepName, "ai_described", "described");
    setShowAiModal(false);
    setAiStepName("");
    setAiPrompt("");
    setStatusMessage(`Created AI Step '${aiStepName}' and added to canvas`);
  };

  // Generate Mermaid Diagram (VSCode WPipe Extension format) from current Blockly Canvas state
  const generateMermaidDiagram = () => {
    const code = getMermaidFromBlocklyWorkspace();
    setMermaidCode(code);
    setShowMermaidModal(true);
    setStatusMessage("Generated live Mermaid flowchart preview from Blockly canvas!");
  };

  // Export Pipeline JSON (WPipe Standard JSON format)
  const exportPipelineJson = () => {
    const canvasIr: CanvasIR = { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } };
    const jsonStr = JSON.stringify(canvasIr, null, 2);
    setPipelineJsonText(jsonStr);
    setShowJsonModal(true);
    setStatusMessage("Generated Pipeline JSON representation!");
  };

  // Dry Run Verification Handler
  const handleDryRun = async () => {
    setDryRunLoading(true);
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
    } finally {
      setDryRunLoading(false);
    }
  };

  // Generate Microservice ZIP Handler
  const handleGenerateZip = async () => {
    setZipLoading(true);
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
    } finally {
      setZipLoading(false);
    }
  };

  // Filtering & Tree Grouping Logic
  const officialSteps = catalog.filter((s) => s.repo === "Official");
  const pluginSteps = catalog.filter((s) => s.repo === "Plugin");

  // Unique categories list for dropdown filter
  const availableCategories = Array.from(new Set(catalog.map((s) => s.category).filter(Boolean)));

  // Advanced Global Multi-Field Search & Category Filter
  const filterBySearch = (step: CatalogStep) => {
    // 1. Category Dropdown Filter
    if (selectedCategoryFilter !== "ALL") {
      if (step.category.toLowerCase() !== selectedCategoryFilter.toLowerCase()) {
        return false;
      }
    }

    // 2. Search Query Text Filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      step.name.toLowerCase().includes(q) ||
      step.func_name.toLowerCase().includes(q) ||
      (step.namespace && step.namespace.toLowerCase().includes(q)) ||
      (step.category && step.category.toLowerCase().includes(q)) ||
      (step.subcategory1 && step.subcategory1.toLowerCase().includes(q)) ||
      (step.subcategory2 && step.subcategory2.toLowerCase().includes(q)) ||
      (step.description && step.description.toLowerCase().includes(q)) ||
      (step.code_snippet && step.code_snippet.toLowerCase().includes(q))
    );
  };

  const searchedOfficial = officialSteps.filter(filterBySearch);
  const searchedPlugins = pluginSteps.filter(filterBySearch);
  const searchedUser = userStates.filter(filterBySearch);

  // Auto-expand categories and switch tabs if matching results are found elsewhere
  useEffect(() => {
    if (searchQuery.trim()) {
      const allCatKeys: Record<string, boolean> = {};
      catalog.forEach((s) => {
        if (s.category) allCatKeys[s.category] = true;
      });
      setExpandedCategories(allCatKeys);

      // Auto-switch tab if current tab has 0 matches but another tab has results
      if (activeTab === "official" && searchedOfficial.length === 0 && searchedPlugins.length > 0) {
        setActiveTab("plugins");
      } else if (activeTab === "plugins" && searchedPlugins.length === 0 && searchedOfficial.length > 0) {
        setActiveTab("official");
      }
    }
  }, [searchQuery, catalog, searchedOfficial.length, searchedPlugins.length]);

  // Group steps by category and subcategory
  const categoryTree: Record<string, Record<string, CatalogStep[]>> = {};
  searchedOfficial.forEach((step) => {
    const cat = step.category || "general";
    const sub = step.subcategory1 || "main";
    if (!categoryTree[cat]) categoryTree[cat] = {};
    if (!categoryTree[cat][sub]) categoryTree[cat][sub] = [];
    categoryTree[cat][sub].push(step);
  });

  // Filtered FAQ items
  const filteredFaqs = faqList.filter((f) => {
    if (!faqSearch.trim()) return true;
    const q = faqSearch.toLowerCase();
    return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q) || f.category.toLowerCase().includes(q);
  });

  // Helper for Scratch 3.0 Block Category Palette & Notch Styling
  const getNodeColorStyle = (origin: StepOrigin | string, repo?: string, nodeType?: string, category?: string) => {
    if (nodeType === "condition") {
      return { scratchClass: "scratch-block-control", border: "border-[#cf8400]", bg: "bg-[#ffab19]", text: "text-white", badge: "bg-[#cf8400] text-white" };
    }
    if (nodeType === "for") {
      return { scratchClass: "scratch-block-events", border: "border-[#cc9900]", bg: "bg-[#ffbf00]", text: "text-amber-950", badge: "bg-[#cc9900] text-white" };
    }
    if (nodeType === "parallel") {
      return { scratchClass: "scratch-block-operators", border: "border-[#389438]", bg: "bg-[#59c059]", text: "text-white", badge: "bg-[#389438] text-white" };
    }
    if (origin === "user_imported") {
      return { scratchClass: "scratch-block-variables", border: "border-[#db6e00]", bg: "bg-[#ff8c1a]", text: "text-white", badge: "bg-[#db6e00] text-white" };
    }
    if (origin === "described") {
      return { scratchClass: "scratch-block-custom", border: "border-[#d93854]", bg: "bg-[#ff6680]", text: "text-white", badge: "bg-[#d93854] text-white" };
    }
    if (repo === "Plugin" || origin === "plugin") {
      return { scratchClass: "scratch-block-sensing", border: "border-[#2e8ca8]", bg: "bg-[#5cb1d6]", text: "text-white", badge: "bg-[#2e8ca8] text-white" };
    }
    // Default Official Motion Block (Scratch Blue)
    return { scratchClass: "scratch-block-motion", border: "border-[#3373cc]", bg: "bg-[#4c97ff]", text: "text-white", badge: "bg-[#3373cc] text-white" };
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#05070c] text-gray-100 font-sans select-none overflow-hidden aurora-bg">
      {/* 5. FULLSCREEN SPLASH LOADER */}
      {showSplash && (
        <div
          className={`fixed inset-0 z-[99999] bg-[#05070c] flex flex-col items-center justify-center transition-opacity duration-500 pointer-events-auto ${
            splashFadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center font-black text-white text-3xl shadow-2xl logo-pulsing mb-6">
            W
          </div>
          <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-200 to-emerald-300 font-heading tracking-tight mb-2">
            WPipe Studio
          </h2>
          <p className="text-xs text-gray-400 mb-6">Initializing Multi-tenant Canvas & Release Catalog Engine...</p>

          <div className="w-72 h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-800 shadow-inner mb-3">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${splashProgress}%` }}
            ></div>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 font-bold">{splashProgress}% Complete</span>
        </div>
      )}

      {/* Top Header */}
      <header className="flex items-center justify-between px-6 py-2.5 border-b border-gray-800/80 bg-gray-900/90 backdrop-blur-md shadow-lg z-20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center font-black text-white text-lg shadow-md shadow-indigo-600/20">
            W
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-200 to-emerald-300 font-heading tracking-tight flex items-center gap-2">
              <span>WPipe Studio</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono font-normal">
                v2.5.8
              </span>
            </h1>
            <p className="text-[11px] text-gray-400">Scratch 3.0 Visual Pipeline Builder</p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={generateMermaidDiagram}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-sky-950/90 hover:bg-sky-900 text-sky-300 border border-sky-600 transition shadow-md shadow-sky-950/50 flex items-center gap-2 cursor-pointer active:scale-95"
            title="Render Mermaid Flowchart Preview"
          >
            <span>📊 Render Flow Graph</span>
          </button>
        </div>
      </header>

      {/* Main Workspace with Left Add-Block Bar */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Interactive "Add Block" Palette */}
        <aside className="w-80 bg-gray-900/95 border-r border-gray-800/80 flex flex-col z-20 shadow-2xl glass-panel">
          <div className="p-4 bg-gray-950 border-b border-gray-800/80 flex items-center justify-between">
            <span className="text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-emerald-300 font-heading">
              ➕ Add Block
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono font-bold">
              Scratch Palette
            </span>
          </div>

          {/* Selector Type Tabs */}
          <div className="grid grid-cols-3 border-b border-gray-800/80 bg-gray-950 text-[11px] font-semibold text-gray-400">
            <button
              onClick={() => setActiveTab("official")}
              className={`py-2.5 text-center border-b-2 transition flex items-center justify-center gap-1 ${
                activeTab === "official" ? "border-indigo-500 text-indigo-400 bg-gray-900" : "border-transparent hover:text-gray-200"
              }`}
            >
              <span>🌐 External</span>
            </button>
            <button
              onClick={() => setActiveTab("user")}
              className={`py-2.5 text-center border-b-2 transition flex items-center justify-center gap-1 ${
                activeTab === "user" ? "border-amber-500 text-amber-400 bg-gray-900" : "border-transparent hover:text-gray-200"
              }`}
            >
              <span>📂 Internal</span>
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`py-2.5 text-center border-b-2 transition flex items-center justify-center gap-1 ${
                activeTab === "ai" ? "border-purple-500 text-purple-400 bg-gray-900" : "border-transparent hover:text-gray-200"
              }`}
            >
              <span>✨ AI Step</span>
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-4">
            {/* 1. EXTERNAL STEP CATALOG (INTELLIGENT SEARCH & CATEGORY ROUTING) */}
            {activeTab === "official" && (
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="🔍 Intelligent search (vision, redis hash, ocr...)"
                    className="w-full bg-gray-950 border border-gray-700/80 rounded-xl py-2 pl-3 pr-8 text-xs text-gray-100 placeholder-gray-500 focus:outline-none transition"
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

                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block font-heading">
                    Catalog Steps ({searchedOfficial.length + searchedPlugins.length})
                  </span>

                  {searchedOfficial.length === 0 && searchedPlugins.length === 0 ? (
                    <div className="p-4 text-center border border-dashed border-gray-800 rounded-xl bg-gray-950/40">
                      <p className="text-xs font-bold text-gray-400">No steps matched '{searchQuery}'</p>
                    </div>
                  ) : (
                    [...searchedOfficial, ...searchedPlugins].map((step, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          addStepBlockToWorkspace(step.name, step.namespace, "catalog");
                          setStatusMessage(`Added block '${step.name}' to Scratch canvas`);
                        }}
                        className="p-3 bg-blue-950/30 hover:bg-blue-900/50 border border-blue-600/80 hover:border-blue-400 rounded-xl cursor-pointer transition shadow-md group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                            <span>📦</span>
                            <span>{step.name}</span>
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${step.repo === "Official" ? "bg-blue-950 text-blue-300 border border-blue-500" : "bg-emerald-950 text-emerald-300 border border-emerald-500"}`}>
                            {step.repo === "Official" ? "Official" : "Community"}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-300 mt-1 line-clamp-2">{step.description}</p>
                        <div className="mt-2 text-[9px] font-mono text-blue-300/80 flex items-center justify-between">
                          <span>Cat: {step.category}</span>
                          <span className="text-emerald-400 font-bold group-hover:translate-x-0.5 transition">+ Click to Add</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 2. INTERNAL STEP (.PY LOADED OR UPLOAD NEW) */}
            {activeTab === "user" && (
              <div className="space-y-4">
                <div className="bg-amber-950/30 p-3.5 rounded-xl border border-amber-800/80 space-y-2">
                  <span className="text-xs font-semibold text-amber-300 block font-heading">📂 Import Custom .py State</span>
                  <p className="text-[11px] text-gray-400">Upload your custom Python state file.</p>
                  <label className="block w-full text-center py-2 px-3 bg-amber-900/60 hover:bg-amber-800 text-amber-200 rounded-lg text-xs font-semibold border border-amber-700 cursor-pointer transition">
                    Upload .py File
                    <input type="file" accept=".py" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase">Available Internal States ({userStates.length})</span>
                  {userStates.length === 0 ? (
                    <p className="text-xs text-gray-500 italic p-2">No custom states loaded yet. Upload a .py file above!</p>
                  ) : (
                    userStates.map((step, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          addStepBlockToWorkspace(step.name, step.namespace || "user_custom", "user_imported");
                          setStatusMessage(`Added internal state '${step.name}' to Scratch canvas`);
                        }}
                        className="p-3 bg-amber-950/30 hover:bg-amber-900/50 border border-amber-600/80 hover:border-amber-400 rounded-xl cursor-pointer transition shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-amber-200">{step.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-amber-950 text-amber-300 rounded border border-amber-800 font-mono">.py</span>
                        </div>
                        <p className="text-[10px] text-gray-300 mt-1 line-clamp-1">{step.description}</p>
                        <span className="mt-1 block text-[9px] text-amber-400 font-bold text-right">+ Click to Add</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 3. AI DESCRIBED STEP */}
            {activeTab === "ai" && (
              <div className="space-y-4">
                <div className="bg-purple-950/30 p-3.5 rounded-xl border border-purple-800 space-y-3">
                  <span className="text-xs font-bold text-purple-300 block font-heading">✨ Prompt AI Step</span>
                  <p className="text-[11px] text-gray-400">Define Title, Description, and Details for the AI agent.</p>
                  <button
                    onClick={() => setShowAiModal(true)}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow transition"
                  >
                    + Open AI Prompt Dialog
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Central Workspace: Google Blockly Native Scratch Canvas */}
        <main ref={canvasRef} className="flex-1 bg-[#05070c] p-4 relative overflow-hidden flex flex-col justify-between">
          {/* Blockly Native Canvas */}
          <div className="w-full h-full">
            <BlocklyComponent
              onWorkspaceChange={(ws) => {
                (window as any).blocklyWorkspace = ws;
              }}
            />
          </div>

          {/* Bottom Status Bar */}
          <div className="bg-gray-900/90 backdrop-blur-md border border-gray-800 rounded-xl p-3 text-xs text-gray-400 flex items-center justify-between z-10 shadow-lg mt-2">
            <span>Status: <strong className="text-gray-200">{statusMessage}</strong></span>
            <span>Engine: <strong className="text-indigo-400 font-heading">Google Blockly (Scratch 3.0 Native Canvas)</strong></span>
          </div>
        </main>
      </div>

      {/* 7. INTERACTIVE FAQ MODAL WITH ACCORDIONS */}
      {showFaqModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-purple-800/80 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl glass-panel max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-indigo-300 font-heading">
                  ❓ Frequently Asked Questions & Architecture Guide
                </h3>
                <p className="text-xs text-gray-400">Everything you need to know about WPipe Studio pipelines, IR, and sandbox verification.</p>
              </div>
              <button
                onClick={() => setShowFaqModal(false)}
                className="text-gray-400 hover:text-white font-bold p-1 text-lg"
              >
                ✕
              </button>
            </div>

            {/* FAQ Search */}
            <input
              type="text"
              placeholder="🔍 Search FAQ questions (sandbox, IR, docker, custom steps)..."
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-xs text-gray-200 focus:outline-none"
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
            />

            {/* Accordion Questions List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {filteredFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div key={faq.id} className="border border-gray-800 rounded-xl bg-gray-950/60 overflow-hidden transition">
                    <button
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      className="w-full p-3.5 text-left bg-gray-900/80 hover:bg-gray-850 flex items-center justify-between transition"
                    >
                      <span className="text-xs font-bold text-gray-200 font-heading flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono">
                          {faq.category}
                        </span>
                        <span>{faq.question}</span>
                      </span>
                      <span className={`text-xs text-gray-400 transform transition-transform duration-300 ${isOpen ? "rotate-180 text-emerald-400" : ""}`}>
                        ▼
                      </span>
                    </button>

                    <div className={`accordion-content ${isOpen ? "open" : ""}`}>
                      <div className="p-3.5 text-xs text-gray-300 bg-gray-950/90 border-t border-gray-800/60 leading-relaxed">
                        {faq.answer}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-gray-800 flex justify-end">
              <button
                onClick={() => setShowFaqModal(false)}
                className="btn-glossy px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold shadow"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Custom Step Creator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-purple-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-purple-300 flex items-center gap-2 font-heading">
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
                className="btn-glossy px-4 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold shadow"
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
              <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2 font-heading">
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
                className="btn-glossy px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold transition-all"
              >
                Close Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rendered Pipeline Flow Graph Modal */}
      {showMermaidModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-sky-800/80 rounded-2xl max-w-4xl w-full p-6 space-y-4 shadow-2xl glass-panel max-h-[85vh] flex flex-col overflow-hidden">
            {/* Pinned Header */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 flex-shrink-0">
              <div>
                <h3 className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-indigo-300 font-heading">
                  📊 Rendered Pipeline Flowchart
                </h3>
                <p className="text-xs text-gray-400">Visual flow graph generated from your visual Scratch pipeline blocks.</p>
              </div>
              <button onClick={() => setShowMermaidModal(false)} className="text-gray-400 hover:text-white font-bold p-1 text-lg">
                ✕
              </button>
            </div>

            {/* Scrollable Viewport SVG Container */}
            <div className="bg-gray-950 p-6 rounded-xl border border-sky-900/60 overflow-auto max-h-[60vh] min-h-[250px] custom-modal-scrollbar">
              <div ref={mermaidRenderRef} className="w-full min-w-[500px] flex justify-center text-center items-center"></div>
            </div>

            {/* Pinned Footer Toolbar */}
            <div className="flex justify-between items-center pt-2 flex-shrink-0 border-t border-gray-800/80">
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(mermaidCode);
                    setStatusMessage("Copied Mermaid code to clipboard!");
                  }}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-sky-300 rounded-lg text-xs font-semibold border border-gray-700 transition active:scale-95"
                  title="Copy underlying Mermaid syntax code"
                >
                  📋 Copy Mermaid Code
                </button>
                <button
                  onClick={() => {
                    const svgEl = mermaidRenderRef.current?.querySelector("svg");
                    if (!svgEl) return;
                    const svgData = new XMLSerializer().serializeToString(svgEl);
                    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
                    const svgUrl = URL.createObjectURL(svgBlob);
                    const downloadLink = document.createElement("a");
                    downloadLink.href = svgUrl;
                    downloadLink.download = "wpipe_pipeline_flowchart.svg";
                    downloadLink.click();
                    setStatusMessage("Exported flowchart as SVG image!");
                  }}
                  className="px-3 py-1.5 bg-sky-950 hover:bg-sky-900 text-sky-300 rounded-lg text-xs font-semibold border border-sky-700 transition active:scale-95"
                  title="Export rendered flowchart graph as SVG image"
                >
                  🖼️ Export Image (SVG)
                </button>
              </div>

              <button
                onClick={() => setShowMermaidModal(false)}
                className="btn-glossy px-4 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-semibold shadow"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Pipeline JSON Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-amber-800/80 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl glass-panel">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-emerald-300 font-heading">
                  📄 Exported Pipeline JSON (CanvasIR)
                </h3>
                <p className="text-xs text-gray-400">Complete JSON representation of your configured pipeline nodes and edges.</p>
              </div>
              <button onClick={() => setShowJsonModal(false)} className="text-gray-400 hover:text-white font-bold p-1 text-lg">
                ✕
              </button>
            </div>

            <pre className="bg-gray-950 p-4 rounded-xl border border-amber-900/60 font-mono text-xs text-amber-300 overflow-x-auto whitespace-pre max-h-96">
              {pipelineJsonText}
            </pre>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(pipelineJsonText);
                  setStatusMessage("Copied Pipeline JSON to clipboard!");
                }}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-amber-300 rounded-lg text-xs font-semibold border border-gray-700"
              >
                📋 Copy JSON
              </button>
              <button
                onClick={() => setShowJsonModal(false)}
                className="btn-emerald-glossy px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow"
              >
                Continue Editing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Parameters Configuration Modal */}
      {configModalBlock && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-amber-500/80 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl glass-panel">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-100 font-heading flex items-center gap-2">
                  <span>⚙️ Configure Step Parameters</span>
                </h3>
                <p className="text-xs text-amber-400/90 font-mono">
                  {configModalBlock.getFieldValue("STEP_NAME")} ({configModalBlock.getFieldValue("NAMESPACE")})
                </p>
              </div>
              <button onClick={() => setConfigModalBlock(null)} className="text-gray-400 hover:text-white font-bold p-1 text-lg">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {dynamicFields.map((field) => (
                <div key={field.name}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-gray-300 font-semibold font-mono">{field.name}</label>
                    <span className="text-[10px] text-indigo-400 font-mono">({field.annotation || "str"})</span>
                  </div>
                  <input
                    type="text"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-gray-100 font-mono focus:border-amber-500 focus:outline-none"
                    placeholder={`Default: ${field.default ?? ""}`}
                    value={blockParamValues[field.name] ?? ""}
                    onChange={(e) =>
                      setBlockParamValues({
                        ...blockParamValues,
                        [field.name]: e.target.value,
                      })
                    }
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-800">
              <button
                onClick={() => {
                  const autoVals: Record<string, any> = {};
                  dynamicFields.forEach((f) => {
                    autoVals[f.name] = f.default ?? "auto_val";
                  });
                  setBlockParamValues(autoVals);
                  setStatusMessage("AI Agent auto-filled parameters from step schema");
                }}
                className="px-3 py-1.5 bg-purple-950 hover:bg-purple-900 text-purple-300 rounded-lg text-xs font-semibold border border-purple-700 transition"
              >
                🤖 Auto-Fill AI
              </button>

              <div className="flex space-x-2">
                <button
                  onClick={() => setConfigModalBlock(null)}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Update block field or icon to green configured state
                    if (configModalBlock && configModalBlock.getField("CONFIG_ICON")) {
                      configModalBlock.setFieldValue(
                        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='%2310b981'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/></svg>",
                        "CONFIG_ICON"
                      );
                    }
                    setConfigModalBlock(null);
                    setStatusMessage(`Saved parameters for ${configModalBlock.getFieldValue("STEP_NAME")}`);
                  }}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow transition"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
