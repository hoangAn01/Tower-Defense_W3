import { cp, mkdir, rm, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = new URL('../dist/', import.meta.url);
for (const file of ['index.html', 'style.css', 'game.js', 'assets', '.nojekyll']) await access(`${root}${file}`);
await rm(output, {recursive: true, force: true});
await mkdir(output, {recursive: true});
for (const file of ['index.html', 'style.css', 'game.js', 'assets', '.nojekyll']) {
  await cp(`${root}${file}`, new URL(file, output), {recursive: true});
}
console.log('Static site built in dist/');
