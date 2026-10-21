import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export async function readMemories(path) {
    try {
        const value = JSON.parse(await readFile(path, 'utf8'));
        if (!Array.isArray(value)) throw new Error('Invalid memory file.');
        return value;
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
}

export async function remember(path, text) {
    if (typeof text !== 'string' || !text.trim() || text.length > 1000) throw new Error('Memory must contain 1–1000 characters.');
    const memories = await readMemories(path);
    if (memories.some(item => item.text === text.trim())) return { saved: false, reason: 'Already remembered.' };
    memories.push({ id: randomUUID(), text: text.trim(), createdAt: new Date().toISOString() });
    await save(path, memories);
    return { saved: true, id: memories.at(-1).id };
}

export async function forget(path, id) {
    const memories = await readMemories(path);
    const remaining = memories.filter(item => item.id !== id);
    if (remaining.length === memories.length) throw new Error('Memory id not found.');
    await save(path, remaining);
}

async function save(path, memories) {
    await mkdir(dirname(path), { recursive: true });
    const temp = `${path}.${randomUUID()}.tmp`;
    await writeFile(temp, JSON.stringify(memories, null, 2), { mode: 0o600 });
    await rename(temp, path);
}
