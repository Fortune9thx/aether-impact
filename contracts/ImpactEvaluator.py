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
    round_owners: TreeMap[str, str]   # round_id -> creator address (str)
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

    def _get_round(self, round_id: str) -> dict:
        raw = self.rounds.get(round_id)
        if raw is None:
            raise ValueError(f"round not found: {round_id}")
        return json.loads(raw)

    def _get_project(self, project_id: str) -> dict:
        raw = self.projects.get(project_id)
        if raw is None:
            raise ValueError(f"project not found: {project_id}")
        return json.loads(raw)

    def _require_non_empty(self, value: str, field_name: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError(f"{field_name} must not be empty")
        return stripped

    def _validate_dimensions(self, dimensions: list) -> None:
        if not isinstance(dimensions, list) or len(dimensions) == 0:
            raise ValueError("dimensions must be a non-empty list")

        total_weight = 0
        for dimension in dimensions:
            if "label" not in dimension or "weight" not in dimension:
                raise ValueError("each dimension needs a label and a weight")
            if not str(dimension["label"]).strip():
                raise ValueError("dimension label must not be empty")

            weight = dimension["weight"]
            if not isinstance(weight, int) or weight < 0 or weight > 100:
                raise ValueError("dimension weight must be an integer 0-100")
            total_weight += weight

        if total_weight != 100:
            raise ValueError(f"dimension weights must total 100, got {total_weight}")

    def _validate_evidence(self, evidence: list) -> None:
        if not isinstance(evidence, list) or len(evidence) == 0:
            raise ValueError("evidence must be a non-empty list")

        for item in evidence:
            if "label" not in item or "url" not in item:
                raise ValueError("each evidence item needs a label and a url")
            if not str(item["label"]).strip():
                raise ValueError("evidence label must not be empty")

            url = str(item["url"]).strip()
            if not (url.startswith("http://") or url.startswith("https://")):
                raise ValueError(f"evidence url must be http(s): {url}")

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

Visit and consider each evidence link before scoring. Do not compute an overall score yourself -- the contract derives it deterministically from your per-dimension scores. Respond with a single JSON object only, matching exactly this shape:
{{
  "confidence": <int 0-100>,
  "dimension_scores": [
    {{"label": "<dimension label>", "score": <int 0-100>, "reasoning": "<short justification>"}}
  ],
  "reasoning": "<overall reasoning, 2-4 sentences>",
  "cited_evidence": ["<evidence url>", "..."]
}}"""

    def _run_evaluation(self, project: dict, round_record: dict, task: str) -> dict:
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
            task=task,
            criteria="Dimension scores must be integers between 0 and 100, confidence must be an integer between 0 and 100, and the reasoning should be substantively grounded in the description and evidence provided. Minor differences in wording or emphasis between validators are acceptable as long as the scores and overall judgment are reasonably close.",
        )

        return json.loads(self._extract_json(result_text))

    def _compute_overall_score(self, dimension_scores: list, dimensions: list) -> int:
        weight_by_label = {d["label"]: d["weight"] for d in dimensions}
        total_weight = 0
        weighted_sum = 0
        for entry in dimension_scores:
            weight = weight_by_label.get(entry["label"], 0)
            weighted_sum += entry["score"] * weight
            total_weight += weight
        if total_weight == 0:
            return 0
        return round(weighted_sum / total_weight)

    def _store_evaluation(
        self,
        evaluation_id: str,
        project_id: str,
        parsed: dict,
        dimensions: list,
        challenged: bool,
    ) -> None:
        required = ("confidence", "dimension_scores", "reasoning")
        for field in required:
            if field not in parsed:
                raise ValueError(f"model output missing required field: {field}")

        overall_score = self._compute_overall_score(parsed["dimension_scores"], dimensions)

        record = {
            "id": evaluation_id,
            "project_id": project_id,
            "overall_score": overall_score,
            "confidence": parsed["confidence"],
            "dimension_scores": parsed["dimension_scores"],
            "reasoning": parsed["reasoning"],
            "cited_evidence": parsed.get("cited_evidence", []),
            "challenged": challenged,
        }
        self.evaluations[evaluation_id] = json.dumps(record)

    # ---- round management ----

    @gl.public.write
    def create_round(
        self,
        title: str,
        description: str,
        criteria: str,
        dimensions: str,  # json list[{"label": str, "weight": int}]
    ) -> str:
        title = self._require_non_empty(title, "title")
        description = self._require_non_empty(description, "description")
        criteria = self._require_non_empty(criteria, "criteria")

        parsed_dimensions = json.loads(dimensions)
        self._validate_dimensions(parsed_dimensions)

        round_id = self._next_id("round")
        record = {
            "id": round_id,
            "title": title,
            "description": description,
            "criteria": criteria,
            "dimensions": parsed_dimensions,
            "status": "open",
            "created_at": str(gl.message_raw["datetime"]),
            "pool": "0",
            "distributed": False,
        }
        self.rounds[round_id] = json.dumps(record)
        self.round_owners[round_id] = str(gl.message.sender_address)

        ids = self._load_ids(self.round_ids, "all")
        ids.append(round_id)
        self.round_ids["all"] = json.dumps(ids)
        self.project_ids[round_id] = json.dumps([])

        return round_id

    @gl.public.write
    def close_round(self, round_id: str) -> None:
        record = self._get_round(round_id)

        owner = self.round_owners.get(round_id)
        if owner is not None and owner != str(gl.message.sender_address):
            raise ValueError("only the round creator can close this round")

        if record["status"] == "closed":
            raise ValueError("round is already closed")

        record["status"] = "closed"
        self.rounds[round_id] = json.dumps(record)

    @gl.public.view
    def get_round(self, round_id: str) -> str:
        return json.dumps(self._get_round(round_id))

    @gl.public.view
    def list_rounds(self) -> str:
        ids = self._load_ids(self.round_ids, "all")
        return json.dumps([self._get_round(rid) for rid in ids])

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
        round_record = self._get_round(round_id)
        if round_record["status"] != "open":
            raise ValueError("round is not open for submissions")

        name = self._require_non_empty(name, "name")
        description = self._require_non_empty(description, "description")
        claimed_impact = self._require_non_empty(claimed_impact, "claimed_impact")

        parsed_evidence = json.loads(evidence)
        self._validate_evidence(parsed_evidence)

        project_id = self._next_id("project")
        record = {
            "id": project_id,
            "round_id": round_id,
            "name": name,
            "description": description,
            "claimed_impact": claimed_impact,
            "evidence": parsed_evidence,
            "submitted_at": str(gl.message_raw["datetime"]),
            "submitter": str(gl.message.sender_address),
            "payout": "0",
            "claimed": False,
        }
        self.projects[project_id] = json.dumps(record)

        ids = self._load_ids(self.project_ids, round_id)
        ids.append(project_id)
        self.project_ids[round_id] = json.dumps(ids)

        return project_id

    @gl.public.view
    def get_project(self, project_id: str) -> str:
        return json.dumps(self._get_project(project_id))

    @gl.public.view
    def list_projects(self, round_id: str) -> str:
        self._get_round(round_id)  # raises if round_id is invalid
        ids = self._load_ids(self.project_ids, round_id)
        return json.dumps([self._get_project(pid) for pid in ids])

    # ---- evaluation ----

    @gl.public.write
    def evaluate_project(self, project_id: str) -> str:
        project = self._get_project(project_id)
        round_record = self._get_round(project["round_id"])

        evaluation_id = f"eval-{project_id}"
        if self.evaluations.get(evaluation_id) is not None:
            raise ValueError(
                "project already evaluated; use challenge_evaluation to dispute and re-evaluate"
            )

        parsed = self._run_evaluation(
            project,
            round_record,
            task="Score a project submission against weighted evaluation dimensions using its description and cited evidence.",
        )
        self._store_evaluation(
            evaluation_id, project_id, parsed, round_record["dimensions"], challenged=False
        )

        return evaluation_id

    @gl.public.view
    def get_evaluation(self, project_id: str) -> str:
        raw = self.evaluations.get(f"eval-{project_id}")
        if raw is None:
            raise ValueError(f"no evaluation found for project: {project_id}")
        return raw

    # ---- challenge flow ----

    @gl.public.write
    def challenge_evaluation(self, project_id: str, new_evidence: str) -> str:
        project = self._get_project(project_id)

        round_record = self._get_round(project["round_id"])
        if round_record.get("distributed"):
            raise ValueError(
                "this round has already distributed funds; evaluations can no longer be challenged"
            )

        evaluation_id = f"eval-{project_id}"
        if self.evaluations.get(evaluation_id) is None:
            raise ValueError(f"no evaluation found for project: {project_id}")

        additional = json.loads(new_evidence)
        self._validate_evidence(additional)

        project["evidence"] = project["evidence"] + additional
        self.projects[project_id] = json.dumps(project)

        parsed = self._run_evaluation(
            project,
            round_record,
            task="Re-score a project submission after a challenge added new evidence.",
        )
        self._store_evaluation(
            evaluation_id, project_id, parsed, round_record["dimensions"], challenged=True
        )

        return evaluation_id

    # ---- funding & distribution ----

    @gl.public.write.payable
    def fund_round(self, round_id: str) -> str:
        record = self._get_round(round_id)
        if record.get("distributed"):
            raise ValueError("round has already distributed its funds; cannot add more")

        amount = gl.message.value
        record["pool"] = str(int(record["pool"]) + int(amount))
        self.rounds[round_id] = json.dumps(record)

        return record["pool"]

    @gl.public.write
    def compute_distribution(self, round_id: str) -> str:
        record = self._get_round(round_id)

        owner = self.round_owners.get(round_id)
        if owner is not None and owner != str(gl.message.sender_address):
            raise ValueError("only the round creator can compute the distribution")

        if record["status"] != "closed":
            raise ValueError("round must be closed before computing distribution")
        if record.get("distributed"):
            raise ValueError("distribution has already been computed for this round")

        pool = int(record["pool"])
        if pool <= 0:
            raise ValueError("round has no funds to distribute; call fund_round first")

        ids = self._load_ids(self.project_ids, round_id)
        evaluated = []
        for pid in ids:
            eval_raw = self.evaluations.get(f"eval-{pid}")
            if eval_raw is None:
                continue
            evaluated.append((pid, json.loads(eval_raw)["overall_score"]))

        if len(evaluated) == 0:
            raise ValueError("no evaluated projects in this round; nothing to distribute to")

        total_score = sum(score for _, score in evaluated)
        if total_score <= 0:
            raise ValueError("all evaluated projects scored zero; nothing to distribute")

        payouts = []
        for pid, score in evaluated:
            payout = (pool * score) // total_score
            project = self._get_project(pid)
            project["payout"] = str(payout)
            project["claimed"] = False
            self.projects[pid] = json.dumps(project)
            payouts.append({"project_id": pid, "payout": payout})

        record["distributed"] = True
        self.rounds[round_id] = json.dumps(record)

        return json.dumps(payouts)

    @gl.public.write
    def claim_payout(self, project_id: str) -> str:
        project = self._get_project(project_id)

        round_record = self._get_round(project["round_id"])
        if not round_record.get("distributed"):
            raise ValueError("this round has not distributed funds yet")

        if project.get("claimed"):
            raise ValueError("payout already claimed")

        if str(gl.message.sender_address) != project.get("submitter"):
            raise ValueError("only the project's original submitter can claim its payout")

        amount = int(project.get("payout", "0"))
        if amount <= 0:
            raise ValueError("nothing to claim for this project")

        # Mark claimed before sending funds (checks-effects-interactions).
        project["claimed"] = True
        self.projects[project_id] = json.dumps(project)

        _Recipient(Address(project["submitter"])).emit_transfer(value=amount)

        return str(amount)

    @gl.public.view
    def list_payouts(self, round_id: str) -> str:
        self._get_round(round_id)  # raises if round_id is invalid
        ids = self._load_ids(self.project_ids, round_id)
        results = []
        for pid in ids:
            project = self._get_project(pid)
            results.append(
                {
                    "project_id": pid,
                    "name": project["name"],
                    "submitter": project.get("submitter", ""),
                    "payout": project.get("payout", "0"),
                    "claimed": project.get("claimed", False),
                }
            )
        return json.dumps(results)


@gl.evm.contract_interface
class _Recipient:
    class View:
        pass

    class Write:
        pass
