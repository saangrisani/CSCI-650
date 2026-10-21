import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { runVader, validateModel, installedModels, hasInstalledModel } from './agent.mjs';
import { readMemories, forget } from './memory.mjs';

export class Workspace {
    constructor(root, run = runVader, listModels = installedModels) { this.root = root; this.run = run; this.listModels = listModels; this.busy = false; }
    async read(name, fallback) {
        try { return JSON.parse(await readFile(join(this.root, name), 'utf8')); }
        catch (e) { if (e.code === 'ENOENT') return fallback; throw e; }
    }
    async write(name, value) {
        await mkdir(this.root, { recursive: true });
        const path = join(this.root, name), temp = `${path}.${randomUUID()}.tmp`;
        await writeFile(temp, JSON.stringify(value, null, 2), { mode: 0o600 });
        await rename(temp, path);
    }
    async state() {
        return { chats: await this.read('chats.json', []), settings: await this.read('settings.json', { model: 'qwen2.5:3b', internet: true }),
            memories: await readMemories(join(this.root, 'memory.json')), examples: await this.read('training-examples.json', []) };
    }
    async newChat() {
        const chats = await this.read('chats.json', []);
        const chat = { id: randomUUID(), title: 'New conversation', messages: [], createdAt: new Date().toISOString() };
        chats.unshift(chat); await this.write('chats.json', chats); return chat;
    }
    async ask({ id, prompt }) {
        if (this.busy) throw new Error('vader is already answering.');
        if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 8000) throw new Error('Write a message between 1 and 8000 characters.');
        this.busy = true;
        try {
            const chats = await this.read('chats.json', []), chat = chats.find(c => c.id === id);
            if (!chat) throw new Error('Conversation not found.');
            const settings = await this.read('settings.json', { model: 'qwen2.5:3b', internet: true });
            const answer = await this.run({ prompt, model: settings.model, internet: settings.internet,
                memoryFile: join(this.root, 'memory.json'), history: chat.messages });
            chat.messages.push({ role: 'user', content: prompt }, { role: 'assistant', content: answer });
            chat.title = chat.messages[0].content.slice(0, 42);
            await this.write('chats.json', chats); return chat;
        } finally { this.busy = false; }
    }
    async configure(settings) {
        validateModel(settings.model);
        if (typeof settings.internet !== 'boolean') throw new Error('Internet setting must be a boolean.');
        const models = await this.listModels();
        if (!hasInstalledModel(settings.model, models)) throw new Error(`Model "${settings.model}" is not installed. Choose one of: ${models.join(', ') || 'no models installed'}.`);
        await this.write('settings.json', { model: settings.model, internet: settings.internet });
    }
    async removeMemory(id) { await forget(join(this.root, 'memory.json'), id); }
    async approve({ prompt, answer }) {
        if (![prompt, answer].every(x => typeof x === 'string' && x.trim() && x.length <= 8000)) throw new Error('An approved example needs a question and an answer, each at most 8000 characters.');
        const examples = await this.read('training-examples.json', []);
        if (examples.some(x => x.prompt === prompt && x.answer === answer)) return;
        examples.push({ id: randomUUID(), prompt, answer, approvedAt: new Date().toISOString() });
        await this.write('training-examples.json', examples);
    }
    async exportTraining() {
        const examples = await this.read('training-examples.json', []);
        if (examples.length < 2) throw new Error('Approve at least two examples before exporting a dataset.');
        const path = join(this.root, 'approved-training.jsonl');
        await writeFile(path, examples.map(x => JSON.stringify({ messages: [{ role: 'user', content: x.prompt }, { role: 'assistant', content: x.answer }] })).join('\n') + '\n', { mode: 0o600 });
        return { path, count: examples.length };
    }
}
