import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Calendar.css";

// Error Boundary Component
class CalendarErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Calendar Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h2>Something went wrong with the calendar</h2>
          <p>Please refresh the page or try again later.</p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="retry-button"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Enhanced localStorage hook with better persistence
const useStickyState = (defaultValue, key) => {
  const [value, setValue] = useState(() => {
    try {
      if (typeof window === "undefined") return defaultValue;

      const stickyValue = window.localStorage.getItem(key);
      if (stickyValue !== null) {
        const parsed = JSON.parse(stickyValue);

        // Special handling for date objects
        if (key === "calendar-current-date") {
          const date = new Date(parsed);
          return isNaN(date.getTime()) ? defaultValue : date;
        }

        return parsed;
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`Error saving to localStorage key "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue];
};

// Contest fetchers for different platforms
const contestFetchers = {
  // Codeforces API
  codeforces: async () => {
    try {
      const response = await fetch("https://codeforces.com/api/contest.list");
      if (!response.ok) throw new Error("Codeforces API failed");

      const data = await response.json();
      if (data.status === "OK") {
        return data.result
          .filter(contest => contest.phase === "BEFORE")
          .map(contest => ({
            id: `codeforces-${contest.id}`,
            name: contest.name,
            site: "Codeforces",
            start_time: new Date(contest.startTimeSeconds * 1000),
            duration: contest.durationSeconds,
            url: `https://codeforces.com/contest/${contest.id}`,
            verified: true,
            color: "#1f8dd6"
          }));
      }
      return [];
    } catch (error) {
      console.error("Codeforces fetch error:", error);
      return [];
    }
  },

  // AtCoder API (Fixed CORS issue)
  atcoder: async () => {
    try {
      // Use the official AtCoder Problems API which supports CORS
      const response = await fetch("https://kenkoooo.com/atcoder/resources/contests.json");
      if (!response.ok) {
        throw new Error(`AtCoder API failed with status: ${response.status}`);
      }

      const contests = await response.json();
      const now = Date.now() / 1000;

      // Filter for upcoming contests and convert to our format
      const upcomingContests = contests
        .filter(contest => {
          const startTime = contest.start_epoch_second;
          return startTime > now; // Only future contests
        })
        .slice(0, 15) // Limit to avoid too many contests
        .map(contest => ({
          id: `atcoder-${contest.id}`,
          name: contest.title,
          site: "AtCoder",
          start_time: new Date(contest.start_epoch_second * 1000),
          duration: contest.duration_second,
          url: `https://atcoder.jp/contests/${contest.id}`,
          verified: true,
          color: "#ff6b35"
        }));

      return upcomingContests;
    } catch (error) {
      console.error("AtCoder fetch error:", error);

      // Enhanced fallback with more realistic sample data
      const now = new Date();
      const sampleContests = [
        {
          id: "atcoder-abc359",
          name: "AtCoder Beginner Contest 359",
          site: "AtCoder",
          start_time: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
          duration: 6000, // 100 minutes
          url: "https://atcoder.jp/contests/abc359",
          verified: false,
          color: "#ff6b35"
        },
        {
          id: "atcoder-arc181",
          name: "AtCoder Regular Contest 181",
          site: "AtCoder",
          start_time: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
          duration: 7200, // 120 minutes
          url: "https://atcoder.jp/contests/arc181",
          verified: false,
          color: "#ff6b35"
        },
        {
          id: "atcoder-agc064",
          name: "AtCoder Grand Contest 064",
          site: "AtCoder",
          start_time: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
          duration: 7200, // 120 minutes
          url: "https://atcoder.jp/contests/agc064",
          verified: false,
          color: "#ff6b35"
        }
      ];

      return sampleContests;
    }
  },

  // CodeChef API (using sample data since no public API)
  codechef: async () => {
    try {
      // CodeChef doesn't have a public API for contests, so we'll use sample data
      const now = new Date();
      const futureContests = [
        {
          id: "codechef-starters140",
          name: "Starters 140 (Div. 2)",
          site: "CodeChef",
          start_time: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
          duration: 7200, // 2 hours
          url: "https://www.codechef.com/START140",
          verified: false,
          color: "#5d4037"
        },
        {
          id: "codechef-starters141",
          name: "Starters 141 (Div. 2)",
          site: "CodeChef",
          start_time: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000), // 8 days from now
          duration: 7200, // 2 hours
          url: "https://www.codechef.com/START141",
          verified: false,
          color: "#5d4037"
        },
        {
          id: "codechef-long-june",
          name: "June Long Challenge 2025",
          site: "CodeChef",
          start_time: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
          duration: 432000, // 5 days
          url: "https://www.codechef.com/JUNE25",
          verified: false,
          color: "#5d4037"
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      return futureContests;
    } catch (error) {
      console.error("CodeChef fetch error:", error);
      return [];
    }
  },

  // LeetCode contests (sample data as they don't have a public API)
  leetcode: async () => {
    try {
      const now = new Date();
      const futureContests = [
        {
          id: "leetcode-weekly402",
          name: "Weekly Contest 402",
          site: "LeetCode",
          start_time: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
          duration: 5400, // 1.5 hours
          url: "https://leetcode.com/contest/weekly-contest-402",
          verified: false,
          color: "#ffa116"
        },
        {
          id: "leetcode-biweekly134",
          name: "Biweekly Contest 134",
          site: "LeetCode",
          start_time: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          duration: 5400, // 1.5 hours
          url: "https://leetcode.com/contest/biweekly-contest-134",
          verified: false,
          color: "#ffa116"
        },
        {
          id: "leetcode-weekly403",
          name: "Weekly Contest 403",
          site: "LeetCode",
          start_time: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000), // 9 days from now
          duration: 5400, // 1.5 hours
          url: "https://leetcode.com/contest/weekly-contest-403",
          verified: false,
          color: "#ffa116"
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 600));
      return futureContests;
    } catch (error) {
      console.error("LeetCode fetch error:", error);
      return [];
    }
  },

  // HackerRank contests (sample data)
  hackerrank: async () => {
    try {
      const now = new Date();
      const futureContests = [
        {
          id: "hackerrank-june-circuit",
          name: "June Circuit 2025",
          site: "HackerRank",
          start_time: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
          duration: 28800, // 8 hours
          url: "https://www.hackerrank.com/contests/june-circuit-2025",
          verified: false,
          color: "#00b894"
        },
        {
          id: "hackerrank-hiring-challenge",
          name: "Hiring Challenge 2025",
          site: "HackerRank",
          start_time: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000), // 12 days from now
          duration: 14400, // 4 hours
          url: "https://www.hackerrank.com/contests/hiring-challenge-2025",
          verified: false,
          color: "#00b894"
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      return futureContests;
    } catch (error) {
      console.error("HackerRank fetch error:", error);
      return [];
    }
  }
};

// Loading Component
const LoadingSpinner = () => (
  <div className="loading-container">
    <div className="loading-spinner">⟳</div>
    <p>Loading contests...</p>
  </div>
);

// Main Calendar Component
const Calendar = () => {
  const navigate = useNavigate();

  // State management with persistent storage
  const [currentDate, setCurrentDate] = useStickyState(
    new Date(),
    "calendar-current-date"
  );

  // Fixed selectedPlatforms with useStickyState
  const [selectedPlatforms, setSelectedPlatforms] = useStickyState(
    ['Codeforces', 'AtCoder', 'CodeChef', 'LeetCode', 'HackerRank'],
    "calendar-selected-platforms"
  );

  const [contests, setContests] = useState([]);
  const [selectedDateContests, setSelectedDateContests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [platformStatus, setPlatformStatus] = useState({});

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Check authentication
  useEffect(() => {
    const jwtoken = localStorage.getItem("jwtoken");
    if (!jwtoken) {
      navigate("/login");
    }
  }, [navigate]);

  // Ensure currentDate is always a valid Date object
  useEffect(() => {
    if (!(currentDate instanceof Date) || isNaN(currentDate.getTime())) {
      setCurrentDate(new Date());
    }
  }, [currentDate, setCurrentDate]);

  // Enhanced contest fetching with better error handling
  const fetchContests = useCallback(async () => {
    setLoading(true);
    setError(null);

    const initialStatus = {};
    Object.keys(contestFetchers).forEach(platform => {
      initialStatus[platform] = 'loading';
    });
    setPlatformStatus(initialStatus);

    try {
      const contestPromises = Object.entries(contestFetchers).map(async ([platform, fetcher]) => {
        try {
          const contests = await fetcher();
          setPlatformStatus(prev => ({
            ...prev,
            [platform]: contests.length > 0 ? 'success' : 'partial'
          }));
          return contests;
        } catch (error) {
          console.error(`Error fetching ${platform} contests:`, error);
          setPlatformStatus(prev => ({ ...prev, [platform]: 'error' }));

          // Return empty array instead of throwing to prevent Promise.all from failing
          return [];
        }
      });

      const contestArrays = await Promise.all(contestPromises);
      const allContests = contestArrays.flat();

      // Sort contests by start time
      allContests.sort((a, b) => a.start_time - b.start_time);

      setContests(allContests);

      // Show warning if some platforms failed
      const failedPlatforms = Object.entries(platformStatus)
        .filter(([_, status]) => status === 'error')
        .map(([platform, _]) => platform);

      if (failedPlatforms.length > 0 && allContests.length > 0) {
        setError(`Some platforms failed to load: ${failedPlatforms.join(', ')}. Using cached/sample data.`);
      } else if (allContests.length === 0) {
        setError("No upcoming contests found from any platform.");
      }
    } catch (error) {
      console.error("Error fetching contests:", error);
      setError("Failed to fetch contests from platforms.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContests();
  }, [fetchContests]);

  // Filter contests by selected platforms
  const filteredContests = contests.filter(contest =>
    selectedPlatforms.includes(contest.site)
  );

  // Get contest counts by platform
  const contestCounts = contests.reduce((acc, contest) => {
    acc[contest.site] = (acc[contest.site] || 0) + 1;
    return acc;
  }, {});

  const getDaysInMonth = useCallback((date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }, []);

  const getFirstDayOfMonth = useCallback((date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1;
  }, []);

  const hasContestOnDate = useCallback((date) => {
    return filteredContests.some(contest => {
      const contestDate = contest.start_time;
      return (
        contestDate.getFullYear() === date.getFullYear() &&
        contestDate.getMonth() === date.getMonth() &&
        contestDate.getDate() === date.getDate()
      );
    });
  }, [filteredContests]);

  const getContestsForDate = useCallback((date) => {
    return filteredContests
      .filter(contest => {
        const contestDate = contest.start_time;
        return (
          contestDate.getFullYear() === date.getFullYear() &&
          contestDate.getMonth() === date.getMonth() &&
          contestDate.getDate() === date.getDate()
        );
      })
      .sort((a, b) => a.start_time - b.start_time);
  }, [filteredContests]);

  const handleDateClick = useCallback((day) => {
    const clickedDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    setSelectedDateContests(getContestsForDate(clickedDate));
  }, [currentDate, getContestsForDate]);

  const handlePlatformToggle = useCallback((platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
    setSelectedDateContests([]);
  }, [setSelectedPlatforms]);

  const navigateMonth = useCallback((direction) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
    setSelectedDateContests([]);
  }, [setCurrentDate]);

  const navigateYear = useCallback((direction) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setFullYear(newDate.getFullYear() + direction);
      return newDate;
    });
    setSelectedDateContests([]);
  }, [setCurrentDate]);

  const renderCalendarDays = useCallback(() => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty days for alignment
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Actual days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        day
      );
      const hasContest = hasContestOnDate(date);
      const contestsForDay = getContestsForDate(date);

      days.push(
        <div
          key={day}
          className={`calendar-day ${hasContest ? "has-contest" : ""}`}
          onClick={() => handleDateClick(day)}
        >
          <span className="day-number">{day}</span>
          {hasContest && (
            <div className="contest-indicator">
              <div className="contest-dots">
                {contestsForDay.slice(0, 3).map((contest, index) => (
                  <div
                    key={contest.id}
                    className="contest-dot"
                    style={{ backgroundColor: contest.color }}
                    title={`${contest.site}: ${contest.name}`}
                  ></div>
                ))}
              </div>
              {contestsForDay.length > 3 && (
                <span className="contest-count">+{contestsForDay.length - 3}</span>
              )}
              {contestsForDay.length <= 3 && contestsForDay.length > 1 && (
                <span className="contest-count">{contestsForDay.length}</span>
              )}
            </div>
          )}
        </div>
      );
    }

    return days;
  }, [
    currentDate,
    getDaysInMonth,
    getFirstDayOfMonth,
    hasContestOnDate,
    getContestsForDate,
    handleDateClick
  ]);

  if (!currentDate || isNaN(currentDate.getTime())) {
    return (
      <div className="error-container">
        <h2>Calendar Error</h2>
        <p>Invalid date detected. Please refresh the page.</p>
        <button onClick={() => window.location.reload()}>Refresh</button>
      </div>
    );
  }

  return (
    <div className="calendar-container">
      <div className="calendar-wrapper">
        <div className="calendar-section">
          <div className="calendar-header">
            <div className="navigation">
              <button className="nav-button year-nav" onClick={() => navigateYear(-1)}>
                ‹‹
              </button>
              <button className="nav-button" onClick={() => navigateMonth(-1)}>
                ‹
              </button>
              <h2 className="month-year">
                {months[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button className="nav-button" onClick={() => navigateMonth(1)}>
                ›
              </button>
              <button className="nav-button year-nav" onClick={() => navigateYear(1)}>
                ››
              </button>
            </div>

          </div>

          <div className="calendar-grid">
            <div className="days-header">
              {daysOfWeek.map(day => (
                <div key={day} className="day-header">
                  {day}
                </div>
              ))}
            </div>
            <div className="days-grid">{renderCalendarDays()}</div>
          </div>
        </div>

        <div className="contests-sidebar">
          <div className="contests-section">
            <h3>
              {selectedDateContests.length > 0
                ? "Selected Date Contests"
                : "Upcoming Contests"
              }
            </h3>

            {loading && <LoadingSpinner />}
            {error && <div className="error-message">{error}</div>}

            <div className="contests-list">
              {selectedDateContests.length > 0 ? (
                selectedDateContests.map(contest => (
                  <div key={contest.id} className="contest-item">
                    <h4>
                      <span
                        className={`platform-badge platform-${contest.site.toLowerCase()}`}
                        style={{ backgroundColor: contest.color }}
                      >
                        {contest.site}
                      </span>
                      {contest.name}
                      {!contest.verified && <span className="unverified">*</span>}
                    </h4>
                    <p>
                      <span className="label">Start:</span>{" "}
                      {contest.start_time.toLocaleString()}
                    </p>
                    <p>
                      <span className="label">Duration:</span>{" "}
                      {Math.floor(contest.duration / 3600)}h {Math.floor((contest.duration % 3600) / 60)}m
                    </p>
                    <a
                      href={contest.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="contest-link"
                    >
                      View Contest →
                    </a>
                  </div>
                ))
              ) : (
                <div className="upcoming-contests-preview">
                  {filteredContests.slice(0, 5).map(contest => (
                    <div key={contest.id} className="contest-item preview">
                      <h4>
                        <span
                          className={`platform-badge platform-${contest.site.toLowerCase()}`}
                          style={{ backgroundColor: contest.color }}
                        >
                          {contest.site}
                        </span>
                        {contest.name}
                        {!contest.verified && <span className="unverified">*</span>}
                      </h4>
                      <p>
                        <span className="label">Start:</span>{" "}
                        {contest.start_time.toLocaleDateString()} at{" "}
                        {contest.start_time.toLocaleTimeString()}
                      </p>
                      <a
                        href={contest.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="contest-link"
                      >
                        View Contest →
                      </a>
                    </div>
                  ))}
                  {filteredContests.length === 0 && !loading && (
                    <div className="no-contests">
                      No contests found for selected platforms
                    </div>
                  )}
                </div>
              )}
            </div>

            {filteredContests.some(c => !c.verified) && (
              <div className="disclaimer">
                <small>* Unverified contests are sample data or estimated schedules</small>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// CalendarWithErrorBoundary wrapper
const CalendarWithErrorBoundary = () => (
  <CalendarErrorBoundary>
    <Calendar />
  </CalendarErrorBoundary>
);

export default CalendarWithErrorBoundary;
