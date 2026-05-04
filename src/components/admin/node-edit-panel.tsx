"use client";

import type { StoryNodeData } from "@/lib/tree-utils";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface NodeEditPanelProps {
  node: StoryNodeData;
  allNodeIds: string[];
  onChange: (updated: StoryNodeData) => void;
  onDelete: () => void;
  onClose?: () => void;
}

export function NodeEditPanel({
  node,
  allNodeIds: _allNodeIds,
  onChange,
  onDelete,
  onClose,
}: NodeEditPanelProps) {
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...node, text: e.target.value });
  };

  const handleChoiceLabelChange = (index: number, label: string) => {
    const newChoices = [...node.choices];
    newChoices[index] = { ...newChoices[index], label };
    onChange({ ...node, choices: newChoices });
  };

  const handleRemoveChoice = (index: number) => {
    const newChoices = node.choices.filter((_, i) => i !== index);
    onChange({
      ...node,
      choices: newChoices,
      isEnding: newChoices.length === 0,
    });
  };

  const handleAddChoice = () => {
    const newChoices = [...node.choices, { label: "", next: "" }];
    onChange({ ...node, choices: newChoices, isEnding: false });
  };

  return (
    <div className="absolute right-2 top-2 bottom-2 z-20 flex w-80 flex-col rounded-xl border bg-card shadow-elevated">
      <div className="flex items-center justify-between gap-1 border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Edit Node</h3>
        {onClose && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            title="Close"
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <Label className="text-sm text-muted-foreground mb-1">Node ID</Label>
          <p className="text-sm font-mono">{node.nodeId}</p>
        </div>

        <div className="mb-4">
          <Label className="text-sm mb-1">Story Text</Label>
          <Textarea
            rows={6}
            value={node.text}
            onChange={handleTextChange}
            placeholder="Enter story text..."
          />
        </div>

        <Separator className="my-4" />

        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-2">Choices</h4>

          {node.choices.length === 0 && (
            <p className="text-xs text-muted-foreground mb-2">
              No choices (ending node). Add a choice to connect to another node.
            </p>
          )}

          <div className="flex flex-col gap-3">
            {node.choices.map((choice, index) => (
              <div key={index} className="rounded-lg border p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {choice.label || `Choice ${index + 1}`}
                    {choice.next && (
                      <span className="font-mono text-[10px] ml-1 opacity-60">
                        → {choice.next}
                      </span>
                    )}
                  </span>
                  <Button
                    variant="destructive"
                    size="xs"
                    onClick={() => handleRemoveChoice(index)}
                  >
                    Remove
                  </Button>
                </div>
                <Input
                  value={choice.label}
                  onChange={(e) =>
                    handleChoiceLabelChange(index, e.target.value)
                  }
                  placeholder="Choice label"
                />
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddChoice}
            className="mt-2 w-full"
          >
            Add Choice
          </Button>
        </div>

        <Separator className="my-4" />

        <Button
          variant="destructive"
          className="w-full"
          disabled={node.nodeId === "start"}
          onClick={onDelete}
        >
          Delete Node
        </Button>
        {node.nodeId === "start" && (
          <p className="text-xs text-muted-foreground mt-1">
            The start node cannot be deleted.
          </p>
        )}
      </div>
    </div>
  );
}
