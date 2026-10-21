import test from 'node:test';
import assert from 'node:assert/strict';
import { createVaderServer } from '../vader/server.mjs';

test('local API relays prompts, rejects untrusted input, and handles backend failure', async () => {
    const server = createVaderServer({}, async ({ prompt }) => {
        if (prompt === 'fail') throw new Error('Local model offline.');
        return `Read: ${prompt}`;
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    const ask = (body, headers = {}) => fetch(`${url}/ask`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    try {
        const result = await ask({ prompt: 'Hello' });
        assert.equal(result.status, 200);
        assert.deepEqual(await result.json(), { name: 'vader', answer: 'Read: Hello' });
        assert.equal((await ask({ prompt: 'Hello', model: 'cloud' })).status, 400);
        assert.equal((await ask({ prompt: '' })).status, 400);
        assert.equal((await ask({ prompt: 'Hello' }, { Origin: 'https://example.com' })).status, 403);
        assert.equal((await ask({ prompt: 'fail' })).status, 502);
        assert.equal((await fetch(`${url}/health`)).status, 200);
    } finally { await new Promise(resolve => server.close(resolve)); }
});
