# Export VS Code Extensions

## Method 1: Using Command Line

If VS Code is in your PATH, run:
```bash
code --list-extensions --show-versions > vscode-extensions.txt
```

If VS Code is not in PATH, try:
```bash
"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" --list-extensions --show-versions > vscode-extensions.txt
```

## Method 2: Add VS Code to PATH (if needed)

Add this to your `~/.zshrc` or `~/.bash_profile`:
```bash
export PATH="$PATH:/Applications/Visual Studio Code.app/Contents/Resources/app/bin"
```

Then reload your shell:
```bash
source ~/.zshrc
```

## Method 3: Manual Export via VS Code

1. Open VS Code
2. Press `Cmd+Shift+P` to open Command Palette
3. Type "Extensions: Show Installed Extensions"
4. Copy the list manually

## Install Extensions on Another Machine

Once you have the extensions list in `vscode-extensions.txt`, install them with:
```bash
cat vscode-extensions.txt | xargs -n 1 code --install-extension
```

Or install individual extensions:
```bash
code --install-extension extension-name@version
```

## Common Useful Extensions for Your Project

Based on your Node.js/JavaScript project, here are recommended extensions:

```
ms-vscode.vscode-json
ms-vscode.vscode-typescript-next
esbenp.prettier-vscode
ms-vscode.vscode-eslint
bradlc.vscode-tailwindcss
ms-vscode.vscode-node-debug2
formulahendry.auto-rename-tag
christian-kohler.path-intellisense
ms-vscode.vscode-npm-script
ms-vscode.vscode-github-actions
```

To install these recommended extensions:
```bash
code --install-extension ms-vscode.vscode-json
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-eslint
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-node-debug2
code --install-extension formulahendry.auto-rename-tag
code --install-extension christian-kohler.path-intellisense
code --install-extension ms-vscode.vscode-npm-script
code --install-extension ms-vscode.vscode-github-actions
```
