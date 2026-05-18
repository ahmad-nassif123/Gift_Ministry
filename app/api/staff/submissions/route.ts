import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/staff-session";
import { hasStaffWorkDb, insertStaffWorkSubmission, type StaffTaskLineInput } from "@/lib/staff-work-db";

function parseIsoDate(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

export async function POST(request: Request) {
  try {
    const session = await getStaffSession();
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (!hasStaffWorkDb()) {
      return NextResponse.json({ error: "قاعدة البيانات غير متوفرة" }, { status: 503 });
    }

    const body = (await request.json()) as {
      reportDate?: string;
      hasExtraTasks?: boolean;
      hasOvertime?: boolean;
      overtimeHours?: number | string | null;
      tasks?: Array<{ description?: string; clientEntity?: string; taskDate?: string }>;
      overtime?: { description?: string; clientEntity?: string; taskDate?: string } | null;
    };

    const reportDate = parseIsoDate(body.reportDate) ?? new Date().toISOString().slice(0, 10);
    const hasExtraTasks = !!body.hasExtraTasks;
    const hasOvertime = !!body.hasOvertime;

    const tasks = Array.isArray(body.tasks) ? body.tasks : [];
    const lines: StaffTaskLineInput[] = [];
    let order = 1;

    const pushTask = (
      t: { description?: string; clientEntity?: string; taskDate?: string },
      taskType: "regular" | "overtime"
    ) => {
      const description = String(t.description ?? "").trim();
      const clientEntity = String(t.clientEntity ?? "").trim();
      const taskDate = parseIsoDate(t.taskDate);
      if (!description || !clientEntity || !taskDate) return false;
      lines.push({
        lineOrder: order++,
        taskType,
        description,
        clientEntity,
        taskDate,
      });
      return true;
    };

    if (tasks.length === 0 || !pushTask(tasks[0], "regular")) {
      return NextResponse.json({ error: "المهمة الأولى مطلوبة (الوصف، الجهة، التاريخ)" }, { status: 400 });
    }

    if (hasExtraTasks) {
      for (let i = 1; i < tasks.length; i++) {
        const t = tasks[i];
        if (!String(t?.description ?? "").trim() && !String(t?.clientEntity ?? "").trim()) continue;
        if (!pushTask(t, "regular")) {
          return NextResponse.json(
            { error: `أكمل بيانات المهمة ${i + 1} (الوصف، الجهة، التاريخ)` },
            { status: 400 }
          );
        }
      }
    }

    let overtimeHours: number | null = null;
    if (hasOvertime) {
      const ot = body.overtime;
      if (!ot || !pushTask(ot, "overtime")) {
        return NextResponse.json(
          { error: "أكمل بيانات العمل الإضافي (المهمة، الجهة، التاريخ)" },
          { status: 400 }
        );
      }
      const h = Number(body.overtimeHours);
      if (!Number.isFinite(h) || h <= 0) {
        return NextResponse.json({ error: "أدخل عدد ساعات العمل الإضافية (رقم أكبر من صفر)" }, { status: 400 });
      }
      overtimeHours = h;
    }

    const id = await insertStaffWorkSubmission(session.staffId, {
      reportDate,
      hasExtraTasks,
      hasOvertime,
      overtimeHours,
      lines,
    });

    return NextResponse.json({ success: true, submissionId: id });
  } catch (e) {
    console.error("POST /api/staff/submissions:", e);
    return NextResponse.json({ error: "تعذر حفظ التقرير" }, { status: 500 });
  }
}
