import * as path from 'path';
import { PreviewFinder } from './previewFinder';
import { PreviewPanel } from './previewPanel';

/**
 * PreviewManager is the central orchestrator.  It receives requests to
 * show a preview (from either the Explorer trigger or the Code trigger),
 * locates the preview image via PreviewFinder, and instructs the
 * PreviewPanel to render the appropriate state.
 *
 * Preview lookup follows a 3-step fallback chain:
 *   1. Sync: look for preview next to the resolved component file
 *   2. Sync: look for preview by component NAME in the same directory
 *      (handles barrel/index re-exports)
 *   3. Async: workspace-wide search by component name
 */
export class PreviewManager {
  /** Track the last shown component to avoid redundant updates. */
  private _lastShown: string | undefined;

  constructor(
    private readonly _previewFinder: PreviewFinder,
    private readonly _previewPanel: PreviewPanel,
  ) {}

  /**
   * Show the preview for a component.
   *
   * @param componentName  PascalCase component name, e.g. "Hero8"
   * @param componentPath  Absolute path to the resolved file (may be
   *                       the actual component OR a barrel index file)
   */
  public async showPreview(
    componentName: string,
    componentPath: string,
  ): Promise<void> {
    // Deduplicate: don't re-render if the same component is already shown
    if (componentName === this._lastShown) {
      return;
    }
    this._lastShown = componentName;

    // Step 1: Look near the resolved file (fast sync).
    //         Works when componentPath IS the actual component file.
    let imagePath = this._previewFinder.findPreviewImage(componentPath);

    // Step 2: Look by component name in the resolved file's directory
    //         (fast sync).  Handles barrel/index re-exports where the
    //         file resolves to e.g. blocks/index.tsx but the preview
    //         is blocks/Hero8.preview.png.
    if (!imagePath) {
      const dir = path.dirname(componentPath);
      imagePath = this._previewFinder.findPreviewByNameInDir(
        componentName,
        dir,
      );
    }

    // Step 3: Workspace-wide search by name (async, slower).
    if (!imagePath) {
      imagePath =
        (await this._previewFinder.findPreviewByNameAsync(componentName)) ??
        undefined;
    }

    if (imagePath) {
      this._previewPanel.updatePreview(componentName, imagePath);
    } else {
      this._previewPanel.showNoPreview(componentName);
    }
  }

  /**
   * Show preview for a component by name only (no known source path).
   * Uses an async workspace-wide search for the preview image.
   */
  public async showPreviewByNameAsync(componentName: string): Promise<void> {
    if (componentName === this._lastShown) {
      return;
    }
    this._lastShown = componentName;

    const imagePath =
      await this._previewFinder.findPreviewByNameAsync(componentName);

    if (imagePath) {
      this._previewPanel.updatePreview(componentName, imagePath);
    } else {
      this._previewPanel.showNoPreview(componentName);
    }
  }

  /**
   * Show preview for a file URI (typically from the Explorer).
   * Derives the component name from the filename.
   */
  public async showPreviewForFile(filePath: string): Promise<void> {
    const ext = path.extname(filePath);
    const componentName = path.basename(filePath, ext);
    await this.showPreview(componentName, filePath);
  }

  /**
   * Reset tracking so the next showPreview call always updates.
   */
  public resetLastShown(): void {
    this._lastShown = undefined;
  }
}
