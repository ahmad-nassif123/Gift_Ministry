"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type TaskFields = { description: string; clientEntity: string; taskDate: string };

const emptyTask = (): TaskFields => ({
  description: "",
  clientEntity: "",
  taskDate: new Date().toISOString().slice(0, 10),
});

export function StaffReportClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [staffName, setStaffName] = useState("");
  const [officeLabel, setOfficeLabel] = useState("");
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [task1, setTask1] = useState<TaskFields>(emptyTask);
  const [hasExtraTasks, setHasExtraTasks] = useState(false);
  const [task2, setTask2] = useState<TaskFields>(emptyTask);
  const [task3, setTask3] = useState<TaskFields>(emptyTask);
  const [hasOvertime, setHasOvertime] = useState(false);
  const [overtime, setOvertime] = useState<TaskFields>(emptyTask);
  const [overtimeHours, setOvertimeHours] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const loadSession = useCallback(async () => {
    const res = await fetch("/api/staff/session", { credentials: "include" });
    if (!res.ok) {
      router.replace("/staff/login");
      return;
    }
    const data = (await res.json()) as {
      staff: { fullName: string; officeLabel: string };
    };
    setStaffName(data.staff.fullName);
    setOfficeLabel(data.staff.officeLabel);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const handleLogout = async () => {
    await fetch("/api/staff/logout", { method: "POST", credentials: "include" });
    router.replace("/staff/login");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const tasks = [task1];
      if (hasExtraTasks) {
        tasks.push(task2, task3);
      }
      const res = await fetch("/api/staff/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          reportDate,
          hasExtraTasks,
          hasOvertime,
          overtimeHours: hasOvertime ? overtimeHours : null,
          tasks,
          overtime: hasOvertime ? overtime : null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "تعذر الإرسال");
        return;
      }
      setSubmitted(true);
      toast.success("تم إرسال تقريرك بنجاح");
    } catch {
      toast.error("تعذر الاتصال بالخادم");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-center text-muted-foreground py-12">جاري التحميل…</p>;
  }

  if (submitted) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>شكراً {staffName}</CardTitle>
          <p className="text-sm text-muted-foreground">تم حفظ تقرير يوم {reportDate}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              setSubmitted(false);
              setTask1(emptyTask());
              setTask2(emptyTask());
              setTask3(emptyTask());
              setOvertime(emptyTask());
              setHasExtraTasks(false);
              setHasOvertime(false);
              setOvertimeHours("");
            }}
          >
            إرسال تقرير جديد
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => void handleLogout()}>
            <LogOut className="ml-2 h-4 w-4" />
            تسجيل الخروج
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold">تقرير الأعمال</h1>
          <p className="text-sm text-muted-foreground">{staffName}</p>
          <Badge variant="secondary" className="mt-1">
            {officeLabel}
          </Badge>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={() => void handleLogout()} title="خروج">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">تاريخ التقرير</CardTitle>
          </CardHeader>
          <CardContent>
            <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} required />
          </CardContent>
        </Card>

        <TaskBlock title="المهمة الأولى *" value={task1} onChange={setTask1} />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">هل يوجد مهام إضافية؟ *</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="extra"
                checked={hasExtraTasks}
                onChange={() => setHasExtraTasks(true)}
              />
              نعم
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="extra"
                checked={!hasExtraTasks}
                onChange={() => setHasExtraTasks(false)}
              />
              لا
            </label>
          </CardContent>
        </Card>

        {hasExtraTasks ? (
          <>
            <TaskBlock title="المهمة الثانية *" value={task2} onChange={setTask2} />
            <TaskBlock title="المهمة الثالثة" value={task3} onChange={setTask3} optional />
          </>
        ) : null}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">ساعات العمل الإضافية بعد الدوام؟ *</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="ot"
                checked={hasOvertime}
                onChange={() => setHasOvertime(true)}
              />
              نعم
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="ot"
                checked={!hasOvertime}
                onChange={() => setHasOvertime(false)}
              />
              لا
            </label>
          </CardContent>
        </Card>

        {hasOvertime ? (
          <>
            <TaskBlock title="المهام الإضافية *" value={overtime} onChange={setOvertime} />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">عدد ساعات العمل الإضافية *</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  inputMode="decimal"
                  value={overtimeHours}
                  onChange={(e) => setOvertimeHours(e.target.value)}
                  placeholder="مثال: 2"
                  required
                />
              </CardContent>
            </Card>
          </>
        ) : null}

        <Button type="submit" className="w-full min-h-12 text-base" disabled={submitting}>
          {submitting ? "جاري الإرسال…" : "إرسال التقرير"}
        </Button>
      </form>
    </div>
  );
}

function TaskBlock({
  title,
  value,
  onChange,
  optional,
}: {
  title: string;
  value: TaskFields;
  onChange: (v: TaskFields) => void;
  optional?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">المهمة{optional ? "" : " *"}</label>
          <Input
            value={value.description}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
            placeholder="أدخل وصف المهمة"
            required={!optional}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">الجهة التي نُفِّذت لها *</label>
          <Input
            value={value.clientEntity}
            onChange={(e) => onChange({ ...value, clientEntity: e.target.value })}
            placeholder="اسم الجهة"
            required={!optional}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">تاريخ المهمة *</label>
          <Input
            type="date"
            value={value.taskDate}
            onChange={(e) => onChange({ ...value, taskDate: e.target.value })}
            required={!optional}
          />
        </div>
      </CardContent>
    </Card>
  );
}
