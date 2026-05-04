"use client";

import type { StoryNodeData } from "@/lib/tree-utils";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NodeEditPanelProps {
  node: StoryNodeData;
  allNodeIds: string[];
  onChange: (updated: StoryNodeData) => void;
  onDelete: () => void;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

interface NodeEditPanelBodyProps {
  node: StoryNodeData;
  onChange: (updated: StoryNodeData) => void;
  onDelete: () => void;
  fullscreen: boolean;
}

function NodeEditPanelBody({
  node,
  onChange,
  onDelete,
  fullscreen,
}: NodeEditPanelBodyProps) {
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
    <>
      {/* Node ID (read-only) */}
      <div className="mb-4">
        <Label className="text-sm text-muted-foreground mb-1">Node ID</Label>
        <p className={cn("font-mono", fullscreen ? "text-base" : "text-sm")}>
          {node.nodeId}
        </p>
      </div>

      {/* Story text */}
      <div className="mb-4">
        <Label className="text-sm mb-1">Story Text</Label>
        <Textarea
          rows={fullscreen ? 18 : 5}
          value={node.text}
          onChange={handleTextChange}
          placeholder="Enter story text..."
          className={cn(fullscreen && "min-h-[60vh] text-base")}
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

        <div
          className={cn(
            "flex flex-col gap-3",
            fullscreen && "md:grid md:grid-cols-2"
          )}
        >
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
    </>
  );
}

export function NodeEditPanel({
  node,
  allNodeIds: _allNodeIds,
  onChange,
  onDelete,
  fullscreen = false,
  onToggleFullscreen,
}: NodeEditPanelProps) {
  if (fullscreen) {
    return (
      <Dialog
        open
        onOpenChange={(next) => {
          if (!next) onToggleFullscreen?.();
        }}
      >
        <DialogContent
          className="!max-w-4xl"
          showCloseButton={false}
        >
          <DialogHeader className="flex flex-row items-center justify-between gap-2">
            <div className="flex flex-col gap-1">
              <DialogTitle>Edit Node</DialogTitle>
              <DialogDescription>
                Editing in fullscreen — press Esc or the minimize button to return.
              </DialogDescription>
            </div>
            {onToggleFullscreen && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onToggleFullscreen}
                title="Exit fullscreen"
              >
                <Minimize2 className="size-4" />
                <span className="sr-only">Exit fullscreen</span>
              </Button>
            )}
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto">
            <NodeEditPanelBody
              node={node}
              onChange={onChange}
              onDelete={onDelete}
              fullscreen
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="w-80 border-l bg-card p-4 overflow-y-auto">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Edit Node</h3>
        {onToggleFullscreen && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleFullscreen}
            title="Fullscreen"
          >
            <Maximize2 className="size-4" />
            <span className="sr-only">Fullscreen</span>
          </Button>
        )}
      </div>
      <NodeEditPanelBody
        node={node}
        onChange={onChange}
        onDelete={onDelete}
        fullscreen={false}
      />
    </div>
  );
}
