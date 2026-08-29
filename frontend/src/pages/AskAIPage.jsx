import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import "../styles/askAI.css";

const SUGGESTIONS = [
  "Explain the difference between DFS and BFS",
  "How do I reverse a linked list in C++?",
  "What's the time complexity of quicksort?",
  "Write a Python function to check for palindrome",
];

function AskAIPage() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState([]);
  const navigate = useNavigate();
  const conversationEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const jwtoken = localStorage.getItem("jwtoken");
    if (!jwtoken) navigate("/login");
  }, [navigate]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation, isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsLoading(true);
    try {
      const userMessage = { sender: "user", text: message, timestamp: Date.now() };
      setConversation((prev) => [...prev, userMessage]);

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"}/api/ask-ai`,
        { message },
        { headers: { Authorization: `Bearer ${localStorage.getItem("jwtoken")}` } }
      );

      const aiMessage = { sender: "ai", text: response.data.answer, timestamp: Date.now() };
      setConversation((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error getting AI response:", error);
      const errMsg = error.response?.data?.error || "Sorry, I encountered an error.";
      setConversation((prev) => [...prev, { sender: "ai", text: errMsg, timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
      setMessage("");
      inputRef.current?.focus();
    }
  };

  const handleSuggestion = (text) => {
    setMessage(text);
    inputRef.current?.focus();
  };

  const clearConversation = () => {
    setConversation([]);
  };

  return (
    <div className="ask-ai-container">
      {/* Header */}
      <div className="ai-header">
        <div className="ai-header-left">
          <span className="ai-avatar">🤖</span>
          <div>
            <h1>AI Assistant</h1>
            <p className="ai-subtitle">Powered by Qwen 3.6 · Free &amp; Instant</p>
          </div>
        </div>
        {conversation.length > 0 && (
          <button onClick={clearConversation} className="clear-chat-btn" title="Clear conversation">
            ✕ Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="conversation">
        {conversation.length === 0 && !isLoading && (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h3>Ask me anything about coding</h3>
            <p>I can help with algorithms, data structures, debugging, and more.</p>
            <div className="suggestions">
              {SUGGESTIONS.map((text, i) => (
                <button key={i} className="suggestion-chip" onClick={() => handleSuggestion(text)}>
                  {text}
                </button>
              ))}
            </div>
          </div>
        )}

        {conversation.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}`}>
            {msg.sender === "ai" && <span className="msg-avatar">🤖</span>}
            <div className="message-bubble">
              <div className="markdown-content">
                {msg.sender === "ai" ? (
                  <ReactMarkdown
                    components={{
                      code({ inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "");
                        if (!inline && match) {
                          return (
                            <div className="code-block">
                              <div className="code-block-header">
                                <span className="code-lang">{match[1]}</span>
                                <button
                                  className="copy-btn"
                                  onClick={() => navigator.clipboard.writeText(String(children))}
                                >
                                  Copy
                                </button>
                              </div>
                              <pre><code className={className} {...props}>{children}</code></pre>
                            </div>
                          );
                        }
                        return <code className="inline-code" {...props}>{children}</code>;
                      },
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                ) : (
                  <p>{msg.text}</p>
                )}
              </div>
              <span className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message ai">
            <span className="msg-avatar">🤖</span>
            <div className="message-bubble">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={conversationEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="message-form">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask me anything..."
          disabled={isLoading}
          maxLength={8000}
        />
        <button type="submit" disabled={isLoading || !message.trim()}>
          {isLoading ? (
            <span className="send-spinner"></span>
          ) : (
            <span>↑</span>
          )}
        </button>
      </form>
    </div>
  );
}

export default AskAIPage;
