"use client";

import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
} from "@xyflow/react";
import type { StoryTree } from "@/lib/types";
import type { StoryNodeData } from "@/lib/tree-utils";
import {
  storyTreeToFlow,
  flowToStoryTree,
  autoLayout,
  generateNodeId,
} from "@/lib/tree-utils";
import { StoryNodeComponent } from "./story-node";
import { NodeEditPanel } from "./node-edit-panel";
import { Button } from "@/components/ui/button";

const nodeTypes = { storyNode: StoryNodeComponent };

interface TreeEditorProps {
  value: StoryTree;
  onChange: (tree: StoryTree) => void;
}

type EditorSnapshot = {
  nodes: Node<StoryNodeData>[];
  edges: Edge[];
};

const MAX_HISTORY = 50;

function TreeEditorInner({ value, onChange }: TreeEditorProps) {
  const { fitView, screenToFlowPosition } = useReactFlow();

  const initialFlow = useRef(storyTreeToFlow(value));
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialFlow.current.nodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialFlow.current.edges
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Track whether changes are from internal updates to avoid infinite loops
  const isInternalUpdate = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Undo / redo history (in-session only, ephemeral on reload).
  const [history, setHistory] = useState<EditorSnapshot[]>([]);
  const [future, setFuture] = useState<EditorSnapshot[]>([]);

  // Keep latest nodes/edges in refs so undo/redo callbacks can read fresh state
  // without re-binding on every render.
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  const commitHistory = useCallback(() => {
    setHistory((h) => {
      const next = [
        ...h,
        {
          nodes: nodesRef.current as Node<StoryNodeData>[],
          edges: edgesRef.current,
        },
      ];
      return next.length > MAX_HISTORY
        ? next.slice(next.length - MAX_HISTORY)
        : next;
    });
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [
        ...f,
        {
          nodes: nodesRef.current as Node<StoryNodeData>[],
          edges: edgesRef.current,
        },
      ]);
      setNodes(prev.nodes);
      setEdges(prev.edges);
      setSelectedNodeId(null);
      return h.slice(0, -1);
    });
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[f.length - 1];
      setHistory((h) => {
        const updated = [
          ...h,
          {
            nodes: nodesRef.current as Node<StoryNodeData>[],
            edges: edgesRef.current,
          },
        ];
        return updated.length > MAX_HISTORY
          ? updated.slice(updated.length - MAX_HISTORY)
          : updated;
      });
      setNodes(next.nodes);
      setEdges(next.edges);
      setSelectedNodeId(null);
      return f.slice(0, -1);
    });
  }, [setNodes, setEdges]);

  // Keyboard shortcuts: Cmd/Ctrl+Z = undo, Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y = redo.
  // Skip when focus is in a text input so native text-undo still works.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      const cmd = e.metaKey || e.ctrlKey;
      if (!cmd) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  // Sync back to parent with debounce
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      const tree = flowToStoryTree(
        nodes as Node<StoryNodeData>[],
        edges
      );
      onChange(tree);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [nodes, edges, onChange]);

  const onConnect = useCallback(
    (connection: Connection) => {
      // Look up the actual choice label from the source node's data
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const sourceData = sourceNode?.data as StoryNodeData | undefined;
      const choiceIndex = parseInt(
        connection.sourceHandle?.replace("choice-", "") ?? "0"
      );
      const choiceLabel = sourceData?.choices[choiceIndex]?.label || "Continue";

      commitHistory();
      setEdges((eds) =>
        addEdge({ ...connection, label: choiceLabel, type: "smoothstep" }, eds)
      );
    },
    [setEdges, nodes, commitHistory]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
    },
    []
  );

  const handleAddNode = useCallback(() => {
    const newId = generateNodeId();
    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

    const newNode: Node<StoryNodeData> = {
      id: newId,
      type: "storyNode",
      position,
      data: {
        nodeId: newId,
        text: "New story node...",
        choices: [],
        isStart: false,
        isEnding: true,
      },
    };

    commitHistory();
    setNodes((nds) => [...nds, newNode]);
  }, [screenToFlowPosition, setNodes, commitHistory]);

  const handleAutoLayout = useCallback(() => {
    const laid = autoLayout(nodes, edges);
    commitHistory();
    isInternalUpdate.current = true;
    setNodes(laid.nodes as Node<StoryNodeData>[]);
    setEdges(laid.edges);
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [nodes, edges, setNodes, setEdges, fitView, commitHistory]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2 });
  }, [fitView]);

  // Find the selected node data
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedNodeData = selectedNode?.data as StoryNodeData | undefined;
  const allNodeIds = nodes.map((n) => n.id);

  const handleNodeEditChange = useCallback(
    (updated: StoryNodeData) => {
      commitHistory();
      setNodes((nds) =>
        nds.map((n) =>
          n.id === selectedNodeId
            ? { ...n, data: updated }
            : n
        )
      );

      // Also update edge labels if choice labels changed
      setEdges((eds) =>
        eds.map((e) => {
          if (e.source === selectedNodeId && e.sourceHandle) {
            const choiceIndex = parseInt(
              e.sourceHandle.replace("choice-", "")
            );
            const choice = updated.choices[choiceIndex];
            if (choice) {
              return { ...e, label: choice.label || "Continue" };
            }
          }
          return e;
        })
      );
    },
    [selectedNodeId, setNodes, setEdges, commitHistory]
  );

  const handleNodeDelete = useCallback(() => {
    if (!selectedNodeId || selectedNodeId === "start") return;

    commitHistory();
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) =>
      eds.filter(
        (e) => e.source !== selectedNodeId && e.target !== selectedNodeId
      )
    );
    setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setEdges, commitHistory]);

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleAddNode}>
          Add Node
        </Button>
        <Button variant="outline" size="sm" onClick={handleAutoLayout}>
          Auto Layout
        </Button>
        <Button variant="outline" size="sm" onClick={handleFitView}>
          Fit View
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={undo}
          disabled={history.length === 0}
          title="Undo (Cmd/Ctrl+Z)"
        >
          Undo
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={redo}
          disabled={future.length === 0}
          title="Redo (Cmd/Ctrl+Shift+Z)"
        >
          Redo
        </Button>
      </div>

      {/* Canvas + Edit Panel */}
      <div className="flex flex-row">
        <div className="h-[600px] flex-1 rounded-xl border">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
          />
        </div>

        {selectedNodeData && (
          <NodeEditPanel
            node={selectedNodeData}
            allNodeIds={allNodeIds}
            onChange={handleNodeEditChange}
            onDelete={handleNodeDelete}
          />
        )}
      </div>
    </div>
  );
}

export function TreeEditor({ value, onChange }: TreeEditorProps) {
  return (
    <ReactFlowProvider>
      <TreeEditorInner value={value} onChange={onChange} />
    </ReactFlowProvider>
  );
}
