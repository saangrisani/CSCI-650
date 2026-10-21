module.exports = {
    uiHost: '127.0.0.1',
    uiPort: Number(process.env.NODE_RED_PORT || 1889),
    flowFile: 'flows.json',
    telemetry: { enabled: false },
    editorTheme: { projects: { enabled: false } }
};
