import assert from "node:assert/strict";
import { test } from "node:test";
import { jsonAction } from "./http";
import { OrderError } from "./orders";

function request(body: string) {
  return new Request("http://localhost/api/drafts", { method: "POST", body });
}

test("malformed JSON and non-object payloads never reach the order service", async () => {
  for (const payload of ["{", "null", "[]", "4"]) {
    const response = await jsonAction(request(payload), () => assert.fail("unexpected invocation"));
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "invalid_json" });
  }
});

test("the HTTP adapter preserves application error codes", async () => {
  const response = await jsonAction(request("{}"), () => {
    throw new OrderError(404, "line_not_found");
  });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "line_not_found" });
});
