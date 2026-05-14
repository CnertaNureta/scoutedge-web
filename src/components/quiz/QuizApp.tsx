"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CATEGORIES, getProgressiveQuestions, getMixedQuestions } from "@/data/quiz-questions";
import type { Category, Question } from "@/data/quiz-questions";
import { trackEvent } from "@/lib/analytics";

type GameMode = "casual" | "timed";
type Screen = "home" | "mode-select" | "quiz" | "results";

const TIMED_SECONDS = 20;

interface QuizState {
  category: Category | "mixed";
  mode: GameMode;
  questions: Question[];
  currentIndex: number;
  selected: number | null;
  answers: (number | null)[];
  timeLeft: number;
  timerActive: boolean;
}

function buildShareText(score: number, total: number, category: string): string {
  const pct = Math.round((score / total) * 100);
  const stars = pct >= 90 ? "🏆" : pct >= 70 ? "⚽" : pct >= 50 ? "🎯" : "📚";
  return `${stars} I scored ${score}/${total} (${pct}%) on the World Cup 2026 ${category} quiz!\nCan you beat me? 👇\nhttps://kickoracle.com/play/quiz`;
}

function shareOnTwitter(text: string) {
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank", "noopener");
}

function shareOnWhatsApp(text: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function HomeScreen({ onSelectCategory }: { onSelectCategory: (c: Category | "mixed") => void }) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="mb-3 text-4xl font-bold text-[#f1f5f9]">
          FIFA World Cup 2026 Quiz
        </h1>
        <p className="text-lg text-[#94a3b8]">
          Test your football knowledge across 4 categories
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.entries(CATEGORIES) as [Category, (typeof CATEGORIES)[Category]][]).map(([key, cat]) => (
          <button
            key={key}
            onClick={() => onSelectCategory(key)}
            className="group flex items-start gap-4 rounded-[0.75rem] border border-[#1e293b] bg-[#111827] p-5 text-left transition-all hover:border-[#e94560]"
          >
            <span className="text-3xl">{cat.emoji}</span>
            <div>
              <div className="font-semibold text-[#f1f5f9] group-hover:text-[#e94560]">
                {cat.label}
              </div>
              <div className="mt-0.5 text-sm text-[#64748b]">{cat.description}</div>
            </div>
          </button>
        ))}

        <button
          onClick={() => onSelectCategory("mixed")}
          className="group flex items-start gap-4 rounded-[0.75rem] border border-[#1e293b] bg-[#111827] p-5 text-left transition-all hover:border-[#e94560] sm:col-span-2"
        >
          <span className="text-3xl">🎲</span>
          <div>
            <div className="font-semibold text-[#f1f5f9] group-hover:text-[#e94560]">
              Mixed Bag
            </div>
            <div className="mt-0.5 text-sm text-[#64748b]">
              10 random questions from all categories — for the true expert
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

function ModeSelectScreen({
  category,
  onSelectMode,
  onBack,
}: {
  category: Category | "mixed";
  onSelectMode: (m: GameMode) => void;
  onBack: () => void;
}) {
  const label = category === "mixed" ? "Mixed Bag" : CATEGORIES[category].label;
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-[#64748b] hover:text-[#f1f5f9]">
        ← Back
      </button>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[#f1f5f9]">{label}</h2>
        <p className="mt-1 text-[#64748b]">Choose your mode</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => onSelectMode("casual")}
          className="rounded-[0.75rem] border border-[#1e293b] bg-[#111827] p-6 text-left transition-all hover:border-[#e94560]"
        >
          <div className="mb-2 text-2xl">😌</div>
          <div className="font-semibold text-[#f1f5f9]">Casual</div>
          <div className="mt-1 text-sm text-[#64748b]">
            No timer. Take your time and learn as you go.
          </div>
        </button>
        <button
          onClick={() => onSelectMode("timed")}
          className="rounded-[0.75rem] border border-[#1e293b] bg-[#111827] p-6 text-left transition-all hover:border-[#e94560]"
        >
          <div className="mb-2 text-2xl">⏱️</div>
          <div className="font-semibold text-[#f1f5f9]">Timed</div>
          <div className="mt-1 text-sm text-[#64748b]">
            {TIMED_SECONDS} seconds per question. Race the clock!
          </div>
        </button>
      </div>
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1e293b]">
      <div
        className="h-full rounded-full bg-[#e94560] transition-all duration-300"
        style={{ width: `${((current + 1) / total) * 100}%` }}
      />
    </div>
  );
}

function TimerRing({ timeLeft, total }: { timeLeft: number; total: number }) {
  const pct = timeLeft / total;
  const color = pct > 0.5 ? "#22c55e" : pct > 0.25 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
        <circle cx="18" cy="18" r="15" fill="none" stroke="#1e293b" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${2 * Math.PI * 15}`}
          strokeDashoffset={`${2 * Math.PI * 15 * (1 - pct)}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
        />
      </svg>
      <span className="w-5 text-center text-lg font-bold tabular-nums" style={{ color }}>
        {timeLeft}
      </span>
    </div>
  );
}

function QuizScreen({
  state,
  onAnswer,
  onNext,
}: {
  state: QuizState;
  onAnswer: (idx: number) => void;
  onNext: () => void;
}) {
  const { questions, currentIndex, selected, mode, timeLeft } = state;
  const q = questions[currentIndex];
  const isAnswered = selected !== null;
  const difficultyColors: Record<string, string> = {
    easy: "bg-green-900/30 text-green-400",
    medium: "bg-yellow-900/30 text-yellow-400",
    hard: "bg-red-900/30 text-red-400",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-[#64748b]">
          {currentIndex + 1} / {questions.length}
        </span>
        {mode === "timed" && <TimerRing timeLeft={timeLeft} total={TIMED_SECONDS} />}
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${difficultyColors[q.difficulty]}`}>
          {q.difficulty}
        </span>
      </div>

      <ProgressBar current={currentIndex} total={questions.length} />

      <div className="rounded-[0.75rem] border border-[#1e293b] bg-[#111827] p-6">
        <p className="text-lg font-semibold leading-snug text-[#f1f5f9]">
          {q.question}
        </p>
      </div>

      <div className="grid gap-3">
        {q.options.map((option, idx) => {
          let cls = "w-full rounded-[0.75rem] border p-4 text-left text-sm font-medium transition-all ";
          if (!isAnswered) {
            cls += "border-[#1e293b] bg-[#111827] text-[#f1f5f9] hover:border-[#e94560] hover:bg-[#e94560]/5 cursor-pointer";
          } else if (idx === q.correctIndex) {
            cls += "border-green-500 bg-green-900/20 text-green-300";
          } else if (idx === selected) {
            cls += "border-red-400 bg-red-900/20 text-red-300";
          } else {
            cls += "border-[#1e293b] bg-[#111827] text-[#94a3b8] opacity-50";
          }

          return (
            <button key={idx} className={cls} onClick={() => !isAnswered && onAnswer(idx)} disabled={isAnswered}>
              <span className="mr-2 font-semibold text-[#475569]">
                {String.fromCharCode(65 + idx)}.
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {isAnswered && (
        <div className="space-y-3">
          <div className="rounded-[0.75rem] border border-blue-800 bg-blue-900/20 p-4 text-sm text-blue-300">
            <strong>💡 </strong>{q.explanation}
          </div>
          <button
            onClick={onNext}
            className="w-full rounded-md bg-[#e94560] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#e94560]/90"
          >
            {currentIndex + 1 < questions.length ? "Next Question →" : "See Results →"}
          </button>
        </div>
      )}
    </div>
  );
}

function ResultsScreen({
  score,
  total,
  category,
  mode,
  answers,
  questions,
  onRestart,
  onHome,
}: {
  score: number;
  total: number;
  category: Category | "mixed";
  mode: GameMode;
  answers: (number | null)[];
  questions: Question[];
  onRestart: () => void;
  onHome: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const pct = Math.round((score / total) * 100);
  const label = category === "mixed" ? "Mixed Bag" : CATEGORIES[category].label;
  const shareText = buildShareText(score, total, label);

  const grade =
    pct >= 90 ? { emoji: "🏆", text: "World Cup Expert!", color: "text-yellow-400" }
    : pct >= 70 ? { emoji: "⚽", text: "Solid Knowledge!", color: "text-green-400" }
    : pct >= 50 ? { emoji: "🎯", text: "Getting There!", color: "text-blue-400" }
    : { emoji: "📚", text: "Keep Learning!", color: "text-[#64748b]" };

  async function handleCopy() {
    const ok = await copyToClipboard(shareText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="text-6xl">{grade.emoji}</div>
        <h2 className={`mt-2 text-2xl font-bold ${grade.color}`}>{grade.text}</h2>
        <p className="mt-1 text-5xl font-extrabold text-[#f1f5f9]">
          {score}<span className="text-2xl font-normal text-[#64748b]">/{total}</span>
        </p>
        <p className="text-[#64748b]">{pct}% correct · {label} · {mode === "timed" ? "Timed" : "Casual"}</p>
      </div>

      <div className="rounded-[0.75rem] border border-[#1e293b] bg-[#111827] p-5">
        <p className="mb-3 text-sm font-semibold text-[#cbd5e1]">Share your score</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => shareOnTwitter(shareText)}
            className="flex items-center gap-2 rounded-md bg-[#1DA1F2] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            𝕏 Twitter
          </button>
          <button
            onClick={() => shareOnWhatsApp(shareText)}
            className="flex items-center gap-2 rounded-md bg-[#25D366] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            💬 WhatsApp
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-md border border-[#334155] bg-[#1e293b] px-4 py-2 text-sm font-medium text-[#cbd5e1] transition-colors hover:bg-[#334155]"
          >
            {copied ? "✓ Copied!" : "📋 Copy"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-[#94a3b8]">Review your answers</h3>
        {questions.map((q, i) => {
          const ans = answers[i];
          const correct = ans === q.correctIndex;
          return (
            <div key={q.id} className={`rounded-[0.75rem] border p-3 text-sm ${correct ? "border-green-900 bg-green-900/10" : "border-red-900 bg-red-900/10"}`}>
              <p className={`font-medium ${correct ? "text-green-300" : "text-red-300"}`}>
                {correct ? "✓" : "✗"} {q.question}
              </p>
              {!correct && (
                <p className="mt-1 text-[#94a3b8]">
                  Correct: <strong>{q.options[q.correctIndex]}</strong>
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Link
        href="/teams"
        className="block rounded-[0.75rem] border border-[#0f3460]/40 bg-gradient-to-r from-[#1a1a2e] to-[#16213e] p-5 text-white"
      >
        <p className="font-semibold">Ready to go deeper?</p>
        <p className="mt-1 text-sm text-[#94a3b8]">
          Explore AI-powered analysis and predictions for all 48 teams →
        </p>
      </Link>

      <div className="flex gap-3">
        <button
          onClick={onRestart}
          className="flex-1 rounded-md border border-[#334155] bg-[#1e293b] py-2.5 text-sm font-medium text-[#cbd5e1] transition-colors hover:bg-[#334155]"
        >
          Try Again
        </button>
        <button
          onClick={onHome}
          className="flex-1 rounded-md bg-[#1a1a2e] py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          New Category
        </button>
      </div>
    </div>
  );
}

interface QuizAppProps {
  onQuestionAnswered?: () => void
}

export default function QuizApp({ onQuestionAnswered }: QuizAppProps = {}) {
  const [screen, setScreen] = useState<Screen>("home");
  const [category, setCategory] = useState<Category | "mixed">("history");
  const [quizState, setQuizState] = useState<QuizState | null>(null);

  const startQuiz = useCallback((cat: Category | "mixed", mode: GameMode) => {
    const questions =
      cat === "mixed"
        ? getMixedQuestions(10)
        : getProgressiveQuestions(cat);

    setQuizState({
      category: cat,
      mode,
      questions,
      currentIndex: 0,
      selected: null,
      answers: new Array(questions.length).fill(null),
      timeLeft: TIMED_SECONDS,
      timerActive: mode === "timed",
    });
    setScreen("quiz");
  }, []);

  useEffect(() => {
    if (!quizState?.timerActive || quizState.selected !== null) return;
    if (quizState.timeLeft <= 0) {
      setQuizState((s) => {
        if (!s) return s;
        const newAnswers = [...s.answers];
        newAnswers[s.currentIndex] = -1;
        return { ...s, selected: -1, answers: newAnswers, timerActive: false };
      });
      return;
    }
    const t = setTimeout(() => {
      setQuizState((s) => s && { ...s, timeLeft: s.timeLeft - 1 });
    }, 1000);
    return () => clearTimeout(t);
  }, [quizState?.timerActive, quizState?.timeLeft, quizState?.selected]);

  function handleAnswer(idx: number) {
    if (!quizState) return;
    const newAnswers = [...quizState.answers];
    newAnswers[quizState.currentIndex] = idx;
    setQuizState({ ...quizState, selected: idx, answers: newAnswers, timerActive: false });
    onQuestionAnswered?.();
  }

  function handleNext() {
    if (!quizState) return;
    const nextIndex = quizState.currentIndex + 1;
    if (nextIndex >= quizState.questions.length) {
      trackEvent({ event: 'tool_engaged', tool_name: 'quiz', tool_context: quizState.category });
      setScreen("results");
    } else {
      setQuizState({
        ...quizState,
        currentIndex: nextIndex,
        selected: null,
        timeLeft: TIMED_SECONDS,
        timerActive: quizState.mode === "timed",
      });
    }
  }

  const score = quizState
    ? quizState.answers.filter((a, i) => a === quizState.questions[i].correctIndex).length
    : 0;

  return (
    <div data-testid="quiz-widget" className="mx-auto max-w-2xl px-4 py-10">
      {screen === "home" && (
        <HomeScreen
          onSelectCategory={(c) => {
            setCategory(c);
            setScreen("mode-select");
          }}
        />
      )}

      {screen === "mode-select" && (
        <ModeSelectScreen
          category={category}
          onSelectMode={(m) => startQuiz(category, m)}
          onBack={() => setScreen("home")}
        />
      )}

      {screen === "quiz" && quizState && (
        <QuizScreen state={quizState} onAnswer={handleAnswer} onNext={handleNext} />
      )}

      {screen === "results" && quizState && (
        <ResultsScreen
          score={score}
          total={quizState.questions.length}
          category={quizState.category}
          mode={quizState.mode}
          answers={quizState.answers}
          questions={quizState.questions}
          onRestart={() => startQuiz(quizState.category, quizState.mode)}
          onHome={() => setScreen("home")}
        />
      )}
    </div>
  );
}
