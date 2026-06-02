import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ surveyId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const { surveyId } = await params;
  const body = await request.json();
  const { orderedIds } = body;

  if (!Array.isArray(orderedIds)) {
    return NextResponse.json({ success: false, error: "无效参数" }, { status: 400 });
  }

  await prisma.$transaction(
    orderedIds.map((id: string, index: number) =>
      prisma.question.update({ where: { id }, data: { order: index } })
    )
  );

  return NextResponse.json({ success: true });
}
