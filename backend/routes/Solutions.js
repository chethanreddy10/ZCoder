const express = require("express");
const router = express.Router();
const Solution = require("../models/Solution");
const auth = require("../middleware/auth");
const { isValidSolutionPayload } = require("../utils/validation");

// Submit a solution
router.post("/submit", auth, async (req, res) => {
  try {
    const { problemSlug, code, language } = req.body;
    if (!isValidSolutionPayload({ problemSlug, code, language })) {
      return res.status(400).json({ error: "Invalid solution payload" });
    }

    // Here you would typically run the code against test cases
    // For simplicity, we'll just save it
    const solution = new Solution({
      problemSlug,
      code,
      language,
      author: req.user.user_id,
    });

    await solution.save();

    res.json({
      success: true,
      message: "Solution submitted successfully!",
      passed: null,
      details: "Solution saved. Automated judging is not configured.",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const solution = await Solution.findById(req.params.id);

    // Check if solution exists and user is the author
    if (!solution) {
      return res.status(404).json({ error: "Solution not found" });
    }
    if (solution.author.toString() !== req.user.user_id) {
      return res
        .status(403)
        .json({ error: "Unauthorized to delete this solution" });
    }

    await Solution.deleteOne({ _id: req.params.id });
    res.json({ success: true, message: "Solution deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

// Get all solutions for a problem
router.get("/:problemSlug", async (req, res) => {
  try {
    const solutions = await Solution.find({
      problemSlug: req.params.problemSlug,
    })
      .select("-voterChoices")
      .populate("author", "Username _id")
      .sort({ createdAt: -1 });

    res.json(solutions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get solution detail
router.get("/detail/:id", async (req, res) => {
  try {
    const solution = await Solution.findById(req.params.id).select("-voterChoices").populate(
      "author",
      "Username _id"
    );
    if (!solution) return res.status(404).json({ error: "Solution not found" });
    res.json(solution);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Handle voting
router.post("/vote", auth, async (req, res) => {
  try {
    const { solutionId, voteType } = req.body;
    if (!['upvote', 'downvote'].includes(voteType)) return res.status(400).json({ error: "Invalid vote type" });
    const solution = await Solution.findById(solutionId);

    if (!solution) {
      return res.status(404).json({ error: "Solution not found" });
    }

    const value = voteType === "upvote" ? 1 : -1;
    const existingVote = solution.voterChoices.find((vote) => vote.user.toString() === req.user.user_id);
    if (existingVote) {
      if (existingVote.value === value) return res.status(409).json({ error: "You have already cast this vote" });
      solution.votes += value - existingVote.value;
      existingVote.value = value;
    } else {
      solution.voterChoices.push({ user: req.user.user_id, value });
      solution.votes += value;
    }
    await solution.save();

    res.json({ success: true, votes: solution.votes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
