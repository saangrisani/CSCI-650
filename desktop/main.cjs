const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
let workspace, win, child;
const root = path.join(__dirname, '..');
const dataRoot = process.env.VADER_DATA_DIR ? path.resolve(process.env.VADER_DATA_DIR) : (app.isPackaged ? path.join(app.getPath('userData'), 'vader') : path.join(root, '.runtime', 'vader'));
async function status() {
    try {
        const response = await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(2000) });
        if (!response.ok) throw Error('Ollama is unavailable.');
        return { online: true, models: (await response.json()).models.map(x => x.name) };
    } catch { return { online: false, models: [] }; }
}
async function startModelServer() {
    if ((await status()).online) return status();
    let backend = await workspace.read('backend.json', {});
    let exe = backend.executable || path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama', 'ollama.exe');
    try { await fs.access(exe); } catch {
        try { exe = (await fs.readFile(path.join(root, '.runtime', 'ollama-path.txt'), 'utf8')).trim(); }
        catch {
            const selected = await dialog.showOpenDialog(win, { title: 'Choose your installed Ollama executable', properties: ['openFile'], filters: [{ name: 'Ollama executable', extensions: ['exe'] }] });
            if (selected.canceled) return status();
            exe = selected.filePaths[0];
        }
    }
    await workspace.write('backend.json', { ...backend, executable: exe });
    child = spawn(exe, ['serve'], { windowsHide: true, stdio: 'ignore', env: { ...process.env, ...(backend.modelsDirectory ? { OLLAMA_MODELS: backend.modelsDirectory } : {}), OLLAMA_NO_CLOUD: '1', OLLAMA_HOST: '127.0.0.1:11434' } });
    child.on('error', () => {});
    for (let i = 0; i < 20; i++) { if ((await status()).online) return status(); await new Promise(r => setTimeout(r, 500)); }
    return status();
}
if (app.requestSingleInstanceLock()) {
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
app.whenReady().then(async () => {
    const { Workspace } = await import(pathToFileURL(path.join(root, 'vader', 'workspace.mjs')));
    workspace = new Workspace(dataRoot);
    const transfer = await import(pathToFileURL(path.join(root, 'vader', 'transfer.mjs')));
    const allowed = {
        state: () => workspace.state(), newChat: () => workspace.newChat(), ask: value => workspace.ask(value),
        configure: value => workspace.configure(value), approve: value => workspace.approve(value),
        exportTraining: () => workspace.exportTraining(), forget: id => workspace.removeMemory(id),
        exportCompanion: async passphrase => {
            if (workspace.busy) throw Error('Wait for the current answer before exporting.');
            const selected = await dialog.showSaveDialog(win, { title: 'Export encrypted vader transfer', defaultPath: 'vader.vader', filters: [{ name: 'Encrypted vader transfer', extensions: ['vader'] }] });
            if (selected.canceled) return { canceled: true };
            return transfer.exportVader(dataRoot, selected.filePath, passphrase);
        },
        importCompanion: async passphrase => {
            const selected = await dialog.showOpenDialog(win, { title: 'Choose encrypted vader transfer', filters: [{ name: 'Encrypted vader transfer', extensions: ['vader'] }], properties: ['openFile'] });
            if (selected.canceled) return { canceled: true };
            const target = await dialog.showOpenDialog(win, { title: 'Choose parent folder for restored vader', properties: ['openDirectory'] });
            if (target.canceled) return { canceled: true };
            const destination = path.join(target.filePaths[0], `vader-restored-${Date.now()}`);
            return transfer.importVader(selected.filePaths[0], destination, passphrase);
        },
        learningStatus: async () => {
            const backend = await workspace.read('backend.json', {});
            try { return JSON.parse(await fs.readFile(path.join(backend.learningFolder || path.join(root, '.runtime', 'autolearn'), 'status.json'), 'utf8')); }
            catch (error) { if (error.code === 'ENOENT') return { state: 'not_started' }; throw error; }
        },
        status, start: startModelServer
    };
    ipcMain.handle('vader', async (event, method, value) => {
        if (event.sender !== win.webContents || !Object.hasOwn(allowed, method)) throw Error('Unknown request.');
        try { return { ok: true, value: await allowed[method](value) }; }
        catch (error) { return { ok: false, error: error.message }; }
    });
    win = new BrowserWindow({ title: 'vader', width: 1180, height: 820, minWidth: 800, minHeight: 620,
        backgroundColor: '#131519', autoHideMenuBar: true,
        webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', event => event.preventDefault());
    await win.loadFile(path.join(__dirname, 'index.html'));
});
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { if (child) child.kill(); });
} else app.quit();
