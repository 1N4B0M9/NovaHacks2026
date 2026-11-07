import { jsonAction } from "../../../server/http";
import { research } from "../../../server/research/run";

export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(request: Request) {
  return jsonAction(request, (body) => research(body));
}
