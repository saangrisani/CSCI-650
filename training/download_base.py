"""Download the pinned public Qwen base locally, checking LFS file hashes when supplied."""
import hashlib
import json
from pathlib import Path
from urllib.request import Request, urlopen

REPO = "Qwen/Qwen2.5-3B-Instruct"
REVISION = "aa8e72537993ba99e69dfaafa59ed015b17504d1"
ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / ".runtime/hf/Qwen2.5-3B-Instruct"

if __name__ == "__main__":
    metadata_url = f"https://huggingface.co/api/models/{REPO}/revision/{REVISION}?blobs=true"
    with urlopen(Request(metadata_url, headers={"User-Agent": "vader-local-learning/0.1"}), timeout=60) as response:
        metadata = json.load(response)
    TARGET.mkdir(parents=True, exist_ok=True)
    for entry in metadata["siblings"]:
        name = entry["rfilename"]
        if "/" in name or not (name.endswith((".safetensors", ".json", ".txt")) or name == "LICENSE"):
            continue
        destination = TARGET / name
        expected_size = entry.get("lfs", {}).get("size", entry.get("size"))
        expected_hash = entry.get("lfs", {}).get("sha256")
        if destination.exists() and (expected_size is None or destination.stat().st_size == expected_size):
            if not expected_hash or hashlib.sha256(destination.read_bytes()).hexdigest() == expected_hash:
                print(f"Already downloaded: {name}", flush=True)
                continue
        print(f"Downloading {name}", flush=True)
        url = f"https://huggingface.co/{REPO}/resolve/{REVISION}/{name}"
        digest = hashlib.sha256()
        temp = destination.with_suffix(destination.suffix + ".partial")
        with urlopen(Request(url, headers={"User-Agent": "vader-local-learning/0.1"}), timeout=120) as response, temp.open("wb") as output:
            while chunk := response.read(4 * 1024 * 1024):
                digest.update(chunk)
                output.write(chunk)
        if expected_size is not None and temp.stat().st_size != expected_size:
            raise ValueError(f"Size check failed: {name}")
        if expected_hash and digest.hexdigest() != expected_hash:
            raise ValueError(f"Hash check failed: {name}")
        temp.replace(destination)
    (TARGET / "source.json").write_text(json.dumps({"repository": REPO, "revision": REVISION}, indent=2))
    print(f"Base weights ready at {TARGET}", flush=True)
