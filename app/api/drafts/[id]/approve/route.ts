import { orders } from "../../../../../server/orders";
import { jsonAction } from "../../../../../server/http";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return jsonAction(request, (body) => orders().approve(id, body));
}
