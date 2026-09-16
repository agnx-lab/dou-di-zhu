"""Train and evaluate the optional BeliefNet against the analytical rule baseline."""

from __future__ import annotations

import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import torch

from phantom.cognition.belief_net import BeliefNet
from phantom.training import make_belief_example


def main() -> int:
    torch.manual_seed(20260911)
    examples = [make_belief_example(910_000 + index) for index in range(1200)]
    features = torch.stack([item[0] for item in examples])
    labels = torch.stack([item[1] for item in examples])
    rules = torch.stack([item[2] for item in examples])
    train_x, test_x = features[:960], features[960:]
    train_y, test_y = labels[:960], labels[960:]
    test_rule = rules[960:]

    model = BeliefNet()
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.007, weight_decay=0.002)
    for _ in range(90):
        prediction = model(train_x)
        loss = torch.mean((prediction - train_y) ** 2)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

    model.eval()
    with torch.no_grad():
        predicted = model(test_x)
        model_mse = torch.mean((predicted - test_y) ** 2, dim=0)
        rule_mse = torch.mean((test_rule - test_y) ** 2, dim=0)
    model_score = float(model_mse.mean())
    rule_score = float(rule_mse.mean())
    activation = "neural_candidate" if model_score < rule_score * 0.95 else "rule_retained"

    output = ROOT / "output" / "belief_net"
    output.mkdir(parents=True, exist_ok=True)
    torch.save({"state_dict": model.state_dict(), "input_size": 31}, output / "belief_net.pt")
    report = {
        "seed": 20260911,
        "training_examples": 960,
        "test_examples": 240,
        "targets": ["王炸概率", "炸弹概率", "控制力"],
        "model_mse": [round(float(value), 8) for value in model_mse],
        "rule_mse": [round(float(value), 8) for value in rule_mse],
        "model_mean_mse": round(model_score, 8),
        "rule_mean_mse": round(rule_score, 8),
        "activation": activation,
        "decision": "仅当神经模型误差至少低 5% 才允许进入在线融合",
    }
    (output / "evaluation.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
