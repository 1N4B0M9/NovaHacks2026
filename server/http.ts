import { OrderError } from "./orders";

export async function jsonAction(
  request: Request,
  run: (body: Record<string, unknown>) => unknown,
  status = 200,
) {
  try {
    const body = await request.json().catch(() => {
      throw new OrderError(400, "invalid_json");
    });
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new OrderError(400, "invalid_json");
    return Response.json(await run(body), { status });
  } catch (error) {
    if (error instanceof OrderError)
      return Response.json(
        { error: error.message, draft: error.draft },
        { status: error.status },
      );
    throw error;
  }
}
