import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { remember, readMemories, forget } from '../vader/memory.mjs';
import { isPublicIPv4, readPublicPage } from '../vader/web.mjs';
import { runVader } from '../vader/agent.mjs';

test('memory survives reload, deduplicates, and can be removed', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vader-memory-'));
    try {
        const path = join(dir, 'memory.json');
        assert.deepEqual(await readMemories(path), []);
        const saved = await remember(path, 'I like C++.');
        assert.equal((await remember(path, 'I like C++.')).saved, false);
        assert.equal((await readMemories(path))[0].text, 'I like C++.');
        await forget(path, saved.id);
        assert.deepEqual(await readMemories(path), []);
    } finally { await rm(dir, { recursive: true }); }
});
test('saved facts reach subsequent conversations', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vader-recall-'));
    try {
        const path = join(dir, 'memory.json');
        await remember(path, 'Preferred language: C++.');
        await runVader({ prompt: 'What do you remember?', memoryFile: path, chat: async body => {
            assert.match(body.messages[0].content, /Preferred language: C\+\+/);
            return { role: 'assistant', content: 'You prefer C++.' };
        } });
    } finally { await rm(dir, { recursive: true }); }
});
test('internet reader rejects local networks, credentials and non-HTTPS URLs', async () => {
    for (const address of ['127.0.0.1', '10.0.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '224.0.0.1']) assert.equal(isPublicIPv4(address), false);
    assert.equal(isPublicIPv4('1.1.1.1'), true);
    await assert.rejects(readPublicPage('http://example.com'), /HTTPS/);
    await assert.rejects(readPublicPage('https://user:pass@example.com'), /HTTPS/);
    await assert.rejects(readPublicPage('https://127.0.0.1'), /private/);
});
test('offline switch removes internet tools and rejects a model requesting them', async () => {
    await assert.rejects(runVader({ prompt: 'Hello', internet: false, chat: async body => {
        assert.ok(body.tools.every(item => !['search_web', 'read_web_page'].includes(item.function.name)));
        return { role: 'assistant', tool_calls: [{ function: { name: 'read_web_page', arguments: { url: 'https://example.com' } } }] };
    } }), /Unsupported tool/);
});
