@AGENTS.md

# Architecture

This project uses C3 docs in `.c3/`.
For architecture questions, changes, audits, file context -> `/c3`.
Operations: query, audit, change, ref, rule, sweep.
File lookup: `c3x lookup <file-or-glob>` maps files/directories to components + refs.

## Before making changes

1. Run `/c3` with your intent — it will create an ADR and guide you through the change
2. Use `c3x lookup <file>` to understand which component owns the file and what refs/rules apply
3. Follow the refs and rules surfaced by the lookup — they are hard constraints
