/**
 * Lightweight localStorage persistence helpers.
 * We keep this isolated so the rest of the app doesn't directly depend on storage details.
 */

const STORAGE_KEY = "retroflowchart:v1";

/**
 * PUBLIC_INTERFACE
 * Load a previously saved flowchart from localStorage.
 * @returns {{nodes: import('reactflow').Node[], edges: import('reactflow').Edge[], viewport?: {x:number,y:number,zoom:number}} | null}
 */
export function loadFlowchart() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * PUBLIC_INTERFACE
 * Save the flowchart to localStorage.
 * @param {{nodes: import('reactflow').Node[], edges: import('reactflow').Edge[], viewport?: {x:number,y:number,zoom:number}}} data
 * @returns {boolean} true if saved successfully
 */
export function saveFlowchart(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/**
 * PUBLIC_INTERFACE
 * Clear any stored flowchart.
 */
export function clearFlowchart() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
