import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

type Params = { params: Promise<{ surveyId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { surveyId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get("format") || "csv";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const status = searchParams.get("status");

  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!survey) {
    return NextResponse.json({ success: false, error: "问卷不存在" }, { status: 404 });
  }

  const where: Record<string, unknown> = { surveyId };
  if (startDate || endDate) {
    where.submittedAt = {};
    if (startDate) (where.submittedAt as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) (where.submittedAt as Record<string, unknown>).lte = new Date(endDate + "T23:59:59.999Z");
  }

  let responses = await prisma.response.findMany({
    where,
    orderBy: { submittedAt: "desc" },
    include: {
      answers: {
        include: {
          question: {
            select: { id: true, title: true, type: true, options: { select: { id: true, text: true } } },
          },
        },
      },
    },
  });

  if (status === "complete") {
    responses = responses.filter(
      (r) => survey.questions.every((q) => r.answers.some((a) => a.questionId === q.id))
    );
  } else if (status === "partial") {
    responses = responses.filter(
      (r) => survey.questions.some((q) => !r.answers.some((a) => a.questionId === q.id))
    );
  }

  const headers = ["序号", "提交时间", "匿名标识", ...survey.questions.map((q) => q.title)];
  const rows = responses.map((resp, idx) => {
    const row: string[] = [
      String(idx + 1),
      new Date(resp.submittedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
      resp.respondent.substring(0, 8),
    ];

    for (const q of survey.questions) {
      const answer = resp.answers.find((a) => a.questionId === q.id);
      if (!answer) {
        row.push("");
        continue;
      }
      row.push(formatAnswerValue(answer.value, q.type, q.options));
    }
    return row;
  });

  if (format === "xlsx") {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "回答数据");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(survey.title)}_responses.xlsx"`,
      },
    });
  }

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const bom = "﻿";
  return new NextResponse(bom + csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(survey.title)}_responses.csv"`,
    },
  });
}

function formatAnswerValue(
  value: string,
  type: string,
  options: { id: string; text: string }[]
): string {
  if (type === "text") return value;
  try {
    const parsed = JSON.parse(value);
    if (type === "single_choice") {
      const opt = options.find((o) => o.id === parsed);
      return opt ? opt.text : value;
    }
    if (type === "multiple_choice" && Array.isArray(parsed)) {
      return parsed
        .map((id: string) => options.find((o) => o.id === id)?.text || id)
        .join("; ");
    }
    return value;
  } catch {
    return value;
  }
}
