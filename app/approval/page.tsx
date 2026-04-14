"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useWorkPermitStore,
  WORK_PERMIT_TYPE_LABELS,
  WORK_PERMIT_TYPE_ICONS,
  WORK_PERMIT_STATUS_LABELS,
  WorkPermitStatus,
  WorkPermitType,
} from "@/store/workPermitStore";

const PRIMARY = "#E05A2B";
const PRIMARY_LIGHT = "#FEF3ED";

// ─── 상태별 스타일 ────────────────────────────────────────────────
const STATUS_STYLE: Record<WorkPermitStatus, { badge: string; dot: string }> = {
  draft:                  { badge: "bg-slate-100 text-slate-600",   dot: "#94a3b8" },
  pending:                { badge: "bg-amber-100 text-amber-700",   dot: "#f59e0b" },
  approved:               { badge: "bg-emerald-100 text-emerald-700", dot: "#10b981" },
  conditionally_approved: { badge: "bg-blue-100 text-blue-700",    dot: "#3b82f6" },
  rejected:               { badge: "bg-red-100 text-red-600",       dot: "#ef4444" },
  completed:              { badge: "bg-green-100 text-green-700",   dot: "#22c55e" },
  expired:                { badge: "bg-slate-100 text-slate-400",   dot: "#cbd5e1" },
};

// ─── 간트 차트 ────────────────────────────────────────────────────
type GanttEvent = {
  id: string; label: string; startDate: string; endDate: string;
  color: string; statusLabel: string; typeLabel: string;
};

function PermitGantt({ events, cursor }: { events: GanttEvent[]; cursor: { year: number; month: number } }) {
  const router = useRouter();
  const { year, month } = cursor;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const now = new Date();
  const todayD = now.getDate(), todayM = now.getMonth(), todayY = now.getFullYear();
  const mm = String(month + 1).padStart(2, "0");
  const monthStart = `${year}-${mm}-01`;
  const monthEnd = `${year}-${mm}-${String(daysInMonth).padStart(2, "0")}`;
  const visible = events.filter((e) => e.startDate <= monthEnd && (e.endDate || e.startDate) >= monthStart);

  function getBar(e: GanttEvent) {
    const sd = new Date(e.startDate), ed = new Date(e.endDate || e.startDate);
    const clipStart = sd.getFullYear() === year && sd.getMonth() === month ? sd.getDate() : 1;
    const clipEnd = ed.getFullYear() === year && ed.getMonth() === month ? ed.getDate() : daysInMonth;
    return { start: clipStart - 1, end: clipEnd - 1 };
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50">
        <span className="text-sm font-semibold text-slate-700">📅 허가서 스케줄</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-500">{visible.length}건</span>
        <div className="ml-auto flex items-center gap-3">
          {[
            { color: "#10b981", label: "승인완료" },
            { color: "#f59e0b", label: "승인대기" },
            { color: "#94a3b8", label: "기타" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: l.color }} />
              <span className="text-xs text-slate-500">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: `${280 + daysInMonth * 26}px` }}>
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 bg-white sticky left-0 z-10" style={{ width: 160 }}>허가서명</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 w-16">유형</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 w-16">상태</th>
              {days.map((d) => {
                const isToday = d === todayD && month === todayM && year === todayY;
                return (
                  <th key={d} className="text-center px-0.5 py-2 text-xs w-7"
                    style={{ color: isToday ? PRIMARY : "#94a3b8", fontWeight: isToday ? 700 : 400 }}>
                    {d}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {visible.length === 0 ? (
              <tr><td colSpan={3 + daysInMonth} className="px-4 py-8 text-center text-xs text-slate-400">이번달 허가서 일정이 없습니다</td></tr>
            ) : visible.map((event) => {
              const bar = getBar(event);
              return (
                <tr key={event.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => router.push("/work-plan/permits")}>
                  <td className="px-4 py-2 bg-white sticky left-0 z-10">
                    <p className="text-xs font-medium text-slate-700 truncate max-w-36">{event.label}</p>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{event.typeLabel}</td>
                  <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{event.statusLabel}</td>
                  {days.map((_, i) => {
                    const inRange = i >= bar.start && i <= bar.end;
                    const isFirst = i === bar.start;
                    const isLast = i === bar.end;
                    const isToday = days[i] === todayD && month === todayM && year === todayY;
                    return (
                      <td key={i} className="px-0.5 py-2" style={{ background: isToday ? "#fef9f6" : undefined }}>
                        {inRange && (
                          <div className={`h-4 opacity-80 ${isFirst ? "rounded-l-full" : ""} ${isLast ? "rounded-r-full" : ""}`}
                            style={{ background: event.color }} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 승인/반려 버튼 ───────────────────────────────────────────────
function ActionButton({ permitId, action, label, color }: {
  permitId: string; action: WorkPermitStatus; label: string; color: string;
}) {
  const { setPermitStatus } = useWorkPermitStore();
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (action === "rejected") {
          const reason = window.prompt("반려 사유를 입력하세요:");
          if (reason !== null) setPermitStatus(permitId, action, reason);
        } else {
          setPermitStatus(permitId, action);
        }
      }}
      className={`text-xs px-2.5 py-1 rounded-lg font-semibold text-white transition-colors ${color}`}
    >
      {label}
    </button>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────────
export default function ApprovalDashboard() {
  const { permits, deletePermit, createPermit } = useWorkPermitStore();
  const router = useRouter();

  const handleCreatePermit = () => {
    const newId = createPermit("general");
    router.push(`/work-plan/permits?permit=${newId}`);
  };

  const [cursor, setCursor] = useState(() => {
    const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() };
  });
  const prevMonth = () => setCursor(({ year: y, month: m }) => m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 });
  const nextMonth = () => setCursor(({ year: y, month: m }) => m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 });
  const monthLabel = new Date(cursor.year, cursor.month).toLocaleDateString("ko-KR", { year: "numeric", month: "long" });

  const [filterStatus, setFilterStatus] = useState<WorkPermitStatus | "all">("all");
  const [filterType, setFilterType] = useState<WorkPermitType | "all">("all");
  const [searchQ, setSearchQ] = useState("");

  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  // KPI 계산
  const kpis = useMemo(() => {
    const total   = permits.length;
    const pending = permits.filter((p) => p.status === "pending").length;
    const approved = permits.filter((p) => p.status === "approved" || p.status === "conditionally_approved").length;
    const active  = permits.filter((p) => p.status === "approved" || p.status === "conditionally_approved").length;
    const rejected = permits.filter((p) => p.status === "rejected").length;
    const draft   = permits.filter((p) => p.status === "draft").length;
    return [
      { label: "전체 허가서",   value: total,    icon: "📋", color: "border-slate-200 bg-white",          text: "text-slate-800" },
      { label: "초안",          value: draft,    icon: "✏️",  color: "border-slate-200 bg-slate-50",       text: "text-slate-600" },
      { label: "승인 대기",     value: pending,  icon: "⏳",  color: "border-amber-200 bg-amber-50",        text: "text-amber-700" },
      { label: "승인 완료",     value: approved, icon: "✅",  color: "border-emerald-200 bg-emerald-50",   text: "text-emerald-700" },
      { label: "반려",          value: rejected, icon: "❌",  color: "border-red-200 bg-red-50",            text: "text-red-600" },
    ];
  }, [permits]);

  // 필터링
  const filtered = useMemo(() => permits.filter((p) => {
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (filterType !== "all" && p.type !== filterType) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      if (!p.title?.toLowerCase().includes(q) && !p.siteName?.toLowerCase().includes(q) && !p.requestedBy?.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [permits, filterStatus, filterType, searchQ]);

  // 승인대기 목록 (액션 필요)
  const pendingPermits = permits.filter((p) => p.status === "pending");

  // 간트 이벤트
  const ganttEvents: GanttEvent[] = permits
    .filter((p) => p.startDate)
    .map((p) => ({
      id: p.id,
      label: p.title || "(제목 없음)",
      startDate: p.startDate,
      endDate: p.endDate || p.startDate,
      color: p.status === "approved" || p.status === "conditionally_approved" ? "#10b981"
           : p.status === "pending" ? "#f59e0b"
           : p.status === "rejected" ? "#ef4444"
           : "#94a3b8",
      statusLabel: WORK_PERMIT_STATUS_LABELS[p.status],
      typeLabel: WORK_PERMIT_TYPE_LABELS[p.type].replace(" 허가서", "").replace(" 작업", ""),
    }));

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-slate-50">
      <div className="flex-1 px-6 py-5 space-y-5 max-w-7xl w-full mx-auto">

        {/* ── 헤더 ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">대시보드</h1>
            <p className="text-sm text-slate-400 mt-0.5">{today} · 작업허가서 현황</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreatePermit}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-semibold transition-all"
              style={{ background: PRIMARY, color: "white", boxShadow: `0 2px 8px ${PRIMARY}44` }}>
              🔑 작업허가서 생성
            </button>
          </div>
        </div>

        {/* ── KPI 카드 ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className={`rounded-xl border p-4 ${k.color}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg">{k.icon}</span>
                <span className={`text-2xl font-bold ${k.text}`}>{k.value}</span>
              </div>
              <div className="text-xs text-slate-500 font-medium">{k.label}</div>
            </div>
          ))}
        </div>

        {/* ── 승인 대기 알림 (있을 때) ─────────────────────────────── */}
        {pendingPermits.length > 0 && (
          <div className="bg-white rounded-2xl border border-amber-300 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-amber-100 bg-amber-50">
              <span className="text-base">⚠️</span>
              <h2 className="text-sm font-bold text-amber-700">승인 대기 중인 허가서</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-200 text-amber-800">
                {pendingPermits.length}건
              </span>
              <span className="text-xs text-amber-500 ml-auto">즉시 검토 필요</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-amber-50 bg-amber-50">
                    {["허가서명", "유형", "현장명", "업체", "신청자", "작업기간", "조치"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-amber-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-50">
                  {pendingPermits.map((p) => (
                    <tr key={p.id} className="hover:bg-amber-50 transition-colors cursor-pointer"
                      onClick={() => router.push("/work-plan/permits")}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-slate-800 truncate max-w-44">{p.title || "(제목 없음)"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs">{WORK_PERMIT_TYPE_ICONS[p.type]}</span>
                        <span className="text-xs text-slate-500 ml-1">{WORK_PERMIT_TYPE_LABELS[p.type].replace(" 허가서", "").replace("작업", "")}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{p.siteName || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{p.contractor || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{p.requestedBy || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {p.startDate && p.endDate ? `${p.startDate} ~ ${p.endDate}` : p.startDate || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <ActionButton permitId={p.id} action="approved" label="승인" color="bg-emerald-500 hover:bg-emerald-600" />
                          <ActionButton permitId={p.id} action="conditionally_approved" label="조건부" color="bg-blue-500 hover:bg-blue-600" />
                          <ActionButton permitId={p.id} action="rejected" label="반려" color="bg-red-400 hover:bg-red-500" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 월 네비 + 간트 ───────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <button onClick={prevMonth} className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-100 font-medium transition-colors">◀ 이전</button>
            <span className="text-sm px-4 py-1.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 min-w-36 text-center">{monthLabel}</span>
            <button onClick={nextMonth} className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-100 font-medium transition-colors">다음 ▶</button>
          </div>
          <PermitGantt events={ganttEvents} cursor={cursor} />
        </div>

        {/* ── 전체 허가서 목록 ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* 섹션 헤더 + 필터 */}
          <div className="px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🔑</span>
                <h2 className="text-sm font-bold text-slate-700">전체 허가서 목록</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{filtered.length}건</span>
              </div>
              <Link href="/work-plan/permits" className="text-xs font-semibold transition-colors hover:underline" style={{ color: PRIMARY }}>
                허가서 작성 →
              </Link>
            </div>
            {/* 필터 바 */}
            <div className="flex gap-2 flex-wrap">
              {/* 검색 */}
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="허가서명 / 현장명 / 신청자 검색..."
                className="text-xs px-3 py-1.5 border border-slate-200 rounded-xl outline-none focus:border-orange-300 transition-colors flex-1 min-w-48"
              />
              {/* 상태 필터 */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as WorkPermitStatus | "all")}
                className="text-xs px-3 py-1.5 border border-slate-200 rounded-xl outline-none bg-white cursor-pointer"
              >
                <option value="all">전체 상태</option>
                {(Object.entries(WORK_PERMIT_STATUS_LABELS) as [WorkPermitStatus, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              {/* 유형 필터 */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as WorkPermitType | "all")}
                className="text-xs px-3 py-1.5 border border-slate-200 rounded-xl outline-none bg-white cursor-pointer"
              >
                <option value="all">전체 유형</option>
                {(Object.entries(WORK_PERMIT_TYPE_LABELS) as [WorkPermitType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-50 bg-slate-50">
                  {["허가서명", "유형", "현장명", "업체", "신청자", "작업기간", "상태", "조치"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center">
                      <p className="text-slate-400 text-sm mb-1">
                        {permits.length === 0 ? "등록된 허가서가 없습니다" : "검색 결과가 없습니다"}
                      </p>
                      {permits.length === 0 && (
                        <Link href="/work-plan/permits" className="text-xs font-semibold" style={{ color: PRIMARY }}>
                          첫 허가서 작성하기 →
                        </Link>
                      )}
                    </td>
                  </tr>
                ) : filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => router.push("/work-plan/permits")}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-800 truncate max-w-48">{p.title || "(제목 없음)"}</p>
                      {p.location && <p className="text-xs text-slate-400 mt-0.5 truncate">{p.location}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      <span className="mr-1">{WORK_PERMIT_TYPE_ICONS[p.type]}</span>
                      {WORK_PERMIT_TYPE_LABELS[p.type].replace(" 허가서", "").replace("작업", "")}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{p.siteName || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{p.contractor || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{p.requestedBy || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {p.startDate ? `${p.startDate}${p.endDate && p.endDate !== p.startDate ? ` ~ ${p.endDate}` : ""}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${STATUS_STYLE[p.status].badge}`}>
                        {WORK_PERMIT_STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {p.status === "pending" ? (
                        <div className="flex gap-1">
                          <ActionButton permitId={p.id} action="approved" label="승인" color="bg-emerald-500 hover:bg-emerald-600" />
                          <ActionButton permitId={p.id} action="rejected" label="반려" color="bg-red-400 hover:bg-red-500" />
                        </div>
                      ) : (
                        <button
                          onClick={() => { if (confirm("삭제하시겠습니까?")) deletePermit(p.id); }}
                          className="text-xs px-2 py-1 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          삭제
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 허가서 유형별 현황 ────────────────────────────────────── */}
        {permits.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">유형별 현황</h2>
            <div className="grid grid-cols-3 gap-3">
              {(Object.entries(WORK_PERMIT_TYPE_LABELS) as [WorkPermitType, string][]).map(([type, label]) => {
                const count = permits.filter((p) => p.type === type).length;
                if (count === 0) return null;
                const pct = Math.round((count / permits.length) * 100);
                return (
                  <div key={type} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-orange-200 transition-colors">
                    <span className="text-xl flex-shrink-0">{WORK_PERMIT_TYPE_ICONS[type]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xs font-medium text-slate-700 truncate">{label.replace(" 허가서", "")}</span>
                        <span className="text-xs font-bold text-slate-800 ml-1">{count}건</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: PRIMARY }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
