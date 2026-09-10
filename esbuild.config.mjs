import esbuild from 'esbuild';

const production = process.argv[2] === 'production';

// Obsidian 이 런타임에 제공하는 모듈은 번들에 넣지 않는다.
const external = [
  'obsidian',
  'electron',
  '@codemirror/autocomplete',
  '@codemirror/collab',
  '@codemirror/commands',
  '@codemirror/language',
  '@codemirror/lint',
  '@codemirror/search',
  '@codemirror/state',
  '@codemirror/view',
  '@lezer/common',
  '@lezer/highlight',
  '@lezer/lr',
  'node:*',
];

const context = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'cjs',
  target: 'es2022',
  platform: 'browser',
  logLevel: 'info',
  sourcemap: production ? false : 'inline',
  treeShaking: true,
  minify: production,
  outfile: 'main.js',
  external,
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
