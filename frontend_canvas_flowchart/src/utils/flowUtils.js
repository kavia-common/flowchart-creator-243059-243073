import { getRectOfNodes, getTransformForBounds } from "reactflow";

/**
 * Node type parsing is keyword-based, e.g.:
 *  - "decision: Is user logged in?"
 *  - "input: username"
 *  - "output: show dashboard"
 *  - "process: validate token" (default)
 */

const TYPE_ALIASES = {
  decision: "decision",
  decide: "decision",
  if: "decision",
  input: "input",
  in: "input",
  output: "output",
  out: "output",
  process: "process",
  step: "process"
};

/**
 * PUBLIC_INTERFACE
 * Parse free-typed text into a node type + cleaned label.
 * @param {string} raw
 * @returns {{type: "process" | "decision" | "input" | "output", label: string}}
 */
export function parseNodeText(raw) {
  const text = (raw ?? "").trim();
  if (!text) return { type: "process", label: "" };

  const match = text.match(/^(\w+)\s*:\s*(.*)$/);
  if (match) {
    const key = match[1].toLowerCase();
    const type = TYPE_ALIASES[key] ?? "process";
    const label = (match[2] ?? "").trim();
    return { type, label: label || text };
  }

  // Also allow leading keywords like "if " or "decision "
  const firstWord = text.split(/\s+/)[0]?.toLowerCase();
  if (TYPE_ALIASES[firstWord]) {
    const rest = text.substring(firstWord.length).trim();
    return { type: TYPE_ALIASES[firstWord], label: rest || text };
  }

  return { type: "process", label: text };
}

/**
 * PUBLIC_INTERFACE
 * Download a string as a file.
 * @param {string} filename
 * @param {string} contents
 * @param {string} mime
 */
export function downloadTextFile(filename, contents, mime = "application/json") {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * PUBLIC_INTERFACE
 * Export the current flow as JSON.
 * @param {{nodes:any[], edges:any[], viewport?: any}} flow
 */
export function exportAsJson(flow) {
  const payload = JSON.stringify(flow, null, 2);
  downloadTextFile("flowchart.json", payload, "application/json");
}

/**
 * PUBLIC_INTERFACE
 * Export the current flow as a PNG by rendering the React Flow viewport to a data URL.
 * Note: This uses SVG foreignObject technique by cloning the viewport into an SVG.
 * @param {import('reactflow').ReactFlowInstance} rfInstance
 */
export async function exportAsPng(rfInstance) {
  const nodes = rfInstance.getNodes();
  if (!nodes.length) return;

  const bounds = getRectOfNodes(nodes);
  const width = Math.max(600, bounds.width + 240);
  const height = Math.max(400, bounds.height + 240);

  const transform = getTransformForBounds(bounds, width, height, 0.2, 2);

  const viewportEl = document.querySelector(".react-flow__viewport");
  if (!viewportEl) return;

  const cloned = viewportEl.cloneNode(true);
  // Apply a transform so the exported image fits bounds.
  cloned.setAttribute("transform", `translate(${transform[0]},${transform[1]}) scale(${transform[2]})`);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.style.background =
    "radial-gradient(900px 500px at 20% 10%, rgba(255,79,216,0.16), transparent 60%), radial-gradient(900px 500px at 80% 30%, rgba(126,244,255,0.14), transparent 60%), linear-gradient(180deg, #070a14 0%, #0b1020 60%, #070a14 100%)";

  const foreign = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
  foreign.setAttribute("x", "0");
  foreign.setAttribute("y", "0");
  foreign.setAttribute("width", "100%");
  foreign.setAttribute("height", "100%");

  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.style.width = `${width}px`;
  wrapper.style.height = `${height}px`;
  wrapper.appendChild(cloned);

  foreign.appendChild(wrapper);
  svg.appendChild(foreign);

  const svgString = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.crossOrigin = "anonymous";

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);

  const pngUrl = canvas.toDataURL("image/png");

  const a = document.createElement("a");
  a.href = pngUrl;
  a.download = "flowchart.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
