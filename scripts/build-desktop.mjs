import { cp, mkdir, writeFile, rename, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, '..');
const output = resolve(process.argv[2] || '.runtime/build/Vader');
try { await access(output); throw new Error('Output already exists. Choose a new directory.'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const electronRoot = resolve(require.resolve('electron/package.json'), '..', 'dist');
await mkdir(output, { recursive: true });
await cp(electronRoot, output, { recursive: true });
const packaged = join(output, 'resources', 'app');
await mkdir(packaged, { recursive: true });
for (const dir of ['desktop', 'vader']) await cp(join(root, dir), join(packaged, dir), { recursive: true });
await writeFile(join(packaged, 'package.json'), JSON.stringify({ name: 'vader', productName: 'vader', version: '0.2.0', main: 'desktop/main.cjs' }));
if (process.platform === 'win32') await rename(join(output, 'electron.exe'), join(output, 'Vader.exe'));
console.log(`Portable desktop app: ${output}`);
