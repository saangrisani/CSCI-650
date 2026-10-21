import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { summarizeFlow, runVader, validateModel, finalAnswer } from '../vader/agent.mjs';

const flowFile = fileURLToPath(new URL('../examples/course-evaluation.json', import.meta.url));
test('model template reasoning is separated from final answers', () => {
    assert.equal(finalAnswer('<think>draft</think>Final answer.'), 'Final answer.');
    assert.equal(finalAnswer('draft</think>Final answer.'), 'Final answer.');
    assert.throws(() => finalAnswer('<think>unfinished'), /final answer/);
});
test('flow inspection identifies broken connections and omits private node properties', () => {
    const result = summarizeFlow([{ id: 'a', type: 'function', token: 'private-test-value', wires: [['missing']] }]);
    assert.deepEqual(result.danglingConnections, [{ from: 'a', to: 'missing' }]);
    assert.equal(result.connections, 1);
    assert.ok(!JSON.stringify(result).includes('private-test-value'));
});
test('malformed wiring and duplicate ids are rejected', () => {
    assert.throws(() => summarizeFlow([{ id: 'a', type: 'function', wires: ['b'] }]), /wires/);
    assert.throws(() => summarizeFlow([{ id: 'a', type: 'tab' }, { id: 'a', type: 'tab' }]), /duplicate/);
});
test('agent returns inspected data to the model before answering', async () => {
    let rounds = 0;
    const answer = await runVader({ prompt: 'Inspect this flow.', flowFile, chat: async body => {
        if (++rounds === 1) return { role: 'assistant', content: '', tool_calls: [{ function: { name: 'inspect_flow', arguments: {} } }] };
        const result = JSON.parse(body.messages.at(-1).content);
        assert.equal(result.connections, 2);
        assert.equal(result.nodes, 4);
        return { role: 'assistant', content: 'The flow has two connections.' };
    } });
    assert.match(answer, /two connections/);
    assert.equal(rounds, 2);
});
test('agent rejects arbitrary tool execution and model-supplied file paths', async () => {
    for (const fn of [{ name: 'exec', arguments: {} }, { name: 'inspect_flow', arguments: { path: '../secret' } }]) {
        await assert.rejects(runVader({ prompt: 'Review.', flowFile, chat: async () => ({ role: 'assistant', tool_calls: [{ function: fn }] }) }));
    }
});
test('model loop has a finite budget', async () => {
    let calls = 0;
    await assert.rejects(runVader({ prompt: 'Review.', flowFile, chat: async () => {
        calls++;
        return { role: 'assistant', tool_calls: [{ function: { name: 'inspect_flow', arguments: {} } }] };
    } }), /four model rounds/);
    assert.equal(calls, 4);
});
test('cloud model names rejected and backend errors propagate without fallback', async () => {
    assert.throws(() => validateModel('some-model:cloud'), /cloud/);
    let calls = 0;
    await assert.rejects(runVader({ prompt: 'Hello', chat: async () => { calls++; throw new Error('offline'); } }), /offline/);
    assert.equal(calls, 1);
});
