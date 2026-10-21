"""Local background public-dataset collection and candidate training; no private chat upload."""
import argparse
import ctypes
import hashlib
import json
import math
import os
from pathlib import Path
import random
import shutil
import subprocess
import sys
import time
from urllib.request import Request, urlopen
from urllib.parse import urlparse
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parent.parent
ALLOWED_LICENSES = {"cc-by-sa-3.0", "cc-by-4.0", "cc0-1.0", "apache-2.0", "mit"}


def normalize_rows(text, source):
    result, seen = [], set()
    for line in text.splitlines():
        if not line.strip():
            continue
        item = json.loads(line)
        prompt = item.get(source["prompt_field"]) if "prompt_field" in source else next((item[x] for x in ["instruction", "prompt", "question"] if x in item), None)
        answer = item.get(source["answer_field"]) if "answer_field" in source else next((item[x] for x in ["response", "output", "answer"] if x in item), None)
        context = item.get(source.get("context_field", "context"), "")
        if not isinstance(prompt, str) or not isinstance(answer, str) or not isinstance(context, str):
            continue
        prompt = prompt.strip() + (("\n\n" + context.strip()) if context.strip() else "")
        answer = answer.strip()
        if not prompt or not answer or len(prompt) > 1400 or len(answer) > 1800 or "\x00" in prompt + answer:
            continue
        fingerprint = hashlib.sha256((prompt + "\0" + answer).encode()).hexdigest()
        if fingerprint in seen:
            continue
        seen.add(fingerprint)
        result.append({"messages": [{"role": "user", "content": prompt}, {"role": "assistant", "content": answer}]})
    return result


def discover_sources(limit=2):
    def api(url):
        with urlopen(Request(url, headers={"User-Agent": "vader-local-learning/0.1"}), timeout=30) as response:
            return json.loads(response.read(2_000_000).decode("utf-8"))
    query = urlencode({"search": "instruction", "sort": "downloads", "direction": -1, "limit": 10})
    results = api("https://huggingface.co/api/datasets?" + query)
    sources = []
    for result in results:
        repo = result["id"]
        metadata = api("https://huggingface.co/api/datasets/" + repo)
        license_name = metadata.get("cardData", {}).get("license")
        if not isinstance(license_name, str) or license_name not in ALLOWED_LICENSES:
            continue
        revision = metadata.get("sha")
        if not revision:
            continue
        paths = [item["rfilename"] for item in metadata.get("siblings", []) if item["rfilename"].endswith(".jsonl")]
        if not paths:
            continue
        sources.append({"id": repo, "revision": revision, "license": license_name,
            "url": f"https://huggingface.co/datasets/{repo}/resolve/{revision}/{paths[0]}"})
        if len(sources) >= limit:
            break
    return sources


def fetch_source(source, cache):
    if source.get("license") not in ALLOWED_LICENSES:
        raise ValueError("Source has no supported declared license")
    url = urlparse(source["url"])
    if url.scheme != "https" or url.hostname != "huggingface.co" or not source.get("revision"):
        raise ValueError("Use a revision-pinned public Hugging Face JSONL source")
    cache.mkdir(parents=True, exist_ok=True)
    path = cache / (hashlib.sha256(source["url"].encode()).hexdigest() + ".jsonl")
    skipped = path.with_suffix(".skipped")
    if skipped.exists():
        raise ValueError(skipped.read_text(encoding="utf-8"))
    if not path.exists():
        request = Request(source["url"], headers={"User-Agent": "vader-local-learning/0.1"})
        with urlopen(request, timeout=60) as response:
            content = response.read(32_000_001)
        if len(content) > 32_000_000:
            skipped.write_text("Dataset exceeds the 32 MB per-source download budget", encoding="utf-8")
            raise ValueError("Dataset exceeds the 32 MB per-source download budget")
        temp = path.with_suffix(".tmp")
        temp.write_bytes(content)
        temp.replace(path)
    content = path.read_bytes()
    rows = normalize_rows(content.decode("utf-8"), source)
    return rows, {"id": source["id"], "revision": source["revision"], "license": source["license"],
                  "url": source["url"], "sha256": hashlib.sha256(content).hexdigest(), "usable_rows": len(rows)}


def on_ac_power():
    if sys.platform == "win32":
        class Power(ctypes.Structure):
            _fields_ = [("ac", ctypes.c_ubyte), ("flags", ctypes.c_ubyte), ("percent", ctypes.c_ubyte),
                        ("saving", ctypes.c_ubyte), ("life", ctypes.c_ulong), ("full", ctypes.c_ulong)]
        power = Power()
        return bool(ctypes.windll.kernel32.GetSystemPowerStatus(ctypes.byref(power))) and power.ac == 1
    supplies = Path("/sys/class/power_supply")
    batteries = list(supplies.glob("BAT*"))
    if batteries:
        return any(p.read_text().strip() == "1" for p in supplies.glob("*/online"))
    return True


def preflight(config):
    if not Path(config["base_model"]).is_dir():
        return "Waiting for local Hugging Face base weights"
    if shutil.disk_usage(ROOT).free / 2**30 < config.get("min_free_disk_gb", 20):
        return "Waiting for free disk space"
    if not on_ac_power():
        return "Waiting for AC power"
    probe = subprocess.run([sys.executable, "-c", "import torch,transformers,peft,bitsandbytes; import json; print(json.dumps({'cuda':torch.cuda.is_available(),'free':torch.cuda.mem_get_info()[0]/2**30 if torch.cuda.is_available() else 0}))"], capture_output=True, text=True, timeout=90)
    if probe.returncode:
        return "Waiting for a compatible CUDA training environment"
    gpu = json.loads(probe.stdout.strip().splitlines()[-1])
    if not gpu["cuda"] or gpu["free"] < config.get("min_free_gpu_gb", 5.5):
        return "Waiting for GPU memory; serving chat takes priority"
    return None


def candidate_passes(report):
    before = report.get("before", {}).get("eval_loss")
    after = report.get("after", {}).get("eval_loss")
    return (isinstance(before, (float, int)) and isinstance(after, (float, int))
            and math.isfinite(before) and math.isfinite(after) and after < before)


def save_status(folder, state, **fields):
    folder.mkdir(parents=True, exist_ok=True)
    payload = {"state": state, "updated_at": time.time(), **fields}
    temp = folder / "status.tmp"
    temp.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    temp.replace(folder / "status.json")
    return payload


def cycle(config, folder, collect_only=False):
    rows, provenance, warnings = [], [], []
    sources = list(config["sources"])
    if config.get("discover_public_datasets"):
        try:
            sources += discover_sources(config.get("discovery_limit", 2))
        except Exception as error:
            warnings.append(f"Discovery: {error}")
    for source in sources:
        try:
            incoming, record = fetch_source(source, folder / "cache")
            rows.extend(incoming)
            provenance.append(record)
        except Exception as error:
            warnings.append(f"{source.get('id')}: {error}")
    # Stable deduplication across configured sources, then a reproducible daily sample.
    unique = {json.dumps(item, sort_keys=True): item for item in rows}
    rows = list(unique.values())
    day = int(time.time() // 86400)
    random.Random(day).shuffle(rows)
    rows = rows[:config.get("sample_size", 128)]
    if len(rows) < 20:
        raise ValueError("Not enough usable public examples for an automatic candidate")
    dataset = folder / "public-training.jsonl"
    dataset.write_text("\n".join(json.dumps(x) for x in rows) + "\n", encoding="utf-8")
    digest = hashlib.sha256(dataset.read_bytes()).hexdigest()
    (folder / "provenance.json").write_text(json.dumps(provenance, indent=2), encoding="utf-8")
    (folder / "source-warnings.json").write_text(json.dumps(warnings, indent=2), encoding="utf-8")
    if collect_only:
        return save_status(folder, "collected", rows=len(rows), dataset_sha256=digest, training_started=False)
    reason = preflight(config)
    if reason:
        return save_status(folder, "waiting", reason=reason, rows=len(rows), training_started=False)
    candidate = folder / "candidates" / f"candidate-{int(time.time())}"
    candidate.parent.mkdir(parents=True, exist_ok=True)
    with (folder / "latest-training.log").open("w", encoding="utf-8") as log:
        save_status(folder, "training", candidate=str(candidate), rows=len(rows), training_started=True)
        result = subprocess.run([sys.executable, str(ROOT / "training/train_lora.py"), "--dataset", str(dataset),
            "--base", str(Path(config["base_model"]).resolve()), "--output", str(candidate), "--qlora",
            "--steps", str(config.get("max_steps", 25))], stdout=log, stderr=subprocess.STDOUT, timeout=3600,
            env={**os.environ, "HF_HUB_DISABLE_TELEMETRY": "1", "WANDB_DISABLED": "true"})
    if result.returncode:
        return save_status(folder, "training_failed", candidate=str(candidate), training_started=True)
    report = json.loads((candidate / "evaluation.json").read_text(encoding="utf-8"))
    passed = candidate_passes(report)
    return save_status(folder, "candidate_ready" if passed else "candidate_rejected", candidate=str(candidate),
        improved_holdout_loss=passed, activated=False, training_started=True,
        note="A candidate adapter is not an activated chat model; import and behavioral validation remain separate.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", default="training/autolearn.example.json")
    parser.add_argument("--folder", default=".runtime/autolearn")
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--collect-only", action="store_true")
    parser.add_argument("--status", action="store_true")
    parser.add_argument("--stop", action="store_true")
    args = parser.parse_args()
    os.chdir(ROOT)
    folder = Path(args.folder).resolve()
    folder.mkdir(parents=True, exist_ok=True)
    if args.status:
        print((folder / "status.json").read_text(encoding="utf-8") if (folder / "status.json").exists() else '{"state":"not_started"}')
        return
    if args.stop:
        (folder / "stop").touch()
        print("Stop requested. An in-progress training job finishes before the worker exits.")
        return
    config = json.loads(Path(args.config).read_text(encoding="utf-8"))
    lock = folder / "worker.lock"
    handle = lock.open("a+b")
    if handle.tell() == 0:
        handle.write(b"0")
        handle.flush()
    handle.seek(0)
    try:
        if sys.platform == "win32":
            import msvcrt
            msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        handle.close()
        raise SystemExit("Another background learning worker is already running.")
    (folder / "worker.pid").write_text(str(os.getpid()))
    (folder / "stop").unlink(missing_ok=True)
    try:
        while not (folder / "stop").exists():
            try:
                status = cycle(config, folder, args.collect_only)
                print(json.dumps(status), flush=True)
            except Exception as error:
                status = save_status(folder, "error", reason=str(error))
                print(json.dumps(status), flush=True)
            if args.once or args.collect_only:
                break
            delay = config.get("retry_minutes", 15) * 60 if status["state"] in {"waiting", "error", "training_failed"} else config.get("interval_hours", 24) * 3600
            deadline = time.monotonic() + delay
            while time.monotonic() < deadline and not (folder / "stop").exists():
                time.sleep(min(10, max(0.1, deadline - time.monotonic())))
    finally:
        if (folder / "stop").exists():
            save_status(folder, "stopped", training_started=False)
        handle.close()
        (folder / "worker.pid").unlink(missing_ok=True)


if __name__ == "__main__":
    main()
