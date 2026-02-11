import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Information about a detected component.
 */
export interface ComponentInfo {
  /** PascalCase component name, e.g. "Feature17" */
  name: string;
  /** Absolute path to the component source file */
  filePath: string;
}

/** Built-in identifiers that start with uppercase but are NOT React components. */
const TS_BUILTIN_UPPERCASE = new Set([
  'Array',
  'ArrayBuffer',
  'Boolean',
  'DataView',
  'Date',
  'Error',
  'EvalError',
  'Float32Array',
  'Float64Array',
  'Function',
  'Generator',
  'GeneratorFunction',
  'Int8Array',
  'Int16Array',
  'Int32Array',
  'Infinity',
  'JSON',
  'Map',
  'Math',
  'NaN',
  'Number',
  'Object',
  'Promise',
  'Proxy',
  'RangeError',
  'ReferenceError',
  'Reflect',
  'RegExp',
  'Set',
  'SharedArrayBuffer',
  'String',
  'Symbol',
  'SyntaxError',
  'TypeError',
  'URIError',
  'Uint8Array',
  'Uint8ClampedArray',
  'Uint16Array',
  'Uint32Array',
  'WeakMap',
  'WeakSet',
  'React',
  'Component',
  'Fragment',
  'Suspense',
  'StrictMode',
  'Profiler',
  'Element',
  'HTMLElement',
  'SVGElement',
  'Event',
  'Document',
  'Window',
  'Node',
  'NodeList',
  'Console',
]);

/**
 * Regex to pick up a PascalCase identifier under the cursor.
 * Matches identifiers that start with an uppercase letter followed by
 * letters/digits.
 */
const COMPONENT_WORD_PATTERN = /[A-Z][a-zA-Z0-9]*/;

/**
 * Detect a PascalCase component name at the given cursor position.
 * Returns just the name without requiring file resolution.
 * Use this when you only need the name (e.g. for workspace-wide preview search).
 */
export function detectComponentNameAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position,
): string | undefined {
  const wordRange = document.getWordRangeAtPosition(
    position,
    COMPONENT_WORD_PATTERN,
  );
  if (!wordRange) {
    return undefined;
  }

  const word = document.getText(wordRange);

  // Filter out built-in / well-known non-component identifiers
  if (TS_BUILTIN_UPPERCASE.has(word)) {
    return undefined;
  }

  // Must be at least 2 chars to be a realistic component name
  if (word.length < 2) {
    return undefined;
  }

  return word;
}

/**
 * Try to detect a React component at the given position in the document.
 *
 * Returns ComponentInfo if a valid component is found and its source file
 * can be located; otherwise undefined.
 */
export function detectComponentAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position,
): ComponentInfo | undefined {
  const word = detectComponentNameAtPosition(document, position);
  if (!word) {
    return undefined;
  }

  // Try to resolve the component file
  const filePath = resolveComponentFile(word, document);
  if (!filePath) {
    return undefined;
  }

  return { name: word, filePath };
}

/* -------------------------------------------------------------------- */
/*  File resolution strategies                                           */
/* -------------------------------------------------------------------- */

/**
 * Attempt to find the source file for a component by name.
 *
 * Strategies (in order):
 *   1. Parse import statements in the current document
 *   2. Same directory as the current document
 *   3. Common directories: src/blocks/, src/components/
 *   4. Workspace-wide glob (fallback)
 */
function resolveComponentFile(
  componentName: string,
  document: vscode.TextDocument,
): string | undefined {
  return (
    resolveFromImports(componentName, document) ??
    resolveFromSameDirectory(componentName, document) ??
    resolveFromCommonDirectories(componentName) ??
    undefined
  );
}

/* ---- Strategy 1: Import statements ---- */

function resolveFromImports(
  componentName: string,
  document: vscode.TextDocument,
): string | undefined {
  const text = document.getText();

  // Match: import ComponentName from '...'
  // Match: import { ComponentName } from '...'
  // Match: import { Something as ComponentName } from '...'
  const importPatterns = [
    // default import
    new RegExp(
      `import\\s+${componentName}\\s+from\\s+['"]([^'"]+)['"]`,
    ),
    // named import (possibly with alias)
    new RegExp(
      `import\\s+\\{[^}]*\\b${componentName}\\b[^}]*\\}\\s+from\\s+['"]([^'"]+)['"]`,
    ),
  ];

  for (const pattern of importPatterns) {
    const match = pattern.exec(text);
    if (match) {
      const importPath = match[1];
      const resolved = resolveImportPath(importPath, document);
      if (resolved) {
        return resolved;
      }
    }
  }

  return undefined;
}

/**
 * Resolve a relative import path to an absolute file path.
 */
function resolveImportPath(
  importPath: string,
  document: vscode.TextDocument,
): string | undefined {
  const docDir = path.dirname(document.uri.fsPath);

  // Handle relative paths
  if (importPath.startsWith('.')) {
    return resolveWithExtensions(path.resolve(docDir, importPath));
  }

  // For non-relative paths, try resolving from workspace root
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  if (workspaceFolder) {
    const wsRoot = workspaceFolder.uri.fsPath;

    // Handle common aliases: @/ -> src/ or ./
    let normalised = importPath;
    if (normalised.startsWith('@/')) {
      normalised = normalised.slice(2); // strip "@/"
    }

    // Try common source roots
    for (const prefix of ['src/', 'app/', '']) {
      const candidate = path.join(wsRoot, prefix, normalised);
      const resolved = resolveWithExtensions(candidate);
      if (resolved) {
        return resolved;
      }
    }
  }

  return undefined;
}

/**
 * Try adding common extensions to a path to find an existing file.
 */
function resolveWithExtensions(basePath: string): string | undefined {
  // If it already has a .tsx/.ts extension, just check existence
  const ext = path.extname(basePath);
  if (['.tsx', '.ts', '.jsx', '.js'].includes(ext)) {
    return fs.existsSync(basePath) ? basePath : undefined;
  }

  // Try common extensions
  for (const tryExt of ['.tsx', '.ts', '.jsx', '.js']) {
    const candidate = basePath + tryExt;
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Try index files
  for (const tryExt of ['.tsx', '.ts', '.jsx', '.js']) {
    const candidate = path.join(basePath, `index${tryExt}`);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

/* ---- Strategy 2: Same directory ---- */

function resolveFromSameDirectory(
  componentName: string,
  document: vscode.TextDocument,
): string | undefined {
  const docDir = path.dirname(document.uri.fsPath);
  return resolveWithExtensions(path.join(docDir, componentName));
}

/* ---- Strategy 3: Common directories ---- */

function resolveFromCommonDirectories(
  componentName: string,
): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders) {
    return undefined;
  }

  for (const folder of folders) {
    const root = folder.uri.fsPath;
    for (const subDir of ['src/blocks', 'src/components', 'blocks', 'components']) {
      const resolved = resolveWithExtensions(
        path.join(root, subDir, componentName),
      );
      if (resolved) {
        return resolved;
      }
    }
  }

  return undefined;
}
