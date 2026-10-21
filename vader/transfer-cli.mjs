import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { exportVader, importVader } from './transfer.mjs';

try {
    const [operation, source, destination] = process.argv.slice(2);
    if (!['export', 'import'].includes(operation) || !source || !destination) throw new Error('Usage: node vader/transfer-cli.mjs export DATA_FOLDER FILE.vader | import FILE.vader NEW_DATA_FOLDER');
    if (!process.stdin.isTTY && !process.env.VADER_TRANSFER_PASSPHRASE) throw new Error('Use an interactive terminal to enter a passphrase.');
    let passphrase = process.env.VADER_TRANSFER_PASSPHRASE;
    if (!passphrase) {
        const quiet = new Writable({ write(_chunk, _encoding, done) { done(); } });
        const terminal = createInterface({ input: process.stdin, output: quiet, terminal: true });
        try { process.stdout.write('Transfer passphrase (hidden): '); passphrase = await terminal.question(''); process.stdout.write('\n'); }
        finally { terminal.close(); }
    }
    const result = operation === 'export' ? await exportVader(source, destination, passphrase) : await importVader(source, destination, passphrase);
    console.log(JSON.stringify(result, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
