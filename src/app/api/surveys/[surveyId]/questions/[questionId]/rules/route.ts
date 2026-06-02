import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ surveyId: string; questionId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { questionId } = await params;
  const rules = await prisma.jumpRule.findMany({
    where: { questionId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ success: true, data: rules });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { surveyId, questionId } = await params;
  const body = await request.json();
  const { optionId, targetQuestionId } = body;

  if (!optionId || !targetQuestionId) {
    return NextResponse.json(
      { success: false, error: "选项ID和目标题目ID不能为空" },
      { status: 400 }
    );
  }

  const question = await prisma.question.findFirst({
    where: { id: questionId, surveyId },
    include: { options: true },
  });
  if (!question) {
    return NextResponse.json(
      { success: false, error: "题目不存在" },
      { status: 404 }
    );
  }

  if (!question.options.find((o) => o.id === optionId)) {
    return NextResponse.json(
      { success: false, error: "选项不属于该题目" },
      { status: 400 }
    );
  }

  const targetQuestion = await prisma.question.findFirst({
    where: { id: targetQuestionId, surveyId },
  });
  if (!targetQuestion) {
    return NextResponse.json(
      { success: false, error: "目标题目不存在" },
      { status: 404 }
    );
  }

  if (targetQuestion.order <= question.order) {
    return NextResponse.json(
      { success: false, error: "跳转目标必须在当前题目之后" },
      { status: 400 }
    );
  }

  const existing = await prisma.jumpRule.findFirst({
    where: { questionId, optionId },
  });
  if (existing) {
    const rule = await prisma.jumpRule.update({
      where: { id: existing.id },
      data: { targetQuestionId },
    });
    return NextResponse.json({ success: true, data: rule });
  }

  const rule = await prisma.jumpRule.create({
    data: { questionId, optionId, targetQuestionId },
  });
  return NextResponse.json({ success: true, data: rule }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { questionId } = await params;
  const { ruleId } = await request.json();

  if (!ruleId) {
    return NextResponse.json(
      { success: false, error: "规则ID不能为空" },
      { status: 400 }
    );
  }

  await prisma.jumpRule.deleteMany({
    where: { id: ruleId, questionId },
  });
  return NextResponse.json({ success: true });
}
