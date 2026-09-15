"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import type { ChatResponse, Citation } from "@/types";

interface ChatTurn {
  question: string;
  answer: string;
  citations: Citation[];
  lowConfidence: boolean;
  createdAt: number;
}

export default function HeaderSearch() {
  const { language, t } = useLanguage();
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const trimmed = question.trim();
    if (!trimmed || isThinking) return;

    setIsThinking(true);
    setError("");
    setPopupOpen(true);
    try {
      const response = await api.post<ChatResponse>("/api/chat", {
        question: trimmed,
        history: history.map(({ question, answer }) => ({ question, answer })),
        language: language.code,
      });
      setHistory((prev) => [
        ...prev,
        {
          question: trimmed,
          answer: response.answer,
          citations: response.citations,
          lowConfidence: response.low_confidence,
          createdAt: Date.now(),
        },
      ]);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsThinking(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function autoGrow(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  // Session lives only in this component's state, so it's discarded the moment the popup closes.
  function closePopup() {
    setPopupOpen(false);
    setHistory([]);
    setError("");
    setQuestion("");
  }

  return (
    <div className="relative w-full">
      <div className={`cg-search-shell relative rounded-2xl bg-white dark:bg-gray-800 ${isThinking ? "cg-search-glow" : ""}`}>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={autoGrow}
          rows={1}
          placeholder={t("askAnything")}
          aria-label={t("askAnything")}
          className="relative z-[2] w-full resize-none overflow-hidden rounded-2xl bg-transparent px-4 py-2.5 text-sm text-gray-900 outline-none dark:text-gray-100"
        />
      </div>

      {popupOpen && (
        <div className="cg-custom-scrollbar absolute left-0 top-full z-30 mt-2 max-h-[60vh] w-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">{t("askChungaGava")}</h2>
            <button
              aria-label="Close"
              onClick={closePopup}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-xl leading-none text-gray-400 transition-colors hover:bg-black/10 hover:text-gray-700 dark:bg-white/10 dark:hover:bg-white/20 dark:hover:text-gray-200"
            >
              &times;
            </button>
          </div>

          {history.length === 0 && !isThinking && !error && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ask about Kenyan policy, law, or public documents.
            </p>
          )}

          <div className="space-y-4">
            {[...history]
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((turn) => (
                <div key={turn.createdAt} className="border-b border-gray-100 pb-3 last:border-0 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">You: {turn.question}</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-gray-800 dark:text-gray-200">{turn.answer}</p>
                  {turn.lowConfidence && (
                    <p className="mt-1 text-xs italic text-amber-600 dark:text-amber-400">
                      This may not fully answer your question — add more detail below to refine it.
                    </p>
                  )}
                  {turn.citations.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                      {turn.citations.map((c, i) => (
                        <li key={i}>
                          <span className="font-semibold">{c.document_title}</span> ({c.category})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
          </div>

          {isThinking && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t("thinking")}</p>}
          {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
