import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Workspace } from '../vader/workspace.mjs';
test('model settings reject missing models without overwriting a working selection', async()=>{
    const dir=await mkdtemp(join(tmpdir(),'vader-model-selection-'));
    try{
        const workspace=new Workspace(dir,undefined,async()=>['qwen2.5:3b','custom-alias:latest']);
        await workspace.configure({model:'qwen2.5:3b',internet:false});
        await assert.rejects(workspace.configure({model:'missing-model',internet:true}),/not installed/);
        assert.equal((await workspace.state()).settings.model,'qwen2.5:3b');
        await workspace.configure({model:'custom-alias',internet:false});
        assert.equal((await workspace.state()).settings.model,'custom-alias');
    }finally{await rm(dir,{recursive:true});}
});
test('desktop conversations persist and only approved examples are exported', async () => {
    const dir=await mkdtemp(join(tmpdir(),'vader-workspace-'));
    try {
        const workspace=new Workspace(dir,async()=> 'A local answer.');
        const chat=await workspace.newChat();
        await workspace.ask({id:chat.id,prompt:'Hello'});
        assert.equal((await new Workspace(dir).state()).chats[0].messages.length,2);
        await assert.rejects(workspace.exportTraining(),/two examples/);
        await workspace.approve({prompt:'One',answer:'First'});
        await workspace.approve({prompt:'Two',answer:'Second'});
        const exported=await workspace.exportTraining();
        const text=await readFile(exported.path,'utf8');
        assert.equal(text.trim().split('\n').length,2);
        assert.ok(!text.includes('Hello'));
        await assert.rejects(workspace.configure({model:'paid:cloud',internet:true}),/cloud/);
    } finally {await rm(dir,{recursive:true});}
});
