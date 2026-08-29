import React from 'react';
import { COMPILER_IDS, LANGUAGE_DISPLAY_NAMES } from './constants';
import './LanguageSelector.css';

export default function LanguageSelector({ language, setLanguage }) {
  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value)}
      className="language-selector"
    >
      {Object.keys(COMPILER_IDS).map((lang) => (
       <option key={lang} value={lang}>
          {LANGUAGE_DISPLAY_NAMES[lang] || lang}
       </option>
      ))}
    </select>
  );
}
