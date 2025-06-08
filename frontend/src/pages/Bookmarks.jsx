import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProblemCard from "../components/Problemcard";
import "../styles/Dashboard.css";

// Static tag list from Leetcode
const STATIC_TAGS = [
  "Array",
  "String",
  "Hash Table",
  "Dynamic Programming",
  "Math",
  "Sorting",
  "Greedy",
  "Depth-First Search",
  "Binary Search",
  "Database",
  "Matrix",
  "Tree",
  "Breadth-First Search",
  "Bit Manipulation",
  "Two Pointers",
  "Prefix Sum",
  "Heap (Priority Queue)",
  "Simulation",
  "Binary Tree",
  "Stack",
  "Graph",
  "Counting",
  "Sliding Window",
  "Design",
  "Enumeration",
  "Backtracking",
  "Union Find",
  "Linked List",
  "Ordered Set",
  "Number Theory",
  "Monotonic Stack",
  "Segment Tree",
  "Trie",
  "Combinatorics",
  "Bitmask",
  "Queue",
  "Divide and Conquer",
  "Recursion",
  "Binary Indexed Tree",
  "Memoization",
  "Hash Function",
  "Geometry",
  "Binary Search Tree",
  "String Matching",
  "Topological Sort",
  "Shortest Path",
  "Rolling Hash",
  "Game Theory",
  "Interactive",
  "Data Stream",
  "Monotonic Queue",
  "Brainteaser",
  "Doubly-Linked List",
  "Randomized",
  "Merge Sort",
  "Counting Sort",
  "Iterator",
  "Concurrency",
  "Probability and Statistics",
  "Quickselect",
  "Suffix Array",
  "Line Sweep",
  "Bucket Sort",
  "Minimum Spanning Tree",
  "Shell",
  "Reservoir Sampling",
  "Strongly Connected Component",
  "Eulerian Circuit",
  "Radix Sort",
  "Rejection Sampling",
  "Biconnected Component",
];

function Bookmarks() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]); // for tags
  const [bookmarks, setBookmarks] = useState([]);
  const [filterMode, setFilterMode] = useState("OR"); // as toggles btw STATE
  
  useEffect(() => {
    // Fetch bookmarks from the backend
    async function fetchBookmarks() {
      try {
        const response = await fetch("https://zcoder-backend.vercel.app/bookmarks", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("jwtoken")}`,
            },
            }
        );
        const data = await response.json();
        const bookmarks = data.bookmarks;
        const resp = await axios.get(
          `https://leetcode-api-mu.vercel.app/problems?limit=100`
        );
        const allProblems = resp.data.problemsetQuestionList;
        const bookmarkedProblems = allProblems.filter(problem =>
            bookmarks.includes(problem.titleSlug)
        );
        setProblems(bookmarkedProblems);
      } catch (error) {
        console.error("Error fetching bookmarks:", error);
      }
    }
    fetchBookmarks();
    }, []);

  useEffect(() => {
    // Redirect to the login page if the user is not authenticated
    const jwtoken = localStorage.getItem("jwtoken");
    if (jwtoken === null || jwtoken === undefined) {
      navigate("/login");
    }
  });

  const handleCardClick = (titleSlug) => {
    navigate(`/problem/${titleSlug}`); //take inp as params in this route
  };

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const filteredProblems =
    selectedTags.length === 0
      ? problems
      : problems.filter((problem) => {
          const tagNames = problem.topicTags.map((tag) => tag.name);
          return filterMode === "OR"
            ? selectedTags.some((tag) => tagNames.includes(tag))
            : selectedTags.every((tag) => tagNames.includes(tag));
        });

  return (
    <div className="dashboard-page">
      <h1>Problems</h1>

      {/* Filter Mode Toggle */}
      <div className="filter-mode-toggle">
        <p>Filter Mode:</p>
        <button
          onClick={() =>
            setFilterMode((prev) => (prev === "OR" ? "AND" : "OR"))
          }
        >
          {filterMode} (Click to switch)
        </button>
      </div>

      {/* Static Tags*/}
      <div className="tag-filters">
        <p>Filter by Tags:</p>
        <div className="tag-container">
          {STATIC_TAGS.map((tag) => (
            <button
              key={tag}
              className={`tag-button ${
                selectedTags.includes(tag) ? "selected" : ""
              }`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Problem List */}
      <div className="problems-container">
        {filteredProblems.length > 0 ? (
          <ul className="problem-list">
            {filteredProblems.map((problem) => (
              <li key={problem.questionFrontendId}>
                <ProblemCard
                  title={problem.title}
                  platform={"Leetcode"}
                  difficulty={problem.difficulty}
                  Accuracy={problem.acRate}
                  locked={problem.isPaidOnly}
                  onClick={() => handleCardClick(problem.titleSlug)}
                  titleSlug={problem.titleSlug}
                  onBookmarkToggle={(slug) => {
                          setProblems((prev) => prev.filter((p) => p.titleSlug !== slug));
                          //Only display the filtered ones
                          //this reduces the api calls and increases the user experience by quickly giving o/p.
                        }}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="no-problems">
            No problems found for selected tags.
          </div>
        )}
      </div>
    </div>
  );
}

export default Bookmarks;
