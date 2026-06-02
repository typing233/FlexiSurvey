import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status");
  const where = status ? { status } : {};
  const surveys = await prisma.survey.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true, responses: true } } },
  });
  return NextResponse.json({ success: true, data: surveys });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, description } = body;
  if (!title?.trim()) {
    return NextResponse.json(
      { success: false, error: "标题不能为空" },
      { status: 400 }
    );
  }
  const survey = await prisma.survey.create({
    data: { title: title.trim(), description: description?.trim() || "" },
  });
  return NextResponse.json({ success: true, data: survey }, { status: 201 });
}
