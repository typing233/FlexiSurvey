import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ surveyId: string; questionId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const { surveyId, questionId } = await params;
  const body = await request.json();
  const { type, title, required, options } = body;

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title.trim();
  if (type !== undefined) updateData.type = type;
  if (required !== undefined) updateData.required = required;

  const question = await prisma.question.update({
    where: { id: questionId },
    data: updateData,
    include: { options: { orderBy: { order: "asc" } }, jumpRules: true },
  });

  if (options !== undefined) {
    await prisma.questionOption.deleteMany({ where: { questionId } });
    await prisma.questionOption.createMany({
      data: options.map((opt: { text: string }, idx: number) => ({
        questionId,
        text: opt.text,
        order: idx,
      })),
    });

    const newOptions = await prisma.questionOption.findMany({ where: { questionId } });
    const newOptionIds = new Set(newOptions.map((o) => o.id));
    const invalidRules = question.jumpRules.filter((r) => !newOptionIds.has(r.optionId));
    if (invalidRules.length > 0) {
      await prisma.jumpRule.deleteMany({
        where: { id: { in: invalidRules.map((r) => r.id) } },
      });
    }

    const updated = await prisma.question.findUnique({
      where: { id: questionId },
      include: { options: { orderBy: { order: "asc" } }, jumpRules: true },
    });
    return NextResponse.json({ success: true, data: updated });
  }

  if (type !== undefined && type === "text") {
    await prisma.jumpRule.deleteMany({ where: { questionId } });
  }

  const result = await prisma.question.findUnique({
    where: { id: questionId },
    include: { options: { orderBy: { order: "asc" } }, jumpRules: true },
  });
  return NextResponse.json({ success: true, data: result });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { surveyId, questionId } = await params;

  await prisma.jumpRule.deleteMany({
    where: { targetQuestionId: questionId },
  });

  await prisma.question.delete({ where: { id: questionId } });

  return NextResponse.json({ success: true });
}
