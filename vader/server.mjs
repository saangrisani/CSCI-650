import { createServer } from 'node:http';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { runVader } from './agent.mjs';

export function createVaderServer(options = {}, run = runVader) {
    let busy = false;
    return createServer(async (request, response) => {
        const reply = (status, body) => {
            response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
            response.end(JSON.stringify(body));
        };
        // This endpoint is for local Node-RED/CLI clients, not cross-site browser forms.
        if (request.headers.origin) return reply(403, { error: 'Use a local non-browser client.' });
        if (request.method === 'GET' && request.url === '/health') return reply(200, { name: 'vader', status: 'ok', busy });
        if (request.method !== 'POST' || request.url !== '/ask') return reply(404, { error: 'Not found.' });
        if (!(request.headers['content-type'] || '').startsWith('application/json')) return reply(415, { error: 'Expected application/json.' });
        if (busy) return reply(429, { error: 'vader is handling another question.' });
        busy = true;
        try {
            let size = 0;
            const chunks = [];
            for await (const chunk of request) {
                size += chunk.length;
                if (size > 16000) return reply(413, { error: 'Request too large.' });
                chunks.push(chunk);
            }
            let body;
            try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return reply(400, { error: 'Invalid JSON.' }); }
            if (!body || typeof body.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 8000
                || Object.keys(body).some(key => key !== 'prompt')) return reply(400, { error: 'Expected only a prompt string, 1–8000 characters.' });
            const answer = await run({ ...options, prompt: body.prompt });
            reply(200, { name: 'vader', answer });
        } catch (error) { reply(502, { error: error.message }); }
        finally { busy = false; }
    });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const { values } = parseArgs({ options: { flow: { type: 'string' }, model: { type: 'string' }, offline: { type: 'boolean' } } });
    const server = createVaderServer({ flowFile: values.flow, model: values.model, internet: !values.offline });
    server.listen(1891, '127.0.0.1', () => console.log('vader API: http://127.0.0.1:1891 (POST /ask, GET /health)'));
    server.on('error', error => { console.error(error.message); process.exitCode = 1; });
}
