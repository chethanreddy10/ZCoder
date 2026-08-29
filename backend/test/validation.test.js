const test = require("node:test");
const assert = require("node:assert/strict");
const { escapeRegex, isValidProblemSlug, isValidRoomId, isValidSolutionPayload } = require("../utils/validation");

test("bookmark slugs accept normal LeetCode slugs and reject unsafe values", () => {
  assert.equal(isValidProblemSlug("two-sum"), true);
  assert.equal(isValidProblemSlug("two sum"), false);
  assert.equal(isValidProblemSlug("../two-sum"), false);
});

test("solution validation accepts supported languages only", () => {
  assert.equal(isValidSolutionPayload({ problemSlug: "two-sum", code: "print(1)", language: "python" }), true);
  assert.equal(isValidSolutionPayload({ problemSlug: "two-sum", code: "print(1)", language: "ruby" }), false);
  assert.equal(isValidSolutionPayload({ problemSlug: "two-sum", code: "console.log(1)", language: "typescript" }), true);
  assert.equal(isValidSolutionPayload({ problemSlug: "two-sum", code: "console.log(1)", language: "javascript" }), false);
});

test("socket room IDs enforce the same constraints as the UI", () => {
  assert.equal(isValidRoomId("interview_room-1"), true);
  assert.equal(isValidRoomId("room with spaces"), false);
  assert.equal(isValidRoomId("x".repeat(65)), false);
});

test("user-search input is escaped before becoming a MongoDB regex", () => {
  assert.equal(escapeRegex("a.*"), "a\\.\\*");
});
