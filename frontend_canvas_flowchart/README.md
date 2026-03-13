# Retro Flowchart Creator (React + React Flow)

A retro-themed, tool-free flowchart creator:

- Click on the canvas and start typing
- Press **Enter** to convert your input into a node at that location
- New nodes **auto-connect** from the previously created node
- Supports pan/zoom, dragging, inline editing, undo/redo, export, and autosave

## How to use

### Create nodes by typing
1. Click an empty area of the canvas
2. Type text
3. Press **Enter** to create a node

### Node types via keywords
Prefix your text with:

- `process: Do something` (default if no keyword)
- `decision: Should we proceed?`
- `input: Collect user email`
- `output: Show confirmation`

You can also start with `if ...` as a shortcut for decision nodes.

### Editing nodes
- **Double-click** a node to edit its text
- In the editor:
  - **Ctrl/⌘ + Enter**: save
  - **Esc**: cancel

### Undo / Redo
- Undo: **Ctrl/⌘ + Z**
- Redo: **Ctrl/⌘ + Shift + Z** or **Ctrl/⌘ + Y**

### Export
- Export PNG (also hotkey): **Ctrl/⌘ + E**
- Export JSON: available in the top-right export buttons

### Persistence
The flowchart automatically saves to `localStorage` and restores on refresh.

## Development

```bash
npm start
```
