#!/bin/bash
set -e
trap 'echo; read -r -p "Deployment failed. Press Enter to close."' ERR
cd "$(dirname "$0")/.."

git config user.name "Pin"
git config user.email "ccpin777@hotmail.com"
git branch -M main

read -r -p "What did you change? " CHANGE_NOTE
CHANGE_NOTE=${CHANGE_NOTE:-Update LabFlow}

CACHE_VERSION=$(date +%s)
perl -pi -e "s/\?v=[A-Za-z0-9._-]+/?v=$CACHE_VERSION/g" index.html

echo "Adding LabFlow changes..."
git add -A
if git diff --cached --quiet; then
  echo "No new file changes to commit."
else
  git commit -m "$CHANGE_NOTE"
fi

echo "Pushing to GitHub..."
git push -u origin main
echo
read -r -p "Deployment finished. Press Enter to close."
