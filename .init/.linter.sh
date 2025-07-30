#!/bin/bash
cd /home/kavia/workspace/code-generation/virtual-chess-platform-7559-7595/chess_board_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

