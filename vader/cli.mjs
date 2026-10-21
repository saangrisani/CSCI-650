import { parseArgs } from 'node:util';
import { loadFlowSummary, runVader } from './agent.mjs';
import { readMemories, remember, forget } from './memory.mjs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

try {
    const { values, positionals } = parseArgs({
        allowPositionals: true,
        options: { flow: { type: 'string' }, model: { type: 'string' }, inspect: { type: 'boolean' }, help: { type: 'boolean' }, remember: { type: 'string' }, memories: { type: 'boolean' }, forget: { type: 'string' }, offline: { type: 'boolean' }, chat: { type: 'boolean' } }
    });
    const memoryFile = resolve('.runtime/vader/memory.json');
    if (values.help) {
        console.log('vader [--model qwen2.5:3b] [--flow export.json] [--offline] "question"\nvader --chat\nvader --inspect --flow export.json\nvader --remember "fact" | --memories | --forget ID');
    } else if (values.remember) {
        console.log(JSON.stringify(await remember(memoryFile, values.remember)));
    } else if (values.memories) {
        console.log(JSON.stringify(await readMemories(memoryFile), null, 2));
    } else if (values.forget) {
        await forget(memoryFile, values.forget);
        console.log('Memory removed.');
    } else if (values.inspect) {
        if (!values.flow) throw new Error('--inspect requires --flow.');
        console.log(JSON.stringify(await loadFlowSummary(values.flow), null, 2));
    } else if (values.chat) {
        const historyFile = resolve('.runtime/vader/conversation.json');
        let history = [];
        try { history = JSON.parse(await readFile(historyFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
        if (!Array.isArray(history)) throw new Error('Invalid conversation history.');
        const terminal = createInterface({ input: stdin, output: stdout });
        console.log('vader — local companion. Type /exit to leave. Conversation is saved locally.');
        try {
            while (true) {
                const prompt = await terminal.question('you> ');
                if (prompt.trim() === '/exit') break;
                if (!prompt.trim()) continue;
                try {
                    const answer = await runVader({ prompt, flowFile: values.flow, model: values.model, memoryFile, internet: !values.offline, history,
                        onTool: name => console.error(`[vader tool] ${name}`) });
                    console.log(`vader> ${answer}`);
                    history.push({ role: 'user', content: prompt }, { role: 'assistant', content: answer });
                    history = history.slice(-40);
                    await mkdir(resolve('.runtime/vader'), { recursive: true });
                    await writeFile(historyFile, JSON.stringify(history, null, 2), { mode: 0o600 });
                } catch (error) { console.error(`vader: ${error.message}`); }
            }
        } finally { terminal.close(); }
    } else {
        console.log(await runVader({ prompt: positionals.join(' '), flowFile: values.flow, model: values.model, memoryFile, internet: !values.offline,
            onTool: name => console.error(`[vader tool] ${name}`) }));
    }
} catch (error) {
    console.error(`vader: ${error.message}`);
    process.exitCode = 1;
}
