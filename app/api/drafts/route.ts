import { OrderError, orders } from "../../../server/orders";
import { jsonAction } from "../../../server/http";

export async function POST(request: Request) {
  return jsonAction(
    request,
    async (body) => {
      const zip = typeof body.zip === "string" ? body.zip.trim() : "";
      if (!/^\d{5}(?:-\d{4})?$/.test(zip))
        throw new OrderError(400, "invalid_location");
      const draft = orders().create(body);
      return orders().recommend(draft.id, { version: draft.version, zip });
    },
    201,
  );
}
