"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "../utils/api";
import { TrendingUp, User, Wallet, Check, AlertCircle } from "lucide-react";

const OBJECTIVES = [
  "Wealth Creation",
  "Retirement Planning",
  "Tax Saving",
  "Emergency Fund",
  "Short-Term Trading",
  "Learning Basics",
];

const QUESTIONS = [
  {
    question: "How would you react if your portfolio lost 15% in a single week due to a market correction?",
    options: [
      { text: "Sell everything immediately to prevent further losses.", value: "Conservative" },
      { text: "Hold my investments and wait for the market to recover.", value: "Moderate" },
      { text: "Buy more shares at the lower price to lower my average cost.", value: "Aggressive" }
    ]
  },
  {
    question: "What is your primary investment objective?",
    options: [
      { text: "Capital preservation; keeping my money 100% safe.", value: "Conservative" },
      { text: "Steady capital growth over the long run with moderate fluctuations.", value: "Moderate" },
      { text: "Maximize returns; willing to take high risks for high gains.", value: "Aggressive" }
    ]
  },
  {
    question: "For how long do you plan to keep your simulated funds invested?",
    options: [
      { text: "Less than 1 year.", value: "Conservative" },
      { text: "1 to 5 years.", value: "Moderate" },
      { text: "More than 5 years.", value: "Aggressive" }
    ]
  },
  {
    question: "What is your level of experience in stock market investing?",
    options: [
      { text: "Total Beginner; I've never invested in stocks before.", value: "Conservative" },
      { text: "Intermediate; I understand basic concepts and mutual funds.", value: "Moderate" },
      { text: "Advanced; I have traded individual stocks or derivatives.", value: "Aggressive" }
    ]
  },
  {
    question: "Which of these virtual portfolio allocations sounds most appealing to you?",
    options: [
      { text: "80% Fixed Deposits & Debt, 20% Blue-Chip Stocks.", value: "Conservative" },
      { text: "50% Index Mutual Funds, 30% Individual Stocks, 20% Gold.", value: "Moderate" },
      { text: "80% Growth/Mid-Cap Stocks, 20% Speculative Trades.", value: "Aggressive" }
    ]
  }
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("Student");
  const [annualSalary, setAnnualSalary] = useState<number>(0);
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<string[]>(Array(5).fill(""));
  const [startingCapital, setStartingCapital] = useState<number>(1000000); // 10 Lakhs default
  const [isCustomCapital, setIsCustomCapital] = useState(false);
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Validate authentication on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  const handleObjectiveToggle = (obj: string) => {
    if (selectedObjectives.includes(obj)) {
      setSelectedObjectives(selectedObjectives.filter(o => o !== obj));
    } else {
      setSelectedObjectives([...selectedObjectives, obj]);
    }
  };

  const handleAnswerSelect = (qIdx: number, val: string) => {
    const updated = [...quizAnswers];
    updated[qIdx] = val;
    setQuizAnswers(updated);
  };

  const calculateRiskAppetite = () => {
    const counts = { Conservative: 0, Moderate: 0, Aggressive: 0 };
    quizAnswers.forEach(ans => {
      if (ans === "Conservative") counts.Conservative++;
      else if (ans === "Moderate") counts.Moderate++;
      else if (ans === "Aggressive") counts.Aggressive++;
    });

    if (counts.Aggressive >= 3) return "Aggressive";
    if (counts.Conservative >= 3) return "Conservative";
    return "Moderate";
  };

  const handleNextStep = () => {
    setError("");
    if (step === 1) {
      if (!fullName.trim()) {
        setError("Please enter your full name.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (selectedObjectives.length === 0) {
        setError("Please select at least one financial objective.");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (quizAnswers.some(ans => !ans)) {
        setError("Please answer all risk quiz questions.");
        return;
      }
      setStep(4);
    } else if (step === 4) {
      if (startingCapital < 10000 || startingCapital > 1000000000) {
        setError("Custom capital must be between ₹10,000 and ₹100 Crores.");
        return;
      }
    }
  };

  const handlePrevStep = () => {
    setError("");
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    const riskAppetite = calculateRiskAppetite();
    
    try {
      await api.submitOnboarding({
        full_name: fullName,
        employment_status: employmentStatus,
        annual_salary: Number(annualSalary),
        financial_objectives: selectedObjectives,
        risk_appetite: riskAppetite,
        starting_capital: startingCapital
      });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to complete onboarding. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${val / 10000000} Crore`;
    return `₹${val / 100000} Lakh`;
  };

  return (
    <main className="min-h-screen bg-[#050814] py-12 px-4 relative overflow-hidden flex items-center justify-center">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-900/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-emerald-950/5 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-2xl bg-[#111827] border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10">
        
        {/* Step Progress Indicator */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800/80">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold border ${
                step >= s 
                  ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20" 
                  : "bg-slate-900 border-slate-800 text-slate-500"
              }`}>
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 4 && (
                <div className={`h-[2px] w-12 sm:w-20 mx-2 ${
                  step > s ? "bg-blue-600" : "bg-slate-800"
                }`}></div>
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl mb-6 flex items-start">
            <AlertCircle className="h-5 w-5 mr-3 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Basic Information */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-500" /> Basic Information
              </h2>
              <p className="text-slate-400 text-sm mt-1">Let us know a bit about you to customize your investment learning track.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 bg-[#0a0f1d] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Employment Status</label>
                <select
                  value={employmentStatus}
                  onChange={(e) => setEmploymentStatus(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0a0f1d] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                >
                  <option value="Student">Student</option>
                  <option value="Salaried">Salaried</option>
                  <option value="Self-Employed">Self-Employed</option>
                  <option value="Unemployed">Unemployed</option>
                </select>
              </div>

              {employmentStatus !== "Student" && employmentStatus !== "Unemployed" && (
                <div>
                  <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Annual Salary (INR)</label>
                  <input
                    type="number"
                    value={annualSalary || ""}
                    onChange={(e) => setAnnualSalary(Number(e.target.value))}
                    placeholder="e.g. 600000"
                    className="w-full px-4 py-3 bg-[#0a0f1d] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Financial Objectives */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-500" /> Financial Objectives
              </h2>
              <p className="text-slate-400 text-sm mt-1">Select your primary financial goals (choose all that apply).</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {OBJECTIVES.map((obj) => {
                const isSelected = selectedObjectives.includes(obj);
                return (
                  <button
                    key={obj}
                    type="button"
                    onClick={() => handleObjectiveToggle(obj)}
                    className={`p-4 rounded-xl border text-left transition flex items-center justify-between ${
                      isSelected 
                        ? "bg-blue-600/10 border-blue-500 text-white" 
                        : "bg-[#0a0f1d] border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <span className="font-medium text-sm">{obj}</span>
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center border ${
                      isSelected ? "bg-blue-600 border-blue-500" : "border-slate-700"
                    }`}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: Risk Quiz */}
        {step === 3 && (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-blue-500" /> Risk Appetite Quiz
              </h2>
              <p className="text-slate-400 text-sm mt-1">Answer these 5 quick scenarios to evaluate your risk profile.</p>
            </div>

            <div className="space-y-6">
              {QUESTIONS.map((q, qIdx) => (
                <div key={qIdx} className="space-y-3 bg-[#0a0f1d] p-4 rounded-xl border border-slate-800/80">
                  <h4 className="text-sm font-semibold text-slate-200">
                    {qIdx + 1}. {q.question}
                  </h4>
                  <div className="space-y-2">
                    {q.options.map((opt, oIdx) => {
                      const isSelected = quizAnswers[qIdx] === opt.value;
                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => handleAnswerSelect(qIdx, opt.value)}
                          className={`w-full p-3 rounded-lg border text-left text-xs transition flex items-center ${
                            isSelected
                              ? "bg-blue-600/20 border-blue-500 text-white"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-750"
                          }`}
                        >
                          <div className={`h-4 w-4 rounded-full border mr-3 flex items-center justify-center ${
                            isSelected ? "border-blue-500 bg-blue-600" : "border-slate-700"
                          }`}>
                            {isSelected && <div className="h-2 w-2 rounded-full bg-white"></div>}
                          </div>
                          <span>{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Starting Capital & Review */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center">
                <Wallet className="h-5 w-5 mr-2 text-blue-500" /> Starting Virtual Capital
              </h2>
              <p className="text-slate-400 text-sm mt-1">Choose the size of your virtual risk-free starting capital.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1000000, 5000000, 10000000].map((cap) => {
                const isSelected = startingCapital === cap && !isCustomCapital;
                return (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => { setStartingCapital(cap); setIsCustomCapital(false); }}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                      isSelected 
                        ? "bg-blue-600/10 border-blue-500 text-white ring-1 ring-blue-500" 
                        : "bg-[#0a0f1d] border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <span className="text-sm font-bold text-white">{formatINR(cap)}</span>
                    <span className="text-[9px] uppercase text-slate-500 tracking-wider mt-1">Preset</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setIsCustomCapital(true)}
                className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                  isCustomCapital 
                    ? "bg-blue-600/10 border-blue-500 text-white ring-1 ring-blue-500" 
                    : "bg-[#0a0f1d] border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <span className="text-sm font-bold text-white">Custom</span>
                <span className="text-[9px] uppercase text-slate-500 tracking-wider mt-1">Enter Amount</span>
              </button>
            </div>

            {isCustomCapital && (
              <div className="animate-pop-in mt-4">
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Enter Custom Capital (INR)</label>
                <input
                  type="number"
                  value={startingCapital || ""}
                  onChange={(e) => setStartingCapital(Number(e.target.value))}
                  placeholder="e.g. 150000"
                  min={10000}
                  max={1000000000}
                  className="w-full px-4 py-3 bg-[#0a0f1d] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-mono"
                />
                <p className="text-xs text-slate-500 mt-2">Min: ₹10,000 | Max: ₹100 Crores</p>
              </div>
            )}

            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-4">
              <h4 className="text-sm font-semibold text-white">Summary of your Investor Profile</h4>
              
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Full Name:</span>
                  <span className="text-slate-200 font-medium">{fullName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Employment:</span>
                  <span className="text-slate-200 font-medium">{employmentStatus}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Risk Profile:</span>
                  <span className="text-blue-400 font-semibold uppercase">{calculateRiskAppetite()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Starting Capital:</span>
                  <span className="text-emerald-400 font-semibold">{startingCapital.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-850">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl border border-slate-800 transition"
            >
              Back
            </button>
          ) : (
            <div></div>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition shadow-lg shadow-blue-500/10"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition shadow-lg shadow-emerald-500/10 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Initializing Simulator..." : "Launch Simulator"}
            </button>
          )}
        </div>

      </div>
    </main>
  );
}
