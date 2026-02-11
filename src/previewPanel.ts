import * as vscode from 'vscode';

/**
 * PreviewPanel implements a WebviewViewProvider that renders component
 * preview images inside a sidebar panel.
 *
 * Three visual states:
 *  1. Empty   -- initial instructions for the user
 *  2. Active  -- shows component name + preview image
 *  3. Error   -- component recognised but no preview image found
 */
export class PreviewPanel implements vscode.WebviewViewProvider {
  public static readonly viewType = 'componentPreview.panel';

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  /* ------------------------------------------------------------------ */
  /*  WebviewViewProvider interface                                      */
  /* ------------------------------------------------------------------ */

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: false,
      localResourceRoots: [
        // Allow access to the whole workspace so we can load preview images
        ...(vscode.workspace.workspaceFolders?.map((f) => f.uri) ?? []),
        this._extensionUri,
      ],
    };

    // Show the empty / welcome state
    this._setHtml(this._getEmptyHtml());
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Show a preview image for the given component.
   */
  public updatePreview(componentName: string, imagePath: string): void {
    if (!this._view) {
      return;
    }

    const imageUri = this._view.webview.asWebviewUri(
      vscode.Uri.file(imagePath),
    );

    this._setHtml(this._getActiveHtml(componentName, imageUri.toString()));

    // Make sure the panel is visible
    this._view.show?.(true);
  }

  /**
   * Show the "no preview" error state.
   */
  public showNoPreview(componentName: string): void {
    if (!this._view) {
      return;
    }

    this._setHtml(this._getErrorHtml(componentName));
    this._view.show?.(true);
  }

  /**
   * Reset the panel back to the empty / welcome state.
   */
  public reset(): void {
    if (!this._view) {
      return;
    }
    this._setHtml(this._getEmptyHtml());
  }

  /* ------------------------------------------------------------------ */
  /*  HTML generators                                                    */
  /* ------------------------------------------------------------------ */

  private _setHtml(html: string): void {
    if (this._view) {
      this._view.webview.html = html;
    }
  }

  private _getCsp(): string {
    if (!this._view) {
      return '';
    }
    const csp = this._view.webview.cspSource;
    return `default-src 'none'; img-src ${csp} data:; style-src ${csp} 'unsafe-inline';`;
  }

  /** State 1: Empty / welcome */
  private _getEmptyHtml(): string {
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${this._getCsp()}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${this._getSharedStyles()}</style>
</head>
<body>
  <div class="container empty">
    <div class="icon">&#128065;</div>
    <h2>Component Preview</h2>
    <p>Hover over a component name in your code or click the
       <strong>eye icon</strong> next to a <code>.tsx</code> file in the
       Explorer to see its preview here.</p>
  </div>
</body>
</html>`;
  }

  /** State 2: Active preview */
  private _getActiveHtml(name: string, imageUri: string): string {
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${this._getCsp()}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${this._getSharedStyles()}</style>
</head>
<body>
  <div class="container active">
    <h2 class="component-name">${this._escapeHtml(name)}</h2>
    <div class="image-wrapper">
      <img src="${imageUri}" alt="Preview of ${this._escapeHtml(name)}" />
    </div>
  </div>
</body>
</html>`;
  }

  /** State 3: No preview found */
  private _getErrorHtml(name: string): string {
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${this._getCsp()}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${this._getSharedStyles()}</style>
</head>
<body>
  <div class="container error">
    <h2 class="component-name">${this._escapeHtml(name)}</h2>
    <p class="error-msg">No preview image found.</p>
    <p class="hint">Expected one of:<br/>
      <code>${this._escapeHtml(name)}.preview.png</code><br/>
      <code>__previews__/${this._escapeHtml(name)}.png</code>
    </p>
  </div>
</body>
</html>`;
  }

  /* ------------------------------------------------------------------ */
  /*  Shared CSS (uses VS Code theme variables)                         */
  /* ------------------------------------------------------------------ */

  private _getSharedStyles(): string {
    return /* css */ `
      * { margin: 0; padding: 0; box-sizing: border-box; }

      body {
        font-family: var(--vscode-font-family, sans-serif);
        font-size: var(--vscode-font-size, 13px);
        color: var(--vscode-foreground);
        background: var(--vscode-sideBar-background, var(--vscode-editor-background));
        padding: 12px;
      }

      .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 10px;
      }

      /* Empty state */
      .empty .icon {
        font-size: 36px;
        margin-top: 24px;
        opacity: 0.6;
      }
      .empty h2 {
        font-size: 14px;
        font-weight: 600;
        color: var(--vscode-foreground);
      }
      .empty p {
        font-size: 12px;
        line-height: 1.5;
        color: var(--vscode-descriptionForeground);
        max-width: 260px;
      }
      .empty code {
        background: var(--vscode-textCodeBlock-background, rgba(128,128,128,0.15));
        padding: 1px 4px;
        border-radius: 3px;
        font-size: 11px;
      }

      /* Active state */
      .active .component-name {
        font-size: 14px;
        font-weight: 600;
        color: var(--vscode-foreground);
        padding-bottom: 4px;
        border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.2));
        width: 100%;
      }
      .image-wrapper {
        width: 100%;
        animation: fadeIn 0.2s ease-in;
      }
      .image-wrapper img {
        width: 100%;
        height: auto;
        border-radius: 4px;
        border: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.2));
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }

      /* Error state */
      .error .component-name {
        font-size: 14px;
        font-weight: 600;
        color: var(--vscode-foreground);
      }
      .error .error-msg {
        color: var(--vscode-errorForeground, #f44);
        font-size: 12px;
      }
      .error .hint {
        font-size: 11px;
        line-height: 1.6;
        color: var(--vscode-descriptionForeground);
      }
      .error code {
        background: var(--vscode-textCodeBlock-background, rgba(128,128,128,0.15));
        padding: 1px 4px;
        border-radius: 3px;
        font-size: 11px;
      }
    `;
  }

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */

  private _escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
