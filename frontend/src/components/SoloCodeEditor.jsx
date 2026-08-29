import { useState } from "react";
import ProbCodeEditor from "./ProbCodeEditor";

const noop = () => {};

export default function SoloCodeEditor({ value, onChange = noop, inputValue, onInputChange = noop }) {
  const [localCode, setLocalCode] = useState("");
  const [localInput, setLocalInput] = useState("");
  const [language, setLanguage] = useState("cpp");
  const code = typeof value === "string" ? value : localCode;
  const input = typeof inputValue === "string" ? inputValue : localInput;

  const updateCode = (nextCode) => {
    if (typeof value !== "string") setLocalCode(nextCode);
    onChange(nextCode);
  };
  const updateInput = (nextInput) => {
    if (typeof inputValue !== "string") setLocalInput(nextInput);
    onInputChange(nextInput);
  };

  return <ProbCodeEditor value={code} onChange={updateCode} inputValue={input}
    onInputChange={updateInput} language={language} onLanguageChange={setLanguage} />;
}
