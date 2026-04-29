"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  MouseEvent as ReactMouseEvent,
  TouchEvent as ReactTouchEvent,
} from "react";
import {
  useApprovalStore,
  PermitStatus,
  UserRole,
  Person,
  SignatureRecord,
  NotificationLog,
  ExtensionRequest,
} from "@/store/approvalStore";

// ─── 상수 ────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<PermitStatus, string> = {
  READY_TO_SUBMIT: "작성완료 (제출 전)",
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
  READY_TO_SUBMIT: "bg-slate-100 text-slate-700",
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

// 고정 목록 데이터
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

// ─── 서명 캔버스 컴포넌트 ────────────────────────────────────────────────────

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  title?: string;
}

function SignaturePad({ onSave, onCancel, title = "서명" }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  function getPos(e: ReactMouseEvent | ReactTouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: ((e as ReactMouseEvent).clientX - rect.left) * scaleX, y: ((e as ReactMouseEvent).clientY - rect.top) * scaleY };
  }

  function startDraw(e: ReactMouseEvent | ReactTouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getPos(e, canvas);
  }

  function draw(e: ReactMouseEvent | ReactTouchEvent) {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
  }

  function stopDraw() {
    drawing.current = false;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL("image/png"));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-base">{title}</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-500 mb-2">아래 서명란에 서명해 주세요.</p>
          <canvas
            ref={canvasRef}
            width={480}
            height={300}
            className="w-full border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 touch-none cursor-crosshair"
            style={{ height: 200 }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
        </div>
        <div className="px-4 pb-4 flex gap-2 justify-end">
          <button onClick={clearCanvas} className="px-4 py-2 text-sm rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition">지우기</button>
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition">취소</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition font-semibold">서명 저장</button>
        </div>
      </div>
    </div>
  );
}

// ─── 연장 요청 모달 ──────────────────────────────────────────────────────────

interface ExtensionModalProps {
  originalEndAt: string;
  onSubmit: (data: {
    requestedEndAt: string;
    reason: string;
    additionalSafetyMeasure?: string;
    originalEndAt: string;
    requestedBy: string;
    signatureDataUrl: string;
  }) => void;
  onCancel: () => void;
  requestedBy: string;
}

function ExtensionModal({ originalEndAt, onSubmit, onCancel, requestedBy }: ExtensionModalProps) {
  const [requestedEndAt, setRequestedEndAt] = useState("");
  const [reason, setReason] = useState("");
  const [additionalSafetyMeasure, setAdditionalSafetyMeasure] = useState("");
  const [showSignPad, setShowSignPad] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  function handleSave() {
    if (!requestedEndAt || !reason || !signature) return;
    onSubmit({
      originalEndAt,
      requestedEndAt,
      reason,
      additionalSafetyMeasure: additionalSafetyMeasure || undefined,
      requestedBy,
      signatureDataUrl: signature,
    });
  }

  if (showSignPad) {
    return (
      <SignaturePad
        title="연장 요청 서명"
        onSave={(url) => { setSignature(url); setShowSignPad(false); }}
        onCancel={() => setShowSignPad(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-base">연장 요청</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">기존 작업 종료시각</label>
            <input readOnly value={originalEndAt} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">연장 요청 종료시각 <span className="text-red-500">*</span></label>
            <input
              type="datetime-local"
              value={requestedEndAt}
              onChange={(e) => setRequestedEndAt(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">연장 사유 <span className="text-red-500">*</span></label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
              placeholder="연장이 필요한 사유를 입력하세요"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">추가 안전조치</label>
            <textarea
              value={additionalSafetyMeasure}
              onChange={(e) => setAdditionalSafetyMeasure(e.target.value)}
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
              placeholder="추가 안전조치가 있으면 입력하세요"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">서명 <span className="text-red-500">*</span></label>
            {signature ? (
              <div className="flex items-center gap-2">
                <img src={signature} alt="서명" className="h-16 border rounded-lg bg-slate-50" />
                <button onClick={() => setSignature(null)} className="text-xs text-red-500 hover:underline">다시 서명</button>
              </div>
            ) : (
              <button
                onClick={() => setShowSignPad(true)}
                className="w-full border-2 border-dashed border-slate-300 rounded-lg py-4 text-sm text-slate-400 hover:border-teal-400 hover:text-teal-500 transition"
              >
                클릭하여 서명하기
              </button>
            )}
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition">취소</button>
          <button
            onClick={handleSave}
            disabled={!requestedEndAt || !reason || !signature}
            className="px-4 py-2 text-sm rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition font-semibold disabled:opacity-40"
          >
            연장 요청 제출
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 작업완료 확인 모달 ──────────────────────────────────────────────────────

interface CompletionModalProps {
  onSubmit: (data: {
    actualCompletedAt: string;
    contractorComment?: string;
    siteCleaned: boolean;
    residualRisk: boolean;
    equipmentRemoved: boolean;
    contractorSignatureDataUrl?: string;
  }) => void;
  onCancel: () => void;
}

function CompletionModal({ onSubmit, onCancel }: CompletionModalProps) {
  const [actualCompletedAt, setActualCompletedAt] = useState("");
  const [contractorComment, setContractorComment] = useState("");
  const [siteCleaned, setSiteCleaned] = useState(false);
  const [residualRisk, setResidualRisk] = useState(false);
  const [equipmentRemoved, setEquipmentRemoved] = useState(false);
  const [showSignPad, setShowSignPad] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  function handleSave() {
    if (!actualCompletedAt || !signature) return;
    onSubmit({
      actualCompletedAt,
      contractorComment: contractorComment || undefined,
      siteCleaned,
      residualRisk,
      equipmentRemoved,
      contractorSignatureDataUrl: signature,
    });
  }

  if (showSignPad) {
    return (
      <SignaturePad
        title="작업완료 확인 서명"
        onSave={(url) => { setSignature(url); setShowSignPad(false); }}
        onCancel={() => setShowSignPad(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-base">작업완료 확인</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">실제 작업 완료시각 <span className="text-red-500">*</span></label>
            <input
              type="datetime-local"
              value={actualCompletedAt}
              onChange={(e) => setActualCompletedAt(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">완료 확인 의견</label>
            <textarea
              value={contractorComment}
              onChange={(e) => setContractorComment(e.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
              placeholder="특이사항을 입력하세요"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">현장 상태 확인</p>
            {[
              { label: "현장 정리 완료", value: siteCleaned, setter: setSiteCleaned },
              { label: "잔여 위험 없음", value: !residualRisk, setter: (v: boolean) => setResidualRisk(!v) },
              { label: "장비 철수 완료", value: equipmentRemoved, setter: setEquipmentRemoved },
            ].map(({ label, value, setter }) => (
              <label key={label} className="flex items-center gap-2 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setter(!value)}
                  className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0"
                  style={{ borderColor: value ? "#0d9488" : "#cbd5e1", background: value ? "#0d9488" : "white" }}
                >
                  {value && <span className="text-white text-xs leading-none font-bold">✓</span>}
                </button>
                <span className="text-sm text-slate-700">{label}</span>
              </label>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">완료 서명 <span className="text-red-500">*</span></label>
            {signature ? (
              <div className="flex items-center gap-2">
                <img src={signature} alt="서명" className="h-16 border rounded-lg bg-slate-50" />
                <button onClick={() => setSignature(null)} className="text-xs text-red-500 hover:underline">다시 서명</button>
              </div>
            ) : (
              <button
                onClick={() => setShowSignPad(true)}
                className="w-full border-2 border-dashed border-slate-300 rounded-lg py-4 text-sm text-slate-400 hover:border-teal-400 hover:text-teal-500 transition"
              >
                클릭하여 서명하기
              </button>
            )}
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition">취소</button>
          <button
            onClick={handleSave}
            disabled={!actualCompletedAt || !signature}
            className="px-4 py-2 text-sm rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition font-semibold disabled:opacity-40"
          >
            완료 확인 제출
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 입주사 관리자 지정 폼 ───────────────────────────────────────────────────

interface TenantAssignFormProps {
  onAssign: (person: Person) => void;
}

function TenantAssignForm({ onAssign }: TenantAssignFormProps) {
  const [tab, setTab] = useState<"preset" | "manual">("preset");
  const [selectedId, setSelectedId] = useState<string>("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [floor, setFloor] = useState("");
  const [contact, setContact] = useState("");

  function handleAssign() {
    if (tab === "preset") {
      const p = TENANT_PRESETS.find((t) => t.id === selectedId);
      if (p) onAssign(p);
    } else {
      if (!name) return;
      onAssign({ id: `t_manual_${Date.now()}`, name, role: "TENANT_MANAGER", company, floor, contact });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
        {(["preset", "manual"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-xs rounded-md font-medium transition ${tab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
          >
            {t === "preset" ? "목록 선택" : "직접 입력"}
          </button>
        ))}
      </div>

      {tab === "preset" ? (
        <div className="space-y-1.5">
          {TENANT_PRESETS.map((p) => (
            <label
              key={p.id}
              className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition ${selectedId === p.id ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:bg-slate-50"}`}
            >
              <input type="radio" name="tenant" value={p.id} checked={selectedId === p.id} onChange={() => setSelectedId(p.id)} className="sr-only" />
              <div>
                <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                <p className="text-xs text-slate-500">{p.floor} / {p.company} / {p.contact}</p>
              </div>
            </label>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {[
            { label: "이름", value: name, setter: setName, required: true },
            { label: "회사명", value: company, setter: setCompany },
            { label: "층", value: floor, setter: setFloor },
            { label: "연락처", value: contact, setter: setContact },
          ].map(({ label, value, setter, required }) => (
            <div key={label}>
              <label className="block text-xs text-slate-500 mb-0.5">{label}{required && " *"}</label>
              <input
                value={value}
                onChange={(e) => setter(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleAssign}
        disabled={tab === "preset" ? !selectedId : !name}
        className="w-full py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition disabled:opacity-40"
      >
        입주사 관리자 지정 및 발송
      </button>
    </div>
  );
}

// ─── 안전/SHE 지정 폼 ───────────────────────────────────────────────────────

interface SafetySheFormProps {
  currentRole: UserRole;
  document: { facilityStaff?: Person };
  onConfirmStaff: (person: Person) => void;
  onAssign: (safety: Person, she: Person) => void;
}

function SafetySheForm({ currentRole, document: doc, onConfirmStaff, onAssign }: SafetySheFormProps) {
  const [staffId, setStaffId] = useState(doc.facilityStaff?.id ?? "");
  const [safetyId, setSafetyId] = useState("");
  const [sheId, setSheId] = useState("");
  const [safetyTab, setSafetyTab] = useState<"preset" | "manual">("preset");
  const [sheTab, setSheTab] = useState<"preset" | "manual">("preset");
  const [safetyManual, setSafetyManual] = useState({ name: "", department: "", contact: "" });
  const [sheManual, setSheManual] = useState({ name: "", department: "", contact: "" });

  function getStaffPerson(): Person | null {
    const p = FACILITY_STAFF_PRESETS.find((s) => s.id === staffId);
    return p ?? null;
  }

  function getSafetyPerson(): Person | null {
    if (safetyTab === "preset") return SAFETY_OFFICER_PRESETS.find((s) => s.id === safetyId) ?? null;
    if (!safetyManual.name) return null;
    return { id: `so_m_${Date.now()}`, name: safetyManual.name, role: "SAFETY_OFFICER", department: safetyManual.department, contact: safetyManual.contact };
  }

  function getShePerson(): Person | null {
    if (sheTab === "preset") return SHE_MANAGER_PRESETS.find((s) => s.id === sheId) ?? null;
    if (!sheManual.name) return null;
    return { id: `she_m_${Date.now()}`, name: sheManual.name, role: "SHE_MANAGER", department: sheManual.department, contact: sheManual.contact };
  }

  function handleSend() {
    const safety = getSafetyPerson();
    const she = getShePerson();
    if (!safety || !she) return;
    onAssign(safety, she);
  }

  const staffConfirmed = !!doc.facilityStaff;

  return (
    <div className="space-y-4">
      {/* 실무 담당자 확인 */}
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-1.5">실무 담당자 선택</p>
        {staffConfirmed ? (
          <div className="p-2.5 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
            {doc.facilityStaff?.name} ({doc.facilityStaff?.department}) 확인됨
          </div>
        ) : (
          <>
            <div className="space-y-1.5 mb-2">
              {FACILITY_STAFF_PRESETS.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${staffId === p.id ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:bg-slate-50"}`}
                >
                  <input type="radio" name="fstaff" value={p.id} checked={staffId === p.id} onChange={() => setStaffId(p.id)} className="sr-only" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.department} / {p.contact}</p>
                  </div>
                </label>
              ))}
            </div>
            <button
              onClick={() => { const p = getStaffPerson(); if (p) onConfirmStaff(p); }}
              disabled={!staffId}
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
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-2">
          {(["preset", "manual"] as const).map((t) => (
            <button key={t} onClick={() => setSafetyTab(t)} className={`flex-1 py-1 text-xs rounded-md font-medium transition ${safetyTab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
              {t === "preset" ? "목록" : "직접입력"}
            </button>
          ))}
        </div>
        {safetyTab === "preset" ? (
          <div className="space-y-1.5">
            {SAFETY_OFFICER_PRESETS.map((p) => (
              <label key={p.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${safetyId === p.id ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}>
                <input type="radio" name="safety" value={p.id} checked={safetyId === p.id} onChange={() => setSafetyId(p.id)} className="sr-only" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.department} / {p.contact}</p>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {["name", "department", "contact"].map((k) => (
              <input
                key={k}
                value={safetyManual[k as keyof typeof safetyManual]}
                onChange={(e) => setSafetyManual((prev) => ({ ...prev, [k]: e.target.value }))}
                placeholder={{ name: "이름 *", department: "부서", contact: "연락처" }[k]}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            ))}
          </div>
        )}
      </div>

      {/* SHE 관리원 */}
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-1.5">SHE 관리원 지정</p>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-2">
          {(["preset", "manual"] as const).map((t) => (
            <button key={t} onClick={() => setSheTab(t)} className={`flex-1 py-1 text-xs rounded-md font-medium transition ${sheTab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
              {t === "preset" ? "목록" : "직접입력"}
            </button>
          ))}
        </div>
        {sheTab === "preset" ? (
          <div className="space-y-1.5">
            {SHE_MANAGER_PRESETS.map((p) => (
              <label key={p.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${sheId === p.id ? "border-purple-500 bg-purple-50" : "border-slate-200 hover:bg-slate-50"}`}>
                <input type="radio" name="she" value={p.id} checked={sheId === p.id} onChange={() => setSheId(p.id)} className="sr-only" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.department} / {p.contact}</p>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {["name", "department", "contact"].map((k) => (
              <input
                key={k}
                value={sheManual[k as keyof typeof sheManual]}
                onChange={(e) => setSheManual((prev) => ({ ...prev, [k]: e.target.value }))}
                placeholder={{ name: "이름 *", department: "부서", contact: "연락처" }[k]}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleSend}
        disabled={!staffConfirmed || !getSafetyPerson() || !getShePerson()}
        className="w-full py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition disabled:opacity-40"
      >
        서명요청 발송
      </button>
    </div>
  );
}

// ─── 토스트 ──────────────────────────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  function showToast(message: string, type: "success" | "error" | "info" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  const ToastEl = toast ? (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-xl shadow-xl text-sm font-semibold text-white transition-all ${
      toast.type === "success" ? "bg-teal-600" : toast.type === "error" ? "bg-red-600" : "bg-slate-700"
    }`}>
      {toast.message}
    </div>
  ) : null;

  return { showToast, ToastEl };
}

// ─── 서명 표시 ───────────────────────────────────────────────────────────────

function SignatureDisplay({ sig }: { sig: SignatureRecord | undefined }) {
  if (!sig) return <div className="h-12 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-300">미서명</div>;
  return (
    <div className="space-y-0.5">
      <img src={sig.signatureDataUrl} alt="서명" className="h-12 border rounded-lg bg-slate-50 object-contain w-full" />
      <p className="text-[10px] text-slate-400">{sig.signerName} · {new Date(sig.signedAt).toLocaleString("ko-KR")}</p>
    </div>
  );
}

// ─── 타임라인 스텝 카드 ──────────────────────────────────────────────────────

interface StepCardProps {
  stepNum: number;
  title: string;
  person?: string;
  status: "done" | "active" | "pending" | "skipped";
  signedAt?: string;
  signature?: SignatureRecord;
  children?: React.ReactNode;
}

function StepCard({ stepNum, title, person, status, signedAt, signature, children }: StepCardProps) {
  const colors = {
    done: "border-green-300 bg-green-50",
    active: "border-teal-400 bg-teal-50",
    pending: "border-slate-200 bg-white",
    skipped: "border-slate-100 bg-slate-50 opacity-60",
  };
  const badgeColors = {
    done: "bg-green-500 text-white",
    active: "bg-teal-500 text-white",
    pending: "bg-slate-200 text-slate-500",
    skipped: "bg-slate-200 text-slate-400",
  };
  const statusLabels = { done: "완료", active: "진행중", pending: "대기", skipped: "해당없음" };

  return (
    <div className={`rounded-xl border-2 p-3.5 transition-all ${colors[status]}`}>
      <div className="flex items-start gap-2.5">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${badgeColors[status]}`}>
          {status === "done" ? "✓" : stepNum}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-800">{title}</p>
            <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${badgeColors[status]}`}>{statusLabels[status]}</span>
          </div>
          {person && <p className="text-xs text-slate-500 mt-0.5">{person}</p>}
          {signedAt && <p className="text-[10px] text-slate-400 mt-0.5">{new Date(signedAt).toLocaleString("ko-KR")}</p>}
          {signature && (
            <div className="mt-2">
              <img src={signature.signatureDataUrl} alt="서명" className="h-10 border rounded bg-white object-contain" />
            </div>
          )}
          {children && <div className="mt-2">{children}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── 인쇄 미리보기 ───────────────────────────────────────────────────────────

function PrintPreview() {
  const document = useApprovalStore((s) => s.document);
  if (!document) return null;

  const printStatuses: PermitStatus[] = ["APPROVED", "EXTENSION_APPROVED", "CONTRACTOR_COMPLETION_SIGNED", "CONTROL_ROOM_COMPLETION_SIGNED", "LOCKED"];
  const canPrint = printStatuses.includes(document.status);

  const PRINT_STEPS = [
    { stepCode: "CONTRACTOR_SIGN", label: "시공사 안전관리자 서명" },
    { stepCode: "TENANT_SIGN", label: "입주사 관리자 서명" },
    { stepCode: "SAFETY_OFFICER_SIGN", label: "안전담당자 서명" },
    { stepCode: "SHE_MANAGER_SIGN", label: "SHE 관리원 서명" },
    { stepCode: "FACILITY_MANAGER_APPROVE", label: "관리소장 최종 승인 서명" },
    { stepCode: "CONTRACTOR_COMPLETION_SIGN", label: "시공사 안전관리자 작업완료 서명" },
    { stepCode: "CONTROL_ROOM_COMPLETION_SIGN", label: "통제실 담당자 작업완료 서명" },
  ];

  if (!canPrint) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        승인 완료(APPROVED) 이후부터 인쇄 미리보기가 활성화됩니다.
      </div>
    );
  }

  return (
    <div className="p-6 print:p-2" id="print-area">
      <style>{`@media print { .no-print { display: none !important; } #print-area { padding: 0; } }`}</style>
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow p-6 border border-slate-200">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-slate-900">작업허가서</h1>
          <p className="text-sm text-slate-500 mt-1">{document.permitNo}</p>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-6">
          {[
            ["현장명", document.siteName],
            ["작업위치", document.location],
            ["작업유형", document.workType],
            ["시공사", document.contractorCompany],
            ["안전관리자", document.contractorSafetyManagerName],
            ["작업인원", `${document.workerCount}명`],
            ["작업시작", document.workStartAt],
            ["작업종료", document.extendedWorkEndAt ?? document.workEndAt],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="text-slate-500 w-20 flex-shrink-0">{k}</span>
              <span className="font-medium text-slate-800">{v}</span>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 mb-1">작업내용</p>
          <p className="text-sm text-slate-800">{document.workDescription}</p>
        </div>

        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 mb-1">위험요인</p>
          <div className="flex flex-wrap gap-1.5">
            {document.riskFactors.map((r) => <span key={r} className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs">{r}</span>)}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-500 mb-1">안전조치</p>
          <div className="flex flex-wrap gap-1.5">
            {document.safetyMeasures.map((s) => <span key={s} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">{s}</span>)}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <p className="text-xs font-semibold text-slate-500 mb-3">서명 확인</p>
          <div className="grid grid-cols-2 gap-4">
            {PRINT_STEPS.map(({ stepCode, label }) => {
              const sig = document.signatures.find((s) => s.stepCode === stepCode);
              return (
                <div key={stepCode} className="border border-slate-200 rounded-xl p-3">
                  <p className="text-xs text-slate-600 mb-2 font-medium">{label}</p>
                  {sig ? (
                    <>
                      <img src={sig.signatureDataUrl} alt="서명" className="h-14 w-full object-contain border rounded bg-slate-50" />
                      <p className="text-[10px] text-slate-400 mt-1">{sig.signerName} / {new Date(sig.signedAt).toLocaleDateString("ko-KR")}</p>
                    </>
                  ) : (
                    <div className="h-14 border border-dashed border-slate-200 rounded flex items-center justify-center text-xs text-slate-300">미서명</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex justify-center mt-4 no-print">
        <button
          onClick={() => window.print()}
          className="px-6 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 transition"
        >
          인쇄하기
        </button>
      </div>
    </div>
  );
}

// ─── 알림 패널 ───────────────────────────────────────────────────────────────

function NotificationPanel({ notifications, currentRole }: { notifications: NotificationLog[]; currentRole: UserRole }) {
  const [filterRole, setFilterRole] = useState<UserRole | "ALL">("ALL");
  const filtered = filterRole === "ALL" ? notifications : notifications.filter((n) => n.recipientRole === filterRole);
  const sorted = [...filtered].reverse();

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-bold text-slate-700">알림 로그</h3>
        <span className="text-xs text-slate-400">({notifications.filter((n) => !n.read).length} 미확인)</span>
      </div>
      <div className="flex gap-1 mb-3 flex-wrap">
        <button onClick={() => setFilterRole("ALL")} className={`px-2 py-0.5 text-xs rounded-full transition ${filterRole === "ALL" ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>전체</button>
        {ALL_ROLES.map((r) => (
          <button key={r} onClick={() => setFilterRole(r)} className={`px-2 py-0.5 text-xs rounded-full transition ${filterRole === r ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {ROLE_LABELS[r].split("(")[0].trim()}
          </button>
        ))}
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {sorted.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">알림이 없습니다.</p>
        ) : (
          sorted.map((n) => (
            <div key={n.id} className={`p-2.5 rounded-lg border text-xs ${n.read ? "border-slate-100 bg-white text-slate-500" : "border-teal-200 bg-teal-50 text-slate-700"}`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-semibold">{n.title}</span>
                <span className="text-slate-400 text-[10px]">{new Date(n.createdAt).toLocaleString("ko-KR")}</span>
              </div>
              <p className="text-slate-600">{n.message}</p>
              <p className="text-slate-400 mt-0.5">수신: {n.recipientName}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── 우측 액션 패널 ──────────────────────────────────────────────────────────

interface ActionPanelProps {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

function ActionPanel({ showToast }: ActionPanelProps) {
  const {
    document,
    currentRole,
    contractorSign,
    controlRoomAssignTenant,
    tenantSign,
    facilityStaffConfirm,
    assignSafetyAndShe,
    safetyOfficerSign,
    sheManagerSign,
    facilityManagerApprove,
    facilityManagerReject,
    resubmitAfterReject,
    requestExtension,
    approveExtension,
    rejectExtension,
    contractorCompleteWork,
    controlRoomCompleteSign,
    facilityManagerFinalComplete,
  } = useApprovalStore();

  const [showSignPad, setShowSignPad] = useState<string | null>(null); // key for which sign
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [extRejectReason, setExtRejectReason] = useState("");
  const [showExtRejectInput, setShowExtRejectInput] = useState(false);

  if (!document) return <div className="text-sm text-slate-400 p-4">문서가 없습니다.</div>;

  const status = document.status;
  const isLocked = document.isLocked;

  function handleSign(key: string, action: (sig: string) => void) {
    setShowSignPad(key);
    return (sig: string) => {
      action(sig);
      showToast("서명이 완료되었습니다.", "success");
    };
  }

  // 서명 모달 핸들러 생성
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

  function openSign(key: string) {
    setShowSignPad(key);
  }

  function onSignSave(sig: string) {
    if (!showSignPad) return;
    const action = signActions[showSignPad];
    if (action) {
      action(sig);
      showToast("서명이 완료되었습니다.", "success");
    }
    setShowSignPad(null);
  }

  // 서명 모달
  if (showSignPad) {
    const titles: Record<string, string> = {
      contractor: "시공사 안전관리자 서명",
      resubmit: "재제출 서명",
      tenant: "입주사 관리자 확인 서명",
      safety: "안전담당자 확인 서명",
      she: "SHE 관리원 확인 서명",
      facilityApprove: "관리소장 최종 승인 서명",
      controlRoomComplete: "통제실 완료확인 서명",
      extensionApprove: "연장 승인 서명",
    };
    return (
      <SignaturePad
        title={titles[showSignPad] ?? "서명"}
        onSave={onSignSave}
        onCancel={() => setShowSignPad(null)}
      />
    );
  }

  // 연장 모달
  if (showExtensionModal) {
    return (
      <ExtensionModal
        originalEndAt={document.extendedWorkEndAt ?? document.workEndAt}
        requestedBy={document.contractorSafetyManagerName}
        onSubmit={(data) => {
          requestExtension(data);
          setShowExtensionModal(false);
          showToast("연장 요청이 제출되었습니다.", "info");
        }}
        onCancel={() => setShowExtensionModal(false)}
      />
    );
  }

  // 완료 모달
  if (showCompletionModal) {
    return (
      <CompletionModal
        onSubmit={(data) => {
          contractorCompleteWork(data);
          setShowCompletionModal(false);
          showToast("작업완료 확인이 제출되었습니다.", "success");
        }}
        onCancel={() => setShowCompletionModal(false)}
      />
    );
  }

  // ── CONTRACTOR_SAFETY_MANAGER 액션 ──
  if (currentRole === "CONTRACTOR_SAFETY_MANAGER") {
    if (status === "READY_TO_SUBMIT") {
      return (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">작업허가서 작성이 완료되었습니다. 서명 후 제출하세요.</p>
          <button onClick={() => openSign("contractor")} disabled={isLocked} className="w-full py-3 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 transition disabled:opacity-40">
            작성완료 및 서명진행
          </button>
        </div>
      );
    }
    if (status === "REJECTED") {
      return (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-red-50 border border-red-200">
            <p className="text-xs font-semibold text-red-700 mb-1">반려 사유</p>
            <p className="text-sm text-red-600">{document.rejectionReason}</p>
          </div>
          <button onClick={() => openSign("resubmit")} disabled={isLocked} className="w-full py-3 rounded-xl bg-orange-600 text-white font-bold text-sm hover:bg-orange-700 transition disabled:opacity-40">
            재작성 완료 및 서명진행
          </button>
        </div>
      );
    }
    if (status === "APPROVED" || status === "EXTENSION_APPROVED") {
      return (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-green-50 border border-green-200">
            <p className="text-xs font-semibold text-green-700">작업허가서가 승인되었습니다.</p>
          </div>
          <button onClick={() => setShowExtensionModal(true)} className="w-full py-2.5 rounded-xl bg-orange-100 text-orange-700 font-semibold text-sm hover:bg-orange-200 transition">
            작업 연장 요청
          </button>
          <button onClick={() => setShowCompletionModal(true)} className="w-full py-2.5 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 transition">
            작업 완료 확인
          </button>
        </div>
      );
    }
    if (status === "EXTENSION_REQUESTED") {
      return (
        <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-sm text-orange-700">
          연장 승인 대기중입니다.
        </div>
      );
    }
    if (status === "CONTRACTOR_COMPLETION_SIGNED") {
      return <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700">통제실 완료확인 대기중입니다.</div>;
    }
    if (status === "LOCKED") {
      return <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-sm text-purple-700">문서가 잠금되었습니다. 모든 프로세스가 완료되었습니다.</div>;
    }
    return <div className="text-sm text-slate-400 p-3">현재 처리할 단계가 아닙니다.</div>;
  }

  // ── CONTROL_ROOM 액션 ──
  if (currentRole === "CONTROL_ROOM") {
    if (status === "CONTRACTOR_SIGNED") {
      return (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">입주사 관리자 지정</p>
          <TenantAssignForm
            onAssign={(person) => {
              controlRoomAssignTenant(person);
              showToast("입주사 관리자가 지정되었습니다.", "success");
            }}
          />
        </div>
      );
    }
    if (status === "CONTRACTOR_COMPLETION_SIGNED") {
      return (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">시공사 완료 확인이 제출되었습니다. 통제실 확인 서명을 진행하세요.</p>
          <button onClick={() => openSign("controlRoomComplete")} className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition">
            통제실 완료확인 서명
          </button>
        </div>
      );
    }
    return <div className="text-sm text-slate-400 p-3">현재 처리할 단계가 아닙니다.</div>;
  }

  // ── TENANT_MANAGER 액션 ──
  if (currentRole === "TENANT_MANAGER") {
    if (status === "TENANT_MANAGER_REVIEW") {
      return (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">입주사 관리자로서 작업허가서를 확인하고 서명하세요.</p>
          {document.tenantManager && (
            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
              지정 담당자: {document.tenantManager.name} ({document.tenantManager.company})
            </div>
          )}
          <button onClick={() => openSign("tenant")} className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition">
            확인 및 서명
          </button>
        </div>
      );
    }
    return <div className="text-sm text-slate-400 p-3">현재 처리할 단계가 아닙니다.</div>;
  }

  // ── FACILITY_STAFF 액션 ──
  if (currentRole === "FACILITY_STAFF") {
    if (status === "FACILITY_STAFF_REVIEW") {
      return (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">관리소 직원 확인 및 담당자 지정</p>
          <SafetySheForm
            currentRole={currentRole}
            document={document}
            onConfirmStaff={(person) => {
              facilityStaffConfirm(person);
              showToast("실무 담당자로 확인되었습니다.", "info");
            }}
            onAssign={(safety, she) => {
              assignSafetyAndShe(safety, she);
              showToast("안전/SHE 담당자가 지정되었습니다.", "success");
            }}
          />
        </div>
      );
    }
    return <div className="text-sm text-slate-400 p-3">현재 처리할 단계가 아닙니다.</div>;
  }

  // ── SAFETY_OFFICER 액션 ──
  if (currentRole === "SAFETY_OFFICER") {
    if (status === "SAFETY_SHE_REVIEW" || status === "SAFETY_SHE_PARTIAL_SIGNED") {
      if (document.safetyOfficerSigned) {
        return (
          <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
            안전담당자 서명 완료. SHE 관리원 서명 대기중입니다.
          </div>
        );
      }
      return (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">안전담당자로서 작업허가서를 검토하고 서명하세요.</p>
          {document.safetyOfficer && (
            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
              지정 담당자: {document.safetyOfficer.name} ({document.safetyOfficer.department})
            </div>
          )}
          <button onClick={() => openSign("safety")} className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition">
            안전담당자 서명
          </button>
        </div>
      );
    }
    return <div className="text-sm text-slate-400 p-3">현재 처리할 단계가 아닙니다.</div>;
  }

  // ── SHE_MANAGER 액션 ──
  if (currentRole === "SHE_MANAGER") {
    if (status === "SAFETY_SHE_REVIEW" || status === "SAFETY_SHE_PARTIAL_SIGNED") {
      if (document.sheManagerSigned) {
        return (
          <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
            SHE 관리원 서명 완료. 안전담당자 서명 대기중입니다.
          </div>
        );
      }
      return (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">SHE 관리원으로서 작업허가서를 검토하고 서명하세요.</p>
          {document.sheManager && (
            <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-xs text-purple-700">
              지정 담당자: {document.sheManager.name} ({document.sheManager.department})
            </div>
          )}
          <button onClick={() => openSign("she")} className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition">
            SHE 관리원 서명
          </button>
        </div>
      );
    }
    return <div className="text-sm text-slate-400 p-3">현재 처리할 단계가 아닙니다.</div>;
  }

  // ── FACILITY_MANAGER 액션 ──
  if (currentRole === "FACILITY_MANAGER") {
    if (status === "FACILITY_MANAGER_FINAL_REVIEW") {
      return (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">모든 검토가 완료되었습니다. 최종 승인 또는 반려를 진행하세요.</p>
          <button onClick={() => openSign("facilityApprove")} className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition">
            최종 승인 및 서명
          </button>
          {!showRejectInput ? (
            <button onClick={() => setShowRejectInput(true)} className="w-full py-2.5 rounded-xl bg-red-100 text-red-700 font-semibold text-sm hover:bg-red-200 transition">
              반려
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="반려 사유를 입력하세요"
                className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowRejectInput(false)} className="flex-1 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm hover:bg-slate-200 transition">취소</button>
                <button
                  onClick={() => {
                    if (!rejectReason) return;
                    facilityManagerReject(rejectReason);
                    setRejectReason("");
                    setShowRejectInput(false);
                    showToast("반려 처리되었습니다.", "error");
                  }}
                  disabled={!rejectReason}
                  className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-40"
                >
                  반려 확정
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }
    if (status === "EXTENSION_REQUESTED") {
      return (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">연장 요청이 접수되었습니다.</p>
          {document.extensionRequests.filter((e) => e.status === "PENDING").map((ext) => (
            <div key={ext.id} className="p-3 rounded-lg bg-orange-50 border border-orange-200 text-xs space-y-1">
              <p className="font-semibold text-orange-700">연장 요청 내용</p>
              <p className="text-slate-600">요청 종료: {ext.requestedEndAt}</p>
              <p className="text-slate-600">사유: {ext.reason}</p>
              {ext.additionalSafetyMeasure && <p className="text-slate-600">추가 안전조치: {ext.additionalSafetyMeasure}</p>}
            </div>
          ))}
          <button onClick={() => openSign("extensionApprove")} className="w-full py-2.5 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 transition">
            연장 승인 및 서명
          </button>
          {!showExtRejectInput ? (
            <button onClick={() => setShowExtRejectInput(true)} className="w-full py-2 rounded-xl bg-red-100 text-red-700 font-semibold text-sm hover:bg-red-200 transition">
              연장 반려
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={extRejectReason}
                onChange={(e) => setExtRejectReason(e.target.value)}
                rows={2}
                placeholder="연장 반려 사유"
                className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowExtRejectInput(false)} className="flex-1 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-sm">취소</button>
                <button
                  onClick={() => {
                    if (!extRejectReason) return;
                    rejectExtension(extRejectReason);
                    setExtRejectReason("");
                    setShowExtRejectInput(false);
                    showToast("연장 반려 처리되었습니다.", "error");
                  }}
                  disabled={!extRejectReason}
                  className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-40"
                >
                  반려 확정
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }
    if (status === "CONTROL_ROOM_COMPLETION_SIGNED") {
      return (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">통제실 완료 확인이 완료되었습니다. 최종 확인 후 문서를 잠금하세요.</p>
          <button
            onClick={() => {
              facilityManagerFinalComplete();
              showToast("최종 완료 처리되었습니다. 문서가 잠금됩니다.", "success");
            }}
            className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition"
          >
            최종 완료 확인 및 잠금
          </button>
        </div>
      );
    }
    if (status === "LOCKED") {
      return <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-sm text-purple-700">문서 잠금 완료. 모든 프로세스가 종료되었습니다.</div>;
    }
    return <div className="text-sm text-slate-400 p-3">현재 처리할 단계가 아닙니다.</div>;
  }

  return <div className="text-sm text-slate-400 p-3">역할을 선택해 주세요.</div>;
}

// ─── 타임라인 메인 ───────────────────────────────────────────────────────────

function Timeline() {
  const document = useApprovalStore((s) => s.document);
  if (!document) return null;

  const s = document.status;

  const stepStatus = (doneStatuses: PermitStatus[], activeStatuses: PermitStatus[]): "done" | "active" | "pending" => {
    if (doneStatuses.includes(s)) return "done";
    if (activeStatuses.includes(s)) return "active";
    return "pending";
  };

  const sigByCode = (code: string) => document.signatures.find((sig) => sig.stepCode === code);

  const AFTER_APPROVED: PermitStatus[] = ["APPROVED", "EXTENSION_REQUESTED", "EXTENSION_APPROVED", "EXTENSION_REJECTED", "CONTRACTOR_COMPLETION_SIGNED", "CONTROL_ROOM_COMPLETION_SIGNED", "LOCKED"];
  const AFTER_TENANT: PermitStatus[] = ["FACILITY_STAFF_REVIEW", "SAFETY_SHE_REVIEW", "SAFETY_SHE_PARTIAL_SIGNED", "FACILITY_MANAGER_FINAL_REVIEW", ...AFTER_APPROVED, "REJECTED"];
  const AFTER_CONTRACTOR_SIGNED: PermitStatus[] = ["CONTROL_ROOM_REVIEW", "TENANT_MANAGER_REVIEW", ...AFTER_TENANT];
  const AFTER_SAFETY_SHE: PermitStatus[] = ["FACILITY_MANAGER_FINAL_REVIEW", ...AFTER_APPROVED, "REJECTED"];

  return (
    <div className="space-y-3">
      {/* 1. 시공사 서명 */}
      <StepCard
        stepNum={1}
        title="시공사 안전관리자 서명"
        person={`${document.contractorSafetyManagerName} / ${document.contractorCompany}`}
        status={s === "READY_TO_SUBMIT" ? "active" : stepStatus(
          ["CONTRACTOR_SIGNED", ...AFTER_CONTRACTOR_SIGNED],
          []
        )}
        signedAt={document.contractorSignedAt}
        signature={sigByCode("CONTRACTOR_SIGN")}
      />

      {/* 2. 통제실 확인 + 입주사 관리자 지정 */}
      <StepCard
        stepNum={2}
        title="통제실 확인 및 입주사 관리자 지정"
        person="박통제 / 통제실"
        status={stepStatus(
          AFTER_TENANT,
          ["CONTRACTOR_SIGNED"]
        )}
        signedAt={document.tenantManager ? document.signatures.find((sig) => sig.stepCode === "TENANT_SIGN")?.signedAt : undefined}
      >
        {document.tenantManager && (
          <p className="text-xs text-slate-500">지정: {document.tenantManager.name} ({document.tenantManager.company}, {document.tenantManager.floor})</p>
        )}
      </StepCard>

      {/* 3. 입주사 관리자 서명 */}
      <StepCard
        stepNum={3}
        title="입주사 관리자 확인 서명"
        person={document.tenantManager ? `${document.tenantManager.name} / ${document.tenantManager.company}` : "미지정"}
        status={stepStatus(
          AFTER_TENANT.filter((x) => x !== "TENANT_MANAGER_REVIEW"),
          ["TENANT_MANAGER_REVIEW"]
        )}
        signedAt={sigByCode("TENANT_SIGN")?.signedAt}
        signature={sigByCode("TENANT_SIGN")}
      />

      {/* 4. 관리소 직원 확인 + 안전/SHE 지정 */}
      <StepCard
        stepNum={4}
        title="관리소 직원 확인 및 안전/SHE 지정"
        person={document.facilityStaff ? `${document.facilityStaff.name} / ${document.facilityStaff.department}` : "미지정"}
        status={stepStatus(
          ["SAFETY_SHE_REVIEW", "SAFETY_SHE_PARTIAL_SIGNED", ...AFTER_SAFETY_SHE],
          ["FACILITY_STAFF_REVIEW"]
        )}
      >
        {document.safetyOfficer && <p className="text-xs text-slate-500">안전: {document.safetyOfficer.name}</p>}
        {document.sheManager && <p className="text-xs text-slate-500">SHE: {document.sheManager.name}</p>}
      </StepCard>

      {/* 5. 안전담당자 서명 */}
      <StepCard
        stepNum={5}
        title="안전담당자 서명"
        person={document.safetyOfficer ? `${document.safetyOfficer.name} / ${document.safetyOfficer.department}` : "미지정"}
        status={
          document.safetyOfficerSigned
            ? "done"
            : s === "SAFETY_SHE_REVIEW" || s === "SAFETY_SHE_PARTIAL_SIGNED"
            ? "active"
            : "pending"
        }
        signedAt={sigByCode("SAFETY_OFFICER_SIGN")?.signedAt}
        signature={sigByCode("SAFETY_OFFICER_SIGN")}
      />

      {/* 6. SHE 관리원 서명 */}
      <StepCard
        stepNum={6}
        title="SHE 관리원 서명"
        person={document.sheManager ? `${document.sheManager.name} / ${document.sheManager.department}` : "미지정"}
        status={
          document.sheManagerSigned
            ? "done"
            : s === "SAFETY_SHE_REVIEW" || s === "SAFETY_SHE_PARTIAL_SIGNED"
            ? "active"
            : "pending"
        }
        signedAt={sigByCode("SHE_MANAGER_SIGN")?.signedAt}
        signature={sigByCode("SHE_MANAGER_SIGN")}
      />

      {/* 7. 관리소장 최종 승인 */}
      <StepCard
        stepNum={7}
        title="관리소장 최종 승인"
        person="오소장 / 관리소"
        status={stepStatus(
          [...AFTER_APPROVED, "REJECTED"],
          ["FACILITY_MANAGER_FINAL_REVIEW"]
        )}
        signedAt={sigByCode("FACILITY_MANAGER_APPROVE")?.signedAt}
        signature={sigByCode("FACILITY_MANAGER_APPROVE")}
      >
        {s === "REJECTED" && document.rejectionReason && (
          <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 mt-1">
            반려 사유: {document.rejectionReason}
          </div>
        )}
      </StepCard>

      {/* 8. 연장 요청 (있을 때) */}
      {document.extensionRequests.length > 0 && (
        <div className="space-y-2">
          {document.extensionRequests.map((ext, i) => (
            <StepCard
              key={ext.id}
              stepNum={8}
              title={`작업 연장 요청 #${i + 1}`}
              person={ext.requestedBy}
              status={ext.status === "APPROVED" ? "done" : ext.status === "REJECTED" ? "skipped" : "active"}
              signedAt={ext.approvedAt}
            >
              <div className="text-xs text-slate-500 space-y-0.5 mt-1">
                <p>요청 종료: {ext.requestedEndAt}</p>
                <p>사유: {ext.reason}</p>
                {ext.status === "REJECTED" && <p className="text-red-600">반려: {ext.rejectedReason}</p>}
                {ext.status === "APPROVED" && <p className="text-green-600">승인 완료 ({ext.approvedBy})</p>}
              </div>
            </StepCard>
          ))}
        </div>
      )}

      {/* 9. 작업완료 확인 (시공사) */}
      <StepCard
        stepNum={9}
        title="시공사 작업완료 확인"
        person={document.contractorSafetyManagerName}
        status={stepStatus(
          ["CONTRACTOR_COMPLETION_SIGNED", "CONTROL_ROOM_COMPLETION_SIGNED", "LOCKED"],
          []
        )}
        signedAt={document.completion?.contractorSignedAt}
      >
        {document.completion && (
          <div className="text-xs text-slate-500 space-y-0.5 mt-1">
            <p>완료시각: {document.completion.actualCompletedAt}</p>
            <p>현장정리: {document.completion.siteCleaned ? "완료" : "미완"} / 장비철수: {document.completion.equipmentRemoved ? "완료" : "미완"}</p>
          </div>
        )}
        {sigByCode("CONTRACTOR_COMPLETION_SIGN") && (
          <img src={sigByCode("CONTRACTOR_COMPLETION_SIGN")?.signatureDataUrl} alt="서명" className="h-10 border rounded bg-white object-contain mt-1" />
        )}
      </StepCard>

      {/* 10. 통제실 완료 확인 */}
      <StepCard
        stepNum={10}
        title="통제실 작업완료 확인"
        person="박통제 / 통제실"
        status={stepStatus(
          ["CONTROL_ROOM_COMPLETION_SIGNED", "LOCKED"],
          ["CONTRACTOR_COMPLETION_SIGNED"]
        )}
        signedAt={document.completion?.controlRoomSignedAt}
        signature={sigByCode("CONTROL_ROOM_COMPLETION_SIGN")}
      />

      {/* 11. 관리소장 최종 완료 확인 */}
      <StepCard
        stepNum={11}
        title="관리소장 최종 완료 확인 및 잠금"
        person="오소장 / 관리소"
        status={stepStatus(
          ["LOCKED"],
          ["CONTROL_ROOM_COMPLETION_SIGNED"]
        )}
        signedAt={document.completion?.managerFinalConfirmedAt}
      />

      {/* 알림 로그 */}
      <NotificationPanel notifications={document.notifications} currentRole={document.status as unknown as UserRole} />
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

export default function PermitApprovalPage() {
  const { document, currentRole, setCurrentRole, initDocument, resetDocument } = useApprovalStore();
  const [tab, setTab] = useState<"process" | "print">("process");
  const { showToast, ToastEl } = useToast();

  // 문서 초기화
  useEffect(() => {
    initDocument();
  }, [initDocument]);

  if (!document) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-400 text-sm">
        문서를 불러오는 중...
      </div>
    );
  }

  const statusColor = STATUS_COLORS[document.status] ?? "bg-slate-100 text-slate-600";
  const statusLabel = STATUS_LABELS[document.status] ?? document.status;

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {ToastEl}

      {/* 헤더 */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 px-4 py-3 print:hidden">
        <div className="flex items-center gap-3 flex-wrap">
          {/* 문서 정보 */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-mono text-slate-400 flex-shrink-0">{document.permitNo}</span>
            <span className="text-sm font-semibold text-slate-800 truncate max-w-[180px] lg:max-w-xs">{document.title}</span>
            <span className={`px-2 py-0.5 text-xs rounded-full font-medium flex-shrink-0 ${statusColor}`}>
              {statusLabel}
            </span>
            {document.isLocked && (
              <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-100 text-purple-700 font-bold flex-shrink-0">LOCKED</span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {/* 역할 전환 */}
            <select
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value as UserRole)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white text-slate-700"
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>

            {/* 데모 초기화 */}
            <button
              onClick={() => {
                if (window.confirm("데모를 초기 상태로 초기화하시겠습니까?")) {
                  resetDocument();
                  showToast("초기화되었습니다.", "info");
                }
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
            >
              데모 초기화
            </button>

            {/* 탭 */}
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {(["process", "print"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition ${tab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {t === "process" ? "승인 프로세스" : "인쇄 미리보기"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* 바디 */}
      {tab === "print" ? (
        <div className="flex-1 overflow-y-auto">
          <PrintPreview />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">

          {/* 좌측: 문서 요약 (PC only) */}
          <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
            <div className="p-4 space-y-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">문서 요약</h2>

              <div className="space-y-2.5 text-xs">
                {[
                  ["문서번호", document.permitNo],
                  ["현장명", document.siteName],
                  ["위치", document.location],
                  ["작업유형", document.workType],
                  ["시공사", document.contractorCompany],
                  ["안전관리자", document.contractorSafetyManagerName],
                  ["작업인원", `${document.workerCount}명`],
                  ["시작", document.workStartAt],
                  ["종료", document.extendedWorkEndAt ?? document.workEndAt],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-slate-400 font-medium">{k}</p>
                    <p className="text-slate-700 font-semibold mt-0.5">{v}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-slate-400 font-medium text-xs mb-1">작업내용</p>
                <p className="text-xs text-slate-700 leading-relaxed">{document.workDescription}</p>
              </div>

              <div>
                <p className="text-slate-400 font-medium text-xs mb-1.5">위험요인</p>
                <div className="flex flex-wrap gap-1">
                  {document.riskFactors.map((r) => <span key={r} className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded text-[10px]">{r}</span>)}
                </div>
              </div>

              <div>
                <p className="text-slate-400 font-medium text-xs mb-1.5">안전조치</p>
                <div className="flex flex-wrap gap-1">
                  {document.safetyMeasures.map((s) => <span key={s} className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-[10px]">{s}</span>)}
                </div>
              </div>

              <div>
                <p className="text-slate-400 font-medium text-xs mb-1.5">장비</p>
                <div className="flex flex-wrap gap-1">
                  {document.equipment.map((e) => <span key={e} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px]">{e}</span>)}
                </div>
              </div>

              <div>
                <p className="text-slate-400 font-medium text-xs mb-0.5">비상연락처</p>
                <p className="text-xs text-slate-700">{document.emergencyContact}</p>
              </div>

              {document.isLocked && (
                <div className="p-2 rounded-lg bg-purple-50 border border-purple-200">
                  <p className="text-[10px] font-bold text-purple-700">문서 잠금됨</p>
                  {document.lockedAt && <p className="text-[10px] text-purple-500">{new Date(document.lockedAt).toLocaleString("ko-KR")}</p>}
                </div>
              )}
            </div>
          </aside>

          {/* 중앙: 타임라인 */}
          <main className="flex-1 overflow-y-auto p-4 min-w-0">
            {/* 모바일 현재 상태 */}
            <div className="lg:hidden mb-3 p-3 rounded-xl bg-white border border-slate-200">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-slate-400">{document.permitNo}</span>
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusColor}`}>{statusLabel}</span>
              </div>
              <p className="text-sm font-semibold text-slate-800 mt-1 truncate">{document.title}</p>
            </div>

            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 hidden lg:block">승인 타임라인</h2>
            <Timeline />
          </main>

          {/* 우측: 액션 패널 */}
          <aside className="flex-shrink-0 lg:w-72 xl:w-80 border-t lg:border-t-0 lg:border-l border-slate-200 bg-white overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">현재 액션</h2>
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-teal-100 text-teal-700 font-medium">
                  {ROLE_LABELS[currentRole].split("(")[0].trim()}
                </span>
              </div>
              <ActionPanel showToast={showToast} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
