#!/bin/bash
cd /home/kavia/workspace/code-generation/flowchart-creator-243059-243073/frontend_canvas_flowchart
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

