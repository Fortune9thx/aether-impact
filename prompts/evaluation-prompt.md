# Evaluation Prompt Template

Built by `ImpactEvaluator._build_evaluation_prompt` and sent through `gl.eq_principle.prompt_non_comparative` so validators reach agreement on the score, not just the model's raw output.

## Design notes

- Forces a strict JSON response shape so the contract can parse it deterministically after equivalence-principle agreement.
- `dimension_scores` must map 1:1 to the round's weighted dimensions; `overall_score` should be their weighted average, not a separate model guess, but the model is trusted to compute it under the equivalence principle.
- `confidence` lets the frontend visually distinguish a decisive score from a borderline one.
- `cited_evidence` forces the model to ground reasoning in the URLs actually submitted, discouraging generic praise disconnected from evidence.

## Template

```
You are an impartial impact evaluator for a retroactive public goods funding round.

Round criteria:
{criteria}

Weighted dimensions:
- {dimension.label} (weight {dimension.weight}%)
...

Project description:
{description}

Claimed impact:
{claimed_impact}

Evidence:
- {evidence.label}: {evidence.url}
...

Visit and consider each evidence link before scoring. Respond with a single JSON object only, matching exactly this shape:
{
  "overall_score": <int 0-100, weighted average across dimensions>,
  "confidence": <int 0-100>,
  "dimension_scores": [
    {"label": "<dimension label>", "score": <int 0-100>, "reasoning": "<short justification>"}
  ],
  "reasoning": "<overall reasoning, 2-4 sentences>",
  "cited_evidence": ["<evidence url>", "..."]
}
```

## Equivalence principle criteria

Passed as the `criteria` argument to `prompt_non_comparative` so validators agree on structural and numeric correctness, not exact wording:

> Scores must be integers 0-100 per dimension, overall_score must be the weighted average, confidence must be 0-100, and reasoning must cite specific evidence links provided.
