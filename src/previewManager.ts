import * as path from 'path';
import { PreviewFinder } from './previewFinder';
import { PreviewPanel } from './previewPanel';

/**
 * PreviewManager is the central orchestrator.  It receives requests to
 * show a preview (from either the Explorer trigger or the Code trigger),
 * locates the preview image via PreviewFinder, and instructs the
 * PreviewPanel to render the appropriate state.
 */
export class PreviewManager {
  /** Track the last shown component to avoid redundant updates. */
  private _lastShown: string | undefined;

  constructor(
    private readonly _previewFinder: PreviewFinder,
    private readonly _previewPanel: PreviewPanel,
  ) {}

  /**
   * Show the preview for a component when we know its source file path.
   * Tries a fast synchronous lookup near the component file first.
   */
  public showPreview(componentName: string, componentPath: string): void {
    // Deduplicate: don't re-render if the same component is already shown
    const key = componentName;
    if (key === this._lastShown) {
      return;
    }
    this._lastShown = key;

    const imagePath = this._previewFinder.findPreviewImage(componentPath);

    if (imagePath) {
      this._previewPanel.updatePreview(componentName, imagePath);
    } else {
      this._previewPanel.showNoPreview(componentName);
    }
  }

  /**
   * Show preview for a component by name only (no known source path).
   * Uses an async workspace-wide search for the preview image.
   * This is the fallback when file resolution fails.
   */
  public async showPreviewByNameAsync(componentName: string): Promise<void> {
    // Deduplicate
    const key = componentName;
    if (key === this._lastShown) {
      return;
    }
    this._lastShown = key;

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
  public showPreviewForFile(filePath: string): void {
    const ext = path.extname(filePath);
    const componentName = path.basename(filePath, ext);
    this.showPreview(componentName, filePath);
  }

  /**
   * Reset tracking so the next showPreview call always updates.
   */
  public resetLastShown(): void {
    this._lastShown = undefined;
  }
}
