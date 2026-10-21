"""Merge a candidate adapter into a separate local Safetensors model directory."""
import argparse
from pathlib import Path

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True)
    parser.add_argument("--adapter", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    if not Path(args.base).is_dir() or not Path(args.adapter).is_dir():
        parser.error("Base and adapter must be local directories")
    if Path(args.output).exists():
        parser.error("Choose a new output directory")
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel
    base = AutoModelForCausalLM.from_pretrained(args.base, local_files_only=True,
        trust_remote_code=False, torch_dtype=torch.float16, device_map="cpu")
    merged = PeftModel.from_pretrained(base, args.adapter, local_files_only=True).merge_and_unload()
    merged.save_pretrained(args.output, safe_serialization=True)
    AutoTokenizer.from_pretrained(args.base, local_files_only=True, trust_remote_code=False).save_pretrained(args.output)
    print("Saved merged candidate. Import and evaluate separately; current model unchanged.")
