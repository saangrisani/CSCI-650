# Moving vader and understanding privacy

## What is local

Model inference goes to Ollama on 127.0.0.1. The supplied server launcher disables Ollama cloud features; an already-running server must be configured separately. The application has no paid model fallback, analytics integration, automatic cloud-memory sync, or conversation-upload feature. Source is published on GitHub; personal runtime files are ignored and were not published.

That is not a blanket guarantee that no information ever leaves the computer. With internet lookup enabled, Wikipedia receives generated search terms and websites receive URLs, the normal network/IP information, and vader's user-agent. Generated searches can contain personal information from conversation context. The companion does not currently ask for approval before each web request. Do not enable internet tools during sensitive conversations if that disclosure is unacceptable.

Turn off **Allow internet lookup** and save Settings to disable vader's web tools. CLI `--offline` disables them for that invocation. This controls vader's tools, not the operating system, package manager, or independently running Ollama software. Model/package downloads contact their providers. No application can promise protection against a compromised computer or other software reading local files.

## Encrypted companion transfers

Desktop Settings provides **Export companion** and **Restore companion to a new folder**. Choose a passphrase of at least 12 characters. Export produces a `.vader` file encrypted with AES-256-GCM using a scrypt-derived key. Keep the passphrase separately; there is no password recovery. Export files are ignored by Git.

Included: saved memories, desktop chats, CLI conversation history, approved training examples, model/settings selection, and personality. Excluded: executable paths, credentials/env files, runtime logs, Ollama binaries, model weights, and trained adapters. Remember that chats can themselves contain sensitive text; protect both the original local files and the transfer passphrase.

Import validates/decrypts into a new folder and refuses to overwrite an existing destination. Imported internet lookup is off; re-enable it deliberately if desired. The passphrase is handled by the transfer code and is not sent to the language model.

CLI export/import (passphrase is entered interactively without echo):

```sh
node vader/transfer-cli.mjs export .runtime/vader /path/to/vader.vader
node vader/transfer-cli.mjs import /path/to/vader.vader /path/to/new-vader-data
node vader/cli.mjs --data-dir /path/to/new-vader-data --chat
```

Export/import require the code from this repository but not Ollama or a GPU. On Windows, use Windows paths instead of the examples above. For automation only, the transfer CLI accepts `VADER_TRANSFER_PASSPHRASE` from the environment; do not put a passphrase into shell history or commit it.

To use a restored folder with the Windows app:

```powershell
$env:VADER_DATA_DIR='D:\MyVaderData'
& 'C:\path\to\Vader-Windows\Vader.exe'
```

Fully quit a running app before launching with a different data directory; otherwise the existing instance remains active. You can also set `VADER_DATA_DIR` before running the CLI. A trusted local/USB drive is suitable; simultaneous use of one folder by multiple processes or computers is not supported. This is transfer/backup, not live synchronization.

## Moving the model and executable

Windows-to-Windows: copy the entire portable app folder, not only Vader.exe. Install/copy Ollama separately, then download the same model or copy its complete Ollama model store and set `OLLAMA_MODELS`. Verify licenses and integrity before moving third-party model files. Trained weights/adapters should be treated as private because they can encode training information.

Windows-to-Jetson: the Windows executable will not run on Jetson's Linux/ARM system. Use the repository's cross-platform CLI and a compatible local Linux/ARM model runtime. Transfer companion data using the same encrypted format. Actual Jetson model/runtime compatibility and memory requirements remain unverified; do not assume this laptop's training setup works on Jetson.
