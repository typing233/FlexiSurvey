"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { QUESTION_TYPE_LABELS, SURVEY_STATUS_LABELS } from "@/lib/constants";

interface QuestionOption {
  id: string;
  text: string;
  order: number;
}

interface JumpRule {
  id: string;
  optionId: string;
  targetQuestionId: string;
}

interface Question {
  id: string;
  type: string;
  title: string;
  required: boolean;
  order: number;
  options: QuestionOption[];
  jumpRules: JumpRule[];
}

interface Survey {
  id: string;
  title: string;
  description: string;
  status: string;
  isPublic: boolean;
  maxResponses: number | null;
  questions: Question[];
  _count: { responses: number };
}

export default function SurveyEditPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.surveyId as string;
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showJumpRules, setShowJumpRules] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const fetchSurvey = useCallback(async () => {
    const res = await fetch(`/api/surveys/${surveyId}`);
    const json = await res.json();
    if (json.success) {
      setSurvey(json.data);
      setTitle(json.data.title);
      setDescription(json.data.description);
    }
    setLoading(false);
  }, [surveyId]);

  useEffect(() => {
    fetchSurvey();
  }, [fetchSurvey]);

  async function updateSurvey() {
    await fetch(`/api/surveys/${surveyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    setEditing(false);
    fetchSurvey();
  }

  async function publishSurvey() {
    const res = await fetch(`/api/surveys/${surveyId}/publish`, { method: "POST" });
    const json = await res.json();
    if (!json.success) {
      alert(json.error);
      return;
    }
    fetchSurvey();
  }

  async function closeSurvey() {
    if (!confirm("关闭后将无法再收集回答，确定吗？")) return;
    await fetch(`/api/surveys/${surveyId}/close`, { method: "POST" });
    fetchSurvey();
  }

  async function deleteQuestion(questionId: string) {
    const q = survey?.questions.find((qq) => qq.id === questionId);
    const hasTargetingRules = survey?.questions.some(
      (qq) => qq.jumpRules.some((r) => r.targetQuestionId === questionId)
    );
    const msg = hasTargetingRules
      ? "该题目被其他题目的跳转规则引用，删除后相关规则将被自动清除。确定删除？"
      : "确定删除此题目？";
    if (!confirm(msg)) return;
    await fetch(`/api/surveys/${surveyId}/questions/${questionId}`, { method: "DELETE" });
    fetchSurvey();
  }

  async function moveQuestion(questionId: string, direction: "up" | "down") {
    if (!survey) return;
    const questions = [...survey.questions];
    const idx = questions.findIndex((q) => q.id === questionId);
    if (direction === "up" && idx > 0) {
      [questions[idx], questions[idx - 1]] = [questions[idx - 1], questions[idx]];
    } else if (direction === "down" && idx < questions.length - 1) {
      [questions[idx], questions[idx + 1]] = [questions[idx + 1], questions[idx]];
    } else return;

    const res = await fetch(`/api/surveys/${surveyId}/questions/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: questions.map((q) => q.id) }),
    });
    const json = await res.json();
    if (json.invalidatedRules > 0) {
      alert(`排序已更新，${json.invalidatedRules} 条跳转规则因顺序冲突已被自动清除，请检查。`);
    }
    fetchSurvey();
  }

  if (loading) return <div className="text-center py-12 text-gray-500">加载中...</div>;
  if (!survey) return <div className="text-center py-12 text-red-500">问卷不存在</div>;

  const isDraft = survey.status === "draft";

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{survey.title}</h1>
          <span
            className={`px-2 py-0.5 text-xs rounded-full ${
              survey.status === "draft"
                ? "bg-gray-100 text-gray-700"
                : survey.status === "published"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {SURVEY_STATUS_LABELS[survey.status]}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            设置
          </button>
          <Link
            href={`/admin/surveys/${surveyId}/preview`}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            预览
          </Link>
          {isDraft && (
            <button
              onClick={publishSurvey}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              发布问卷
            </button>
          )}
          {survey.status === "published" && (
            <>
              <button
                onClick={closeSurvey}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                关闭问卷
              </button>
              <Link
                href={`/s/${surveyId}`}
                className="px-3 py-1.5 text-sm border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50"
              >
                填写链接
              </Link>
            </>
          )}
          <Link
            href={`/admin/surveys/${surveyId}/results`}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            查看结果 ({survey._count.responses})
          </Link>
        </div>
      </div>

      {/* Survey Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        {editing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                onClick={updateSurvey}
                className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                保存
              </button>
              <button
                onClick={() => { setEditing(false); setTitle(survey.title); setDescription(survey.description); }}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">
                {survey.description || "暂无描述"}
              </p>
              <div className="flex gap-4 mt-2 text-xs text-gray-400">
                <span>{survey.isPublic ? "公开访问" : "未公开"}</span>
                <span>{survey.maxResponses ? `收集上限: ${survey.maxResponses}` : "无收集上限"}</span>
              </div>
            </div>
            {isDraft && (
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-indigo-600 hover:underline"
              >
                编辑信息
              </button>
            )}
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">题目列表</h2>
        {isDraft && (
          <button
            onClick={() => { setShowQuestionForm(true); setEditingQuestion(null); }}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            添加题目
          </button>
        )}
      </div>

      {survey.questions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">暂无题目，点击「添加题目」开始编辑</p>
        </div>
      ) : (
        <div className="space-y-3">
          {survey.questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-gray-400">Q{idx + 1}</span>
                    <span className="px-1.5 py-0.5 text-xs bg-indigo-50 text-indigo-600 rounded">
                      {QUESTION_TYPE_LABELS[q.type]}
                    </span>
                    {q.required && (
                      <span className="text-red-500 text-xs">必填</span>
                    )}
                    {q.jumpRules.length > 0 && (
                      <span className="px-1.5 py-0.5 text-xs bg-amber-50 text-amber-600 rounded">
                        有跳转规则
                      </span>
                    )}
                  </div>
                  <p className="font-medium">{q.title}</p>
                  {q.options.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {q.options.map((opt) => (
                        <div key={opt.id} className="text-sm text-gray-600 flex items-center gap-2">
                          <span className="w-3 h-3 border border-gray-300 rounded-sm inline-block flex-shrink-0" />
                          {opt.text}
                          {q.jumpRules.find((r) => r.optionId === opt.id) && (
                            <span className="text-xs text-amber-500">
                              → 跳至 Q{survey.questions.findIndex((qq) => qq.id === q.jumpRules.find((r) => r.optionId === opt.id)?.targetQuestionId) + 1}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {isDraft && (
                  <div className="flex gap-1 ml-4">
                    {(q.type === "single_choice") && (
                      <button
                        onClick={() => setShowJumpRules(q.id)}
                        className="px-2 py-1 text-xs border border-amber-200 text-amber-600 rounded hover:bg-amber-50"
                      >
                        跳转
                      </button>
                    )}
                    <button
                      onClick={() => moveQuestion(q.id, "up")}
                      disabled={idx === 0}
                      className="px-2 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveQuestion(q.id, "down")}
                      disabled={idx === survey.questions.length - 1}
                      className="px-2 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => { setEditingQuestion(q); setShowQuestionForm(true); }}
                      className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => deleteQuestion(q.id)}
                      className="px-2 py-1 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50"
                    >
                      删除
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Question Form Modal */}
      {showQuestionForm && (
        <QuestionFormModal
          surveyId={surveyId}
          question={editingQuestion}
          onClose={() => { setShowQuestionForm(false); setEditingQuestion(null); }}
          onSaved={() => { setShowQuestionForm(false); setEditingQuestion(null); fetchSurvey(); }}
        />
      )}

      {/* Jump Rule Modal */}
      {showJumpRules && (
        <JumpRuleModal
          surveyId={surveyId}
          question={survey.questions.find((q) => q.id === showJumpRules)!}
          allQuestions={survey.questions}
          onClose={() => setShowJumpRules(null)}
          onSaved={() => { setShowJumpRules(null); fetchSurvey(); }}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          surveyId={surveyId}
          isPublic={survey.isPublic}
          maxResponses={survey.maxResponses}
          onClose={() => setShowSettings(false)}
          onSaved={() => { setShowSettings(false); fetchSurvey(); }}
        />
      )}
    </div>
  );
}

function QuestionFormModal({
  surveyId,
  question,
  onClose,
  onSaved,
}: {
  surveyId: string;
  question: Question | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState(question?.type || "single_choice");
  const [questionTitle, setQuestionTitle] = useState(question?.title || "");
  const [required, setRequired] = useState(question?.required ?? true);
  const [options, setOptions] = useState<string[]>(
    question?.options.map((o) => o.text) || ["", ""]
  );
  const [submitting, setSubmitting] = useState(false);

  const isChoiceType = type === "single_choice" || type === "multiple_choice";

  function addOption() {
    setOptions([...options, ""]);
  }

  function removeOption(idx: number) {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== idx));
  }

  function updateOption(idx: number, value: string) {
    const newOpts = [...options];
    newOpts[idx] = value;
    setOptions(newOpts);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!questionTitle.trim()) return;
    if (isChoiceType && options.some((o) => !o.trim())) {
      alert("选项内容不能为空");
      return;
    }
    setSubmitting(true);

    const body: Record<string, unknown> = {
      type,
      title: questionTitle,
      required,
    };
    if (isChoiceType) {
      body.options = options.map((text) => ({ text }));
    } else {
      body.options = [];
    }

    if (question) {
      await fetch(`/api/surveys/${surveyId}/questions/${question.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch(`/api/surveys/${surveyId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    setSubmitting(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <h3 className="text-lg font-semibold mb-4">
          {question ? "编辑题目" : "添加题目"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">题目类型</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="single_choice">单选题</option>
              <option value="multiple_choice">多选题</option>
              <option value="text">文本题</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">题目标题</label>
            <input
              type="text"
              value={questionTitle}
              onChange={(e) => setQuestionTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="输入题目内容"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="required"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="required" className="text-sm text-gray-700">必填</label>
          </div>

          {isChoiceType && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">选项</label>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateOption(idx, e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                      placeholder={`选项 ${idx + 1}`}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(idx)}
                        className="px-2 text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addOption}
                className="mt-2 text-sm text-indigo-600 hover:underline"
              >
                + 添加选项
              </button>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "保存中..." : "保存"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function JumpRuleModal({
  surveyId,
  question,
  allQuestions,
  onClose,
  onSaved,
}: {
  surveyId: string;
  question: Question;
  allQuestions: Question[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rules, setRules] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const rule of question.jumpRules) {
      map[rule.optionId] = rule.targetQuestionId;
    }
    return map;
  });
  const [saving, setSaving] = useState(false);

  const laterQuestions = allQuestions.filter((q) => q.order > question.order);

  async function handleSave() {
    setSaving(true);

    for (const existingRule of question.jumpRules) {
      if (!rules[existingRule.optionId]) {
        await fetch(`/api/surveys/${surveyId}/questions/${question.id}/rules`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ruleId: existingRule.id }),
        });
      }
    }

    for (const [optionId, targetQuestionId] of Object.entries(rules)) {
      if (!targetQuestionId) continue;
      await fetch(`/api/surveys/${surveyId}/questions/${question.id}/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId, targetQuestionId }),
      });
    }

    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <h3 className="text-lg font-semibold mb-2">配置跳转规则</h3>
        <p className="text-sm text-gray-500 mb-4">
          为「{question.title}」的每个选项设置跳转目标（留空表示顺序显示下一题）
        </p>

        <div className="space-y-3">
          {question.options.map((opt) => (
            <div key={opt.id} className="flex items-center gap-3">
              <span className="text-sm flex-shrink-0 w-32 truncate" title={opt.text}>
                选{opt.text}
              </span>
              <span className="text-sm text-gray-400">→</span>
              <select
                value={rules[opt.id] || ""}
                onChange={(e) =>
                  setRules((prev) => ({ ...prev, [opt.id]: e.target.value }))
                }
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">顺序下一题</option>
                {laterQuestions.map((q) => {
                  const qIdx = allQuestions.findIndex((qq) => qq.id === q.id);
                  return (
                    <option key={q.id} value={q.id}>
                      跳至 Q{qIdx + 1}: {q.title.substring(0, 20)}
                    </option>
                  );
                })}
              </select>
            </div>
          ))}
        </div>

        {laterQuestions.length === 0 && (
          <p className="text-sm text-amber-500 mt-3">
            当前题目之后没有其他题目，无法配置跳转
          </p>
        )}

        <div className="flex gap-3 pt-4 mt-4 border-t">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存规则"}
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

function SettingsModal({
  surveyId,
  isPublic,
  maxResponses,
  onClose,
  onSaved,
}: {
  surveyId: string;
  isPublic: boolean;
  maxResponses: number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pub, setPub] = useState(isPublic);
  const [limit, setLimit] = useState(maxResponses?.toString() || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/surveys/${surveyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isPublic: pub,
        maxResponses: limit.trim() ? parseInt(limit) : null,
      }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4">问卷设置</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">公开访问</p>
              <p className="text-xs text-gray-500">关闭后问卷将无法被填写</p>
            </div>
            <button
              onClick={() => setPub(!pub)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                pub ? "bg-indigo-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  pub ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              收集数量上限
            </label>
            <input
              type="number"
              min="1"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="不限制"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">留空表示不限制收集数量</p>
          </div>
        </div>

        <div className="flex gap-3 pt-4 mt-4 border-t">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存设置"}
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
