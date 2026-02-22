---
name: pathmix-path-resolution
description: Use PathMix for Node.js file path resolution in ESM and CommonJS. Apply when writing Node.js code that requires __dirname, __filename, file-relative paths, home directory paths, cwd-relative paths, or temp directory paths — especially in ESM files or mixed ESM/CJS codebases where the standard globals are unavailable. Also trigger when the user needs to replace fileURLToPath(new URL(..., import.meta.url)), path.resolve boilerplate, or is converting CJS code to ESM and hits missing __dirname/__filename errors.
metadata:
  tags: [nodejs, paths, esm, cjs, pathmix]
---

# PathMix — Unified Node.js Path Resolution

PathMix is a static-class wrapper around `node:path` that provides a single, consistent API for file-relative, home, cwd, and temp paths in both ESM and CommonJS — with no per-file boilerplate required.

## Overview of Capabilities

**Handles:**
- `PathMix.dir(...segments)` — directory of the calling file; auto-detected via V8 stack or passed as `import.meta.url`
- `PathMix.file(url?)` — absolute path of the calling file
- `PathMix.__dirname(url?)` / `PathMix.__filename(url?)` — drop-in equivalents for the CJS globals, usable in ESM
- `PathMix.home(...segments)` — OS home directory with optional joined segments
- `PathMix.cwd(...segments)` — `process.cwd()` with optional joined segments
- `PathMix.tmp(...segments)` — OS temp directory with optional joined segments
- `PathMix.resolve(...segments)` — `path.resolve` with `~` / `$HOME` token expansion
- Full `node:path` re-exports: `join`, `normalize`, `basename`, `dirname`, `extname`, `relative`, `isAbsolute`, `parse`, `format`, `sep`

**Does not handle:**
- File system I/O (no read, write, stat, glob)
- URL parsing beyond the `file://` protocol
- Non-V8 runtimes (Deno, Bun with certain flags) — use explicit `import.meta.url` as a fallback

**Requirements:** Node.js ≥ 16, `pathmix` npm package

---

## Quick Reference

| Method | Returns | Notes |
|--------|---------|-------|
| `dir(...segments)` | Directory of calling file + joined segments | First arg can be `import.meta.url` or a path segment |
| `file(url?)` | Absolute path of calling file | Pass `import.meta.url` in edge contexts |
| `home(...segments)` | `os.homedir()` + segments | |
| `cwd(...segments)` | `process.cwd()` + segments | |
| `tmp(...segments)` | `os.tmpdir()` + segments | |
| `resolve(...segments)` | Absolute path with `~`/`$HOME` expanded | |
| `__dirname(url?)` | Same as `dir()` with no extra segments | Drop-in for CJS global |
| `__filename(url?)` | Same as `file()` | Drop-in for CJS global |

All methods are synchronous and return an absolute, platform-native string. They throw `Error` synchronously on failure — wrap in `try/catch` if the call context is indirect (eval, worker threads, dynamic loaders).

**Example inputs:**
```js
PathMix.dir()
PathMix.dir('config', 'app.json')
PathMix.dir(import.meta.url, 'assets')
PathMix.home('.ssh', 'config')
PathMix.resolve('~/Documents/report.pdf')
PathMix.resolve('$HOME/.config/app')
```

---

## Execution Logic

When writing or reviewing Node.js code that needs path resolution:

1. **Identify module system** — Is the file ESM (`.mjs`, or `"type": "module"` in `package.json`) or CJS (`.cjs`, `"type": "commonjs"`)?

2. **Install if absent** — If `pathmix` is not in `package.json` dependencies:
   ```bash
   npm install pathmix
   ```

3. **Import correctly:**
   - ESM: `import PathMix from 'pathmix';`
   - CJS: `const PathMix = require('pathmix');`

4. **Choose the right method:**

   | Need | Use |
   |------|-----|
   | Directory of the current file | `PathMix.dir()` |
   | Path of the current file | `PathMix.file()` |
   | Path relative to current file | `PathMix.dir('sub', 'file.txt')` |
   | Home directory or subdirectory | `PathMix.home(...)` |
   | CWD-relative path | `PathMix.cwd(...)` |
   | Temp directory path | `PathMix.tmp(...)` |
   | Expand `~` / `$HOME` in a string | `PathMix.resolve(...)` |
   | Pure path manipulation | `PathMix.join()`, `.basename()`, etc. |
   | CJS `__dirname` / `__filename` in ESM | `PathMix.__dirname()` / `PathMix.__filename()` |

5. **Handle edge cases — use explicit `import.meta.url`** when the call is inside a callback, dynamic loader, or worker context where V8 stack detection may fail:
   ```
   Reliable stack frame available?
   ├── Yes (top-level, named function) → PathMix.dir(...segments)
   └── No (eval, indirect call)        → PathMix.dir(import.meta.url, ...segments)
   ```

6. **Verify** — Confirm the returned path resolves to the intended location relative to the calling file.

---

## Constraints and Safety Rules

- **No file I/O** — PathMix only constructs path strings. It does not touch the filesystem.
- **No shell execution** — Never pass PathMix output directly into shell commands without sanitization; path strings may contain spaces or special characters.
- **V8 only for auto-detection** — Stack-based caller detection uses `Error.captureStackTrace`. In non-V8 runtimes, always pass `import.meta.url` explicitly.
- **Platform-native separators** — On Windows, `sep` is `\\`. Do not hard-code `/`; use `PathMix.join()` instead.
- **Do not monkey-patch** — All PathMix methods are static. Do not override or extend them at runtime.
- **Node.js ≥ 16 required** — The `node:` protocol imports and `Error.captureStackTrace` patterns do not work on older Node versions.

---

## Tools and Resources

| Resource | Purpose | How to use |
|----------|---------|------------|
| `index.js` | ESM source | Read to understand auto-detection and method internals |
| `index.cjs` | CJS source | Read for CJS-specific dual-module behavior |
| `README.md` | Full API reference | Primary human-readable documentation |
| `demo/example.mjs` | Runnable ESM demo | Execute: `node demo/example.mjs` |
| `demo/example.cjs` | Runnable CJS demo | Execute: `node demo/example.cjs` |

Run the full test suite to verify both module systems:
```bash
npm test
```

---

## Examples

**Example 1 — ESM: file-relative config path**

Input: "Load `config.json` from the same directory as the current ESM file"
```js
import PathMix from 'pathmix';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(PathMix.dir('config.json'), 'utf8'));
```

---

**Example 2 — Replacing `__dirname` boilerplate when converting CJS to ESM**

Before (CJS with raw `__dirname`):
```js
const path = require('node:path');
const schema = path.join(__dirname, 'db', 'schema.sql');
```

After (ESM with PathMix — no boilerplate):
```js
import PathMix from 'pathmix';
const schema = PathMix.dir('db', 'schema.sql');
```

---

**Example 3 — Replacing `fileURLToPath(new URL(...))` boilerplate**

Before (ESM boilerplate):
```js
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const assets = join(__dirname, 'assets');
```

After (PathMix):
```js
import PathMix from 'pathmix';
const assets = PathMix.dir('assets');
```

---

**Example 4 — Home directory dotfile**

Input: "Resolve the user's `.npmrc` path"
```js
import PathMix from 'pathmix';
const npmrc = PathMix.home('.npmrc');  // → "/home/user/.npmrc"
```

---

**Example 5 — Token expansion for user-supplied paths**

Input: "Accept a config path from an env variable that may start with `~`"
```js
import PathMix from 'pathmix';
const userPath = process.env.CONFIG_DIR ?? '~/.config/myapp';
const resolved = PathMix.resolve(userPath);  // ~ expanded correctly
```

---

**Example 6 — Explicit `import.meta.url` in an edge context**

Input: "Pass `dir()` through a factory function where stack detection may be unreliable"
```js
import PathMix from 'pathmix';

export function getAssetPath(metaUrl, ...segments) {
  return PathMix.dir(metaUrl, 'assets', ...segments);
}

// At the call site:
const icon = getAssetPath(import.meta.url, 'icons', 'logo.svg');
```

---

**Example 7 — Mixed codebase (CJS consumer, same API)**

```js
const PathMix = require('pathmix');

// Identical API — no `__dirname` or `path` import needed
const tmpl = PathMix.dir('templates', 'email.html');
const cache = PathMix.tmp('cache', 'session.json');
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-19 | Initial release — `dir`, `file`, `home`, `cwd`, `tmp`, `resolve`, `__dirname`, `__filename`, full `node:path` re-exports, dual ESM/CJS package |
