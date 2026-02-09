# Interview exercise: Commit Summary Agent + AI Gateway product review

## Goal

Build a small agent that takes a git diff as input and outputs a commit summary/message, using Vercel AI SDK + AI Gateway. The real goal is not the code. It's to see how you explore the gateway, make product/engineering trade-offs, identify rough edges, and propose concrete improvements.

## What you'll build

A minimal "commit summary agent" that:

1. Accepts a diff (or a set of diffs) and generates a commit summary/message.
2. Can enumerate and use any model available on the AI Gateway.
3. Uses two or more reasoning-capable models, ideally:
   - One open/OSS model available through the gateway
   - One closed/proprietary model available through the gateway
4. Demonstrates "thinking" and caching working (in whatever way those concepts are exposed in the SDK/gateway for the selected models).
5. Reports cost per generated commit message (and ideally breaks down what that cost represents, at least at a high level).

## Deliverables

Submit a repo (or zip) containing:

### 1) A runnable artifact

- Anything minimal is fine (CLI, small service, small web UI, etc.).
- Include a couple of sample diffs (sanitized) and example outputs.

### 2) "AI Gateway Rough Edges" write-up

Write this as a list of issues you encountered (or gaps you discovered) while building. For each item, include:

- What you tried to do
- What went wrong / what was confusing / what was missing
- Proposed solution: what you'd change in the gateway/SDK/docs/product
- Priority + rationale (P0/P1/P2)
