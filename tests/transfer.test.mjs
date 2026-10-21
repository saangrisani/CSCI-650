import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportVader, importVader } from '../vader/transfer.mjs';
test('encrypted transfer moves companion data, omits machine paths, rejects wrong passwords and preserves destinations', async()=>{
    const root=await mkdtemp(join(tmpdir(),'vader-transfer-'));
    try{
        const source=join(root,'source'), restored=join(root,'restored'), archive=join(root,'companion.vader');
        await mkdir(source);await writeFile(join(source,'memory.json'),JSON.stringify([{id:'test',text:'private-marker'}]));
        await writeFile(join(source,'settings.json'),JSON.stringify({model:'qwen2.5:3b',internet:true}));
        await writeFile(join(source,'backend.json'),'machine-path-must-not-transfer');
        await exportVader(source,archive,'test passphrase 123');
        assert.ok(!(await readFile(archive,'utf8')).includes('private-marker'));
        await assert.rejects(importVader(archive,restored,'wrong passphrase 123'),/passphrase/);
        await importVader(archive,restored,'test passphrase 123');
        assert.match(await readFile(join(restored,'memory.json'),'utf8'),/private-marker/);
        assert.equal(JSON.parse(await readFile(join(restored,'settings.json'),'utf8')).internet,false);
        await assert.rejects(readFile(join(restored,'backend.json')),/ENOENT/);
        await assert.rejects(importVader(archive,restored,'test passphrase 123'),/already exists/);
        await assert.rejects(exportVader(source,archive,'test passphrase 123'),/EEXIST/);
    }finally{await rm(root,{recursive:true});}
});
