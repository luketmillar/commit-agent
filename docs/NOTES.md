# Notes

This was a great exercise to explore AI-gateway and AI SDK in more depth and try to understand how it works, what the constraints are, and what the opportunities are.

## Approach

I made a NEXTjs web app hosted on Vercel with the AI SDK and gateway packages on the backend.
I created an API key and added it as an env variable so that it wasnt shared in my codebase.
I chose to deploy and host it so you can use it without needing to run locally and set up your own api key for testing.

### Product Overview

I chose to keep the product of this real simple so I could spend time understanding what is happening under the hood.
The page is simple with a file upload where you can select multiple .patch files and upload them to the server.
You can pick a model that works through ai-gateway. This list is populated through the getAvailableModels endpoint. I filter it to a recommended list, but you can use any of them.

When you hit generate, I upload the patches, along with the selected model, and generate a commit message along with the reasoning, token usage, and costs.

### Product Decisions

I chose to stream the results back to the client so that the user can see the content as it is generated. This felt like a more alive version than a loading spinner followed by all of the text popping in at once.

I also chose to stream the reasoning text as well. This is probably not necessarily the intended usecase for streaming the response text but I felt like it was helpful for showcasing the "thinking"/"reasoning" that some of the models do. It hits different than just a "uploading...", "thinking...", followed by streaming in the response text in the end.

This is a web app. It could have been a cli tool as well where you can pipe the git diff into the tool and get a commit message. This seemed like a good product decision to go that way but I chose not to go this route for this assignment because I didn't want to spend time for this exercise dealing with cli arg parsing instead of working with the sdk and ai-gateway integration. If I were to go this route there is a technical consideration around the api key to make which is that we don't want to include our ai key out in the open so we'd still need a backend running that handles api requests and can rate limit or block bad actors and keep that key private OR we can let the user supply their out api key for local usage.

I built a version first that had a 2-step generation pipeline where it would use a model like sonnet 4 for understanding the code and describing technically what the changes are, and then use another model to generate the commit message. It worked fine but I removed it because it wasn't really giving any benefit. The effort to understand the code, and then pass that response into a new model never really saved money and I didn't see significantly different results.

If you were going to productize this, you really want to have access to the whole codebase (not just the diff) to be able to better understand the context of the change. It actually performs pretty well with just the context of the diff, but it could be better.

## Rough Edges

I found the initial setup to be simple. Creating a gateway and generating text was real easy. The documentation and getting started examples were good for this.
To do much more than that I found it really hard to find good details in the documentation.

### Reasoning

When I got into trying to see and understand the reasoning, the documentation was unclear.
This is all pretty buried. I'm still not positive I handled this right.

#### ProviderOptions

For some models you have to set ProviderOptions to tell it to perform reasoning. Some providers do it automatically (DeepSeek). Some providers needed to be told (Anthropic).
The ProviderOption stucture was a per-model set of options. I would have expected that AI-gateway being the wrapper that lets user operate at a model-agnostic level would abstract this away. Instead I had to go search for each possible model and what the correct ProviderOptions were for them to get it to think.
Those ProviderOptions aren't typed I don't believe. There is a ProviderOptions type inside the AI-SDK but it's not exported. And even if it was, it seems to just be an key/value object blob.
I was able to find the @ai-sdk/provider-utils library to try to type some of this but that didn't work either. There was a lot of trial and error here and with inconsistent results across models I'm just not confident I sent this up right.

#### Reasoning Results

Some models reflect their reasoning back to the caller and some don't. Again, I dont think this was documented anywhere. At least I couldn't find it. This was all trial on error on my side.
I know the openai models have a `reasoningEffort` field but I never saw reasoning text come back from them.
Anthropic was consistent in giving it's reasoning when I asked for it.

### Streaming

I chose to stream back the reasoning text to show it in real time to the user to give the sense of thinking and what is being understood from the uploaded diff. This was hard to find. I think there's a reasoningText streaming field but in that case it doesn't seem like you can also stream the responseText. I had to dig pretty deep to find stream.fullStream that lets you read both reasoning and full text. Maybe this isn't a common use case but I hit it pretty quick and the documentation was hard to find.

I think the documentation was also wrong (or at least inconsistent). For reasoningText and responseText the documentation says to read from data.delta for each chunk. I think that might have been true if you were reading just from those specific streams, but from fullStream it was data.text as the field. Seems like this documentation could get cleaned up.

I had to do some trial and error with the `part.type` to understand what I should be looking at. The documentation says to use `part.type='reasoning'` but what I saw in practice was `part.type='reasoning-delta'`. Maybe it's just out of date? https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text#full-stream.text-stream-part.type

### Pricing

Pricing seemed mostly good. I wanted to be able to split pricing info based on input tokens and output tokens.
It seems like the sdk gives you actual total pricing with the response but that doesn't split between input and output. What I chose to do was look at the number of input tokens and output tokens and estimate the split using the defined model pricing since it _is_ split between input and output. It worked for this case, but I would expect that the response would split that pricing for you so that it's actual and not an estimate.

In order to get the input/output pricing for the model used, I used the response that said what model was actually used (since I defined fallback models in my request) and then looked up the pricing for the model that was used (it might have been a different model than what the user specified).
The issue here was that there's no sdk function for get model by id. So the options were to get all the models and find the one I care about to get the input/output pricing or use the `/v1/models/{id}/endpoints` api to fetch the model metadata directly. I went this route but we should just have getModel(id) in the sdk.

### Caching

I never got this working and was actually unclear in the end what would have made sense here. I couldn't find clear documentation on this in the sdk docs. It's possible I missed it.

Here's what I would expect from caching: if a user makes the same request with the same prompt and model, there's no need to regenerate all of the content again. We can save money and cycles by just returning the cached result from before. In this specific product/usecase that's probably not that common. You're not creating the same commit message over and over from the same diff, but if you were to try, I would expect the sdk to properly cache those results and save those tokens.

I added the `cacheControl` flag to the anthropic `ProviderOptions` but I saw no different. I didn't see a cost different at all and the cache token fields on the response were always empty. I could spend more time trying to debug and understand this.

### Model selection

I set the model fallbacks in my streamText request. If I had multiple requests though, I would have had to set that fallback list on every request.
To me it would make more sense to define the model that you want to use (with it's fallback, and provider options) 1 time, and then reuse it for all requests. At least optionally.
I think in some cases you care more about "How I want to use this model" and less "What I want for this specific request".

### Cost Estimate

It'd be great to have a `gateway.estimateCost({ model: '', system: PROMPT, prompt: diff })` function to call to get a pre-execute cost estimate. In this case you could even show it in the UI to see how much those costs change from model to model. The estimate wouldn't have access to the output but in this specific product case the output is more constrained than the input (which could be a huge diff).

### Small Items

There were weirdnesses with some response field types. Some numbers were returned as strings and some weren't. I didn't spend a lot of time debugging this. Just worked around it. It's worth a quick audit though.
I wish the search on the Vercel documentation site let you filter to specific products. There were many searches for concepts that pointed to different product documentation. It probably does some smart ordering but I wish there was a filter.
