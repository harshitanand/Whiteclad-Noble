#!/bin/bash

# Export VS Code extensions
echo "Exporting VS Code extensions..."

# Try different possible VS Code command locations
if command -v code &> /dev/null; then
    echo "Using 'code' command"
    code --list-extensions --show-versions > vscode-extensions.txt
elif command -v code-insiders &> /dev/null; then
    echo "Using 'code-insiders' command"
    code-insiders --list-extensions --show-versions > vscode-extensions.txt
elif [ -f "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" ]; then
    echo "Using VS Code from Applications folder"
    "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" --list-extensions --show-versions > vscode-extensions.txt
else
    echo "VS Code command not found. Please ensure VS Code is installed and added to PATH."
    echo "You can manually add VS Code to PATH by running:"
    echo "export PATH=\"\$PATH:/Applications/Visual Studio Code.app/Contents/Resources/app/bin\""
    exit 1
fi

echo "Extensions exported to vscode-extensions.txt"
echo "To install these extensions on another machine, run:"
echo "cat vscode-extensions.txt | xargs -n 1 code --install-extension"
