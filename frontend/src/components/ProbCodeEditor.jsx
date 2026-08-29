import React, { useState, useEffect, useCallback, useRef } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";
import { COMPILER_IDS, CODE_SNIPPETS } from "./constants";
import LanguageSelector from "./LanguageSelector";
import "./ProbCodeEditor.css";

// Execution timeout in milliseconds (30 seconds)
const EXECUTION_TIMEOUT = 30000;
// Max retries before giving up
const MAX_RETRIES = 2;

export default function ProbCodeEditor({
  value,
  onChange,
  inputValue,
  onInputChange,
  language: controlledLanguage,
  onLanguageChange,
}) {
  const [uncontrolledLanguage, setUncontrolledLanguage] = useState("cpp");
  const language = controlledLanguage || uncontrolledLanguage;
  const setLanguage = onLanguageChange || setUncontrolledLanguage;
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [currentLine, setCurrentLine] = useState(1);
  const [currentColumn, setCurrentColumn] = useState(1);
  const [savedSnippets, setSavedSnippets] = useState([]);
  const [snippetName, setSnippetName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const [theme, setTheme] = useState("light");
  const [fontSize, setFontSize] = useState(14);
  const [execStats, setExecStats] = useState(null);
  const editorRef = useRef(null);

  // Load saved data from localStorage
  useEffect(() => {
    const loadData = () => {
      const savedSnippets = localStorage.getItem("codeSnippets");
      const savedTheme = localStorage.getItem("editorTheme");
      const savedFontSize = localStorage.getItem("editorFontSize");
      
      if (savedSnippets) setSavedSnippets(JSON.parse(savedSnippets));
      if (savedTheme) setTheme(savedTheme);
      if (savedFontSize) setFontSize(parseInt(savedFontSize));
    };
    
    loadData();
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem("codeSnippets", JSON.stringify(savedSnippets));
  }, [savedSnippets]);

  useEffect(() => {
    localStorage.setItem("editorTheme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("editorFontSize", fontSize.toString());
  }, [fontSize]);

  // Set default snippet when language changes (not on re-renders)
  const prevLanguageRef = useRef(null);
  useEffect(() => {
    if (prevLanguageRef.current !== language && CODE_SNIPPETS[language]) {
      onChange(CODE_SNIPPETS[language]);
    }
    prevLanguageRef.current = language;
  }, [language, onChange]);

  const runCode = useCallback(async () => {
    if (!value.trim()) {
      setOutput("No code to run");
      return;
    }

    setIsRunning(true);
    setOutput("Running...");
    setExecStats(null);

    const code = value.trim();
    let lastError = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        setOutput(`Retrying... (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
        await new Promise((r) => setTimeout(r, delay));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT);

      try {
        const response = await axios.post(
          "/api/execute",
          {
            compiler: COMPILER_IDS[language],
            code,
            input: inputValue,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("jwtoken")}`,
              "Content-Type": "application/json",
            },
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);
        const data = response.data;

        setExecStats({
          time: data.time ? `${parseFloat(data.time).toFixed(3)}s` : null,
          memory: data.memory ? `${Math.round(parseInt(data.memory) / 1024)} MB` : null,
        });

        if (data.status === "success") {
          setOutput(data.output || "No output");
        } else {
          setOutput(`Error:\n${data.error || data.output || "Unknown error"}`);
        }
        setIsRunning(false);
        return;
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err;

        const status = err.response?.status;
        if (status === 401 || status === 403 || status === 429) {
          break;
        }
      }
    }

    const errorMsg =
      lastError?.response?.data?.error ||
      lastError?.response?.data?.message ||
      lastError?.name === "AbortError"
        ? "Request timed out (30s limit)"
        : lastError?.message ||
          "Code execution failed";
    setOutput(`Error: ${errorMsg}`);
    setIsRunning(false);
  }, [value, inputValue, language]);

  const handleSaveSnippet = useCallback(() => {
    if (!snippetName.trim()) {
      alert("Please enter a snippet name");
      return;
    }
    
    const newSnippet = {
      id: Date.now(),
      name: snippetName.trim(),
      code: value,
      language,
      input: inputValue,
      createdAt: new Date().toISOString(),
    };

    setSavedSnippets(prev => [...prev, newSnippet]);
    setSnippetName("");
    setShowSaveDialog(false);
  }, [snippetName, value, language, inputValue]);

  const loadSnippet = useCallback((snippet) => {
    onChange(snippet.code);
    onInputChange(snippet.input);
    setLanguage(snippet.language);
    setShowSnippets(false);
  }, [onChange, onInputChange, setLanguage]);

  const deleteSnippet = useCallback((id) => {
    if (window.confirm("Are you sure you want to delete this snippet?")) {
      setSavedSnippets(prev => prev.filter(snippet => snippet.id !== id));
    }
  }, []);

  const clearOutput = useCallback(() => {
    setOutput("");
    setExecStats(null);
  }, []);

  const handleEditorMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    
    editor.addAction({
      id: "run-code",
      label: "Run Code",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: runCode,
    });

    editor.onDidChangeCursorPosition((e) => {
      setCurrentLine(e.position.lineNumber);
      setCurrentColumn(e.position.column);
    });

    setTimeout(() => {
      editor.focus();
      editor.setPosition({ lineNumber: 1, column: 1 });
    }, 100);
  }, [runCode]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  }, []);

  const increaseFontSize = useCallback(() => {
    setFontSize(prev => Math.min(prev + 1, 24));
  }, []);

  const decreaseFontSize = useCallback(() => {
    setFontSize(prev => Math.max(prev - 1, 12));
  }, []);

  return (
    <div className={`editor-container ${theme}`}>
      <div className="editor-header">
        <div className="header-left">
          <div className="cursor-position">
            Line {currentLine}, Column {currentColumn}
          </div>
        </div>
        
        <div className="header-right">
          <div className="editor-settings">
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? "🌙" : "☀️"}
            </button>
            
            <div className="font-size-controls">
              <button
                onClick={decreaseFontSize}
                className="font-btn"
                title="Decrease font size"
              >
                A-
              </button>
              <span className="font-size">{fontSize}px</span>
              <button
                onClick={increaseFontSize}
                className="font-btn"
                title="Increase font size"
              >
                A+
              </button>
            </div>
          </div>

          <LanguageSelector language={language} setLanguage={setLanguage} />
          
          <div className="action-buttons">
            <button
              onClick={() => setShowSnippets(!showSnippets)}
              className="snippets-btn"
              title="View saved snippets"
            >
              📁 Snippets ({savedSnippets.length})
            </button>
            <button
              onClick={() => setShowSaveDialog(true)}
              className="save-btn"
              title="Save current code"
            >
              💾 Save
            </button>
            <button
              onClick={runCode}
              className={`run-btn ${isRunning ? "running" : ""}`}
              disabled={isRunning}
              title="Run code (Ctrl+Enter)"
            >
              {isRunning ? "⏳ Running..." : "▶️ Run"}
            </button>
          </div>
        </div>
      </div>

      {showSnippets && (
        <div className="snippets-panel">
          <div className="snippets-header">
            <h3>Saved Snippets</h3>
            <button
              onClick={() => setShowSnippets(false)}
              className="close-btn"
            >
              ✕
            </button>
          </div>
          
          {savedSnippets.length === 0 ? (
            <p className="no-snippets">No snippets saved yet</p>
          ) : (
            <div className="snippets-grid">
              {savedSnippets.map((snippet) => (
                <div key={snippet.id} className="snippet-card">
                  <div className="snippet-header">
                    <h4 className="snippet-title">{snippet.name}</h4>
                    <button
                      onClick={() => deleteSnippet(snippet.id)}
                      className="delete-snippet-btn"
                      title="Delete snippet"
                    >
                      🗑️
                    </button>
                  </div>
                  <div className="snippet-meta">
                    <span className="snippet-lang">{snippet.language}</span>
                    <span className="snippet-date">
                      {new Date(snippet.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="snippet-preview">
                    <code>{snippet.code.substring(0, 100)}...</code>
                  </div>
                  <button
                    onClick={() => loadSnippet(snippet)}
                    className="load-snippet-btn"
                  >
                    Load Snippet
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="editor-main">
        <Editor
          height="1000px"
          language={language}
          theme={theme === "dark" ? "vs-dark" : "vs"}
          value={value}
          onChange={onChange}
          onMount={handleEditorMount}
          loading={<div className="editor-loading">Loading editor...</div>}
          options={{
            fontSize,
            automaticLayout: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            renderWhitespace: "boundary",
            trimAutoWhitespace: true,
            bracketPairColorization: { enabled: true },
            cursorBlinking: "blink",
            cursorSmoothCaretAnimation: "off",
            cursorStyle: "line",
            cursorWidth: 2,
            hideCursorInOverviewRuler: false,
            smoothScrolling: false,
            lineNumbers: "on",
            glyphMargin: true,
            folding: true,
            wordWrap: "on",
            contextmenu: true,
            mouseWheelZoom: true,
            lineNumbersMinChars: 3,
            renderLineHighlight: "line",
            cursorSurroundingLines: 3,
            suggest: {
              preview: true,
              showIcons: true,
              fontSize: fontSize,
              maxVisibleSuggestions: 8,
              showInlineDetails: true,
              showStatusBar: false,
              filterGraceful: true,
              snippetsPreventQuickSuggestions: false,
            },
            quickSuggestions: {
              other: true,
              comments: false,
              strings: false
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: "on",
            acceptSuggestionOnCommitCharacter: true,
            selectionHighlight: true,
            occurrencesHighlight: true,
            overviewRulerLanes: 2,
            fixedOverflowWidgets: false,
            padding: { top: 10, bottom: 10 },
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoIndent: "full",
            formatOnType: true,
            formatOnPaste: true,
            disableLayerHinting: false,
            disableMonospaceOptimizations: false,
            renderControlCharacters: false,
            renderFinalNewline: "on",
            rulers: [],
            showFoldingControls: "mouseover",
            showUnused: true,
            hover: {
              enabled: true,
              delay: 300,
              sticky: true
            },
            parameterHints: {
              enabled: true,
              cycle: false
            }
          }}
        />
      </div>

      <div className="io-section">
        <div className="input-panel">
          <div className="panel-header">
            <h3>Input</h3>
            <button
              onClick={() => onInputChange("")}
              className="clear-btn"
              title="Clear input"
            >
              Clear
            </button>
          </div>
          <textarea
            className="input-textarea"
            rows="6"
            placeholder="Enter input for your program..."
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            style={{ fontSize: `${fontSize}px` }}
          />
        </div>

        <div className="output-panel">
          <div className="panel-header">
            <h3>Output</h3>
            <div className="output-header-right">
              {execStats && (
                <div className="exec-stats">
                  {execStats.time && <span className="stat">⏱ {execStats.time}</span>}
                  {execStats.memory && <span className="stat">💾 {execStats.memory}</span>}
                </div>
              )}
              <button
                onClick={clearOutput}
                className="clear-btn"
                title="Clear output"
              >
                Clear
              </button>
            </div>
          </div>
          <pre 
            className={`output-content ${isRunning ? "running" : ""}`}
            style={{ fontSize: `${fontSize}px` }}
          >
            {output || "Output will appear here..."}
          </pre>
        </div>
      </div>

      {showSaveDialog && (
        <div className="modal-overlay" onClick={() => setShowSaveDialog(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Save Code Snippet</h3>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="modal-close"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <input
                type="text"
                placeholder="Enter snippet name..."
                value={snippetName}
                onChange={(e) => setSnippetName(e.target.value)}
                className="snippet-name-input"
                autoFocus
                maxLength={50}
              />
            </div>
            <div className="modal-actions">
              <button 
                onClick={handleSaveSnippet} 
                className="confirm-btn"
                disabled={!snippetName.trim()}
              >
                Save Snippet
              </button>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
