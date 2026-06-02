import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ surveyId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { surveyId } = await params;
  const updated = await prisma.survey.update({
    where: { id: surveyId },
    data: { status: "closed" },
  });
  return NextResponse.json({ success: true, data: updated });
}
