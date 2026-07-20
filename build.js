const esbuild = require('esbuild');
const JavaScriptObfuscator = require('javascript-obfuscator');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

const JS_ORDER = [
  'tab-5star.js',
  'tab-5star-odds.js',
  'tab-4star.js',
  'tab-other.js',
  'tab-build.js',
  'app.js',
];

// Plain static pages: copied as-is, no bundling, no rewriting needed
// (they already reference css/styles.css with no query string).
const STATIC_PAGES = [
  'contact.html',
  'privacy.html',
  'terms.html',
  'google3909e9d7cbd5f292.html',
  'robots.txt',
  'sitemap.xml',
];

const JS_SRC = path.join(ROOT, 'js');
const CSS_SRC = path.join(ROOT, 'css');
const ASSETS_SRC = path.join(ROOT, 'assets');
const INDEX_SRC = path.join(ROOT, 'index.html');

const DIST_JS = path.join(DIST, 'js');
const DIST_CSS = path.join(DIST, 'css');
const DIST_ASSETS = path.join(DIST, 'assets');
const DIST_INDEX = path.join(DIST, 'index.html');

// --- safety guard: never let rmSync touch anything but a real "dist" dir
// that lives directly inside ROOT. Protects against accidentally nuking
// source folders if paths ever get mis-computed.
function assertSafeToWipe(dir) {
  if (path.basename(dir) !== 'dist') {
    throw new Error(`Refusing to wipe non-dist path: ${dir}`);
  }
  if (path.dirname(dir) !== ROOT) {
    throw new Error(`Refusing to wipe dist outside project root: ${dir}`);
  }
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

console.log('Cleaning dist...');
assertSafeToWipe(DIST);
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

console.log('Copying assets...');
copyRecursive(ASSETS_SRC, DIST_ASSETS);

fs.mkdirSync(DIST_JS, { recursive: true });
fs.mkdirSync(DIST_CSS, { recursive: true });

console.log('Copying static pages...');

for (const file of STATIC_PAGES) {
  const src = path.join(ROOT, file);
  if (!fs.existsSync(src)) {
    console.log(`  (skip, not found: ${file})`);
    continue;
  }
  fs.copyFileSync(src, path.join(DIST, file));
  console.log(`  ✓ ${file}`);
}

console.log('Building JavaScript...');

for (const file of JS_ORDER) {
  const p = path.join(JS_SRC, file);
  if (!fs.existsSync(p)) {
    throw new Error(`Missing JS file: ${file}`);
  }
}

const concatenated = JS_ORDER
  .map(file => fs.readFileSync(path.join(JS_SRC, file), 'utf8'))
  .join('\n;\n');

const { code: minified } = esbuild.transformSync(concatenated, {
  loader: 'js',
  minify: true,
  target: 'es2019',
});

const obfuscated = JavaScriptObfuscator.obfuscate(minified, {
  compact: true,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.35,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  selfDefending: false,
  numbersToExpressions: false,
  simplify: true,
}).getObfuscatedCode();

const hash = crypto
  .createHash('sha256')
  .update(obfuscated)
  .digest('hex')
  .slice(0, 8);

const bundleName = `bundle.${hash}.js`;

fs.writeFileSync(path.join(DIST_JS, bundleName), obfuscated);
console.log(`✓ js/${bundleName}`);

console.log('Building CSS...');

if (!fs.existsSync(path.join(CSS_SRC, 'styles.css'))) {
  throw new Error('Missing css/styles.css');
}

const css = fs.readFileSync(path.join(CSS_SRC, 'styles.css'), 'utf8');
const cssResult = esbuild.transformSync(css, { loader: 'css', minify: true });

fs.writeFileSync(path.join(DIST_CSS, 'styles.css'), cssResult.code);
console.log('✓ css/styles.css');

console.log('Building HTML...');

if (!fs.existsSync(INDEX_SRC)) {
  throw new Error('Missing index.html');
}

let html = fs.readFileSync(INDEX_SRC, 'utf8');

// Replace the whole block of individual <script> tags (in JS_ORDER order,
// with any whitespace between them) with a single bundle tag.
const scriptBlockPattern = new RegExp(
  JS_ORDER.map(file =>
    `\\s*<script src="js\\/${file.replace('.', '\\.')}(?:\\?[^"]*)?"><\\/script>`
  ).join('')
);

if (!scriptBlockPattern.test(html)) {
  throw new Error(
    'Could not find the expected <script> block in index.html — ' +
    'check that JS_ORDER matches the tags in the file.'
  );
}

html = html.replace(
  scriptBlockPattern,
  `\n    <script src="js/${bundleName}"></script>`
);

// Strip stale ?v=... query strings so nothing depends on the old
// GitHub Action cache-bust workflow anymore. All static asset refs
// (css, and the assets/data/*.js files loaded ahead of the bundle)
// get a plain URL — content-hashed bundle.js is what handles busting.
html = html.replace(
  /((?:css|assets\/data)\/[^"']*?)\?v=[^"']*/g,
  '$1'
);

fs.writeFileSync(DIST_INDEX, html);
console.log('✓ index.html');

console.log('');
console.log('=================================');
console.log(' Build complete');
console.log(` JS  : js/${bundleName}`);
console.log(' CSS : css/styles.css');
console.log(` Dist: ${DIST}`);
console.log('=================================');