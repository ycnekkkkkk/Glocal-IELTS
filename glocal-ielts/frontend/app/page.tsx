"use client";

import { useState, useRef, useEffect } from "react";
import { generateTest, scoreTest, Level, Skill } from "../lib/api";
import { saveTest, getSavedTests, getTestById, deleteTest, formatTestDate, type SavedTest } from "../lib/testStorage";
// import { section } from "framer-motion/client";

type Step = "level" | "skill" | "test" | "result" | "overall" | "history";


const levels: { id: Level; label: string; range: string }[] = [
  { id: "beginner", label: "Beginner", range: "≈ IELTS 3.0–4.0" },
  { id: "elementary", label: "Elementary", range: "≈ IELTS 4.0–4.5" },
  { id: "intermediate", label: "Intermediate", range: "≈ IELTS 5.0–5.5" },
  {
    id: "upper_intermediate",
    label: "Upper-Intermediate",
    range: "≈ IELTS 6.0–6.5",
  },
  { id: "advanced", label: "Advanced", range: "≈ IELTS 7.0+" },
];

const skills: { id: Skill; label: string }[] = [
  { id: "listening", label: "Listening" },
  { id: "speaking", label: "Speaking" },
  { id: "reading", label: "Reading" },
  { id: "writing", label: "Writing" },
];

export default function HomePage() {
  const [step, setStep] = useState<Step>("level");
  const [level, setLevel] = useState<Level | null>(null);
  const [skill, setSkill] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [content, setContent] = useState<any | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [result, setResult] = useState<any | null>(null);
  const [testId, setTestId] = useState<string | null>(null);
  const [skillResults, setSkillResults] = useState<Record<string, any>>({});
  const [finalResult, setFinalResult] = useState<any | null>(null);
  const [finalLoading, setFinalLoading] = useState(false);
  const [savedTests, setSavedTests] = useState<SavedTest[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load saved tests on mount
  useEffect(() => {
    setSavedTests(getSavedTests());
  }, []);

  // Save current test
  function handleSaveTest() {
    if (!testId || !level) return;

    const completedSkills = Object.keys(skillResults);
    const overallBand = finalResult?.overall_band ||
      (completedSkills.length === 4
        ? (skillResults.listening?.band + skillResults.reading?.band +
          skillResults.speaking?.band + skillResults.writing?.band) / 4
        : 0);

    const success = saveTest({
      testId,
      level,
      skillResults,
      finalResult,
      overallBand,
      completedSkills,
    });

    if (success) {
      setSaveSuccess(true);
      setSavedTests(getSavedTests());
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  }

  // Load test from history
  function handleLoadTest(savedTest: SavedTest) {
    setTestId(savedTest.testId);
    setLevel(savedTest.level as Level);
    setSkillResults(savedTest.skillResults);
    setFinalResult(savedTest.finalResult);

    if (savedTest.finalResult) {
      setStep("overall");
    } else {
      setStep("skill");
    }
  }

  // Delete test from history
  function handleDeleteTest(testId: string) {
    if (confirm("Are you sure you want to delete this test?")) {
      deleteTest(testId);
      setSavedTests(getSavedTests());
    }
  }

  async function handleGenerate(selectedSkill: Skill) {
    if (!level) return;
    try {
      setError(null);
      setLoading(true);
      const data = await generateTest(level, selectedSkill);
      if (!testId) {
        const newId = `TEST-${Date.now()}`;
        setTestId(newId);
      }
      setContent(data.content);
      setAnswers({});
      setResult(null);
      setSkill(selectedSkill);
      setStep("test");
    } catch {
      setError("Cannot connect to backend. Please ensure FastAPI server is running.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!level || !skill || !content) return;
    try {
      setLoading(true);
      setError(null);
      const data = await scoreTest(level, skill, content, answers);
      setResult(data);

      setSkillResults(prev => ({
        ...prev,
        [skill!]: data
      }));

      setStep("result");
    } catch {
      setError("Scoring failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateFinal() {
    if (!skillResults.listening ||
      !skillResults.reading ||
      !skillResults.speaking ||
      !skillResults.writing) {
      return;
    }

    try {
      setFinalLoading(true);
      setError(null);

      const backendBaseURL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8001";
      const response = await fetch(`${backendBaseURL}/api/tests/overall-diagnosis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test_id: testId,
          level,
          skill_results: skillResults,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate overall diagnosis: ${response.statusText}`);
      }

      const data = await response.json();
      setFinalResult(data);
      setStep("overall");

      // Auto-save test when overall diagnosis is complete
      setTimeout(() => {
        handleSaveTest();
      }, 500);

    } catch (err) {
      console.error("Error generating overall diagnosis:", err);
      setError("Failed to generate overall diagnosis. Please try again.");
    } finally {
      setFinalLoading(false);
    }
  }

  function resetFlow() {
    setStep("level");
    setLevel(null);
    setSkill(null);
    setContent(null);
    setAnswers({});
    setResult(null);
    setError(null);
  }

  const allSkillsCompleted =
    skillResults.listening &&
    skillResults.reading &&
    skillResults.speaking &&
    skillResults.writing;

  return (
    <div className="space-y-6">
      {/* Premium Header - Mobile Optimized */}
      <div className="relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-br from-primary-600/20 via-primary-500/10 to-slate-900 border border-primary-500/30 shadow-2xl p-4 md:p-8">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 md:gap-4">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg md:rounded-xl blur-lg md:blur-xl opacity-50"></div>
              <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-lg md:rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-xl border border-primary-400/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-9 md:w-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-[10px] md:text-xs uppercase tracking-wider md:tracking-[0.25em] text-primary-300/70 font-semibold mb-0.5 md:mb-1">
                Diagnostic Flow
              </p>
              <h1 className="text-xl md:text-3xl font-black bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent leading-tight">
                Glocal IELTS System
              </h1>
              <p className="text-xs md:text-sm text-slate-300 mt-0.5 md:mt-1">AI-Powered Skill Diagnosis</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* History Button */}
            <button
              className="group relative px-3 py-2 md:px-4 md:py-2.5 bg-slate-800/60 hover:bg-slate-800 backdrop-blur-sm border border-slate-700/50 hover:border-primary-600 rounded-lg md:rounded-xl transition-all duration-300 shadow-lg overflow-hidden"
              onClick={() => setStep("history")}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 to-primary-500/0 group-hover:from-primary-500/10 group-hover:to-primary-600/10 transition-all duration-300"></div>
              <div className="relative flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 group-hover:text-primary-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden sm:inline text-xs md:text-sm font-semibold text-slate-300 group-hover:text-slate-100 transition-colors">History</span>
              </div>
            </button>

            {/* Reset Button */}
            <button
              className="group relative px-3 py-2 md:px-5 md:py-2.5 bg-slate-800/60 hover:bg-slate-800 backdrop-blur-sm border border-slate-700/50 hover:border-slate-600 rounded-lg md:rounded-xl transition-all duration-300 shadow-lg overflow-hidden"
              onClick={resetFlow}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 to-primary-500/0 group-hover:from-primary-500/10 group-hover:to-primary-600/10 transition-all duration-300"></div>
              <div className="relative flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 group-hover:text-primary-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-xs md:text-sm font-semibold text-slate-300 group-hover:text-slate-100 transition-colors">Reset</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="relative overflow-hidden rounded-lg md:rounded-xl border border-red-500/50 bg-gradient-to-r from-red-950/60 to-red-900/40 p-4 md:p-5 shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-red-500/10 rounded-full blur-3xl"></div>
          <div className="relative flex items-start gap-2 md:gap-3">
            <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-lg bg-red-500/20 flex items-center justify-center border border-red-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm font-semibold text-red-300 mb-1">Error</p>
              <p className="text-xs md:text-sm text-red-100 leading-relaxed">{error}</p>
            </div>
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="relative overflow-hidden rounded-lg md:rounded-xl border border-emerald-500/50 bg-gradient-to-r from-emerald-950/60 to-emerald-900/40 p-4 md:p-5 shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <div className="relative flex items-start gap-2 md:gap-3">
            <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm font-semibold text-emerald-300 mb-1">Saved Successfully!</p>
              <p className="text-xs md:text-sm text-emerald-100 leading-relaxed">Your test has been saved. View it anytime in History.</p>
            </div>
          </div>
        </div>
      )}

      {step === "history" && (
        <div className="card p-4 md:p-8 space-y-4 md:space-y-6 shadow-2xl border-slate-700/50">
          {/* Section Header */}
          <div className="space-y-2 md:space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center border border-primary-500/30">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-100">Test History</h2>
              </div>
              <button
                className="px-3 py-2 md:px-4 md:py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-lg md:rounded-xl transition-all duration-300 text-xs md:text-sm font-semibold text-slate-300 hover:text-slate-100"
                onClick={() => setStep("level")}
              >
                ← Back
              </button>
            </div>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed pl-10 md:pl-13">
              View and reload your previous test results ({savedTests.length} test{savedTests.length !== 1 ? 's' : ''} saved)
            </p>
          </div>

          {/* Test History List */}
          {savedTests.length === 0 ? (
            <div className="text-center py-12 md:py-16">
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-10 md:w-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-slate-300 mb-2">No saved tests yet</h3>
              <p className="text-xs md:text-sm text-slate-400 max-w-md mx-auto">
                Complete a diagnostic test and it will be automatically saved here for future reference.
              </p>
              <button
                className="mt-6 px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-lg md:rounded-xl font-semibold text-sm md:text-base shadow-lg shadow-primary-500/30 transition-all duration-300"
                onClick={() => setStep("level")}
              >
                Start New Test
              </button>
            </div>
          ) : (
            <div className="grid gap-3 md:gap-4">
              {savedTests.map((test) => (
                <div
                  key={test.testId}
                  className="group relative overflow-hidden border border-slate-700/50 bg-slate-800/30 hover:border-primary-500/50 rounded-lg md:rounded-xl p-4 md:p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/10"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-500/0 to-primary-600/0 group-hover:from-primary-500/5 group-hover:to-primary-600/10 transition-all duration-300"></div>

                  <div className="relative">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 md:gap-4 mb-3 md:mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-base md:text-lg font-bold text-slate-200 truncate">{test.testId}</h3>
                          {test.overallBand > 0 && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${test.overallBand >= 7.5 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                              test.overallBand >= 6.5 ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                                test.overallBand >= 5.5 ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                                  "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                              }`}>
                              Band {test.overallBand.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatTestDate(test.timestamp)}
                          </span>
                          <span>•</span>
                          <span className="capitalize">{test.level.replace(/_/g, ' ')}</span>
                          <span>•</span>
                          <span>{test.completedSkills.length}/4 skills</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start">
                        <button
                          className="px-3 py-1.5 md:px-4 md:py-2 bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/30 hover:border-primary-500/50 rounded-lg text-xs md:text-sm font-semibold text-primary-300 transition-all duration-300"
                          onClick={() => handleLoadTest(test)}
                        >
                          View
                        </button>
                        <button
                          className="px-2 py-1.5 md:px-3 md:py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 rounded-lg text-xs md:text-sm font-semibold text-red-300 transition-all duration-300"
                          onClick={() => handleDeleteTest(test.testId)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Skills Overview */}
                    <div className="grid grid-cols-4 gap-2 md:gap-3">
                      {['listening', 'reading', 'speaking', 'writing'].map((skillName) => {
                        const skillData = test.skillResults[skillName];
                        const completed = !!skillData;
                        const band = skillData?.band || 0;

                        return (
                          <div
                            key={skillName}
                            className={`flex flex-col items-center gap-1 p-2 md:p-3 rounded-lg border transition-all ${completed
                              ? "border-emerald-500/30 bg-emerald-500/10"
                              : "border-slate-700/50 bg-slate-800/50"
                              }`}
                          >
                            <span className="text-lg md:text-xl">
                              {skillName === 'listening' ? '🎧' :
                                skillName === 'reading' ? '📖' :
                                  skillName === 'speaking' ? '🗣️' : '✍️'}
                            </span>
                            <span className="text-[10px] md:text-xs text-slate-400 capitalize">{skillName}</span>
                            {completed ? (
                              <span className="text-xs md:text-sm font-bold text-emerald-400">{band.toFixed(1)}</span>
                            ) : (
                              <span className="text-xs text-slate-600">-</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === "level" && (
        <div className="card p-4 md:p-8 space-y-4 md:space-y-6 shadow-2xl border-slate-700/50">
          {/* Section Header */}
          <div className="space-y-2 md:space-y-3">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center border border-primary-500/30">
                <span className="text-lg md:text-xl font-bold text-primary-400">1</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-100">Select Your Current Level</h2>
            </div>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed pl-10 md:pl-13">
              This controls topic complexity, vocabulary range and target band. It is{" "}
              <span className="font-semibold text-slate-300">not</span> an official IELTS score.
            </p>
          </div>

          {/* Warning if user has progress */}
          {Object.keys(skillResults).length > 0 && (
            <div className="flex items-start gap-2 md:gap-3 p-3 md:p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg md:rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-semibold text-yellow-300 mb-0.5 md:mb-1">⚠️ Warning</p>
                <p className="text-xs md:text-sm text-yellow-200/90 leading-relaxed">
                  Selecting a different level will clear all your current test progress ({Object.keys(skillResults).length} skill{Object.keys(skillResults).length > 1 ? 's' : ''} completed).
                </p>
              </div>
            </div>
          )}

          {/* Level Cards */}
          <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
            {levels.map((lv, idx) => {
              const isSelected = level === lv.id;
              const icons = ['🌱', '📚', '🎯', '🚀', '⭐'];

              return (
                <button
                  key={lv.id}
                  className={`group relative overflow-hidden text-left p-4 md:p-6 rounded-lg md:rounded-xl border transition-all duration-300 ${isSelected
                    ? "border-primary-500 bg-gradient-to-br from-primary-500/20 to-primary-600/10 shadow-lg shadow-primary-500/20"
                    : "border-slate-700/50 bg-slate-800/30 hover:border-primary-500/50 hover:bg-slate-800/60 hover:shadow-lg"
                    }`}
                  onClick={() => {
                    // If selecting a different level, clear all test data
                    if (level !== lv.id) {
                      setTestId(null);
                      setSkillResults({});
                      setAnswers({});
                      setContent(null);
                      setResult(null);
                      setFinalResult(null);
                    }
                    setLevel(lv.id);
                  }}
                >
                  {/* Hover glow effect */}
                  {!isSelected && (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-500/0 to-primary-600/0 group-hover:from-primary-500/5 group-hover:to-primary-600/10 transition-all duration-300"></div>
                  )}

                  <div className="relative flex items-start gap-3 md:gap-4">
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center text-xl md:text-2xl transition-all duration-300 ${isSelected
                      ? "bg-primary-500/30 border-2 border-primary-500/50"
                      : "bg-slate-700/30 border border-slate-600/30 group-hover:bg-slate-700/50"
                      }`}>
                      {icons[idx]}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 md:mb-2">
                        <p className={`text-base md:text-lg font-bold transition-colors ${isSelected ? "text-primary-300" : "text-slate-200 group-hover:text-slate-100"
                          }`}>
                          {lv.label}
                        </p>
                        {isSelected && (
                          <div className="flex-shrink-0 w-4 h-4 md:w-5 md:h-5 rounded-full bg-primary-500 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 md:h-3 md:w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className={`text-xs md:text-sm transition-colors ${isSelected ? "text-primary-300/80" : "text-slate-400 group-hover:text-slate-300"
                        }`}>
                        {lv.range}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Continue Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-4 border-t border-slate-800 gap-3">
            <div className="flex items-center gap-2 text-xs md:text-sm text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="leading-tight">
                {Object.keys(skillResults).length > 0
                  ? "Changing level will reset your progress"
                  : "Select a level to continue"}
              </span>
            </div>
            <button
              className={`px-4 md:px-6 py-2.5 md:py-3 rounded-lg md:rounded-xl font-semibold text-sm md:text-base transition-all duration-300 flex items-center justify-center gap-2 ${level
                ? "bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              disabled={!level}
              onClick={() => setStep("skill")}
            >
              <span>Continue to Skills</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {step === "skill" && (
        <div className="card p-4 md:p-8 space-y-4 md:space-y-6 shadow-2xl border-slate-700/50">
          {/* Section Header */}
          <div className="space-y-2 md:space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center border border-primary-500/30">
                  <span className="text-lg md:text-xl font-bold text-primary-400">2</span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-100">Choose Skill to Test</h2>
              </div>

              {testId && (
                <div className="px-3 py-1.5 md:px-4 md:py-2 bg-slate-800/60 backdrop-blur-sm border border-primary-500/40 rounded-lg md:rounded-xl shadow-lg self-start sm:self-auto">
                  <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-primary-300/70 mb-0.5">Test ID</p>
                  <p className="text-xs md:text-sm text-primary-300 font-mono font-semibold">{testId}</p>
                </div>
              )}
            </div>

            <p className="text-xs md:text-sm text-slate-400 leading-relaxed pl-10 md:pl-13">
              Complete all 4 skills to get your comprehensive IELTS diagnosis report.
            </p>
          </div>

          {/* Skill Cards Grid */}
          <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
            {skills.map((sk) => {
              const completed = skillResults[sk.id];
              const band = completed?.band || 0;

              const skillIcons = {
                listening: "🎧",
                reading: "📖",
                speaking: "🗣️",
                writing: "✍️"
              };

              return (
                <button
                  key={sk.id}
                  className={`group relative overflow-hidden p-4 md:p-6 rounded-lg md:rounded-xl border transition-all duration-300 ${completed
                    ? "border-emerald-500/50 bg-gradient-to-br from-emerald-500/20 to-green-500/10 shadow-lg shadow-emerald-500/20"
                    : "border-slate-700/50 bg-slate-800/30 hover:border-primary-500/50 hover:bg-slate-800/60 hover:shadow-lg hover:shadow-primary-500/10"
                    }`}
                  onClick={() => handleGenerate(sk.id)}
                  disabled={loading}
                >
                  {/* Background Effect */}
                  <div className={`absolute inset-0 transition-opacity duration-300 ${completed
                    ? "bg-gradient-to-br from-emerald-500/10 to-green-500/5"
                    : "bg-gradient-to-br from-primary-500/0 to-primary-600/0 group-hover:from-primary-500/5 group-hover:to-primary-600/10"
                    }`}></div>

                  {/* Completed Badge */}
                  {completed && (
                    <div className="absolute top-2 right-2 md:top-3 md:right-3 w-5 h-5 md:w-6 md:h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 md:h-4 md:w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  <div className="relative space-y-3 md:space-y-4">
                    {/* Icon */}
                    <div className={`w-10 h-10 md:w-14 md:h-14 mx-auto rounded-lg md:rounded-xl flex items-center justify-center text-2xl md:text-3xl transition-all duration-300 ${completed
                      ? "bg-emerald-500/20 border border-emerald-500/30"
                      : "bg-slate-700/30 border border-slate-600/30 group-hover:bg-slate-700/50"
                      }`}>
                      {skillIcons[sk.id]}
                    </div>

                    {/* Skill Name */}
                    <div>
                      <p className={`font-bold text-center text-sm md:text-lg transition-colors ${completed ? "text-emerald-300" : "text-slate-200 group-hover:text-slate-100"
                        }`}>
                        {sk.label}
                      </p>

                      {/* Status */}
                      {completed ? (
                        <div className="mt-1.5 md:mt-2 flex flex-col items-center gap-0.5 md:gap-1">
                          <p className="text-[10px] md:text-xs text-emerald-400 font-semibold">Completed</p>
                          <div className="px-2 py-0.5 md:px-3 md:py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
                            <p className="text-xs md:text-sm font-bold text-emerald-300">
                              Band {band.toFixed(1)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] md:text-xs text-slate-500 mt-1.5 md:mt-2 text-center group-hover:text-slate-400 transition-colors">
                          Not tested yet
                        </p>
                      )}
                    </div>

                    {/* Progress Indicator */}
                    {completed && (
                      <div className="w-full h-0.5 md:h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-1000"
                          style={{ width: `${(band / 9) * 100}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Overall Report Banner */}
          {allSkillsCompleted && (
            <div className="relative overflow-hidden rounded-lg md:rounded-xl bg-gradient-to-r from-emerald-500/20 via-primary-500/20 to-blue-500/20 border border-primary-500/30 p-4 md:p-6">
              <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
              <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-xl flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-7 md:w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base md:text-lg font-bold text-emerald-300">All 4 Skills Completed! 🎉</p>
                    <p className="text-xs md:text-sm text-slate-300">Ready to view your comprehensive diagnostic report</p>
                  </div>
                </div>
                <button
                  className="w-full md:w-auto px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-lg md:rounded-xl font-semibold text-sm md:text-base shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-300 flex items-center justify-center gap-2"
                  onClick={handleGenerateFinal}
                  disabled={finalLoading}
                >
                  {finalLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span>View Overall Report</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-4 border-t border-slate-800 gap-3">
            <button
              className="group px-3 md:px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-lg md:rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
              onClick={() => setStep("level")}
              disabled={loading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 md:h-4 md:w-4 text-slate-400 group-hover:text-slate-200 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-xs md:text-sm font-semibold text-slate-300 group-hover:text-slate-100 transition-colors">Back to Level</span>
            </button>

            {loading && (
              <div className="flex items-center justify-center gap-2 text-xs md:text-sm text-slate-400">
                <svg className="animate-spin h-3.5 w-3.5 md:h-4 md:w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Generating test with AI...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {step === "test" && skill && content && (
        <div className="space-y-4">
          <TestRenderer
            skill={skill}
            content={content}
            answers={answers}
            setAnswers={setAnswers}
            showTranscript={false}
          />
          <div className="flex justify-between items-center">
            <button
              className="btn-outline text-xs"
              disabled={loading}
              onClick={() => {
                setResult(null);
                setStep("skill");
              }}
            >
              Back to skills
            </button>
            <button className="btn" disabled={loading} onClick={handleSubmit}>
              {loading ? "Scoring…" : "Submit and see analysis"}
            </button>
          </div>
        </div>
      )}

      {step === "result" && result && skill && content && (
        <ResultView
          skill={skill}
          result={result}
          content={content}
          answers={answers}
          skillResults={skillResults}
          finalLoading={finalLoading}
          onRetake={() => {
            setResult(null);
            setStep("skill");
          }}
          onViewOverall={handleGenerateFinal}
        />
      )}

      {step === "overall" && (
        <OverallResultView
          skillResults={skillResults}
          testId={testId}
          finalResult={finalResult}
          onSaveTest={handleSaveTest}
          saveSuccess={saveSuccess}
        />
      )}

    </div>
  );
}

type TestRendererProps = {
  skill: Skill;
  content: any;
  answers: Record<string, any>;
  setAnswers: (a: Record<string, any>) => void;
};

function TestRenderer({ skill, content, answers, setAnswers, showTranscript }: TestRendererProps & { showTranscript: boolean }) {
  if (skill === "listening") {
    return (
      <ListeningView
        content={content.listening}
        answers={answers}
        setAnswers={setAnswers}
        showTranscript={showTranscript}
      />
    );
  }
  if (skill === "reading") {
    return (
      <ReadingView
        content={content.reading}
        answers={answers}
        setAnswers={setAnswers}
      />
    );
  }
  if (skill === "speaking") {
    return (
      <SpeakingView
        content={content.speaking}
        answers={answers}
        setAnswers={setAnswers}
      />
    );
  }
  if (skill === "writing") {
    return (
      <WritingView
        content={content.writing}
        answers={answers}
        setAnswers={setAnswers}
      />
    );
  }
  return null;
}

function ListeningView({
  content,
  answers,
  setAnswers,
  showTranscript
}: {
  content: any;
  answers: Record<string, any>;
  setAnswers: (a: Record<string, any>) => void;
  showTranscript: boolean;
}) {
  // const [isPlaying, setIsPlaying] = useState(false);
  // const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [playingSection, setPlayingSection] = useState<number | null>(null);
  const maleVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const femaleVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const voicesReadyRef = useRef(false);

  useEffect(() => {
    function loadVoices() {
      const voices = speechSynthesis.getVoices();

      if (!voices || voices.length === 0) return;

      const englishVoices = voices.filter(v =>
        v.lang.toLowerCase().includes("en")
      );

      if (englishVoices.length === 0) return;

      if (englishVoices.length === 1) {
        maleVoiceRef.current = englishVoices[0];
        femaleVoiceRef.current = englishVoices[0];
      } else {
        maleVoiceRef.current = englishVoices[0];
        femaleVoiceRef.current = englishVoices[1];
      }

      voicesReadyRef.current = true;

      console.log("Voices loaded:", {
        male: maleVoiceRef.current?.name,
        female: femaleVoiceRef.current?.name
      });
    }

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.cancel();
      speechSynthesis.onvoiceschanged = null;
    };
  }, []);




  function toggleSpeak(sectionId: number, transcript: any[]) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    // Nếu đang phát section này → STOP
    if (playingSection === sectionId) {
      speechSynthesis.cancel();
      setPlayingSection(null);
      return;
    }

    speechSynthesis.cancel();

    if (!Array.isArray(transcript) || transcript.length === 0) {
      console.warn("Invalid transcript");
      return;
    }

    if (!voicesReadyRef.current) {
      console.warn("Voices not ready yet");
      return;
    }

    setPlayingSection(sectionId);

    let lineIndex = 0;

    const speakNext = () => {
      if (lineIndex >= transcript.length) {
        setPlayingSection(null);
        return;
      }

      const line = transcript[lineIndex];

      if (!line?.text) {
        lineIndex++;
        speakNext();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(line.text);

      utterance.lang = "en-GB";
      utterance.rate = 0.95;

      const speaker = (line.speaker || "").toLowerCase();

      if (speaker === "female") {
        utterance.voice =
          femaleVoiceRef.current || maleVoiceRef.current || null;
        utterance.pitch = 1.15;
      } else {
        utterance.voice =
          maleVoiceRef.current || femaleVoiceRef.current || null;
        utterance.pitch = 0.9;
      }

      utterance.onend = () => {
        lineIndex++;          // 🔥 QUAN TRỌNG
        speakNext();
      };

      utterance.onerror = (e) => {
        console.error("Speech error:", e);
        setPlayingSection(null);
      };

      speechSynthesis.speak(utterance);
    };

    speakNext();
  }




  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6 shadow-2xl border-slate-700/50">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center border border-blue-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 012.828 2.828m-2.828 9.9a9 9 0 01-2.828-2.828" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-100">Listening Test</h2>
            <p className="text-sm text-slate-400 mt-1">4 sections • 20 questions • ~30 minutes</p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-slate-300 leading-relaxed">
            Click <span className="font-semibold text-blue-400">🔊 Play Audio</span> to listen to each section.
            Answer the questions while or after listening.
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {content.sections.map((section: any, sectionIdx: number) => (
          <div key={section.id} className="card p-6 space-y-5 shadow-xl border-slate-700/50">
            {/* Section Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                    <span className="text-sm font-bold text-blue-400">{section.id}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">
                    Section {section.id}: {section.title}
                  </h3>
                </div>
                <p className="text-sm text-slate-400 pl-11">
                  {section.instructions}
                </p>
              </div>

              {!showTranscript && (
                <button
                  type="button"
                  onClick={() => toggleSpeak(section.id, section.audio_transcript)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 shadow-lg ${playingSection === section.id
                    ? "bg-red-500/20 border border-red-500/50 text-red-300 hover:bg-red-500/30"
                    : "bg-blue-500/20 border border-blue-500/50 text-blue-300 hover:bg-blue-500/30 hover:shadow-xl"
                    }`}
                >
                  {playingSection === section.id ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 012.828 2.828m-2.828 9.9a9 9 0 01-2.828-2.828" />
                      </svg>
                      <span>Play Audio</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Transcript */}
            {showTranscript && (
              <details className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-200 flex items-center gap-2 hover:text-slate-100 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>View Transcript</span>
                </summary>
                <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-2">
                  {section.audio_transcript.map((line: any, idx: number) => (
                    <div key={idx} className="flex gap-2 text-sm">
                      <span className="font-bold text-blue-400 min-w-[80px]">{line.speaker}:</span>
                      <span className="text-slate-300">{line.text}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Questions */}
            <div className="space-y-4 pt-2">
              {section.questions.map((q: any) => {
                const baseKey = `listening_s${section.id}_q${q.id}`;
                // Normalize options: convert objects to array if needed
                let normalizedOptions = q.options;
                if (q.options && !Array.isArray(q.options)) {
                  if (typeof q.options === "object") {
                    normalizedOptions = Object.values(q.options);
                  } else {
                    normalizedOptions = [];
                  }
                }

                // Matching type: can be multi-item (with items array) or single (just options)
                const isMatchingType =
                  normalizedOptions &&
                  Array.isArray(normalizedOptions) &&
                  normalizedOptions.length > 0 &&
                  ["matching_headings", "matching_information", "classification"].includes(q.type);
                const isMultiItemMatching = isMatchingType && q.items && q.items.length > 0;

                // Debug: log if matching type but no options (only in dev, less verbose)
                if (["matching_headings", "matching_information", "classification"].includes(q.type) && (!normalizedOptions || !Array.isArray(normalizedOptions) || normalizedOptions.length === 0)) {
                  // Only log in development mode and only once per question type
                  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
                    console.warn(`[Listening Q${q.id}] ${q.type} missing options`);
                  }
                }
                const isChoiceType =
                  !isMultiItemMatching &&
                  normalizedOptions &&
                  Array.isArray(normalizedOptions) &&
                  normalizedOptions.length > 0;
                return (
                  <div key={q.id} className="text-sm space-y-1">
                    <p className="font-medium">
                      Q{q.id}. {q.question}
                    </p>
                    {isMultiItemMatching ? (
                      <div className="ml-1 space-y-3 mt-3">
                        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                          {q.type === "matching_information" ? (
                            <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wide">
                              Match each statement with the correct paragraph:
                            </p>
                          ) : q.type === "matching_headings" ? (
                            <>
                              <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wide">
                                Match each paragraph with the correct heading:
                              </p>
                              {/* Display headings list above for matching_headings */}
                              {normalizedOptions && Array.isArray(normalizedOptions) && normalizedOptions.length > 0 && (
                                <div className="mb-3 p-2 bg-slate-900/50 rounded border border-slate-700">
                                  <p className="text-xs text-slate-300 mb-1.5 font-medium">Headings:</p>
                                  <ul className="space-y-1 text-xs text-slate-200">
                                    {normalizedOptions.map((op: any, opIdx: number) => {
                                      const label =
                                        typeof op === "string"
                                          ? op.trim()
                                          : (op?.text ?? op?.label ?? op?.option ?? String(op)).trim();
                                      return (
                                        <li key={opIdx} className="pl-2">
                                          {label}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wide">
                              Match each item:
                            </p>
                          )}
                          <div className="space-y-2.5">
                            {q.items.map((item: any, itemIdx: number) => {
                              // Extract item text - handle both string and object formats
                              const itemStr = typeof item === "string"
                                ? item.trim()
                                : (item?.item ?? item?.text ?? item?.label ?? String(item)).trim();
                              const itemKey = `${baseKey}_${itemStr}`;
                              const selectedValue = answers[itemKey] || "";
                              // For matching_headings, items are paragraph identifiers (A, B, C or Paragraph A, Paragraph B)
                              // For matching_information, items are statements
                              const isParagraphItem = q.type === "matching_headings";
                              // Extract paragraph letter for display (e.g., "Paragraph A" -> "A")
                              const displayLabel = isParagraphItem
                                ? itemStr.replace(/^paragraph\s+/i, "").trim()
                                : `${itemIdx + 1}.`;
                              return (
                                <div key={itemIdx} className="flex items-start gap-3 text-xs">
                                  <span className="font-semibold text-primary-400 mt-0.5 min-w-[1.5rem]">
                                    {displayLabel}:
                                  </span>
                                  <div className="flex-1 space-y-1">
                                    {!isParagraphItem && (
                                      <p className="text-slate-200 leading-relaxed">
                                        {itemStr}
                                      </p>
                                    )}
                                    <select
                                      className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1.5 text-xs text-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                      value={selectedValue}
                                      onChange={(e) =>
                                        setAnswers({
                                          ...answers,
                                          [itemKey]: e.target.value,
                                        })
                                      }
                                    >
                                      <option value="">
                                        {q.type === "matching_information"
                                          ? "-- Select paragraph --"
                                          : q.type === "matching_headings"
                                            ? "-- Select heading --"
                                            : "-- Select --"}
                                      </option>
                                      {normalizedOptions && Array.isArray(normalizedOptions) && normalizedOptions.length > 0 ? (
                                        normalizedOptions.map((op: any, opIdx: number) => {
                                          // Extract option text - handle both string and object formats
                                          const fullText =
                                            typeof op === "string"
                                              ? op.trim()
                                              : (op?.text ?? op?.label ?? op?.option ?? String(op)).trim();
                                          // For matching_headings, extract label for display (headings already shown above)
                                          const displayText = q.type === "matching_headings"
                                            ? (() => {
                                              // Extract label (e.g., "v. Heading text" -> "v", "ii. Heading" -> "ii")
                                              const parts = fullText.split(".");
                                              if (parts.length > 1) {
                                                const label = parts[0].trim().toLowerCase();
                                                // Check if it's a valid label (roman numeral: i, ii, iii, iv, v, vi, vii, viii, ix, x, etc.)
                                                // or single letter (A-Z) or number
                                                const romanNumerals = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii", "xiii", "xiv", "xv"];
                                                if (romanNumerals.includes(label) || (label.length === 1 && label.match(/^[a-z]$/)) || label.match(/^\d+$/)) {
                                                  return parts[0].trim(); // Return original case
                                                }
                                              }
                                              // Fallback: return first word/character if it looks like a label
                                              const firstPart = fullText.trim().split()[0]?.toLowerCase();
                                              if (firstPart) {
                                                const romanNumerals = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
                                                if (romanNumerals.includes(firstPart) || (firstPart.length === 1 && firstPart.match(/^[a-z]$/)) || firstPart.match(/^\d+$/)) {
                                                  return fullText.trim().split()[0]; // Return original case
                                                }
                                              }
                                              return fullText;
                                            })()
                                            : fullText;
                                          return (
                                            <option key={opIdx} value={fullText}>
                                              {displayText}
                                            </option>
                                          );
                                        })
                                      ) : (
                                        <option value="" disabled>No options available</option>
                                      )}
                                    </select>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : isMatchingType && q.options ? (
                      // Single matching question (no items, just options) - use dropdown
                      <div className="ml-1 mt-2">
                        <select
                          className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-xs text-slate-200"
                          value={answers[baseKey] || ""}
                          onChange={(e) =>
                            setAnswers({
                              ...answers,
                              [baseKey]: e.target.value,
                            })
                          }
                        >
                          <option value="">-- Select --</option>
                          {q.options.map((op: any, opIdx: number) => {
                            const label =
                              typeof op === "string"
                                ? op.trim()
                                : (op?.text ?? op?.label ?? op?.option ?? String(op)).trim();
                            return (
                              <option key={opIdx} value={label}>
                                {label}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    ) : isChoiceType && q.options ? (
                      <div className="ml-1 flex flex-col gap-1 text-xs">
                        {q.options.map((op: any, idx: number) => {
                          const label =
                            typeof op === "string"
                              ? op
                              : op?.text ?? op?.label ?? JSON.stringify(op);
                          const value = label;
                          const selected = answers[baseKey] === value;
                          return (
                            <button
                              key={`${q.id}-${idx}`}
                              type="button"
                              className={`text-left rounded-md border px-2 py-1 transition ${selected
                                ? "border-primary-500 bg-primary-500/20 text-primary-100"
                                : "border-slate-700 hover:border-primary-500/70 hover:bg-slate-900 text-slate-200"
                                }`}
                              onClick={() =>
                                setAnswers({
                                  ...answers,
                                  [baseKey]: selected ? "" : value,
                                })
                              }
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <>
                        {q.options && (
                          <ul className="ml-4 list-disc text-xs text-slate-300 space-y-0.5">
                            {q.options.map((op: any, idx: number) => {
                              const label =
                                typeof op === "string"
                                  ? op
                                  : op?.text ?? op?.label ?? JSON.stringify(op);
                              const keyOpt =
                                typeof op === "string"
                                  ? op
                                  : op?.id ?? `${idx}-${label}`;
                              return <li key={keyOpt}>{label}</li>;
                            })}
                          </ul>
                        )}
                        <input
                          className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-xs"
                          value={answers[baseKey] ?? ""}
                          onChange={(e) =>
                            setAnswers({ ...answers, [baseKey]: e.target.value })
                          }
                          placeholder="Your answer"
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadingView({
  content,
  answers,
  setAnswers,
}: {
  content: any;
  answers: Record<string, any>;
  setAnswers: (a: Record<string, any>) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6 shadow-2xl border-slate-700/50">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 flex items-center justify-center border border-green-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-100">Reading Test</h2>
            <p className="text-sm text-slate-400 mt-1">2 passages • 20 questions • ~40 minutes</p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-slate-300 leading-relaxed">
            Read each passage carefully and answer the questions based on the information provided.
          </p>
        </div>
      </div>

      {/* Passages */}
      <div className="space-y-8">
        {content.passages.map((passage: any, passageIdx: number) => (
          <div key={passage.id} className="card p-6 space-y-5 shadow-xl border-slate-700/50">
            {/* Passage Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center border border-green-500/30">
                <span className="text-lg font-bold text-green-400">{passage.id}</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-100">
                  Passage {passage.id}
                </h3>
                <p className="text-sm text-green-400 font-semibold mt-0.5">
                  {passage.title}
                </p>
              </div>
            </div>

            {/* Passage Content */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-5 max-h-96 overflow-y-auto">
              <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
                {passage.content}
              </p>
            </div>
            {passage.chart_data && (
              <div className="text-xs text-slate-300">
                <p className="font-semibold mt-2">{passage.chart_data.title}</p>
                <p>{passage.chart_description}</p>
              </div>
            )}
            <div className="space-y-3">
              {passage.questions.map((q: any) => {
                const baseKey = `reading_p${passage.id}_q${q.id}`;
                // Normalize options: convert objects to array if needed
                let normalizedOptions = q.options;
                if (q.options && !Array.isArray(q.options)) {
                  if (typeof q.options === "object") {
                    normalizedOptions = Object.values(q.options);
                  } else {
                    normalizedOptions = [];
                  }
                }

                // Matching type: can be multi-item (with items array) or single (just options)
                const isMatchingType =
                  normalizedOptions &&
                  Array.isArray(normalizedOptions) &&
                  normalizedOptions.length > 0 &&
                  ["matching_headings", "matching_information", "classification"].includes(q.type);
                const isMultiItemMatching = isMatchingType && q.items && q.items.length > 0;

                // Debug: log if matching type but no options (only in dev, less verbose)
                if (["matching_headings", "matching_information", "classification"].includes(q.type) && (!normalizedOptions || !Array.isArray(normalizedOptions) || normalizedOptions.length === 0)) {
                  // Only log in development mode and only once per question type
                  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
                    console.warn(`[Reading Q${q.id}] ${q.type} missing options`);
                  }
                }
                const isChoiceType =
                  !isMultiItemMatching &&
                  normalizedOptions &&
                  Array.isArray(normalizedOptions) &&
                  normalizedOptions.length > 0;
                return (
                  <div key={q.id} className="text-sm space-y-1">
                    <p className="font-medium">
                      Q{q.id}. {q.question}
                    </p>
                    {isMultiItemMatching ? (
                      <div className="ml-1 space-y-3 mt-3">
                        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                          {q.type === "matching_information" ? (
                            <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wide">
                              Match each statement with the correct paragraph:
                            </p>
                          ) : q.type === "matching_headings" ? (
                            <>
                              <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wide">
                                Match each paragraph with the correct heading:
                              </p>
                              {/* Display headings list above for matching_headings */}
                              {normalizedOptions && Array.isArray(normalizedOptions) && normalizedOptions.length > 0 && (
                                <div className="mb-3 p-2 bg-slate-900/50 rounded border border-slate-700">
                                  <p className="text-xs text-slate-300 mb-1.5 font-medium">Headings:</p>
                                  <ul className="space-y-1 text-xs text-slate-200">
                                    {normalizedOptions.map((op: any, opIdx: number) => {
                                      const label =
                                        typeof op === "string"
                                          ? op.trim()
                                          : (op?.text ?? op?.label ?? op?.option ?? String(op)).trim();
                                      return (
                                        <li key={opIdx} className="pl-2">
                                          {label}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wide">
                              Match each item:
                            </p>
                          )}
                          <div className="space-y-2.5">
                            {q.items.map((item: any, itemIdx: number) => {
                              // Extract item text - handle both string and object formats
                              const itemStr = typeof item === "string"
                                ? item.trim()
                                : (item?.item ?? item?.text ?? item?.label ?? String(item)).trim();
                              const itemKey = `${baseKey}_${itemStr}`;
                              const selectedValue = answers[itemKey] || "";
                              // For matching_headings, items are paragraph identifiers (A, B, C or Paragraph A, Paragraph B)
                              // For matching_information, items are statements
                              const isParagraphItem = q.type === "matching_headings";
                              // Extract paragraph letter for display (e.g., "Paragraph A" -> "A")
                              const displayLabel = isParagraphItem
                                ? itemStr.replace(/^paragraph\s+/i, "").trim()
                                : `${itemIdx + 1}.`;
                              return (
                                <div key={itemIdx} className="flex items-start gap-3 text-xs">
                                  <span className="font-semibold text-primary-400 mt-0.5 min-w-[1.5rem]">
                                    {displayLabel}:
                                  </span>
                                  <div className="flex-1 space-y-1">
                                    {!isParagraphItem && (
                                      <p className="text-slate-200 leading-relaxed">
                                        {itemStr}
                                      </p>
                                    )}
                                    <select
                                      className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1.5 text-xs text-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                      value={selectedValue}
                                      onChange={(e) =>
                                        setAnswers({
                                          ...answers,
                                          [itemKey]: e.target.value,
                                        })
                                      }
                                    >
                                      <option value="">
                                        {q.type === "matching_information"
                                          ? "-- Select paragraph --"
                                          : q.type === "matching_headings"
                                            ? "-- Select heading --"
                                            : "-- Select --"}
                                      </option>
                                      {normalizedOptions && Array.isArray(normalizedOptions) && normalizedOptions.length > 0 ? (
                                        normalizedOptions.map((op: any, opIdx: number) => {
                                          // Extract option text - handle both string and object formats
                                          const fullText =
                                            typeof op === "string"
                                              ? op.trim()
                                              : (op?.text ?? op?.label ?? op?.option ?? String(op)).trim();
                                          // For matching_headings, extract label for display (headings already shown above)
                                          const displayText = q.type === "matching_headings"
                                            ? (() => {
                                              // Extract label (e.g., "v. Heading text" -> "v", "ii. Heading" -> "ii")
                                              const parts = fullText.split(".");
                                              if (parts.length > 1) {
                                                const label = parts[0].trim().toLowerCase();
                                                // Check if it's a valid label (roman numeral: i, ii, iii, iv, v, vi, vii, viii, ix, x, etc.)
                                                // or single letter (A-Z) or number
                                                const romanNumerals = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii", "xiii", "xiv", "xv"];
                                                if (romanNumerals.includes(label) || (label.length === 1 && label.match(/^[a-z]$/)) || label.match(/^\d+$/)) {
                                                  return parts[0].trim(); // Return original case
                                                }
                                              }
                                              // Fallback: return first word/character if it looks like a label
                                              const firstPart = fullText.trim().split()[0]?.toLowerCase();
                                              if (firstPart) {
                                                const romanNumerals = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
                                                if (romanNumerals.includes(firstPart) || (firstPart.length === 1 && firstPart.match(/^[a-z]$/)) || firstPart.match(/^\d+$/)) {
                                                  return fullText.trim().split()[0]; // Return original case
                                                }
                                              }
                                              return fullText;
                                            })()
                                            : fullText;
                                          return (
                                            <option key={opIdx} value={fullText}>
                                              {displayText}
                                            </option>
                                          );
                                        })
                                      ) : (
                                        <option value="" disabled>No options available</option>
                                      )}
                                    </select>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : isMatchingType && q.options ? (
                      // Single matching question (no items, just options) - use dropdown
                      <div className="ml-1 mt-2">
                        <select
                          className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-xs text-slate-200"
                          value={answers[baseKey] || ""}
                          onChange={(e) =>
                            setAnswers({
                              ...answers,
                              [baseKey]: e.target.value,
                            })
                          }
                        >
                          <option value="">-- Select --</option>
                          {q.options.map((op: any, opIdx: number) => {
                            const label =
                              typeof op === "string"
                                ? op.trim()
                                : (op?.text ?? op?.label ?? op?.option ?? String(op)).trim();
                            return (
                              <option key={opIdx} value={label}>
                                {label}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    ) : isChoiceType ? (
                      <div className="ml-1 flex flex-col gap-1 text-xs">
                        {q.options.map((op: any, idx: number) => {
                          const label =
                            typeof op === "string"
                              ? op
                              : op?.text ?? op?.label ?? JSON.stringify(op);
                          const value = label;
                          const selected = answers[baseKey] === value;
                          return (
                            <button
                              key={`${q.id}-${idx}`}
                              type="button"
                              className={`text-left rounded-md border px-2 py-1 transition ${selected
                                ? "border-primary-500 bg-primary-500/20 text-primary-100"
                                : "border-slate-700 hover:border-primary-500/70 hover:bg-slate-900 text-slate-200"
                                }`}
                              onClick={() =>
                                setAnswers({
                                  ...answers,
                                  [baseKey]: selected ? "" : value,
                                })
                              }
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <>
                        {q.options && (
                          <ul className="ml-4 list-disc text-xs text-slate-300 space-y-0.5">
                            {q.options.map((op: any, idx: number) => {
                              const label =
                                typeof op === "string"
                                  ? op
                                  : op?.text ?? op?.label ?? JSON.stringify(op);
                              const keyOpt =
                                typeof op === "string"
                                  ? op
                                  : op?.id ?? `${idx}-${label}`;
                              return <li key={keyOpt}>{label}</li>;
                            })}
                          </ul>
                        )}
                        <input
                          className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-xs"
                          value={answers[baseKey] ?? ""}
                          onChange={(e) =>
                            setAnswers({ ...answers, [baseKey]: e.target.value })
                          }
                          placeholder="Your answer"
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpeakingView({
  content,
  answers,
  setAnswers,
}: {
  content: any;
  answers: Record<string, any>;
  setAnswers: (a: Record<string, any>) => void;
}) {

  const buildQuestions = () => {
    const list: any[] = [];

    content.part1.forEach((q: any) => {
      list.push({
        type: "part1",
        question: q.question,
        key: `speaking_part1_${q.id}`,
        time: 20,
      });
    });

    // list.push({
    //   type: "part2_prep",
    //   question: `${content.part2.topic}. ${content.part2.task_card}`,
    //   key: "speaking_part2",
    //   time: 60,
    // });

    list.push({
      type: "part2",
      question: `${content.part2.topic}. ${content.part2.task_card}`,
      key: "speaking_part2",
      time: 120,
    });

    content.part3.forEach((q: any) => {
      list.push({
        type: "part3",
        question: q.question,
        key: `speaking_part3_${q.id}`,
        time: 30,
      });
    });

    return list;
  };

  const questions = buildQuestions();
  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [phase, setPhase] = useState<"prep" | "speaking" | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isPreparation, setIsPreparation] = useState(false);
  const [isReadingQuestion, setIsReadingQuestion] = useState(false);
  const recognitionRef = useRef<any>(null);

  const current = questions[index];

  // ===== Speech Recognition Setup =====
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript + " ";
      }
      setTranscript(text);
    };

    recognitionRef.current = recognition;
  }, []);

  // ===== Read Question =====
  useEffect(() => {
    if (!current) return;

    setTranscript("");
    stopRecording();
    speechSynthesis.cancel();
    setIsReadingQuestion(true);
    setPhase(null);
    setTimeLeft(null);

    const utter = new SpeechSynthesisUtterance(current.question);
    utter.lang = "en-US";
    utter.rate = 0.9;

    utter.onend = () => {
      setIsReadingQuestion(false);
      if (current.type === "part2") {
        setPhase("prep");
        setTimeLeft(60);
      } else {
        setPhase("speaking");
        setTimeLeft(current.time);
        startRecording();
      }
    };

    speechSynthesis.speak(utter);
  }, [index]);




  const startRecording = async () => {
    if (!recognitionRef.current) return;
    // Nếu đang chạy thì stop trước
    try {
      recognitionRef.current.stop();
    } catch (e) {
      console.error("Error stopping recognition:", e);
    }
    await navigator.mediaDevices.getUserMedia({ audio: true });

    setTimeout(() => {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.warn("Recognition already running");
      }
    }, 200); // delay nhỏ để tránh race condition  
  };

  const stopRecording = () => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
    } catch (e) { }

    setIsRecording(false);
  };

  // ===== Timer =====
  useEffect(() => {
    if (timeLeft === null) return;

    if (timeLeft <= 0) {
      // Nếu đang prep → chuyển sang speaking
      if (phase === "prep") {
        setPhase("speaking");
        setTimeLeft(120);
        startRecording();
        return;
      }

      // Nếu đang speaking → submit
      if (phase === "speaking") {
        autoSubmit();
        return;
      }
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => (prev ? prev - 1 : 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, phase]);


  const autoSubmit = () => {
    const finalAnswer = transcript.trim();

    stopRecording();

    setAnswers((prev: Record<string, any>) => ({
      ...prev,
      [current.key]: finalAnswer,
    }));

    setTranscript("");

    if (index < questions.length - 1) {
      setIndex((prev: number) => prev + 1);
    } else {
      setCompleted(true);
    }
  };


  const manualSubmit = () => {
    const finalAnswer = transcript.trim();

    setTimeLeft(null);
    stopRecording();

    setAnswers((prev: Record<string, any>) => ({
      ...prev,
      [current.key]: finalAnswer,
    }));

    setTranscript("");

    if (index < questions.length - 1) {
      setIndex((prev: number) => prev + 1);
    } else {
      setCompleted(true);
    }
  };



  const totalRealQuestions =
    content.part1.length +
    1 +
    content.part3.length;

  if (completed) {
    return (
      <div className="card p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
            <span className="text-5xl">✅</span>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-green-400">
            Speaking Test Completed!
          </h2>
          <p className="text-slate-300 max-w-md mx-auto">
            You have successfully completed all {totalRealQuestions} questions of the Speaking test.
          </p>
          <p className="text-sm text-slate-400">
            Click "Submit and see analysis" below to get your detailed band score and feedback.
          </p>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto text-xs">
            <div className="space-y-1">
              <p className="text-slate-400">Part 1</p>
              <p className="font-semibold text-primary-400">{content.part1.length} questions</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400">Part 2</p>
              <p className="font-semibold text-primary-400">1 cue card</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400">Part 3</p>
              <p className="font-semibold text-primary-400">{content.part3.length} questions</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Determine which part we're in
  const getPartInfo = () => {
    if (!current) return { part: 0, title: "" };

    if (current.type === "part1") {
      return { part: 1, title: "Introduction & Interview", description: "General questions about yourself and familiar topics" };
    } else if (current.type === "part2") {
      return { part: 2, title: "Long Turn (Cue Card)", description: "Speak for 1-2 minutes on a given topic" };
    } else if (current.type === "part3") {
      return { part: 3, title: "Discussion", description: "More abstract questions related to Part 2 topic" };
    }
    return { part: 0, title: "" };
  };

  const partInfo = getPartInfo();

  return (
    <div className="card p-6 text-center space-y-6">
      <h2 className="text-lg font-semibold">
        Speaking Test
      </h2>

      <p className="text-sm text-slate-400">
        Question {Math.min(index + 1, totalRealQuestions)} / {totalRealQuestions}
      </p>

      {!current && (
        <p className="text-slate-400">Loading question...</p>
      )}

      {current && (
        <>
          <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4 mb-4">
            <p className="text-xs uppercase tracking-wide text-primary-400 font-semibold mb-1">
              Part {partInfo.part}
            </p>
            <p className="text-sm font-semibold text-slate-200">{partInfo.title}</p>
            <p className="text-xs text-slate-400 mt-1">{partInfo.description}</p>
          </div>

          {isReadingQuestion && (
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">🎧</span>
              <p className="text-primary-400 font-semibold">
                Listening to question...
              </p>
            </div>
          )}

          {!isReadingQuestion && timeLeft !== null && (
            <div className="text-4xl font-bold text-primary-400">
              {timeLeft}s
            </div>
          )}

          {phase === "prep" && !isReadingQuestion && (
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">⏱️</span>
              <p className="text-yellow-400 font-semibold">
                Preparation time...
              </p>
            </div>
          )}

          {isRecording && !isReadingQuestion && (
            <div className="flex items-center justify-center gap-2">
              <span className="inline-block w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              <p className="text-red-400 font-semibold">
                Recording...
              </p>
            </div>
          )}

          {!isReadingQuestion && (
            <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg text-sm text-slate-300 min-h-[120px] max-h-[200px] overflow-y-auto text-left">
              {transcript || (
                <span className="text-slate-500 italic">
                  {isRecording ? "Speak now..." : phase === "prep" ? "Preparing..." : "Waiting..."}
                </span>
              )}
            </div>
          )}

          {isRecording && phase === "speaking" && (
            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={manualSubmit}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm font-medium transition"
              >
                ✓ Submit Answer
              </button>

              <button
                onClick={() => {
                  stopRecording();
                  if (index < questions.length - 1) {
                    setIndex((prev: number) => prev + 1);
                  } else {
                    setCompleted(true);
                  }
                }}
                className="px-6 py-2 border border-slate-600 hover:border-slate-500 rounded-lg text-slate-300 hover:text-slate-200 text-sm font-medium transition"
              >
                Skip →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}



function WritingView({
  content,
  answers,
  setAnswers,
}: {
  content: any;
  answers: Record<string, any>;
  setAnswers: (a: Record<string, any>) => void;
}) {
  return (
    <div className="card p-6 space-y-4">
      <h2 className="text-lg font-semibold">Writing test (Task 1 & Task 2)</h2>
      <section className="space-y-2">
        <p className="font-semibold text-sm">
          Task 1 – Visual description ({content.task1.min_words}–{content.task1.max_words} words)
        </p>
        <p className="text-xs text-slate-300">{content.task1.instructions}</p>
        {content.task1.chart_data && (
          <div className="space-y-3">
            <p className="font-semibold text-sm">
              {content.task1.chart_data.title}
            </p>

            <div className="bg-white p-4 rounded-lg">
              <ChartRenderer chart={content.task1.chart_data} />
            </div>

            <p className="text-xs text-slate-300">
              {content.task1.chart_description}
            </p>
          </div>
        )}

        <textarea
          className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-xs min-h-[120px]"
          value={answers.writing_task1 ?? ""}
          onChange={(e) =>
            setAnswers({ ...answers, writing_task1: e.target.value })
          }
        />
      </section>

      <section className="space-y-2">
        <p className="font-semibold text-sm">
          Task 2 – Essay ({content.task2.min_words}–{content.task2.max_words} words)
        </p>
        <p className="text-xs text-slate-200">{content.task2.question}</p>
        <textarea
          className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-xs min-h-[160px]"
          value={answers.writing_task2 ?? ""}
          onChange={(e) =>
            setAnswers({ ...answers, writing_task2: e.target.value })
          }
        />
      </section>
    </div>
  );
}

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

function ChartRenderer({ chart }: { chart: any }) {
  if (!chart) return null;

  const data = {
    labels: chart.labels,
    datasets: [
      {
        label: chart.title,
        data: chart.data,

      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: "#1e293b",
          font: { size: 12 },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#334155" },
      },
      y: {
        ticks: { color: "#334155" },
      },
    },
  };


  if (chart.type === "bar") {
    return <Bar data={data} options={options} />;
  }

  if (chart.type === "line") {
    return <Line data={data} options={options} />;
  }

  return null;
}


function ResultView({
  skill,
  result,
  content,
  answers,
  skillResults,
  finalLoading,
  onRetake,
  onViewOverall,
}: {
  skill: Skill;
  result: any;
  content: any;
  answers: Record<string, any>;
  skillResults: Record<string, any>;
  finalLoading: boolean;
  onRetake: () => void;
  onViewOverall: () => void;
}) {
  const band = result.band;
  const details = result.details;

  // Check if all 4 skills are completed
  const allSkillsCompleted =
    skillResults.listening &&
    skillResults.reading &&
    skillResults.speaking &&
    skillResults.writing;

  return (
    <div className="space-y-4">
      {/* Completion notification */}
      {allSkillsCompleted && (
        <div className="card bg-gradient-to-r from-green-500/10 to-primary-500/10 border-green-500/30 p-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🎉</div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-400">Hoàn thành cả 4 kỹ năng!</h3>
              <p className="text-xs text-slate-300 mt-1">
                Bạn đã hoàn thành đầy đủ bài test. Hãy xem báo cáo tổng hợp để biết điểm Overall Band và lộ trình cải thiện chi tiết.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold capitalize">
              {skill} – Estimated band:{" "}
              <span className="text-primary-400">{band.toFixed(1)}</span>
            </h2>
            <p className="text-xs text-slate-300">
              This is a diagnostic estimate based on your performance in this skill only.
            </p>
          </div>

          <div className="flex gap-2">
            {!allSkillsCompleted ? (
              <button className="btn-outline text-xs" onClick={onRetake}>
                Try another skill
              </button>
            ) : (
              <>
                <button className="btn-outline text-xs" onClick={onRetake}>
                  Back to skills
                </button>
                <button
                  className="btn bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-6 py-2 rounded-lg font-semibold shadow-lg shadow-primary-500/20 text-xs"
                  onClick={onViewOverall}
                  disabled={finalLoading}
                >
                  {finalLoading ? (
                    <>
                      <span className="inline-block animate-spin mr-2">⏳</span>
                      Generating...
                    </>
                  ) : (
                    "📊 View Overall Report"
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {["listening", "reading"].includes(skill) && (
          <div className="space-y-4 text-sm">
            <div className="space-y-2">
              <p className="font-semibold">Score summary</p>
              <p className="text-slate-200">
                Raw: {details.raw_score}/{details.total_questions} = Band {band.toFixed(1)}
              </p>
            </div>

            {/* {skill === "listening" && (
            <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/40 space-y-3">
              <p className="font-semibold text-sm text-primary-400">
                Listening Transcript
              </p>

              {content.listening.sections.map((section: any) => (
                <div key={section.id} className="space-y-2 text-xs text-slate-200">
                  <p className="font-semibold">
                    Section {section.id}: {section.title}
                  </p>

                  <div className="max-h-48 overflow-y-auto pr-2 space-y-1">
                    {section.audio_transcript.map((line: any, idx: number) => (
                      <p key={idx}>
                        <span className="font-semibold text-primary-300">
                          {line.speaker}:
                        </span>{" "}
                        {line.text}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )} */}

            {/* Detailed question-by-question results */}
            <div className="space-y-3">
              <p className="font-semibold text-sm">Detailed results by question</p>
              {skill === "listening" && (
                <DetailedListeningResults
                  content={content.listening}
                  detailedResults={details.detailed_results || []}
                />
              )}
              {skill === "reading" && (
                <DetailedReadingResults
                  content={content.reading}
                  detailedResults={details.detailed_results || []}
                />
              )}
            </div>
          </div>
        )}

        {skill === "speaking" && (
          <div className="space-y-3 text-sm">
            <p className="font-semibold">IELTS criteria</p>
            <ul className="grid md:grid-cols-2 gap-2 text-xs">
              <li>Fluency &amp; Coherence: {details.fluency_coherence}</li>
              <li>Lexical Resource: {details.lexical_resource}</li>
              <li>Grammatical Range &amp; Accuracy: {details.grammatical_range}</li>
              <li>Pronunciation: {details.pronunciation}</li>
            </ul>
            {details.extended_analysis && (
              <ExtendedAnalysisView data={details.extended_analysis} />
            )}
          </div>
        )}

        {skill === "writing" && (
          <div className="space-y-3 text-sm">
            <p className="font-semibold">IELTS criteria (Task 2 focus)</p>
            {details.task2 && (
              <ul className="grid md:grid-cols-2 gap-2 text-xs">
                <li>Task Response: {details.task2.task_response}</li>
                <li>Coherence & Cohesion: {details.task2.coherence_cohesion}</li>
                <li>Lexical Resource: {details.task2.lexical_resource}</li>
                <li>Grammatical Range & Accuracy: {details.task2.grammatical_range}</li>
              </ul>
            )}
            {details.extended_analysis && (
              <ExtendedAnalysisView data={details.extended_analysis} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ExtendedAnalysisView({ data }: { data: any }) {
  return (
    <div className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-200 space-y-1">
      {data.reflex_level && (
        <p>
          <span className="font-semibold">Mức độ phản xạ:</span> {data.reflex_level}
        </p>
      )}
      {data.reception_ability && (
        <p>
          <span className="font-semibold">Khả năng tiếp nhận:</span>{" "}
          {data.reception_ability}
        </p>
      )}
      {data.mother_tongue_influence && (
        <p>
          <span className="font-semibold">Ảnh hưởng tiếng mẹ đẻ:</span>{" "}
          {data.mother_tongue_influence}
        </p>
      )}
      {data.grammar_analysis && (
        <p>
          <span className="font-semibold">Ngữ pháp:</span> {data.grammar_analysis}
        </p>
      )}
      {data.pronunciation_analysis && (
        <p>
          <span className="font-semibold">Phát âm:</span>{" "}
          {data.pronunciation_analysis}
        </p>
      )}
      {data.vocabulary_analysis && (
        <p>
          <span className="font-semibold">Từ vựng:</span> {data.vocabulary_analysis}
        </p>
      )}
      {data.structure_quality && (
        <p>
          <span className="font-semibold">Cấu trúc bài:</span>{" "}
          {data.structure_quality}
        </p>
      )}
      {data.overall_assessment && (
        <p>
          <span className="font-semibold">Đánh giá tổng thể:</span>{" "}
          {data.overall_assessment}
        </p>
      )}
    </div>
  );
}

function DetailedListeningResults({
  content,
  detailedResults,
}: {
  content: any;
  detailedResults: any[];
}) {
  // Group results by section
  const bySection: Record<number, any[]> = {};
  detailedResults.forEach((r) => {
    const sid = r.section_id;
    if (!bySection[sid]) bySection[sid] = [];
    bySection[sid].push(r);
  });

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      {content.sections.map((section: any) => {
        const sectionResults = bySection[section.id] || [];
        const sectionCorrect = sectionResults.filter((r) => r.is_correct).length;
        const sectionTotal = sectionResults.length;

        return (
          <div
            key={section.id}
            className="border border-slate-800 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">
                Section {section.id}: {section.title}
              </p>
              <p className="text-xs text-slate-300">
                Score: {sectionCorrect}/{sectionTotal}
              </p>
            </div>
            <div className="mt-3 border border-slate-800 rounded-lg p-3 bg-slate-900/40">
              <p className="font-semibold text-xs text-primary-400 mb-2">
                Transcript
              </p>

              <div className="text-xs text-slate-200 space-y-1 whitespace-pre-wrap leading-relaxed">
                {section.audio_transcript.map((line: any, idx: number) => (
                  <p key={idx}>
                    <span className="font-semibold text-primary-300">
                      {line.speaker}:
                    </span>{" "}
                    {line.text}
                  </p>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {section.questions.map((q: any) => {
                // Check if this is a matching question with items
                const hasItems = q.items && q.items.length > 0;
                const itemResults = hasItems
                  ? sectionResults.filter((r) => r.question_id === q.id && r.item)
                  : [];

                if (hasItems && itemResults.length > 0) {
                  // Display matching question with items
                  const itemCorrect = itemResults.filter((r) => r.is_correct).length;
                  const itemTotal = itemResults.length;
                  return (
                    <div
                      key={q.id}
                      className="rounded-lg border border-slate-800 p-3 text-xs"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-slate-200">
                          Q{q.id}. {q.question}
                        </p>
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300">
                          {itemCorrect}/{itemTotal} correct
                        </span>
                      </div>
                      <div className="space-y-1.5 mt-2">
                        {q.items.map((item: any) => {
                          // Extract item text - handle both string and object formats
                          const itemStr = typeof item === "string"
                            ? item.trim()
                            : (item?.item ?? item?.text ?? item?.label ?? String(item)).trim();
                          const itemResult = itemResults.find((r) => r.item === itemStr);
                          const userAnswer = itemResult?.user_answer || "";
                          const correctAnswer = itemResult?.correct_answer || "";
                          const isCorrect = itemResult?.is_correct ?? false;
                          const hasAnswer = userAnswer.trim() !== "";

                          return (
                            <div
                              key={itemStr}
                              className={`rounded border p-2 ${!hasAnswer
                                ? "border-yellow-700/50 bg-yellow-950/10"
                                : isCorrect
                                  ? "border-green-700/50 bg-green-950/10"
                                  : "border-red-700/50 bg-red-950/10"
                                }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-slate-200">{itemStr}:</span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-xs ${!hasAnswer
                                    ? "bg-yellow-900/50 text-yellow-200"
                                    : isCorrect
                                      ? "bg-green-900/50 text-green-200"
                                      : "bg-red-900/50 text-red-200"
                                    }`}
                                >
                                  {!hasAnswer
                                    ? "Not answered"
                                    : isCorrect
                                      ? "✓"
                                      : "✗"}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <p className="text-slate-400 mb-0.5">Your:</p>
                                  <p
                                    className={
                                      hasAnswer
                                        ? isCorrect
                                          ? "text-green-300"
                                          : "text-red-300"
                                        : "text-yellow-300"
                                    }
                                  >
                                    {hasAnswer ? userAnswer : "(No answer)"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-slate-400 mb-0.5">Correct:</p>
                                  <p className="text-green-300">{correctAnswer}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // Regular single-answer question
                const result = sectionResults.find(
                  (r) => r.question_id === q.id && !r.item
                );
                const userAnswer = result?.user_answer || "";
                const correctAnswer = result?.correct_answer || q.correct_answer;
                const isCorrect = result?.is_correct ?? false;
                const hasAnswer = userAnswer.trim() !== "";

                return (
                  <div
                    key={q.id}
                    className={`rounded-lg border p-3 text-xs ${!hasAnswer
                      ? "border-yellow-700/50 bg-yellow-950/20"
                      : isCorrect
                        ? "border-green-700/50 bg-green-950/20"
                        : "border-red-700/50 bg-red-950/20"
                      }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-slate-200">
                        Q{q.id}. {q.question}
                      </p>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${!hasAnswer
                          ? "bg-yellow-900/50 text-yellow-200"
                          : isCorrect
                            ? "bg-green-900/50 text-green-200"
                            : "bg-red-900/50 text-red-200"
                          }`}
                      >
                        {!hasAnswer
                          ? "Not answered"
                          : isCorrect
                            ? "✓ Correct"
                            : "✗ Wrong"}
                      </span>
                    </div>
                    {q.options && (
                      <ul className="ml-4 list-disc text-slate-300 mb-2 space-y-0.5">
                        {q.options.map((op: any, idx: number) => {
                          const label =
                            typeof op === "string"
                              ? op
                              : op?.text ?? op?.label ?? JSON.stringify(op);
                          const key =
                            typeof op === "string"
                              ? op
                              : op?.id ?? `${idx}-${label}`;
                          return <li key={key}>{label}</li>;
                        })}
                      </ul>
                    )}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <p className="text-slate-400 text-xs mb-1">Your answer:</p>
                        <p
                          className={`text-sm ${hasAnswer
                            ? isCorrect
                              ? "text-green-300"
                              : "text-red-300"
                            : "text-yellow-300"
                            }`}
                        >
                          {hasAnswer ? userAnswer : "(No answer)"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs mb-1">Correct answer:</p>
                        <p className="text-sm text-green-300">{correctAnswer}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DetailedReadingResults({
  content,
  detailedResults,
}: {
  content: any;
  detailedResults: any[];
}) {
  // Group results by passage
  const byPassage: Record<number, any[]> = {};
  detailedResults.forEach((r) => {
    const pid = r.passage_id;
    if (!byPassage[pid]) byPassage[pid] = [];
    byPassage[pid].push(r);
  });

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      {content.passages.map((passage: any) => {
        const passageResults = byPassage[passage.id] || [];
        const passageCorrect = passageResults.filter((r) => r.is_correct).length;
        const passageTotal = passageResults.length;

        return (
          <div
            key={passage.id}
            className="border border-slate-800 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">
                Passage {passage.id}: {passage.title}
              </p>
              <p className="text-xs text-slate-300">
                Score: {passageCorrect}/{passageTotal}
              </p>
            </div>
            <div className="space-y-2">
              {passage.questions.map((q: any) => {
                // Check if this is a matching question with items
                const hasItems = q.items && q.items.length > 0;
                const itemResults = hasItems
                  ? passageResults.filter((r) => r.question_id === q.id && r.item)
                  : [];

                if (hasItems && itemResults.length > 0) {
                  // Display matching question with items
                  const itemCorrect = itemResults.filter((r) => r.is_correct).length;
                  const itemTotal = itemResults.length;
                  return (
                    <div
                      key={q.id}
                      className="rounded-lg border border-slate-800 p-3 text-xs"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-slate-200">
                          Q{q.id}. {q.question}
                        </p>
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300">
                          {itemCorrect}/{itemTotal} correct
                        </span>
                      </div>
                      <div className="space-y-1.5 mt-2">
                        {q.items.map((item: any) => {
                          // Extract item text - handle both string and object formats
                          const itemStr = typeof item === "string"
                            ? item.trim()
                            : (item?.item ?? item?.text ?? item?.label ?? String(item)).trim();
                          const itemResult = itemResults.find((r) => r.item === itemStr);
                          const userAnswer = itemResult?.user_answer || "";
                          const correctAnswer = itemResult?.correct_answer || "";
                          const isCorrect = itemResult?.is_correct ?? false;
                          const hasAnswer = userAnswer.trim() !== "";

                          return (
                            <div
                              key={itemStr}
                              className={`rounded border p-2 ${!hasAnswer
                                ? "border-yellow-700/50 bg-yellow-950/10"
                                : isCorrect
                                  ? "border-green-700/50 bg-green-950/10"
                                  : "border-red-700/50 bg-red-950/10"
                                }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-slate-200">{itemStr}:</span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-xs ${!hasAnswer
                                    ? "bg-yellow-900/50 text-yellow-200"
                                    : isCorrect
                                      ? "bg-green-900/50 text-green-200"
                                      : "bg-red-900/50 text-red-200"
                                    }`}
                                >
                                  {!hasAnswer
                                    ? "Not answered"
                                    : isCorrect
                                      ? "✓"
                                      : "✗"}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <p className="text-slate-400 mb-0.5">Your:</p>
                                  <p
                                    className={
                                      hasAnswer
                                        ? isCorrect
                                          ? "text-green-300"
                                          : "text-red-300"
                                        : "text-yellow-300"
                                    }
                                  >
                                    {hasAnswer ? userAnswer : "(No answer)"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-slate-400 mb-0.5">Correct:</p>
                                  <p className="text-green-300">{correctAnswer}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // Regular single-answer question
                const result = passageResults.find(
                  (r) => r.question_id === q.id && !r.item
                );
                const userAnswer = result?.user_answer || "";
                const correctAnswer = result?.correct_answer || q.correct_answer;
                const isCorrect = result?.is_correct ?? false;
                const hasAnswer = userAnswer.trim() !== "";

                return (
                  <div
                    key={q.id}
                    className={`rounded-lg border p-3 text-xs ${!hasAnswer
                      ? "border-yellow-700/50 bg-yellow-950/20"
                      : isCorrect
                        ? "border-green-700/50 bg-green-950/20"
                        : "border-red-700/50 bg-red-950/20"
                      }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-slate-200">
                        Q{q.id}. {q.question}
                      </p>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${!hasAnswer
                          ? "bg-yellow-900/50 text-yellow-200"
                          : isCorrect
                            ? "bg-green-900/50 text-green-200"
                            : "bg-red-900/50 text-red-200"
                          }`}
                      >
                        {!hasAnswer
                          ? "Not answered"
                          : isCorrect
                            ? "✓ Correct"
                            : "✗ Wrong"}
                      </span>
                    </div>
                    {q.options && (
                      <ul className="ml-4 list-disc text-slate-300 mb-2 space-y-0.5">
                        {q.options.map((op: any, idx: number) => {
                          const label =
                            typeof op === "string"
                              ? op
                              : op?.text ?? op?.label ?? JSON.stringify(op);
                          const key =
                            typeof op === "string"
                              ? op
                              : op?.id ?? `${idx}-${label}`;
                          return <li key={key}>{label}</li>;
                        })}
                      </ul>
                    )}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <p className="text-slate-400 text-xs mb-1">Your answer:</p>
                        <p
                          className={`text-sm ${hasAnswer
                            ? isCorrect
                              ? "text-green-300"
                              : "text-red-300"
                            : "text-yellow-300"
                            }`}
                        >
                          {hasAnswer ? userAnswer : "(No answer)"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs mb-1">Correct answer:</p>
                        <p className="text-sm text-green-300">{correctAnswer}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OverallResultView({
  skillResults,
  testId,
  finalResult,
  onSaveTest,
  saveSuccess,
}: {
  skillResults: Record<string, any>;
  testId: string | null;
  finalResult: any | null;
  onSaveTest?: () => void;
  saveSuccess?: boolean;
}) {
  const listeningBand = skillResults.listening?.band ?? 0;
  const readingBand = skillResults.reading?.band ?? 0;
  const speakingBand = skillResults.speaking?.band ?? 0;
  const writingBand = skillResults.writing?.band ?? 0;

  const overallBand = finalResult?.overall_band ??
    ((listeningBand + readingBand + speakingBand + writingBand) / 4);

  const [activeTab, setActiveTab] = useState<"overview" | "detailed" | "strengths" | "weaknesses" | "roadmap">("overview");

  // Helper function to get band color
  const getBandColor = (band: number) => {
    if (band >= 7.5) return "text-emerald-400";
    if (band >= 6.5) return "text-green-400";
    if (band >= 5.5) return "text-blue-400";
    if (band >= 4.5) return "text-yellow-400";
    return "text-orange-400";
  };

  // Helper function to get progress percentage
  const getProgressPercentage = (band: number) => (band / 9) * 100;

  return (
    <div className="space-y-8">
      {/* Premium Header with Gradient Background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600/20 via-primary-500/10 to-slate-900 border border-primary-500/30 shadow-2xl">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

        <div className="relative p-8">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row items-start justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                    IELTS Diagnostic Report
                  </h1>
                  <p className="text-xs md:text-sm text-slate-400 mt-1">Comprehensive Performance Analysis</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full md:w-auto">
              {testId && (
                <div className="px-4 py-2.5 bg-slate-900/60 backdrop-blur-sm border border-primary-500/40 rounded-xl shadow-lg">
                  <p className="text-[10px] uppercase tracking-wider text-primary-300/70 mb-0.5">Test ID</p>
                  <p className="text-sm text-primary-300 font-mono font-semibold">{testId}</p>
                </div>
              )}

              {onSaveTest && (
                <button
                  onClick={onSaveTest}
                  disabled={saveSuccess}
                  className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${saveSuccess
                    ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 cursor-default"
                    : "bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-primary-500/50 text-slate-300 hover:text-slate-100"
                    }`}
                >
                  {saveSuccess ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Saved</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      <span>Save Test</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Overall Band Score - Premium Display */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-primary-600/20 blur-3xl"></div>
            <div className="relative text-center py-12 bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl rounded-2xl border border-primary-500/30 shadow-xl">
              <div className="inline-block">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-3 font-semibold">
                  Overall Band Score
                </p>
                <div className="relative inline-block">
                  {/* Glow effect */}
                  <div className={`absolute inset-0 ${getBandColor(overallBand)} opacity-20 blur-2xl rounded-full`}></div>
                  <p className={`relative text-8xl font-black ${getBandColor(overallBand)} tracking-tight`}>
                    {overallBand.toFixed(1)}
                  </p>
                </div>
                {finalResult?.comprehensive_analysis?.proficiency_level && (
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse"></div>
                    <p className="text-sm font-medium text-slate-200">
                      {finalResult.comprehensive_analysis.proficiency_level}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4 Skill Scores - Modern Cards with Progress */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { name: "Listening", icon: "🎧", band: listeningBand },
              { name: "Reading", icon: "📖", band: readingBand },
              { name: "Speaking", icon: "🗣️", band: speakingBand },
              { name: "Writing", icon: "✍️", band: writingBand }
            ].map((skill, idx) => (
              <div
                key={idx}
                className="group relative overflow-hidden bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/10 transition-all duration-300"
              >
                {/* Hover gradient effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/0 to-primary-600/0 group-hover:from-primary-500/5 group-hover:to-primary-600/10 transition-all duration-300"></div>

                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{skill.icon}</span>
                    <span className={`text-2xl font-bold ${getBandColor(skill.band)}`}>
                      {skill.band.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                    {skill.name}
                  </p>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getBandColor(skill.band).replace('text-', 'bg-')} transition-all duration-1000 ease-out`}
                      style={{ width: `${getProgressPercentage(skill.band)}%` }}
                    ></div>
                  </div>

                  {/* Band Label */}
                  <p className="text-[10px] text-slate-500 mt-2 text-right">
                    {skill.band >= 7.5 ? "Excellent" :
                      skill.band >= 6.5 ? "Good" :
                        skill.band >= 5.5 ? "Competent" :
                          skill.band >= 4.5 ? "Modest" : "Limited"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Premium Tab Navigation */}
      {finalResult && (
        <>
          <div className="card p-1.5 shadow-xl">
            <div className="flex gap-1 bg-slate-900/50 rounded-xl p-1">
              {[
                { id: "overview", icon: "📋", label: "Overview", color: "primary" },
                { id: "detailed", icon: "🔍", label: "Details", color: "blue" },
                { id: "strengths", icon: "💪", label: "Strengths", color: "green" },
                { id: "weaknesses", icon: "🎯", label: "Improve", color: "yellow" },
                { id: "roadmap", icon: "🗺️", label: "Roadmap", color: "purple" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`
                    flex-1 relative px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-300
                    ${activeTab === tab.id
                      ? "bg-gradient-to-br from-primary-500/20 to-primary-600/20 text-primary-300 shadow-lg shadow-primary-500/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    }
                  `}
                  onClick={() => setActiveTab(tab.id as any)}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl">{tab.icon}</span>
                    <span className="text-xs tracking-wide">{tab.label}</span>
                  </div>

                  {/* Active indicator */}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full shadow-lg shadow-primary-500/50"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content - Premium Card */}
          <div className="card p-8 shadow-xl border-slate-700/50">
            {activeTab === "overview" && (
              <OverviewTab analysis={finalResult.comprehensive_analysis} />
            )}
            {activeTab === "detailed" && (
              <DetailedAnalysisTab
                detailedAnalysis={finalResult.detailed_skill_analysis}
                skillBands={{
                  listening: listeningBand,
                  reading: readingBand,
                  speaking: speakingBand,
                  writing: writingBand
                }}
              />
            )}
            {activeTab === "strengths" && (
              <StrengthsTab strengths={finalResult.strengths} />
            )}
            {activeTab === "weaknesses" && (
              <WeaknessesTab weaknesses={finalResult.weaknesses} />
            )}
            {activeTab === "roadmap" && (
              <RoadmapTab roadmap={finalResult.improvement_roadmap} />
            )}
          </div>
        </>
      )}

      {!finalResult && (
        <div className="card p-6 text-center text-slate-400">
          <p>Loading comprehensive analysis...</p>
        </div>
      )}
    </div>
  );
}

function OverviewTab({ analysis }: { analysis: any }) {
  if (!analysis) return <p className="text-slate-400">No analysis available</p>;

  return (
    <div className="space-y-8">
      {/* Main Analysis */}
      <div className="relative">
        <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></div>
        <div className="pl-6">
          <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            {analysis.title}
          </h3>
          <div className="prose prose-invert max-w-none">
            <p className="text-base text-slate-300 leading-relaxed whitespace-pre-line">
              {analysis.summary}
            </p>
          </div>
        </div>
      </div>

      {/* Skill Balance Section */}
      {analysis.skill_balance && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-3xl"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center border border-primary-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-slate-200">
                Skill Balance Analysis
              </h4>
            </div>
            <p className="text-slate-300 leading-relaxed whitespace-pre-line">
              {analysis.skill_balance}
            </p>
          </div>
        </div>
      )}

      {/* Proficiency Level Badge */}
      {analysis.proficiency_level && (
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-primary-500/10 to-primary-600/10 border border-primary-500/30 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <span className="text-sm font-semibold text-slate-200">
              Current Level: <span className="text-primary-300">{analysis.proficiency_level}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailedAnalysisTab({
  detailedAnalysis,
  skillBands
}: {
  detailedAnalysis: any;
  skillBands: { listening: number; reading: number; speaking: number; writing: number };
}) {
  if (!detailedAnalysis) {
    return <p className="text-slate-400">No detailed analysis available</p>;
  }

  const [activeSkill, setActiveSkill] = useState<"listening" | "reading" | "speaking" | "writing">("listening");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-4">Phân tích chuyên sâu từng kỹ năng</h3>

        {/* Skill selector */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {["listening", "reading", "speaking", "writing"].map((skill) => {
            const skillName = {
              listening: "Listening",
              reading: "Reading",
              speaking: "Speaking",
              writing: "Writing"
            }[skill];

            const band = skillBands[skill as keyof typeof skillBands];

            return (
              <button
                key={skill}
                className={`p-3 rounded-lg border transition ${activeSkill === skill
                  ? "border-primary-500 bg-primary-500/10 text-primary-300"
                  : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                  }`}
                onClick={() => setActiveSkill(skill as any)}
              >
                <p className="font-semibold text-sm">{skillName}</p>
                <p className="text-xs mt-1">Band {band.toFixed(1)}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Listening Analysis */}
      {activeSkill === "listening" && detailedAnalysis.listening && (
        <div className="space-y-4">
          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-4">
            <h4 className="font-semibold text-slate-200 mb-2">Đánh giá tổng thể</h4>
            <p className="text-sm text-slate-300">{detailedAnalysis.listening.overall_performance}</p>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Phân tích từng Section
            </h4>
            {detailedAnalysis.listening.sections_analysis?.map((section: any, idx: number) => (
              <div key={idx} className="border border-slate-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-semibold text-slate-200">
                    Section {section.section}: {section.title}
                  </h5>
                </div>
                <p className="text-sm text-slate-300">{section.performance}</p>

                {section.key_issues && section.key_issues.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-yellow-400 mb-1">Vấn đề chính:</p>
                    <ul className="space-y-1 text-sm text-slate-300">
                      {section.key_issues.map((issue: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-yellow-400">•</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {section.recommendations && section.recommendations.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-400 mb-1">Khuyến nghị:</p>
                    <ul className="space-y-1 text-sm text-slate-300">
                      {section.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-green-400">→</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reading Analysis */}
      {activeSkill === "reading" && detailedAnalysis.reading && (
        <div className="space-y-4">
          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-4">
            <h4 className="font-semibold text-slate-200 mb-2">Đánh giá tổng thể</h4>
            <p className="text-sm text-slate-300">{detailedAnalysis.reading.overall_performance}</p>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Phân tích từng Passage
            </h4>
            {detailedAnalysis.reading.passages_analysis?.map((passage: any, idx: number) => (
              <div key={idx} className="border border-slate-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-semibold text-slate-200">
                    Passage {passage.passage}: {passage.title}
                  </h5>
                </div>
                <p className="text-sm text-slate-300">{passage.performance}</p>

                {passage.question_types_performance && (
                  <div className="bg-slate-900/40 rounded p-3">
                    <p className="text-xs font-semibold text-slate-400 mb-2">Thành tích theo loại câu hỏi:</p>
                    <div className="space-y-1 text-sm">
                      {Object.entries(passage.question_types_performance).map(([type, perf]: [string, any]) => (
                        <div key={type} className="flex justify-between text-slate-300">
                          <span className="capitalize">{type.replace(/_/g, ' ')}:</span>
                          <span>{perf}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {passage.key_issues && passage.key_issues.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-yellow-400 mb-1">Vấn đề chính:</p>
                    <ul className="space-y-1 text-sm text-slate-300">
                      {passage.key_issues.map((issue: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-yellow-400">•</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {passage.recommendations && passage.recommendations.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-400 mb-1">Khuyến nghị:</p>
                    <ul className="space-y-1 text-sm text-slate-300">
                      {passage.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-green-400">→</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Speaking Analysis */}
      {activeSkill === "speaking" && detailedAnalysis.speaking && (
        <div className="space-y-4">
          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-4">
            <h4 className="font-semibold text-slate-200 mb-2">Đánh giá tổng thể</h4>
            <p className="text-sm text-slate-300">{detailedAnalysis.speaking.overall_performance}</p>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Phân tích từng Part
            </h4>
            {detailedAnalysis.speaking.parts_analysis?.map((part: any, idx: number) => (
              <div key={idx} className="border border-slate-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-semibold text-slate-200">
                    Part {part.part}: {part.title}
                  </h5>
                </div>
                <p className="text-sm text-slate-300">{part.performance}</p>

                <div className="grid md:grid-cols-2 gap-3">
                  {part.fluency_level && (
                    <div className="bg-slate-900/40 rounded p-2">
                      <p className="text-xs text-slate-400">Độ trôi chảy</p>
                      <p className="text-sm text-slate-200">{part.fluency_level}</p>
                    </div>
                  )}
                  {part.vocabulary_usage && (
                    <div className="bg-slate-900/40 rounded p-2">
                      <p className="text-xs text-slate-400">Từ vựng</p>
                      <p className="text-sm text-slate-200">{part.vocabulary_usage}</p>
                    </div>
                  )}
                  {part.grammar_accuracy && (
                    <div className="bg-slate-900/40 rounded p-2">
                      <p className="text-xs text-slate-400">Ngữ pháp</p>
                      <p className="text-sm text-slate-200">{part.grammar_accuracy}</p>
                    </div>
                  )}
                  {part.coherence_level && (
                    <div className="bg-slate-900/40 rounded p-2">
                      <p className="text-xs text-slate-400">Mạch lạc</p>
                      <p className="text-sm text-slate-200">{part.coherence_level}</p>
                    </div>
                  )}
                  {part.idea_development && (
                    <div className="bg-slate-900/40 rounded p-2">
                      <p className="text-xs text-slate-400">Phát triển ý</p>
                      <p className="text-sm text-slate-200">{part.idea_development}</p>
                    </div>
                  )}
                  {part.time_management && (
                    <div className="bg-slate-900/40 rounded p-2">
                      <p className="text-xs text-slate-400">Quản lý thời gian</p>
                      <p className="text-sm text-slate-200">{part.time_management}</p>
                    </div>
                  )}
                  {part.analytical_thinking && (
                    <div className="bg-slate-900/40 rounded p-2">
                      <p className="text-xs text-slate-400">Tư duy phân tích</p>
                      <p className="text-sm text-slate-200">{part.analytical_thinking}</p>
                    </div>
                  )}
                  {part.complex_language && (
                    <div className="bg-slate-900/40 rounded p-2">
                      <p className="text-xs text-slate-400">Ngôn ngữ phức tạp</p>
                      <p className="text-sm text-slate-200">{part.complex_language}</p>
                    </div>
                  )}
                  {part.opinion_expression && (
                    <div className="bg-slate-900/40 rounded p-2">
                      <p className="text-xs text-slate-400">Diễn đạt quan điểm</p>
                      <p className="text-sm text-slate-200">{part.opinion_expression}</p>
                    </div>
                  )}
                </div>

                {part.key_issues && part.key_issues.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-yellow-400 mb-1">Vấn đề chính:</p>
                    <ul className="space-y-1 text-sm text-slate-300">
                      {part.key_issues.map((issue: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-yellow-400">•</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {part.recommendations && part.recommendations.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-400 mb-1">Khuyến nghị:</p>
                    <ul className="space-y-1 text-sm text-slate-300">
                      {part.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-green-400">→</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Writing Analysis */}
      {activeSkill === "writing" && detailedAnalysis.writing && (
        <div className="space-y-4">
          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-4">
            <h4 className="font-semibold text-slate-200 mb-2">Đánh giá tổng thể</h4>
            <p className="text-sm text-slate-300">{detailedAnalysis.writing.overall_performance}</p>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Phân tích từng Task
            </h4>
            {detailedAnalysis.writing.tasks_analysis?.map((task: any, idx: number) => (
              <div key={idx} className="border border-slate-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-semibold text-slate-200">
                    Task {task.task}: {task.title}
                  </h5>
                </div>
                <p className="text-sm text-slate-300">{task.performance}</p>

                <div className="grid md:grid-cols-2 gap-3">
                  {task.overview_quality && (
                    <div className="bg-slate-900/40 rounded p-2">
                      <p className="text-xs text-slate-400">Chất lượng tổng quan</p>
                      <p className="text-sm text-slate-200">{task.overview_quality}</p>
                    </div>
                  )}
                  {task.data_selection && (
                    <div className="bg-slate-900/40 rounded p-2">
                      <p className="text-xs text-slate-400">Chọn lọc dữ liệu</p>
                      <p className="text-sm text-slate-200">{task.data_selection}</p>
                    </div>
                  )}
                  {task.comparison_ability && (
                    <div className="bg-slate-900/40 rounded p-2">
                      <p className="text-xs text-slate-400">Khả năng so sánh</p>
                      <p className="text-sm text-slate-200">{task.comparison_ability}</p>
                    </div>
                  )}
                  {task.vocabulary_range && (
                    <div className="bg-slate-900/40 rounded p-2">
                      <p className="text-xs text-slate-400">Đa dạng từ vựng</p>
                      <p className="text-sm text-slate-200">{task.vocabulary_range}</p>
                    </div>
                  )}
                  {task.thesis_clarity && (
                    <div className="bg-slate-900/40 rounded p-2">
                      <p className="text-xs text-slate-400">Luận điểm rõ ràng</p>
                      <p className="text-sm text-slate-200">{task.thesis_clarity}</p>
                    </div>
                  )}
                  {task.argument_development && (
                    <div className="bg-slate-900/40 rounded p-2">
                      <p className="text-xs text-slate-400">Phát triển lập luận</p>
                      <p className="text-sm text-slate-200">{task.argument_development}</p>
                    </div>
                  )}
                  {task.paragraph_structure && (
                    <div className="bg-slate-900/40 rounded p-2">
                      <p className="text-xs text-slate-400">Cấu trúc đoạn văn</p>
                      <p className="text-sm text-slate-200">{task.paragraph_structure}</p>
                    </div>
                  )}
                  {task.conclusion_quality && (
                    <div className="bg-slate-900/40 rounded p-2">
                      <p className="text-xs text-slate-400">Chất lượng kết luận</p>
                      <p className="text-sm text-slate-200">{task.conclusion_quality}</p>
                    </div>
                  )}
                </div>

                {task.key_issues && task.key_issues.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-yellow-400 mb-1">Vấn đề chính:</p>
                    <ul className="space-y-1 text-sm text-slate-300">
                      {task.key_issues.map((issue: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-yellow-400">•</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {task.recommendations && task.recommendations.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-400 mb-1">Khuyến nghị:</p>
                    <ul className="space-y-1 text-sm text-slate-300">
                      {task.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-green-400">→</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StrengthsTab({ strengths }: { strengths: any }) {
  if (!strengths) return <p className="text-slate-400">No data available</p>;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-500/30 p-6">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center border border-emerald-500/30 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-emerald-400">
              {strengths.title}
            </h3>
          </div>
          <p className="text-base text-slate-300 leading-relaxed">
            {strengths.overall}
          </p>
        </div>
      </div>

      {/* Strengths by Skill */}
      {strengths.by_skill && strengths.by_skill.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {strengths.by_skill.map((item: any, idx: number) => (
            <div
              key={idx}
              className="group relative overflow-hidden border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-green-500/5 rounded-xl p-5 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300"
            >
              {/* Animated background */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:w-32 group-hover:h-32 transition-all duration-500"></div>

              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                    <span className="text-xl">
                      {item.skill === "listening" ? "🎧" :
                        item.skill === "reading" ? "📖" :
                          item.skill === "speaking" ? "🗣️" : "✍️"}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-emerald-400 capitalize">
                    {item.skill_name}
                  </h4>
                </div>

                <ul className="space-y-3">
                  {item.points?.map((point: string, pIdx: number) => (
                    <li key={pIdx} className="flex items-start gap-3 group/item">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center group-hover/item:bg-emerald-500/30 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                      <span className="text-sm text-slate-300 leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WeaknessesTab({ weaknesses }: { weaknesses: any }) {
  if (!weaknesses) return <p className="text-slate-400">No data available</p>;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/30 p-6">
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center border border-amber-500/30 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-amber-400">
              {weaknesses.title}
            </h3>
          </div>
          <p className="text-base text-slate-300 leading-relaxed">
            {weaknesses.overall}
          </p>
        </div>
      </div>

      {/* Weaknesses by Skill */}
      {weaknesses.by_skill && weaknesses.by_skill.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {weaknesses.by_skill.map((item: any, idx: number) => (
            <div
              key={idx}
              className="group relative overflow-hidden border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-yellow-500/5 rounded-xl p-5 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300"
            >
              {/* Animated background */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:w-32 group-hover:h-32 transition-all duration-500"></div>

              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                    <span className="text-xl">
                      {item.skill === "listening" ? "🎧" :
                        item.skill === "reading" ? "📖" :
                          item.skill === "speaking" ? "🗣️" : "✍️"}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-amber-400 capitalize">
                    {item.skill_name}
                  </h4>
                </div>

                <ul className="space-y-3">
                  {item.points?.map((point: string, pIdx: number) => (
                    <li key={pIdx} className="flex items-start gap-3 group/item">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center group-hover/item:bg-amber-500/30 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                      <span className="text-sm text-slate-300 leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Motivational Message */}
      <div className="flex items-start gap-4 p-5 bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-xl">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center border border-primary-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-200 mb-1">💡 Remember</p>
          <p className="text-sm text-slate-400 leading-relaxed">
            Every weakness is an opportunity for improvement. With consistent practice and the right strategy, you can turn these areas into strengths.
          </p>
        </div>
      </div>
    </div>
  );
}

function RoadmapTab({ roadmap }: { roadmap: any }) {
  if (!roadmap) return <p className="text-slate-400">No roadmap available</p>;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/5 border border-purple-500/30 p-6">
        <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-purple-500/30 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-purple-400">
              {roadmap.title}
            </h3>
          </div>
          <p className="text-base text-slate-300 leading-relaxed">
            {roadmap.introduction}
          </p>
        </div>
      </div>

      {/* Priority Areas */}
      {roadmap.priority_areas && roadmap.priority_areas.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center border border-primary-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-slate-200">
              Priority Focus Areas
            </h4>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {roadmap.priority_areas.map((area: any, idx: number) => (
              <div
                key={idx}
                className="group relative overflow-hidden border border-primary-500/30 bg-gradient-to-br from-primary-500/10 to-primary-600/5 rounded-xl p-5 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/10 transition-all duration-300"
              >
                {/* Priority Badge */}
                <div className="absolute top-4 right-4">
                  <div className="w-10 h-10 rounded-full bg-primary-500/20 border-2 border-primary-500/50 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-300">#{area.priority}</span>
                  </div>
                </div>

                <div>
                  <h5 className="text-lg font-bold text-primary-300 mb-3">
                    {area.skill}
                  </h5>

                  {/* Progress Indicator */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-slate-400">{area.current_band}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      <span className="text-2xl font-bold text-primary-400">{area.target_band}</span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 leading-relaxed">
                    {area.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Learning Phases - Timeline Style */}
      {roadmap.phases && roadmap.phases.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-slate-200">
              Learning Journey
            </h4>
          </div>

          <div className="relative space-y-6">
            {/* Vertical Timeline Line */}
            <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-primary-500"></div>

            {roadmap.phases.map((phase: any, idx: number) => (
              <div key={idx} className="relative pl-16">
                {/* Phase Number Circle */}
                <div className="absolute left-0 top-0 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-2 border-blue-500/50 flex items-center justify-center shadow-lg z-10">
                  <span className="text-lg font-bold text-blue-400">0{phase.phase}</span>
                </div>

                {/* Phase Content Card */}
                <div className="group border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-6 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-lg font-bold text-slate-200">{phase.title}</h5>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs font-semibold text-blue-300">{phase.duration}</span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 mb-4 leading-relaxed">{phase.focus}</p>

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Goals */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Goals</p>
                      </div>
                      <ul className="space-y-2">
                        {phase.goals?.map((goal: string, gIdx: number) => (
                          <li key={gIdx} className="flex items-start gap-2 group/item">
                            <span className="flex-shrink-0 mt-0.5 text-emerald-400">•</span>
                            <span className="text-sm text-slate-300">{goal}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Activities */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Activities</p>
                      </div>
                      <ul className="space-y-2">
                        {phase.activities?.map((activity: string, aIdx: number) => (
                          <li key={aIdx} className="flex items-start gap-2 group/item">
                            <span className="flex-shrink-0 mt-0.5 text-primary-400">→</span>
                            <span className="text-sm text-slate-300">{activity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Practice - Premium Card */}
      {roadmap.daily_practice && (
        <div className="relative overflow-hidden border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-green-500/5 rounded-xl p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-emerald-400">
                {roadmap.daily_practice.title}
              </h4>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {roadmap.daily_practice.recommendations?.map((rec: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-900/40 rounded-lg border border-emerald-500/20">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-sm text-slate-300">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Resources - Grid Cards */}
      {roadmap.resources && roadmap.resources.categories && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-slate-200">
              {roadmap.resources.title}
            </h4>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {roadmap.resources.categories.map((cat: any, idx: number) => (
              <div
                key={idx}
                className="border border-slate-700/50 bg-slate-800/30 rounded-xl p-5 hover:border-amber-500/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">
                    {cat.category === "Listening" ? "🎧" :
                      cat.category === "Reading" ? "📖" :
                        cat.category === "Speaking" ? "🗣️" : "✍️"}
                  </span>
                  <h5 className="font-bold text-slate-200">{cat.category}</h5>
                </div>
                <ul className="space-y-2">
                  {cat.items?.map((item: string, iIdx: number) => (
                    <li key={iIdx} className="flex items-start gap-2 text-sm text-slate-400">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline & Motivation - Premium Footer */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary-500/10 via-purple-500/10 to-blue-500/10 border border-primary-500/30 p-6">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative space-y-4">
          {roadmap.estimated_timeline && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center border border-primary-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Estimated Timeline</p>
                <p className="text-base font-bold text-slate-200">{roadmap.estimated_timeline}</p>
              </div>
            </div>
          )}

          {roadmap.motivation && (
            <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-slate-900/60 to-slate-800/60 border border-primary-500/20 rounded-lg">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center border border-primary-500/30">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-1">Motivation</p>
                <p className="text-sm text-slate-300 leading-relaxed italic">
                  "{roadmap.motivation}"
                </p>
              </div>
            </div>)}
        </div>
      </div>
    </div>
  );
}


