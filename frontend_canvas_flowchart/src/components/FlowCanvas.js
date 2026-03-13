import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges
} from "reactflow";
import "reactflow/dist/style.css";

import RetroNode from "./nodes/RetroNode";
import { useHistory } from "../hooks/useHistory";
import { clearFlowchart, loadFlowchart, saveFlowchart } from "../services/storage";
import { exportAsJson, exportAsPng, parseNodeText } from "../utils/flowUtils";

/**
 * Behavior summary:
 * - Click anywhere on empty canvas to set the "typing cursor".
 * - Type; Enter creates a node at that location and auto-connects from previous node.
 * - Keywords decide box type: "decision:", "input:", "output:", "process:" (default).
 * - Nodes are draggable (React Flow).
 * - Double click a node to edit; Ctrl/⌘+Enter to save inside editor.
 * - Undo/redo (Ctrl/⌘+Z / Ctrl/⌘+Shift+Z or Ctrl/⌘+Y).
 * - Export PNG and JSON; save to localStorage on every change.
 */

const EMPTY_FLOW = { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };

function makeId(prefix) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

// PUBLIC_INTERFACE
export default function FlowCanvas({ onToast }) {
  const wrapperRef = useRef(null);
  const rfInstanceRef = useRef(null);

  const [cursor, setCursor] = useState({ x: 160, y: 120 });
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Keep last created node for auto-connecting.
  const [lastNodeId, setLastNodeId] = useState(null);

  const history = useHistory(EMPTY_FLOW);
  const { nodes, edges, viewport } = history.state;

  // Node type registry
  const nodeTypes = useMemo(() => ({ retro: RetroNode }), []);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = loadFlowchart();
    if (saved) {
      history.reset({
        nodes: saved.nodes,
        edges: saved.edges,
        viewport: saved.viewport ?? EMPTY_FLOW.viewport
      });
      setLastNodeId(saved.nodes?.[saved.nodes.length - 1]?.id ?? null);
      onToast?.({ title: "Loaded", message: "Restored flowchart from localStorage." });
    } else {
      onToast?.({ title: "Ready", message: "Click canvas and start typing. Press Enter to create nodes." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist any flow changes
  useEffect(() => {
    saveFlowchart({ nodes, edges, viewport });
  }, [nodes, edges, viewport]);

  const setFlow = useCallback(
    (next, meta) => {
      history.set(next, meta);
    },
    [history]
  );

  const onNodesChange = useCallback(
    (changes) => {
      setFlow((prev) => ({ ...prev, nodes: applyNodeChanges(changes, prev.nodes) }));
    },
    [setFlow]
  );

  const onEdgesChange = useCallback(
    (changes) => {
      setFlow((prev) => ({ ...prev, edges: applyEdgeChanges(changes, prev.edges) }));
    },
    [setFlow]
  );

  const onConnect = useCallback(
    (connection) => {
      setFlow((prev) => ({
        ...prev,
        edges: addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: "#7ef4ff", strokeWidth: 2 },
            markerEnd: { type: "arrowclosed", color: "#7ef4ff" }
          },
          prev.edges
        )
      }));
    },
    [setFlow]
  );

  const updateViewport = useCallback(() => {
    const rf = rfInstanceRef.current;
    if (!rf) return;
    const vp = rf.getViewport();
    setFlow((prev) => ({ ...prev, viewport: vp }), { skipHistory: true });
  }, [setFlow]);

  const handlePaneClick = useCallback(
    (event) => {
      // Only set cursor if click lands on the pane itself (not on a node/edge).
      const target = event.target;
      const isPane = target?.classList?.contains("react-flow__pane");
      if (!isPane) return;

      const rf = rfInstanceRef.current;
      if (!rf) return;
      const pos = rf.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setCursor(pos);
      setIsTyping(true);
      onToast?.({ title: "Typing", message: "Enter to create node · Esc to cancel · Backspace to edit draft." });
    },
    [onToast]
  );

  const createNodeFromDraft = useCallback(() => {
    const { type, label } = parseNodeText(draft);
    if (!label) return;

    const id = makeId("node");
    const nextNode = {
      id,
      type: "retro",
      position: cursor,
      data: {
        label,
        nodeType: type,
        onChangeLabel: (nodeId, nextLabel) => {
          setFlow((prev) => ({
            ...prev,
            nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label: nextLabel } } : n))
          }));
        },
        onDelete: (nodeId) => {
          setFlow((prev) => ({
            ...prev,
            nodes: prev.nodes.filter((n) => n.id !== nodeId),
            edges: prev.edges.filter((e) => e.source !== nodeId && e.target !== nodeId)
          }));
          if (lastNodeId === nodeId) setLastNodeId(null);
        }
      }
    };

    setFlow((prev) => {
      const nextNodes = [...prev.nodes, nextNode];

      let nextEdges = prev.edges;
      if (lastNodeId) {
        const edgeId = makeId("edge");
        nextEdges = [
          ...prev.edges,
          {
            id: edgeId,
            source: lastNodeId,
            target: id,
            animated: true,
            style: { stroke: "#7ef4ff", strokeWidth: 2 },
            markerEnd: { type: "arrowclosed", color: "#7ef4ff" }
          }
        ];
      }

      return { ...prev, nodes: nextNodes, edges: nextEdges };
    });

    setLastNodeId(id);
    setDraft("");

    // advance cursor down a bit for rapid entry
    setCursor((prev) => ({ x: prev.x + 20, y: prev.y + 110 }));
  }, [cursor, draft, lastNodeId, setFlow]);

  const onKeyDown = useCallback(
    (e) => {
      // Undo/redo
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        history.redo();
        return;
      }

      // Export hotkeys
      if (mod && e.key.toLowerCase() === "e") {
        e.preventDefault();
        if (rfInstanceRef.current) exportAsPng(rfInstanceRef.current);
        return;
      }

      // Only typing behavior if user has activated typing by clicking pane.
      if (!isTyping) return;

      if (e.key === "Escape") {
        setDraft("");
        setIsTyping(false);
        onToast?.({ title: "Typing ended", message: "Click canvas to start typing again." });
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        createNodeFromDraft();
        return;
      }

      // Basic text entry (ignore non-character keys)
      if (e.key === "Backspace") {
        e.preventDefault();
        setDraft((prev) => prev.slice(0, -1));
        return;
      }

      if (e.key.length === 1 && !e.altKey) {
        // Prevent browser shortcuts from injecting weird chars
        setDraft((prev) => prev + e.key);
      }
    },
    [createNodeFromDraft, history, isTyping, onToast]
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  const handleClear = useCallback(() => {
    clearFlowchart();
    history.reset(EMPTY_FLOW);
    setDraft("");
    setIsTyping(false);
    setLastNodeId(null);
    onToast?.({ title: "Cleared", message: "Canvas and localStorage state cleared." });
  }, [history, onToast]);

  const handleExportJson = useCallback(() => {
    exportAsJson({ nodes, edges, viewport });
  }, [edges, nodes, viewport]);

  const handleExportPng = useCallback(async () => {
    if (!rfInstanceRef.current) return;
    await exportAsPng(rfInstanceRef.current);
  }, []);

  const handleFitView = useCallback(() => {
    rfInstanceRef.current?.fitView({ padding: 0.2, duration: 400 });
  }, []);

  return (
    <div className="canvasRoot" ref={wrapperRef}>
      <div className="hintOverlay" aria-hidden="true">
        <div className="hintTitle">Quick controls</div>
        <ul className="hintList">
          <li>Click empty canvas to start typing. Enter = node.</li>
          <li>Keywords: <code>decision:</code> <code>input:</code> <code>output:</code> <code>process:</code></li>
          <li>Undo/Redo: Ctrl/⌘+Z · Ctrl/⌘+Shift+Z (or Ctrl/⌘+Y)</li>
          <li>Export PNG: Ctrl/⌘+E</li>
          <li>Double-click node to edit.</li>
        </ul>
      </div>

      {/* Lightweight typing HUD */}
      {isTyping && (
        <div className="toast" role="status" aria-live="polite">
          <strong>Typing:</strong> {draft || <span style={{ opacity: 0.7 }}>(empty)</span>}
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        defaultViewport={viewport}
        onMoveEnd={updateViewport}
        onPaneClick={handlePaneClick}
        onInit={(instance) => {
          rfInstanceRef.current = instance;
          // Apply saved viewport if present
          if (viewport) instance.setViewport(viewport, { duration: 0 });
        }}
        fitView={nodes.length === 0}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="rgba(126, 244, 255, 0.12)" gap={48} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeColor={() => "#7ef4ff"} maskColor="rgba(11, 16, 32, 0.65)" />

        {/* Floating UI (React Flow children render above canvas) */}
        <div style={{ position: "absolute", top: 12, left: 12, zIndex: 6, display: "flex", gap: 8 }}>
          <button className="btn" onClick={handleFitView}>
            Fit
          </button>
          <button className="btn" onClick={() => setIsTyping(true)} title="Start typing without clicking">
            Type
          </button>
        </div>

        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 6, display: "flex", gap: 8 }}>
          <button className="btn" onClick={history.undo} disabled={!history.canUndo}>
            Undo
          </button>
          <button className="btn" onClick={history.redo} disabled={!history.canRedo}>
            Redo
          </button>
          <button className="btn btnPrimary" onClick={handleExportPng}>
            Export PNG
          </button>
          <button className="btn btnPrimary" onClick={handleExportJson}>
            Export JSON
          </button>
          <button className="btn btnDanger" onClick={handleClear}>
            Clear
          </button>
        </div>
      </ReactFlow>
    </div>
  );
}
