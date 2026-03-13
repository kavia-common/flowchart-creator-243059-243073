import React, { useMemo, useState } from "react";
import { Handle, Position } from "reactflow";

/**
 * Custom node renderer with inline editing.
 * Data contract:
 *  - data.label: string
 *  - data.nodeType: "process" | "decision" | "input" | "output"
 *  - data.onChangeLabel: (id, nextLabel) => void
 *  - data.onDelete: (id) => void
 */

// PUBLIC_INTERFACE
export default function RetroNode({ id, data, selected }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(data?.label ?? "");

  const nodeType = data?.nodeType ?? "process";

  const headerLabel = useMemo(() => {
    switch (nodeType) {
      case "decision":
        return "DECISION";
      case "input":
        return "INPUT";
      case "output":
        return "OUTPUT";
      default:
        return "PROCESS";
    }
  }, [nodeType]);

  const commit = () => {
    const next = (draft ?? "").trim();
    if (!next) {
      setDraft(data?.label ?? "");
      setIsEditing(false);
      return;
    }
    data?.onChangeLabel?.(id, next);
    setIsEditing(false);
  };

  const cancel = () => {
    setDraft(data?.label ?? "");
    setIsEditing(false);
  };

  return (
    <div
      className={[
        "nodeCard",
        nodeType === "process" ? "nodeTypeProcess" : "",
        nodeType === "decision" ? "nodeTypeDecision" : "",
        nodeType === "input" ? "nodeTypeInput" : "",
        nodeType === "output" ? "nodeTypeOutput" : "",
        selected ? "selected" : ""
      ].join(" ")}
      role="group"
      aria-label={`Flow node ${headerLabel}`}
      onDoubleClick={() => setIsEditing(true)}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div className="nodeHeader">
        <span className="nodeBadge">
          <span className="nodeDot" aria-hidden="true" />
          <span>{headerLabel}</span>
        </span>
        <span style={{ opacity: 0.8 }}>{isEditing ? "EDIT" : "DBL-CLICK"}</span>
      </div>

      <div className="nodeBody">
        {!isEditing ? (
          <div className="nodeText">{data?.label ?? ""}</div>
        ) : (
          <textarea
            className="nodeEditor"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") commit();
              if (e.key === "Escape") cancel();
            }}
            autoFocus
            aria-label="Edit node text"
          />
        )}
      </div>

      {isEditing && (
        <div className="nodeActions">
          <button className="nodeBtn" onClick={commit} title="Ctrl/⌘ + Enter">
            Save
          </button>
          <button className="nodeBtn" onClick={cancel} title="Esc">
            Cancel
          </button>
          <button className="nodeBtn nodeBtnDanger" onClick={() => data?.onDelete?.(id)}>
            Delete
          </button>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}
