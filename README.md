# Commit Agent

A Next.js app that generates commit messages from git diffs using AI through Vercel's AI-gateway. Supports multiple models with real-time streaming of reasoning and output.

## Setup

```bash
npm install
cp .env.example .env
```

Add your [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) API key to `.env`:

```
AI_GATEWAY_API_KEY=your-key-here
```

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. Upload a `.diff`, `.patch`, or `.txt` file (supports multiple files)
2. Pick a model from the dropdown
3. Click **Generate Commit Message**
4. Watch reasoning stream in real time, then see the final commit message with cost breakdown

Sample diffs are in `samples/` for testing.

## Project structure

```
app/
  page.tsx                    # Main UI
  api.ts                      # Client-side hook (useGenerateCommitMessage)
  types.ts                    # Shared types (StepResult)
  globals.css                 # Styles
  components/
    StreamingPanel.tsx         # Live reasoning/text display during generation
    ModelUsageMetadata.tsx     # Token counts and cost breakdown
  api/
    generate/route.ts          # POST /api/generate — streams commit message via SSE
    models/route.ts            # GET /api/models — lists available language models
    prompt.ts                  # System prompt
    shared.ts                  # Gateway instance, SSE helpers
docs/
  PROMPT.md                   # Original project prompt/requirements
  NOTES.md                    # Development notes and feedback
samples/
  diff-feature.patch          # Sample diff for testing
  diff-refactor.patch         # Sample diff for testing
```
