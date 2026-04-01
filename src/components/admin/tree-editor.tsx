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

      setEdges((eds) =>
        addEdge({ ...connection, label: choiceLabel, type: "smoothstep" }, eds)
      );
    },
    [setEdges, nodes]
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

    setNodes((nds) => [...nds, newNode]);
  }, [screenToFlowPosition, setNodes]);

  const handleAutoLayout = useCallback(() => {
    const laid = autoLayout(nodes, edges);
    isInternalUpdate.current = true;
    setNodes(laid.nodes as Node<StoryNodeData>[]);
    setEdges(laid.edges);
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [nodes, edges, setNodes, setEdges, fitView]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2 });
  }, [fitView]);

  // Find the selected node data
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedNodeData = selectedNode?.data as StoryNodeData | undefined;
  const allNodeIds = nodes.map((n) => n.id);

  const handleNodeEditChange = useCallback(
    (updated: StoryNodeData) => {
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
    [selectedNodeId, setNodes, setEdges]
  );

  const handleNodeDelete = useCallback(() => {
    if (!selectedNodeId || selectedNodeId === "start") return;

    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) =>
      eds.filter(
        (e) => e.source !== selectedNodeId && e.target !== selectedNodeId
      )
    );
    setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setEdges]);

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
