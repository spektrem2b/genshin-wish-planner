#!/usr/bin/env node
// Reads source from stdin, writes comment-stripped source to stdout.
// Used as a git "clean" filter so comments never reach the repo,
// while your local working tree keeps them untouched.
//
// Usage (manual): node strip-comments.js < input.js > output.js
// Usage (as git filter): configured via .gitattributes, see setup notes.

const esbuild = require('esbuild');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => (input += chunk));
process.stdin.on('end', () => {
  const ext = process.argv[2] || 'js'; // 'js' or 'css'
  try {
    const result = esbuild.transformSync(input, {
      loader: ext,
      minify: false,       // keep formatting/whitespace
      minifyWhitespace: false,
      minifyIdentifiers: false,
      minifySyntax: false,
      // esbuild always drops comments on transform regardless of minify flags
    });
    process.stdout.write(result.code);
  } catch (err) {
    // If esbuild can't parse it (e.g. weird syntax), fail safe: pass through unchanged
    process.stderr.write(`strip-comments: failed to process, passing through unchanged: ${err.message}\n`);
    process.stdout.write(input);
  }
});
