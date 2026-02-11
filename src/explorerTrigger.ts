import * as vscode from 'vscode';
import { PreviewFinder } from './previewFinder';
import { PreviewManager } from './previewManager';

/**
 * Registers the Explorer-based trigger:
 *
 *  1. A command (`componentPreview.showFromExplorer`) that, when invoked
 *     on a .tsx file, shows the preview panel for that component.
 *
 *  2. A FileDecorationProvider that adds a visual badge to .tsx files
 *     which have an available preview image.
 */
export function registerExplorerTrigger(
  context: vscode.ExtensionContext,
  previewManager: PreviewManager,
  previewFinder: PreviewFinder,
): void {
  // ---- Command: show preview from Explorer or Component Tree ----
  const commandDisposable = vscode.commands.registerCommand(
    'componentPreview.showFromExplorer',
    (arg?: vscode.Uri | { resourceUri?: vscode.Uri }) => {
      let uri: vscode.Uri | undefined;

      if (arg instanceof vscode.Uri) {
        // Called from explorer/context or editor/title
        uri = arg;
      } else if (arg && 'resourceUri' in arg && arg.resourceUri) {
        // Called from view/item/context (ComponentItem tree item)
        uri = arg.resourceUri;
      }

      if (!uri) {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
          uri = activeEditor.document.uri;
        }
      }
      if (!uri) {
        return;
      }

      previewManager.showPreviewForFile(uri.fsPath);
    },
  );

  // ---- File decoration: badge on files with previews ----
  const decorationProvider = new PreviewDecorationProvider(previewFinder);

  const decorationDisposable =
    vscode.window.registerFileDecorationProvider(decorationProvider);

  // Re-fire decorations when the preview finder cache is invalidated
  const cacheChangeDisposable = previewFinder.onDidChange(() => {
    decorationProvider.refresh();
  });

  context.subscriptions.push(
    commandDisposable,
    decorationDisposable,
    cacheChangeDisposable,
    decorationProvider,
  );
}

/* -------------------------------------------------------------------- */
/*  FileDecorationProvider                                               */
/* -------------------------------------------------------------------- */

class PreviewDecorationProvider
  implements vscode.FileDecorationProvider, vscode.Disposable
{
  private _onDidChangeFileDecorations =
    new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
  public readonly onDidChangeFileDecorations =
    this._onDidChangeFileDecorations.event;

  constructor(private readonly _previewFinder: PreviewFinder) {}

  /**
   * Provide a decoration for a given resource.  We add a small badge
   * to .tsx files that have a preview image available.
   */
  public provideFileDecoration(
    uri: vscode.Uri,
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.FileDecoration> {
    // Only decorate .tsx files
    if (!uri.fsPath.endsWith('.tsx')) {
      return undefined;
    }

    if (this._previewFinder.hasPreview(uri.fsPath)) {
      return new vscode.FileDecoration(
        '🖼', // badge text
        'Component preview available', // tooltip
      );
    }

    return undefined;
  }

  /**
   * Signal that decorations may have changed (e.g. after cache invalidation).
   */
  public refresh(): void {
    this._onDidChangeFileDecorations.fire(undefined);
  }

  public dispose(): void {
    this._onDidChangeFileDecorations.dispose();
  }
}
