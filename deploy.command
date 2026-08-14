#!/bin/bash
set -e
cd "$(dirname "$0")"

git config user.name "Pin"
git config user.email "ccpin777@hotmail.com"
git branch -M main

echo "Adding LabFlow changes..."
git add -A
if git diff --cached --quiet; then
  echo "No new file changes to commit."
else
  git commit -m "Update LabFlow"
fi

echo "Pushing to GitHub..."
git push -u origin main
echo
read -r -p "Deployment finished. Press Enter to close."
