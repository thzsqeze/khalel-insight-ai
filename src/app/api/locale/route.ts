import { cookies } from "next/headers";
import { z } from "zod";
import { assertSameOrigin, readJson, respond } from "@/lib/server/http";
export async function POST(request: Request) {
  return respond(async () => {
    assertSameOrigin(request);
    const body = z.object({ locale: z.enum(["ru", "kk"]) }).strict().parse(await readJson(request));
    const jar = await cookies();
    jar.set("locale", body.locale, { path: "/", sameSite: "lax", maxAge: 31536000, httpOnly: true, secure: process.env.NODE_ENV === "production" });
    return { ok: true };
  });
}
