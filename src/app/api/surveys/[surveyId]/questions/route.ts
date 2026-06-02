import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ surveyId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { surveyId } = await params;
  const questions = await prisma.question.findMany({
    where: { surveyId },
    orderBy: { order: "asc" },
    include: { options: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json({ success: true, data: questions });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { surveyId } = await params;
  const body = await request.json();
  const { type, title, required = true, options = [] } = body;

  if (!title?.trim()) {
    return NextResponse.json({ success: false, error: "题目标题不能为空" }, { status: 400 });
  }
  if (!["single_choice", "multiple_choice", "text"].includes(type)) {
    return NextResponse.json({ success: false, error: "无效的题目类型" }, { status: 400 });
  }

  const maxOrder = await prisma.question.aggregate({
    where: { surveyId },
    _max: { order: true },
  });

  const question = await prisma.question.create({
    data: {
      surveyId,
      type,
      title: title.trim(),
      required,
      order: (maxOrder._max.order ?? -1) + 1,
      options: {
        create: options.map((opt: { text: string }, idx: number) => ({
          text: opt.text,
          order: idx,
        })),
      },
    },
    include: { options: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ success: true, data: question }, { status: 201 });
}
