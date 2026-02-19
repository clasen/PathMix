const { PathMix } = require('../index.cjs');

console.log('=== PathMix Demo (CommonJS) ===\n');

console.log('── Home ──');
console.log('home()          :', PathMix.home());
console.log('home(.ssh)      :', PathMix.home('.ssh'));
console.log('home(.config/app):', PathMix.home('.config', 'app'));

console.log('\n── Working Directory ──');
console.log('cwd()           :', PathMix.cwd());
console.log('cwd(src)        :', PathMix.cwd('src'));

console.log('\n── Current File / Dir (auto-detect) ──');
console.log('dir()           :', PathMix.dir());
console.log('dir(config)     :', PathMix.dir('config'));
console.log('file()          :', PathMix.file());

console.log('\n── __dirname / __filename helpers ──');
console.log('__dirname()     :', PathMix.__dirname());
console.log('__filename()    :', PathMix.__filename());
console.log('native __dirname:', __dirname);
console.log('match?          :', PathMix.__dirname() === __dirname);

console.log('\n── Temp ──');
console.log('tmp()           :', PathMix.tmp());
console.log('tmp(session-1)  :', PathMix.tmp('session-1'));

console.log('\n── Resolve with $HOME / ~ expansion ──');
console.log('resolve($HOME/.config)  :', PathMix.resolve('$HOME/.config'));
console.log('resolve(~/.ssh/config)  :', PathMix.resolve('~/.ssh/config'));

console.log('\n── Path utilities ──');
console.log('join(a, b, c)   :', PathMix.join('a', 'b', 'c'));
console.log('basename(/a/b.js):', PathMix.basename('/a/b.js'));
console.log('extname(app.ts) :', PathMix.extname('app.ts'));
console.log('sep             :', JSON.stringify(PathMix.sep));

console.log('\n✓ CJS demo complete');
