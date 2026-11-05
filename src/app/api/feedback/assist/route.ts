import { draftAssistantRequestSchema } from "@/lib/draft-assistant";
import { assistDraft } from "@/lib/server/draft-assistant";
import { ApiError } from "@/lib/server/errors";
import { assertSameOrigin, rateLimit, readJson, respond } from "@/lib/server/http";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  return respond(async () => {
    assertSameOrigin(request);
    const input = draftAssistantRequestSchema.safeParse(await readJson(request));
    if (!input.success) {
      if (input.error.issues.some((issue) => issue.path[0] === "assistantConsent"))
        throw new ApiError("assistant_consent", 403);
      throw input.error;
    }
    await rateLimit(request, "draft-assistant", 5);
    return assistDraft(input.data);
  });
}
