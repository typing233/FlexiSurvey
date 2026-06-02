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

  let removedRules: { id: string; optionId: string; targetQuestionId: string }[] = [];

  if (options !== undefined) {
    const incomingOptions: { id?: string; text: string }[] = options;
    const existingOptions = question.options;
    const existingIds = new Set(existingOptions.map((o) => o.id));

    const keptIds = new Set<string>();
    for (const opt of incomingOptions) {
      if (opt.id && existingIds.has(opt.id)) {
        keptIds.add(opt.id);
      }
    }

    const deletedOptionIds = existingOptions
      .filter((o) => !keptIds.has(o.id))
      .map((o) => o.id);

    if (deletedOptionIds.length > 0) {
      await prisma.questionOption.deleteMany({
        where: { id: { in: deletedOptionIds } },
      });

      removedRules = question.jumpRules.filter((r) =>
        deletedOptionIds.includes(r.optionId)
      );
      if (removedRules.length > 0) {
        await prisma.jumpRule.deleteMany({
          where: { id: { in: removedRules.map((r) => r.id) } },
        });
      }
    }

    for (let idx = 0; idx < incomingOptions.length; idx++) {
      const opt = incomingOptions[idx];
      if (opt.id && keptIds.has(opt.id)) {
        await prisma.questionOption.update({
          where: { id: opt.id },
          data: { text: opt.text, order: idx },
        });
      } else {
        await prisma.questionOption.create({
          data: { questionId, text: opt.text, order: idx },
        });
      }
    }

    const updated = await prisma.question.findUnique({
      where: { id: questionId },
      include: { options: { orderBy: { order: "asc" } }, jumpRules: true },
    });
    return NextResponse.json({
      success: true,
      data: updated,
      removedRules: removedRules.map((r) => ({
        optionId: r.optionId,
        targetQuestionId: r.targetQuestionId,
      })),
    });
  }

  if (type !== undefined && type === "text") {
    removedRules = question.jumpRules;
    if (removedRules.length > 0) {
      await prisma.jumpRule.deleteMany({ where: { questionId } });
    }
  }

  const result = await prisma.question.findUnique({
    where: { id: questionId },
    include: { options: { orderBy: { order: "asc" } }, jumpRules: true },
  });
  return NextResponse.json({
    success: true,
    data: result,
    removedRules: removedRules.map((r) => ({
      optionId: r.optionId,
      targetQuestionId: r.targetQuestionId,
    })),
  });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { surveyId, questionId } = await params;

  const targetingRules = await prisma.jumpRule.findMany({
    where: { targetQuestionId: questionId },
    include: { question: { select: { title: true } } },
  });

  await prisma.jumpRule.deleteMany({
    where: { targetQuestionId: questionId },
  });

  await prisma.question.delete({ where: { id: questionId } });

  return NextResponse.json({
    success: true,
    removedRules: targetingRules.map((r) => ({
      sourceQuestion: r.question.title,
      optionId: r.optionId,
    })),
  });
}
