"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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

export default function PreviewPage() {
  const params = useParams();
  const surveyId = params.surveyId as string;
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/surveys/${surveyId}`);
      const json = await res.json();
      if (json.success) setSurvey(json.data);
      setLoading(false);
    }
    load();
  }, [surveyId]);

  if (loading) return <div className="text-center py-12 text-gray-500">加载中...</div>;
  if (!survey) return <div className="text-center py-12 text-red-500">问卷不存在</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6 flex items-center justify-between">
        <span className="text-sm text-yellow-700">预览模式 - 此页面仅供预览，无法提交</span>
        <Link
          href={`/admin/surveys/${surveyId}`}
          className="text-sm text-indigo-600 hover:underline"
        >
          返回编辑
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">{survey.title}</h1>
        {survey.description && (
          <p className="text-gray-600">{survey.description}</p>
        )}
      </div>

      <div className="space-y-4">
        {survey.questions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border">
            <p className="text-gray-500">暂无题目</p>
          </div>
        ) : (
          survey.questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-start gap-2 mb-4">
                <span className="text-sm text-gray-400 mt-0.5">{idx + 1}.</span>
                <p className="font-medium">
                  {q.title}
                  {q.required && <span className="text-red-500 ml-1">*</span>}
                </p>
              </div>

              {q.type === "single_choice" && (
                <div className="space-y-2 ml-5">
                  {q.options.map((opt) => (
                    <label key={opt.id} className="flex items-center gap-3 p-2 rounded-lg">
                      <input type="radio" disabled className="w-4 h-4" />
                      <span className="text-sm">{opt.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === "multiple_choice" && (
                <div className="space-y-2 ml-5">
                  {q.options.map((opt) => (
                    <label key={opt.id} className="flex items-center gap-3 p-2 rounded-lg">
                      <input type="checkbox" disabled className="w-4 h-4 rounded" />
                      <span className="text-sm">{opt.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === "text" && (
                <div className="ml-5">
                  <input
                    type="text"
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    placeholder="请输入回答"
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="flex justify-center pt-6">
        <button
          disabled
          className="px-8 py-3 bg-gray-400 text-white rounded-lg font-medium cursor-not-allowed"
        >
          提交问卷（预览模式）
        </button>
      </div>
    </div>
  );
}
