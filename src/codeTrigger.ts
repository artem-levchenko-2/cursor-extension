import * as vscode from 'vscode';
import {
  detectComponentAtPosition,
  detectComponentNameAtPosition,
} from './componentDetector';
import { PreviewManager } from './previewManager';

/** Debounce delay in milliseconds. */
const DEBOUNCE_MS = 150;

/**
 * Registers the Code-based trigger that automatically detects a
 * component name under the cursor and updates the preview panel.
 *
 * When the user places their cursor on (or selects) a PascalCase
 * identifier:
 *   1. Try full detection (name + resolved file path) for a fast sync lookup.
 *   2. If file resolution fails, fall back to a workspace-wide async search
 *      by component name alone.
 *
 * Debounced at 150 ms to avoid excessive processing.
 */
export function registerCodeTrigger(
  context: vscode.ExtensionContext,
  previewManager: PreviewManager,
): void {
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const disposable = vscode.window.onDidChangeTextEditorSelection(
    (event: vscode.TextEditorSelectionChangeEvent) => {
      const editor = event.textEditor;

      // Only handle files that may contain component references
      const langId = editor.document.languageId;
      const supportedLangs = new Set([
        'typescriptreact',
        'typescript',
        'javascriptreact',
        'javascript',
        'astro',
        'vue',
        'svelte',
        'mdx',
      ]);
      if (!supportedLangs.has(langId)) {
        return;
      }

      // Clear previous timer
      if (debounceTimer !== undefined) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        debounceTimer = undefined;

        const position = editor.selection.active;

        // Strategy 1: Full detection (name + file path) — fast sync path
        const info = detectComponentAtPosition(editor.document, position);
        if (info) {
          previewManager.showPreview(info.name, info.filePath);
          return;
        }

        // Strategy 2: Name-only detection — async workspace-wide search
        const name = detectComponentNameAtPosition(
          editor.document,
          position,
        );
        if (name) {
          previewManager.showPreviewByNameAsync(name);
        }
      }, DEBOUNCE_MS);
    },
  );

  // Make sure the timer is cleaned up on deactivation
  context.subscriptions.push(disposable, {
    dispose() {
      if (debounceTimer !== undefined) {
        clearTimeout(debounceTimer);
      }
    },
  });
}
