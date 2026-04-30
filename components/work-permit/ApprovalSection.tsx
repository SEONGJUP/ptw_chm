"use client";

import React, {
  useRef,
  useEffect,
  useState,
  MouseEvent as ReactMouseEvent,
  TouchEvent as ReactTouchEvent,
} from "react";
import {
  useApprovalStore,
  PermitStatus,
  UserRole,
  Person,
  SignatureRecord,
  PermitDocument,
  NotificationLog,
} from "@/store/approvalStore";

// ─── 상수 ────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<PermitStatus, string> = {
  READY_TO_SUBMIT: "작성완료 (서명 대기)",
  CONTRACTOR_SIGNED: "시공사 서명완료",
  CONTROL_ROOM_REVIEW: "통제실 검토중",
  TENANT_MANAGER_REVIEW: "입주사 관리자 검토중",
  FACILITY_STAFF_REVIEW: "관리소 직원 검토중",
  SAFETY_SHE_REVIEW: "안전/SHE 서명 대기",
  SAFETY_SHE_PARTIAL_SIGNED: "안전/SHE 부분서명",
  FACILITY_MANAGER_FINAL_REVIEW: "관리소장 최종 검토",
  APPROVED: "승인완료",
  REJECTED: "반려",
  EXTENSION_REQUESTED: "연장 요청중",
  EXTENSION_APPROVED: "연장 승인",
  EXTENSION_REJECTED: "연장 반려",
  CONTRACTOR_COMPLETION_SIGNED: "시공사 완료서명",
  CONTROL_ROOM_COMPLETION_SIGNED: "통제실 완료서명",
  LOCKED: "문서 잠금완료",
};

const STATUS_COLORS: Record<PermitStatus, string> = {
  READY_TO_SUBMIT: "bg-amber-100 text-amber-700",
  CONTRACTOR_SIGNED: "bg-blue-100 text-blue-700",
  CONTROL_ROOM_REVIEW: "bg-blue-100 text-blue-700",
  TENANT_MANAGER_REVIEW: "bg-blue-100 text-blue-700",
  FACILITY_STAFF_REVIEW: "bg-blue-100 text-blue-700",
  SAFETY_SHE_REVIEW: "bg-blue-100 text-blue-700",
  SAFETY_SHE_PARTIAL_SIGNED: "bg-yellow-100 text-yellow-700",
  FACILITY_MANAGER_FINAL_REVIEW: "bg-orange-100 text-orange-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  EXTENSION_REQUESTED: "bg-orange-100 text-orange-700",
  EXTENSION_APPROVED: "bg-teal-100 text-teal-700",
  EXTENSION_REJECTED: "bg-red-100 text-red-700",
  CONTRACTOR_COMPLETION_SIGNED: "bg-blue-100 text-blue-700",
  CONTROL_ROOM_COMPLETION_SIGNED: "bg-blue-100 text-blue-700",
  LOCKED: "bg-purple-100 text-purple-700",
};

const ROLE_LABELS: Record<UserRole, string> = {
  CONTRACTOR_SAFETY_MANAGER: "시공사 안전관리자 (김시공)",
  CONTROL_ROOM: "통제실 담당자 (박통제)",
  TENANT_MANAGER: "입주사 관리자",
  FACILITY_STAFF: "관리소 직원 (최관리)",
  SAFETY_OFFICER: "안전담당자",
  SHE_MANAGER: "SHE 관리원",
  FACILITY_MANAGER: "관리소장 (오소장)",
};

const ALL_ROLES: UserRole[] = [
  "CONTRACTOR_SAFETY_MANAGER",
  "CONTROL_ROOM",
  "TENANT_MANAGER",
  "FACILITY_STAFF",
  "SAFETY_OFFICER",
  "SHE_MANAGER",
  "FACILITY_MANAGER",
];

const TENANT_PRESETS: Person[] = [
  { id: "t1", name: "이입주", role: "TENANT_MANAGER", company: "세이프테크", floor: "3층", contact: "010-1111-0001" },
  { id: "t2", name: "최입주", role: "TENANT_MANAGER", company: "대한데이터", floor: "5층", contact: "010-1111-0002" },
  { id: "t3", name: "박입주", role: "TENANT_MANAGER", company: "그린솔루션", floor: "7층", contact: "010-1111-0003" },
];

const FACILITY_STAFF_PRESETS: Person[] = [
  { id: "fs1", name: "최관리", role: "FACILITY_STAFF", department: "시설운영팀", contact: "010-4444-0001" },
  { id: "fs2", name: "박시설", role: "FACILITY_STAFF", department: "시설운영팀", contact: "010-4444-0002" },
  { id: "fs3", name: "윤관리", role: "FACILITY_STAFF", department: "관리팀", contact: "010-4444-0003" },
  { id: "fs4", name: "장운영", role: "FACILITY_STAFF", department: "운영팀", contact: "010-4444-0004" },
];

const SAFETY_OFFICER_PRESETS: Person[] = [
  { id: "so1", name: "정안전", role: "SAFETY_OFFICER", department: "안전팀", contact: "010-5555-0001" },
  { id: "so2", name: "강안전", role: "SAFETY_OFFICER", department: "안전팀", contact: "010-5555-0002" },
];

const SHE_MANAGER_PRESETS: Person[] = [
  { id: "she1", name: "한SHE", role: "SHE_MANAGER", department: "SHE팀", contact: "010-6666-0001" },
  { id: "she2", name: "조SHE", role: "SHE_MANAGER", department: "SHE팀", contact: "010-6666-0002" },
];

// ─── 서명 캔버스 ─────────────────────────────────────────────────────────────

function SignaturePad({
  title = "서명",
  onSave,
  onCancel,
}: {
  title?: string;
  onSave: (url: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  function pos(e: ReactMouseEvent | ReactTouchEvent, c: HTMLCanvasElement) {
    const r = c.getBoundingClientRect();
    const sx = c.width / r.width, sy = c.height / r.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - r.left) * sx, y: (t.clientY - r.top) * sy };
    }
    return { x: ((e as ReactMouseEvent).clientX - r.left) * sx, y: ((e as ReactMouseEvent).clientY - r.top) * sy };
  }

  function start(e: ReactMouseEvent | ReactTouchEvent) {
    const c = canvasRef.current; if (!c) return;
    e.preventDefault(); drawing.current = true; last.current = pos(e, c);
  }
  function move(e: ReactMouseEvent | ReactTouchEvent) {
    if (!drawing.current) return;
    const c = canvasRef.current; if (!c) return;
    e.preventDefault();
    const ctx = c.getContext("2d"); if (!ctx) return;
    const p = pos(e, c);
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y); ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2.5;
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
    last.current = p;
  }
  function stop() { drawing.current = false; }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-base">{title}</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-4">
          <canvas
            ref={canvasRef} width={480} height={280}
            className="w-full border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 touch-none cursor-crosshair"
            style={{ height: 180 }}
            onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop}
            onTouchStart={start} onTouchMove={move} onTouchEnd={stop}
          />
        </div>
        <div className="px-4 pb-4 flex gap-2 justify-end">
          <button
            onClick={() => {
              const c = canvasRef.current; if (!c) return;
              c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
            }}
            className="px-4 py-2 text-sm rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
          >지우기</button>
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg bg-slate-200 text-slate-700">취소</button>
          <button
            onClick={() => { const c = canvasRef.current; if (c) onSave(c.toDataURL("image/png")); }}
            className="px-4 py-2 text-sm rounded-lg bg-teal-600 text-white hover:bg-teal-700 font-semibold"
          >서명 저장</button>
        </div>
      </div>
    </div>
  );
}

// ─── 연장 요청 모달 ──────────────────────────────────────────────────────────

function ExtensionModal({
  originalEndAt, requestedBy, onSubmit, onCancel,
}: {
  originalEndAt: string;
  requestedBy: string;
  onSubmit: (d: { requestedEndAt: string; reason: string; additionalSafetyMeasure?: string; originalEndAt: string; requestedBy: string; signatureDataUrl: string; }) => void;
  onCancel: () => void;
}) {
  const [requestedEndAt, setRequestedEndAt] = useState("");
  const [reason, setReason] = useState("");
  const [extra, setExtra] = useState("");
  const [showPad, setShowPad] = useState(false);
  const [sig, setSig] = useState<string | null>(null);

  if (showPad) return <SignaturePad title="연장 요청 서명" onSave={s => { setSig(s); setShowPad(false); }} onCancel={() => setShowPad(false)} />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-slate-800">연장 요청</h3>
          <button onClick={onCancel} className="text-slate-400 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">기존 종료시각</label><input readOnly value={originalEndAt} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500" /></div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">연장 요청 종료시각 *</label><input type="datetime-local" value={requestedEndAt} onChange={e => setRequestedEndAt(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 outline-none" /></div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">연장 사유 *</label><textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="연장이 필요한 사유" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 outline-none resize-none" /></div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">추가 안전조치</label><textarea value={extra} onChange={e => setExtra(e.target.value)} rows={2} placeholder="추가 안전조치 (선택)" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 outline-none resize-none" /></div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">서명 *</label>
            {sig ? <div className="flex items-center gap-2"><img src={sig} alt="서명" className="h-14 border rounded-lg bg-slate-50" /><button onClick={() => setSig(null)} className="text-xs text-red-500">다시 서명</button></div>
              : <button onClick={() => setShowPad(true)} className="w-full border-2 border-dashed border-slate-300 rounded-lg py-4 text-sm text-slate-400 hover:border-teal-400 hover:text-teal-500">클릭하여 서명하기</button>}
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg bg-slate-100 text-slate-600">취소</button>
          <button onClick={() => { if (!requestedEndAt || !reason || !sig) return; onSubmit({ originalEndAt, requestedEndAt, reason, additionalSafetyMeasure: extra || undefined, requestedBy, signatureDataUrl: sig }); }} disabled={!requestedEndAt || !reason || !sig} className="px-4 py-2 text-sm rounded-lg bg-orange-600 text-white font-semibold disabled:opacity-40">연장 요청 제출</button>
        </div>
      </div>
    </div>
  );
}

// ─── 작업완료 확인 모달 ──────────────────────────────────────────────────────

function CompletionModal({
  onSubmit, onCancel,
}: {
  onSubmit: (d: { actualCompletedAt: string; contractorComment?: string; siteCleaned: boolean; residualRisk: boolean; equipmentRemoved: boolean; contractorSignatureDataUrl?: string; }) => void;
  onCancel: () => void;
}) {
  const [completedAt, setCompletedAt] = useState("");
  const [comment, setComment] = useState("");
  const [cleaned, setCleaned] = useState(false);
  const [risk, setRisk] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [showPad, setShowPad] = useState(false);
  const [sig, setSig] = useState<string | null>(null);

  if (showPad) return <SignaturePad title="작업완료 확인 서명" onSave={s => { setSig(s); setShowPad(false); }} onCancel={() => setShowPad(false)} />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-slate-800">작업완료 확인</h3>
          <button onClick={onCancel} className="text-slate-400 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">실제 작업 완료시각 *</label><input type="datetime-local" value={completedAt} onChange={e => setCompletedAt(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 outline-none" /></div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">완료 확인 의견</label><textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} placeholder="특이사항" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none resize-none" /></div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">현장 상태</p>
            {[
              { label: "현장 정리 완료", val: cleaned, set: setCleaned },
              { label: "잔여 위험 없음", val: !risk, set: (v: boolean) => setRisk(!v) },
              { label: "장비 철수 완료", val: removed, set: setRemoved },
            ].map(({ label, val, set: s }) => (
              <label key={label} className="flex items-center gap-2 cursor-pointer">
                <button type="button" onClick={() => s(!val)} className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all" style={{ borderColor: val ? "#0d9488" : "#cbd5e1", background: val ? "#0d9488" : "white" }}>
                  {val && <span className="text-white text-xs font-bold">✓</span>}
                </button>
                <span className="text-sm text-slate-700">{label}</span>
              </label>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">완료 서명 *</label>
            {sig ? <div className="flex items-center gap-2"><img src={sig} alt="서명" className="h-14 border rounded-lg bg-slate-50" /><button onClick={() => setSig(null)} className="text-xs text-red-500">다시 서명</button></div>
              : <button onClick={() => setShowPad(true)} className="w-full border-2 border-dashed border-slate-300 rounded-lg py-4 text-sm text-slate-400 hover:border-teal-400 hover:text-teal-500">클릭하여 서명하기</button>}
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg bg-slate-100 text-slate-600">취소</button>
          <button onClick={() => { if (!completedAt || !sig) return; onSubmit({ actualCompletedAt: completedAt, contractorComment: comment || undefined, siteCleaned: cleaned, residualRisk: risk, equipmentRemoved: removed, contractorSignatureDataUrl: sig }); }} disabled={!completedAt || !sig} className="px-4 py-2 text-sm rounded-lg bg-teal-600 text-white font-semibold disabled:opacity-40">완료 확인 제출</button>
        </div>
      </div>
    </div>
  );
}

// ─── 입주사 관리자 지정 폼 ───────────────────────────────────────────────────

function TenantAssignForm({ onAssign }: { onAssign: (p: Person) => void }) {
  const [id, setId] = useState("");
  const selected = TENANT_PRESETS.find(p => p.id === id) ?? null;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {TENANT_PRESETS.map(p => (
          <div
            key={p.id}
            onClick={() => setId(p.id)}
            className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition ${id === p.id ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:bg-slate-50"}`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${id === p.id ? "border-teal-500 bg-teal-500" : "border-slate-300"}`}>
              {id === p.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{p.name}</p>
              <p className="text-xs text-slate-500">{p.floor} / {p.company} / {p.contact}</p>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => { if (selected) onAssign(selected); }}
        disabled={!selected}
        className="w-full py-2.5 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition disabled:opacity-40"
      >
        입주사 관리자 지정 및 서명요청 발송
      </button>
    </div>
  );
}

// ─── 안전/SHE 지정 폼 ───────────────────────────────────────────────────────

function SafetySheForm({
  doc, onConfirmStaff, onAssign,
}: {
  doc: { facilityStaff?: Person };
  onConfirmStaff: (p: Person) => void;
  onAssign: (safety: Person, she: Person) => void;
}) {
  const [staffId, setStaffId] = useState("");
  const [safetyId, setSafetyId] = useState("");
  const [sheId, setSheId] = useState("");

  const confirmed = !!doc.facilityStaff;
  const selectedStaff = FACILITY_STAFF_PRESETS.find(p => p.id === staffId) ?? null;
  const selectedSafety = SAFETY_OFFICER_PRESETS.find(p => p.id === safetyId) ?? null;
  const selectedShe = SHE_MANAGER_PRESETS.find(p => p.id === sheId) ?? null;
  const canSubmit = confirmed && !!selectedSafety && !!selectedShe;

  return (
    <div className="space-y-4">
      {/* 실무 담당자 */}
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-1.5">실무 담당자 선택</p>
        {confirmed ? (
          <div className="p-2 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
            {doc.facilityStaff?.name} ({doc.facilityStaff?.department}) 확인됨
          </div>
        ) : (
          <>
            <div className="space-y-1.5 mb-2">
              {FACILITY_STAFF_PRESETS.map(p => (
                <div
                  key={p.id}
                  onClick={() => setStaffId(p.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${staffId === p.id ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:bg-slate-50"}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${staffId === p.id ? "border-teal-500 bg-teal-500" : "border-slate-300"}`}>
                    {staffId === p.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.department} / {p.contact}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => { if (selectedStaff) onConfirmStaff(selectedStaff); }}
              disabled={!selectedStaff}
              className="w-full py-2 rounded-lg bg-slate-700 text-white text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-40"
            >
              실무 담당자로 확인
            </button>
          </>
        )}
      </div>

      {/* 안전담당자 */}
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-1.5">안전담당자 지정</p>
        <div className="space-y-1.5">
          {SAFETY_OFFICER_PRESETS.map(p => (
            <div
              key={p.id}
              onClick={() => setSafetyId(p.id)}
              className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${safetyId === p.id ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${safetyId === p.id ? "border-blue-500 bg-blue-500" : "border-slate-300"}`}>
                {safetyId === p.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                <p className="text-xs text-slate-500">{p.department}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SHE 관리원 */}
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-1.5">SHE 관리원 지정</p>
        <div className="space-y-1.5">
          {SHE_MANAGER_PRESETS.map(p => (
            <div
              key={p.id}
              onClick={() => setSheId(p.id)}
              className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${sheId === p.id ? "border-purple-500 bg-purple-50" : "border-slate-200 hover:bg-slate-50"}`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${sheId === p.id ? "border-purple-500 bg-purple-500" : "border-slate-300"}`}>
                {sheId === p.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                <p className="text-xs text-slate-500">{p.department}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => { if (selectedSafety && selectedShe) onAssign(selectedSafety, selectedShe); }}
        disabled={!canSubmit}
        className="w-full py-2.5 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition disabled:opacity-40"
      >
        서명요청 발송
      </button>
    </div>
  );
}

// ─── 토스트 ──────────────────────────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  function showToast(msg: string, type: "success" | "error" | "info" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }
  const ToastEl = toast ? (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-xl shadow-xl text-sm font-semibold text-white ${toast.type === "success" ? "bg-teal-600" : toast.type === "error" ? "bg-red-600" : "bg-slate-700"}`}>
      {toast.msg}
    </div>
  ) : null;
  return { showToast, ToastEl };
}

// ─── 인라인 서명 안내 ────────────────────────────────────────────────────────

function InlineSignPrompt({ msg = "아래 서명란에서 서명해 주세요" }: { msg?: string }) {
  return (
    <div className="flex items-center gap-2 mt-2 p-2.5 bg-teal-50 rounded-lg border border-teal-300 text-teal-700 text-xs font-semibold">
      <span className="text-base">✍️</span>
      <span className="flex-1">{msg}</span>
      <span className="text-sm">↓</span>
    </div>
  );
}

// ─── 스텝 카드 ───────────────────────────────────────────────────────────────

type StepStatus = "done" | "active" | "pending" | "skipped";

function StepCard({ num, title, person, status, time, children }: {
  num: number; title: string; person?: string; status: StepStatus; time?: string; children?: React.ReactNode;
}) {
  const card: Record<StepStatus, string> = {
    done: "border-green-300 bg-green-50",
    active: "border-teal-400 bg-teal-50",
    pending: "border-slate-200 bg-white",
    skipped: "border-slate-100 bg-slate-50 opacity-60",
  };
  const badge: Record<StepStatus, string> = {
    done: "bg-green-500 text-white",
    active: "bg-teal-500 text-white",
    pending: "bg-slate-200 text-slate-500",
    skipped: "bg-slate-200 text-slate-400",
  };
  const label: Record<StepStatus, string> = { done: "완료", active: "진행중", pending: "대기", skipped: "해당없음" };

  return (
    <div className={`rounded-xl border-2 p-4 transition-all ${card[status]}`}>
      <div className="flex items-start gap-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${badge[status]}`}>
          {status === "done" ? "✓" : num}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-slate-800">{title}</p>
            <span className={`px-2 py-0.5 text-[10px] rounded-full font-semibold ${badge[status]}`}>{label[status]}</span>
          </div>
          {person && <p className="text-xs text-slate-500 mt-0.5">{person}</p>}
          {time && <p className="text-[10px] text-slate-400 mt-0.5">{new Date(time).toLocaleString("ko-KR")}</p>}
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── 서명 박스 ───────────────────────────────────────────────────────────────

function SignatureBox({ label, name, sig, canSign, onSign, btnLabel = "서명하기" }: {
  label: string; name?: string; sig?: SignatureRecord; canSign: boolean; onSign: () => void; btnLabel?: string;
}) {
  return (
    <div className="flex-shrink-0 w-[130px] flex flex-col">
      {/* 헤더 */}
      <div className="bg-slate-800 text-white text-xs font-semibold text-center py-2 rounded-t-xl px-2 truncate">{label}</div>
      {/* 담당자명 */}
      <div className="text-[10px] text-slate-500 text-center py-1 bg-slate-100 border-x border-slate-300 truncate px-2">{name || "미지정"}</div>
      {/* 서명 영역 */}
      <div
        className={`flex-1 border-2 border-t-0 rounded-b-xl flex flex-col items-center justify-center min-h-[100px] transition-all ${
          sig ? "border-green-300 bg-green-50" : canSign ? "border-teal-400 bg-teal-50 cursor-pointer hover:bg-teal-100 active:scale-95" : "border-slate-200 bg-slate-50"
        }`}
        onClick={() => { if (canSign && !sig) onSign(); }}
      >
        {sig ? (
          <>
            <img src={sig.signatureDataUrl} alt="서명" className="h-12 w-full object-contain px-1" />
            <p className="text-[9px] text-green-700 font-semibold mt-1 px-1 truncate w-full text-center">{sig.signerName}</p>
            <p className="text-[9px] text-slate-400 px-1 truncate w-full text-center">{new Date(sig.signedAt).toLocaleDateString("ko-KR")}</p>
          </>
        ) : canSign ? (
          <div className="flex flex-col items-center gap-1 py-2">
            <span className="text-2xl">✍️</span>
            <span className="text-[11px] text-teal-700 font-bold text-center px-1">{btnLabel}</span>
          </div>
        ) : (
          <p className="text-[10px] text-slate-300 py-2">대기중</p>
        )}
      </div>
    </div>
  );
}

// ─── 서명란 (가로 배치) ──────────────────────────────────────────────────────

function SignatureLane({ doc, currentRole, onSign, onOpenCompletion }: {
  doc: PermitDocument; currentRole: UserRole; onSign: (key: string) => void; onOpenCompletion: () => void;
}) {
  const s = doc.status;
  const sigByCode = (code: string) => doc.signatures.find(x => x.stepCode === code);

  const approvalBoxes = [
    { key: s === "REJECTED" ? "resubmit" : "contractor", code: "CONTRACTOR_SIGN", label: "시공사", name: doc.contractorSafetyManagerName, canSign: currentRole === "CONTRACTOR_SAFETY_MANAGER" && (s === "READY_TO_SUBMIT" || s === "REJECTED"), btnLabel: s === "REJECTED" ? "재서명" : "서명하기" },
    { key: "tenant", code: "TENANT_SIGN", label: "입주사 관리자", name: doc.tenantManager?.name, canSign: currentRole === "TENANT_MANAGER" && s === "TENANT_MANAGER_REVIEW", btnLabel: "서명하기" },
    { key: "safety", code: "SAFETY_OFFICER_SIGN", label: "안전담당자", name: doc.safetyOfficer?.name, canSign: currentRole === "SAFETY_OFFICER" && (s === "SAFETY_SHE_REVIEW" || s === "SAFETY_SHE_PARTIAL_SIGNED") && !doc.safetyOfficerSigned, btnLabel: "서명하기" },
    { key: "she", code: "SHE_MANAGER_SIGN", label: "SHE 관리원", name: doc.sheManager?.name, canSign: currentRole === "SHE_MANAGER" && (s === "SAFETY_SHE_REVIEW" || s === "SAFETY_SHE_PARTIAL_SIGNED") && !doc.sheManagerSigned, btnLabel: "서명하기" },
    { key: "facilityApprove", code: "FACILITY_MANAGER_APPROVE", label: "관리소장", name: "오소장", canSign: currentRole === "FACILITY_MANAGER" && s === "FACILITY_MANAGER_FINAL_REVIEW", btnLabel: "최종 승인" },
  ];

  const completionBoxes = [
    { key: "completion_contractor", code: "CONTRACTOR_COMPLETION_SIGN", label: "시공사 완료", name: doc.contractorSafetyManagerName, canSign: currentRole === "CONTRACTOR_SAFETY_MANAGER" && (s === "APPROVED" || s === "EXTENSION_APPROVED"), btnLabel: "완료 확인", isModal: true },
    { key: "controlRoomComplete", code: "CONTROL_ROOM_COMPLETION_SIGN", label: "통제실 완료", name: "박통제", canSign: currentRole === "CONTROL_ROOM" && s === "CONTRACTOR_COMPLETION_SIGNED", btnLabel: "서명하기", isModal: false },
  ];

  return (
    <div className="rounded-2xl border-2 border-slate-300 overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="bg-slate-800 px-5 py-3 flex items-center gap-3">
        <span className="text-white font-bold text-sm">서명란</span>
        <span className="text-slate-400 text-xs">현재 차례인 칸을 클릭하여 서명하세요</span>
      </div>

      <div className="p-4 space-y-5">
        {/* 승인 서명 그룹 */}
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">승인 서명</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {approvalBoxes.map(b => (
              <SignatureBox key={b.key} label={b.label} name={b.name} sig={sigByCode(b.code)} canSign={b.canSign} onSign={() => onSign(b.key)} btnLabel={b.btnLabel} />
            ))}
          </div>
        </div>

        {/* 구분선 */}
        <div className="border-t border-dashed border-slate-200" />

        {/* 작업완료 서명 그룹 */}
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">작업완료 서명</p>
          <div className="flex gap-3">
            {completionBoxes.map(b => (
              <SignatureBox key={b.key} label={b.label} name={b.name} sig={sigByCode(b.code)} canSign={b.canSign} onSign={() => b.isModal ? onOpenCompletion() : onSign(b.key)} btnLabel={b.btnLabel} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 알림 패널 ───────────────────────────────────────────────────────────────

function NotificationPanel({ notifications, currentRole }: { notifications: NotificationLog[]; currentRole: UserRole }) {
  const [collapsed, setCollapsed] = useState(true);
  const unread = notifications.filter(n => !n.read).length;
  const sorted = [...notifications].reverse();
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={() => setCollapsed(v => !v)} className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition">
        <span className="text-xs font-bold text-slate-600">알림 로그</span>
        {unread > 0 && <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-teal-100 text-teal-700 font-bold">{unread} 미확인</span>}
        <span className="ml-auto text-slate-400 text-xs">{collapsed ? "▼" : "▲"}</span>
      </button>
      {!collapsed && (
        <div className="px-4 pb-4 max-h-64 overflow-y-auto space-y-2">
          {sorted.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">알림 없음</p> : sorted.map(n => (
            <div key={n.id} className={`p-2.5 rounded-lg border text-xs ${n.read ? "border-slate-100 bg-white text-slate-500" : "border-teal-200 bg-teal-50 text-slate-700"}`}>
              <div className="flex justify-between mb-0.5"><span className="font-semibold">{n.title}</span><span className="text-slate-400 text-[10px]">{new Date(n.createdAt).toLocaleString("ko-KR")}</span></div>
              <p>{n.message}</p>
              <p className="text-slate-400 mt-0.5">수신: {n.recipientName}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 타임라인 ────────────────────────────────────────────────────────────────

function Timeline({ showToast, onSign, setShowExtModal, setShowCompModal }: {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  onSign: (key: string) => void;
  setShowExtModal: (v: boolean) => void;
  setShowCompModal: (v: boolean) => void;
}) {
  const {
    document: doc, currentRole,
    controlRoomAssignTenant, facilityStaffConfirm, assignSafetyAndShe,
    facilityManagerReject, facilityManagerFinalComplete, rejectExtension,
  } = useApprovalStore();

  const [rejectInput, setRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [extRejectInput, setExtRejectInput] = useState(false);
  const [extRejectReason, setExtRejectReason] = useState("");

  if (!doc) return null;
  const s = doc.status;
  const sig = (code: string) => doc.signatures.find(x => x.stepCode === code);

  function st(done: PermitStatus[], active: PermitStatus[]): StepStatus {
    if (done.includes(s)) return "done";
    if (active.includes(s)) return "active";
    return "pending";
  }

  const AFTER_APPROVED: PermitStatus[] = ["APPROVED","EXTENSION_REQUESTED","EXTENSION_APPROVED","EXTENSION_REJECTED","CONTRACTOR_COMPLETION_SIGNED","CONTROL_ROOM_COMPLETION_SIGNED","LOCKED"];
  const AFTER_TENANT: PermitStatus[] = ["FACILITY_STAFF_REVIEW","SAFETY_SHE_REVIEW","SAFETY_SHE_PARTIAL_SIGNED","FACILITY_MANAGER_FINAL_REVIEW",...AFTER_APPROVED,"REJECTED"];
  const AFTER_SHE: PermitStatus[] = ["FACILITY_MANAGER_FINAL_REVIEW",...AFTER_APPROVED,"REJECTED"];

  return (
    <div className="space-y-3">

      {/* 1. 시공사 서명 */}
      <StepCard num={1} title="시공사 안전관리자 서명" person={`${doc.contractorSafetyManagerName} / ${doc.contractorCompany}`}
        status={s === "READY_TO_SUBMIT" || s === "REJECTED" ? "active" : st(["CONTRACTOR_SIGNED",...AFTER_TENANT],[])}
        time={doc.contractorSignedAt}
      >
        {(s === "READY_TO_SUBMIT" || s === "REJECTED") && currentRole === "CONTRACTOR_SAFETY_MANAGER" && (
          <InlineSignPrompt msg={s === "REJECTED" ? "수정 후 아래 서명란에서 재서명해 주세요" : "아래 서명란에서 서명해 주세요"} />
        )}
        {s === "REJECTED" && doc.rejectionReason && (
          <div className="mt-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            <p className="font-semibold mb-0.5">반려 사유</p>
            <p>{doc.rejectionReason}</p>
          </div>
        )}
      </StepCard>

      {/* 2. 통제실 확인 및 입주사 지정 */}
      <StepCard num={2} title="통제실 확인 및 입주사 관리자 지정" person="박통제 / 통제실"
        status={st(AFTER_TENANT, ["CONTRACTOR_SIGNED"])}
      >
        {doc.tenantManager && (
          <p className="text-xs text-slate-500">지정: {doc.tenantManager.name} ({doc.tenantManager.company} / {doc.tenantManager.floor})</p>
        )}
        {s === "CONTRACTOR_SIGNED" && currentRole === "CONTROL_ROOM" && (
          <div className="mt-3 pt-3 border-t border-teal-200">
            <p className="text-xs font-bold text-slate-700 mb-2">입주사 관리자 지정</p>
            <TenantAssignForm onAssign={p => { controlRoomAssignTenant(p); showToast("입주사 관리자가 지정되었습니다.", "success"); }} />
          </div>
        )}
      </StepCard>

      {/* 3. 입주사 관리자 서명 */}
      <StepCard num={3} title="입주사 관리자 확인 서명"
        person={doc.tenantManager ? `${doc.tenantManager.name} / ${doc.tenantManager.company}` : "미지정"}
        status={st(AFTER_TENANT.filter(x => x !== "TENANT_MANAGER_REVIEW"), ["TENANT_MANAGER_REVIEW"])}
        time={sig("TENANT_SIGN")?.signedAt}
      >
        {s === "TENANT_MANAGER_REVIEW" && currentRole === "TENANT_MANAGER" && <InlineSignPrompt />}
      </StepCard>

      {/* 4. 관리소 직원 확인 및 안전/SHE 지정 */}
      <StepCard num={4} title="관리소 직원 확인 및 안전/SHE 지정"
        person={doc.facilityStaff ? `${doc.facilityStaff.name} / ${doc.facilityStaff.department}` : "미지정"}
        status={st(["SAFETY_SHE_REVIEW","SAFETY_SHE_PARTIAL_SIGNED",...AFTER_SHE],["FACILITY_STAFF_REVIEW"])}
      >
        {doc.safetyOfficer && <p className="text-xs text-slate-500">안전: {doc.safetyOfficer.name}</p>}
        {doc.sheManager && <p className="text-xs text-slate-500">SHE: {doc.sheManager.name}</p>}
        {s === "FACILITY_STAFF_REVIEW" && currentRole === "FACILITY_STAFF" && (
          <div className="mt-3 pt-3 border-t border-teal-200">
            <SafetySheForm
              doc={doc}
              onConfirmStaff={p => { facilityStaffConfirm(p); showToast("실무 담당자로 확인되었습니다.", "info"); }}
              onAssign={(safety, she) => { assignSafetyAndShe(safety, she); showToast("안전/SHE 담당자가 지정되었습니다.", "success"); }}
            />
          </div>
        )}
      </StepCard>

      {/* 5. 안전담당자 서명 */}
      <StepCard num={5} title="안전담당자 서명"
        person={doc.safetyOfficer ? `${doc.safetyOfficer.name} / ${doc.safetyOfficer.department}` : "미지정"}
        status={doc.safetyOfficerSigned ? "done" : (s === "SAFETY_SHE_REVIEW" || s === "SAFETY_SHE_PARTIAL_SIGNED") ? "active" : "pending"}
        time={sig("SAFETY_OFFICER_SIGN")?.signedAt}
      >
        {(s === "SAFETY_SHE_REVIEW" || s === "SAFETY_SHE_PARTIAL_SIGNED") && currentRole === "SAFETY_OFFICER" && !doc.safetyOfficerSigned && <InlineSignPrompt />}
      </StepCard>

      {/* 6. SHE 관리원 서명 */}
      <StepCard num={6} title="SHE 관리원 서명"
        person={doc.sheManager ? `${doc.sheManager.name} / ${doc.sheManager.department}` : "미지정"}
        status={doc.sheManagerSigned ? "done" : (s === "SAFETY_SHE_REVIEW" || s === "SAFETY_SHE_PARTIAL_SIGNED") ? "active" : "pending"}
        time={sig("SHE_MANAGER_SIGN")?.signedAt}
      >
        {(s === "SAFETY_SHE_REVIEW" || s === "SAFETY_SHE_PARTIAL_SIGNED") && currentRole === "SHE_MANAGER" && !doc.sheManagerSigned && <InlineSignPrompt />}
      </StepCard>

      {/* 7. 관리소장 최종 승인/반려 */}
      <StepCard num={7} title={s === "REJECTED" ? "관리소장 반려됨" : "관리소장 최종 승인"}
        person="오소장 / 관리소"
        status={st([...AFTER_APPROVED,"REJECTED"],["FACILITY_MANAGER_FINAL_REVIEW"])}
        time={sig("FACILITY_MANAGER_APPROVE")?.signedAt}
      >
        {s === "FACILITY_MANAGER_FINAL_REVIEW" && currentRole === "FACILITY_MANAGER" && (
          <div className="space-y-2">
            <InlineSignPrompt msg="아래 서명란에서 최종 승인 서명해 주세요" />
            <div className="pt-2 border-t border-teal-200">
              {!rejectInput ? (
                <button onClick={() => setRejectInput(true)} className="px-3 py-1.5 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 font-medium transition">반려 처리</button>
              ) : (
                <div className="space-y-2">
                  <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2} placeholder="반려 사유를 입력하세요" className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-400 resize-none" />
                  <div className="flex gap-2">
                    <button onClick={() => { setRejectInput(false); setRejectReason(""); }} className="flex-1 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs">취소</button>
                    <button onClick={() => { if (!rejectReason) return; facilityManagerReject(rejectReason); setRejectReason(""); setRejectInput(false); showToast("반려 처리되었습니다.", "error"); }} disabled={!rejectReason} className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold disabled:opacity-40">반려 확정</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {s === "REJECTED" && doc.rejectionReason && (
          <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 mt-1">반려 사유: {doc.rejectionReason}</div>
        )}
      </StepCard>

      {/* 연장 요청 내역 */}
      {doc.extensionRequests.length > 0 && (
        <div className="space-y-2">
          {doc.extensionRequests.map((ext, i) => (
            <StepCard key={ext.id} num={8} title={`작업 연장 요청 #${i + 1}`} person={ext.requestedBy}
              status={ext.status === "APPROVED" ? "done" : ext.status === "REJECTED" ? "skipped" : "active"}
              time={ext.approvedAt}
            >
              <div className="text-xs text-slate-500 space-y-0.5">
                <p>요청 종료: {ext.requestedEndAt}</p>
                <p>사유: {ext.reason}</p>
                {ext.additionalSafetyMeasure && <p>추가 안전조치: {ext.additionalSafetyMeasure}</p>}
                {ext.status === "REJECTED" && <p className="text-red-600">반려: {ext.rejectedReason}</p>}
                {ext.status === "APPROVED" && <p className="text-green-600">승인 완료 ({ext.approvedBy})</p>}
              </div>
            </StepCard>
          ))}
        </div>
      )}

      {/* 연장 처리 (관리소장 인라인) */}
      {s === "EXTENSION_REQUESTED" && currentRole === "FACILITY_MANAGER" && (
        <div className="rounded-xl border-2 border-orange-300 bg-orange-50 p-4">
          <p className="text-sm font-bold text-orange-800 mb-2">연장 요청 처리</p>
          {doc.extensionRequests.filter(e => e.status === "PENDING").map(ext => (
            <div key={ext.id} className="p-2.5 bg-white rounded-lg border border-orange-200 text-xs mb-3 space-y-1">
              <p className="font-semibold text-orange-700">요청 내용</p>
              <p className="text-slate-600">요청 종료: {ext.requestedEndAt}</p>
              <p className="text-slate-600">사유: {ext.reason}</p>
              {ext.additionalSafetyMeasure && <p className="text-slate-600">추가 안전조치: {ext.additionalSafetyMeasure}</p>}
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={() => onSign("extensionApprove")} className="flex-1 py-2 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition">연장 승인 및 서명</button>
            {!extRejectInput ? (
              <button onClick={() => setExtRejectInput(true)} className="flex-1 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs hover:bg-red-100 transition">연장 반려</button>
            ) : (
              <div className="flex-1 space-y-1">
                <textarea value={extRejectReason} onChange={e => setExtRejectReason(e.target.value)} rows={2} placeholder="반려 사유" className="w-full border border-red-300 rounded-lg px-2 py-1 text-xs outline-none resize-none" />
                <div className="flex gap-1">
                  <button onClick={() => { setExtRejectInput(false); setExtRejectReason(""); }} className="flex-1 py-1 rounded bg-slate-100 text-slate-600 text-xs">취소</button>
                  <button onClick={() => { if (!extRejectReason) return; rejectExtension(extRejectReason); setExtRejectReason(""); setExtRejectInput(false); showToast("연장 반려되었습니다.", "error"); }} disabled={!extRejectReason} className="flex-1 py-1 rounded bg-red-600 text-white text-xs font-bold disabled:opacity-40">반려 확정</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. 시공사 작업완료 확인 */}
      <StepCard num={9} title="시공사 작업완료 확인" person={doc.contractorSafetyManagerName}
        status={st(["CONTRACTOR_COMPLETION_SIGNED","CONTROL_ROOM_COMPLETION_SIGNED","LOCKED"],["APPROVED","EXTENSION_APPROVED","EXTENSION_REQUESTED"])}
        time={doc.completion?.contractorSignedAt}
      >
        {(s === "APPROVED" || s === "EXTENSION_APPROVED") && currentRole === "CONTRACTOR_SAFETY_MANAGER" && (
          <div className="flex gap-2 mt-1">
            <button onClick={() => setShowExtModal(true)} className="flex-1 py-2 rounded-lg bg-orange-100 border border-orange-200 text-orange-700 text-xs font-semibold hover:bg-orange-200 transition">연장 요청</button>
            <button onClick={() => setShowCompModal(true)} className="flex-1 py-2 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition">작업완료 확인</button>
          </div>
        )}
        {s === "EXTENSION_REQUESTED" && currentRole === "CONTRACTOR_SAFETY_MANAGER" && <p className="text-xs text-orange-600 mt-1">연장 승인 대기중...</p>}
        {doc.completion && (
          <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200 space-y-0.5">
            <p>완료시각: {doc.completion.actualCompletedAt}</p>
            <p>현장정리: {doc.completion.siteCleaned ? "완료" : "미완"} / 장비철수: {doc.completion.equipmentRemoved ? "완료" : "미완"}</p>
          </div>
        )}
      </StepCard>

      {/* 10. 통제실 작업완료 확인 */}
      <StepCard num={10} title="통제실 작업완료 확인 서명" person="박통제 / 통제실"
        status={st(["CONTROL_ROOM_COMPLETION_SIGNED","LOCKED"],["CONTRACTOR_COMPLETION_SIGNED"])}
        time={doc.completion?.controlRoomSignedAt}
      >
        {s === "CONTRACTOR_COMPLETION_SIGNED" && currentRole === "CONTROL_ROOM" && <InlineSignPrompt />}
      </StepCard>

      {/* 11. 관리소장 최종 완료 */}
      <StepCard num={11} title="관리소장 최종 완료 확인 및 잠금" person="오소장 / 관리소"
        status={st(["LOCKED"],["CONTROL_ROOM_COMPLETION_SIGNED"])}
        time={doc.completion?.managerFinalConfirmedAt}
      >
        {s === "CONTROL_ROOM_COMPLETION_SIGNED" && currentRole === "FACILITY_MANAGER" && (
          <button onClick={() => { facilityManagerFinalComplete(); showToast("최종 완료 처리되었습니다. 문서가 잠금됩니다.", "success"); }} className="mt-1 w-full py-2.5 rounded-lg bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition">최종 완료 확인 및 잠금</button>
        )}
        {s === "LOCKED" && <p className="text-xs text-purple-600 font-semibold mt-1">모든 프로세스 완료 — 문서 잠금됨</p>}
      </StepCard>

      {/* 알림 */}
      <NotificationPanel notifications={doc.notifications} currentRole={currentRole} />

      {/* 서명란 */}
      <SignatureLane doc={doc} currentRole={currentRole} onSign={onSign} onOpenCompletion={() => setShowCompModal(true)} />
    </div>
  );
}

// ─── 메인 ApprovalSection ─────────────────────────────────────────────────────

export function ApprovalSection() {
  const { document: doc, currentRole, setCurrentRole, resetDocument } = useApprovalStore();
  const { showToast, ToastEl } = useToast();

  const [showSignPad, setShowSignPad] = useState<string | null>(null);
  const [showExtModal, setShowExtModal] = useState(false);
  const [showCompModal, setShowCompModal] = useState(false);

  const {
    contractorSign, tenantSign, safetyOfficerSign, sheManagerSign,
    facilityManagerApprove, controlRoomCompleteSign, approveExtension,
    resubmitAfterReject, requestExtension, contractorCompleteWork,
  } = useApprovalStore();

  const signActions: Record<string, (sig: string) => void> = {
    contractor: contractorSign,
    resubmit: resubmitAfterReject,
    tenant: tenantSign,
    safety: safetyOfficerSign,
    she: sheManagerSign,
    facilityApprove: facilityManagerApprove,
    controlRoomComplete: controlRoomCompleteSign,
    extensionApprove: approveExtension,
  };

  const signTitles: Record<string, string> = {
    contractor: "시공사 안전관리자 서명",
    resubmit: "재제출 서명",
    tenant: "입주사 관리자 확인 서명",
    safety: "안전담당자 확인 서명",
    she: "SHE 관리원 확인 서명",
    facilityApprove: "관리소장 최종 승인 서명",
    controlRoomComplete: "통제실 완료확인 서명",
    extensionApprove: "연장 승인 서명",
  };

  function onSignSave(sig: string) {
    if (!showSignPad) return;
    const action = signActions[showSignPad];
    if (action) { action(sig); showToast("서명이 완료되었습니다.", "success"); }
    setShowSignPad(null);
  }

  if (!doc) return <div className="text-sm text-slate-400 p-4 text-center">문서를 불러오는 중...</div>;

  const statusLabel = STATUS_LABELS[doc.status] ?? doc.status;
  const statusColor = STATUS_COLORS[doc.status] ?? "bg-slate-100 text-slate-600";

  return (
    <div className="mt-6 border-t-4 border-teal-500 pt-6">
      {ToastEl}

      {/* 서명 모달 */}
      {showSignPad && <SignaturePad title={signTitles[showSignPad] ?? "서명"} onSave={onSignSave} onCancel={() => setShowSignPad(null)} />}

      {/* 연장 요청 모달 */}
      {showExtModal && <ExtensionModal originalEndAt={doc.extendedWorkEndAt ?? doc.workEndAt} requestedBy={doc.contractorSafetyManagerName} onSubmit={d => { requestExtension(d); setShowExtModal(false); showToast("연장 요청이 제출되었습니다.", "info"); }} onCancel={() => setShowExtModal(false)} />}

      {/* 완료 확인 모달 */}
      {showCompModal && <CompletionModal onSubmit={d => { contractorCompleteWork(d); setShowCompModal(false); showToast("작업완료 확인이 제출되었습니다.", "success"); }} onCancel={() => setShowCompModal(false)} />}

      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base font-bold text-slate-800">서명 및 결재 프로세스</h2>
          <span className={`px-2.5 py-1 text-xs rounded-full font-semibold ${statusColor}`}>{statusLabel}</span>
          {doc.isLocked && <span className="px-2 py-0.5 text-[10px] rounded-full bg-purple-100 text-purple-700 font-bold">LOCKED</span>}
        </div>
        <div className="flex items-center gap-2">
          {/* 역할 전환 (데모용) */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">현재 역할:</span>
            <select
              value={currentRole}
              onChange={e => setCurrentRole(e.target.value as UserRole)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <button
            onClick={() => { if (window.confirm("결재 프로세스를 초기화하시겠습니까?")) { resetDocument(); showToast("초기화되었습니다.", "info"); } }}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
          >초기화</button>
        </div>
      </div>

      {/* 타임라인 */}
      <Timeline
        showToast={showToast}
        onSign={key => setShowSignPad(key)}
        setShowExtModal={setShowExtModal}
        setShowCompModal={setShowCompModal}
      />
    </div>
  );
}
