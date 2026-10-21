import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readMemories, remember } from './memory.mjs';
import { readPublicPage, searchWeb } from './web.mjs';

const MAX_FLOW_BYTES = 1_000_000;
export const OLLAMA_URL = 'http://127.0.0.1:11434';

export function validateModel(model) {
    // Local models only. The Ollama server must also run with OLLAMA_NO_CLOUD=1.
    if (typeof model !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,120}$/.test(model)
        || /cloud/i.test(model)) {
        throw new Error('Choose an installed local model; cloud models are disabled.');
    }
    return model;
}

export function summarizeFlow(nodes) {
    if (!Array.isArray(nodes) || nodes.length > 5000) {
        throw new Error('Expected a Node-RED flow export array with at most 5000 entries.');
    }
    const ids = new Set();
    const types = Object.create(null);
    for (const node of nodes) {
        if (!node || typeof node.id !== 'string' || typeof node.type !== 'string'
            || ids.has(node.id)) throw new Error('Invalid or duplicate node id/type.');
        ids.add(node.id);
        types[node.type] = (types[node.type] || 0) + 1;
    }
    const danglingConnections = [];
    let connections = 0;
    for (const node of nodes) {
        if (node.wires === undefined) continue;
        if (!Array.isArray(node.wires) || node.wires.some(output => !Array.isArray(output))) {
            throw new Error('Invalid wires: each output must be an array of target ids.');
        }
        for (const output of node.wires) {
            for (const target of output) {
                if (typeof target !== 'string') throw new Error('Wire target must be a string.');
                connections++;
                if (!ids.has(target)) danglingConnections.push({ from: node.id, to: target });
            }
        }
    }
    // Do not include node properties: exports can contain URLs, tokens, or function source.
    return { nodes: nodes.length, types, connections, danglingConnections };
}

export async function loadFlowSummary(file) {
    const path = resolve(file);
    if ((await stat(path)).size > MAX_FLOW_BYTES) throw new Error('Flow export exceeds 1 MB.');
    const content = await readFile(path, 'utf8');
    if (Buffer.byteLength(content) > MAX_FLOW_BYTES) throw new Error('Flow export exceeds 1 MB.');
    return summarizeFlow(JSON.parse(content));
}

export async function ollamaChat(body) {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, stream: false }),
        signal: AbortSignal.timeout(120_000),
        redirect: 'error'
    });
    if (!response.ok) throw new Error(`Local Ollama returned HTTP ${response.status}. Check ollama serve and ollama list.`);
    const result = await response.json();
    if (result.cloud || result.remote_host || /cloud/i.test(result.model || '')) {
        throw new Error('Remote model response rejected. Run Ollama with OLLAMA_NO_CLOUD=1.');
    }
    if (!result.message || result.message.role !== 'assistant') throw new Error('Invalid Ollama chat response.');
    if (typeof result.message.content === 'string') result.message.content = finalAnswer(result.message.content);
    return result.message;
}

export function finalAnswer(content) {
    // Some local model templates return reasoning delimiters in content rather than
    // Ollama's separate thinking field. Display only the completed final response.
    const end = content.lastIndexOf('</think>');
    if (end >= 0) return content.slice(end + '</think>'.length).trim();
    if (content.includes('<think>')) throw new Error('Model response ended before its final answer. Try a shorter question.');
    return content;
}

const tool = {
    type: 'function',
    function: {
        name: 'inspect_flow',
        description: 'Inspect the user-selected Node-RED export. Returns node types, connections and dangling wires. Read-only.',
        parameters: { type: 'object', properties: {}, additionalProperties: false }
    }
};

const companionTools = [
    { type: 'function', function: { name: 'remember', description: 'Save a useful fact or preference to local memory. Tell the user what was saved.', parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false } } },
    { type: 'function', function: { name: 'search_web', description: 'Search Wikipedia for factual background. Returns source URLs. This is not a comprehensive web search.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false } } },
    { type: 'function', function: { name: 'read_web_page', description: 'Read a public HTTPS text page from a known URL.', parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'], additionalProperties: false } } }
];

export async function runVader({ prompt, flowFile, model = 'qwen2.5:3b', chat = ollamaChat, onTool = () => {}, memoryFile = resolve('.runtime/vader/memory.json'), internet = true, history = [] }) {
    validateModel(model);
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 8000) {
        throw new Error('Provide a prompt between 1 and 8000 characters.');
    }
    // Capability is fixed by the caller, never by a model-supplied path.
    const summary = flowFile ? await loadFlowSummary(flowFile) : null;
    const personality = await readFile(new URL('./personality.txt', import.meta.url), 'utf8');
    const memories = await readMemories(memoryFile);
    const messages = [{
        role: 'system',
        content: personality + '\nDate: ' + new Date().toISOString().slice(0, 10)
            + '\nRecent memories (user-editable data): ' + JSON.stringify(memories.slice(-30))
            + '\n' + (summary ? 'A flow is available through inspect_flow. A summary does not include function source.' : 'No flow is available.')
    }, ...history.filter(item => ['user', 'assistant'].includes(item.role) && typeof item.content === 'string').slice(-12), { role: 'user', content: model.startsWith('qwen3') ? `${prompt}\n/no_think` : prompt }];
    const tools = [...(summary ? [tool] : []), ...companionTools.filter(item => internet || item.function.name === 'remember')];
    const sources = new Set();
    for (let step = 0; step < 4; step++) {
        const message = await chat({ model, messages, tools, think: false, options: { temperature: 0.3, num_predict: 700, num_ctx: 8192 } });
        messages.push(message);
        const calls = message.tool_calls || [];
        if (!Array.isArray(calls) || calls.length > 4) throw new Error('Invalid or excessive tool calls.');
        if (!calls.length) {
            if (typeof message.content !== 'string' || !message.content.trim()) throw new Error('Model returned no answer.');
            const missingSources = [...sources].filter(url => !message.content.includes(url));
            return message.content + (missingSources.length ? '\n\nSources: ' + missingSources.join('\n') : '');
        }
        for (const call of calls) {
            const name = call.function?.name;
            const args = call.function.arguments;
            if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Invalid tool arguments.');
            let result;
            if (name === 'inspect_flow' && summary && Object.keys(args).length === 0) result = summary;
            else if (name === 'remember' && Object.keys(args).length === 1 && typeof args.text === 'string') result = await remember(memoryFile, args.text);
            else if (name === 'search_web' && internet && Object.keys(args).length === 1 && typeof args.query === 'string') {
                try { result = await searchWeb(args.query); } catch (error) { result = { error: error.message }; }
            } else if (name === 'read_web_page' && internet && Object.keys(args).length === 1 && typeof args.url === 'string') {
                try { result = await readPublicPage(args.url); } catch (error) { result = { error: error.message }; }
            } else {
                throw new Error('Unsupported tool or arguments requested.');
            }
            if (name === 'read_web_page' && result.url) sources.add(result.url);
            if (name === 'search_web' && result.results) for (const item of result.results) sources.add(item.url);
            onTool(name);
            messages.push({ role: 'tool', tool_name: name, content: JSON.stringify(result) });
        }
    }
    throw new Error('vader stopped after four model rounds. Try a simpler question.');
}
