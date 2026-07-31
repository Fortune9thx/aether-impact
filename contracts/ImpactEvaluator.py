# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json

from genlayer import *


class ImpactEvaluator(gl.Contract):
    # All collections are TreeMap[str, str] with JSON-encoded values.
    # Verified as the only reliably-readable storage pattern on Bradbury --
    # typed TreeMap values (dataclass, u256, bool) deploy but become
    # permanently unreadable post-accept.
    rounds: TreeMap[str, str]
    projects: TreeMap[str, str]
    evaluations: TreeMap[str, str]
    round_ids: TreeMap[str, str]      # single key "all" -> json list[str]
    project_ids: TreeMap[str, str]    # key round_id -> json list[str]
    seq: TreeMap[str, str]            # single key "n" -> str(int) counter

    def __init__(self):
        self.round_ids["all"] = json.dumps([])
        self.seq["n"] = "0"

    # ---- internal helpers (must precede callers per GenVM static analysis) ----

    def _next_id(self, prefix: str) -> str:
        n = int(self.seq["n"]) + 1
        self.seq["n"] = str(n)
        return f"{prefix}-{n}"

    def _load_ids(self, store: TreeMap[str, str], key: str) -> list:
        raw = store.get(key)
        return json.loads(raw) if raw else []

    def _extract_json(self, raw: str) -> str:
        start = raw.find("{")
        end = raw.rfind("}")
        if start == -1 or end == -1:
            raise ValueError("no JSON object found in model output")
        return raw[start : end + 1]

    def _build_evaluation_prompt(
        self,
        criteria: str,
        dimensions: list,
        description: str,
        claimed_impact: str,
        evidence: list,
    ) -> str:
        dimension_lines = "\n".join(
            f"- {d['label']} (weight {d['weight']}%)" for d in dimensions
        )
        evidence_lines = "\n".join(
            f"- {e['label']}: {e['url']}" for e in evidence
        )
        return f"""You are an impartial impact evaluator for a retroactive public goods funding round.

Round criteria:
{criteria}

Weighted dimensions:
{dimension_lines}

Project description:
{description}

Claimed impact:
{claimed_impact}

Evidence:
{evidence_lines}

Visit and consider each evidence link before scoring. Respond with a single JSON object only, matching exactly this shape:
{{
  "overall_score": <int 0-100, weighted average across dimensions>,
  "confidence": <int 0-100>,
  "dimension_scores": [
    {{"label": "<dimension label>", "score": <int 0-100>, "reasoning": "<short justification>"}}
  ],
  "reasoning": "<overall reasoning, 2-4 sentences>",
  "cited_evidence": ["<evidence url>", "..."]
}}"""

    # ---- round management ----

    @gl.public.write
    def create_round(
        self,
        title: str,
        description: str,
        criteria: str,
        dimensions: str,  # json list[{"label": str, "weight": int}]
    ) -> str:
        round_id = self._next_id("round")
        record = {
            "id": round_id,
            "title": title,
            "description": description,
            "criteria": criteria,
            "dimensions": json.loads(dimensions),
            "status": "open",
            "created_at": str(gl.message_raw["datetime"]),
        }
        self.rounds[round_id] = json.dumps(record)

        ids = self._load_ids(self.round_ids, "all")
        ids.append(round_id)
        self.round_ids["all"] = json.dumps(ids)
        self.project_ids[round_id] = json.dumps([])

        return round_id

    @gl.public.write
    def close_round(self, round_id: str) -> None:
        record = json.loads(self.rounds[round_id])
        record["status"] = "closed"
        self.rounds[round_id] = json.dumps(record)

    @gl.public.view
    def get_round(self, round_id: str) -> str:
        return self.rounds[round_id]

    @gl.public.view
    def list_rounds(self) -> str:
        ids = self._load_ids(self.round_ids, "all")
        return json.dumps([json.loads(self.rounds[rid]) for rid in ids])

    # ---- project submission ----

    @gl.public.write
    def submit_project(
        self,
        round_id: str,
        name: str,
        description: str,
        claimed_impact: str,
        evidence: str,  # json list[{"label": str, "url": str}]
    ) -> str:
        round_record = json.loads(self.rounds[round_id])
        if round_record["status"] != "open":
            raise ValueError("round is not open for submissions")

        project_id = self._next_id("project")
        record = {
            "id": project_id,
            "round_id": round_id,
            "name": name,
            "description": description,
            "claimed_impact": claimed_impact,
            "evidence": json.loads(evidence),
            "submitted_at": str(gl.message_raw["datetime"]),
        }
        self.projects[project_id] = json.dumps(record)

        ids = self._load_ids(self.project_ids, round_id)
        ids.append(project_id)
        self.project_ids[round_id] = json.dumps(ids)

        return project_id

    @gl.public.view
    def get_project(self, project_id: str) -> str:
        return self.projects[project_id]

    @gl.public.view
    def list_projects(self, round_id: str) -> str:
        ids = self._load_ids(self.project_ids, round_id)
        return json.dumps([json.loads(self.projects[pid]) for pid in ids])

    # ---- evaluation ----

    @gl.public.write
    def evaluate_project(self, project_id: str) -> str:
        project = json.loads(self.projects[project_id])
        round_record = json.loads(self.rounds[project["round_id"]])

        # Copy everything the non-deterministic block needs into locals --
        # storage cannot be touched inside gl.eq_principle blocks.
        criteria = round_record["criteria"]
        dimensions = round_record["dimensions"]
        claimed_impact = project["claimed_impact"]
        description = project["description"]
        evidence = project["evidence"]

        prompt = self._build_evaluation_prompt(
            criteria, dimensions, description, claimed_impact, evidence
        )

        result_text = gl.eq_principle.prompt_non_comparative(
            lambda: prompt,
            task="Score a project submission against weighted evaluation dimensions using its description and cited evidence.",
            criteria="Scores must be integers 0-100 per dimension, overall_score must be the weighted average, confidence must be 0-100, and reasoning must cite specific evidence links provided.",
        )

        parsed = json.loads(self._extract_json(result_text))

        evaluation_id = f"eval-{project_id}"
        record = {
            "id": evaluation_id,
            "project_id": project_id,
            "overall_score": parsed["overall_score"],
            "confidence": parsed["confidence"],
            "dimension_scores": parsed["dimension_scores"],
            "reasoning": parsed["reasoning"],
            "cited_evidence": parsed.get("cited_evidence", []),
            "challenged": False,
        }
        self.evaluations[evaluation_id] = json.dumps(record)

        return evaluation_id

    @gl.public.view
    def get_evaluation(self, project_id: str) -> str:
        return self.evaluations[f"eval-{project_id}"]

    # ---- challenge flow ----

    @gl.public.write
    def challenge_evaluation(self, project_id: str, new_evidence: str) -> str:
        project = json.loads(self.projects[project_id])
        additional = json.loads(new_evidence)
        project["evidence"] = project["evidence"] + additional
        self.projects[project_id] = json.dumps(project)

        evaluation_id = f"eval-{project_id}"
        record = json.loads(self.evaluations[evaluation_id])
        record["challenged"] = True
        self.evaluations[evaluation_id] = json.dumps(record)

        return self.evaluate_project(project_id)
