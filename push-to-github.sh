#!/bin/bash
# Run this in Cursor's terminal so it uses your GitHub login.
# In Cursor: Terminal → New Terminal, then:  bash push-to-github.sh
# (Using Cursor's terminal keeps the window open so you can see the result.)

set -e
cd "$(dirname "$0")"
echo "Pushing to GitHub..."
if git push -u origin main; then
  echo "Done. Check your repo on github.com"
else
  echo "Push failed (e.g. need to log in). See message above."
fi
echo "Press Enter to close..."
read -r
