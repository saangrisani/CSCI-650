import json
import math
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from autolearn import normalize_rows, candidate_passes, cycle, preflight


class AutolearnTests(unittest.TestCase):
    def test_battery_power_defers_training_without_loading_gpu(self):
        with tempfile.TemporaryDirectory() as temp:
            with patch("autolearn.on_ac_power", return_value=False), patch("autolearn.subprocess.run") as run:
                self.assertEqual(preflight({"base_model": temp, "min_free_disk_gb": 0}), "Waiting for AC power")
                run.assert_not_called()

    def test_filter_and_deduplicate(self):
        rows = [{"instruction": "Question", "context": "Context", "response": "Answer"},
                {"instruction": "Question", "context": "Context", "response": "Answer"},
                {"instruction": "", "response": "Answer"},
                {"instruction": "X" * 2000, "response": "Answer"}]
        normalized = normalize_rows("\n".join(map(json.dumps, rows)), {})
        self.assertEqual(len(normalized), 1)
        self.assertEqual(normalized[0]["messages"][0]["content"], "Question\n\nContext")

    def test_non_finite_or_worse_evaluation_does_not_pass(self):
        self.assertTrue(candidate_passes({"before": {"eval_loss": 2}, "after": {"eval_loss": 1}}))
        for value in (math.nan, math.inf, 3, None):
            self.assertFalse(candidate_passes({"before": {"eval_loss": 2}, "after": {"eval_loss": value}}))

    def test_collection_never_starts_training_or_reads_private_conversations(self):
        rows = [{"messages": [{"role": "user", "content": f"Q{i}"}, {"role": "assistant", "content": "A"}]} for i in range(30)]
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            with patch("autolearn.fetch_source", return_value=(rows, {"id": "public-test"})), patch("autolearn.subprocess.run") as run:
                result = cycle({"sources": [{}], "sample_size": 20}, folder, collect_only=True)
                self.assertEqual(result["state"], "collected")
                self.assertFalse(result["training_started"])
                run.assert_not_called()
                self.assertEqual(len((folder / "public-training.jsonl").read_text().splitlines()), 20)

    def test_preflight_wait_never_falls_back_to_paid_compute(self):
        rows = [{"messages": [{"role": "user", "content": f"Q{i}"}, {"role": "assistant", "content": "A"}]} for i in range(30)]
        with tempfile.TemporaryDirectory() as temp:
            with patch("autolearn.fetch_source", return_value=(rows, {})), patch("autolearn.preflight", return_value="GPU busy"), patch("autolearn.subprocess.run") as run:
                result = cycle({"sources": [{}]}, Path(temp))
                self.assertEqual(result["state"], "waiting")
                run.assert_not_called()


if __name__ == "__main__":
    unittest.main()
