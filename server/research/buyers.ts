import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { Output, ToolLoopAgent, stepCountIs, tool } from "ai";
import { z } from "zod";
import { searchArea } from "./area";
import type { ResearchIngredient } from "./ingredient";
import type { Offer } from "./rank";

const choice = z.object({
  productId: z.string().min(1).max(200),
});

export type Buyer = (
  item: ResearchIngredient,
  zip: string,
  signal: AbortSignal,
) => Promise<Offer | null>;

// One shopper team per order. Each line gets its own agent and its own
// listing memory, so one user's search cannot see another user's results.
export function buyerForOrder(orderId: string): Buyer | null {
  const key = process.env.OPENROUTER_API_KEY;
  const modelId = process.env.OPENROUTER_VISION_MODEL;
  if (!key || !modelId) return null;
  const provider = createOpenRouter({
    apiKey: key,
    appName: "Mise",
    compatibility: "strict",
  });
  return (item, zip, signal) =>
    shopLine(provider.chat(modelId), orderId, item, zip, signal);
}

async function shopLine(
  model: ReturnType<ReturnType<typeof createOpenRouter>["chat"]>,
  orderId: string,
  item: ResearchIngredient,
  zip: string,
  signal: AbortSignal,
) {
  const seen = new Map<string, Offer>();
  const agent = new ToolLoopAgent({
    model,
    instructions:
      "You buy one kitchen line for one order. Search the grocery nearest the ZIP, then choose a productId that a search returned. Never invent a product, a price, or an id. Prefer the fresh cooking ingredient over chips, sauce, beer, bath products, or a different food. Prefer a listing that publishes a price.",
    stopWhen: stepCountIs(4),
    output: Output.object({ schema: choice }),
    tools: {
      searchNearby: tool({
        description:
          "Search the grocery nearest this order's ZIP. Returns only real listings from that search.",
        inputSchema: z.object({
          query: z.string().min(2).max(80),
        }),
        execute: async ({ query }, { abortSignal }) => {
          const offers = await searchArea(
            { ...item, query: query.trim() },
            zip,
            abortSignal ?? signal,
          );
          for (const offer of offers) seen.set(offer.productId, offer);
          return offers.map((offer) => ({
            productId: offer.productId,
            title: offer.title,
            supplier: offer.supplier,
            price: offer.priceMinor == null ? null : offer.priceMinor / 100,
            pack:
              offer.packQuantity != null && offer.packUnit
                ? `${offer.packQuantity} ${offer.packUnit}`
                : null,
          }));
        },
      }),
    },
  });
  const prompt = [
    `Order ${orderId}.`,
    `ZIP ${zip}.`,
    `Line: ${item.source}`,
    `Ingredient: ${item.query}.`,
    `Quantity: ${item.quantity ?? "unknown"} ${item.unit ?? "unspecified"}.`,
    "Search at least once, then return the best productId.",
  ].join("\n");
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await agent.generate({ abortSignal: signal, prompt });
      const id = result.output?.productId;
      if (!id) continue;
      const offer =
        seen.get(id) ??
        [...seen.values()].find(
          (row) => row.title === id || row.productId.endsWith(id),
        );
      if (offer) return offer;
    } catch {
      if (signal.aborted) return null;
    }
  }
  return null;
}
