# Rough Edges

Issues and gaps encountered while building a commit message generator with the AI SDK and AI Gateway.

---

## 1. ProviderOptions for reasoning are untyped and provider-specific

**What I tried to do:** Enable reasoning/thinking for models that support it (Anthropic, OpenAI, DeepSeek) using a single, model-agnostic configuration.

**What went wrong:** Each provider requires its own ProviderOptions structure to enable reasoning. DeepSeek does it automatically, Anthropic needs `thinking: { type: "enabled", budgetTokens: N }`, OpenAI needs `reasoningEffort: "high"`. The `ProviderOptions` type isn't exported from the `ai` package — I had to find it in `@ai-sdk/provider-utils`, and even then it's just an untyped key/value blob. There's no way to know what options are valid for a given provider without searching each provider's docs individually. I expected the gateway, as a model-agnostic wrapper, to abstract this away.

**Proposed solution:** Either (a) the gateway should normalize reasoning into a single option like `reasoning: { enabled: true, budget: 10000 }` that it translates per-provider, or (b) export typed ProviderOptions per provider from the SDK so you get autocomplete and type checking. At minimum, export the base `ProviderOptions` type from `ai`.

**Priority:** P2 — Not blocking but this is a painful DX issue. Every developer using multiple providers will hit this. The lack of types makes it trial-and-error.

---

## 2. Reasoning results are inconsistent and undocumented across providers

**What I tried to do:** Display reasoning/thinking text from all models that support it.

**What went wrong:** Some models return reasoning text and some don't, with no documentation on which is which. OpenAI models accept `reasoningEffort` but never returned reasoning text in the response. Anthropic consistently returned reasoning when asked. DeepSeek returned it automatically. There's no way to know if you misconfigured a model or if it never supported it.

**Proposed solution:** At minimum, document which providers/models support reasoning output. The provider list at https://ai-sdk.dev/providers/ai-sdk-providers doesn't mention reasoning support at all. Ideally, add a `capabilities` or `tags` field to the model metadata (from `getAvailableModels()`) that indicates whether a model supports reasoning output — not just whether it accepts reasoning options. Something like `supportsReasoningOutput: true` distinct from `supportsReasoningConfig: true`.

**Priority:** P2 — Developers building UIs around reasoning (collapsible thinking panels, streaming reasoning) need to know which models will actually produce that output.

---

## 3. Streaming reasoning + text requires undocumented fullStream API

**What I tried to do:** Stream both reasoning tokens and response text tokens to the client in real time via SSE.

**What went wrong:** The documented `reasoningText` and `text` streams don't seem to support reading both simultaneously. I had to dig deep to find `stream.fullStream` which emits typed parts for both. The documentation was also inconsistent — it references `data.delta` for chunks but the actual field is `data.text`. The docs say `part.type='reasoning'` but the actual value is `part.type='reasoning-delta'`. The reference page may be out of date: https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text#full-stream.text-stream-part.type

**Proposed solution:** Update the streamText documentation to clearly show the `fullStream` pattern for reading multiple stream types. Fix the part.type values in the docs (`reasoning-delta` not `reasoning`). Add a guide/example for "streaming reasoning and text together" since this is a common pattern for thinking-model UIs.

**Priority:** P2 — Streaming is the primary way people use these models in production. It functions, but the docs are wrong and unclear.

---

## 4. No input/output cost breakdown in response

**What I tried to do:** Show users a breakdown of cost by input tokens vs output tokens, not just a total.

**What went wrong:** The gateway returns a single `cost` number via `providerMetadata.gateway.cost`. There's no split between input cost and output cost. I had to look up the model's per-token rates from the catalog and estimate the split by multiplying token counts. This estimate doesn't account for tiered pricing or special reasoning token rates, so it won't always match the actual total.

**Proposed solution:** Return a structured cost breakdown in the response: `{ inputCost, outputCost, reasoningCost, cacheSavings, total }`. The gateway already computes the total, so the component costs should be trivially available.

**Priority:** P3 — Cost transparency is important for production apps. The total cost is accurate so this isn't urgent but it would be nice to have to let users and developers better understand the costs they are incurring.

---

## 5. No SDK method to get a single model by ID

**What I tried to do:** Look up pricing for the specific model that served a request (which may differ from the requested model due to fallbacks).

**What went wrong:** The SDK only has `getAvailableModels()` which returns the entire catalog. There's no `getModel(id)` method. I had two options: fetch all models and find the one I need (wasteful and requires caching with staleness issues), or use the raw REST endpoint `GET /v1/models/{id}/endpoints` directly. I went with the REST endpoint but it shouldn't require dropping out of the SDK.

**Proposed solution:** Add `gateway.getModel(id)` to the SDK that returns a single model's metadata including pricing. The REST endpoint already exists — this just needs an SDK wrapper.

**Priority:** P2 — Easy fix, minor convenience. The REST workaround is fine but the SDK should cover this.

---

## 6. Fallback models are per-request, not per-model-configuration

**What I tried to do:** Define fallback models once and reuse across all requests.

**What went wrong:** Fallbacks are configured per-request via `providerOptions.gateway.models`. If I use the same model in multiple `streamText`/`generateText` calls, I have to repeat the fallback list every time. This is error-prone and violates DRY.

**Proposed solution:** Allow defining fallbacks at the model level: `gateway("anthropic/claude-sonnet-4.5", { fallbacks: ["openai/gpt-4.1-mini"] })`. The returned model object carries its fallback config so every request using it automatically has fallbacks. Per-request overrides should still work for one-off cases.

**Priority:** P3 — This is an API design issue. Fallbacks are a property of "how I want to use this model" not "what I want for this specific request." Any app with multiple generation calls will duplicate this config.

---

## 7. Prompt caching is confusing and undocumented for common patterns

**What I tried to do:** Use Anthropic's prompt caching to reduce costs when regenerating commit messages from the same diff.

**What went wrong:** I set `cacheControl: { type: "ephemeral" }` in the Anthropic ProviderOptions but cache read/write tokens were always 0. After investigation: the system prompt is ~50 tokens (under the 1024-token minimum for caching), and the diff is a user message that doesn't benefit from prefix caching in a single-shot request. There was no documentation explaining these constraints or when caching actually applies. The mental model of "cache the prompt so repeat requests are cheaper" doesn't match the reality of "cache a long prefix for multi-turn conversations."

**Proposed solution:** Add a guide explaining when prompt caching helps and when it doesn't, with concrete examples. Consider adding cache diagnostics to the response (e.g., `cacheStatus: "skipped:prefix_too_short"`) so developers can understand why caching isn't activating instead of debugging silence.

**Priority:** P2 — It's possible this just isn't working at all in which case it'd be a P0, or I'm misunderstanding/misusing it and then it's just clarity issue. Caching is provider-specific and not relevant to all use cases. But the complete lack of feedback when it doesn't work wastes debugging time.

---

## 8. Pre-request cost estimation

**What I tried to do:** Show users estimated costs before they generate, so they can compare models and make informed choices.

**What went wrong:** There's no way to estimate cost without actually making the request. For a 180K-character diff, the user has no idea if it'll cost $0.003 or $0.25 until after they've spent the money.

**Proposed solution:** Add `gateway.estimateCost({ model, system, prompt })` that tokenizes the input and returns estimated costs. Even better, return estimates for multiple models so the UI can show a comparison. The output cost would be estimated based on typical completion ratios, but even an input-only estimate would be valuable.

**Priority:** P3 — Nice-to-have for cost-conscious applications. The gateway already has tokenizers and pricing data, so this is a natural extension. There may be a tokenization workaround for this.

---

## 9. Response field types are inconsistent

**What I tried to do:** Display cost and token counts in the UI.

**What went wrong:** Some numeric fields in the SSE response arrived as strings instead of numbers. Calling `cost.toFixed(6)` threw "toFixed is not a function." Summing costs produced string concatenation instead of addition (`"0.10" + "0.05"` = `"0.100.05"` instead of `0.15`). Had to wrap everything in `Number()` as a workaround.

**Proposed solution:** Audit the response serialization to ensure numeric fields are consistently typed as numbers. This may be a JSON serialization issue in the gateway or SDK response building.

**Priority:** P2 — Easy fix, minor annoyance. But it's the kind of thing that erodes trust in the SDK.

---

## 10. Documentation search doesn't filter by product

**What I tried to do:** Search the Vercel docs for AI SDK and AI Gateway specific concepts.

**What went wrong:** Search results mixed AI SDK docs with other Vercel product docs (Next.js, deployment, etc.). When searching for concepts like "streaming," "caching," or "provider options," many results pointed to unrelated products. There's probably smart ranking but a product filter would save time.

**Proposed solution:** Add a product filter to the documentation search (e.g., filter to "AI SDK" or "AI Gateway" only).

**Priority:** P2 — Quality of life improvement. Doesn't block anything but slows down the development loop.

---

## 11. Broken link on provider options docs page

**What I tried to do:** Find the list of available models/providers from the provider options documentation.

**What went wrong:** The "Model list" link on https://vercel.com/docs/ai-gateway/models-and-providers/provider-options#available-providers leads to a [404](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway%2Fmodels&title=Go+to+Model+List).

**Proposed solution:** Fix the broken link to point to the correct model list page.

**Priority:** P1 — Broken links in docs are trivial to fix and directly block developers trying to find information. This is on a key page that people land on when configuring provider options.
