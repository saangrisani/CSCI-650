let data, current, view='chat', working=false;
const $=id=>document.getElementById(id);
function el(tag,text,cls){const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;}
async function call(method,value){const r=await window.vader.call(method,value);if(!r.ok)throw Error(r.error);return r.value;}
function notice(text=''){$('notice').textContent=text;}
async function refresh(){data=await call('state');render();}
function render(){
    $('chats').replaceChildren();
    for(const c of data.chats){const b=el('button',c.title,c.id===current?'selected':'');b.onclick=()=>{current=c.id;view='chat';render();};$('chats').append(b);}
    $('composer').hidden=view!=='chat';$('content').replaceChildren();
    $('heading').textContent=view==='chat'?'vader':({memories:'Memories',learning:'Learning studio',settings:'Settings'})[view];
    if(view==='chat')renderChat();else renderPanel();
}
function renderChat(){
    const chat=data.chats.find(c=>c.id===current);
    if(!chat?.messages.length){const wrap=el('div','','welcome');wrap.append(el('div','HELLO, I’M VADER','eyebrow'),el('h1','What’s on your mind?'),el('p','Talk through an idea, learn something new, or build something for your home. We can pick up where we left off.'));
        const suggestions=el('div','','suggestions');for(const text of ['Let’s get to know each other','Help me plan a home automation','Explain something I’m learning','What do you remember about me?']){const b=el('button',text);b.onclick=()=>{$('message').value=text;$('message').focus();};suggestions.append(b);}wrap.append(suggestions);$('content').append(wrap);return;}
    chat.messages.forEach((m,i)=>{const box=el('div','',`msg ${m.role}`);if(m.role==='assistant')box.append(el('div','VADER','who'));box.append(el('div',m.content));
        if(m.role==='assistant'&&chat.messages[i-1]?.role==='user'){const b=el('button','Use as a learning example','approve');b.onclick=()=>{view='learning';render();$('question').value=chat.messages[i-1].content;$('answer').value=m.content;};box.append(b);}$('content').append(box);});
    $('content').scrollTop=$('content').scrollHeight;
}
function renderPanel(){
    const p=el('div','','panel');$('content').append(p);
    if(view==='memories'){p.append(el('h1','What vader remembers'),el('p','Facts are stored on this device. You can correct a memory by removing it and telling vader the updated fact.'));
        if(!data.memories.length)p.append(el('p','No saved memories yet. Ask vader to remember something useful.'));
        for(const m of data.memories){const card=el('div',m.text,'card'),b=el('button','Forget');b.onclick=async()=>{await call('forget',m.id);await refresh();};card.append(b);p.append(card);}return;}
    if(view==='learning'){p.append(el('h1','Help vader improve'),el('p','Review or correct answers for your private training dataset. The separate background worker uses public datasets; candidate adapters do not replace your current chat model.'),el('p',`${data.examples.length} approved examples`));
        const bg=el('div','Background worker: checking status…','card');p.append(bg);call('learningStatus').then(s=>{bg.textContent=`Background public-data worker: ${s.state}${s.reason?' — '+s.reason:''}. ${s.candidate?'Candidate: '+s.candidate:''}`;}).catch(e=>{bg.textContent=e.message;});
        for(const [id,label] of [['question','Question'],['answer','Preferred answer']]){p.append(el('label',label));const a=el('textarea','');a.id=id;p.append(a);}
        const save=el('button','Approve example');save.onclick=async()=>{try{await call('approve',{prompt:$('question').value,answer:$('answer').value});notice('Example saved locally.');await refresh();}catch(e){notice(e.message);}};
        const exp=el('button','Export training dataset');exp.onclick=async()=>{try{const r=await call('exportTraining');notice(`Exported ${r.count} examples to ${r.path}`);}catch(e){notice(e.message);}};p.append(save,document.createTextNode(' '),exp,el('p','Retraining uses the optional local LoRA workflow in docs/RETRAINING.md. Start with curated examples and compare a candidate against your original model.'));return;}
    p.append(el('h1','Make yourself at home'),el('p','Your model runs through Ollama on this computer. Download a local model first; no hosted model or paid API is used.'));
    p.append(el('label','Installed local model'));const model=el('select','');model.id='model';const configured=el('option',`${data.settings.model} (current)`);configured.value=data.settings.model;model.append(configured);p.append(model,el('p','Choose an installed model here. The model name is separate from your companion’s personality/name.'));
    call('status').then(s=>{for(const name of s.models){if(name===data.settings.model)continue;const option=el('option',name);option.value=name;model.append(option);}if(s.online&&!s.models.some(name=>name===data.settings.model||name===`${data.settings.model}:latest`))configured.textContent=`${data.settings.model} (not installed)`;}).catch(e=>notice(e.message));
    const label=el('label',''),check=el('input','');check.type='checkbox';check.checked=data.settings.internet;label.append(check,document.createTextNode(' Allow internet lookup'));p.append(label);
    const save=el('button','Save settings');save.onclick=async()=>{try{await call('configure',{model:model.value,internet:check.checked});notice('Settings saved.');await refresh();}catch(e){notice(e.message);}};
    const start=el('button','Start local Ollama');start.onclick=async()=>{try{const s=await call('start');$('status').textContent=s.online?'● Local model connected':'Model server unavailable';}catch(e){notice(e.message);}};p.append(save,document.createTextNode(' '),start,el('p','Personality is editable in vader/personality.txt. CLI: node vader/cli.mjs --chat. Jetson use requires separate hardware verification.'));
    p.append(el('h1','Take vader with you'),el('p','Transfer memories, conversations, approved examples, settings and personality in an encrypted file. Models and machine-specific executable paths are separate. Restored companions start with internet lookup off.'));
    const password=el('input','');password.type='password';password.placeholder='Transfer passphrase (12+ characters)';password.setAttribute('aria-label','Transfer passphrase');p.append(password);
    for(const [method,title] of [['exportCompanion','Export companion'],['importCompanion','Restore companion to a new folder']]){const b=el('button',title);b.onclick=async()=>{try{const r=await call(method,password.value);password.value='';if(!r.canceled)notice(`${title}: ${r.path}. ${method==='importCompanion'?'Launch the CLI with --data-dir pointing to this folder, or set VADER_DATA_DIR before launching the app.':''}`);}catch(e){notice(e.message);}};p.append(b,document.createTextNode(' '));}
}
$('new').onclick=async()=>{const c=await call('newChat');current=c.id;view='chat';notice();await refresh();};
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>{view=b.dataset.view;notice();render();};
$('message').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('composer').requestSubmit();}};
$('composer').onsubmit=async e=>{e.preventDefault();if(working||!$('message').value.trim())return;working=true;$('send').disabled=true;const prompt=$('message').value;$('message').value='';notice('vader is thinking…');
    try{if(!current){const c=await call('newChat');current=c.id;}await call('ask',{id:current,prompt});notice();await refresh();}catch(error){notice(error.message);$('message').value=prompt;}finally{working=false;$('send').disabled=false;$('message').focus();}};
(async()=>{await refresh();current=data.chats[0]?.id;render();const s=await call('status');$('status').textContent=s.online?'● Local model connected':'○ Ollama is offline';})().catch(e=>notice(e.message));
