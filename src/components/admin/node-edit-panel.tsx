"use client";

import type { StoryNodeData } from "@/lib/tree-utils";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

interface NodeEditPanelProps {
  node: StoryNodeData;
  allNodeIds: string[];
  onChange: (updated: StoryNodeData) => void;
  onDelete: () => void;
}

export function NodeEditPanel({
  node,
  allNodeIds: _allNodeIds,
  onChange,
  onDelete,
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
    <div className="w-80 border-l bg-card p-4 overflow-y-auto">
      <h3 className="text-sm font-semibold mb-4">Edit Node</h3>

      {/* Node ID (read-only) */}
      <div className="mb-4">
        <Label className="text-sm text-muted-foreground mb-1">Node ID</Label>
        <p className="text-sm font-mono">{node.nodeId}</p>
      </div>

      {/* Story text */}
      <div className="mb-4">
        <Label className="text-sm mb-1">Story Text</Label>
        <Textarea
          rows={5}
          value={node.text}
          onChange={handleTextChange}
          placeholder="Enter story text..."
        />
      </div>

      <Separator className="my-4" />

      {/* Choices section */}
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
                <span className="text-xs text-muted-foreground">
                  Choice {index + 1}
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
                className="mb-1"
              />
              {choice.next && (
                <p className="text-xs text-muted-foreground">
                  Target: <span className="font-mono">{choice.next}</span>
                </p>
              )}
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

      {/* Delete node */}
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
  );
}
