"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SURVEY_STATUS_LABELS } from "@/lib/constants";

interface Survey {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  _count: { questions: number; responses: number };
}

export default function SurveyListPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSurveys();
  }, []);

  async function fetchSurveys() {
    const res = await fetch("/api/surveys");
    const json = await res.json();
    if (json.success) setSurveys(json.data);
    setLoading(false);
  }

  async function deleteSurvey(id: string) {
    if (!confirm("确定要删除此问卷吗？")) return;
    await fetch(`/api/surveys/${id}`, { method: "DELETE" });
    fetchSurveys();
  }

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    published: "bg-green-100 text-green-700",
    closed: "bg-red-100 text-red-700",
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">问卷管理</h1>
        <Link
          href="/admin/surveys/new"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          创建问卷
        </Link>
      </div>

      {surveys.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">暂无问卷，点击上方按钮创建第一份问卷</p>
        </div>
      ) : (
        <div className="space-y-4">
          {surveys.map((survey) => (
            <div
              key={survey.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/admin/surveys/${survey.id}`}
                      className="text-lg font-medium hover:text-indigo-600"
                    >
                      {survey.title}
                    </Link>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${statusColors[survey.status]}`}
                    >
                      {SURVEY_STATUS_LABELS[survey.status]}
                    </span>
                  </div>
                  {survey.description && (
                    <p className="text-sm text-gray-500 mb-2">{survey.description}</p>
                  )}
                  <div className="flex gap-4 text-sm text-gray-400">
                    <span>{survey._count.questions} 道题目</span>
                    <span>{survey._count.responses} 份回答</span>
                    <span>
                      创建于 {new Date(survey.createdAt).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Link
                    href={`/admin/surveys/${survey.id}`}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    编辑
                  </Link>
                  {survey.status === "published" && (
                    <Link
                      href={`/s/${survey.id}`}
                      className="px-3 py-1 text-sm border border-indigo-300 text-indigo-600 rounded hover:bg-indigo-50"
                    >
                      填写链接
                    </Link>
                  )}
                  <Link
                    href={`/admin/surveys/${survey.id}/results`}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    结果
                  </Link>
                  <button
                    onClick={() => deleteSurvey(survey.id)}
                    className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
