const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
const PROBLEM_SLUG_PATTERN = /^[a-z0-9-]{1,128}$/i;

function isValidRoomId(value) {
  return typeof value === "string" && ROOM_ID_PATTERN.test(value);
}

function isValidProblemSlug(value) {
  return typeof value === "string" && PROBLEM_SLUG_PATTERN.test(value);
}

function isValidSolutionPayload({ problemSlug, code, language }) {
  return isValidProblemSlug(problemSlug) && typeof code === "string" && code.trim().length > 0 && code.length <= 100_000 &&
    typeof language === "string" && ["cpp", "java", "python", "typescript"].includes(language);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { escapeRegex, isValidProblemSlug, isValidRoomId, isValidSolutionPayload };
