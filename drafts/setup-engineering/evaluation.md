# Draft skill evaluation

Checked 2026-10-30. The skill is a local reference draft, not a validated vehicle model or an installed automation.

## Structural validation

The skill-creator `quick_validate.py` reports `Skill is valid!`. The validator checks packaging/frontmatter, not vehicle dynamics or the quality of recommendations. A separate final filesystem check validates local document links.

## Read-only application scenario

A fresh agent without the skill received a request for an exact iRacing GT3 setup package, remaining grip percentages, and universal LMU-inspired defaults, with no car, telemetry, legal ranges or baseline. It correctly declined invented values and universal defaults and returned an AI-readable holding/diagnosis response. Thus the baseline already passed basic evidence safeguards; this evaluation does not demonstrate that the skill improves those safeguards.

A second fresh agent used the draft skill for the same request. Its actual answer retained unknown setup deltas and grip values as null, separated the two handling phases, identified the LMU example as source-specific, and produced an experiment card with hypothesis, evidence needed, acceptance/revert criteria, tradeoffs, confidence and next action. It did not claim to have executed a simulator or model.

The application check exposed incorrect relative links in the reference file. Those links were corrected to point back to this workspace; they are covered by the final filesystem check. The agent's initial missing-link observation should not be interpreted as proof of retrieval after that correction.

This is one application scenario and a structural check, not statistical efficacy testing or numerical engineering validation. No real car setup, telemetry, grip model, measured handling response, or live iRacing/SimHub connection was tested.
