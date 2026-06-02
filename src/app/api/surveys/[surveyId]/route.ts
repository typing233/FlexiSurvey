import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ surveyId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { surveyId } = await params;
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: {
          options: { orderBy: { order: "asc" } },
          jumpRules: true,
        },
      },
      _count: { select: { responses: true } },
    },
  });
  if (!survey) {
    return NextResponse.json(
      { success: false, error: "问卷不存在" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, data: survey });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { surveyId } = await params;
  const body = await request.json();
  const { title, description, isPublic, maxResponses } = body;
  const survey = await prisma.survey.update({
    where: { id: surveyId },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(isPublic !== undefined && { isPublic }),
      ...(maxResponses !== undefined && { maxResponses: maxResponses === null ? null : Number(maxResponses) }),
    },
  });
  return NextResponse.json({ success: true, data: survey });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { surveyId } = await params;
  await prisma.survey.delete({ where: { id: surveyId } });
  return NextResponse.json({ success: true });
}
