import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * PreviewFinder locates preview images for components on disk.
 *
 * Naming conventions supported:
 *   A) ComponentName.preview.png  (next to the component file)
 *   B) __previews__/ComponentName.png  (in a sibling folder)
 *
 * Both .png and .jpg/.jpeg extensions are checked.
 *
 * Results are cached (up to MAX_CACHE entries) and invalidated via a
 * FileSystemWatcher that monitors image file changes.
 */
export class PreviewFinder implements vscode.Disposable {
  private static readonly MAX_CACHE = 50;
  private static readonly IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg'];

  /** Maps component file path -> preview image path (or null = checked, not found) */
  private _cache = new Map<string, string | null>();
  private _watcher: vscode.FileSystemWatcher | undefined;
  private _disposables: vscode.Disposable[] = [];

  /** Event fired when preview availability might have changed (cache invalidated). */
  private _onDidChange = new vscode.EventEmitter<void>();
  public readonly onDidChange: vscode.Event<void> = this._onDidChange.event;

  constructor() {
    this._initWatcher();
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Find the preview image for a component whose source lives at
   * `componentPath`.  Returns the absolute path to the image, or
   * `undefined` if none was found.
   */
  public findPreviewImage(componentPath: string): string | undefined {
    // Check cache first
    if (this._cache.has(componentPath)) {
      return this._cache.get(componentPath) ?? undefined;
    }

    const result = this._search(componentPath);
    this._cacheSet(componentPath, result ?? null);

    return result;
  }

  /**
   * Check whether a preview image exists for a given component path.
   * Lighter weight than findPreviewImage when you only need a boolean.
   */
  public hasPreview(componentPath: string): boolean {
    return this.findPreviewImage(componentPath) !== undefined;
  }

  /**
   * Search the entire workspace for a preview image by component name.
   * This is the fallback when we cannot resolve the component's source file.
   *
   * Searches for:
   *   - **\/ComponentName.preview.{png,jpg,jpeg}
   *   - **\/__previews__/ComponentName.{png,jpg,jpeg}
   */
  public async findPreviewByNameAsync(
    componentName: string,
  ): Promise<string | undefined> {
    // Check name-based cache
    const cacheKey = `@name:${componentName}`;
    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey) ?? undefined;
    }

    // Search for Convention A: ComponentName.preview.{ext}
    for (const ext of PreviewFinder.IMAGE_EXTENSIONS) {
      const pattern = `**/${componentName}.preview${ext}`;
      const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 1);
      if (files.length > 0) {
        const result = files[0].fsPath;
        this._cacheSet(cacheKey, result);
        return result;
      }
    }

    // Search for Convention B: __previews__/ComponentName.{ext}
    for (const ext of PreviewFinder.IMAGE_EXTENSIONS) {
      const pattern = `**/__previews__/${componentName}${ext}`;
      const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 1);
      if (files.length > 0) {
        const result = files[0].fsPath;
        this._cacheSet(cacheKey, result);
        return result;
      }
    }

    this._cacheSet(cacheKey, null);
    return undefined;
  }

  /**
   * Clear the entire cache (e.g. after large FS changes).
   */
  public clearCache(): void {
    this._cache.clear();
  }

  public dispose(): void {
    this._cache.clear();
    this._onDidChange.dispose();
    this._disposables.forEach((d) => d.dispose());
  }

  /* ------------------------------------------------------------------ */
  /*  Internals                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Store a value in the cache, evicting the oldest entry if full.
   */
  private _cacheSet(key: string, value: string | null): void {
    if (this._cache.size >= PreviewFinder.MAX_CACHE) {
      const oldest = this._cache.keys().next().value;
      if (oldest !== undefined) {
        this._cache.delete(oldest);
      }
    }
    this._cache.set(key, value);
  }

  /**
   * Perform the actual filesystem search for a preview image.
   */
  private _search(componentPath: string): string | undefined {
    const dir = path.dirname(componentPath);
    const basename = path.basename(componentPath, path.extname(componentPath));

    // Strategy A: ComponentName.preview.{ext}  (next to the file)
    for (const ext of PreviewFinder.IMAGE_EXTENSIONS) {
      const candidate = path.join(dir, `${basename}.preview${ext}`);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    // Strategy B: __previews__/ComponentName.{ext}
    for (const ext of PreviewFinder.IMAGE_EXTENSIONS) {
      const candidate = path.join(dir, '__previews__', `${basename}${ext}`);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return undefined;
  }

  /**
   * Watch for image file changes so we can invalidate the cache.
   */
  private _initWatcher(): void {
    // Watch for .png, .jpg, .jpeg changes across the workspace
    this._watcher = vscode.workspace.createFileSystemWatcher(
      '**/*.{png,jpg,jpeg}',
    );

    const invalidate = () => {
      this._cache.clear();
      this._onDidChange.fire();
    };

    this._disposables.push(
      this._watcher.onDidCreate(invalidate),
      this._watcher.onDidDelete(invalidate),
      this._watcher.onDidChange(invalidate),
      this._watcher,
    );
  }
}
