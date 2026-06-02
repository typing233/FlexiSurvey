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

  const orderMap = new Map<string, number>();
  orderedIds.forEach((id: string, idx: number) => orderMap.set(id, idx));

  const allRules = await prisma.jumpRule.findMany({
    where: { question: { surveyId } },
  });

  const invalidRuleIds = allRules
    .filter((rule) => {
      const sourceOrder = orderMap.get(rule.questionId);
      const targetOrder = orderMap.get(rule.targetQuestionId);
      if (sourceOrder === undefined || targetOrder === undefined) return true;
      return targetOrder <= sourceOrder;
    })
    .map((r) => r.id);

  if (invalidRuleIds.length > 0) {
    await prisma.jumpRule.deleteMany({
      where: { id: { in: invalidRuleIds } },
    });
  }

  return NextResponse.json({
    success: true,
    invalidatedRules: invalidRuleIds.length,
  });
}
