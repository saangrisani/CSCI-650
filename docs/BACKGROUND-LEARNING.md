# My background learning worker

I want vader to keep working with public training data without me reviewing every row or manually launching each training job. The worker in `training/autolearn.py` handles scheduled collection, filtering, dataset provenance, hardware checks, candidate training, and held-out loss evaluation.

It uses my local compute and has no paid training service or inference fallback. Public dataset downloads contact Hugging Face; my conversations, memories and approved personal examples are not inputs to this worker and are not uploaded. The normal chat internet toggle does not stop this separately enabled public-dataset downloader.

## What runs automatically

- Fetch revision-pinned JSONL sources from the configurable registry in `training/autolearn.example.json`.
- Discover up to two additional public Hugging Face instruction datasets automatically, requiring supported license metadata and a JSONL file. Missing formats/licenses are skipped. Discovery or source-download failures are logged without blocking a working configured source.
- Check declared license against the worker's supported set; record provenance and checksum. This is metadata screening, not a guarantee that every record is correct or free of third-party rights.
- Normalize configured instruction/context/answer fields, reject malformed/empty/overlong entries, deduplicate, and choose a reproducible daily sample (128 examples by default).
- Wait for AC power, sufficient disk space and free CUDA memory.
- Train a separate QLoRA candidate for a bounded job (25 steps by default, one-hour timeout).
- Compare held-out loss before/after, recording the candidate as ready or rejected. The worker repeats daily, with 15-minute prerequisite retries.

This is not support for every dataset format on the internet. Discovery searches public Hugging Face instruction datasets; it is not an unrestricted web crawler. Additional compatible public JSONL datasets can be configured once with field mappings, revision and declared license. No remote dataset scripts are executed. Discovered rows must expose recognized instruction/prompt/question and response/output/answer fields.

The initial source is [Databricks Dolly 15k](https://huggingface.co/datasets/databricks/databricks-dolly-15k), declared CC BY-SA 3.0. Provenance stays beside downloaded data. Dataset/model license obligations still apply to distribution of derivatives.

## Start, status, stop

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-learning.ps1
powershell -ExecutionPolicy Bypass -File scripts/start-learning.ps1 -Status
powershell -ExecutionPolicy Bypass -File scripts/start-learning.ps1 -Stop
```

The start command launches a hidden background process; closing the chat app does not stop it. Stop requests are checked between cycles; an active training subprocess is allowed to finish (at most its timeout). Status and logs are under ignored `.runtime/autolearn/`.

`scripts/install-learning-startup.ps1` installs a per-user Windows login shortcut. Disable it using Windows Startup Apps or remove only the named `Vader Background Learning.lnk` entry from the user's Startup folder. The worker runs while the computer is awake; it does not wake a sleeping computer. An OS-held file lock prevents duplicate workers and is released when the process exits or crashes.

Linux/Jetson: run the worker with the compatible training environment's Python, using `--once` for a single attempt or no flag for the loop. Hardware/JetPack and training package compatibility must be verified on the actual Jetson before enabling it there. No Jetson service is installed here.

## Prerequisites and limits

The local training Python environment needs a compatible CUDA PyTorch build, Transformers, PEFT, Accelerate and bitsandbytes. Local original Hugging Face weights/tokenizer are required at the configured base path; Ollama's inference GGUF is not the training base. See [retraining](RETRAINING.md).

For the Windows CUDA environment, `training/requirements-windows-cuda.txt` pins the selected packages in one install transaction. Use a fresh virtual environment to avoid mixing CPU and CUDA Torch installations. Those Windows wheels are not a Jetson installation recipe.

`training/download_base.py` downloads the pinned Qwen base and checks large-file hashes. The Windows scripts use `.runtime/train-venv` by default, or the interpreter path saved in ignored `.runtime/training-python.txt` when an alternate local environment is needed.

The worker does not unload models used by an active chat, so it may wait for memory to become available. Free-memory checks are a snapshot and cannot prevent every race or out-of-memory failure. A failed job records its error; it does not switch to paid compute. Disk limits cause the worker to wait rather than delete user checkpoints.

## What it does not do yet

Candidates are separate adapters, not automatically activated chat models. Lower held-out loss does not establish better companionship, factuality, or tool use. Automatic merge/import, behavioral regression testing, and promotion into the running Ollama model are not implemented. My existing model remains usable while candidates are assessed.

Every cycle currently starts from the configured base model rather than continuing from the previous adapter. This creates independent experiments; it is not cumulative self-improvement or continuous online training of the live companion.
