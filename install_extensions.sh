#!/bin/bash

echo "Installing Windsurf extensions from vscode-extensions.txt..."

# Read each line from the file and install the extension
while IFS= read -r extension; do
  # Skip empty lines
  if [[ -n "$extension" && "$extension" != "" ]]; then
    echo "Installing $extension..."
    windsurf --install-extension "$extension"
  fi
done < vscode-extensions.txt

echo "All extensions installation completed!"
