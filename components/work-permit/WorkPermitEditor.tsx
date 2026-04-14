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

// ── 엑셀 내보내기 ─────────────────────────────────────────────
async function exportPermitExcel(permit: WorkPermit) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  // ── 시트 1: 기본정보 ─────────────────────────────────────────
  const allTypesForExport = [permit.type, ...(permit.extraTypes ?? [])];
  const basicRows = [
    { 항목: "허가서 유형",    값: allTypesForExport.map((t) => WORK_PERMIT_TYPE_LABELS[t]).join(" + ") },
    { 항목: "기타 작업명",    값: permit.customTypeName },
    { 항목: "상태",           값: WORK_PERMIT_STATUS_LABELS[permit.status] },
    { 항목: "작업명",         값: permit.title },
    { 항목: "사업장명",       값: permit.siteName },
    { 항목: "작업 장소",      값: permit.location },
    { 항목: "협력사",         값: permit.contractor },
    { 항목: "투입 인원",      값: permit.personnelCount },
    { 항목: "작업 시작일시",  값: [permit.startDate, permit.startTime].filter(Boolean).join(" ") },
    { 항목: "작업 종료일시",  값: [permit.endDate,   permit.endTime  ].filter(Boolean).join(" ") },
    { 항목: "작업 개요",      값: permit.description },
    { 항목: "투입 장비",      값: [...(permit.equipmentTypes ?? []).map((k) => CONSTRUCTION_EQUIPMENT_TYPES[k as keyof typeof CONSTRUCTION_EQUIPMENT_TYPES]?.label ?? k), ...(permit.equipmentCustomList ?? [])].join(", ") },
    { 항목: "신청인 성명",    값: permit.requestedBy },
    { 항목: "신청인 부서",    값: permit.requestedByDept },
    { 항목: "신청인 직책",    값: permit.requestedByPosition },
    { 항목: "연동 작업계획서", 값: permit.workPlanTitle || permit.workPlanId || "" },
    { 항목: "추가 안전조치",  값: permit.additionalMeasures },
  ];
  // 병합 유형별 특화 확인사항
  const seenSpecKeys = new Set<string>();
  for (const t of allTypesForExport) {
    for (const f of PERMIT_SPECIFICS_FIELDS[t] ?? []) {
      if (!seenSpecKeys.has(f.key)) {
        seenSpecKeys.add(f.key);
        basicRows.push({ 항목: `[${WORK_PERMIT_TYPE_LABELS[t]}] ${f.label}`, 값: permit.specifics[f.key] ?? "" });
      }
    }
  }
  const ws1 = XLSX.utils.json_to_sheet(basicRows);
  ws1["!cols"] = [{ wch: 22 }, { wch: 52 }];
  XLSX.utils.book_append_sheet(wb, ws1, "기본정보");

  // ── 시트 2: 안전체크 ─────────────────────────────────────────
  type CheckRow = { 구분: string; 항목: string; 확인: string };
  const checkRows: CheckRow[] = [];
  for (const item of COMMON_SAFETY_MEASURES) {
    checkRows.push({ 구분: "공통 안전조치", 항목: item, 확인: permit.safetyMeasures?.[item] ? "Y" : "" });
  }
  for (const t of allTypesForExport) {
    for (const item of (PERMIT_SAFETY_CHECKLIST[t] ?? [])) {
      checkRows.push({ 구분: `${WORK_PERMIT_TYPE_LABELS[t]} 체크리스트`, 항목: item, 확인: permit.safetyChecklist?.[item] || "" });
    }
  }
  for (const item of (permit.customChecklistItems ?? [])) {
    checkRows.push({ 구분: "기타(직접입력)", 항목: item, 확인: permit.safetyChecklist?.[item] || "" });
  }
  const ws2 = XLSX.utils.json_to_sheet(checkRows);
  ws2["!cols"] = [{ wch: 28 }, { wch: 50 }, { wch: 6 }];
  XLSX.utils.book_append_sheet(wb, ws2, "안전체크");

  // ── 시트 3: 가스농도측정 (밀폐공간·화기 전용) ───────────────
  if (allTypesForExport.some((t) => t === "confined_space" || t === "hot_work")) {
    const gasRows = permit.gasMeasurements.map((gm) => ({
      가스종류: gm.gasType,
      측정값:   gm.value,
      단위:     gm.unit,
      판정기준: gm.standard,
      합부:     gm.pass ? "적합" : "미확인",
      측정자:   gm.measuredBy,
      확인자:   gm.confirmedBy,
    }));
    const ws3 = XLSX.utils.json_to_sheet(gasRows.length ? gasRows : [{ 가스종류: "", 측정값: "", 단위: "", 판정기준: "", 합부: "", 측정자: "", 확인자: "" }]);
    ws3["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 22 }, { wch: 8 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws3, "가스농도측정");
  }

  // ── 시트 4: 서명결재 ─────────────────────────────────────────
  const sigRows = PERMIT_SIGNATURE_STAGES.map((stage) => {
    const sig = permit.signatures.find((s) => s.stage === stage.stage);
    const statusLabel = sig?.status === "signed" ? "서명완료" : sig?.status === "pending" ? "서명대기" : "미진행";
    return {
      단계:     stage.stage,
      역할:     stage.role,
      단계명:   stage.label,
      성명:     sig?.name       ?? "",
      부서:     sig?.department ?? "",
      직책:     sig?.position   ?? "",
      상태:     statusLabel,
      서명일시: sig?.signedAt ? new Date(sig.signedAt).toLocaleString("ko-KR") : "",
      검토의견: sig?.comment    ?? "",
    };
  });
  const ws4 = XLSX.utils.json_to_sheet(sigRows);
  ws4["!cols"] = [{ wch: 5 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws4, "서명결재");

  const typeLabel = WORK_PERMIT_TYPE_LABELS[permit.type];
  const docTitle  = permit.title || permit.id;
  XLSX.writeFile(wb, `작업허가서_${typeLabel}_${docTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`);
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

function ApprovalSidePanel({ permit }: { permit: WorkPermit }) {
  const { updatePermit, updateSignature } = useWorkPermitStore();
  const [reqModal, setReqModal] = useState<string | null>(null);
  const [sigModal, setSigModal] = useState<{ key: string; label: string } | null>(null);

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

  const tinp = "w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white outline-none focus:border-teal-400 transition-all placeholder:text-slate-300";

  // ── 서명자 행 컴포넌트 ─────────────────────────────────────────
  const SigRow = ({ specKey, label, note }: { specKey: string; label: string; note?: string }) => {
    const done = sigDone(specKey);
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
                  <button onClick={() => setSigModal({ key: specKey + "_sigImg", label })}
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded border"
                    style={{ color: "#7c3aed", borderColor: "#7c3aed40", background: "#7c3aed0d" }}>✍️</button>
                  <button onClick={() => setReqModal(label)}
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded border"
                    style={{ color: PRIMARY, borderColor: `${PRIMARY}40`, background: `${PRIMARY}0d` }}>📨</button>
                </>
            }
          </div>
        </div>
        {!done && (
          <div className="px-2.5 pb-2 pt-1 grid grid-cols-3 gap-1 bg-white border-t border-slate-50">
            <input className={tinp} placeholder="소속" value={getSpec(specKey + "_org")} onChange={e => setSpec(specKey + "_org", e.target.value)} />
            <input className={tinp} placeholder="성명" value={getSpec(specKey + "_name")} onChange={e => setSpec(specKey + "_name", e.target.value)} />
            <input className={tinp} placeholder="연락처" value={getSpec(specKey + "_tel")} onChange={e => setSpec(specKey + "_tel", e.target.value)} />
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
  };

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
                  <SigRow specKey="ap1_client" label="입주사 관리자" />
                  <SigRow specKey="ap1_contractor" label="시공사 안전관리자(작업감독자)" />

                  {/* 1-1. 화기작업 서브단계 */}
                  {isHotWork && (
                    <SubBlock icon="🔥" label="1-1. 화기작업 서명" color="#b91c1c" bg="#fef2f2">
                      <SigRow specKey="ap11_watch" label="화재감시자" />
                      <SigRow specKey="ap11_fire" label="소방안전관리자" />
                      <SigRow specKey="ap11_facility" label="시설팀 담당자" />
                      <SigRow specKey="ap11_construction" label="공사담당자" />
                      <SigRow specKey="ap11_tenant" label="입주사 관리 담당자" />
                      <SigRow specKey="ap11_area" label="작업구역 담당자" />
                      <SigRow specKey="ap11_chief" label="화기취급 책임자" />
                      <div className="border-t border-red-100 my-1" />
                      <p className="text-[10px] font-bold text-red-700 px-1">초기대응체계</p>
                      <SigRow specKey="hw_er_chief" label="현장책임자" />
                      <SigRow specKey="hw_er_contact" label="비상연락" />
                      <SigRow specKey="hw_er_fire" label="초기소화" />
                      <SigRow specKey="hw_er_evac" label="피난유도" />
                    </SubBlock>
                  )}

                  {/* 1-2. 밀폐공간 서브단계 */}
                  {isConfinedSpace && (
                    <SubBlock icon="🚪" label="1-2. 밀폐공간 작업 서명" color="#1d4ed8" bg="#eff6ff">
                      <SigRow specKey="ap12_safety" label="안전관리자" />
                      <SigRow specKey="ap12_chief" label="밀폐공간 작업 책임자" />
                      <SigRow specKey="ap12_watcher" label="밀폐공간 감시자" />
                      <SigRow specKey="ap12_worker" label="밀폐공간 작업자" />
                    </SubBlock>
                  )}

                  {/* 1-3. 고소작업 서브단계 */}
                  {isHeightWork && (
                    <SubBlock icon="🏗️" label="1-3. 고소작업 서명" color="#b45309" bg="#fffbeb">
                      <SigRow specKey="ap13_chief" label="고소작업 책임자" note="운전자격증 확인" />
                      <SigRow specKey="ap13_watcher" label="고소작업 감시자" note="안전대 착용 확인" />
                      <SigRow specKey="ap13_foreman" label="작업반장" note="TBM 실시 확인" />
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
                  <SigRow specKey="ap2_safety" label="안전담당자" />
                  <SigRow specKey="ap2_she" label="SHE관리원" />
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
                  <SigRow specKey="ap3_manager" label="관리소장" />

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
                      <SigRow specKey="ap31_manager" label="관리소장(연장)" />
                      <SigRow specKey="ap31_safety" label="안전담당자(연장)" />
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
                  <SigRow specKey="ap4_site" label="현장소장(시공사)" />
                  <SigRow specKey="ap4_supervisor" label="작업감독자" />

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
              onClick={() => window.print()}
              className="text-xs px-3 py-1.5 rounded-xl border font-medium transition-all hover:opacity-80"
              style={{ borderColor: "#e2e8f0", color: "#475569" }}
              title="인쇄 / 미리보기"
            >
              🖨️ 인쇄
            </button>
            <button
              onClick={() => exportPermitExcel(permit)}
              className="text-xs px-3 py-1.5 rounded-xl border font-medium transition-all hover:opacity-80"
              style={{ borderColor: "#e2e8f0", color: "#475569" }}
              title="허가서 데이터를 엑셀로 내보내기"
            >
              📊 엑셀
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
