import * as vscode from 'vscode';
import { PreviewPanel } from './previewPanel';
import { PreviewFinder } from './previewFinder';
import { PreviewManager } from './previewManager';
import { ComponentTreeProvider } from './componentTree';
import { registerExplorerTrigger } from './explorerTrigger';
import { registerCodeTrigger } from './codeTrigger';

/**
 * Extension entry point.
 *
 * Creates the core services, registers the webview panel, component tree,
 * triggers, and pushes all disposables into the extension context.
 */
export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel('Component Preview');
  outputChannel.appendLine('Component Preview extension activated.');

  // ---- Core services ----
  const previewFinder = new PreviewFinder();
  const previewPanel = new PreviewPanel(context.extensionUri);
  const previewManager = new PreviewManager(previewFinder, previewPanel);

  // ---- Register webview view provider (preview image panel) ----
  const panelRegistration = vscode.window.registerWebviewViewProvider(
    PreviewPanel.viewType,
    previewPanel,
  );

  // ---- Register component tree (file list with eye buttons) ----
  const componentTree = new ComponentTreeProvider(previewFinder);
  const treeRegistration = vscode.window.createTreeView(
    'componentPreview.componentTree',
    {
      treeDataProvider: componentTree,
      showCollapseAll: false,
    },
  );

  // Refresh command for the tree
  const refreshCommand = vscode.commands.registerCommand(
    'componentPreview.refreshTree',
    () => componentTree.refresh(),
  );

  // ---- Register triggers ----
  registerExplorerTrigger(context, previewManager, previewFinder);
  registerCodeTrigger(context, previewManager);

  // ---- Disposables ----
  context.subscriptions.push(
    panelRegistration,
    treeRegistration,
    refreshCommand,
    componentTree,
    previewFinder,
    outputChannel,
  );

  outputChannel.appendLine('All providers and triggers registered.');
}

/**
 * Extension cleanup.
 */
export function deactivate(): void {
  // All disposables registered via context.subscriptions are
  // automatically disposed by VS Code.
}
