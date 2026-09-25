# Graph Editor Agent Instructions

This repository contains reusable graph document utilities and React primitives for node graph editors.

## Editor UX authority

- React workbenches and interactive examples apply the current shared `ui` conventions from `moritzbrantner/coding-agent-conventions`, especially `UI-008`, `UI-012`, and `UI-013`.
- `GraphCanvas` and its narrow interaction primitives own generic graph selection, marquee, pan/zoom, node dragging, rewiring, and connection gestures. Consumers may add domain semantics but must not independently reimplement the same physical interaction.
- Keep the graph workspace dominant. Property panels and command surfaces are contextual complements to direct canvas work, not replacements for selecting and manipulating graph objects.
- Fix generic interaction defects in the owning graph primitive and protect browser-dependent hit geometry, selection bounds, pointer capture, and viewport behavior with focused browser evidence.

## Agent skills

This repository is configured for the Matt Pocock workflow skills and the agent-loop control plane.

- Issue tracker: `docs/agents/issue-tracker.md`
- Triage labels: `docs/agents/triage-labels.md`
- Domain context: `docs/agents/domain.md`
- Planning workflow: `docs/agents/planning-workflow.md`

### Planning workflow

Substantial new work should be planned into GitHub PRD issues instead of implemented directly. See `docs/agents/planning-workflow.md`.
