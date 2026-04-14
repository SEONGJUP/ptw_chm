"use client";
import React, { useState } from "react";
import Link from "next/link";
import {
  useWorkPermitStore,
  WorkPermit,
  WorkPermitType,
  WorkPermitStatus,
  WORK_PERMIT_TYPE_LABELS,
  WORK_PERMIT_TYPE_ICONS,
  WORK_PERMIT_STATUS_LABELS,
  PERMIT_SAFETY_CHECKLIST,
  COMMON_SAFETY_MEASURES,
  PERMIT_SIGNATURE_STAGES,
  PermitSignature,
  PermitApprovalDecision,
  PERMIT_SPECIFICS_FIELDS,
  CustomPermitType,
} from "@/store/workPermitStore";
const CONSTRUCTION_EQUIPMENT_TYPES = {
  truck:         { label: "트럭",           num: 1, icon: "🚛" },
  excavator:     { label: "굴착기",         num: 2, icon: "⛏️" },
  aerial_lift:   { label: "고소작업대",     num: 3, icon: "🪜" },
  crane:         { label: "크레인",         num: 4, icon: "🏗" },
  concrete_pump: { label: "콘크리트펌프카", num: 5, icon: "🪣" },
  pile_driver:   { label: "항타기",         num: 6, icon: "🔨" },
  forklift:      { label: "지게차",         num: 7, icon: "🔩" },
  loader:        { label: "로더",           num: 8, icon: "🏗️" },
  roller:        { label: "롤러",           num: 9, icon: "🛞" },
} as const;
import { buildMergedChecklist, GAS_STANDARDS } from "@/store/workPermitStore";
import { CHMPermitForm } from "@/components/work-permit/CHMPermitForm";

const PRIMARY = "#00B7AF";
const PRIMARY_LIGHT = "#E6FAF9";

const STATUS_STYLE: Record<WorkPermitStatus, { bg: string; text: string; border: string }> = {
  draft:                  { bg: "#f8fafc", text: "#64748b", border: "#e2e8f0" },
  pending:                { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  approved:               { bg: "#d1fae5", text: "#065f46", border: "#34d399" },
  conditionally_approved: { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
  rejected:               { bg: "#fee2e2", text: "#991b1b", border: "#f87171" },
  completed:              { bg: "#f0fdf4", text: "#166534", border: "#86efac" },
  expired:                { bg: "#f1f5f9", text: "#94a3b8", border: "#cbd5e1" },
};

// ── PermitCard (목록 카드) ─────────────────────────────────────
function PermitCard({ permit, onOpen, onDelete }: { permit: WorkPermit; onOpen: () => void; onDelete: () => void }) {
  const s = STATUS_STYLE[permit.status];
  const currentStage = permit.signatures.filter((sig) => sig.status === "signed").length;
  return (
    <div className="rounded-2xl border p-4 cursor-pointer hover:shadow-md transition-shadow" style={{ borderColor: s.border, background: s.bg }} onClick={onOpen}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xl">{WORK_PERMIT_TYPE_ICONS[permit.type]}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-slate-800 truncate">{permit.title || "(제목 없음)"}</p>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{WORK_PERMIT_TYPE_LABELS[permit.type]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: s.border + "44", color: s.text }}>
            {WORK_PERMIT_STATUS_LABELS[permit.status]}
          </span>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-slate-300 hover:text-red-400 text-sm">✕</button>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          {permit.siteName && <span>📍 {permit.siteName}</span>}
          {permit.startDate && <span>📅 {permit.startDate}</span>}
          {permit.workPlanTitle && <span className="text-teal-500">📋 계획서 연동</span>}
        </div>
        {/* 서명 진행 표시 */}
        <div className="flex items-center gap-0.5">
          {PERMIT_SIGNATURE_STAGES.map((s) => {
            const sig = permit.signatures.find((sg) => sg.stage === s.stage);
            const done = sig?.status === "signed";
            return (
              <div key={s.stage} className="w-2 h-2 rounded-full" style={{ background: done ? "#10b981" : "#e2e8f0" }} title={s.role} />
            );
          })}
          <span className="text-xs text-slate-400 ml-1">{currentStage}/5</span>
        </div>
      </div>
    </div>
  );
}

// ── 3-state 체크리스트 테이블 ──────────────────────────────────
const CHECK_STATES = [
  { val: "양호",   bg: "#f0fdf4", activeBg: "#10b981", activeText: "white", borderColor: "#10b981", label: "양호" },
  { val: "불량",   bg: "#fff1f2", activeBg: "#ef4444", activeText: "white", borderColor: "#ef4444", label: "불량" },
  { val: "해당없음", bg: "#f8fafc", activeBg: "#94a3b8", activeText: "white", borderColor: "#94a3b8", label: "해당없음" },
] as const;

function ChecklistTable({
  items, checklist, onSet,
}: {
  items: string[];
  checklist: Record<string, string>;
  onSet: (item: string, val: "양호" | "불량" | "해당없음" | "") => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
      {items.map((item) => {
        const cur = checklist[item] ?? "";
        const stateInfo = CHECK_STATES.find((s) => s.val === cur);
        return (
          <div
            key={item}
            className="flex items-center gap-3 px-4 py-2"
            style={{ background: stateInfo?.bg ?? "white" }}
          >
            <span className="flex-1 text-sm" style={{ color: cur ? "#334155" : "#94a3b8" }}>{item}</span>
            <div className="flex gap-1 flex-shrink-0">
              {CHECK_STATES.map(({ val, activeBg, activeText, borderColor, label }) => {
                const active = cur === val;
                return (
                  <button
                    key={val}
                    onClick={() => onSet(item, active ? "" : val)}
                    className="px-2 py-0.5 rounded-full text-xs font-semibold border transition-all"
                    style={{
                      background: active ? activeBg : "white",
                      color: active ? activeText : "#94a3b8",
                      borderColor: active ? borderColor : "#e2e8f0",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 기타 직접입력 체크항목 ──────────────────────────────────────
function CustomChecklistSection({
  items, checklist, onSetValue, onAdd, onRemove, checkedCount,
}: {
  items: string[];
  checklist: Record<string, string>;
  onSetValue: (item: string, val: "양호" | "불량" | "해당없음" | "") => void;
  onAdd: (label: string) => void;
  onRemove: (item: string) => void;
  checkedCount: number;
}) {
  const [input, setInput] = useState("");

  const handleAdd = () => {
    if (!input.trim()) return;
    onAdd(input);
    setInput("");
  };

  return (
    <div className="mb-6">
      <p className="text-xs font-bold text-slate-600 mb-2">
        ➕ 기타 직접입력 항목
        {items.length > 0 && (
          <span className="text-slate-400 font-normal ml-1">({checkedCount}/{items.length})</span>
        )}
      </p>

      {/* 기존 커스텀 항목들 */}
      {items.length > 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 overflow-hidden divide-y divide-slate-100 mb-2">
          {items.map((item) => {
            const cur = checklist[item] ?? "";
            const stateInfo = CHECK_STATES.find((s) => s.val === cur);
            return (
              <div key={item} className="flex items-center gap-3 px-4 py-2 transition-colors"
                style={{ background: stateInfo?.bg ?? "white" }}>
                <span className="flex-1 text-sm" style={{ color: cur ? "#334155" : "#94a3b8" }}>{item}</span>
                <div className="flex gap-1 flex-shrink-0">
                  {CHECK_STATES.map(({ val, activeBg, activeText, borderColor, label }) => {
                    const active = cur === val;
                    return (
                      <button key={val} onClick={() => onSetValue(item, active ? "" : val)}
                        className="px-2 py-0.5 rounded-full text-xs font-semibold border transition-all"
                        style={{ background: active ? activeBg : "white", color: active ? activeText : "#94a3b8", borderColor: active ? borderColor : "#e2e8f0" }}
                      >{label}</button>
                    );
                  })}
                </div>
                <button onClick={() => onRemove(item)} className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0 text-xs" title="항목 삭제">✕</button>
              </div>
            );
          })}
        </div>
      )}

      {/* 새 항목 추가 입력 */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
          placeholder="체크 항목 직접 입력 후 Enter 또는 추가 클릭"
          className="flex-1 px-3 py-2 border border-dashed border-slate-300 rounded-xl text-sm outline-none focus:border-teal-400 bg-slate-50"
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          className="px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all flex-shrink-0"
          style={{ background: input.trim() ? PRIMARY : "#cbd5e1", cursor: input.trim() ? "pointer" : "not-allowed" }}
        >
          추가
        </button>
      </div>
    </div>
  );
}

// ── 허가서 유형 그리드 선택기 ────────────────────────────────────
const ALL_PERMIT_TYPES = Object.keys(WORK_PERMIT_TYPE_LABELS) as WorkPermitType[];

function PermitTypeGrid({
  permit,
  upd,
  updatePermit,
  addExtraType,
  customTypes,
  selectedCustomIds,
  onToggleCustom,
}: {
  permit: WorkPermit;
  upd: (key: keyof WorkPermit, val: unknown) => void;
  updatePermit: (id: string, data: Partial<WorkPermit>) => void;
  addExtraType: (t: WorkPermitType) => void;
  customTypes: CustomPermitType[];
  selectedCustomIds: string[];
  onToggleCustom: (id: string) => void;
}) {
  const customNames = permit.customTypeName
    ? permit.customTypeName.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const hasCustomNames = customNames.length > 0;
  const [showCustomInput, setShowCustomInput] = useState(hasCustomNames);
  const [customTypeInput, setCustomTypeInput] = useState("");
  const allTypes = [permit.type, ...(permit.extraTypes ?? [])];

  const toggle = (t: WorkPermitType) => {
    if (allTypes.includes(t)) {
      if (allTypes.length === 1) return;
      if (t === permit.type) {
        const extras = permit.extraTypes ?? [];
        updatePermit(permit.id, { type: extras[0], extraTypes: extras.slice(1) });
      } else {
        updatePermit(permit.id, { extraTypes: (permit.extraTypes ?? []).filter((x) => x !== t) });
      }
    } else {
      addExtraType(t);
    }
  };

  const clearAll = () => updatePermit(permit.id, { type: "general", extraTypes: [], customTypeName: "", customTypeIds: [] });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-500">
          허가서 유형 선택 (복수 선택 가능)
          <span className="ml-1 text-slate-400">· 첫 번째가 주 유형</span>
        </p>
        {(allTypes.length > 1 || permit.customTypeName) && (
          <button onClick={clearAll} className="text-xs text-slate-400 hover:text-red-400 transition-colors">
            전체 해제
          </button>
        )}
      </div>

      {/* 유형 그리드 */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {ALL_PERMIT_TYPES.map((t, idx) => {
          const sel = allTypes.includes(t);
          const selOrder = allTypes.indexOf(t) + 1;
          return (
            <button
              key={t}
              onClick={() => toggle(t)}
              className="relative flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border-2 text-center transition-all hover:shadow-sm"
              style={{
                borderColor: sel ? PRIMARY : "#e2e8f0",
                background: sel ? PRIMARY_LIGHT : "white",
                color: sel ? PRIMARY : "#475569",
              }}
            >
              {sel && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white flex items-center justify-center font-bold"
                  style={{ background: PRIMARY, fontSize: "0.6rem" }}
                >
                  {selOrder}
                </span>
              )}
              <span className="text-xl leading-none">{WORK_PERMIT_TYPE_ICONS[t]}</span>
              <span className="text-xs font-bold leading-none" style={{ color: sel ? PRIMARY : "#94a3b8" }}>
                {idx + 1}.
              </span>
              <span
                className="leading-tight font-medium text-center"
                style={{ fontSize: "0.65rem", lineHeight: 1.2, color: sel ? PRIMARY : "#64748b", wordBreak: "keep-all", maxWidth: 64 }}
              >
                {WORK_PERMIT_TYPE_LABELS[t].replace(" 허가서", "").replace("야간·조출·단시간 작업", "야간·조출\n단시간")}
              </span>
            </button>
          );
        })}

        {/* 사용자 정의 유형 타일들 */}
        {customTypes.map((ct) => {
          const sel = selectedCustomIds.includes(ct.id);
          return (
            <button
              key={ct.id}
              onClick={() => onToggleCustom(ct.id)}
              className="relative flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border-2 text-center transition-all hover:shadow-sm"
              style={{
                borderColor: sel ? PRIMARY : "#e2e8f0",
                background: sel ? PRIMARY_LIGHT : "white",
                color: sel ? PRIMARY : "#475569",
              }}
            >
              {sel && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white flex items-center justify-center font-bold"
                  style={{ background: PRIMARY, fontSize: "0.6rem" }}
                >✓</span>
              )}
              <span className="text-xl leading-none">{ct.icon}</span>
              <span
                className="leading-tight font-medium text-center"
                style={{ fontSize: "0.65rem", lineHeight: 1.2, color: sel ? PRIMARY : "#64748b", wordBreak: "keep-all", maxWidth: 64 }}
              >{ct.label}</span>
              <span className="text-xs px-1 rounded" style={{ fontSize: 8, background: sel ? `${PRIMARY}20` : "#e0f2fe", color: sel ? PRIMARY : "#0369a1" }}>커스텀</span>
            </button>
          );
        })}

        {/* 기타 직접입력 타일 */}
        <button
          onClick={() => setShowCustomInput((v) => !v)}
          className="relative flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border-2 text-center transition-all hover:shadow-sm"
          style={{
            borderColor: (showCustomInput || hasCustomNames) ? PRIMARY : "#e2e8f0",
            background: (showCustomInput || hasCustomNames) ? PRIMARY_LIGHT : "white",
            color: (showCustomInput || hasCustomNames) ? PRIMARY : "#475569",
          }}
        >
          {hasCustomNames && (
            <span
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white flex items-center justify-center font-bold"
              style={{ background: PRIMARY, fontSize: "0.6rem" }}
            >{customNames.length}</span>
          )}
          <span className="text-xl leading-none">🔧</span>
          <span className="text-xs font-bold leading-none" style={{ color: (showCustomInput || hasCustomNames) ? PRIMARY : "#94a3b8" }}>
            {ALL_PERMIT_TYPES.length + 1}.
          </span>
          <span
            className="leading-tight font-medium"
            style={{ fontSize: "0.65rem", lineHeight: 1.2, color: (showCustomInput || hasCustomNames) ? PRIMARY : "#64748b" }}
          >기타</span>
        </button>
      </div>

      {/* 기타 직접입력 영역 */}
      {showCustomInput && (
        <div className="mt-2 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 space-y-2" style={{ background: "#fafafa" }}>
          {customNames.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {customNames.map((name) => (
                <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: "white", color: PRIMARY, border: `1px solid ${PRIMARY}55` }}>
                  🔧 {name}
                  <button
                    onClick={() => {
                      const next = customNames.filter((n) => n !== name);
                      upd("customTypeName", next.join(", "));
                    }}
                    className="ml-0.5 hover:text-red-400 transition-colors leading-none"
                  >×</button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={customTypeInput}
              onChange={(e) => setCustomTypeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const trimmed = customTypeInput.trim();
                  if (!trimmed || customNames.includes(trimmed)) return;
                  upd("customTypeName", [...customNames, trimmed].join(", "));
                  setCustomTypeInput("");
                }
              }}
              placeholder="작업유형 입력 후 Enter 또는 추가 (예: 도장작업, 비계설치, 해체작업)"
              className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-teal-400 bg-white"
            />
            <button
              onClick={() => {
                const trimmed = customTypeInput.trim();
                if (!trimmed || customNames.includes(trimmed)) return;
                upd("customTypeName", [...customNames, trimmed].join(", "));
                setCustomTypeInput("");
              }}
              disabled={!customTypeInput.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex-shrink-0"
              style={{ background: customTypeInput.trim() ? PRIMARY : "#cbd5e1" }}
            >추가</button>
          </div>
        </div>
      )}

    </div>
  );
}

// ── 투입 장비 선택 ─────────────────────────────────────────────
const EQ_ENTRIES = Object.entries(CONSTRUCTION_EQUIPMENT_TYPES) as [string, { label: string; num: number; icon: string }][];

function EquipmentPicker({
  selected, customList, onToggle, onCustomAdd, onCustomRemove,
}: {
  selected: string[];
  customList: string[];
  onToggle: (key: string) => void;
  onCustomAdd: (v: string) => void;
  onCustomRemove: (v: string) => void;
}) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const handleAdd = () => {
    const trimmed = customInput.trim();
    if (!trimmed || customList.includes(trimmed)) return;
    onCustomAdd(trimmed);
    setCustomInput("");
  };

  const hasCustom = customList.length > 0;

  return (
    <div>
      {/* 9종 + 기타 그리드 */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {EQ_ENTRIES.map(([key, info]) => {
          const sel = selected.includes(key);
          return (
            <button
              key={key}
              onClick={() => onToggle(key)}
              className="relative flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border-2 text-center transition-all hover:shadow-sm"
              style={{ borderColor: sel ? PRIMARY : "#e2e8f0", background: sel ? PRIMARY_LIGHT : "white" }}
            >
              {sel && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white flex items-center justify-center font-bold"
                  style={{ background: PRIMARY, fontSize: "0.6rem" }}>
                  {selected.indexOf(key) + 1}
                </span>
              )}
              <span className="text-xl leading-none">{info.icon}</span>
              <span className="text-xs font-bold leading-none" style={{ color: sel ? PRIMARY : "#94a3b8" }}>{info.num}.</span>
              <span className="leading-tight font-medium text-center"
                style={{ fontSize: "0.65rem", lineHeight: 1.2, color: sel ? PRIMARY : "#64748b", wordBreak: "keep-all", maxWidth: 64 }}>
                {info.label.replace(" (이동식 포함)", "").replace(" (덤프트럭 등)", "")}
              </span>
            </button>
          );
        })}
        {/* 기타 타일 */}
        <button
          onClick={() => setShowCustomInput((v) => !v)}
          className="relative flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border-2 text-center transition-all hover:shadow-sm"
          style={{ borderColor: (showCustomInput || hasCustom) ? PRIMARY : "#e2e8f0", background: (showCustomInput || hasCustom) ? PRIMARY_LIGHT : "white" }}
        >
          {hasCustom && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white flex items-center justify-center font-bold"
              style={{ background: PRIMARY, fontSize: "0.6rem" }}>
              {customList.length}
            </span>
          )}
          <span className="text-xl leading-none">🔧</span>
          <span className="text-xs font-bold leading-none" style={{ color: (showCustomInput || hasCustom) ? PRIMARY : "#94a3b8" }}>{EQ_ENTRIES.length + 1}.</span>
          <span className="leading-tight font-medium" style={{ fontSize: "0.65rem", lineHeight: 1.2, color: (showCustomInput || hasCustom) ? PRIMARY : "#64748b" }}>기타</span>
        </button>
      </div>

      {/* 기타 직접입력 영역 */}
      {showCustomInput && (
        <div className="mt-2 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 space-y-2" style={{ background: "#fafafa" }}>
          {/* 추가된 기타 항목 */}
          {customList.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {customList.map((item) => (
                <span key={item} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: "white", color: PRIMARY, border: `1px solid ${PRIMARY}55` }}>
                  🔧 {item}
                  <button onClick={() => onCustomRemove(item)} className="ml-0.5 hover:text-red-400 transition-colors leading-none">×</button>
                </span>
              ))}
            </div>
          )}
          {/* 입력 */}
          <div className="flex gap-2">
            <input
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
              placeholder="장비명 입력 후 Enter 또는 추가 (예: 고소작업차, 지게차)"
              className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-teal-400 bg-white"
            />
            <button
              onClick={handleAdd}
              disabled={!customInput.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex-shrink-0"
              style={{ background: customInput.trim() ? PRIMARY : "#cbd5e1" }}
            >추가</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 섹션 헤더 ─────────────────────────────────────────────────
function SectionHeader({ icon, title, badge }: { icon: string; title: string; badge?: string }) {
  return (
    <div className="ptw-section-card-header">
      <span className="text-base">{icon}</span>
      <span>{title}</span>
      {badge && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium ml-1">{badge}</span>}
    </div>
  );
}

// ── 작업허가서 인쇄 ───────────────────────────────────────────
function printPermitForm(permit: WorkPermit) {
  const sp = permit.specifics ?? {};
  const g = (k: string) => sp[`chm_${k}`] ?? "";
  const sw: Record<string, boolean> = (() => { try { return JSON.parse(g("safetyWorks")) || {}; } catch { return {}; } })();
  const appOX: Record<string, string> = (() => { try { return JSON.parse(g("hw_appOX")) || {}; } catch { return {}; } })();
  const permitOX: Record<string, string> = (() => { try { return JSON.parse(g("hw_permitOX")) || {}; } catch { return {}; } })();
  const eduRows: { org: string; name: string; job: string; signature: string }[] =
    (() => { try { return JSON.parse(g("eduRows")) || []; } catch { return []; } })();
  const workerRows: { name: string; org: string }[] =
    (() => { try { return JSON.parse(g("hw_workerRows")) || []; } catch { return []; } })();
  const hwWorkTypes: string[] = (() => { try { return JSON.parse(g("hw_workTypes")) || []; } catch { return []; } })();

  const isHot      = !!sw.hotWork;
  const isConfined = !!sw.confinedSpace;
  const isHeight   = !!sw.heightWork;
  const hasExt     = g("hasExtension") === "true";
  const workCat    = g("workCategory");

  const dayMap: Record<string, string> = { "0": "일", "1": "월", "2": "화", "3": "수", "4": "목", "5": "금", "6": "토" };
  const fmtDate = (d: string) => {
    if (!d) return "____년 __월 __일";
    const dt = new Date(d);
    const day = dayMap[String(dt.getDay())];
    return `${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${dt.getDate()}일 (${day})`;
  };

  const sigImg = (key: string) =>
    g(key) ? `<img src="${g(key)}" style="height:28px;max-width:80px;object-fit:contain;" />` : "";

  const personCell = (nameKey: string, orgKey: string, sigKey: string) => `
    <td style="text-align:center;padding:2px 4px;font-size:8pt;">
      ${g(orgKey) ? `<div style="font-size:7pt;color:#555">${g(orgKey)}</div>` : ""}
      <div>${g(nameKey) || "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"}</div>
      <div>${sigImg(sigKey)}</div>
    </td>`;

  // ── OX 체크 결과 표시
  const ox = (val: string) => val === "O" ? "○" : val === "X" ? "×" : "";

  // ── 안전조치 체크리스트
  const SAFETY_ITEMS = [
    { key: "privacy",   label: "비밀/보안준수",  detail: "비밀/보안준수 서약서는 승인을 득하였는가?" },
    { key: "ppe",       label: "안전보호구",     detail: "□안전모 □안전화 □안전벨트 □방진마스크 □보안경 □기타(  )" },
    { key: "signs",     label: "경고표지판",     detail: "작업안내표지판, 작업 위험표지판(전기/고소)은 설치하였는가?" },
    { key: "fireExt",   label: "소화기비치",     detail: "작업장에 적정 소화기를 배치하였는가?" },
    { key: "hotWork2",  label: "화기작업",       detail: "용접작업 시 불꽃방지망/방염포 등을 설치하였는가?" },
    { key: "hazard",    label: "유해/위험요인",  detail: "작업에 따른 유해/위험요인에 대한 내용을 전달받았는가?" },
    { key: "material",  label: "자재 양중",      detail: "자재 양중 장소, 이동경로 및 일정협의는 완료되었는가?" },
    { key: "extend",    label: "작업기간 연장",  detail: "작업기간 및 시간 연장 시 이에 대한 확인을 하고 명시하였는가?" },
    { key: "safetyEdu", label: "안전작업",       detail: "작업자 안전작업 관련 특별교육 이수 여부" },
  ];

  const HOT_APP = [
    "작업구역 설정 및 출입제한 조치 여부",
    "작업에 맞는 보호구 착용 여부",
    "작업구역 내 가스농도 측정 및 잔류물질 확인 여부",
    "작업구역 11m 內 인화성 및 가연성 물질 제거상태",
    "인화성 물질 취급 작업과 동시작업 유무",
    "불티 비산방지조치(불티차단막/방화포 등) 실시 여부",
    "작업지점 5m 이내 소화기 비치 여부",
    "교육 실시 여부(소방시설 사용법, 피난로 위치, 초기대응체계 등)",
    { confined: "밀폐공간 관계자 외 출입제한 여부" },
    { confined: "밀폐공간 작업에 필요한 보호구 착용 여부" },
    { confined: "밀폐공간의 환기 설비 설치 여부" },
    { confined: "작업자의 개인통신장비 및 휴대용 산소농도측정기 착용 여부" },
    { confined: "구조장비(구급함/구명줄/삼각대 등) 준비 여부" },
    { confined: "가스 및 산소농도 측정 여부" },
    { confined: "전화하면 5분이내 구조할 수 있는 위치에 구조팀 대기" },
    { confined: `필요한 구조팀 담당자 성명: ${g("hw_er_contact_name") || "___"}` },
  ] as (string | { confined: string })[];

  const HOT_PERMIT = [
    "화기작업 허가서 발급 및 비치 여부",
    "화재감시자 배치 여부",
    "작업구역 설정 및 출입제한 조치 여부",
    "작업에 맞는 보호구 착용 여부",
    "작업구역 내 가스농도 측정 및 잔류물질 확인 여부",
    "작업구역 11m 內 인화성 및 가연성 물질 제거상태",
    "인화성 물질 취급 작업과 동시작업 유무",
    "불티 비산방지조치(불티차단막/방화포 등) 실시 여부",
    "작업지점 5m 이내 소화기 비치 여부",
    "교육 실시 여부(소방시설 사용법, 피난로 위치, 초기대응체계 등)",
    { confined: "밀폐공간 관계자 외 출입제한 여부" },
    { confined: "밀폐공간 작업에 필요한 보호구 착용 여부" },
    { confined: "밀폐공간의 환기 설비 설치 여부" },
    { confined: "작업자의 개인통신장비 및 휴대용 산소농도측정기 착용 여부" },
    { confined: "구조장비(구급함/구명줄/삼각대 등) 준비 여부" },
    { confined: "가스 및 산소농도 측정 여부" },
    { confined: "전화하면 5분이내 구조할 수 있는 위치에 구조팀 대기" },
    { confined: `필요한 구조팀 담당자 성명: ${g("hw_er_contact_name") || "___"}` },
  ] as (string | { confined: string })[];

  const HEIGHT_CHECKLIST = [
    { section: "작업시작 전 점검사항(작업장비의 작동상태점검)", items: [
      "비상정지장치 및 비상 하강 방지장치 기능의 이상 유무",
      "과부하 방지 장치의 작동 유무(와이어로프 또는 체인구동방식의 경우)",
      "아웃트리거 또는 바퀴의 이상 유무",
      "작업면의 기울기 또는 요철 유무",
      "활선 작업용 장치의 경우 홈·균열·파손 등 그 밖의 손상 유무",
    ]},
    { section: "작업 시 준수사항", items: [
      "바닥 면과 고소작업대가 수평을 유지하는가?",
      "작업자가 안전모·안전대 등의 보호구를 착용하였는가?",
      "관계자가 아닌 사람이 작업 구역에 들어오지 못하도록 조치하였는가?",
    ]},
    { section: "이동 시 준수사항", items: [
      "작업대를 가장 낮게 내릴 것",
      "작업대를 올린 상태에서 작업자를 태우고 이동하지 말 것",
      "이동 통로의 요철 상태 또는 장애물의 유무 등을 확인할 것",
    ]},
  ];

  const safetySubTypes = ["hotWork:발화(화기)", "confinedSpace:밀폐", "heightWork:고소", "crane:크레인", "electrical:전기"];
  const workTypeSectionHtml = () => {
    const chk = (active: boolean) => `<span style="font-size:12pt;">${active ? "☑" : "☐"}</span>`;
    const subLine = safetySubTypes.map(s => {
      const [key, label] = s.split(":");
      return `${workCat === "safety" && !!sw[key] ? "☑" : "☐"} ${label}`;
    }).join("&ensp;");
    return `
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="border:1px solid #aaa;text-align:center;padding:5px 4px;width:20%;">
            <div style="font-weight:bold;font-size:8.5pt;margin-bottom:3px;">특별작업</div>
            ${chk(workCat === "special")}
          </td>
          <td style="border:1px solid #aaa;padding:5px 8px;width:60%;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-weight:bold;font-size:8.5pt;">안전작업</span>
              ${chk(workCat === "safety")}
            </div>
            <div style="font-size:8pt;margin-top:4px;color:#333;">${subLine}</div>
          </td>
          <td style="border:1px solid #aaa;text-align:center;padding:5px 4px;width:20%;">
            <div style="font-weight:bold;font-size:8.5pt;margin-bottom:3px;">일반작업</div>
            ${chk(workCat === "general")}
          </td>
        </tr>
      </table>`;
  };

  const checklistRows = (items: (string | { confined: string })[], oxData: Record<string, string>) => {
    let mainCount = 0; let confCount = 0; let inConf = false;
    let rows = "";
    items.forEach((item, i) => {
      const isConf = typeof item === "object";
      const text = isConf ? item.confined : item;
      const val = ox(oxData[i] ?? "");
      if (!inConf && isConf) {
        inConf = true;
        rows += `<tr><td colspan="2" style="background:#e8f0fe;font-size:7.5pt;font-weight:bold;padding:2px 6px;border:1px solid #000;">밀폐공간 작업 시 (체크)</td><td style="text-align:center;border:1px solid #000;">${val}</td></tr>`;
        confCount++;
      } else {
        const num = isConf ? ++confCount + 8 : ++mainCount;
        rows += `<tr><td style="padding:2px 6px;border:1px solid #000;font-size:8pt;">${num}. ${text}</td><td style="text-align:center;border:1px solid #000;width:40px;font-size:10pt;">${val}</td></tr>`;
      }
    });
    return rows;
  };

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>작업허가증 - ${permit.title || "(제목 없음)"}</title>
<style>
  @page { size: A4; margin: 8mm 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; font-size: 9pt; color: #000; background: white; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #000; padding: 3px 5px; vertical-align: middle; }
  .section { margin-bottom: 4px; }
  .section-title { font-weight: bold; font-size: 9pt; margin: 6px 0 2px; }
  .th-label { background: #f0f0f0; font-weight: bold; text-align: center; white-space: nowrap; width: 70px; }
  .th-label-wide { background: #f0f0f0; font-weight: bold; text-align: center; white-space: nowrap; width: 90px; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .sig-area { text-align: center; min-height: 34px; }
  .page-break { page-break-before: always; }
  .rotated { writing-mode: vertical-rl; transform: rotate(180deg); text-align: center; font-weight: bold; font-size: 8pt; white-space: nowrap; }
  .sub-section-hd { background: #dde7f5; font-weight: bold; font-size: 8pt; text-align: center; padding: 2px; }
</style>
</head>
<body>

<!-- ══════ 메인 허가증 ══════ -->
<table style="margin-bottom:3px;border:none;">
  <tr>
    <td style="border:none;width:65%;vertical-align:bottom;">
      <div style="font-size:20pt;font-weight:bold;letter-spacing:10px;text-align:center;">작 업 허 가 증</div>
      <div style="text-align:center;font-size:9pt;">(Work Permit)</div>
    </td>
    <td style="border:none;width:35%;text-align:right;vertical-align:top;">
      <div style="font-size:18pt;font-weight:bold;color:#e05a2b;letter-spacing:2px;">CHM</div>
      <div style="font-size:8pt;">(주)씨에이치엠</div>
    </td>
  </tr>
</table>

<!-- 1. 작업개요 -->
<div class="section-title">1. 작업개요&nbsp;&nbsp;<span style="float:right;font-weight:normal;font-size:8pt;">문서번호: ${g("hw_permitNo") || "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"}</span></div>
<table class="section">
  <tr>
    <td class="th-label">작업 일자</td>
    <td colspan="3">${fmtDate(permit.startDate)} ~ ${fmtDate(permit.endDate)}&nbsp;&nbsp;작업예정시간: ${permit.startTime || "__"}:__ ~ ${permit.endTime || "__"}:__</td>
  </tr>
  <tr>
    <td class="th-label">작업 장소</td>
    <td colspan="3">${permit.location || permit.siteName || "&nbsp;"}</td>
  </tr>
  <tr>
    <td class="th-label">작업 내용</td>
    <td colspan="3" style="min-height:36px;">${permit.description || "&nbsp;"}</td>
  </tr>
  <tr>
    <td class="th-label">작업 종류</td>
    <td colspan="3" style="padding:4px;">${workTypeSectionHtml()}</td>
  </tr>
  <tr>
    <td class="th-label" rowspan="2">발주처 / 시공사</td>
    <td style="width:70px;text-align:center;font-weight:bold;font-size:8pt;background:#f8f8f8;">입주사 관리자</td>
    <td>소속: ${g("ap1_client_org") || "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"}&nbsp; 성명: ${g("ap1_client_name") || "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"}&nbsp; ☎ ${g("ap1_client_tel") || "___"}</td>
    <td class="sig-area" style="width:80px;">${sigImg("ap1_client_sigImg") || "(서명)"}</td>
  </tr>
  <tr>
    <td style="width:70px;text-align:center;font-weight:bold;font-size:8pt;background:#f8f8f8;">시공사<br>안전관리자</td>
    <td>소속: ${g("ap1_contractor_org") || "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"}&nbsp; 성명: ${g("ap1_contractor_name") || "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"}&nbsp; ☎ ${g("ap1_contractor_tel") || "___"}</td>
    <td class="sig-area" style="width:80px;">${sigImg("ap1_contractor_sigImg") || "(서명)"}</td>
  </tr>
</table>

<!-- 2. 작업허가 승인 전 안전조치 확인 -->
<div class="section-title">2. 작업허가 승인 전 안전조치 확인</div>
<table class="section">
  <tr>
    <th class="th-label-wide" style="width:80px;">구분</th>
    <th>작업 전 안전조치사항</th>
    <th style="width:60px;">작업감독자</th>
  </tr>
  ${SAFETY_ITEMS.map(item => {
    const val = permit.safetyChecklist?.[item.key];
    const mark = val === "양호" ? "✓" : val === "불량" ? "✗" : val === "해당없음" ? "—" : "";
    return `<tr>
      <td class="th-label" style="text-align:center;">${item.label}</td>
      <td>${item.detail}</td>
      <td class="center">${mark}</td>
    </tr>`;
  }).join("")}
  <tr>
    <td colspan="2" style="padding:2px;">
      <table style="border:none;width:100%;"><tr>
        <td style="border:none;font-weight:bold;font-size:8pt;width:120px;">시공사 작업감독자 (서명)</td>
        <td class="sig-area" style="border:none;">${sigImg("ap1_contractor_sigImg") || g("ap1_contractor_name") || "(서명)"}</td>
        <td style="border:none;text-align:center;font-size:8pt;width:80px;font-weight:bold;">안전담당자</td>
        <td class="sig-area" style="border:none;">${sigImg("ap2_safety_sigImg") || g("ap2_safety_name") || "(서명)"}</td>
        <td style="border:none;text-align:center;font-size:8pt;width:80px;font-weight:bold;">SHE관리원</td>
        <td class="sig-area" style="border:none;">${sigImg("ap2_she_sigImg") || g("ap2_she_name") || "(서명)"}</td>
      </tr></table>
    </td>
    <td class="center" style="font-size:8pt;">확인</td>
  </tr>
</table>

<!-- 3. 작업허가 승인 -->
<div class="section-title">3. 작업허가 승인 <span style="font-size:7.5pt;font-weight:normal;">(승인권자 부재 시 사전에 위임된 대리 승인권자가 승인)</span></div>
<table class="section">
  <tr>
    <td class="th-label">작업허가 승인</td>
    <td>결재 결과:&nbsp;
      ${permit.approvalDecision === "approved" ? "<b>✅ 승인</b>" :
        permit.approvalDecision === "conditionally_approved" ? "<b>⚠️ 조건부 승인</b>" :
        permit.approvalDecision === "rejected" ? "<b>❌ 반려</b>" : "(미결재)"}
      ${permit.approvalConditions ? `<br><span style="font-size:7.5pt;">조건: ${permit.approvalConditions}</span>` : ""}
    </td>
    <td style="width:80px;font-weight:bold;font-size:8pt;text-align:center;">관리소장</td>
    <td class="sig-area" style="width:80px;">${sigImg("ap3_manager_sigImg") || g("ap3_manager_name") || "(서명)"}</td>
  </tr>
  ${hasExt ? `<tr>
    <td class="th-label">작업허가 연장</td>
    <td>연장기간: ${g("extensionPeriod") || "___"}&nbsp;&nbsp;사유: ${g("extensionReason") || "___"}</td>
    <td style="width:80px;font-weight:bold;font-size:8pt;text-align:center;">관리소장(연장)</td>
    <td class="sig-area" style="width:80px;">${sigImg("ap31_manager_sigImg") || g("ap31_manager_name") || "(서명)"}</td>
  </tr>
  <tr>
    <td class="th-label"></td>
    <td></td>
    <td style="width:80px;font-weight:bold;font-size:8pt;text-align:center;">안전담당자(연장)</td>
    <td class="sig-area" style="width:80px;">${sigImg("ap31_safety_sigImg") || g("ap31_safety_name") || "(서명)"}</td>
  </tr>` : ""}
</table>

<!-- 4. 작업자 안전교육 -->
<div class="section-title">4. 작업자 안전교육&nbsp;&nbsp;<span style="font-size:8pt;font-weight:normal;">교육담당자: ${g("eduTrainer_name") || "___"}</span></div>
<table class="section">
  <tr>
    <td class="th-label">교육 내용</td>
    <td colspan="5">${g("eduContent") || "&nbsp;"}</td>
  </tr>
  <tr>
    <th class="th-label">소속</th>
    <th>성명</th>
    <th>직종</th>
    <th class="center" style="width:80px;">서명</th>
    <th class="th-label">소속</th>
    <th>성명</th>
  </tr>
  ${(() => {
    const rows: string[] = [];
    for (let i = 0; i < Math.max(eduRows.length, 4); i += 2) {
      const a = eduRows[i], b = eduRows[i + 1];
      rows.push(`<tr>
        <td style="font-size:8pt;">${a?.org || "&nbsp;"}</td>
        <td style="font-size:8pt;">${a?.name || "&nbsp;"}</td>
        <td style="font-size:8pt;">${a?.job || "&nbsp;"}</td>
        <td class="sig-area">&nbsp;</td>
        <td style="font-size:8pt;">${b?.org || "&nbsp;"}</td>
        <td style="font-size:8pt;">${b?.name || "&nbsp;"}</td>
      </tr>`);
    }
    return rows.join("");
  })()}
</table>

<!-- 5. 작업완료 확인 -->
<div class="section-title">5. 작업완료 확인</div>
<table class="section">
  <tr>
    <td style="width:120px;font-weight:bold;font-size:8pt;text-align:center;">현장소장 (시공사)</td>
    <td class="sig-area">${sigImg("ap4_site_sigImg") || g("ap4_site_name") || "(서명)"}</td>
    <td style="width:120px;font-weight:bold;font-size:8pt;text-align:center;">작업감독자 확인</td>
    <td class="sig-area">${sigImg("ap4_supervisor_sigImg") || g("ap4_supervisor_name") || "(서명)"}</td>
  </tr>
</table>

${isHot ? `
<!-- ══════ 화기취급작업 신청서 ══════ -->
<div class="page-break"></div>
<div class="section-title bold" style="font-size:13pt;text-align:center;margin-bottom:6px;">화기취급작업 신청서</div>
<table class="section">
  <tr>
    <td class="th-label" rowspan="2">허 가 사 항</td>
    <td>허가번호: ${g("hw_permitNo") || "___"}</td>
    <td>허가일자: ${fmtDate(permit.startDate)}</td>
  </tr>
  <tr>
    <td colspan="2">작업일시: ${fmtDate(permit.startDate)} ${permit.startTime || ""}:__ ~ ${permit.endTime || ""}:__</td>
  </tr>
  <tr>
    <td class="th-label">작 업 명<br>사용 장비</td>
    <td colspan="2">${g("hw_workDesc") || "&nbsp;"}</td>
  </tr>
  <tr>
    <td class="th-label">작 업 구 분</td>
    <td colspan="2">${["용접","용단","땜","연마","기타"].map(t => `${hwWorkTypes.includes(t) ? "☑" : "☐"} ${t}`).join("&nbsp;&nbsp;")}</td>
  </tr>
  <tr>
    <td class="th-label">작 업 구 역</td>
    <td colspan="2">${g("hw_zone") || "&nbsp;"}</td>
  </tr>
  <tr>
    <td class="th-label" rowspan="5">초기<br>대응<br>체계</td>
    <td colspan="2">
      <table style="border:none;width:100%;">
        <tr>
          <td colspan="3" style="border:none;text-align:center;font-weight:bold;font-size:8pt;background:#f5f5f5;padding:2px;">현장책임자</td>
        </tr>
        <tr>
          <td style="border:none;font-size:8pt;text-align:center;">성명: ${g("hw_er_chief_name") || "___"}</td>
          <td class="sig-area" style="border:none;">${sigImg("hw_er_chief_sigImg")}</td>
          <td style="border:none;font-size:8pt;text-align:center;">연락처: ${g("hw_er_chief_tel") || "___"}</td>
        </tr>
        <tr>
          <td style="border:none;text-align:center;font-weight:bold;font-size:8pt;background:#f5f5f5;padding:2px;">비상연락</td>
          <td style="border:none;text-align:center;font-weight:bold;font-size:8pt;background:#f5f5f5;padding:2px;">초기소화</td>
          <td style="border:none;text-align:center;font-weight:bold;font-size:8pt;background:#f5f5f5;padding:2px;">피난유도</td>
        </tr>
        ${["contact:비상연락","fire:초기소화","evac:피난유도"].map((r, i) => {
          const key = r.split(":")[0];
          return "";
        }).join("")}
        <tr>
          ${["contact","fire","evac"].map(k => `<td style="border:none;text-align:center;font-size:8pt;padding:2px;">
            성명: ${g(`hw_er_${k}_name`) || "___"}<br>
            ${sigImg(`hw_er_${k}_sigImg`)}<br>
            연락처: ${g(`hw_er_${k}_tel`) || "___"}
          </td>`).join("")}
        </tr>
      </table>
    </td>
  </tr>
</table>

<div class="section-title" style="margin-top:4px;">화기작업 체크리스트 (작업전)</div>
<table class="section">
  <tr>
    <th style="width:12px;padding:2px;" rowspan="${HOT_APP.length + 1}"><div class="rotated">화&nbsp;기&nbsp;작&nbsp;업&nbsp;자&nbsp;작&nbsp;성</div></th>
    <th style="width:30%;">점검 내용</th>
    <th style="width:40px;" class="center">결과<br>[○,×]</th>
  </tr>
  ${checklistRows(HOT_APP, appOX)}
</table>
<div style="text-align:right;font-size:8pt;margin-top:2px;">작업책임자 (서명): ${sigImg("ap11_chief_sigImg") || g("ap11_chief_name") || "___"}</div>

<!-- 화기취급작업 허가서 -->
<div class="page-break"></div>
<div style="font-size:7.5pt;margin-bottom:3px;">[본 화기작업 허가서는 반드시 작업현장에 게시하고 작업완료 후 소방안전관리자에게 반납해야 한다.]</div>
<div class="section-title bold" style="font-size:13pt;text-align:center;margin-bottom:6px;">화기취급작업 허가서</div>
<table class="section">
  <tr>
    <td class="th-label">허 가 사 항</td>
    <td>허가번호: ${g("hw_permitNo") || "___"}&nbsp;&nbsp;허가일자: ${fmtDate(permit.startDate)}</td>
    <td style="width:100px;text-align:center;font-weight:bold;font-size:8pt;">소방안전관리자</td>
    <td class="sig-area" style="width:80px;">${sigImg("ap11_fire_sigImg") || g("ap11_fire_name") || "(서명)"}</td>
  </tr>
  <tr>
    <td class="th-label">화재감시자</td>
    <td colspan="3">성명: ${g("ap11_watch_name") || "___"}&nbsp;&nbsp;서명: ${sigImg("ap11_watch_sigImg")}&nbsp;&nbsp;연락처: ${g("ap11_watch_tel") || "___"}</td>
  </tr>
  <tr>
    <td class="th-label">작 업 명</td>
    <td colspan="3">${g("hw_workDesc") || "&nbsp;"}</td>
  </tr>
  <tr>
    <td class="th-label">작 업 구 분</td>
    <td colspan="3">${["용접","용단","땜","연마","기타"].map(t => `${hwWorkTypes.includes(t) ? "☑" : "☐"} ${t}`).join("&nbsp;&nbsp;")}</td>
  </tr>
  <tr>
    <td class="th-label">작 업 구 역</td>
    <td colspan="3">${g("hw_zone") || "&nbsp;"}</td>
  </tr>
</table>

<div class="section-title" style="margin-top:4px;">화기작업 체크리스트 (작업중)</div>
<table class="section">
  <tr>
    <th style="width:12px;padding:2px;" rowspan="${HOT_PERMIT.length + 1}"><div class="rotated">소방안전관리자&nbsp;확&nbsp;인</div></th>
    <th>점검 내용</th>
    <th style="width:40px;" class="center">결과<br>[○,×]</th>
  </tr>
  ${checklistRows(HOT_PERMIT, permitOX)}
</table>
<table class="section" style="margin-top:4px;">
  <tr>
    <td class="th-label" rowspan="3" style="width:80px;">작업종료후<br>안전조치<br>(작업종료 후 작성→반납)</td>
    <td>1. 불티 잔존 여부(작업 종료 후 30분 후 확인)</td>
    <td class="sig-area" style="width:80px;" rowspan="3">${sigImg("ap11_chief_sigImg") || g("ap11_chief_name") || "(서명)"}</td>
  </tr>
  <tr><td>2. 전원차단 상태</td></tr>
  <tr><td>3. 인화성ㆍ가연성 물품의 보관상태</td></tr>
  <tr>
    <td colspan="2" style="font-weight:bold;text-align:right;font-size:8pt;">반 납 확 인&nbsp;&nbsp;소방안전관리자 (서명)</td>
    <td class="sig-area">${sigImg("ap11_fire_sigImg") || g("ap11_fire_name") || "(서명)"}</td>
  </tr>
</table>
` : ""}

${isHeight ? `
<!-- ══════ 고소작업대 작업 허가서 ══════ -->
<div class="page-break"></div>
<div class="section-title bold" style="font-size:13pt;text-align:center;text-decoration:underline;margin-bottom:6px;">고소작업대 작업 허가서</div>
<div class="section-title" style="font-size:8pt;">1. 작업 허가 승인 전 확인 사항: 장비 투입 전 작업수행부서 작업 감독이 확인 후 서명</div>
<table class="section">
  <tr><td colspan="4" style="background:#f0f0f0;font-weight:bold;font-size:8pt;">가. 작업 개요</td></tr>
  <tr>
    <td class="th-label" style="width:60px;">업 체 명</td>
    <td>${permit.contractor || "&nbsp;"}</td>
    <td class="th-label" style="width:70px;">작업 지휘자</td>
    <td>${g("ap13_foreman_name") || "&nbsp;"}</td>
  </tr>
  <tr>
    <td class="th-label" rowspan="2">운전자</td>
    <td>성명: ${g("aw_operatorName") || "&nbsp;"}</td>
    <td class="th-label">유도자(통제원)</td>
    <td>${g("ap13_watcher_name") || "&nbsp;"}</td>
  </tr>
  <tr>
    <td>자격(면허): ${g("aw_operatorLicense") || "&nbsp;"}</td>
    <td class="th-label">작업 장소</td>
    <td>${permit.location || "&nbsp;"}</td>
  </tr>
  <tr>
    <td class="th-label">작업내용</td>
    <td colspan="3">${permit.description || "&nbsp;"}</td>
  </tr>
  <tr><td colspan="4" style="background:#f0f0f0;font-weight:bold;font-size:8pt;">나. 장비 제원</td></tr>
  <tr>
    <td class="th-label">장비 종류</td>
    <td colspan="3">${["수직형","굴절형","직진붐형","직진Z형","궤도형"].map(t => {
      const sel = (g("aw_equipType") || "").includes(t);
      return `${sel ? "☑" : "☐"} ${t}`;
    }).join("&nbsp;&nbsp;")}</td>
  </tr>
  <tr>
    <td class="th-label">자체 중량</td>
    <td>${g("aw_specWeight") || "&nbsp;"} 톤</td>
    <td class="th-label">탑승기준인원</td>
    <td>${g("aw_specPersons") || "&nbsp;"} 인승</td>
  </tr>
  <tr>
    <td class="th-label">최대적재중량</td>
    <td>${g("aw_specMaxLoad") || "&nbsp;"} kg</td>
    <td class="th-label">최대작업높이</td>
    <td>${g("aw_specMaxHeight") || "&nbsp;"} m</td>
  </tr>
</table>

<div class="section-title" style="font-size:8pt;margin-top:4px;">2. 작업 허가 승인 후 안전조치 사항: 장비 투입 후 작업책임자가 확인 후 서명</div>
<table class="section">
  <tr>
    <th style="width:100px;">구 분</th>
    <th>조치 내용</th>
    <th style="width:36px;" class="center">양호</th>
    <th style="width:36px;" class="center">불량</th>
  </tr>
  ${HEIGHT_CHECKLIST.map((group, gi) => {
    let globalIdx = HEIGHT_CHECKLIST.slice(0, gi).reduce((s, g) => s + g.items.length, 0);
    return `<tr>
      <td style="background:#fef3c7;font-size:8pt;font-weight:bold;text-align:center;" rowspan="${group.items.length}">${group.section}</td>
      <td style="font-size:8pt;">${group.items[0]}</td>
      <td class="center">${permit.safetyChecklist?.[`aw_${globalIdx}`] === "양호" ? "✓" : ""}</td>
      <td class="center">${permit.safetyChecklist?.[`aw_${globalIdx}`] === "불량" ? "✓" : ""}</td>
    </tr>
    ${group.items.slice(1).map((item, j) => {
      const idx = globalIdx + j + 1;
      return `<tr>
        <td style="font-size:8pt;">${item}</td>
        <td class="center">${permit.safetyChecklist?.[`aw_${idx}`] === "양호" ? "✓" : ""}</td>
        <td class="center">${permit.safetyChecklist?.[`aw_${idx}`] === "불량" ? "✓" : ""}</td>
      </tr>`;
    }).join("")}`;
  }).join("")}
</table>
<div style="text-align:right;font-size:8pt;margin-top:3px;">작업책임자: ${g("ap13_chief_name") || "___"}&nbsp;&nbsp;(서명)&nbsp;${sigImg("ap13_chief_sigImg")}</div>
<table class="section" style="margin-top:4px;">
  <tr>
    <td class="th-label" rowspan="2">고소작업대<br>작업 허가</td>
    <td style="width:80px;font-size:8pt;font-weight:bold;text-align:center;">검토자</td>
    <td>성명: ${g("ap2_safety_name") || "___"}</td>
    <td class="sig-area">${sigImg("ap2_safety_sigImg") || "(서명)"}</td>
  </tr>
  <tr>
    <td style="width:80px;font-size:8pt;font-weight:bold;text-align:center;">승인자</td>
    <td>성명: ${g("ap3_manager_name") || "___"}</td>
    <td class="sig-area">${sigImg("ap3_manager_sigImg") || "(서명)"}</td>
  </tr>
</table>
` : ""}

${isConfined ? `
<!-- ══════ 밀폐공간 안전작업 허가서 ══════ -->
<div class="page-break"></div>
<div class="section-title bold" style="font-size:13pt;text-align:center;margin-bottom:3px;">밀폐공간 안전작업 허가서</div>
<div style="text-align:center;font-size:7.5pt;margin-bottom:6px;">본 허가서는 SK서린사옥의 본사 작업허가절차 (III-SHGE-0301)를 준수 함</div>
<table class="section" style="margin-bottom:4px;border:none;">
  <tr style="border:none;">
    <td style="border:none;padding:2px 0;font-size:8.5pt;">ㅇ 신청인:&nbsp;부서 ${g("cs_app_dept") || "______"}&nbsp;직책 ${g("cs_app_position") || "______"}&nbsp;성명 ${g("cs_app_name") || "______"}&nbsp;${sigImg("cs_app_sigImg") || "(서명)"}</td>
  </tr>
  <tr style="border:none;">
    <td style="border:none;padding:2px 0;font-size:8.5pt;">ㅇ 작업수행시간:&nbsp;${fmtDate(permit.startDate)} ~ ${fmtDate(permit.endDate)}</td>
  </tr>
  <tr style="border:none;">
    <td style="border:none;padding:2px 0;font-size:8.5pt;">ㅇ 작업장소:&nbsp;${permit.location || "___"}</td>
  </tr>
  <tr style="border:none;">
    <td style="border:none;padding:2px 0;font-size:8.5pt;">ㅇ 작업내용:&nbsp;${permit.description || "___"}</td>
  </tr>
  <tr style="border:none;">
    <td style="border:none;padding:2px 0;font-size:8.5pt;">ㅇ 작업관리감독자:&nbsp;부서 ${g("cs_sup_dept") || "______"}&nbsp;직책 ${g("cs_sup_position") || "______"}&nbsp;성명 ${g("cs_sup_name") || "______"}&nbsp;${sigImg("cs_sup_sigImg") || "(서명)"}</td>
  </tr>
</table>
<p style="font-size:8.5pt;margin-bottom:4px;font-weight:bold;">위 공간에서의 작업을 다음의 조건하에서만 허가함.</p>
<table class="section">
  <tr>
    <td colspan="2" style="font-size:8.5pt;">1. 화기작업허가 필요유무:&nbsp;&nbsp;${isHot ? "☑" : "☐"} 필요&nbsp;&nbsp;${!isHot ? "☑" : "☐"} 불필요</td>
  </tr>
  <tr>
    <td colspan="2" style="font-size:8.5pt;">2. 내연기관(양수기) 또는 갈탄 등의 사용여부:&nbsp;&nbsp;☐ 사용&nbsp;&nbsp;☐ 미사용</td>
  </tr>
  <tr>
    <td colspan="2" style="background:#f0f0f0;font-weight:bold;font-size:8pt;">3. 안전조치 요구사항</td>
  </tr>
  <tr>
    <th style="width:65%;">확인 항목</th>
    <th style="width:35%;" class="center">확인결과</th>
  </tr>
  ${[
    "안전담당자지정 및 감시인 배치",
    "밸브차단, 맹판설치, 불활성가스 치환, 용기세정",
    "산소농도 및 유해가스농도 (계속)측정",
    "환기시설 설치",
    "전화 및 무선기기 구비",
    "소화기 비치",
    "방폭형 전기기계기구의 사용",
    "공기공급식 호흡용보호구 비치",
    "안전장구 구비",
    "안전교육 실시",
  ].map(item => `<tr>
    <td style="font-size:8.5pt;">${item}</td>
    <td class="center">&nbsp;</td>
  </tr>`).join("")}
  <tr>
    <td colspan="2" style="background:#f0f0f0;font-weight:bold;font-size:8pt;">5. 산소 및 유해가스 농도 측정결과</td>
  </tr>
  <tr>
    <th style="font-size:7.5pt;">측정물질명</th>
    <th style="font-size:7.5pt;">농도기준</th>
  </tr>
  ${[
    ["산소 (O2)", "18~23.5 %"],
    ["이산화탄소 (CO2)", "1.5 % 미만"],
    ["일산화탄소 (CO)", "30 ppm 미만"],
    ["황화수소 (H₂S)", "10 ppm 미만"],
    ["가연성가스 (Ex)", "LFL 10 % 이내"],
  ].map(([name, std]) => `<tr>
    <td style="font-size:8pt;">${name}</td>
    <td style="font-size:8pt;">${std}</td>
  </tr>`).join("")}
  <tr>
    <td colspan="2" style="font-size:8.5pt;">6. 특별조치 필요사항:</td>
  </tr>
  <tr>
    <td colspan="2" style="font-weight:bold;text-align:right;font-size:8.5pt;">
      최종허가자&nbsp;&nbsp;부서: SK서린사옥 관리사무실&nbsp;&nbsp;직책: 관리소장&nbsp;&nbsp;성명: ${g("ap3_manager_name") || "___"}&nbsp;&nbsp;${sigImg("ap3_manager_sigImg") || "(서명)"}
    </td>
  </tr>
</table>
` : ""}

</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=1200");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
}


// ── PermitDetail ──────────────────────────────────────────────
// ── ApprovalSidePanel ──────────────────────────────────────────
const APPROVAL_MOCK_STAFF = [
  { name: "김안전", dept: "안전관리팀", phone: "010-1234-5678" },
  { name: "이관리", dept: "시설관리팀", phone: "010-2345-6789" },
  { name: "박감독", dept: "공사감독팀", phone: "010-3456-7890" },
  { name: "최대리", dept: "발주처 안전팀", phone: "010-4567-8901" },
  { name: "정소장", dept: "현장관리팀", phone: "010-5678-9012" },
];

function ApprovalRecipientModal({
  stageLabel,
  onClose,
}: {
  stageLabel: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"list" | "contact">("list");
  const [selected, setSelected] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    setSent(true);
    setTimeout(() => { setSent(false); onClose(); }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 400 }}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800">📨 서명 요청 — {stageLabel}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="flex border-b border-slate-100">
          {(["list", "contact"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-sm font-semibold transition-colors"
              style={{ color: tab === t ? PRIMARY : "#94a3b8", borderBottom: tab === t ? `2px solid ${PRIMARY}` : "2px solid transparent" }}>
              {t === "list" ? "👤 직원 목록" : "📱 연락처 입력"}
            </button>
          ))}
        </div>
        <div className="p-4">
          {tab === "list" ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {APPROVAL_MOCK_STAFF.map((s) => (
                <button key={s.name} onClick={() => setSelected(s.name)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all"
                  style={{ borderColor: selected === s.name ? PRIMARY : "#f1f5f9", background: selected === s.name ? `${PRIMARY}0d` : "#f8fafc" }}>
                  <span className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                    {s.name[0]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.dept} · {s.phone}</p>
                  </div>
                  {selected === s.name && (
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 12 12" style={{ color: PRIMARY }}>
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">휴대폰 번호</label>
              <input className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-teal-400 transition-all"
                placeholder="010-0000-0000" value={phone} onChange={e => setPhone(e.target.value)} />
              <p className="text-xs text-slate-400 mt-2">입력한 번호로 서명 요청 링크가 발송됩니다.</p>
            </div>
          )}
          <button
            onClick={handleSend}
            disabled={sent || (tab === "list" ? !selected : !phone)}
            className="w-full mt-4 py-3 rounded-xl text-sm font-bold text-white transition-all"
            style={{
              background: sent ? "#10b981" : (tab === "list" ? !selected : !phone) ? "#cbd5e1" : PRIMARY,
              cursor: sent || (tab === "list" ? !selected : !phone) ? "not-allowed" : "pointer",
            }}>
            {sent ? "✓ 요청 발송 완료!" : "📨 서명 요청 발송"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 패널 내 서명 캔버스 모달 ────────────────────────────────────
function PanelSigModal({ label, onSave, onClose }: { label: string; onSave: (v: string) => void; onClose: () => void }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [isEmpty, setIsEmpty] = React.useState(true);
  const lastPos = React.useRef<{ x: number; y: number } | null>(null);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
  };
  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); setIsDrawing(true); setIsEmpty(false);
    lastPos.current = getPos(e, canvasRef.current!);
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    const pos = getPos(e, canvasRef.current);
    ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.strokeStyle = "#1e293b";
    ctx.beginPath(); ctx.moveTo(lastPos.current!.x, lastPos.current!.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
    lastPos.current = pos;
  };
  const clearCanvas = () => {
    if (!canvasRef.current) return;
    canvasRef.current.getContext("2d")?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setIsEmpty(true);
  };
  const handleSave = () => {
    if (!canvasRef.current || isEmpty) return;
    onSave(canvasRef.current.toDataURL("image/png")); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 380 }}>
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800">✍️ {label} 서명</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-400 mb-2">아래 영역에 서명을 그려주세요</p>
          <canvas ref={canvasRef} width={332} height={140}
            className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 cursor-crosshair touch-none w-full"
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={() => setIsDrawing(false)} onMouseLeave={() => setIsDrawing(false)}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={() => setIsDrawing(false)} />
          <div className="flex gap-2 mt-3">
            <button onClick={clearCanvas} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-slate-500 hover:bg-slate-50">지우기</button>
            <button onClick={handleSave} disabled={isEmpty}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: isEmpty ? "#cbd5e1" : PRIMARY, cursor: isEmpty ? "not-allowed" : "pointer" }}>
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ApprovalSigRow: 모듈 레벨로 정의 (컴포넌트 내부 정의 시 한글 IME 버그 발생) ──
const TINP_APPROVAL = "w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white outline-none focus:border-teal-400 transition-all placeholder:text-slate-300";

function ApprovalSigRow({
  specKey, label, note,
  getSpec, setSpec,
  onSigClick, onReqClick,
  primary,
}: {
  specKey: string; label: string; note?: string;
  getSpec: (k: string) => string;
  setSpec: (k: string, v: string) => void;
  onSigClick: (key: string, label: string) => void;
  onReqClick: (label: string) => void;
  primary: string;
}) {
  const done = !!getSpec(specKey + "_sigImg");
  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: done ? "#d1fae5" : "#f1f5f9" }}>
      <div className="px-3 py-1.5 flex items-center gap-2" style={{ background: done ? "#f0fdf4" : "#f8fafc" }}>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-slate-700">{label}</span>
          {note && <span className="text-[10px] text-slate-400 ml-1">({note})</span>}
        </div>
        <div className="flex items-center gap-1">
          {done
            ? <span className="text-[10px] font-bold text-emerald-500 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100">✓ 서명완료</span>
            : <>
                <button onClick={() => onSigClick(specKey + "_sigImg", label)}
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded border"
                  style={{ color: "#7c3aed", borderColor: "#7c3aed40", background: "#7c3aed0d" }}>✍️</button>
                <button onClick={() => onReqClick(label)}
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded border"
                  style={{ color: primary, borderColor: `${primary}40`, background: `${primary}0d` }}>📨</button>
              </>
          }
        </div>
      </div>
      {!done && (
        <div className="px-2.5 pb-2 pt-1 grid grid-cols-3 gap-1 bg-white border-t border-slate-50">
          <input className={TINP_APPROVAL} placeholder="소속" value={getSpec(specKey + "_org")} onChange={e => setSpec(specKey + "_org", e.target.value)} />
          <input className={TINP_APPROVAL} placeholder="성명" value={getSpec(specKey + "_name")} onChange={e => setSpec(specKey + "_name", e.target.value)} />
          <input className={TINP_APPROVAL} placeholder="연락처" value={getSpec(specKey + "_tel")} onChange={e => setSpec(specKey + "_tel", e.target.value)} />
        </div>
      )}
      {done && (
        <div className="px-3 py-1 bg-white border-t border-slate-50">
          <span className="text-[10px] text-slate-500">{getSpec(specKey + "_name") || "—"}</span>
          {getSpec(specKey + "_org") && <span className="text-[10px] text-slate-400"> · {getSpec(specKey + "_org")}</span>}
        </div>
      )}
    </div>
  );
}

function ApprovalSidePanel({ permit }: { permit: WorkPermit }) {
  const { updatePermit, updateSignature } = useWorkPermitStore();
  const [reqModal, setReqModal] = useState<string | null>(null);
  const [sigModal, setSigModal] = useState<{ key: string; label: string } | null>(null);

  // 반려 후 처음부터 재결재 초기화
  const handleRestartApproval = () => {
    [1, 2, 3, 4].forEach(stage => {
      updateSignature(permit.id, stage, { status: "pending", signedAt: "" });
    });
    updatePermit(permit.id, { status: "draft", approvalDecision: "", approvalConditions: "" });
  };

  const getSpec = (k: string) => (permit.specifics ?? {})[`chm_${k}`] ?? "";
  const setSpec = (k: string, v: string) =>
    updatePermit(permit.id, { specifics: { ...(permit.specifics ?? {}), [`chm_${k}`]: v } });

  // 작업 종류 감지
  const sw = (() => { try { return JSON.parse(getSpec("safetyWorks")) || {}; } catch { return {}; } })();
  const isHotWork = !!sw.hotWork;
  const isConfinedSpace = !!sw.confinedSpace;
  const isHeightWork = !!sw.heightWork;
  const hasExtension = getSpec("hasExtension") === "true";
  const formCompleted = getSpec("formCompleted") === "true";

  const activeStage = permit.signatures.find((s) => s.status === "pending")?.stage ?? 5;

  // 서명 완료 여부 헬퍼
  const sigDone = (specKey: string) => !!getSpec(specKey + "_sigImg");

  // 단계별 완료 조건
  const s1Main = sigDone("ap1_client") && sigDone("ap1_contractor");
  const s1Hot  = !isHotWork || ["ap11_watch","ap11_fire","ap11_facility","ap11_construction","ap11_tenant","ap11_area","ap11_chief"].every(k => sigDone(k));
  const s1Conf = !isConfinedSpace || ["ap12_safety","ap12_chief","ap12_watcher","ap12_worker"].every(k => sigDone(k));
  const s1Hgt  = !isHeightWork || ["ap13_chief","ap13_watcher","ap13_foreman"].every(k => sigDone(k));
  const stage1Ok = s1Main && s1Hot && s1Conf && s1Hgt;

  const stage2Ok = sigDone("ap2_safety") && sigDone("ap2_she");
  const stage3Ok = sigDone("ap3_manager") && !!permit.approvalDecision;
  const stage4Ok = sigDone("ap4_site") && sigDone("ap4_supervisor");

  const advanceStage = (stage: number) => {
    updateSignature(permit.id, stage, { status: "signed", signedAt: new Date().toISOString() });
    if (stage === 1) updatePermit(permit.id, { status: "pending" });
    if (stage === 3) {
      const d = permit.approvalDecision;
      if (d === "approved") updatePermit(permit.id, { status: "approved" });
      else if (d === "conditionally_approved") updatePermit(permit.id, { status: "conditionally_approved" });
      else if (d === "rejected") updatePermit(permit.id, { status: "rejected" });
    }
    if (stage === 4) updatePermit(permit.id, { status: "completed" });
  };

  // ── 서명자 행 렌더 헬퍼 (컴포넌트가 아닌 함수 호출로 사용 — 한글 IME 버그 방지)
  const SigRow = (specKey: string, label: string, note?: string) => (
    <ApprovalSigRow
      key={specKey}
      specKey={specKey} label={label} note={note}
      getSpec={getSpec} setSpec={setSpec}
      onSigClick={(k, l) => setSigModal({ key: k, label: l })}
      onReqClick={(l) => setReqModal(l)}
      primary={PRIMARY}
    />
  );

  // ── 서브단계 블록 ────────────────────────────────────────────────
  const SubBlock = ({ icon, label, color, bg, children }: {
    icon: string; label: string; color: string; bg: string; children: React.ReactNode;
  }) => (
    <div className="rounded-xl border overflow-hidden mt-1.5" style={{ borderColor: color + "40" }}>
      <div className="px-3 py-2 flex items-center gap-2" style={{ background: bg }}>
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-bold" style={{ color }}>{label}</span>
      </div>
      <div className="p-2.5 bg-white space-y-1.5">{children}</div>
    </div>
  );

  // ── 단계 카드 헤더 ───────────────────────────────────────────────
  const StageHeader = ({ stageNum, icon, title, desc, color, done, isActive, signedAt }: {
    stageNum: number; icon: string; title: string; desc: string;
    color: string; done: boolean; isActive: boolean; signedAt?: string;
  }) => (
    <div className="px-3 py-2.5 flex items-center gap-2"
      style={{ background: done ? "#f0fdf4" : isActive ? color + "0d" : "#f8fafc" }}>
      <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm flex-shrink-0"
        style={{ background: done ? "#10b981" : isActive ? color : "#f1f5f9", borderColor: done ? "#10b981" : isActive ? color : "#e2e8f0", color: done || isActive ? "white" : "#cbd5e1" }}>
        {done ? "✓" : icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold leading-tight" style={{ color: done ? "#065f46" : isActive ? color : "#94a3b8" }}>
          {stageNum}단계: {title}
        </p>
        {done && signedAt && <p className="text-[10px] text-emerald-500">{new Date(signedAt).toLocaleDateString("ko-KR")} 완료</p>}
        {!done && isActive && <p className="text-[10px] text-slate-400">{desc}</p>}
      </div>
    </div>
  );

  const STAGE_COLORS = ["", "#6366f1", "#06b6d4", "#8b5cf6", "#f59e0b"];

  return (
    <div className="flex-shrink-0 flex flex-col border-l border-slate-200 bg-white overflow-hidden" style={{ width: 320 }}>
      {/* 패널 헤더 */}
      <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0" style={{ background: "#f8fffe" }}>
        <p className="text-sm font-bold text-slate-800">✍️ 서명 · 결재</p>
        <p className="text-xs text-slate-400 mt-0.5">단계별 순서대로 서명이 진행됩니다</p>
        <div className="flex items-center gap-1 mt-2.5">
          {PERMIT_SIGNATURE_STAGES.map((stage, i) => {
            const sig = permit.signatures.find((s) => s.stage === stage.stage);
            const done = sig?.status === "signed";
            const active = stage.stage === activeStage;
            return (
              <React.Fragment key={stage.stage}>
                <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: done ? "#10b981" : active ? PRIMARY : "#f8fafc", borderColor: done ? "#10b981" : active ? PRIMARY : "#e2e8f0", color: done || active ? "white" : "#cbd5e1" }}>
                  {done ? "✓" : stage.stage}
                </div>
                {i < PERMIT_SIGNATURE_STAGES.length - 1 && (
                  <div className="flex-1 h-0.5" style={{ background: done ? "#10b981" : "#e2e8f0" }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 결재 결과 배너 */}
      {permit.approvalDecision && permit.signatures.find((s) => s.stage === 3)?.status === "signed" && (
        <div className="mx-3 mt-3 px-4 py-3 rounded-xl border flex-shrink-0" style={{
          background: permit.approvalDecision === "approved" ? "#f0fdf4" : permit.approvalDecision === "conditionally_approved" ? "#fffbeb" : "#fff1f2",
          borderColor: permit.approvalDecision === "approved" ? "#86efac" : permit.approvalDecision === "conditionally_approved" ? "#fcd34d" : "#fca5a5",
        }}>
          <p className="text-sm font-bold" style={{ color: permit.approvalDecision === "approved" ? "#166534" : permit.approvalDecision === "conditionally_approved" ? "#92400e" : "#991b1b" }}>
            {permit.approvalDecision === "approved" ? "✅ 최종 승인됨" : permit.approvalDecision === "conditionally_approved" ? "⚠️ 조건부 승인됨" : "❌ 반려됨"}
          </p>
          {permit.approvalConditions && <p className="text-xs text-slate-500 mt-0.5">{permit.approvalConditions}</p>}
          {/* 반려 시: 처음부터 재결재 버튼 */}
          {permit.approvalDecision === "rejected" && (
            <button
              onClick={handleRestartApproval}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: "#dc2626" }}>
              <span>🔄</span>
              <span>처음부터 재결재 진행</span>
            </button>
          )}
        </div>
      )}

      {/* 단계별 카드 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">

        {/* ── 1단계: 작업개요 및 사전점검 ──────────────────────────── */}
        {(() => {
          const sig = permit.signatures.find((s) => s.stage === 1);
          if (!sig) return null;
          const done = sig.status === "signed";
          const isActive = activeStage === 1 && formCompleted;
          const isLocked = !formCompleted || (activeStage > 1 && !done);
          const c = STAGE_COLORS[1];
          return (
            <div className="rounded-xl border overflow-hidden transition-all" style={{ borderColor: done ? "#d1fae5" : isActive ? c + "40" : "#f1f5f9", opacity: isLocked ? 0.45 : 1 }}>
              <StageHeader stageNum={1} icon="📋" title="작업개요 및 사전점검" desc="입주사관리자 · 시공사 안전관리자 서명"
                color={c} done={done} isActive={isActive} signedAt={sig.signedAt} />
              {!formCompleted && !done && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                  <span className="text-slate-400 text-sm">🔒</span>
                  <p className="text-xs text-slate-400">좌측 양식을 작성 완료한 후 서명이 진행됩니다</p>
                </div>
              )}
              {(isActive || done) && (
                <div className="px-3 pb-3 pt-1 bg-white border-t border-slate-50 space-y-1.5">
                  {SigRow("ap1_client", "입주사 관리자")}
                  {SigRow("ap1_contractor", "시공사 안전관리자(작업감독자)")}

                  {/* 1-1. 화기작업 서브단계 */}
                  {isHotWork && (
                    <SubBlock icon="🔥" label="1-1. 화기작업 서명" color="#b91c1c" bg="#fef2f2">
                      {SigRow("ap11_watch", "화재감시자")}
                      {SigRow("ap11_fire", "소방안전관리자")}
                      {SigRow("ap11_facility", "시설팀 담당자")}
                      {SigRow("ap11_construction", "공사담당자")}
                      {SigRow("ap11_tenant", "입주사 관리 담당자")}
                      {SigRow("ap11_area", "작업구역 담당자")}
                      {SigRow("ap11_chief", "화기취급 책임자")}
                      <div className="border-t border-red-100 my-1" />
                      <p className="text-[10px] font-bold text-red-700 px-1">초기대응체계</p>
                      {SigRow("hw_er_chief", "현장책임자")}
                      {SigRow("hw_er_contact", "비상연락")}
                      {SigRow("hw_er_fire", "초기소화")}
                      {SigRow("hw_er_evac", "피난유도")}
                    </SubBlock>
                  )}

                  {/* 1-2. 밀폐공간 서브단계 */}
                  {isConfinedSpace && (
                    <SubBlock icon="🚪" label="1-2. 밀폐공간 작업 서명" color="#1d4ed8" bg="#eff6ff">
                      {SigRow("ap12_safety", "안전관리자")}
                      {SigRow("ap12_chief", "밀폐공간 작업 책임자")}
                      {SigRow("ap12_watcher", "밀폐공간 감시자")}
                      {SigRow("ap12_worker", "밀폐공간 작업자")}
                    </SubBlock>
                  )}

                  {/* 1-3. 고소작업 서브단계 */}
                  {isHeightWork && (
                    <SubBlock icon="🏗️" label="1-3. 고소작업 서명" color="#b45309" bg="#fffbeb">
                      {SigRow("ap13_chief", "고소작업 책임자", "운전자격증 확인")}
                      {SigRow("ap13_watcher", "고소작업 감시자", "안전대 착용 확인")}
                      {SigRow("ap13_foreman", "작업반장", "TBM 실시 확인")}
                    </SubBlock>
                  )}

                  {isActive && !done && (
                    <button onClick={() => advanceStage(1)} disabled={!stage1Ok}
                      className="w-full py-2.5 rounded-xl text-xs font-bold text-white mt-2 transition-all"
                      style={{ background: stage1Ok ? c : "#cbd5e1", cursor: stage1Ok ? "pointer" : "not-allowed" }}>
                      {stage1Ok ? "1단계 완료 → 다음 단계로" : "모든 서명 완료 후 진행 가능"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── 2단계: 안전조치 확인 ───────────────────────────────── */}
        {(() => {
          const sig = permit.signatures.find((s) => s.stage === 2);
          if (!sig) return null;
          const done = sig.status === "signed";
          const isActive = activeStage === 2;
          const isLocked = activeStage > 2 && !done;
          const c = STAGE_COLORS[2];
          return (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: done ? "#d1fae5" : isActive ? c + "40" : "#f1f5f9", opacity: isLocked ? 0.5 : 1 }}>
              <StageHeader stageNum={2} icon="🔍" title="안전조치 확인" desc="안전담당자 · SHE관리원 서명"
                color={c} done={done} isActive={isActive} signedAt={sig.signedAt} />
              {(isActive || done) && (
                <div className="px-3 pb-3 pt-1 bg-white border-t border-slate-50 space-y-1.5">
                  {SigRow("ap2_safety", "안전담당자")}
                  {SigRow("ap2_she", "SHE관리원")}
                  {isActive && !done && (
                    <button onClick={() => advanceStage(2)} disabled={!stage2Ok}
                      className="w-full py-2.5 rounded-xl text-xs font-bold text-white mt-2 transition-all"
                      style={{ background: stage2Ok ? c : "#cbd5e1", cursor: stage2Ok ? "pointer" : "not-allowed" }}>
                      {stage2Ok ? "2단계 완료 → 다음 단계로" : "두 분 서명 완료 후 진행 가능"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── 3단계: 작업허가 승인 ───────────────────────────────── */}
        {(() => {
          const sig = permit.signatures.find((s) => s.stage === 3);
          if (!sig) return null;
          const done = sig.status === "signed";
          const isActive = activeStage === 3;
          const isLocked = activeStage > 3 && !done;
          const c = STAGE_COLORS[3];
          return (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: done ? "#d1fae5" : isActive ? c + "40" : "#f1f5f9", opacity: isLocked ? 0.5 : 1 }}>
              <StageHeader stageNum={3} icon="✅" title="작업허가 승인" desc="관리소장 최종 결재"
                color={c} done={done} isActive={isActive} signedAt={sig.signedAt} />
              {(isActive || done) && (
                <div className="px-3 pb-3 pt-1 bg-white border-t border-slate-50 space-y-1.5">
                  {SigRow("ap3_manager", "관리소장")}

                  {/* 결재 결과 */}
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                    <p className="text-[10px] font-bold text-amber-700 mb-2">결재 결과 *</p>
                    <div className="flex gap-1.5 mb-2">
                      {(["approved", "conditionally_approved", "rejected"] as PermitApprovalDecision[]).map((d) => {
                        const labels: Record<PermitApprovalDecision, string> = { approved: "✅ 승인", conditionally_approved: "⚠️ 조건부", rejected: "❌ 반려" };
                        const colors: Record<PermitApprovalDecision, string> = { approved: "#10b981", conditionally_approved: "#f59e0b", rejected: "#ef4444" };
                        const sel = permit.approvalDecision === d;
                        return (
                          <button key={d} onClick={() => updatePermit(permit.id, { approvalDecision: d })}
                            className="flex-1 py-1.5 rounded-lg text-[10px] font-bold border-2 transition-all"
                            style={{ borderColor: sel ? colors[d] : "#e2e8f0", background: sel ? colors[d] + "18" : "white", color: sel ? colors[d] : "#64748b" }}>
                            {labels[d]}
                          </button>
                        );
                      })}
                    </div>
                    {permit.approvalDecision === "conditionally_approved" && (
                      <textarea className="w-full px-2 py-1.5 border border-amber-200 rounded text-xs outline-none focus:border-amber-400 resize-none bg-white" rows={2}
                        value={permit.approvalConditions} onChange={(e) => updatePermit(permit.id, { approvalConditions: e.target.value })}
                        placeholder="조건을 구체적으로 기입하세요" />
                    )}
                  </div>

                  {/* 3-1. 작업허가 연장 서브단계 */}
                  <div className="flex items-center gap-2 py-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <button onClick={() => setSpec("hasExtension", hasExtension ? "false" : "true")}
                        className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ borderColor: hasExtension ? "#8b5cf6" : "#cbd5e1", background: hasExtension ? "#8b5cf6" : "white" }}>
                        {hasExtension && <span className="text-white text-[10px] leading-none">✓</span>}
                      </button>
                      <span className="text-xs text-slate-600 font-medium">작업허가 연장</span>
                    </label>
                  </div>
                  {hasExtension && (
                    <SubBlock icon="🔁" label="3-1. 작업허가 연장 서명" color="#7c3aed" bg="#f5f3ff">
                      {SigRow("ap31_manager", "관리소장(연장)")}
                      {SigRow("ap31_safety", "안전담당자(연장)")}
                    </SubBlock>
                  )}

                  {isActive && !done && (
                    <button onClick={() => advanceStage(3)} disabled={!stage3Ok}
                      className="w-full py-2.5 rounded-xl text-xs font-bold text-white mt-2 transition-all"
                      style={{ background: stage3Ok ? c : "#cbd5e1", cursor: stage3Ok ? "pointer" : "not-allowed" }}>
                      {stage3Ok ? "3단계 완료 → 작업허가 확정" : "서명 및 결재 결과 선택 후 진행 가능"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── 4단계: 작업완료 확인 ───────────────────────────────── */}
        {(() => {
          const sig = permit.signatures.find((s) => s.stage === 4);
          if (!sig) return null;
          const done = sig.status === "signed";
          const isActive = activeStage === 4;
          const isLocked = activeStage > 4 && !done;
          const c = STAGE_COLORS[4];
          return (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: done ? "#d1fae5" : isActive ? c + "40" : "#f1f5f9", opacity: isLocked ? 0.5 : 1 }}>
              <StageHeader stageNum={4} icon="🏁" title="작업완료 확인" desc="현장소장(시공사) · 작업감독자 서명"
                color={c} done={done} isActive={isActive} signedAt={sig.signedAt} />
              {(isActive || done) && (
                <div className="px-3 pb-3 pt-1 bg-white border-t border-slate-50 space-y-1.5">
                  {SigRow("ap4_site", "현장소장(시공사)")}
                  {SigRow("ap4_supervisor", "작업감독자")}

                  {/* 작업완료 확인 메모 */}
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5">
                    <p className="text-[10px] font-bold text-emerald-700 mb-1">작업완료 확인</p>
                    <textarea className="w-full px-2 py-1.5 border border-emerald-200 rounded text-xs outline-none focus:border-emerald-400 resize-none bg-white" rows={2}
                      value={permit.completionNote ?? ""} onChange={(e) => updatePermit(permit.id, { completionNote: e.target.value })}
                      placeholder="작업 완료 상태, 현장 복구 확인사항" />
                  </div>

                  {isActive && !done && (
                    <button onClick={() => advanceStage(4)} disabled={!stage4Ok}
                      className="w-full py-2.5 rounded-xl text-xs font-bold text-white mt-2 transition-all"
                      style={{ background: stage4Ok ? c : "#cbd5e1", cursor: stage4Ok ? "pointer" : "not-allowed" }}>
                      {stage4Ok ? "4단계 완료 → 작업 종료" : "두 분 서명 완료 후 진행 가능"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })()}

      </div>

      {reqModal && <ApprovalRecipientModal stageLabel={reqModal} onClose={() => setReqModal(null)} />}
      {sigModal && (
        <PanelSigModal
          label={sigModal.label}
          onSave={(v) => { if (sigModal) setSpec(sigModal.key, v); }}
          onClose={() => setSigModal(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
function PermitDetail({ permit, onClose, mode = "modal" }: { permit: WorkPermit; onClose: () => void; mode?: "modal" | "page" }) {
  const { updatePermit, updateSignature, updateGasMeasurement, customPermitTypes, specificsOverrides } = useWorkPermitStore();

  const upd = (key: keyof WorkPermit, val: unknown) => updatePermit(permit.id, { [key]: val });

  type CheckState = "양호" | "불량" | "해당없음" | "";
  const setChecklistValue = (item: string, val: CheckState) => {
    upd("safetyChecklist", { ...permit.safetyChecklist, [item]: val });
  };
  const toggleMeasure = (item: string) => {
    upd("safetyMeasures", { ...permit.safetyMeasures, [item]: !permit.safetyMeasures[item] });
  };
  const addCustomItem = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed || (permit.customChecklistItems ?? []).includes(trimmed)) return;
    upd("customChecklistItems", [...(permit.customChecklistItems ?? []), trimmed]);
    upd("safetyChecklist", { ...permit.safetyChecklist, [trimmed]: "" });
  };
  const removeCustomItem = (item: string) => {
    upd("customChecklistItems", (permit.customChecklistItems ?? []).filter((i) => i !== item));
    const next = { ...permit.safetyChecklist };
    delete next[item];
    upd("safetyChecklist", next);
  };

  // ── 복수 유형 관리 ───────────────────────────────────────────
  const allTypes = [permit.type, ...(permit.extraTypes ?? [])];
  const selectedCustomTypes = customPermitTypes.filter(ct => (permit.customTypeIds ?? []).includes(ct.id));
  const addExtraType = (t: WorkPermitType) => {
    const newChecklist = { ...permit.safetyChecklist };
    for (const item of PERMIT_SAFETY_CHECKLIST[t] ?? []) {
      if (!(item in newChecklist)) newChecklist[item] = "";
    }
    const updates: Partial<WorkPermit> = {
      extraTypes: [...(permit.extraTypes ?? []), t],
      safetyChecklist: newChecklist,
    };
    const needsGasNow = [...allTypes, t].some((x) => x === "confined_space" || x === "hot_work");
    if (needsGasNow && permit.gasMeasurements.length === 0) {
      updates.gasMeasurements = GAS_STANDARDS.map((g) => ({
        gasType: g.type, value: "", unit: g.unit, standard: g.standard,
        measuredAt: "", measuredBy: "", confirmedBy: "", pass: false,
      }));
    }
    updatePermit(permit.id, updates);
  };

  // 병합된 유형별 특화 확인사항 (키 중복 제거) — 엑셀 export 용 flat 목록
  const mergedSpecificsFields = (() => {
    const seen = new Set<string>();
    const result: { key: string; label: string; fromType: WorkPermitType; fromCustomId?: string }[] = [];
    // Built-in types
    for (const t of allTypes) {
      const fields = specificsOverrides[t] ?? PERMIT_SPECIFICS_FIELDS[t] ?? [];
      for (const f of fields) {
        if (!seen.has(f.key)) {
          seen.add(f.key);
          result.push({ ...f, fromType: t });
        }
      }
    }
    // Custom types
    for (const ct of selectedCustomTypes) {
      const fields = ct.specificFields ?? [];
      for (const f of fields) {
        if (!seen.has(`${ct.id}_${f.key}`)) {
          seen.add(`${ct.id}_${f.key}`);
          result.push({ key: `${ct.id}_${f.key}`, label: f.label, fromType: "general" as WorkPermitType });
        }
      }
    }
    return result;
  })();

  // 유형별 그룹 (렌더링용 — 키 중복은 먼저 등장한 유형에 귀속)
  const specificsGroups = (() => {
    const seen = new Set<string>();
    const groups: { typeId: string; label: string; icon: string; fields: { key: string; label: string }[]; isCustom?: boolean }[] = [];
    for (const t of allTypes) {
      const fields = (specificsOverrides[t] ?? PERMIT_SPECIFICS_FIELDS[t] ?? []).filter((f) => {
        if (seen.has(f.key)) return false;
        seen.add(f.key);
        return true;
      });
      if (fields.length > 0) groups.push({ typeId: t, label: WORK_PERMIT_TYPE_LABELS[t].replace(" 허가서",""), icon: WORK_PERMIT_TYPE_ICONS[t], fields });
    }
    for (const ct of selectedCustomTypes) {
      const fields = ct.specificFields.filter((f) => {
        const k = `${ct.id}_${f.key}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      }).map(f => ({ key: `${ct.id}_${f.key}`, label: f.label }));
      if (fields.length > 0) groups.push({ typeId: ct.id, label: ct.label, icon: ct.icon, fields, isCustom: true });
    }
    return groups;
  })();

  const [openSpecifics, setOpenSpecifics] = useState<Set<string>>(
    () => new Set(allTypes),
  );
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set());
  const toggleNote = (t: string) =>
    setOpenNotes((prev) => { const next = new Set(prev); next.has(t) ? next.delete(t) : next.add(t); return next; });
  const toggleSpecificsGroup = (t: string) =>
    setOpenSpecifics((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });


  const customItems = permit.customChecklistItems ?? [];
  const customCheckedCount = customItems.filter((i) => !!permit.safetyChecklist?.[i]).length;
  const checkedCount = Object.entries(permit.safetyChecklist ?? {}).filter(([k, v]) => !!v && !customItems.includes(k)).length;
  const badCount = Object.entries(permit.safetyChecklist ?? {}).filter(([, v]) => v === "불량").length;
  const allChecklistItems = [...new Set(allTypes.flatMap((t) => PERMIT_SAFETY_CHECKLIST[t] ?? []))];
  const totalCount = allChecklistItems.length;
  const measuresCheckedCount = Object.values(permit.safetyMeasures ?? {}).filter(Boolean).length;
  const needsGas = allTypes.some((t) => t === "confined_space" || t === "hot_work");

  const activeStage = permit.signatures.find((s) => s.status === "pending")?.stage ?? 6;

  const handleSignStage = (stage: number) => {
    const sig = permit.signatures.find((s) => s.stage === stage);
    if (!sig || sig.status === "signed") return;
    updateSignature(permit.id, stage, { status: "signed", signedAt: new Date().toISOString() });
    if (stage === 4) {
      const d = permit.approvalDecision;
      if (d === "approved") updatePermit(permit.id, { status: "approved" });
      else if (d === "conditionally_approved") updatePermit(permit.id, { status: "conditionally_approved" });
      else if (d === "rejected") updatePermit(permit.id, { status: "rejected" });
    } else if (stage === 5) {
      updatePermit(permit.id, { status: "completed" });
    } else if (stage === 1) {
      updatePermit(permit.id, { status: "pending" });
    }
  };

  const inp = "ptw-input w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white";

  return (
    <div className={mode === "page" ? "h-full flex flex-col" : "fixed inset-0 z-50 flex items-center justify-center"} style={mode === "modal" ? { background: "rgba(0,0,0,0.6)" } : {}}>
      <div className={mode === "page" ? "flex flex-col h-full w-full bg-white overflow-hidden" : "bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-3xl mx-4"} style={mode === "modal" ? { maxHeight: "92vh" } : {}}>

        {/* ── 헤더 ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{WORK_PERMIT_TYPE_ICONS[permit.type]}</span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-800 text-sm">{WORK_PERMIT_TYPE_LABELS[permit.type]}</h3>
                {permit.customTypeName && permit.customTypeName.split(",").map((n) => n.trim()).filter(Boolean).map((name) => (
                  <span key={name} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #86efac" }}>
                    🖊️ {name}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: STATUS_STYLE[permit.status].border + "44", color: STATUS_STYLE[permit.status].text }}>
                  {WORK_PERMIT_STATUS_LABELS[permit.status]}
                </span>
                {/* 서명 진행 */}
                <div className="flex items-center gap-0.5">
                  {PERMIT_SIGNATURE_STAGES.map((s) => {
                    const done = permit.signatures.find((sg) => sg.stage === s.stage)?.status === "signed";
                    return <div key={s.stage} className="w-2 h-2 rounded-full" style={{ background: done ? "#10b981" : "#e2e8f0" }} title={s.role} />;
                  })}
                  <span className="text-xs text-slate-400 ml-1">{permit.signatures.filter((s) => s.status === "signed").length}/5</span>
                </div>
                {permit.workPlanTitle && (
                  <Link href="/work-plan/create" className="text-xs text-teal-600 hover:text-teal-700 hover:underline" title="연동된 작업계획서 보기">
                    📋 {permit.workPlanTitle}
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => printPermitForm(permit)}
              className="text-xs px-3 py-1.5 rounded-xl border font-medium transition-all hover:opacity-80"
              style={{ borderColor: "#e2e8f0", color: "#475569" }}
              title="허가서 인쇄"
            >
              🖨️ 인쇄
            </button>
            {mode === "page" ? (
              <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">← 목록으로</button>
            ) : (
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl w-8 h-8 flex items-center justify-center">✕</button>
            )}
          </div>
        </div>

        {/* ── 본문: 좌(폼) + 우(결재패널) ── */}
        <div className="flex-1 flex overflow-hidden" style={{ background: "#f4f6f8" }}>

          {/* 좌측: 폼 영역 */}
          <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">

            {/* ══ CHM 작업허가서 양식 ══ */}
            <CHMPermitForm permit={permit} />

            {/* ══ 기존 섹션 (숨김) ══ */}
            <div style={{ display: "none" }}>
            <div className="ptw-section-card">
              <SectionHeader icon="📋" title="기본 정보" />
              <div className="ptw-section-card-body space-y-3">

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="ptw-label">작업명 (문서 제목)</label>
                    <input className={inp} value={permit.title} onChange={(e) => upd("title", e.target.value)} placeholder="예: 2026년 03월 23일 작업허가서" />
                  </div>
                  <div>
                    <label className="ptw-label">작성일자</label>
                    <input type="date" className={inp} value={permit.createdAt ? permit.createdAt.slice(0, 10) : ""} readOnly style={{ background: "#f8fafc", color: "#64748b" }} />
                  </div>
                </div>
                <div>
                  <label className="ptw-label">사업장명</label>
                  <input className={inp} value={permit.siteName} onChange={(e) => upd("siteName", e.target.value)} placeholder="현장명" />
                </div>
                <div>
                  <label className="ptw-label">작업 장소</label>
                  <input className={inp} value={permit.location} onChange={(e) => upd("location", e.target.value)} placeholder="상세 위치" />
                </div>
                <div>
                  <label className="ptw-label">협력사</label>
                  <input className={inp} value={permit.contractor} onChange={(e) => upd("contractor", e.target.value)} placeholder="시공사/협력업체" />
                </div>
                <div>
                  <label className="ptw-label">투입 인원</label>
                  <input className={inp} value={permit.personnelCount} onChange={(e) => upd("personnelCount", e.target.value)} placeholder="명" />
                </div>
                <div>
                  <label className="ptw-label">작업 시작일시</label>
                  <div className="flex gap-2">
                    <input type="date" className={inp} value={permit.startDate} onChange={(e) => upd("startDate", e.target.value)} />
                    <input type="time" className="ptw-input w-28 flex-shrink-0 px-2 py-2 border border-slate-200 rounded-lg text-sm bg-white" value={permit.startTime} onChange={(e) => upd("startTime", e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="ptw-label">작업 종료일시</label>
                  <div className="flex gap-2">
                    <input type="date" className={inp} value={permit.endDate} onChange={(e) => upd("endDate", e.target.value)} />
                    <input type="time" className="ptw-input w-28 flex-shrink-0 px-2 py-2 border border-slate-200 rounded-lg text-sm bg-white" value={permit.endTime} onChange={(e) => upd("endTime", e.target.value)} />
                  </div>
                </div>
                <div className="col-span-2">
                  {/* 허가서 유형 선택 그리드 — 날짜 아래 배치 */}
                  <PermitTypeGrid
                    permit={permit}
                    upd={upd}
                    updatePermit={updatePermit}
                    addExtraType={addExtraType}
                    customTypes={customPermitTypes}
                    selectedCustomIds={permit.customTypeIds ?? []}
                    onToggleCustom={(id) => {
                      const cur = permit.customTypeIds ?? [];
                      upd("customTypeIds", cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
                    }}
                  />
                </div>
                <div className="col-span-2">
                  <label className="ptw-label">작업 개요</label>
                  <textarea className="w-full px-3 py-2 ptw-input border border-slate-200 rounded-lg text-sm bg-white resize-none" rows={3} value={permit.description} onChange={(e) => upd("description", e.target.value)} placeholder="작업 내용, 계획 및 순서 등" />
                </div>
                <div className="col-span-2">
                  <label className="ptw-label">투입 장비</label>
                  <EquipmentPicker
                    selected={permit.equipmentTypes ?? []}
                    customList={permit.equipmentCustomList ?? []}
                    onToggle={(key) => {
                      const cur = permit.equipmentTypes ?? [];
                      upd("equipmentTypes", cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]);
                    }}
                    onCustomAdd={(v) => upd("equipmentCustomList", [...(permit.equipmentCustomList ?? []), v])}
                    onCustomRemove={(v) => upd("equipmentCustomList", (permit.equipmentCustomList ?? []).filter((i) => i !== v))}
                  />
                </div>
              </div>

              </div>
            </div>

            {/* ══ 섹션 2: 안전 체크 ══ */}
            <div className="ptw-section-card">
              <SectionHeader icon="✅" title="안전 체크" badge={`${checkedCount + customCheckedCount + measuresCheckedCount}/${totalCount + customItems.length + COMMON_SAFETY_MEASURES.length}${badCount > 0 ? ` · 불량 ${badCount}건` : ""}`} />
              <div className="ptw-section-card-body space-y-4">

              {/* 안전조치 요구사항 */}
              <div className="mb-2">
                <p className="text-xs font-bold text-slate-600 mb-2">안전조치 요구사항 <span className="text-slate-400 font-normal">({measuresCheckedCount}/{COMMON_SAFETY_MEASURES.length})</span></p>
                <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                  {COMMON_SAFETY_MEASURES.map((item) => {
                    const checked = !!permit.safetyMeasures?.[item];
                    return (
                      <button key={item} onClick={() => toggleMeasure(item)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
                        style={{ background: checked ? `${PRIMARY}06` : "white" }}>
                        <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
                          style={{ background: checked ? PRIMARY : "white", borderColor: checked ? PRIMARY : "#cbd5e1" }}>
                          {checked && <span className="text-white" style={{ fontSize: 9 }}>✓</span>}
                        </div>
                        <span className="text-sm" style={{ color: checked ? "#334155" : "#94a3b8" }}>{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 기타 직접입력 체크항목 — 안전조치 바로 아래 */}
              <CustomChecklistSection
                items={customItems}
                checklist={permit.safetyChecklist ?? {}}
                onSetValue={setChecklistValue}
                onAdd={addCustomItem}
                onRemove={removeCustomItem}
                checkedCount={customCheckedCount}
              />

              {/* 추가 안전조치 */}
              <div>
                <label className="ptw-label">추가 안전조치 사항</label>
                <textarea className="ptw-input w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white resize-none" rows={3}
                  value={permit.additionalMeasures} onChange={(e) => upd("additionalMeasures", e.target.value)} placeholder="위 체크리스트 외 추가로 필요한 안전조치를 기입하세요" />
              </div>

              {/* 가스 측정 (밀폐공간/화기) */}
              {needsGas && (
                <div>
                  <p className="text-xs font-bold text-slate-600 mb-2">🧪 가스 농도 측정 <span className="text-red-500 font-normal text-xs ml-1">법적 의무</span></p>
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="grid bg-slate-50 border-b border-slate-200" style={{ gridTemplateColumns: "80px 80px 1fr 80px 100px 100px" }}>
                      {["가스종류", "측정값", "판정기준", "합부", "측정자", "확인자"].map((h) => (
                        <div key={h} className="px-2 py-2 text-xs font-semibold text-slate-500 border-r border-slate-200 last:border-r-0">{h}</div>
                      ))}
                    </div>
                    {permit.gasMeasurements.map((gm, i) => (
                      <div key={i} className="grid border-b border-slate-100 last:border-b-0" style={{ gridTemplateColumns: "80px 80px 1fr 80px 100px 100px" }}>
                        <div className="px-2 py-2 text-xs font-semibold text-slate-700 border-r border-slate-100 flex items-center">{gm.gasType}</div>
                        <div className="px-1 py-1 border-r border-slate-100">
                          <input className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs outline-none focus:border-teal-400"
                            value={gm.value} onChange={(e) => updateGasMeasurement(permit.id, i, { value: e.target.value })} placeholder={gm.unit} />
                        </div>
                        <div className="px-2 py-2 text-xs text-slate-500 border-r border-slate-100 flex items-center">{gm.standard}</div>
                        <div className="px-1 py-1 border-r border-slate-100 flex items-center justify-center">
                          <button onClick={() => updateGasMeasurement(permit.id, i, { pass: !gm.pass })}
                            className="text-xs px-2 py-1 rounded-full font-semibold"
                            style={{ background: gm.pass ? "#d1fae5" : "#fee2e2", color: gm.pass ? "#065f46" : "#991b1b" }}>
                            {gm.pass ? "적합" : "미확인"}
                          </button>
                        </div>
                        <div className="px-1 py-1 border-r border-slate-100">
                          <input className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs outline-none focus:border-teal-400"
                            value={gm.measuredBy} onChange={(e) => updateGasMeasurement(permit.id, i, { measuredBy: e.target.value })} placeholder="측정자" />
                        </div>
                        <div className="px-1 py-1">
                          <input className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs outline-none focus:border-teal-400"
                            value={gm.confirmedBy} onChange={(e) => updateGasMeasurement(permit.id, i, { confirmedBy: e.target.value })} placeholder="확인자" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </div>
            </div>

            {/* ══ 섹션 3: 유형별 확인사항 ══ */}
            {specificsGroups.length > 0 && (
            <div className="ptw-section-card">
              <SectionHeader icon="📝" title="유형별 확인사항" />
              <div className="ptw-section-card-body space-y-2">
                {specificsGroups.map(({ typeId, label, icon, fields, isCustom }) => {
                  const isOpen = openSpecifics.has(typeId);
                  const filledCount = fields.filter((f) => !!(permit.specifics[f.key] ?? "")).length;
                  const checkItems = !isCustom
                    ? (PERMIT_SAFETY_CHECKLIST[typeId as WorkPermitType] ?? [])
                    : (selectedCustomTypes.find(ct => ct.id === typeId)?.checklistItems ?? []);
                  const typeChecked = checkItems.filter((i) => !!permit.safetyChecklist?.[i]).length;
                  const typeBad = checkItems.filter((i) => permit.safetyChecklist?.[i] === "불량").length;
                  const totalFilled = filledCount + typeChecked;
                  const totalItems = fields.length + checkItems.length;
                  return (
                    <div key={typeId} className="rounded-xl border border-slate-200 overflow-hidden">
                      {/* 그룹 헤더 */}
                      <button
                        onClick={() => toggleSpecificsGroup(typeId)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-slate-50"
                        style={{ background: isOpen ? PRIMARY_LIGHT : "white" }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{icon}</span>
                          <span className="text-xs font-semibold" style={{ color: isOpen ? PRIMARY : "#334155" }}>
                            {label}
                          </span>
                          {isCustom && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">커스텀</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: totalItems > 0 && totalFilled === totalItems ? "#10b981" : "#94a3b8" }}>
                            {totalFilled}/{totalItems}
                            {typeBad > 0 && <span className="text-red-500 ml-1">· 불량 {typeBad}건</span>}
                          </span>
                          <span className="text-xs text-slate-400">{isOpen ? "▲" : "▼"}</span>
                        </div>
                      </button>
                      {/* 펼쳐진 내용 */}
                      {isOpen && (
                        <div className="border-t border-slate-100" style={{ background: "white" }}>
                          {/* 확인사항 필드 */}
                          {fields.length > 0 && (
                            <div className="px-4 py-3 grid grid-cols-2 gap-3">
                              {fields.map((f) => (
                                <div key={f.key}>
                                  <label className="ptw-label">{f.label}</label>
                                  <input
                                    className={inp}
                                    value={permit.specifics[f.key] ?? ""}
                                    onChange={(e) => upd("specifics", { ...permit.specifics, [f.key]: e.target.value })}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          {/* 체크리스트 */}
                          {checkItems.length > 0 && (
                            <div className="px-4 pb-3">
                              <p className="text-xs font-bold text-slate-500 mb-2">
                                체크리스트
                                <span className="text-slate-400 font-normal ml-1">({typeChecked}/{checkItems.length})</span>
                                {typeBad > 0 && <span className="text-red-500 font-normal ml-1">· 불량 {typeBad}건</span>}
                              </p>
                              <ChecklistTable
                                items={checkItems}
                                checklist={permit.safetyChecklist ?? {}}
                                onSet={setChecklistValue}
                              />
                            </div>
                          )}
                          {/* 기타 특이사항 */}
                          <div className="border-t border-slate-50">
                            <button
                              type="button"
                              onClick={() => toggleNote(typeId)}
                              className="w-full flex items-center gap-1.5 px-4 py-2 text-left hover:bg-slate-50 transition-colors"
                            >
                              <span className="text-xs text-slate-400">{openNotes.has(typeId) ? "▲" : "▼"}</span>
                              <span className="text-xs font-medium text-slate-500">기타 특이사항</span>
                              {permit.specifics[`_note_${typeId}`] && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: PRIMARY_LIGHT, color: PRIMARY }}>입력됨</span>
                              )}
                            </button>
                            {openNotes.has(typeId) && (
                              <div className="px-4 pb-3">
                                <textarea
                                  rows={3}
                                  className={`${inp} resize-none`}
                                  placeholder="해당 유형에 대한 기타 특이사항, 추가 조치사항 등을 자유롭게 입력하세요"
                                  value={permit.specifics[`_note_${typeId}`] ?? ""}
                                  onChange={(e) => upd("specifics", { ...permit.specifics, [`_note_${typeId}`]: e.target.value })}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            )}
            </div>

            {/* ══ 섹션 4: 서명 · 결재 → 우측 패널로 이동됨 ══ */}
            <div style={{ display: "none" }}>
              <div className="ptw-section-card">
              <SectionHeader icon="✍️" title="서명 · 결재" />
              <div className="ptw-section-card-body space-y-4">

              {/* 진행 표시 바 */}
              <div className="flex items-center gap-1 mb-6 px-2">
                {PERMIT_SIGNATURE_STAGES.map((stage, i) => {
                  const sig = permit.signatures.find((s) => s.stage === stage.stage);
                  const done = sig?.status === "signed";
                  const active = stage.stage === activeStage;
                  return (
                    <React.Fragment key={stage.stage}>
                      <div className="flex flex-col items-center" style={{ minWidth: 56 }}>
                        <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm"
                          style={{ background: done ? "#10b981" : active ? PRIMARY : "#f8fafc", borderColor: done ? "#10b981" : active ? PRIMARY : "#e2e8f0", color: done || active ? "white" : "#94a3b8" }}>
                          {done ? "✓" : stage.icon}
                        </div>
                        <span className="text-xs mt-1 text-center leading-tight" style={{ color: done ? "#10b981" : active ? PRIMARY : "#94a3b8", fontWeight: active || done ? 600 : 400 }}>
                          {stage.role}
                        </span>
                      </div>
                      {i < PERMIT_SIGNATURE_STAGES.length - 1 && (
                        <div className="flex-1 h-0.5 mb-4" style={{ background: done ? "#10b981" : "#e2e8f0" }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* 결재 결과 표시 (승인 완료 후) */}
              {permit.approvalDecision && permit.signatures.find((s) => s.stage === 4)?.status === "signed" && (
                <div className="rounded-xl border p-4 mb-4" style={{
                  background: permit.approvalDecision === "approved" ? "#f0fdf4" : permit.approvalDecision === "conditionally_approved" ? "#fffbeb" : "#fff1f2",
                  borderColor: permit.approvalDecision === "approved" ? "#86efac" : permit.approvalDecision === "conditionally_approved" ? "#fcd34d" : "#fca5a5",
                }}>
                  <p className="text-sm font-bold" style={{ color: permit.approvalDecision === "approved" ? "#166534" : permit.approvalDecision === "conditionally_approved" ? "#92400e" : "#991b1b" }}>
                    {permit.approvalDecision === "approved" ? "✅ 승인됨" : permit.approvalDecision === "conditionally_approved" ? "⚠️ 조건부 승인됨" : "❌ 반려됨"}
                  </p>
                  {permit.approvalConditions && <p className="text-xs text-slate-600 mt-1">조건: {permit.approvalConditions}</p>}
                </div>
              )}

              {/* 단계별 서명 블록 */}
              <div className="space-y-3">
                {PERMIT_SIGNATURE_STAGES.map((stage) => {
                  const sig = permit.signatures.find((s) => s.stage === stage.stage) as PermitSignature;
                  if (!sig) return null;
                  const done = sig.status === "signed";
                  const isActive = stage.stage === activeStage;
                  const isApprovalStage = stage.stage === 4;

                  return (
                    <div key={stage.stage} className="rounded-xl border overflow-hidden"
                      style={{ borderColor: done ? "#34d399" : isActive ? PRIMARY : "#e2e8f0", opacity: stage.stage > activeStage && !done ? 0.5 : 1 }}>
                      {/* 단계 헤더 */}
                      <div className="px-4 py-3 flex items-center justify-between"
                        style={{ background: done ? "#f0fdf4" : isActive ? PRIMARY_LIGHT : "#f8fafc" }}>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{stage.icon}</span>
                          <div>
                            <p className="text-sm font-bold" style={{ color: done ? "#065f46" : isActive ? PRIMARY : "#334155" }}>
                              단계 {stage.stage}: {stage.label}
                            </p>
                            <p className="text-xs text-slate-500">{stage.desc}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {done && <span className="text-xs text-emerald-600 font-semibold">✓ 서명완료 {sig.signedAt ? new Date(sig.signedAt).toLocaleDateString("ko-KR") : ""}</span>}
                          {!done && isActive && (
                            <button onClick={() => handleSignStage(stage.stage)}
                              disabled={isApprovalStage && !permit.approvalDecision}
                              className="text-xs px-3 py-1.5 rounded-xl font-semibold text-white transition-colors"
                              style={{ background: (isApprovalStage && !permit.approvalDecision) ? "#cbd5e1" : PRIMARY, cursor: (isApprovalStage && !permit.approvalDecision) ? "not-allowed" : "pointer" }}>
                              서명 확인
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 서명자 정보 */}
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="ptw-label">성명</label>
                            <input className="ptw-input w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                              value={sig.name} onChange={(e) => updateSignature(permit.id, stage.stage, { name: e.target.value })}
                              placeholder={stage.role} readOnly={done} style={{ background: done ? "#f8fafc" : "white" }} />
                          </div>
                          <div>
                            <label className="ptw-label">부서</label>
                            <input className="ptw-input w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                              value={sig.department} onChange={(e) => updateSignature(permit.id, stage.stage, { department: e.target.value })}
                              placeholder="부서명" readOnly={done} style={{ background: done ? "#f8fafc" : "white" }} />
                          </div>
                          <div>
                            <label className="ptw-label">직책</label>
                            <input className="ptw-input w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                              value={sig.position} onChange={(e) => updateSignature(permit.id, stage.stage, { position: e.target.value })}
                              placeholder="직책" readOnly={done} style={{ background: done ? "#f8fafc" : "white" }} />
                          </div>
                        </div>

                        {/* 결재 결과 선택 */}
                        {isApprovalStage && !done && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                            <p className="text-xs font-bold text-amber-800 mb-2">결재 결과 *</p>
                            <div className="flex gap-2 mb-2">
                              {(["approved", "conditionally_approved", "rejected"] as PermitApprovalDecision[]).map((d) => {
                                const labels: Record<PermitApprovalDecision, string> = { approved: "✅ 승인", conditionally_approved: "⚠️ 조건부승인", rejected: "❌ 반려" };
                                const colors: Record<PermitApprovalDecision, string> = { approved: "#10b981", conditionally_approved: "#f59e0b", rejected: "#ef4444" };
                                const sel = permit.approvalDecision === d;
                                return (
                                  <button key={d} onClick={() => upd("approvalDecision", d)}
                                    className="flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-all"
                                    style={{ borderColor: sel ? colors[d] : "#e2e8f0", background: sel ? colors[d] + "18" : "white", color: sel ? colors[d] : "#64748b" }}>
                                    {labels[d]}
                                  </button>
                                );
                              })}
                            </div>
                            {permit.approvalDecision === "conditionally_approved" && (
                              <textarea className="w-full px-3 py-2 border border-amber-200 rounded-lg text-xs outline-none focus:border-amber-400 resize-none bg-white" rows={2}
                                value={permit.approvalConditions} onChange={(e) => upd("approvalConditions", e.target.value)}
                                placeholder="조건부 승인 조건을 구체적으로 기입하세요" />
                            )}
                          </div>
                        )}

                        {/* 완료 단계 - 무사종료 확인 */}
                        {stage.stage === 5 && !done && (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                            <p className="text-xs font-bold text-emerald-800 mb-2">작업완료 확인 (무사종료)</p>
                            <textarea className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-xs outline-none focus:border-emerald-400 resize-none bg-white" rows={2}
                              value={permit.completionNote} onChange={(e) => upd("completionNote", e.target.value)}
                              placeholder="작업 완료 상태, 현장 복구 확인사항 등을 기입하세요" />
                          </div>
                        )}

                        {/* 검토 의견 */}
                        <div>
                          <label className="ptw-label">
                            {isApprovalStage ? "결재 코멘트" : stage.stage === 5 ? "완료 확인 의견" : "검토 의견"}
                          </label>
                          <textarea className="ptw-input w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm bg-white resize-none"
                            style={{ background: done ? "#f8fafc" : "white" }}
                            rows={2} value={sig.comment}
                            onChange={(e) => updateSignature(permit.id, stage.stage, { comment: e.target.value })}
                            placeholder={done ? "(코멘트 없음)" : "검토 의견을 입력하세요"}
                            readOnly={done} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              </div>
              </div>
            </div>

          </div>
          </div>

          {/* 우측: 결재 패널 */}
          <ApprovalSidePanel permit={permit} />

        </div>
      </div>
    </div>
  );
}

// ── PermitDetailPage (named export for full-page use) ─────────
export function PermitDetailPage({ permit, onClose }: { permit: WorkPermit; onClose: () => void }) {
  return <PermitDetail permit={permit} onClose={onClose} mode="page" />;
}

// ── WorkPermitEditor (default export) ─────────────────────────
export default function WorkPermitEditor() {
  const { permits, deletePermit } = useWorkPermitStore();
  const [openId, setOpenId] = useState<string | null>(null);

  const openPermit = permits.find((p) => p.id === openId) ?? null;

  if (permits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
        <p style={{ fontSize: 36 }}>📋</p>
        <p className="text-sm text-center text-slate-500">작업허가서가 없습니다.<br />작업계획서에서 허가서를 생성하세요.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {permits.map((p) => (
        <PermitCard
          key={p.id}
          permit={p}
          onOpen={() => setOpenId(p.id)}
          onDelete={() => deletePermit(p.id)}
        />
      ))}
      {openPermit && (
        <PermitDetail permit={openPermit} onClose={() => setOpenId(null)} />
      )}
    </div>
  );
}
