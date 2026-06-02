"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QUESTION_TYPE_LABELS } from "@/lib/constants";

interface OptionStat {
  optionId: string;
  text: string;
  count: number;
}

interface QuestionStat {
  questionId: string;
  title: string;
  type: string;
  totalAnswers: number;
  distribution?: OptionStat[];
  answers?: string[];
}

export default function ResultsPage() {
  const params = useParams();
  const surveyId = params.surveyId as string;
  const [stats, setStats] = useState<QuestionStat[]>([]);
  const [totalResponses, setTotalResponses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"stats" | "raw">("stats");
  const [responses, setResponses] = useState<unknown[]>([]);
  const [rawLoading, setRawLoading] = useState(false);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/surveys/${surveyId}/stats`);
      const json = await res.json();
      if (json.success) {
        setStats(json.data.stats);
        setTotalResponses(json.data.totalResponses);
      }
      setLoading(false);
    }
    load();
  }, [surveyId]);

  async function loadRawResponses() {
    if (responses.length > 0) return;
    setRawLoading(true);
    const res = await fetch(`/api/surveys/${surveyId}/responses?limit=100`);
    const json = await res.json();
    if (json.success) {
      setResponses(json.data.responses);
    }
    setRawLoading(false);
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">问卷结果</h1>
          <p className="text-sm text-gray-500 mt-1">共收到 {totalResponses} 份回答</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowExport(true)}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            导出数据
          </button>
          <Link
            href={`/admin/surveys/${surveyId}`}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            返回编辑
          </Link>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("stats")}
          className={`px-4 py-2 text-sm rounded-lg transition ${
            tab === "stats"
              ? "bg-indigo-600 text-white"
              : "bg-white border border-gray-300 hover:bg-gray-50"
          }`}
        >
          统计概览
        </button>
        <button
          onClick={() => { setTab("raw"); loadRawResponses(); }}
          className={`px-4 py-2 text-sm rounded-lg transition ${
            tab === "raw"
              ? "bg-indigo-600 text-white"
              : "bg-white border border-gray-300 hover:bg-gray-50"
          }`}
        >
          原始数据
        </button>
      </div>

      {tab === "stats" && (
        <div className="space-y-6">
          {stats.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <p className="text-gray-500">暂无数据</p>
            </div>
          ) : (
            stats.map((q, idx) => (
              <div key={q.questionId} className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm text-gray-400">Q{idx + 1}</span>
                  <span className="px-1.5 py-0.5 text-xs bg-indigo-50 text-indigo-600 rounded">
                    {QUESTION_TYPE_LABELS[q.type]}
                  </span>
                  <span className="text-sm text-gray-400">({q.totalAnswers} 条回答)</span>
                </div>
                <p className="font-medium mb-4">{q.title}</p>

                {q.type === "text" ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {q.answers && q.answers.length > 0 ? (
                      q.answers.map((answer, i) => (
                        <div
                          key={i}
                          className="px-3 py-2 bg-gray-50 rounded text-sm text-gray-700"
                        >
                          {answer}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400">暂无回答</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {q.distribution?.map((opt) => {
                      const pct =
                        q.totalAnswers > 0
                          ? Math.round((opt.count / q.totalAnswers) * 100)
                          : 0;
                      return (
                        <div key={opt.optionId}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>{opt.text}</span>
                            <span className="text-gray-500">
                              {opt.count} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "raw" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {rawLoading ? (
            <div className="text-center py-12 text-gray-500">加载中...</div>
          ) : responses.length === 0 ? (
            <div className="text-center py-12 text-gray-500">暂无回答</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">#</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">提交时间</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">匿名标识</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">回答详情</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {responses.map((resp: any, idx: number) => (
                    <tr key={resp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        {new Date(resp.submittedAt).toLocaleString("zh-CN")}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {resp.respondent.substring(0, 8)}...
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {resp.answers.map((a: any) => (
                            <div key={a.id} className="text-xs">
                              <span className="text-gray-500">{a.question.title}:</span>{" "}
                              <span className="font-medium">{formatAnswer(a.value, a.question.type, a.question.options)}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showExport && (
        <ExportModal
          surveyId={surveyId}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}

function ExportModal({ surveyId, onClose }: { surveyId: string; onClose: () => void }) {
  const [format, setFormat] = useState<"csv" | "xlsx">("xlsx");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<"" | "complete" | "partial">("");
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    const params = new URLSearchParams();
    params.set("format", format);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (status) params.set("status", status);

    const url = `/api/surveys/${surveyId}/export?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
      alert("导出失败");
      setExporting(false);
      return;
    }

    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `responses.${format === "xlsx" ? "xlsx" : "csv"}`;
    a.click();
    URL.revokeObjectURL(a.href);
    setExporting(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4">导出数据</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">导出格式</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  checked={format === "xlsx"}
                  onChange={() => setFormat("xlsx")}
                  className="w-4 h-4 text-indigo-600"
                />
                <span className="text-sm">Excel (.xlsx)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  checked={format === "csv"}
                  onChange={() => setFormat("csv")}
                  className="w-4 h-4 text-indigo-600"
                />
                <span className="text-sm">CSV (.csv)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">时间范围（可选）</label>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <span className="text-gray-400 text-sm">至</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">完成状态</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "" | "complete" | "partial")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">全部</option>
              <option value="complete">完整回答（回答了所有题目）</option>
              <option value="partial">部分回答（有跳过的题目）</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-4 mt-4 border-t">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {exporting ? "导出中..." : "开始导出"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

function formatAnswer(value: string, type: string, options: { id: string; text: string }[]): string {
  if (type === "text") return value;
  try {
    const parsed = JSON.parse(value);
    if (type === "single_choice") {
      const opt = options.find((o) => o.id === parsed);
      return opt ? opt.text : value;
    }
    if (type === "multiple_choice" && Array.isArray(parsed)) {
      const texts = parsed
        .map((id: string) => options.find((o) => o.id === id)?.text)
        .filter(Boolean);
      return texts.join("、") || value;
    }
    return value;
  } catch {
    return value;
  }
}
