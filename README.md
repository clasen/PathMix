# pathmix

Unified path utilities for Node.js that work the same way in both ESM and CommonJS.

## The problem

Whenever you need the path of the current file or its directory, Node.js requires different boilerplate depending on the module system you are using.

In CommonJS, `__dirname` and `__filename` are available as globals with no setup:

```js
const path = require('node:path');
const config = path.join(__dirname, 'config.json');
```

In ESM they do not exist. You have to reconstruct them every time:

```js
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const config = join(__dirname, 'config.json');
```

That boilerplate is easy to forget, easy to get slightly wrong, and has to be repeated in every file that needs it. If you are working across a mixed codebase — or publishing a package that must support both module systems — you end up maintaining two separate conventions.

pathmix collapses all of that into a single, consistent API.

## Installation

```bash
npm install pathmix
```

## Usage

### ESM

```js
import PathMix from 'pathmix';

// Directory of the current file (no import.meta.url needed)
PathMix.dir()               // /home/user/project/src
PathMix.dir('config.json')  // /home/user/project/src/config.json

// Current file path
PathMix.file()              // /home/user/project/src/index.js

// Or pass import.meta.url explicitly when auto-detection is not desired
PathMix.dir(import.meta.url, 'assets')  // /home/user/project/src/assets
```

### CommonJS

```js
const PathMix = require('pathmix');

// Identical API — no boilerplate required
PathMix.dir()               // /home/user/project/src
PathMix.dir('config.json')  // /home/user/project/src/config.json
PathMix.file()              // /home/user/project/src/index.js
```

## API

### File-relative paths

#### `PathMix.dir(...segments)`

Returns the directory of the calling file. Optionally joins one or more path segments onto it.

```js
PathMix.dir()                    // /project/src
PathMix.dir('data', 'seed.json') // /project/src/data/seed.json
PathMix.dir(import.meta.url)     // same, explicit (ESM only)
```

#### `PathMix.file(...args)`

Returns the absolute path of the calling file.

```js
PathMix.file()               // /project/src/utils.js
PathMix.file(import.meta.url) // same, explicit (ESM only)
```

#### `PathMix.__dirname()` / `PathMix.__filename()`

Drop-in equivalents for the CommonJS globals, available in both module systems.

```js
PathMix.__dirname()   // /project/src
PathMix.__filename()  // /project/src/utils.js
```

### Well-known base paths

#### `PathMix.home(...segments)`

```js
PathMix.home()              // /home/user
PathMix.home('.ssh')        // /home/user/.ssh
PathMix.home('.config/app') // /home/user/.config/app
```

#### `PathMix.cwd(...segments)`

```js
PathMix.cwd()               // /project
PathMix.cwd('src', 'index') // /project/src/index
```

#### `PathMix.tmp(...segments)`

```js
PathMix.tmp()               // /tmp
PathMix.tmp('session-1')    // /tmp/session-1
```

### Token expansion

#### `PathMix.resolve(...segments)`

Like `path.resolve`, but also expands `~` and `$HOME` to the user home directory.

```js
PathMix.resolve('~/.ssh/config')    // /home/user/.ssh/config
PathMix.resolve('$HOME/.config/app') // /home/user/.config/app
```

### Standard path utilities

All core `node:path` methods are re-exported on the same class, so you can import one thing and have everything:

```js
PathMix.join('a', 'b', 'c')   // a/b/c
PathMix.basename('/a/b.js')   // b.js
PathMix.extname('app.ts')     // .ts
PathMix.dirname('/a/b/c')     // /a/b
PathMix.normalize('a//b/../c') // a/c
PathMix.relative('/a', '/a/b') // b
PathMix.isAbsolute('/foo')    // true
PathMix.parse('/a/b.js')      // { root, dir, base, ext, name }
PathMix.format({ dir: '/a', base: 'b.js' }) // /a/b.js
PathMix.sep                   // '/' on Unix, '\\' on Windows
```

## AI Skill

You can add PathMix as a skill for AI agentic development:

```bash
npx skills add https://github.com/clasen/PathMix --skill pathmix
```

## Requirements

Node.js >= 16
