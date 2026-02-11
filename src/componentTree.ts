import * as vscode from 'vscode';
import * as path from 'path';
import { PreviewFinder } from './previewFinder';

/**
 * A tree item representing a single .tsx component file that has a
 * preview image available.
 */
export class ComponentItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly resourceUri: vscode.Uri,
    public readonly hasPreview: boolean,
    previewImagePath?: string,
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);

    this.contextValue = hasPreview ? 'componentWithPreview' : 'component';

    // Click on the item opens the file in the editor
    this.command = {
      command: 'vscode.open',
      title: 'Open File',
      arguments: [resourceUri],
    };

    // Use a file icon
    this.iconPath = vscode.ThemeIcon.File;

    // Show a small indicator when preview is available
    if (hasPreview) {
      this.description = '🖼';
    }

    // Build a rich tooltip with the preview image
    this.tooltip = ComponentItem._buildTooltip(label, hasPreview, previewImagePath);
  }

  /**
   * Build a MarkdownString tooltip.
   *
   * If a preview image path is available, we try to embed the image
   * using markdown syntax.  VS Code 1.56+ supports images inside
   * MarkdownString tooltips on TreeItems.  If the platform doesn't
   * render the image, the user still sees the component name and
   * a textual note about the preview file.
   */
  private static _buildTooltip(
    componentName: string,
    hasPreview: boolean,
    previewImagePath?: string,
  ): vscode.MarkdownString {
    const md = new vscode.MarkdownString(undefined, true);
    md.isTrusted = true;
    md.supportHtml = true;

    // Strip .tsx extension from the display name if present
    const displayName = componentName.replace(/\.tsx$/i, '');

    if (hasPreview && previewImagePath) {
      const imageUri = vscode.Uri.file(previewImagePath);

      // Primary: try to render the image via markdown
      // Using <img> with width constraint so the tooltip stays compact
      md.appendMarkdown(`**${displayName}**\n\n`);
      md.appendMarkdown(
        `<img src="${imageUri}" width="300" />\n\n`,
      );
      // Textual fallback line (visible even if image doesn't render)
      const fileName = path.basename(previewImagePath);
      md.appendMarkdown(
        `<span style="opacity:0.7">Preview: ${fileName}</span>`,
      );
    } else {
      md.appendMarkdown(`**${displayName}**\n\n`);
      md.appendMarkdown(`_No preview image found_`);
    }

    return md;
  }
}

/**
 * Tree data provider that lists .tsx files which have a preview image
 * and exposes them for inline actions (eye button).
 */
export class ComponentTreeProvider
  implements vscode.TreeDataProvider<ComponentItem>, vscode.Disposable
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    ComponentItem | undefined | void
  >();
  public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private _disposables: vscode.Disposable[] = [];

  constructor(private readonly _previewFinder: PreviewFinder) {
    // Refresh the tree when .tsx files change
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.tsx');
    this._disposables.push(
      watcher.onDidCreate(() => this.refresh()),
      watcher.onDidDelete(() => this.refresh()),
      watcher,
    );

    // Refresh when preview images change
    this._disposables.push(
      this._previewFinder.onDidChange(() => this.refresh()),
    );
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public getTreeItem(element: ComponentItem): vscode.TreeItem {
    return element;
  }

  public async getChildren(
    _element?: ComponentItem,
  ): Promise<ComponentItem[]> {
    // Only provide root-level items (flat list)
    if (_element) {
      return [];
    }

    const tsxFiles = await vscode.workspace.findFiles(
      '**/*.tsx',
      '**/node_modules/**',
      500,
    );

    if (tsxFiles.length === 0) {
      return [];
    }

    // Sort by filename
    tsxFiles.sort((a, b) => {
      const nameA = path.basename(a.fsPath).toLowerCase();
      const nameB = path.basename(b.fsPath).toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // Only show files that have a preview image.
    // The preview path is resolved once here (via cached previewFinder)
    // and passed to the ComponentItem so tooltips are built without
    // any additional FS work on hover.
    const items: ComponentItem[] = [];
    for (const uri of tsxFiles) {
      const previewPath = this._previewFinder.findPreviewImage(uri.fsPath);
      if (previewPath) {
        const fileName = path.basename(uri.fsPath);
        items.push(new ComponentItem(fileName, uri, true, previewPath));
      }
    }
    return items;
  }

  public dispose(): void {
    this._onDidChangeTreeData.dispose();
    this._disposables.forEach((d) => d.dispose());
  }
}
