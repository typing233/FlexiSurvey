"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface QuestionOption {
  id: string;
  text: string;
}

interface Question {
  id: string;
  type: string;
  title: string;
  required: boolean;
  options: QuestionOption[];
}

interface Survey {
  id: string;
  title: string;
  description: string;
  status: string;
  questions: Question[];
}

export default function SurveyFillPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.surveyId as string;
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/surveys/${surveyId}`);
      const json = await res.json();
      if (json.success && json.data.status === "published") {
        setSurvey(json.data);
      }
      setLoading(false);
    }
    load();
  }, [surveyId]);

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setErrors((prev) => ({ ...prev, [questionId]: "" }));
  }

  function toggleMultiChoice(questionId: string, optionId: string) {
    setAnswers((prev) => {
      const current = prev[questionId] ? JSON.parse(prev[questionId]) : [];
      const updated = current.includes(optionId)
        ? current.filter((id: string) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [questionId]: JSON.stringify(updated) };
    });
    setErrors((prev) => ({ ...prev, [questionId]: "" }));
  }

  function validate(): boolean {
    if (!survey) return false;
    const newErrors: Record<string, string> = {};
    for (const q of survey.questions) {
      if (!q.required) continue;
      const val = answers[q.id];
      if (q.type === "text") {
        if (!val || val.trim() === "") {
          newErrors[q.id] = "此题为必填项";
        }
      } else if (q.type === "single_choice") {
        if (!val) {
          newErrors[q.id] = "请选择一个选项";
        }
      } else if (q.type === "multiple_choice") {
        if (!val || val === "[]") {
          newErrors[q.id] = "请至少选择一个选项";
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !survey) return;
    setSubmitting(true);

    const formattedAnswers = survey.questions
      .filter((q) => answers[q.id])
      .map((q) => ({
        questionId: q.id,
        value: answers[q.id],
      }));

    const res = await fetch(`/api/surveys/${surveyId}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: formattedAnswers }),
    });

    const json = await res.json();
    if (json.success) {
      router.push(`/s/${surveyId}/success`);
    } else {
      alert(json.error || "提交失败，请重试");
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">问卷不存在或已关闭</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">{survey.title}</h1>
          {survey.description && (
            <p className="text-gray-600">{survey.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {survey.questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-start gap-2 mb-4">
                <span className="text-sm text-gray-400 mt-0.5">{idx + 1}.</span>
                <div className="flex-1">
                  <p className="font-medium">
                    {q.title}
                    {q.required && <span className="text-red-500 ml-1">*</span>}
                  </p>
                </div>
              </div>

              {q.type === "single_choice" && (
                <div className="space-y-2 ml-5">
                  {q.options.map((opt) => (
                    <label
                      key={opt.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={opt.id}
                        checked={answers[q.id] === JSON.stringify(opt.id)}
                        onChange={() => setAnswer(q.id, JSON.stringify(opt.id))}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <span className="text-sm">{opt.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === "multiple_choice" && (
                <div className="space-y-2 ml-5">
                  {q.options.map((opt) => {
                    const selected = answers[q.id]
                      ? JSON.parse(answers[q.id]).includes(opt.id)
                      : false;
                    return (
                      <label
                        key={opt.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleMultiChoice(q.id, opt.id)}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className="text-sm">{opt.text}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {q.type === "text" && (
                <div className="ml-5">
                  <input
                    type="text"
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="请输入回答"
                  />
                </div>
              )}

              {errors[q.id] && (
                <p className="text-red-500 text-sm mt-2 ml-5">{errors[q.id]}</p>
              )}
            </div>
          ))}

          <div className="flex justify-center pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition"
            >
              {submitting ? "提交中..." : "提交问卷"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
