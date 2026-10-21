# Optional local model retraining

vader has two ways to improve: memory/retrieval for facts and context, and optional LoRA/QLoRA fine-tuning for repeated styles/tasks. Fine-tuning changes trainable model parameters. It can help, but it can also reduce quality; a tiny dataset is not evidence of improvement. It does not require paid inference credits. Training consumes your own GPU time, memory, storage and electricity.

## Collect approved examples

In the desktop app, choose **Use as a learning example** below an answer. Correct the question/answer in **Learning studio**, then approve it. Export once there are at least two examples. Two examples suffice only to test the data format; gather substantially more diverse, accurate examples for a useful experiment. Personal conversations are not automatically used for training and retrieved internet pages are not automatically trusted training labels.

Exports remain local. In development they are under `.runtime/vader/`; in the portable app they are under Electron's per-user app data directory (the export message shows the exact path). The export contains only approved pairs. Do not commit private datasets or weights.

## Validate without training dependencies

```sh
python training/train_lora.py --dataset PATH/approved-training.jsonl --validate-only
```

## Train a candidate locally

Use a separate Python environment. A compatible CUDA PyTorch + bitsandbytes environment is needed for QLoRA. WSL/Linux is the initial target; native Windows and Jetson CUDA/package compatibility need checking. The laptop's 8 GB RTX 4060 is a candidate for a small quantized model, not a guarantee that a particular job fits. Unload Ollama models/close GPU applications before training.

Download the original Hugging Face weights/tokenizer for the exact model architecture you choose, such as `Qwen/Qwen2.5-3B-Instruct`, into a local directory. Review its model license. Training cannot start from the quantized Ollama GGUF alone. Initial package/model downloads need internet. The trainer itself sets Hugging Face offline mode and sends no dataset to a service.

```sh
python -m venv .runtime/train-venv
# Activate the environment for your OS, then install a compatible CUDA PyTorch build.
python -m pip install -r training/requirements.txt
python training/train_lora.py --dataset PATH/approved-training.jsonl --base PATH/local-hf-base --output .runtime/training/candidate-001 --qlora --steps 25
```

The script trains an adapter, holds out 20% (at least one example), and records evaluation loss before/after. It does not overwrite the base model, upload data, or activate the candidate. These losses alone are insufficient: compare factuality, companion style, memory use, internet tools, and flow inspection against the original using separate prompts.

## Candidate import and rollback

After a successful training run, merge into another directory (CPU merging needs several GB of RAM):

```sh
python training/merge_adapter.py --base PATH/local-hf-base --adapter .runtime/training/candidate-001 --output .runtime/training/merged-001
```

Ollama supports importing supported Safetensors architectures with a Modelfile whose `FROM` points to the merged directory. Template/tool-call compatibility must be checked for the exact imported architecture and Ollama version. Use a new local model name such as `vader-candidate-001`; do not replace `qwen2.5:3b`. If direct import is unsupported, model-specific conversion is additional work. No candidate import has been verified here.

Select the candidate in the desktop settings or with CLI `--model vader-candidate-001`. Roll back by selecting `qwen2.5:3b` again. Changing a model does not erase memories. A separate [background worker](BACKGROUND-LEARNING.md) can collect public datasets and train candidate adapters automatically; it does not auto-promote them into the running chat model.

References: https://huggingface.co/docs/peft/developer_guides/quantization and https://docs.ollama.com/import
