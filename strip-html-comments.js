#!/usr/bin/env node
// Reads HTML from stdin, strips <!-- ... --> comments, writes to stdout.
// Used as a git "clean" filter alongside strip-comments.js (for JS/CSS).

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => (input += chunk));
process.stdin.on('end', () => {
  // Strip standard HTML comments. Does not touch IE conditional comments
  // (<!--[if IE]>...<![endif]-->) content differently — those are removed
  // wholesale too, which is fine since conditional comments are obsolete.
  const stripped = input.replace(/<!--[\s\S]*?-->/g, '');
  process.stdout.write(stripped);
});
