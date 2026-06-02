import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ surveyId: string; questionId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const { questionId } = await params;
  const body = await request.json();
  const { type, title, required, options } = body;

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title.trim();
  if (type !== undefined) updateData.type = type;
  if (required !== undefined) updateData.required = required;

  const question = await prisma.question.update({
    where: { id: questionId },
    data: updateData,
    include: { options: { orderBy: { order: "asc" } } },
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
    const updated = await prisma.question.findUnique({
      where: { id: questionId },
      include: { options: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json({ success: true, data: updated });
  }

  return NextResponse.json({ success: true, data: question });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { questionId } = await params;
  await prisma.question.delete({ where: { id: questionId } });
  return NextResponse.json({ success: true });
}
