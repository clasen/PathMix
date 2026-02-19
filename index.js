import { join, resolve, dirname as pathDirname, basename, normalize, sep, parse, format, relative, isAbsolute, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir, tmpdir } from 'node:os';

class PathMix {

  static #getCallerFile(methodRef) {
    const orig = Error.prepareStackTrace;
    Error.prepareStackTrace = (_, stack) => stack;
    const err = new Error();
    Error.captureStackTrace(err, methodRef);
    const stack = err.stack;
    Error.prepareStackTrace = orig;

    const fileName = stack[0]?.getFileName();
    if (!fileName) return null;

    if (fileName.startsWith('file://')) return fileURLToPath(fileName);
    return fileName;
  }

  static #isFileUrl(value) {
    return typeof value === 'string' && value.startsWith('file://');
  }

  static #expandTokens(segment) {
    if (typeof segment !== 'string') return segment;
    if (segment.startsWith('$HOME')) return segment.replace(/^\$HOME/, homedir());
    if (segment.startsWith('~')) return segment.replace(/^~/, homedir());
    return segment;
  }

  // ── Base path methods with integrated join ──

  static home(...segments) {
    return segments.length ? join(homedir(), ...segments) : homedir();
  }

  static cwd(...segments) {
    return segments.length ? join(process.cwd(), ...segments) : process.cwd();
  }

  static dir(...args) {
    let base;
    let segments;

    if (args.length > 0 && PathMix.#isFileUrl(args[0])) {
      base = pathDirname(fileURLToPath(args[0]));
      segments = args.slice(1);
    } else {
      const callerFile = PathMix.#getCallerFile(PathMix.dir);
      if (!callerFile) throw new Error('PathMix.dir(): could not detect caller file. Pass import.meta.url explicitly.');
      base = pathDirname(callerFile);
      segments = args;
    }

    return segments.length ? join(base, ...segments) : base;
  }

  static file(...args) {
    if (args.length > 0 && PathMix.#isFileUrl(args[0])) {
      return fileURLToPath(args[0]);
    }

    const callerFile = PathMix.#getCallerFile(PathMix.file);
    if (!callerFile) throw new Error('PathMix.file(): could not detect caller file. Pass import.meta.url explicitly.');
    return callerFile;
  }

  static tmp(...segments) {
    return segments.length ? join(tmpdir(), ...segments) : tmpdir();
  }

  // ── Token expansion ──

  static resolve(...segments) {
    const expanded = segments.map(s => PathMix.#expandTokens(s));
    return resolve(...expanded);
  }

  // ── CJS compatibility helpers ──

  static __dirname(...args) {
    if (args.length > 0 && PathMix.#isFileUrl(args[0])) {
      return pathDirname(fileURLToPath(args[0]));
    }

    const callerFile = PathMix.#getCallerFile(PathMix.__dirname);
    if (!callerFile) throw new Error('PathMix.__dirname(): could not detect caller file. Pass import.meta.url explicitly.');
    return pathDirname(callerFile);
  }

  static __filename(...args) {
    if (args.length > 0 && PathMix.#isFileUrl(args[0])) {
      return fileURLToPath(args[0]);
    }

    const callerFile = PathMix.#getCallerFile(PathMix.__filename);
    if (!callerFile) throw new Error('PathMix.__filename(): could not detect caller file. Pass import.meta.url explicitly.');
    return callerFile;
  }

  // ── Re-exported path utilities ──

  static join(...segments) { return join(...segments); }
  static normalize(p) { return normalize(p); }
  static basename(p, ext) { return basename(p, ext); }
  static dirname(p) { return pathDirname(p); }
  static extname(p) { return extname(p); }
  static relative(from, to) { return relative(from, to); }
  static isAbsolute(p) { return isAbsolute(p); }
  static parse(p) { return parse(p); }
  static format(obj) { return format(obj); }
  static get sep() { return sep; }
}

export { PathMix };
export default PathMix;
