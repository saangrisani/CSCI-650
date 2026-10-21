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

## Desktop and optional training addition

- Electron 44.9.3 installed and a portable Windows application built using the checked-in packaging script.
- Automated suite expanded to 13 passing tests, including persistent desktop conversations and export containing only explicitly approved training examples.
- Optional training/merge scripts passed Python compilation. Dependency-free dataset validation accepted two synthetic examples and reported `training_started: false`.
- No Torch/Transformers/PEFT training environment was installed, no parameter-training run was performed, and no trained model was imported. Training hardware/package compatibility and useful quality improvements remain unverified.
- The CLI remains available without Electron and without any paid API. Jetson execution remains unverified.
- Native Windows GUI check: opened the portable app, entered a home-automation question through its composer, clicked Send, and verified a generated answer appeared with a saved conversation in the sidebar. Ollama was already running locally for this check.

## Portability addition

- Added encrypted companion export/import and shared data-directory selection for desktop and CLI. Model/runtime files are separate.
- Transfer test verifies encrypted round trip, missing machine paths, rejection of an incorrect passphrase, destination preservation, and internet tools disabled in restored settings.
- Suite now has 14 passing tests. New transfer GUI controls have not received a separate interactive walkthrough; transfer functionality was checked through automated tests.

## Background public-dataset worker

- Live collection fetched the pinned Dolly dataset, recorded SHA-256 `2df9083338b4abd6bceb5635764dab5d833b393b55759dffb0959b6fcbf794ec`, and found 13,543 rows meeting the normalization limits. A reproducible 128-example sample was written locally.
- Live public-source discovery found another JSONL instruction source; its download exceeded the 32 MB budget and was skipped without blocking the configured source. Oversized revisions are marked to avoid repeated oversized downloads.
- Five Python worker tests pass, covering filtering/deduplication, finite/improving evaluation checks, collection-only behavior, prerequisite waiting, and battery-power deferral. The 14 existing agent/app tests also pass (19 total).
- Downloaded pinned original Qwen2.5 3B Instruct Safetensors/tokenizer files to the ignored local training directory; the downloader checked available large-file hashes.
- Installed a per-user Windows login startup shortcut and started the background worker independently of the chat app. Its PID was checked live and status reported `waiting` / `Waiting for AC power`; no training job has started on battery.
- A conflicting first Torch environment required a clean isolated environment. The selected clean environment imported Torch 2.11.0+cu128, Transformers 4.57.6, PEFT 0.21.2 and bitsandbytes 0.50.2. CUDA detected the RTX 4060, a small 4-bit CUDA forward check returned shape `(1, 16)`, and `pip check` reported no broken requirements. This is not a full-model training test.
- No full training job was run on battery. Collection and scheduler checks passed; useful trained-model quality remains unverified.
- No candidate activation, cumulative live-model improvement, Jetson training, or arbitrary-web dataset support is claimed.
