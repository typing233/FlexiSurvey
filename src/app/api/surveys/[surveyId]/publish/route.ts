import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ surveyId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { surveyId } = await params;
  const survey = await prisma.survey.findUnique({ where: { id: surveyId }, include: { questions: true } });
  if (!survey) {
    return NextResponse.json({ success: false, error: "问卷不存在" }, { status: 404 });
  }
  if (survey.questions.length === 0) {
    return NextResponse.json({ success: false, error: "问卷至少需要一道题目" }, { status: 400 });
  }
  const updated = await prisma.survey.update({
    where: { id: surveyId },
    data: { status: "published" },
  });
  return NextResponse.json({ success: true, data: updated });
}
