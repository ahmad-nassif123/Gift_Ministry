"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Download, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STAFF_OFFICES, getStaffOfficeLabel } from "@/lib/staff-offices";
import type { StaffOfficeCode } from "@/lib/staff-offices";
import { getStaffPortalLoginUrl } from "@/lib/staff-portal-metadata";

type Member = {
  id: number;
  loginId: string;
  fullName: string;
  officeCode: string;
  active: boolean;
};

type Submission = {
  id: number;
  staffName: string;
  officeCode: string;
  reportDate: string;
  submittedAt: string;
  hasOvertime: boolean;
  overtimeHours: number | null;
  lines: Array<{
    lineOrder: number;
    taskType: string;
    description: string;
    clientEntity: string;
    taskDate: string;
  }>;
};

export function AdminStaffWorkClient() {
  const [members, setMembers] = useState<Member[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [officeCode, setOfficeCode] = useState<StaffOfficeCode>("official_gifts");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [staffPortalUrl, setStaffPortalUrl] = useState("");

  useEffect(() => {
    const fromEnv = getStaffPortalLoginUrl();
    if (fromEnv.startsWith("http")) {
      setStaffPortalUrl(fromEnv);
      return;
    }
    setStaffPortalUrl(getStaffPortalLoginUrl(window.location.origin));
  }, []);

  const load = useCallback(async () => {
    const [mRes, sRes] = await Promise.all([
      fetch("/api/admin/staff/members", { credentials: "include" }),
      fetch(
        `/api/admin/staff/submissions?${new URLSearchParams({
          ...(fromDate ? { from: fromDate } : {}),
          ...(toDate ? { to: toDate } : {}),
        })}`,
        { credentials: "include" }
      ),
    ]);
    if (mRes.ok) {
      const m = (await mRes.json()) as { members: Member[] };
      setMembers(m.members ?? []);
    }
    if (sRes.ok) {
      const s = (await sRes.json()) as { submissions: Submission[] };
      setSubmissions(s.submissions ?? []);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/staff/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ loginId, password, fullName, officeCode }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(data.error ?? "تعذر إضافة الموظف");
      return;
    }
    toast.success("تم إنشاء حساب الموظف");
    setLoginId("");
    setPassword("");
    setFullName("");
    void load();
  };

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const rows: Record<string, string | number>[] = [];
    for (const sub of submissions) {
      for (const line of sub.lines) {
        rows.push({
          "رقم التقرير": sub.id,
          الموظف: sub.staffName,
          المكتب: getStaffOfficeLabel(sub.officeCode),
          "تاريخ التقرير": sub.reportDate,
          "تاريخ الإرسال": sub.submittedAt.slice(0, 10),
          المهمة: line.description,
          الجهة: line.clientEntity,
          "تاريخ المهمة": line.taskDate,
          النوع: line.taskType === "overtime" ? "إضافي" : "اعتيادي",
          "ساعات إضافية": sub.hasOvertime ? (sub.overtimeHours ?? "") : "",
        });
      }
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "أعمال الموظفين");
    XLSX.writeFile(wb, `أعمال-الموظفين-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/pricing">
          <Button variant="outline" size="sm">
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة للإدارة
          </Button>
        </Link>
        <h1 className="text-2xl font-bold flex-1">أعمال الموظفين</h1>
        <Button type="button" variant="outline" size="sm" onClick={() => void exportExcel()}>
          <Download className="ml-2 h-4 w-4" />
          Excel
        </Button>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">رابط الموظفين (معزول عن الموقع)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            يشارك هذا الرابط مع الموظفين فقط. بعد الدخول لا يمكنهم فتح الكتالوج أو لوحة التحكم.
          </p>
          <Input readOnly value={staffPortalUrl} dir="ltr" className="text-left font-mono text-xs" />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(staffPortalUrl);
              toast.success("تم نسخ الرابط");
            }}
          >
            نسخ الرابط
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            إضافة حساب موظف
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateMember} className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="الاسم الثلاثي"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              placeholder="معرّف الدخول (مثال ahmad.m)"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              dir="ltr"
              className="text-left"
              required
            />
            <Input
              type="password"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={officeCode}
              onChange={(e) => setOfficeCode(e.target.value as StaffOfficeCode)}
            >
              {STAFF_OFFICES.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </select>
            <Button type="submit" className="sm:col-span-2">
              حفظ الحساب
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الحسابات ({members.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-right">
                <th className="p-2">الاسم</th>
                <th className="p-2">معرّف الدخول</th>
                <th className="p-2">المكتب</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b">
                  <td className="p-2">{m.fullName}</td>
                  <td className="p-2 font-mono text-xs" dir="ltr">
                    {m.loginId}
                  </td>
                  <td className="p-2">{getStaffOfficeLabel(m.officeCode)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <CardTitle className="text-base">التقارير ({submissions.length})</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <Button type="button" variant="outline" onClick={() => void load()}>
              تطبيق
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto max-h-[480px] overflow-y-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b text-right">
                <th className="p-2">التاريخ</th>
                <th className="p-2">الموظف</th>
                <th className="p-2">المهمة</th>
                <th className="p-2">الجهة</th>
              </tr>
            </thead>
            <tbody>
              {submissions.flatMap((sub) =>
                sub.lines.map((line) => (
                  <tr key={`${sub.id}-${line.lineOrder}`} className="border-b align-top">
                    <td className="p-2 whitespace-nowrap">{sub.reportDate}</td>
                    <td className="p-2 whitespace-nowrap">{sub.staffName}</td>
                    <td className="p-2">{line.description}</td>
                    <td className="p-2">{line.clientEntity}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
