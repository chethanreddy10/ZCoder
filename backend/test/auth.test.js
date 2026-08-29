const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
const { signToken, verifyToken } = require("../config/auth");

test("auth signs and verifies a user payload", () => {
  const payload = { username: "coder", user_id: "user-1" };
  assert.deepEqual(verifyToken(signToken(payload)).username, payload.username);
  assert.equal(verifyToken(signToken(payload)).user_id, payload.user_id);
});

test("auth rejects tampered tokens", () => {
  assert.throws(() => verifyToken("not.a.valid.token"));
});
