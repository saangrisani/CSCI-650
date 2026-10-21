import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'node:crypto';
import { readFile, writeFile, mkdir, access, rename } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
const FILES = ['memory.json', 'chats.json', 'conversation.json', 'settings.json', 'training-examples.json', 'personality.txt'];
const LIMIT = 20_000_000;

function key(passphrase, salt) {
    if (typeof passphrase !== 'string' || passphrase.length < 12) throw new Error('Use a transfer passphrase of at least 12 characters.');
    return scryptSync(passphrase, salt, 32);
}
export async function exportVader(root, destination, passphrase) {
    const files = {};
    for (const name of FILES) {
        try { files[name] = await readFile(join(root, name), 'utf8'); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    if (!files['personality.txt']) files['personality.txt'] = await readFile(new URL('./personality.txt', import.meta.url), 'utf8');
    const plain = Buffer.from(JSON.stringify({ version: 1, files }));
    if (plain.length > LIMIT) throw new Error('Transfer exceeds 20 MB. Archive old conversations separately.');
    const salt = randomBytes(16), nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(passphrase, salt), nonce);
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
    const envelope = { format: 'vader-transfer-1', salt: salt.toString('base64'), nonce: nonce.toString('base64'),
        tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64') };
    await mkdir(dirname(resolve(destination)), { recursive: true });
    await writeFile(destination, JSON.stringify(envelope), { mode: 0o600, flag: 'wx' });
    return { path: resolve(destination), files: Object.keys(files).length, encrypted: true };
}
export async function importVader(source, destination, passphrase) {
    const content = await readFile(source);
    if (content.length > LIMIT * 1.5) throw new Error('Transfer exceeds the size limit.');
    const envelope = JSON.parse(content.toString('utf8'));
    if (envelope.format !== 'vader-transfer-1') throw new Error('Unsupported transfer format.');
    const salt = Buffer.from(envelope.salt, 'base64'), nonce = Buffer.from(envelope.nonce, 'base64'), tag = Buffer.from(envelope.tag, 'base64');
    if (salt.length !== 16 || nonce.length !== 12 || tag.length !== 16) throw new Error('Invalid transfer header.');
    let payload;
    try {
        const cipher = createDecipheriv('aes-256-gcm', key(passphrase, salt), nonce);
        cipher.setAuthTag(tag);
        payload = JSON.parse(Buffer.concat([cipher.update(Buffer.from(envelope.data, 'base64')), cipher.final()]).toString('utf8'));
    } catch { throw new Error('Incorrect passphrase or damaged transfer file.'); }
    if (payload.version !== 1 || !payload.files || Object.keys(payload.files).some(name => !FILES.includes(name))) throw new Error('Invalid transfer contents.');
    for (const [name, value] of Object.entries(payload.files)) {
        if (typeof value !== 'string') throw new Error('Invalid transferred file.');
        if (name.endsWith('.json')) {
            const parsed = JSON.parse(value);
            if (name === 'settings.json') {
                if (!parsed || typeof parsed.model !== 'string' || typeof parsed.internet !== 'boolean') throw new Error('Invalid settings.');
                // Start private on a new machine; the user can re-enable internet in Settings.
                parsed.internet = false; payload.files[name] = JSON.stringify(parsed, null, 2);
            } else if (!Array.isArray(parsed)) throw new Error('Invalid data array.');
        }
    }
    // Import into a new folder; do not overwrite an existing companion's data.
    try { await access(destination); throw new Error('Destination already exists. Choose a new folder.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const target = resolve(destination), staging = `${target}.import-${randomBytes(6).toString('hex')}`;
    await mkdir(staging, { recursive: true });
    for (const [name, value] of Object.entries(payload.files)) await writeFile(join(staging, name), value, { mode: 0o600 });
    await rename(staging, target);
    return { path: target, files: Object.keys(payload.files).length, internet: false };
}
