#!/bin/bash
cd ~/dev/apps/dhyaan

# Ensure build artifacts are in .gitignore
GITIGNORE=".gitignore"
entries=("*.ipa" "*.aab" "*.apk" "build-*.ipa" "build-*.aab" "credentials/" "credentials.json" "node_modules/")
for entry in "${entries[@]}"; do
  if ! grep -qF "$entry" "$GITIGNORE" 2>/dev/null; then
    echo "$entry" >> "$GITIGNORE"
    echo "➕ Added $entry to .gitignore"
  fi
done

echo "💾 Saving your work..."
git add .
echo ""
read -p "Commit message (what did you change?): " msg
git commit -m "$msg"
git push
echo "✅ All pushed to GitHub!"
