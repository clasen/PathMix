---
name: pathmix-path-resolution
description: Use PathMix for Node.js file path resolution in ESM and CommonJS. Apply when writing Node.js code that requires __dirname, __filename, file-relative paths, home directory paths, cwd-relative paths, or temp directory paths — especially in ESM files or mixed ESM/CJS codebases where the standard globals are unavailable.
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

## Input Specification

All PathMix methods are synchronous and static. Inputs are positional string arguments.

| Method | First arg | Rest args | Notes |
|--------|-----------|-----------|-------|
| `dir(...segments)` | `import.meta.url` (file URL) **or** a path segment | path segments | First arg is auto-detected if omitted |
| `file(url?)` | `import.meta.url` (optional) | — | Auto-detected if omitted |
| `home(...segments)` | path segment (optional) | path segments | Base is `os.homedir()` |
| `cwd(...segments)` | path segment (optional) | path segments | Base is `process.cwd()` |
| `tmp(...segments)` | path segment (optional) | path segments | Base is `os.tmpdir()` |
| `resolve(...segments)` | path string, may start with `~` or `$HOME` | path segments | Expands home tokens before resolving |
| `__dirname(url?)` | `import.meta.url` (optional) | — | Equivalent to `dir()` with no extra segments |
| `__filename(url?)` | `import.meta.url` (optional) | — | Equivalent to `file()` |

**Validation rules:**
- All inputs must be `string`. Non-string values are passed through unchanged.
- `dir()`, `file()`, `__dirname()`, `__filename()` throw `Error` when called with no args if stack introspection fails.
- Token expansion (`~`, `$HOME`) applies only to the leading characters of a segment — not mid-string.

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

## Output Specification

All methods return a `string` (absolute, platform-native path). No method is async.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PathMixResult",
  "oneOf": [
    {
      "type": "string",
      "description": "Absolute filesystem path on success"
    },
    {
      "type": "object",
      "description": "Synchronously thrown Error on failure",
      "properties": {
        "name":    { "type": "string", "const": "Error" },
        "message": { "type": "string" }
      },
      "required": ["name", "message"]
    }
  ]
}
```

**Example outputs (Linux/macOS):**
```
PathMix.dir()                → "/home/user/project/src"
PathMix.dir('config.json')   → "/home/user/project/src/config.json"
PathMix.file()               → "/home/user/project/src/utils.js"
PathMix.home('.ssh')         → "/home/user/.ssh"
PathMix.cwd('dist')          → "/home/user/project/dist"
PathMix.tmp('uploads')       → "/tmp/uploads"
PathMix.resolve('~/.config') → "/home/user/.config"
PathMix.join('a', 'b', 'c') → "a/b/c"
```

**Error reporting:** Methods throw synchronously. Wrap in `try/catch` when the caller context may lack a reliable stack frame (e.g., inside `eval`, indirect dynamic calls, or worker threads).

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

5. **Handle edge cases — use explicit `import.meta.url`** when:
   - The call is inside a callback, dynamic loader, or worker context where V8 stack detection may fail.
   - Decision tree:
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
- **V8 only for auto-detection** — Stack-based caller detection uses `Error.captureStackTrace`, which is V8-specific. In non-V8 runtimes, always pass `import.meta.url` explicitly.
- **Platform-native separators** — On Windows, `sep` is `\\` and paths use backslashes. Do not hard-code `/` as a separator; use `PathMix.join()` instead.
- **Do not monkey-patch** — All PathMix methods are static. Do not override or extend them at runtime.
- **Node.js ≥ 16 required** — The `node:` protocol imports and `Error.captureStackTrace` patterns do not work on older Node versions.
- **Ethical use** — PathMix constructs paths only. Responsibility for what is read, written, or executed at those paths lies with the calling code.

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

**Example 3 — Home directory dotfile**

Input: "Resolve the user's `.npmrc` path"
```js
import PathMix from 'pathmix';
const npmrc = PathMix.home('.npmrc');  // → "/home/user/.npmrc"
```

---

**Example 4 — Token expansion for user-supplied paths**

Input: "Accept a config path from an env variable that may start with `~`"
```js
import PathMix from 'pathmix';
const userPath = process.env.CONFIG_DIR ?? '~/.config/myapp';
const resolved = PathMix.resolve(userPath);  // ~ expanded correctly
```

---

**Example 5 — Explicit `import.meta.url` in an edge context**

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

**Example 6 — Mixed codebase (CJS consumer, same API)**

```js
const PathMix = require('pathmix');

// Identical API — no `__dirname` or `path` import needed
const tmpl = PathMix.dir('templates', 'email.html');
const cache = PathMix.tmp('cache', 'session.json');
```

---

## Evaluation Criteria

| # | Criterion | Pass condition |
|---|-----------|---------------|
| 1 | Correct ESM import | `import PathMix from 'pathmix'` resolves without error |
| 2 | Correct CJS import | `require('pathmix')` resolves without error |
| 3 | `dir()` auto-detection | Returns the calling file's directory without arguments |
| 4 | `dir()` explicit URL | `PathMix.dir(import.meta.url)` returns the same value as auto-detected |
| 5 | Tilde expansion | `PathMix.resolve('~/foo')` equals `path.join(os.homedir(), 'foo')` |
| 6 | `$HOME` expansion | `PathMix.resolve('$HOME/foo')` equals `path.join(os.homedir(), 'foo')` |
| 7 | Home path | `PathMix.home('bar')` equals `path.join(os.homedir(), 'bar')` |
| 8 | CWD path | `PathMix.cwd('baz')` equals `path.join(process.cwd(), 'baz')` |
| 9 | Tmp path | `PathMix.tmp('x')` equals `path.join(os.tmpdir(), 'x')` |
| 10 | No boilerplate in ESM | Generated ESM code does not import `fileURLToPath` or reconstruct `__dirname` manually |
| 11 | Error on failure | Calling `dir()` in an unsupported context throws `Error` (not silent `undefined`) |
| 12 | CJS/ESM parity | Same API calls return identical values in both module systems |
| 13 | Smoke test passes | `npm test` exits with code 0 |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-19 | Initial release — `dir`, `file`, `home`, `cwd`, `tmp`, `resolve`, `__dirname`, `__filename`, full `node:path` re-exports, dual ESM/CJS package |
