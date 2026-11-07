import { orders } from "../../../server/orders";
import { jsonAction } from "../../../server/http";

export async function POST(request: Request) {
  return jsonAction(request, (body) => orders().create(body), 201);
}
