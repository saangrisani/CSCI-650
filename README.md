# Node-RED + vader

Course repository: https://github.com/saangrisani/CSCI-650

Node-RED is the selected application for the repository-selection assignment. **vader** is a local AI companion experiment that can chat, remember useful facts, inspect a supplied flow, and look up information online. Its personality is editable in `vader/personality.txt`.

## Course work

- [Project 1 write-up](project-1/selection.md)
- [Ranked URLs for text entry](project-1/submission.txt)
- [Candidate test evidence](docs/candidate-evaluation.md)
- [Scope and current limitations](docs/PROJECT.md)
- [Verification record](docs/VERIFICATION.md)

The course repo is not an upstream Node-RED fork. The semester's testing/design changes need a real fork of https://github.com/node-red/node-red. Configuring flows or building vader alone does not replace that requirement. The full Projects 1–3 rubrics have not been supplied.

## Local prerequisites

- Node.js 22 or newer; tested with 24.19.0.
- pnpm 11 (lockfile supplied), or npm for installation without the pnpm lockfile.
- Ollama from https://ollama.com/download for AI conversations.
- A downloaded local model; default is `qwen2.5:3b` (approximately 1.9 GB download). Actual speed depends on RAM/GPU. Review the model's upstream license.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm start
```

Open http://127.0.0.1:1889. A fresh instance starts with an empty workspace. Import `examples/course-evaluation.json` using the editor's Import menu and deploy it. Request http://127.0.0.1:1889/course-eval?value=21 to check the expected result `{"result":42}`. Stop any earlier test instance using this port first, or set `NODE_RED_PORT` to another port.

With npm: `npm install`, `npm test`, `npm start`. Prefer pnpm for the checked-in dependency lock.

## Run vader with no paid API credits

Run Ollama in local-only mode. If the desktop Ollama application is already running, quit it before starting this separate server. Keep the terminal open.

PowerShell:

```powershell
$env:OLLAMA_NO_CLOUD='1'
$env:OLLAMA_HOST='127.0.0.1:11434'
ollama serve
```

Linux/macOS:

```sh
OLLAMA_NO_CLOUD=1 OLLAMA_HOST=127.0.0.1:11434 ollama serve
```

In another terminal:

```sh
ollama pull qwen2.5:3b
node vader/cli.mjs --chat
```

On Windows, `powershell -ExecutionPolicy Bypass -File scripts/start-vader.ps1` starts a local server if needed and opens the chat. This policy override applies only to that PowerShell process. A portable Ollama executable can be supplied using `-OllamaPath`.

Or use one question:

```sh
node vader/cli.mjs "Hi vader, let's get to know each other."
node vader/cli.mjs --flow examples/course-evaluation.json "Inspect this flow and suggest regression tests."
node vader/cli.mjs "Read https://nodered.org/about/ and explain what Node-RED does."
```

The model runs locally through Ollama. There are no API keys, paid inference calls, or automatic cloud fallback. Downloads and optional internet tools use your internet connection; local compute consumes electricity. A cloud model is not a substitute for the required downloaded model.

### Memory and learning

```sh
node vader/cli.mjs --remember "My strongest languages are C and C++."
node vader/cli.mjs --memories
node vader/cli.mjs --forget MEMORY_ID
node vader/cli.mjs --offline "Let's talk without internet tools."
```

vader can save facts through its memory tool. `--chat` also keeps recent conversation turns across restarts. Memory and conversation files stay under ignored `.runtime/vader/`. Edit these files to correct or remove stored information. Recent memories and conversation turns are supplied as context; this is retrieval/context-based learning, not automatic training or modification of model weights. Only the latest 30 memories and 12 conversation messages are included in an individual request.

Internet tools can search Wikipedia and read public HTTPS text pages. This is not a full browser or general search-engine crawler. Web requests disclose the requested URL/search to the destination; the model's conversation is not sent to a hosted model. Web content may be wrong or outdated. Read requests do not reach local/private network devices. Use `--offline` to disable these tools.

The initial tools do not execute shell commands, edit application code, deploy flows, or control physical devices. These capabilities can be designed separately when there is a specific household task. This is an implementation scope, not a claim that learning requires permanent personality restrictions.

### Connect Node-RED to vader

Keep Ollama running, then start `node vader/server.mjs --flow examples/course-evaluation.json`. In Node-RED, import and deploy `examples/vader-review.json`. Send a JSON POST to `http://127.0.0.1:1889/vader` with a body such as `{"prompt":"Inspect the supplied flow and explain it."}`. The flow calls vader's local API on port 1891 and returns its answer. The API only accepts a prompt; the reviewed flow is chosen when the server starts. Both services bind to the local computer. HTTP questions are independent; use CLI chat for ongoing conversation history.

For deterministic flow inspection without any model:

```sh
node vader/cli.mjs --inspect --flow examples/course-evaluation.json
```

## Local data and repository hygiene

Keep credentials, real device identifiers, recordings, flows containing private configuration, model weights, and personal memories out of Git. `.runtime/`, `.env*`, `models/`, and `node_modules/` are ignored. Review a flow export before sharing it. The supplied examples use no device accounts.

The Jetson remains the intended future always-on host; the laptop is a development/test client. Jetson hardware, software compatibility, deployment, and household integrations remain unverified.
