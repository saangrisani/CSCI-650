# Verification record — October 20, 2026

## Repository implementation

- Windows laptop, Node.js 24.19.0; Node-RED dependency pinned to 5.0.8.
- `pnpm install` completed using pnpm 11.25.0; dependency lock committed.
- `node --test tests/*.test.mjs`: 12 passed, 0 failed. Tests cover flow validation, information omitted from summaries, tool results, unsupported tool/path requests, bounded model rounds, no fallback on backend failure, memory persistence/deduplication/removal, memory recall context, private-address rejection, offline internet-tool disabling, and HTTP request/error handling. Model responses in these automated tests are mocked.
- No tests or modifications to upstream Node-RED source have been made. The application fork and semester refactoring remain separate work.

## Live local checks (not mocked)

- Ollama 0.40.6 started on 127.0.0.1:11434 with `OLLAMA_NO_CLOUD=1`; startup log confirmed cloud disabled and detected the NVIDIA GeForce RTX 4060 Laptop GPU with 8 GiB VRAM.
- Default final model: `qwen2.5:3b`, digest `357c53fb659c5076de1d65ccb0b397446227b71a42be9d1603d46168015c9e4b`.
- Live introduction returned a normal companion greeting.
- A flow-inspection prompt invoked `inspect_flow`; the reply identified the four node types and no dangling wires.
- The memory tool saved a disposable test fact (verification mascot = green robot) into an ignored verification memory file. A separate request recalled the fact. This establishes context-based memory recall, not model training.
- Internet helper read https://nodered.org/about/ and Wikipedia search returned results for Node-RED. A live model request invoked `read_web_page` and summarized the retrieved page.
- A fresh repository-based Node-RED instance ran on 127.0.0.1:1892 (alternate test port because an earlier evaluation used 1889).
- Imported/deployed both supplied example flows through the local API. GET /course-eval?value=21 returned `{"result":42}`.
- vader API ran on 127.0.0.1:1891. POST /vader through Node-RED returned a generated vader answer describing four nodes, two connections and no dangling wires. This exercised Node-RED -> local vader HTTP API -> local model -> inspect_flow tool -> generated response -> Node-RED.
- `git diff --check` passed before publication.

## Model evaluation limits

Llama 3.2 1B produced unreliable tool formatting. Qwen3 4B also produced unsuitable reasoning/template output in this environment. Qwen2.5 3B passed the final selected smoke checks. A small model can still make mistakes, ignore instructions, miss a requested detail, or fail to call a tool appropriately. These checks do not establish comprehensive agent reliability.

## Not verified

Personal GUI preference review by the student, full Projects 1–3 rubrics, Jetson compatibility/performance, physical device integrations, background service installation, fine-tuning, autonomous continuous research, and household control. No vendor account credentials are used. The downloaded runtime/model files and personal runtime data are not committed.
