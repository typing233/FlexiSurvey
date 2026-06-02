import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashIP } from "@/lib/hash";
import { headers } from "next/headers";

type Params = { params: Promise<{ surveyId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { surveyId } = await params;
  const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");

  const [responses, total] = await Promise.all([
    prisma.response.findMany({
      where: { surveyId },
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        answers: {
          include: {
            question: {
              select: { title: true, type: true, options: { select: { id: true, text: true }, orderBy: { order: "asc" } } },
            },
          },
        },
      },
    }),
    prisma.response.count({ where: { surveyId } }),
  ]);

  return NextResponse.json({
    success: true,
    data: { responses, total, page, limit },
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { surveyId } = await params;
  const body = await request.json();
  const { answers } = body;

  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { options: true, jumpRules: true },
      },
      _count: { select: { responses: true } },
    },
  });

  if (!survey) {
    return NextResponse.json({ success: false, error: "问卷不存在" }, { status: 404 });
  }
  if (survey.status !== "published") {
    return NextResponse.json({ success: false, error: "问卷未发布或已关闭" }, { status: 400 });
  }
  if (!survey.isPublic) {
    return NextResponse.json({ success: false, error: "该问卷未开放公开访问" }, { status: 403 });
  }
  if (survey.maxResponses && survey._count.responses >= survey.maxResponses) {
    return NextResponse.json({ success: false, error: "该问卷已达到收集数量上限" }, { status: 403 });
  }

  if (!Array.isArray(answers)) {
    return NextResponse.json({ success: false, error: "答案格式无效" }, { status: 400 });
  }

  const answersMap = new Map<string, string>();
  for (const a of answers) {
    answersMap.set(a.questionId, a.value);
  }

  const visibleQuestionIds = computeVisibleQuestions(survey.questions, answersMap);

  for (const q of survey.questions) {
    if (!q.required) continue;
    if (!visibleQuestionIds.has(q.id)) continue;

    const val = answersMap.get(q.id);
    if (!val) {
      return NextResponse.json(
        { success: false, error: `请回答必填题目：${q.title}` },
        { status: 400 }
      );
    }
    if (q.type === "text" && val.trim() === "") {
      return NextResponse.json(
        { success: false, error: `请回答必填题目：${q.title}` },
        { status: 400 }
      );
    } else if (q.type === "multiple_choice") {
      try {
        const selected = JSON.parse(val);
        if (!Array.isArray(selected) || selected.length === 0) {
          return NextResponse.json(
            { success: false, error: `请至少选择一个选项：${q.title}` },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { success: false, error: `答案格式无效：${q.title}` },
          { status: 400 }
        );
      }
    }
  }

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] ||
    headersList.get("x-real-ip") ||
    "unknown";
  const respondent = hashIP(ip);

  const filteredAnswers = answers.filter(
    (a: { questionId: string }) => visibleQuestionIds.has(a.questionId)
  );

  const response = await prisma.response.create({
    data: {
      surveyId,
      respondent,
      answers: {
        create: filteredAnswers.map((a: { questionId: string; value: string }) => ({
          questionId: a.questionId,
          value: a.value,
        })),
      },
    },
    include: { answers: true },
  });

  return NextResponse.json({ success: true, data: response }, { status: 201 });
}

interface QuestionWithRules {
  id: string;
  type: string;
  order: number;
  jumpRules: { optionId: string; targetQuestionId: string }[];
}

function computeVisibleQuestions(
  questions: QuestionWithRules[],
  answersMap: Map<string, string>
): Set<string> {
  const visible = new Set<string>();
  let i = 0;
  while (i < questions.length) {
    const q = questions[i];
    visible.add(q.id);

    const val = answersMap.get(q.id);
    let jumped = false;
    if (val && q.jumpRules.length > 0 && q.type === "single_choice") {
      try {
        const selectedOptionId = JSON.parse(val);
        const rule = q.jumpRules.find((r) => r.optionId === selectedOptionId);
        if (rule) {
          const targetIdx = questions.findIndex((qq) => qq.id === rule.targetQuestionId);
          if (targetIdx > i) {
            i = targetIdx;
            jumped = true;
          }
        }
      } catch {}
    }
    if (!jumped) {
      i++;
    }
  }
  return visible;
}
