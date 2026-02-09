import { gateway } from "../shared";

export async function GET() {
  const { models } = await gateway.getAvailableModels();

  const languageModels = models
    .filter((m) => m.modelType === "language")
    .map((m) => ({ id: m.id, name: m.name }));

  return Response.json(languageModels);
}
