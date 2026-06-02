import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ surveyId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { surveyId } = await params;

  const questions = await prisma.question.findMany({
    where: { surveyId },
    orderBy: { order: "asc" },
    include: { options: { orderBy: { order: "asc" } }, answers: true },
  });

  const totalResponses = await prisma.response.count({ where: { surveyId } });

  const stats = questions.map((q) => {
    if (q.type === "text") {
      return {
        questionId: q.id,
        title: q.title,
        type: q.type,
        totalAnswers: q.answers.length,
        answers: q.answers.map((a) => a.value),
      };
    }
    const distribution = q.options.map((opt) => {
      const count = q.answers.filter((a) => {
        try {
          const val = JSON.parse(a.value);
          return Array.isArray(val) ? val.includes(opt.id) : val === opt.id;
        } catch {
          return false;
        }
      }).length;
      return { optionId: opt.id, text: opt.text, count };
    });
    return {
      questionId: q.id,
      title: q.title,
      type: q.type,
      totalAnswers: q.answers.length,
      distribution,
    };
  });

  return NextResponse.json({ success: true, data: { stats, totalResponses } });
}
