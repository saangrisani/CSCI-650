"""Optional local LoRA/QLoRA training. No model upload, paid API, or auto-activation."""
import argparse
import json
import os
from pathlib import Path


def read_examples(path):
    records = []
    for number, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        item = json.loads(line)
        messages = item.get("messages")
        if (not isinstance(messages, list) or len(messages) != 2
                or [x.get("role") for x in messages] != ["user", "assistant"]
                or any(not isinstance(x.get("content"), str) or not x["content"].strip()
                       or len(x["content"]) > 8000 for x in messages)):
            raise ValueError(f"Invalid approved example on line {number}")
        records.append(item)
    if len(records) < 2:
        raise ValueError("Need at least two approved examples; use substantially more for useful training.")
    return records


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--base", help="Local Hugging Face model directory, not an Ollama GGUF")
    parser.add_argument("--output", default=".runtime/training/vader-candidate")
    parser.add_argument("--validate-only", action="store_true")
    parser.add_argument("--qlora", action="store_true", help="Use a compatible CUDA GPU and bitsandbytes 4-bit base")
    parser.add_argument("--steps", type=int, default=25)
    args = parser.parse_args()
    examples = read_examples(args.dataset)
    if args.validate_only:
        print(json.dumps({"valid": True, "approved_examples": len(examples), "training_started": False}))
        return
    if not args.base or not Path(args.base).is_dir():
        parser.error("--base must point to a previously downloaded local Hugging Face model directory")
    if args.steps < 1 or args.steps > 10000:
        parser.error("--steps must be between 1 and 10000")
    output = Path(args.output)
    if output.exists():
        parser.error("Output already exists. Choose a new directory to preserve earlier checkpoints.")
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
    os.environ["WANDB_DISABLED"] = "true"
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, Trainer, TrainingArguments
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

    if args.qlora and not torch.cuda.is_available():
        parser.error("QLoRA requires a working, compatible CUDA PyTorch environment")
    tokenizer = AutoTokenizer.from_pretrained(args.base, local_files_only=True, trust_remote_code=False)
    if tokenizer.pad_token_id is None:
        tokenizer.pad_token = tokenizer.eos_token
    kwargs = {"local_files_only": True, "trust_remote_code": False}
    if args.qlora:
        kwargs.update(device_map={"": 0}, quantization_config=BitsAndBytesConfig(
            load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_compute_dtype=torch.float16))
    model = AutoModelForCausalLM.from_pretrained(args.base, **kwargs)
    if args.qlora:
        model = prepare_model_for_kbit_training(model)
    model = get_peft_model(model, LoraConfig(r=8, lora_alpha=16, lora_dropout=0.05,
        target_modules="all-linear", task_type="CAUSAL_LM"))
    model.config.use_cache = False

    def encode(example):
        messages = example["messages"]
        prefix = tokenizer.apply_chat_template(messages[:-1], tokenize=False, add_generation_prompt=True)
        full = tokenizer.apply_chat_template(messages, tokenize=False)
        ids = tokenizer(full, add_special_tokens=False, truncation=True, max_length=512)["input_ids"]
        prefix_len = len(tokenizer(prefix, add_special_tokens=False)["input_ids"])
        labels = [-100] * min(prefix_len, len(ids)) + ids[prefix_len:]
        if all(x == -100 for x in labels):
            return None
        padding = 512 - len(ids)
        return {"input_ids": torch.tensor(ids + [tokenizer.pad_token_id] * padding),
                "attention_mask": torch.tensor([1] * len(ids) + [0] * padding),
                "labels": torch.tensor(labels + [-100] * padding)}

    encoded = [encoded for item in examples if (encoded := encode(item)) is not None]
    if len(encoded) < 2:
        raise ValueError("Too few examples fit the training context after tokenization")
    holdout = max(1, len(encoded) // 5)
    trainer = Trainer(model=model, args=TrainingArguments(output_dir=str(output),
        max_steps=args.steps, per_device_train_batch_size=1, per_device_eval_batch_size=1,
        gradient_accumulation_steps=4, learning_rate=1e-4, report_to="none", save_strategy="no",
        logging_steps=1, seed=42, gradient_checkpointing=True, fp16=args.qlora),
        train_dataset=encoded[holdout:], eval_dataset=encoded[:holdout])
    before = trainer.evaluate()
    trainer.train()
    after = trainer.evaluate()
    model.save_pretrained(output)
    tokenizer.save_pretrained(output)
    (output / "evaluation.json").write_text(json.dumps({"before": before, "after": after,
        "examples": len(encoded), "discarded_overlong_prompts": len(examples)-len(encoded), "steps": args.steps, "base": str(Path(args.base).resolve()),
        "activated": False}, indent=2), encoding="utf-8")
    print(f"Candidate adapter saved to {output}. Original Ollama model unchanged.")


if __name__ == "__main__":
    main()
