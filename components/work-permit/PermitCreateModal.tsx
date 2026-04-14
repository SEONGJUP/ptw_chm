"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useWorkPermitStore,
  WorkPermitType,
  WorkPermit,
  WORK_PERMIT_TYPE_LABELS,
} from "@/store/workPermitStore";
const PRIMARY = "#E05A2B";
const PRIMARY_LIGHT = "#FEF3ED";

const PERMIT_TYPES: { type: WorkPermitType; icon: string; label: string; desc: string; legal?: boolean }[] = [
  { type: "general",           icon: "📋", label: "일반작업 허가서",            desc: "일반 작업 허가" },
  { type: "hot_work",          icon: "🔥", label: "화기작업 허가서",            desc: "용접·절단 등 화기",     legal: true },
  { type: "electrical",        icon: "⚡", label: "전기작업 허가서",            desc: "전기 차단·활선 작업",   legal: true },
  { type: "confined_space",    icon: "🚪", label: "밀폐공간작업 허가서",        desc: "맨홀·탱크 진입",        legal: true },
  { type: "working_at_height", icon: "🏗️", label: "고소작업 허가서",            desc: "2m 이상 고소 작업",     legal: true },
  { type: "excavation",        icon: "⛏️", label: "굴착작업 허가서",            desc: "굴착·터파기 작업" },
  { type: "heavy_load",        icon: "🏋️", label: "중량물작업 허가서",          desc: "중량물 양중·운반" },
  { type: "night_overtime",    icon: "🌙", label: "야간·조출·휴일 작업허가서",   desc: "야간·조출·휴일 작업" },
  { type: "short_time",        icon: "⏱️", label: "단시간 작업허가서",           desc: "단시간 작업 (2시간 이내)" },
];

export default function PermitCreateModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { createPermit } = useWorkPermitStore();

  const [selectedTypes, setSelectedTypes] = useState<WorkPermitType[]>(["general"]);
  const [customTypeName, setCustomTypeName] = useState("");

  const toggleType = (type: WorkPermitType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const canCreate = selectedTypes.length > 0;

  const handleCreate = () => {
    if (selectedTypes.length === 0) return;
    const [primaryType, ...extraTypes] = selectedTypes;
    const prefill: Partial<WorkPermit> = { extraTypes, customTypeName: customTypeName.trim() };
    const newId = createPermit(primaryType, prefill);
    onClose();
    router.push(`/work-plan/permits?permit=${newId}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(15,23,42,0.55)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full mx-4"
        style={{ maxWidth: 780, maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0" style={{ background: PRIMARY_LIGHT }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: PRIMARY }}>🔑 새 작업허가서 생성</h2>
            <p className="text-xs text-slate-500 mt-0.5">허가서 유형을 선택하고, 작업계획서를 연동할 수 있습니다</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        {/* 본문: 좌 / 우 */}
        <div className="flex flex-1 overflow-hidden">

          {/* 허가서 유형 */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex-shrink-0">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">새 허가서 생성</p>
              <p className="text-xs text-slate-400 mt-0.5">복수 선택 가능 · 첫 번째 선택이 주 유형이 됩니다 *</p>
            </div>
            <div className="p-3 space-y-1.5">
              {PERMIT_TYPES.map(({ type, icon, label, desc, legal }) => {
                const sel = selectedTypes.includes(type);
                const isPrimary = selectedTypes[0] === type;
                const isSuggested = false;
                return (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all"
                    style={{
                      borderColor: sel ? PRIMARY : "#e2e8f0",
                      background: sel ? PRIMARY_LIGHT : "white",
                      boxShadow: sel ? `0 0 0 2px ${PRIMARY}33` : "none",
                    }}
                  >
                    {/* 체크박스 */}
                    <div
                      className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        background: sel ? PRIMARY : "white",
                        borderColor: sel ? PRIMARY : "#cbd5e1",
                      }}
                    >
                      {sel && <span className="text-white" style={{ fontSize: 9 }}>✓</span>}
                    </div>
                    <span className="text-xl flex-shrink-0">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold" style={{ color: sel ? PRIMARY : "#334155" }}>{label}</p>
                        {legal && <span className="text-xs px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-medium" style={{ fontSize: 10 }}>⚖️법정</span>}
                        {isPrimary && sel && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: PRIMARY, color: "white", fontSize: 10 }}>주 유형</span>}
                        {isSuggested && !sel && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: "#f1f5f9", color: "#64748b", fontSize: 10 }}>추천</span>}
                      </div>
                      <p className="text-xs text-slate-400">{desc}</p>
                    </div>
                  </button>
                );
              })}

              {/* 기타 작업명 직접입력 */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 mb-1.5 px-1">🖊️ 기타 작업명 직접입력 <span className="text-slate-300 font-normal">(선택사항)</span></p>
                <input
                  value={customTypeName}
                  onChange={(e) => setCustomTypeName(e.target.value)}
                  placeholder="예: 도장작업, 비계설치작업, 해체작업 등"
                  className="w-full px-3 py-2 border border-dashed rounded-xl text-xs outline-none transition-colors"
                  style={{
                    borderColor: customTypeName ? PRIMARY : "#cbd5e1",
                    background: customTypeName ? PRIMARY_LIGHT : "#f8fafc",
                    color: customTypeName ? "#0f766e" : "#94a3b8",
                  }}
                />
                {customTypeName && (
                  <p className="text-xs mt-1.5 px-1" style={{ color: PRIMARY }}>
                    ✓ 허가서 상단에 <strong>"{customTypeName}"</strong> 으로 표시됩니다
                  </p>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* 하단 액션 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white flex-shrink-0">
          <div className="flex-1 min-w-0 mr-4">
            {selectedTypes.length > 0 ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedTypes.map((t, i) => {
                  const meta = PERMIT_TYPES.find((p) => p.type === t);
                  return (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: i === 0 ? PRIMARY : PRIMARY_LIGHT, color: i === 0 ? "white" : PRIMARY }}>
                      {meta?.icon} {WORK_PERMIT_TYPE_LABELS[t]}
                    </span>
                  );
                })}
                {customTypeName.trim() && (
                  <span className="text-xs text-slate-400">— {customTypeName.trim()}</span>
                )}
              </div>
            ) : (
              <span className="text-xs text-red-400">* 허가서 유형을 선택하세요</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">
              취소
            </button>
            <button
              onClick={handleCreate}
              disabled={!canCreate}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all"
              style={{
                background: canCreate ? PRIMARY : "#cbd5e1",
                cursor: canCreate ? "pointer" : "not-allowed",
                boxShadow: canCreate ? `0 2px 8px ${PRIMARY}44` : "none",
              }}
            >
              🔑 생성
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
