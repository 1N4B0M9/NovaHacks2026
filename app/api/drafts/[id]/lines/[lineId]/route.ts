import { orders } from "../../../../../../server/orders";
import { jsonAction } from "../../../../../../server/http";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; lineId: string }> },
) {
  const { id, lineId } = await context.params;
  return jsonAction(request, (body) => orders().edit(id, lineId, body));
}
