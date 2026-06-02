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
    include: { questions: { include: { options: true } } },
  });

  if (!survey) {
    return NextResponse.json({ success: false, error: "问卷不存在" }, { status: 404 });
  }
  if (survey.status !== "published") {
    return NextResponse.json({ success: false, error: "问卷未发布或已关闭" }, { status: 400 });
  }

  if (!Array.isArray(answers)) {
    return NextResponse.json({ success: false, error: "答案格式无效" }, { status: 400 });
  }

  const requiredQuestions = survey.questions.filter((q) => q.required);
  for (const q of requiredQuestions) {
    const answer = answers.find((a: { questionId: string }) => a.questionId === q.id);
    if (!answer || !answer.value) {
      return NextResponse.json(
        { success: false, error: `请回答必填题目：${q.title}` },
        { status: 400 }
      );
    }
    if (q.type === "text") {
      if (answer.value.trim() === "") {
        return NextResponse.json(
          { success: false, error: `请回答必填题目：${q.title}` },
          { status: 400 }
        );
      }
    } else if (q.type === "single_choice") {
      if (!answer.value) {
        return NextResponse.json(
          { success: false, error: `请选择一个选项：${q.title}` },
          { status: 400 }
        );
      }
    } else if (q.type === "multiple_choice") {
      try {
        const selected = JSON.parse(answer.value);
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

  const response = await prisma.response.create({
    data: {
      surveyId,
      respondent,
      answers: {
        create: answers.map((a: { questionId: string; value: string }) => ({
          questionId: a.questionId,
          value: a.value,
        })),
      },
    },
    include: { answers: true },
  });

  return NextResponse.json({ success: true, data: response }, { status: 201 });
}
