import { OrderError, orders } from "../../../../server/orders";
import { research } from "../../../../server/research/run";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value))
      return Response.json({ error: "invalid_json" }, { status: 400 });
    body = value as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        const zip = typeof body.zip === "string" ? body.zip.trim() : "";
        if (!/^\d{5}(?:-\d{4})?$/.test(zip))
          throw new OrderError(400, "invalid_location");
        const draft = orders().create(body);
        send({
          type: "list",
          lines: draft.lines.map((line) => ({
            id: line.id,
            source: line.source,
            status: line.status,
          })),
        });
        const cart = await orders().recommend(
          draft.id,
          { version: draft.version, zip },
          research,
          (event) => send({ type: "line", ...event }),
        );
        send({ type: "draft", draft: cart });
      } catch (error) {
        send({
          type: "error",
          error: error instanceof OrderError ? error.message : "retry",
        });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
