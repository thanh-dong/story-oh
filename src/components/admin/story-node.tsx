"use client";

import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { StoryNodeData } from "@/lib/tree-utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StoryNodeComponent({
  data,
  selected,
}: NodeProps & { data: StoryNodeData }) {
  const truncatedText =
    data.text.length > 80 ? data.text.slice(0, 80) + "..." : data.text;

  return (
    <div
      className={cn(
        "w-[280px] rounded-xl border bg-card shadow-sm",
        selected && "ring-2 ring-primary"
      )}
    >
      {/* Target handle (incoming connections) */}
      <Handle type="target" position={Position.Top} />

      <div className="p-3">
        {/* Node ID and badges */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">
            {data.nodeId}
          </span>
          {data.isStart && (
            <Badge className="bg-green-600 text-white text-[10px] px-1.5 py-0">
              START
            </Badge>
          )}
          {data.isEnding && (
            <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">
              END
            </Badge>
          )}
        </div>

        {/* Story text preview */}
        <p className="text-sm text-foreground">{truncatedText}</p>

        {/* Choice buttons with handles */}
        {data.choices.length > 0 && (
          <div className="mt-3 flex flex-col gap-1">
            {data.choices.map((choice, index) => (
              <div
                key={index}
                className="relative flex items-center rounded-md bg-muted/50 px-2 py-1"
              >
                <span className="text-[11px] font-medium text-muted-foreground truncate flex-1">
                  {choice.label || `Choice ${index + 1}`}
                </span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`choice-${index}`}
                  className="!relative !top-0 !right-0 !left-auto !translate-y-0 !translate-x-0"
                  style={{ position: "relative" }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fallback handle for ending nodes */}
      {data.choices.length === 0 && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="choice-0"
          style={{ opacity: 0.3 }}
        />
      )}
    </div>
  );
}
