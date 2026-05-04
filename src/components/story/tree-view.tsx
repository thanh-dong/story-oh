"use client";

import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  MiniMap,
  Background,
  Controls,
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
  computeVisibleNodeIds,
} from "@/lib/tree-utils";
import { StoryNodeComponent } from "@/components/admin/story-node";
import { NodeEditPanel } from "@/components/admin/node-edit-panel";
import { Button } from "@/components/ui/button";

const nodeTypes = { storyNode: StoryNodeComponent };

export interface TreeViewProps {
  value: StoryTree;
  onChange?: (tree: StoryTree) => void;
  mode?: "edit" | "preview";
  height?: string;
}

type EditorSnapshot = {
  nodes: Node<StoryNodeData>[];
  edges: Edge[];
};

const MAX_HISTORY = 50;

function TreeViewInner({
  value,
  onChange,
  mode = "edit",
  height = "720px",
}: TreeViewProps) {
  const editable = mode === "edit";
  const { fitView, screenToFlowPosition } = useReactFlow();

  const initialFlow = useRef(storyTreeToFlow(value));
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialFlow.current.nodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialFlow.current.edges
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [panelFullscreen, setPanelFullscreen] = useState(false);

  const isInternalUpdate = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [history, setHistory] = useState<EditorSnapshot[]>([]);
  const [future, setFuture] = useState<EditorSnapshot[]>([]);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  const commitHistory = useCallback(() => {
    if (!editable) return;
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
  }, [editable]);

  const undo = useCallback(() => {
    if (!editable) return;
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
  }, [editable, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (!editable) return;
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
  }, [editable, setNodes, setEdges]);

  useEffect(() => {
    if (!editable) return;
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
  }, [editable, undo, redo]);

  // Sync back to parent (edit mode only)
  useEffect(() => {
    if (!editable || !onChange) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      const tree = flowToStoryTree(nodes as Node<StoryNodeData>[], edges);
      onChange(tree);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [editable, nodes, edges, onChange]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!editable) return;
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const sourceData = sourceNode?.data as StoryNodeData | undefined;
      const choiceIndex = parseInt(
        connection.sourceHandle?.replace("choice-", "") ?? "0"
      );
      const choiceLabel = sourceData?.choices[choiceIndex]?.label || "Continue";

      commitHistory();
      setEdges((eds) =>
        addEdge({ ...connection, label: choiceLabel, type: "default" }, eds)
      );
    },
    [editable, setEdges, nodes, commitHistory]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setPanelFullscreen(false);
  }, []);

  const handleAddNode = useCallback(() => {
    if (!editable) return;
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
  }, [editable, screenToFlowPosition, setNodes, commitHistory]);

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

  const toggleCollapse = useCallback(
    (nodeId: string) => {
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(nodeId)) next.delete(nodeId);
        else next.add(nodeId);
        return next;
      });
      setTimeout(() => fitView({ padding: 0.2 }), 60);
    },
    [fitView]
  );

  // Compute visibility from current nodes/edges + collapsed set.
  const tree: StoryTree = useMemo(
    () => flowToStoryTree(nodes as Node<StoryNodeData>[], edges),
    [nodes, edges]
  );
  const visibleIds = useMemo(
    () => computeVisibleNodeIds(tree, collapsed),
    [tree, collapsed]
  );

  // Augment nodes with collapse metadata, then filter by visibility.
  const displayNodes = useMemo(() => {
    return (nodes as Node<StoryNodeData>[])
      .filter((n) => visibleIds.has(n.id))
      .map((n) => {
        const isCollapsed = collapsed.has(n.id);
        let hidden = 0;
        if (isCollapsed) {
          for (const choice of n.data.choices) {
            if (choice.next && !visibleIds.has(choice.next)) hidden++;
          }
        }
        return {
          ...n,
          data: {
            ...n.data,
            collapsed: isCollapsed,
            hiddenChildCount: hidden,
            onToggleCollapse: () => toggleCollapse(n.id),
          } as StoryNodeData,
        };
      });
  }, [nodes, visibleIds, collapsed, toggleCollapse]);

  const displayEdges = useMemo(
    () =>
      edges.filter(
        (e) => visibleIds.has(e.source) && visibleIds.has(e.target)
      ),
    [edges, visibleIds]
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedNodeData = selectedNode?.data as StoryNodeData | undefined;
  const allNodeIds = nodes.map((n) => n.id);

  const handleNodeEditChange = useCallback(
    (updated: StoryNodeData) => {
      if (!editable) return;
      commitHistory();
      setNodes((nds) =>
        nds.map((n) => (n.id === selectedNodeId ? { ...n, data: updated } : n))
      );

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
    [editable, selectedNodeId, setNodes, setEdges, commitHistory]
  );

  const handleNodeDelete = useCallback(() => {
    if (!editable || !selectedNodeId || selectedNodeId === "start") return;

    commitHistory();
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) =>
      eds.filter(
        (e) => e.source !== selectedNodeId && e.target !== selectedNodeId
      )
    );
    setSelectedNodeId(null);
  }, [editable, selectedNodeId, setNodes, setEdges, commitHistory]);

  const minimapNodeColor = useCallback((node: Node) => {
    const data = node.data as StoryNodeData | undefined;
    return data?.branchColor ?? "#94a3b8";
  }, []);

  return (
    <div className="flex flex-col gap-2">
      {editable && (
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
          {collapsed.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCollapsed(new Set());
                setTimeout(() => fitView({ padding: 0.2 }), 60);
              }}
            >
              Expand all ({collapsed.size})
            </Button>
          )}
        </div>
      )}

      <div className="relative w-full rounded-xl border" style={{ height }}>
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          onNodesChange={editable ? onNodesChange : undefined}
          onEdgesChange={editable ? onEdgesChange : undefined}
          onConnect={editable ? onConnect : undefined}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          nodesDraggable={editable}
          nodesConnectable={editable}
          elementsSelectable
          fitView
          minZoom={0.1}
        >
          <Background gap={24} />
          <Controls showInteractive={false} position="bottom-left" />
          <MiniMap
            nodeColor={minimapNodeColor}
            pannable
            zoomable
            position="bottom-right"
            className="!bg-card"
            style={{ width: 140, height: 90 }}
          />
        </ReactFlow>

        {editable && selectedNodeData && (
          <NodeEditPanel
            node={selectedNodeData}
            allNodeIds={allNodeIds}
            onChange={handleNodeEditChange}
            onDelete={handleNodeDelete}
            onClose={() => setSelectedNodeId(null)}
            fullscreen={panelFullscreen}
            onToggleFullscreen={() => {
              setPanelFullscreen((v) => !v);
              setTimeout(() => fitView({ padding: 0.2 }), 80);
            }}
          />
        )}
      </div>
    </div>
  );
}

export function TreeView(props: TreeViewProps) {
  return (
    <ReactFlowProvider>
      <TreeViewInner {...props} />
    </ReactFlowProvider>
  );
}
