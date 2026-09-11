"use client";

import { useState } from "react";
import { LANGUAGES, useLanguage } from "@/lib/i18n";

/** Circular header widget selecting the site + AI-response language; dropdown styling
 * mirrors the referenced flag/name/code combobox design. */
export default function LanguageSelector() {
  const { language, setLanguageCode } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 150)}
        aria-label={`Language: ${language.name}`}
        title={language.name}
        className="cg-header-circle-btn border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
      >
        <span aria-hidden="true">{language.flag}</span>
      </button>

      {isOpen && (
        <ul className="absolute right-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-xl border border-gray-700 bg-[#12141a] py-1 text-sm shadow-xl">
          {LANGUAGES.map((lang) => (
            <li key={lang.code}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setLanguageCode(lang.code);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-gray-100 hover:bg-white/10 ${
                  lang.code === language.code ? "bg-white/5" : ""
                }`}
              >
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-base">
                  {lang.flag}
                </span>
                <span>
                  {lang.name} <span className="text-gray-400">({lang.code.toUpperCase()})</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
