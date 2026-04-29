"use client";
import React, { useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { WorkPermit } from "@/store/workPermitStore";
import { useWorkPermitStore } from "@/store/workPermitStore";
import { useApprovalStore } from "@/store/approvalStore";

// ════════════════════════════════════════════════════
// 체크리스트 상수
// ════════════════════════════════════════════════════
type ChecklistItem = { key: string; label: string; detail: string | null; isPPE?: boolean; checkRight?: boolean };
const SAFETY_CHECKLIST: ChecklistItem[] = [
  { key: "privacy",   label: "비밀/보안준수", detail: "비밀/보안준수 서약서는 승인을 득하였는가?" },
  { key: "ppe",       label: "안전보호구",     detail: null,   isPPE: true },
  { key: "signs",     label: "경고표지판",     detail: "작업안내표지판, 작업 위험표지판(전기/고소)은 설치하였는가?" },
  { key: "fireExt",   label: "소화기비치",     detail: "작업장에 적정 소화기를 배치하였는가?" },
  { key: "hotWork2",  label: "화기작업",       detail: "용접작업 시 불꽃방지망/방염포 등을 설치하였는가?" },
  { key: "hazard",    label: "유해/위험요인",  detail: "작업에 따른 유해/위험요인에 대한 내용을 전달받았는가?" },
  { key: "material",  label: "자재 양중",      detail: "자재 양중 장소, 이동경로 및 일정협의는 완료되었는가?" },
  { key: "extend",    label: "작업기간 연장",  detail: "작업기간 및 시간 연장 시 이에 대한 확인을 하고 명시하였는가?" },
  { key: "safetyEdu", label: "안전작업",       detail: "작업자 안전작업 관련 특별교육 이수 여부", checkRight: true },
];

const PPE_ITEMS = ["안전모", "안전화", "안전벨트", "방진마스크", "보안경"];

type HotCheckItem = { label: string; confined?: boolean; nameInput?: boolean };

const HOT_WORK_APP_CHECKLIST: HotCheckItem[] = [
  { label: "작업구역 설정 및 출입제한 조치 여부" },
  { label: "작업에 맞는 보호구 착용 여부" },
  { label: "작업구역 내 가스농도 측정 및 잔류물질 확인 여부" },
  { label: "작업구역 11m 內 인화성 및 가연성 물질 제거상태" },
  { label: "인화성 물질 취급 작업과 동시작업 유무" },
  { label: "불티 비산방지조치(불티차단막/방화포 등) 실시 여부" },
  { label: "작업지점 5m 이내 소화기 비치 여부" },
  { label: "교육 실시 여부(소방시설 사용법, 피난로 위치, 초기대응체계 등)" },
  { label: "밀폐공간 관계자 외 출입제한 여부", confined: true },
  { label: "밀폐공간 작업에 필요한 보호구 착용 여부", confined: true },
  { label: "밀폐공간의 환기 설비 설치 여부", confined: true },
  { label: "작업자의 개인통신장비 및 휴대용 산소농도측정기 착용 여부", confined: true },
  { label: "구조장비(구급함/구명줄/삼각대 등) 준비 여부", confined: true },
  { label: "가스 및 산소농도 측정 여부", confined: true },
  { label: "전화하면 5분이내 구조할 수 있는 위치에 구조팀 대기", confined: true },
  { label: "필요한 구조팀 담당자 성명", confined: true, nameInput: true },
];

const HOT_WORK_PERMIT_CHECKLIST: HotCheckItem[] = [
  { label: "화기작업 허가서 발급 및 비치 여부" },
  { label: "화재감시자 배치 여부" },
  { label: "작업구역 설정 및 출입제한 조치 여부" },
  { label: "작업에 맞는 보호구 착용 여부" },
  { label: "작업구역 내 가스농도 측정 및 잔류물질 확인 여부" },
  { label: "작업구역 11m 內 인화성 및 가연성 물질 제거상태" },
  { label: "인화성 물질 취급 작업과 동시작업 유무" },
  { label: "불티 비산방지조치(불티차단막/방화포 등) 실시 여부" },
  { label: "작업지점 5m 이내 소화기 비치 여부" },
  { label: "교육 실시 여부(소방시설 사용법, 피난로 위치, 초기대응체계 등)" },
  { label: "밀폐공간 관계자 외 출입제한 여부", confined: true },
  { label: "밀폐공간 작업에 필요한 보호구 착용 여부", confined: true },
  { label: "밀폐공간의 환기 설비 설치 여부", confined: true },
  { label: "작업자의 개인통신장비 및 휴대용 산소농도측정기 착용 여부", confined: true },
  { label: "구조장비(구급함/구명줄/삼각대 등) 준비 여부", confined: true },
  { label: "가스 및 산소농도 측정 여부", confined: true },
  { label: "전화하면 5분이내 구조할 수 있는 위치에 구조팀 대기", confined: true },
  { label: "필요한 구조팀 담당자 성명", confined: true, nameInput: true },
];

type HeightCheckGroup = { section: string; items: string[] };
const HEIGHT_WORK_CHECKLIST: HeightCheckGroup[] = [
  {
    section: "작업시작 전 점검사항(작업장비의 작동상태점검)",
    items: [
      "비상정지장치 및 비상 하강 방지장치 기능의 이상 유무",
      "과부하 방지 장치의 작동 유무(와이어로프 또는 체인구동방식의 경우)",
      "아웃트리거 또는 바퀴의 이상 유무",
      "작업면의 기울기 또는 요철 유무",
      "활선 작업용 장치의 경우 홈·균열·파손 등 그 밖의 손상 유무",
    ],
  },
  {
    section: "작업 시 준수사항",
    items: [
      "바닥 면과 고소작업대가 수평을 유지하는가?",
      "작업자가 안전모·안전대 등의 보호구를 착용하였는가?",
      "관계자가 아닌 사람이 작업 구역에 들어오지 못하도록 조치하였는가?",
    ],
  },
  {
    section: "이동 시 준수사항",
    items: [
      "작업대를 가장 낮게 내릴 것",
      "작업대를 올린 상태에서 작업자를 태우고 이동하지 말 것",
      "이동 통로의 요철 상태 또는 장애물의 유무 등을 확인할 것",
    ],
  },
];

const CONFINED_SPACE_CHECKLIST = [
  "출입 전 산소농도 측정 (18%~23.5%)",
  "유해가스 농도 측정 (CO, CO₂, H₂S)",
  "환기 및 배기장치 가동 여부",
  "호흡용 보호구 착용 여부",
  "2인 1조 작업 여부",
  "출입금지 및 경고표지 설치",
  "작업지휘자 지정 및 상주 여부",
  "대기자(관찰자) 지정 및 상주 확인",
  "구조용 줄·로프 준비 여부",
  "비상연락 수단 및 구조장비 확인",
];

// ════════════════════════════════════════════════════
// 디자인 토큰
// ════════════════════════════════════════════════════
const TEAL = "#00B7AF";

const INP = [
  "w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white",
  "outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/10",
  "transition-all placeholder:text-slate-300",
].join(" ");

const TINP = [
  "w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white",
  "outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/10",
  "transition-all placeholder:text-slate-300",
].join(" ");

const LBL = "text-xs font-semibold text-slate-500 mb-1.5 block";
const GTITLE = "text-xs font-bold text-slate-500 uppercase tracking-wider";

const DAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];
function getDayKo(d: string) {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  return isNaN(dt.getTime()) ? "" : DAYS_KO[dt.getDay()];
}

// ════════════════════════════════════════════════════
// 모달: 서명 그리기 (Canvas)
// ════════════════════════════════════════════════════
function SignatureDrawModal({
  title,
  onSave,
  onClose,
}: {
  title: string;
  onSave: (val: string) => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    setIsEmpty(false);
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e293b";
    ctx.beginPath();
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    onSave(canvas.toDataURL("image/png"));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 400 }}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800">✍️ {title} 서명</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-400 mb-2">아래 흰 영역에 서명을 그려주세요</p>
          <canvas
            ref={canvasRef}
            width={352}
            height={160}
            className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 cursor-crosshair touch-none"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          <div className="flex gap-2 mt-3">
            <button onClick={clearCanvas}
              className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors">
              지우기
            </button>
            <button onClick={handleSave} disabled={isEmpty}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: isEmpty ? "#cbd5e1" : TEAL, cursor: isEmpty ? "not-allowed" : "pointer" }}>
              서명 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// 모달: 서명 요청 보내기
// ════════════════════════════════════════════════════
const MOCK_STAFF = [
  { name: "김안전", dept: "안전관리팀", phone: "010-1234-5678" },
  { name: "이관리", dept: "시설관리팀", phone: "010-2345-6789" },
  { name: "박감독", dept: "공사감독팀", phone: "010-3456-7890" },
  { name: "최대리", dept: "발주처 안전팀", phone: "010-4567-8901" },
  { name: "정소장", dept: "현장관리팀", phone: "010-5678-9012" },
];

function SignatureRequestModal({ targetLabel, onClose }: { targetLabel: string; onClose: () => void }) {
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
          <span className="text-sm font-bold text-slate-800">📨 서명 요청 — {targetLabel}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-slate-100">
          {(["list", "contact"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-sm font-semibold transition-colors"
              style={{ color: tab === t ? TEAL : "#94a3b8", borderBottom: tab === t ? `2px solid ${TEAL}` : "2px solid transparent" }}>
              {t === "list" ? "👤 직원 목록" : "📱 연락처 입력"}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === "list" ? (
            <div className="space-y-2">
              {MOCK_STAFF.map((s) => (
                <button key={s.name} onClick={() => setSelected(s.name)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all"
                  style={{ borderColor: selected === s.name ? TEAL : "#f1f5f9", background: selected === s.name ? `${TEAL}0d` : "#f8fafc" }}>
                  <span className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                    {s.name[0]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.dept} · {s.phone}</p>
                  </div>
                  {selected === s.name && (
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 12 12" style={{ color: TEAL }}>
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div>
              <label className={LBL}>휴대폰 번호</label>
              <input className={INP} placeholder="010-0000-0000" value={phone} onChange={e => setPhone(e.target.value)} />
              <p className="text-xs text-slate-400 mt-2">입력한 번호로 서명 요청 링크가 발송됩니다.</p>
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={sent || (tab === "list" ? !selected : !phone)}
            className="w-full mt-4 py-3 rounded-xl text-sm font-bold text-white transition-all"
            style={{
              background: sent ? "#10b981" : (!selected && tab === "list") || (!phone && tab === "contact") ? "#cbd5e1" : TEAL,
              cursor: sent || (!selected && tab === "list") || (!phone && tab === "contact") ? "not-allowed" : "pointer",
            }}>
            {sent ? "✓ 요청 발송 완료!" : "📨 서명 요청 발송"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// 공통 UI 컴포넌트
// ════════════════════════════════════════════════════

function SectionHeader({ num, title, badge }: { num: number; title: string; badge?: string }) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100" style={{ background: "#f8fffe" }}>
      <span
        className="w-7 h-7 rounded-full text-white text-xs font-black flex items-center justify-center flex-shrink-0 shadow-sm"
        style={{ background: TEAL }}
      >
        {num}
      </span>
      <span className="font-bold text-slate-800">{title}</span>
      {badge && (
        <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-600 border border-teal-100">
          {badge}
        </span>
      )}
    </div>
  );
}

function SubBanner({ icon, title, sub, color, bg }: {
  icon: string; title: string; sub?: string; color: string; bg: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-5 py-3" style={{ background: bg }}>
      <span className="text-base">{icon}</span>
      <div>
        <span className="text-sm font-bold" style={{ color }}>{title}</span>
        {sub && <span className="text-xs ml-2 opacity-70" style={{ color }}>{sub}</span>}
      </div>
    </div>
  );
}

function PersonRow({
  label, prefix, get, set, showTel = false,
}: {
  label: string; prefix: string;
  get: (k: string) => string; set: (k: string, v: string) => void;
  showTel?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="text-xs font-semibold text-slate-500 w-14 flex-shrink-0 text-right">{label}</span>
      <div className={`flex-1 grid gap-2 ${showTel ? "grid-cols-4" : "grid-cols-3"}`}>
        <input className={TINP} placeholder="소속" value={get(`${prefix}_org`)} onChange={e => set(`${prefix}_org`, e.target.value)} />
        <input className={TINP} placeholder="성명" value={get(`${prefix}_name`)} onChange={e => set(`${prefix}_name`, e.target.value)} />
        <input className={TINP} placeholder="서명" value={get(`${prefix}_sig`)} onChange={e => set(`${prefix}_sig`, e.target.value)} />
        {showTel && <input className={TINP} placeholder="연락처" value={get(`${prefix}_tel`)} onChange={e => set(`${prefix}_tel`, e.target.value)} />}
      </div>
    </div>
  );
}

function SignaturePanel({ children, showTel = false }: { children: React.ReactNode; showTel?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-5 py-4 space-y-3">
      <div
        className={`grid text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-200 ml-[4.25rem] gap-2 ${showTel ? "grid-cols-4" : "grid-cols-3"}`}
      >
        <span>소속</span><span>성명</span><span>서명</span>
        {showTel && <span>연락처</span>}
      </div>
      {children}
    </div>
  );
}

function CheckRow({
  index, item, checked, onChange, accentColor,
}: {
  index: number; item: string; checked: boolean; onChange: (v: boolean) => void; accentColor: string;
}) {
  return (
    <label
      className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 group"
      style={{ background: checked ? `${accentColor}08` : "white" }}
    >
      <span className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
        style={{ background: checked ? accentColor : "white", borderColor: checked ? accentColor : "#e2e8f0" }}>
        {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </span>
      <span className="w-5 text-[10px] font-bold text-slate-300 flex-shrink-0">{index + 1}</span>
      <span className="text-sm text-slate-700 leading-snug">{item}</span>
    </label>
  );
}

function OXCheckRow({
  index, item, value, onChange, nameValue, onNameChange,
}: {
  index: number;
  item: HotCheckItem;
  value: "O" | "X" | "";
  onChange: (v: "O" | "X" | "") => void;
  nameValue?: string;
  onNameChange?: (v: string) => void;
}) {
  return (
    <div
      className="flex items-start gap-2 px-4 py-2.5 border-b border-slate-100 last:border-0 transition-colors"
      style={{ background: item.confined ? "#fafbff" : "white" }}>
      <span className="w-5 text-[10px] font-bold text-slate-300 flex-shrink-0 mt-1">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-slate-700 leading-snug">{item.label}</span>
        {item.nameInput && (
          <input
            className="mt-1 w-full border-b border-slate-300 text-sm outline-none bg-transparent focus:border-red-400 transition-colors placeholder:text-slate-300 px-0.5"
            placeholder="성명 입력"
            value={nameValue ?? ""}
            onChange={e => onNameChange?.(e.target.value)}
          />
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
        <button
          onClick={() => onChange(value === "O" ? "" : "O")}
          className="w-7 h-7 rounded-full border-2 text-xs font-bold transition-all flex items-center justify-center"
          style={{ borderColor: value === "O" ? "#16a34a" : "#e2e8f0", background: value === "O" ? "#16a34a" : "white", color: value === "O" ? "white" : "#cbd5e1" }}>
          O
        </button>
        <button
          onClick={() => onChange(value === "X" ? "" : "X")}
          className="w-7 h-7 rounded-full border-2 text-xs font-bold transition-all flex items-center justify-center"
          style={{ borderColor: value === "X" ? "#dc2626" : "#e2e8f0", background: value === "X" ? "#dc2626" : "white", color: value === "X" ? "white" : "#cbd5e1" }}>
          X
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// 특별작업 입력방식 토글 + PDF 업로드 블록
// ════════════════════════════════════════════════════
function SubFormModeToggle({
  modeKey, label, icon, color, get, set,
}: {
  modeKey: string; label: string; icon: string; color: string;
  get: (k: string) => string; set: (k: string, v: string) => void;
}) {
  const mode = get(modeKey) || "form";
  return (
    <div className="flex items-center justify-between px-1 mb-2">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-sm font-bold" style={{ color }}>{label} — 입력방식 선택</span>
      </div>
      <div className="flex rounded-lg border border-slate-200 overflow-hidden">
        {[
          { key: "form", label: "📝 상세입력" },
          { key: "upload", label: "📎 문서첨부" },
        ].map((m, idx) => (
          <button key={m.key} onClick={() => set(modeKey, m.key)}
            className={`px-3 py-1.5 text-xs font-semibold transition-all${idx > 0 ? " border-l border-slate-200" : ""}`}
            style={{ background: mode === m.key ? color : "white", color: mode === m.key ? "white" : "#94a3b8" }}>
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PdfUploadBlock({
  label, icon, color, bg, storeKey, get, set,
}: {
  label: string; icon: string; color: string; bg: string; storeKey: string;
  get: (k: string) => string; set: (k: string, v: string) => void;
}) {
  const fileName = get(storeKey + "_fileName");
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    set(storeKey + "_fileName", file.name);
  };
  return (
    <div className="rounded-2xl overflow-hidden border shadow-sm" style={{ borderColor: color + "40" }}>
      <div className="flex items-center gap-2.5 px-5 py-3" style={{ background: bg }}>
        <span className="text-base">{icon}</span>
        <span className="text-sm font-bold" style={{ color }}>{label} — 문서 첨부</span>
      </div>
      <div className="p-5 bg-white">
        {fileName ? (
          <div className="flex items-center justify-between px-4 py-3 rounded-xl border-2 border-dashed"
            style={{ borderColor: color + "60", background: bg }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">📄</span>
              <div>
                <p className="text-sm font-semibold" style={{ color }}>첨부 완료</p>
                <p className="text-xs text-slate-500 mt-0.5 break-all">{fileName}</p>
              </div>
            </div>
            <button onClick={() => set(storeKey + "_fileName", "")}
              className="text-xs font-semibold text-slate-400 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-50">
              삭제
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center gap-3 px-6 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:border-opacity-80"
            style={{ borderColor: color + "50", background: bg + "60" }}>
            <span className="text-3xl">📎</span>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color }}>PDF 파일을 업로드하세요</p>
              <p className="text-xs text-slate-400 mt-1">클릭하여 파일 선택 또는 드래그 앤 드롭</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: color }}>
              파일 선택
            </span>
            <input type="file" accept=".pdf" className="hidden" onChange={handleFile} />
          </label>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// 세이프버디 안전교육 불러오기 모달
// ════════════════════════════════════════════════════
const MOCK_SAFEBUDDY_EDU = [
  { id: "edu1", title: "화재예방 및 초기대응 교육", date: "2025-12-10", trainer: "김안전", org: "안전관리팀", content: "화재 발생 시 행동요령, 소화기 사용법, 피난경로 교육" },
  { id: "edu2", title: "밀폐공간 작업 안전교육", date: "2025-11-25", trainer: "이관리", org: "시설관리팀", content: "밀폐공간 산소농도 측정, 유해가스 대응, 구조장비 사용법 교육" },
  { id: "edu3", title: "고소작업 안전교육", date: "2025-11-18", trainer: "박감독", org: "공사감독팀", content: "고소작업 안전대 착용법, 추락 방지 조치, 비계 점검 사항 교육" },
  { id: "edu4", title: "화기작업 안전교육", date: "2025-10-30", trainer: "최대리", org: "발주처 안전팀", content: "용접·용단 화기작업 안전수칙, 불꽃 비산방지, 소화기 배치 교육" },
  { id: "edu5", title: "작업허가서 작성 교육", date: "2025-10-15", trainer: "정소장", org: "현장관리팀", content: "작업허가서 작성 절차, 서명 결재 프로세스, 안전조치 확인사항 교육" },
];

type EduCompleter = { name: string; org: string; phone: string };
type EduRow = { type: string; detail: string; date: string; duration: string; instructor: string; count: string; completers: EduCompleter[] };

function SafeBuddyEduModal({
  onImport,
  onClose,
}: {
  onImport: (edu: { title: string; content: string; trainerOrg: string; trainerName: string }) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const sel = MOCK_SAFEBUDDY_EDU.find(e => e.id === selected);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ width: 520, maxHeight: "80vh" }}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛡️</span>
            <span className="text-sm font-bold text-slate-800">세이프버디 — 안전교육 불러오기</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <p className="px-5 pt-3 pb-1 text-xs text-slate-400 flex-shrink-0">세이프버디에 등록된 안전교육 내역에서 선택하세요</p>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {MOCK_SAFEBUDDY_EDU.map(edu => (
            <button key={edu.id} onClick={() => setSelected(edu.id === selected ? null : edu.id)}
              className="w-full text-left px-4 py-3 rounded-xl border-2 transition-all"
              style={{
                borderColor: selected === edu.id ? TEAL : "#f1f5f9",
                background: selected === edu.id ? `${TEAL}08` : "#f8fafc",
              }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">{edu.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{edu.date} · {edu.trainer} ({edu.org})</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{edu.content}</p>
                </div>
                {selected === edu.id && (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5"
                    style={{ background: TEAL }}>✓</span>
                )}
              </div>
            </button>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex gap-2 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors">
            취소
          </button>
          <button
            disabled={!sel}
            onClick={() => { if (sel) { onImport({ title: sel.title, content: sel.content, trainerOrg: sel.org, trainerName: sel.trainer }); onClose(); } }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: sel ? TEAL : "#cbd5e1", cursor: sel ? "pointer" : "not-allowed" }}>
            이 교육 불러오기
          </button>
        </div>
      </div>
    </div>
  );
}

const EDU_TYPES = ["정기교육", "신규채용자 교육", "작업내용 변경 시 교육", "특별교육", "기초안전보건교육", "기타"];

function EduTable({
  rows, onAdd, onRemove, onUpdate, onAddCompleter, onRemoveCompleter,
}: {
  rows: EduRow[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, key: keyof EduRow, val: string) => void;
  onAddCompleter: (rowIdx: number, person: EduCompleter) => void;
  onRemoveCompleter: (rowIdx: number, personIdx: number) => void;
}) {
  const [staffPickerRow, setStaffPickerRow] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className={GTITLE}>교육 참여 작업자 명단</span>
        <AddBtn onClick={onAdd} label="+ 교육 추가" />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-5 text-center">
          <p className="text-xs text-slate-400">교육 추가 버튼으로 교육 항목을 입력하세요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="rounded-xl border border-slate-200 overflow-hidden bg-white">
              {/* 교육 정보 행 */}
              <div className="grid items-center px-3 py-2 gap-2 bg-slate-50/80 border-b border-slate-100"
                style={{ gridTemplateColumns: "1.5rem 1fr 1fr 110px 70px 80px 1.5rem" }}>
                <span className="text-[10px] text-slate-400 font-bold">{i + 1}</span>
                <input className={TINP} value={row.type} placeholder="교육종류"
                  onChange={e => onUpdate(i, "type", e.target.value)} />
                <input className={TINP} value={row.detail} placeholder="교육 세부 내용"
                  onChange={e => onUpdate(i, "detail", e.target.value)} />
                <input type="date" className={TINP} value={row.date}
                  onChange={e => onUpdate(i, "date", e.target.value)} />
                <input className={TINP} value={row.duration} placeholder="1시간"
                  onChange={e => onUpdate(i, "duration", e.target.value)} />
                <input className={TINP} value={row.instructor} placeholder="강사명"
                  onChange={e => onUpdate(i, "instructor", e.target.value)} />
                <button onClick={() => onRemove(i)}
                  className="text-slate-300 hover:text-red-400 text-xs transition-colors">✕</button>
              </div>

              {/* 수료자 목록 */}
              <div className="px-3 py-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                    수료자 목록
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                      style={{ background: `${TEAL}15`, color: TEAL }}>
                      {(row.completers || []).length}명
                    </span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setStaffPickerRow(i)}
                      className="text-[10px] font-semibold px-2 py-1 rounded border transition-all flex items-center gap-1"
                      style={{ color: "#6366f1", borderColor: "#6366f140", background: "#6366f108" }}>
                      👥 불러오기
                    </button>
                    <button
                      onClick={() => onAddCompleter(i, { name: "", org: "", phone: "" })}
                      className="text-[10px] font-semibold px-2 py-1 rounded border transition-all"
                      style={{ color: TEAL, borderColor: `${TEAL}40`, background: `${TEAL}08` }}>
                      + 직접 추가
                    </button>
                  </div>
                </div>

                {(row.completers || []).length === 0 ? (
                  <p className="text-[10px] text-slate-300 text-center py-1">수료자를 추가하세요</p>
                ) : (
                  <div className="space-y-1">
                    {/* 컬럼 헤더 */}
                    <div className="grid text-[9px] font-bold text-slate-400 px-1 pb-0.5"
                      style={{ gridTemplateColumns: "16px 80px 80px 120px 20px", gap: "6px" }}>
                      <span />
                      <span>성명</span>
                      <span>소속</span>
                      <span>연락처</span>
                      <span />
                    </div>
                    {(row.completers || []).map((c, pi) => {
                      const ci = "px-2 py-1.5 border border-slate-200 rounded text-xs bg-white outline-none focus:border-teal-400 transition-all placeholder:text-slate-300";
                      const upd = (field: keyof EduCompleter, val: string) => {
                        const next = (row.completers || []).map((x, xi) => xi === pi ? { ...x, [field]: val } : x);
                        onUpdate(i, "completers" as keyof EduRow, JSON.stringify(next));
                      };
                      return (
                        <div key={pi} className="grid items-center"
                          style={{ gridTemplateColumns: "16px 80px 80px 120px 20px", gap: "6px" }}>
                          <span className="text-[9px] text-slate-300 font-bold text-center">{pi + 1}</span>
                          <input className={ci} placeholder="성명" value={c.name}
                            onChange={e => upd("name", e.target.value)} />
                          <input className={ci} placeholder="소속" value={c.org}
                            onChange={e => upd("org", e.target.value)} />
                          <input className={ci} placeholder="010-0000-0000" value={c.phone ?? ""}
                            onChange={e => upd("phone", e.target.value)} />
                          <button onClick={() => onRemoveCompleter(i, pi)}
                            className="text-slate-300 hover:text-red-400 text-xs transition-colors text-center">✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 직원 목록 피커 (수료자 불러오기) */}
      {staffPickerRow !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 360 }}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">👥 수료자 불러오기</span>
              <button onClick={() => setStaffPickerRow(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <p className="px-5 pt-2 text-[10px] text-slate-400">선택하면 수료자 목록에 추가됩니다</p>
            <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
              {MOCK_STAFF.map(s => (
                <button key={s.name}
                  onClick={() => { onAddCompleter(staffPickerRow, { name: s.name, org: s.dept, phone: s.phone }); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-100 text-left hover:bg-slate-50 hover:border-teal-200 transition-all">
                  <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">{s.name[0]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.dept} · {s.phone}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-lg border border-teal-100 text-teal-600 bg-teal-50">+ 추가</span>
                </button>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-slate-100">
              <button onClick={() => setStaffPickerRow(null)}
                className="w-full py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: TEAL }}>완료</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddBtn({ onClick, label = "+ 행 추가" }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick}
      className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all hover:shadow-sm"
      style={{ color: TEAL, borderColor: `${TEAL}40`, background: `${TEAL}08` }}>
      {label}
    </button>
  );
}

function PersonTable({
  rows, cols, header, onAdd, onRemove, onUpdate, borderColor, headerBg, onImport,
}: {
  rows: Record<string, string>[];
  cols: { key: string; label: string; placeholder: string }[];
  header: string;
  onAdd: () => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, key: string, val: string) => void;
  borderColor: string;
  headerBg: string;
  onImport?: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className={GTITLE}>{header}</span>
        <div className="flex items-center gap-2">
          {onImport && (
            <button onClick={onImport}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all hover:shadow-sm flex items-center gap-1"
              style={{ color: "#6366f1", borderColor: "#6366f140", background: "#6366f108" }}>
              📋 목록에서 불러오기
            </button>
          )}
          <AddBtn onClick={onAdd} />
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-5 text-center">
          <p className="text-xs text-slate-400">추가 버튼으로 항목을 입력하세요</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${borderColor}` }}>
          <div className="grid text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-2"
            style={{ background: headerBg, gridTemplateColumns: `1.5rem ${cols.map(() => "1fr").join(" ")} 1.5rem` }}>
            <span>#</span>
            {cols.map(c => <span key={c.key}>{c.label}</span>)}
            <span></span>
          </div>
          {rows.map((row, i) => (
            <div key={i} className="grid items-center px-3 py-1.5 gap-2 border-t bg-white"
              style={{ borderColor, gridTemplateColumns: `1.5rem ${cols.map(() => "1fr").join(" ")} 1.5rem` }}>
              <span className="text-[10px] text-slate-400 font-bold">{i + 1}</span>
              {cols.map(c => (
                <input key={c.key} className={TINP} value={row[c.key] ?? ""} placeholder={c.placeholder}
                  onChange={e => onUpdate(i, c.key, e.target.value)} />
              ))}
              <button onClick={() => onRemove(i)} className="text-slate-300 hover:text-red-400 text-xs transition-colors">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════
// 서명 이미지 표시 셀
// ════════════════════════════════════════════════════
function SigCell({ dataUrl, label, onSign }: { dataUrl: string; label: string; onSign: () => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {dataUrl ? (
        <div className="relative group">
          <img src={dataUrl} alt="서명" className="h-12 object-contain rounded border border-slate-200 bg-white px-2" />
          <button onClick={onSign}
            className="absolute inset-0 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold text-white"
            style={{ background: "rgba(0,0,0,0.4)" }}>재서명</button>
        </div>
      ) : (
        <button onClick={onSign}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-dashed text-xs font-semibold transition-all hover:border-teal-400 hover:text-teal-600"
          style={{ borderColor: "#e2e8f0", color: "#94a3b8" }}>
          ✍️ {label} 서명
        </button>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════
// 화기취급 서브폼
// ════════════════════════════════════════════════════
const ER_ROLES = [
  { key: "contact", label: "비상연락" },
  { key: "fire",    label: "초기소화" },
  { key: "evac",    label: "피난유도" },
] as const;

function HotWorkSubForm({ get, set }: { get: (k: string) => string; set: (k: string, v: string) => void }) {
  const workTypes: string[] = (() => { try { return JSON.parse(get("hw_workTypes")) || []; } catch { return []; } })();
  const appOX: Record<string, "O" | "X"> = (() => { try { return JSON.parse(get("hw_appOX")) || {}; } catch { return {}; } })();
  const permitOX: Record<string, "O" | "X"> = (() => { try { return JSON.parse(get("hw_permitOX")) || {}; } catch { return {}; } })();
  const workerRows: Record<string, string>[] = (() => { try { return JSON.parse(get("hw_workerRows")) || []; } catch { return []; } })();

  const [erSigModal, setErSigModal] = useState<string | null>(null);
  const [erStaffPicker, setErStaffPicker] = useState<string | null>(null);
  const [workerPickerOpen, setWorkerPickerOpen] = useState(false);

  const appDone = HOT_WORK_APP_CHECKLIST.filter((_, i) => appOX[i] === "O").length;
  const permitDone = HOT_WORK_PERMIT_CHECKLIST.filter((_, i) => permitOX[i] === "O").length;

  // ── 초기대응 노드 카드 ──────────────────────────────────────
  function ErNode({ roleKey, label, isChief = false }: { roleKey: string; label: string; isChief?: boolean }) {
    const p = `hw_er_${roleKey}`;
    const name   = get(`${p}_name`);
    const phone  = get(`${p}_tel`);
    const sigImg = get(`${p}_sigImg`);
    const accentColor = isChief ? "#b91c1c" : "#475569";

    return (
      <div className="flex flex-col rounded-xl border-2 overflow-hidden transition-all"
        style={{ borderColor: isChief ? "#fca5a5" : "#e2e8f0", minWidth: isChief ? 200 : 140, background: isChief ? "#fff5f5" : "white" }}>
        {/* 헤더 */}
        <div className="px-3 py-1.5 flex items-center justify-between"
          style={{ background: isChief ? "#b91c1c" : "#f8fafc", borderBottom: `1px solid ${isChief ? "#991b1b" : "#e2e8f0"}` }}>
          <span className="text-xs font-bold" style={{ color: isChief ? "white" : "#475569" }}>{label}</span>
          <div className="flex items-center gap-1">
            {/* 직원 목록 불러오기 */}
            <button
              onClick={() => setErStaffPicker(erStaffPicker === roleKey ? null : roleKey)}
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded transition-all"
              style={{ background: isChief ? "rgba(255,255,255,0.2)" : "#f1f5f9", color: isChief ? "white" : "#64748b" }}
              title="직원 목록에서 불러오기">
              📋
            </button>
          </div>
        </div>

        {/* 직원 목록 드롭다운 */}
        {erStaffPicker === roleKey && (
          <div className="border-b border-slate-100 bg-slate-50">
            {MOCK_STAFF.map(s => (
              <button key={s.name}
                onClick={() => {
                  set(`${p}_name`, s.name);
                  set(`${p}_phone`, s.phone);
                  setErStaffPicker(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-white transition-colors border-b border-slate-100 last:border-0">
                <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 flex-shrink-0">{s.name[0]}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700 leading-tight">{s.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{s.dept}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 입력 영역 */}
        <div className="p-2.5 space-y-1.5">
          <input
            className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white outline-none focus:border-red-300 transition-all placeholder:text-slate-300"
            placeholder="성명"
            value={name}
            onChange={e => set(`${p}_name`, e.target.value)}
          />
          <input
            className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white outline-none focus:border-red-300 transition-all placeholder:text-slate-300"
            placeholder="연락처"
            value={phone}
            onChange={e => set(`${p}_tel`, e.target.value)}
          />
          {/* 서명 */}
          <div className="pt-0.5">
            {sigImg ? (
              <div className="relative group">
                <img src={sigImg} alt="서명" className="h-8 w-full object-contain rounded border border-slate-200 bg-white px-1" />
                <button onClick={() => setErSigModal(`${p}_sigImg`)}
                  className="absolute inset-0 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold text-white"
                  style={{ background: "rgba(0,0,0,0.4)" }}>재서명</button>
              </div>
            ) : (
              <button onClick={() => setErSigModal(`${p}_sigImg`)}
                className="w-full flex items-center justify-center gap-1 py-1 rounded border border-dashed text-[10px] font-semibold transition-all hover:border-red-300 hover:text-red-400"
                style={{ borderColor: "#e2e8f0", color: "#94a3b8" }}>
                ✍️ 서명
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-red-200 shadow-sm">
      <SubBanner icon="📝" title="화기취급작업 신청서" color="#b91c1c" bg="#fef2f2" />
      <div className="p-5 space-y-5 bg-white">
        <div className="grid grid-cols-2 gap-4">
          <div><label className={LBL}>허가번호</label>
            <input className={INP} value={get("hw_permitNo")} onChange={e => set("hw_permitNo", e.target.value)} placeholder="허가번호 입력" /></div>
          <div><label className={LBL}>작업 구역</label>
            <input className={INP} value={get("hw_zone")} onChange={e => set("hw_zone", e.target.value)} placeholder="구역명" /></div>
        </div>
        <div><label className={LBL}>작업명 · 사용 장비</label>
          <textarea className={INP + " resize-none"} rows={2} value={get("hw_workDesc")} onChange={e => set("hw_workDesc", e.target.value)} placeholder="작업명 및 사용 장비를 기입하세요" /></div>
        <div>
          <label className={LBL}>작업 구분</label>
          <div className="flex items-center flex-wrap gap-x-5 gap-y-2 mt-1">
            {["용접", "용단", "땜", "연마"].map(t => {
              const on = workTypes.includes(t);
              return (
                <label key={t} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <button onClick={() => {
                    const next = on ? workTypes.filter(x => x !== t) : [...workTypes, t];
                    set("hw_workTypes", JSON.stringify(next));
                  }}
                    className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                    style={{ borderColor: on ? "#ef4444" : "#cbd5e1", background: on ? "#ef4444" : "white" }}>
                    {on && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </button>
                  <span className="text-sm text-slate-700">{t}</span>
                </label>
              );
            })}
            {/* 기타 (인라인 입력) */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <button onClick={() => {
                const on = workTypes.includes("기타");
                const next = on ? workTypes.filter(x => x !== "기타") : [...workTypes, "기타"];
                set("hw_workTypes", JSON.stringify(next));
              }}
                className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                style={{ borderColor: workTypes.includes("기타") ? "#ef4444" : "#cbd5e1", background: workTypes.includes("기타") ? "#ef4444" : "white" }}>
                {workTypes.includes("기타") && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
              <span className="text-sm text-slate-700 flex-shrink-0">기타</span>
              <span className="text-sm text-slate-400 flex-shrink-0">(</span>
              <input
                className="w-24 border-b border-slate-300 text-sm outline-none bg-transparent focus:border-red-400 transition-colors placeholder:text-slate-300 px-1"
                placeholder="직접 입력"
                value={get("hw_workTypeEtc")}
                onChange={e => set("hw_workTypeEtc", e.target.value)}
              />
              <span className="text-sm text-slate-400 flex-shrink-0">)</span>
            </label>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={LBL}>작업 시작일시</label>
            <input type="datetime-local" className={INP} value={get("hw_startDt")} onChange={e => set("hw_startDt", e.target.value)} /></div>
          <div><label className={LBL}>작업 종료일시</label>
            <input type="datetime-local" className={INP} value={get("hw_endDt")} onChange={e => set("hw_endDt", e.target.value)} /></div>
        </div>
        {/* 초기대응체계 — 조직도 트리 */}
        <div>
          <label className={LBL}>초기대응체계</label>
          <p className="text-[10px] text-slate-400 mb-3">📋 직원 목록에서 불러오면 서명이 자동 입력됩니다</p>

          {/* 트리 레이아웃 */}
          <div className="flex flex-col items-center">
            {/* 1. 현장책임자 */}
            <ErNode roleKey="chief" label="현장책임자" isChief />

            {/* 수직 + 수평 연결선 */}
            <div className="relative flex justify-center" style={{ width: "100%", height: 24 }}>
              {/* 중앙 수직선 */}
              <div className="absolute top-0 left-1/2 w-px bg-slate-300" style={{ height: 16 }} />
              {/* 수평선 (3칸 스팬) — 컨테이너 너비의 2/3 */}
              <div className="absolute bg-slate-300" style={{ top: 16, left: "20%", right: "20%", height: 1 }} />
            </div>

            {/* 2, 3, 4 — 하단 3개 */}
            <div className="grid grid-cols-3 gap-2 w-full">
              {ER_ROLES.map((r) => (
                <div key={r.key} className="flex flex-col items-center">
                  <div className="w-px h-2 bg-slate-300" />
                  <ErNode roleKey={r.key} label={r.label} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 서명 모달 */}
        {erSigModal && (
          <SignatureDrawModal
            title="서명 입력"
            onSave={v => { set(erSigModal, v); setErSigModal(null); }}
            onClose={() => setErSigModal(null)}
          />
        )}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className={GTITLE}>점검내용</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600">O {appDone} / {HOT_WORK_APP_CHECKLIST.length}</span>
          </div>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            {HOT_WORK_APP_CHECKLIST.map((item, i) => {
              const isFirstConfined = item.confined && !HOT_WORK_APP_CHECKLIST[i - 1]?.confined;
              return (
                <div key={i}>
                  {isFirstConfined && (
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-50 border-y border-indigo-100">
                      <span className="text-[10px] font-bold text-indigo-600 tracking-wide">밀폐공간 작업 시 (체크)</span>
                    </div>
                  )}
                  <OXCheckRow
                    index={i}
                    item={item}
                    value={appOX[i] ?? ""}
                    onChange={v => set("hw_appOX", JSON.stringify({ ...appOX, [i]: v }))}
                    nameValue={get(`hw_appName_${i}`)}
                    onNameChange={v => set(`hw_appName_${i}`, v)}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <PersonTable
          header="작업자 명단"
          rows={workerRows}
          cols={[{ key: "name", label: "성명", placeholder: "성명" }, { key: "org", label: "소속", placeholder: "소속" }]}
          borderColor="#fecaca" headerBg="#fef2f2"
          onAdd={() => set("hw_workerRows", JSON.stringify([...workerRows, { name: "", org: "" }]))}
          onRemove={i => set("hw_workerRows", JSON.stringify(workerRows.filter((_, j) => j !== i)))}
          onUpdate={(i, k, v) => { const n = [...workerRows]; n[i] = { ...n[i], [k]: v }; set("hw_workerRows", JSON.stringify(n)); }}
          onImport={() => setWorkerPickerOpen(true)}
        />

        {/* 근로자 목록 불러오기 모달 */}
        {workerPickerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 380 }}>
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800">📋 근로자 목록에서 불러오기</span>
                <button onClick={() => setWorkerPickerOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
              <p className="px-5 pt-3 text-xs text-slate-400">선택한 직원을 작업자 명단에 추가합니다. 중복 추가 가능합니다.</p>
              <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
                {MOCK_STAFF.map(s => (
                  <button key={s.name}
                    onClick={() => {
                      const newRow = { name: s.name, org: s.dept };
                      set("hw_workerRows", JSON.stringify([...workerRows, newRow]));
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-100 text-left hover:bg-slate-50 hover:border-indigo-200 transition-all">
                    <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">{s.name[0]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                      <p className="text-xs text-slate-400">{s.dept} · {s.phone}</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded-lg border border-indigo-100 text-indigo-500 bg-indigo-50">+ 추가</span>
                  </button>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-slate-100">
                <button onClick={() => setWorkerPickerOpen(false)}
                  className="w-full py-2 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background: "#6366f1" }}>
                  완료
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <SubBanner icon="✅" title="화기취급작업 허가서" color="#7f1d1d" bg="#fee2e2" />
      <div className="p-5 space-y-5 bg-white">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className={GTITLE}>점검내용</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-700">O {permitDone} / {HOT_WORK_PERMIT_CHECKLIST.length}</span>
          </div>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            {HOT_WORK_PERMIT_CHECKLIST.map((item, i) => {
              const isFirstConfined = item.confined && !HOT_WORK_PERMIT_CHECKLIST[i - 1]?.confined;
              return (
                <div key={i}>
                  {isFirstConfined && (
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-50 border-y border-indigo-100">
                      <span className="text-[10px] font-bold text-indigo-600 tracking-wide">밀폐공간 작업 시 (체크)</span>
                    </div>
                  )}
                  <OXCheckRow
                    index={i}
                    item={item}
                    value={permitOX[i] ?? ""}
                    onChange={v => set("hw_permitOX", JSON.stringify({ ...permitOX, [i]: v }))}
                    nameValue={get(`hw_permitName_${i}`)}
                    onNameChange={v => set(`hw_permitName_${i}`, v)}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div><label className={LBL}>종료 후 안전조치</label>
          <textarea className={INP + " resize-none"} rows={2} value={get("hw_afterMeasures")} onChange={e => set("hw_afterMeasures", e.target.value)} placeholder="작업 종료 후 취한 안전조치 내용" /></div>
        <div><label className={LBL}>반납 확인</label>
          <input className={INP} value={get("hw_returnConfirm")} onChange={e => set("hw_returnConfirm", e.target.value)} placeholder="반납 확인자 및 일시" /></div>
        {/* 1-1. 화기작업 관계자 서명 */}
        <div>
          <label className={LBL}>관계자 서명</label>
          <SignaturePanel showTel>
            <PersonRow label="화재감시자" prefix="ap11_watch" get={get} set={set} showTel />
            <PersonRow label="소방안전관리자" prefix="ap11_fire" get={get} set={set} showTel />
            <PersonRow label="시설팀 담당자" prefix="ap11_facility" get={get} set={set} showTel />
            <PersonRow label="공사담당자" prefix="ap11_construction" get={get} set={set} showTel />
            <PersonRow label="입주사 담당자" prefix="ap11_tenant" get={get} set={set} showTel />
            <PersonRow label="작업구역 담당자" prefix="ap11_area" get={get} set={set} showTel />
            <PersonRow label="화기취급 책임자" prefix="ap11_chief" get={get} set={set} showTel />
          </SignaturePanel>
        </div>

        {/* 1-1. 초기대응체계 서명 */}
        <div>
          <label className={LBL}>초기대응체계 서명</label>
          <SignaturePanel showTel>
            <PersonRow label="현장책임자" prefix="hw_er_chief" get={get} set={set} showTel />
            <PersonRow label="비상연락" prefix="hw_er_contact" get={get} set={set} showTel />
            <PersonRow label="초기소화" prefix="hw_er_fire" get={get} set={set} showTel />
            <PersonRow label="피난유도" prefix="hw_er_evac" get={get} set={set} showTel />
          </SignaturePanel>
        </div>

        <div>
          <label className={LBL}>허가자 서명</label>
          <SignaturePanel>
            <PersonRow label="허가자" prefix="hw_permitter" get={get} set={set} />
          </SignaturePanel>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// 고소작업대 서브폼
// ════════════════════════════════════════════════════
function HeightWorkSubForm({ get, set }: { get: (k: string) => string; set: (k: string, v: string) => void }) {
  const equipTypes: string[] = (() => { try { return JSON.parse(get("aw_equipTypes")) || []; } catch { return []; } })();
  const checklist: Record<string, string> = (() => { try { return JSON.parse(get("aw_checklist")) || {}; } catch { return {}; } })();

  const allItems = HEIGHT_WORK_CHECKLIST.flatMap(g => g.items);
  const good = allItems.filter(i => checklist[i] === "양호").length;
  const bad = allItems.filter(i => checklist[i] === "불량").length;

  return (
    <div className="rounded-2xl overflow-hidden border border-amber-200 shadow-sm">
      <SubBanner icon="🏗️" title="중량물/장비취급 작업 허가서" color="#92400e" bg="#fffbeb" />
      <div className="p-5 space-y-5 bg-white">
        <div className="grid grid-cols-2 gap-4">
          <div><label className={LBL}>업체명</label>
            <input className={INP} value={get("aw_company")} onChange={e => set("aw_company", e.target.value)} placeholder="업체명" /></div>
          <div><label className={LBL}>작업장소</label>
            <input className={INP} value={get("aw_location")} onChange={e => set("aw_location", e.target.value)} placeholder="작업장소" /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className={LBL}>지휘자</label>
            <input className={INP} value={get("aw_commander")} onChange={e => set("aw_commander", e.target.value)} placeholder="성명" /></div>
          <div><label className={LBL}>운전자</label>
            <input className={INP} value={get("aw_operator")} onChange={e => set("aw_operator", e.target.value)} placeholder="성명" /></div>
          <div><label className={LBL}>유도자</label>
            <input className={INP} value={get("aw_guide")} onChange={e => set("aw_guide", e.target.value)} placeholder="성명" /></div>
        </div>
        <div>
          <label className={LBL}>운전자 자격사항</label>
          <input className={INP} value={get("aw_operatorLicense")} onChange={e => set("aw_operatorLicense", e.target.value)} placeholder="자격증명, 자격번호 등" />
          {/* 자격증 파일 첨부 */}
          <div className="mt-2">
            {get("aw_licenseFileName") ? (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-dashed"
                style={{ borderColor: "#d9770660", background: "#fffbeb" }}>
                <div className="flex items-center gap-2">
                  <span className="text-base">📄</span>
                  <div>
                    <p className="text-xs font-semibold text-amber-700">첨부 완료</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 break-all">{get("aw_licenseFileName")}</p>
                  </div>
                </div>
                <button onClick={() => set("aw_licenseFileName", "")}
                  className="text-xs font-semibold text-slate-400 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-50">
                  삭제
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-dashed cursor-pointer transition-all hover:border-amber-400 hover:bg-amber-50/50"
                style={{ borderColor: "#d9770640" }}>
                <span className="text-base">📎</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-700">자격증 파일 첨부</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">클릭하여 파일 선택 (이미지·PDF)</p>
                </div>
                <input type="file" accept="image/*,.pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) set("aw_licenseFileName", f.name); }} />
              </label>
            )}
          </div>
        </div>
        <div><label className={LBL}>작업내용</label>
          <textarea className={INP + " resize-none"} rows={2} value={get("aw_content")} onChange={e => set("aw_content", e.target.value)} placeholder="작업 내용 기입" /></div>
        <div>
          <label className={LBL}>장비 제원</label>
          {/* 주요 장비 유형 선택 */}
          <div className="flex gap-2 mb-3">
            {([
              { key: "고소작업대", icon: "🪜" },
              { key: "지게차",    icon: "🚜" },
              { key: "굴삭기",    icon: "⛏️" },
            ] as { key: string; icon: string }[]).map(({ key, icon }) => {
              const on = get("aw_mainEquipType") === key;
              return (
                <button type="button" key={key}
                  onClick={() => set("aw_mainEquipType", on ? "" : key)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 text-sm font-semibold transition-all"
                  style={{ borderColor: on ? "#d97706" : "#e2e8f0", background: on ? "#fffbeb" : "white", color: on ? "#d97706" : "#64748b" }}>
                  <span>{icon}</span>
                  <span>{key}</span>
                </button>
              );
            })}
          </div>
          {/* 고소작업대 종류 선택 — 항상 펼쳐진 상태로 표시 */}
          {get("aw_mainEquipType") === "고소작업대" && (
            <div className="grid grid-cols-5 gap-x-4 gap-y-2 mb-4 px-3 py-3 rounded-xl bg-amber-50 border border-amber-100">
              <p className="col-span-5 text-xs font-bold text-amber-700 mb-0.5">고소작업대 종류</p>
              {["수직형", "굴절형", "직진붐형", "직진Z형", "궤도형"].map(t => {
                const checked = equipTypes.includes(t);
                return (
                  <div key={t}
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => {
                      const next = checked ? equipTypes.filter(x => x !== t) : [...equipTypes, t];
                      set("aw_equipTypes", JSON.stringify(next));
                    }}
                    className="flex items-center gap-1.5 cursor-pointer select-none">
                    <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      style={{ borderColor: checked ? "#d97706" : "#cbd5e1", background: checked ? "#d97706" : "white" }}>
                      {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span className="text-sm text-slate-700">{t}</span>
                  </div>
                );
              })}
            </div>
          )}
          {/* 장비 제원 수치 입력 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>자체 중량(톤)</label>
              <input className={INP} type="number" step="0.1" min="0"
                value={get("aw_specWeight")} onChange={e => set("aw_specWeight", e.target.value)} placeholder="0.0" />
            </div>
            <div>
              <label className={LBL}>탑승기준인원</label>
              <div className="flex items-center gap-1.5">
                <input className={INP} type="number" min="1"
                  value={get("aw_specPersons")} onChange={e => set("aw_specPersons", e.target.value)} placeholder="0" />
                <span className="text-sm text-slate-500 flex-shrink-0">인승</span>
              </div>
            </div>
            <div>
              <label className={LBL}>최대적재중량(kg)</label>
              <input className={INP} type="number" min="0"
                value={get("aw_specMaxLoad")} onChange={e => set("aw_specMaxLoad", e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className={LBL}>최대작업높이(m)</label>
              <input className={INP} type="number" step="0.1" min="0"
                value={get("aw_specMaxHeight")} onChange={e => set("aw_specMaxHeight", e.target.value)} placeholder="0.0" />
            </div>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className={GTITLE}>안전조치 체크리스트</span>
            <div className="flex gap-2 text-xs font-bold">
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">양호 {good}</span>
              {bad > 0 && <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-600">불량 {bad}</span>}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="grid text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-2 bg-slate-50 border-b border-slate-100"
              style={{ gridTemplateColumns: "1.5rem 1fr 4.5rem" }}>
              <span>#</span><span>점검 항목</span>
              <span className="flex justify-around"><span>양호</span><span>불량</span></span>
            </div>
            {(() => {
              let globalIdx = 0;
              return HEIGHT_WORK_CHECKLIST.map((group) => (
                <div key={group.section}>
                  <div className="px-4 py-1.5 bg-amber-50 border-y border-amber-100">
                    <span className="text-[10px] font-bold text-amber-700 tracking-wide">{group.section}</span>
                  </div>
                  {group.items.map((item) => {
                    const idx = globalIdx++;
                    const cur = checklist[item] ?? "";
                    return (
                      <div key={item} className="grid items-center px-4 py-3 border-b border-slate-100 last:border-0 transition-colors"
                        style={{ gridTemplateColumns: "1.5rem 1fr 4.5rem", background: cur === "불량" ? "#fff1f2" : cur === "양호" ? "#f0fdf4" : "white" }}>
                        <span className="text-[10px] font-bold text-slate-300">{idx + 1}</span>
                        <span className="text-sm text-slate-700 leading-snug">{item}</span>
                        <div className="flex justify-around">
                          {["양호", "불량"].map(v => (
                            <label key={v} className="w-8 flex justify-center cursor-pointer">
                              <input type="radio" name={`aw_${idx}`} checked={cur === v}
                                onChange={() => set("aw_checklist", JSON.stringify({ ...checklist, [item]: v }))}
                                style={{ accentColor: v === "양호" ? "#10b981" : "#ef4444", width: 16, height: 16 }} />
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ));
            })()}
          </div>
        </div>
        <label className="flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all"
          style={{ borderColor: get("aw_eduConfirm") === "true" ? TEAL : "#e2e8f0", background: get("aw_eduConfirm") === "true" ? "#f0fafa" : "white" }}>
          <span className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
            style={{ background: get("aw_eduConfirm") === "true" ? TEAL : "white", borderColor: get("aw_eduConfirm") === "true" ? TEAL : "#e2e8f0" }}>
            {get("aw_eduConfirm") === "true" && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </span>
          <input type="checkbox" className="hidden" checked={get("aw_eduConfirm") === "true"} onChange={e => set("aw_eduConfirm", String(e.target.checked))} />
          <span className="text-sm font-semibold text-slate-700">작업 전 안전교육 실시 완료 확인</span>
        </label>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// 밀폐공간 서브폼
// ════════════════════════════════════════════════════
function ConfinedSpaceSubForm({ get, set }: { get: (k: string) => string; set: (k: string, v: string) => void }) {
  const safetyChecked: Record<string, boolean> = (() => { try { return JSON.parse(get("cs_safetyChecked")) || {}; } catch { return {}; } })();
  const entrantRows: Record<string, string>[] = (() => { try { return JSON.parse(get("cs_entrantRows")) || []; } catch { return []; } })();

  type GasRow = { o2: string; co2: string; co: string; h2s: string; flammable: string; measuredBy: string };
  const defGas: GasRow = { o2: "", co2: "", co: "", h2s: "", flammable: "", measuredBy: "" };
  const gasRows: GasRow[] = (() => {
    try { const p = JSON.parse(get("cs_gasRows")); return p.length === 3 ? p : [defGas, defGas, defGas]; }
    catch { return [defGas, defGas, defGas]; }
  })();
  const setGas = (i: number, key: keyof GasRow, val: string) => {
    const next = [...gasRows]; next[i] = { ...next[i], [key]: val };
    set("cs_gasRows", JSON.stringify(next));
  };
  const GAS_LABELS = ["작업시작", "작업중간", "작업종료"];
  const done = CONFINED_SPACE_CHECKLIST.filter(i => safetyChecked[i]).length;

  return (
    <div className="rounded-2xl overflow-hidden border border-blue-200 shadow-sm">
      <SubBanner icon="🚪" title="밀폐공간 안전작업 허가서" color="#1e3a8a" bg="#eff6ff" />
      <div className="p-5 space-y-5 bg-white">
        <div>
          <label className={LBL}>관계자 정보</label>
          <SignaturePanel>
            <PersonRow label="신청인" prefix="cs_app" get={get} set={set} />
            <PersonRow label="감독자" prefix="cs_sup" get={get} set={set} />
          </SignaturePanel>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={LBL}>작업 시작 시간</label>
            <input type="datetime-local" className={INP} value={get("cs_startDt")} onChange={e => set("cs_startDt", e.target.value)} /></div>
          <div><label className={LBL}>작업 종료 시간</label>
            <input type="datetime-local" className={INP} value={get("cs_endDt")} onChange={e => set("cs_endDt", e.target.value)} /></div>
        </div>
        <div><label className={LBL}>작업장소</label>
          <input className={INP} value={get("cs_location")} onChange={e => set("cs_location", e.target.value)} placeholder="밀폐공간 명칭 / 위치" /></div>
        <div><label className={LBL}>작업내용</label>
          <textarea className={INP + " resize-none"} rows={2} value={get("cs_content")} onChange={e => set("cs_content", e.target.value)} placeholder="작업 내용 기입" /></div>
        <PersonTable
          header="출입자 명단"
          rows={entrantRows}
          cols={[
            { key: "name", label: "성명", placeholder: "성명" },
            { key: "org", label: "소속", placeholder: "소속" },
            { key: "role", label: "역할", placeholder: "역할" },
          ]}
          borderColor="#bfdbfe" headerBg="#eff6ff"
          onAdd={() => set("cs_entrantRows", JSON.stringify([...entrantRows, { name: "", org: "", role: "" }]))}
          onRemove={i => set("cs_entrantRows", JSON.stringify(entrantRows.filter((_, j) => j !== i)))}
          onUpdate={(i, k, v) => { const n = [...entrantRows]; n[i] = { ...n[i], [k]: v }; set("cs_entrantRows", JSON.stringify(n)); }}
        />
        <div className="grid grid-cols-2 gap-4">
          {[{ label: "화기허가 필요", key: "cs_needsHotWork" }, { label: "내연기관 사용", key: "cs_usesEngine" }].map(({ label, key }) => (
            <div key={key}>
              <label className={LBL}>{label}</label>
              <div className="flex gap-2">
                {["예", "아니오"].map(v => {
                  const on = get(key) === v;
                  return (
                    <button key={v} onClick={() => set(key, v)}
                      className="flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all"
                      style={{ borderColor: on ? "#3b82f6" : "#e2e8f0", background: on ? "#eff6ff" : "white", color: on ? "#1d4ed8" : "#94a3b8" }}>
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className={GTITLE}>안전조치 체크리스트</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">{done}/{CONFINED_SPACE_CHECKLIST.length}</span>
          </div>
          <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {CONFINED_SPACE_CHECKLIST.map((item, i) => (
              <CheckRow key={i} index={i} item={item} checked={!!safetyChecked[item]} accentColor="#1d4ed8"
                onChange={v => set("cs_safetyChecked", JSON.stringify({ ...safetyChecked, [item]: v }))} />
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className={GTITLE}>가스농도 측정</span>
          </div>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="grid text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2 bg-slate-50 border-b border-slate-100"
              style={{ gridTemplateColumns: "4.5rem 1fr 1fr 1fr 1fr 1fr 4.5rem" }}>
              <span>시점</span>
              <span className="text-center">O₂ (%)</span>
              <span className="text-center">CO₂ (%)</span>
              <span className="text-center">CO (ppm)</span>
              <span className="text-center">H₂S (ppm)</span>
              <span className="text-center">가연성 (%LEL)</span>
              <span className="text-center">측정자</span>
            </div>
            {GAS_LABELS.map((label, i) => (
              <div key={i} className="grid items-center px-3 py-2 gap-1.5 border-t border-slate-100"
                style={{ gridTemplateColumns: "4.5rem 1fr 1fr 1fr 1fr 1fr 4.5rem" }}>
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">{label}</span>
                {(["o2", "co2", "co", "h2s", "flammable"] as const).map(k => (
                  <input key={k} className={TINP + " text-center"} value={gasRows[i][k]} onChange={e => setGas(i, k, e.target.value)} placeholder="—" />
                ))}
                <input className={TINP} value={gasRows[i].measuredBy} onChange={e => setGas(i, "measuredBy", e.target.value)} placeholder="측정자" />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
            기준: O₂ 18~23.5% · CO₂ 1.5% 미만 · CO 30ppm 미만 · H₂S 10ppm 미만 · 가연성 LEL 10% 이하
          </p>
        </div>
        <div><label className={LBL}>특별조치사항</label>
          <textarea className={INP + " resize-none"} rows={2} value={get("cs_specialMeasures")} onChange={e => set("cs_specialMeasures", e.target.value)} placeholder="추가 특별조치 사항 기입" /></div>
        {/* 1-2. 밀폐공간 관계자 서명 */}
        <div>
          <label className={LBL}>관계자 서명</label>
          <SignaturePanel showTel>
            <PersonRow label="안전관리자" prefix="ap12_safety" get={get} set={set} showTel />
            <PersonRow label="작업 책임자" prefix="ap12_chief" get={get} set={set} showTel />
            <PersonRow label="감시자" prefix="ap12_watcher" get={get} set={set} showTel />
            <PersonRow label="작업자" prefix="ap12_worker" get={get} set={set} showTel />
          </SignaturePanel>
        </div>

        <div>
          <label className={LBL}>최종 허가자 서명</label>
          <SignaturePanel>
            <PersonRow label="최종허가자" prefix="cs_final" get={get} set={set} />
          </SignaturePanel>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// 층수 관련 상수 & 컴포넌트
// ════════════════════════════════════════════════════
type FloorOption = { key: string; label: string };
const FLOOR_OPTIONS: FloorOption[] = [
  { key: "all",     label: "전층 공통" },
  { key: "B7",      label: "B7층" },
  { key: "B6",      label: "B6층" },
  { key: "B5",      label: "B5층" },
  { key: "B4",      label: "B4층" },
  { key: "B3",      label: "B3층" },
  { key: "B2",      label: "B2층" },
  { key: "B1",      label: "B1층" },
  { key: "F1",      label: "1층 및 외곽" },
  ...Array.from({ length: 35 }, (_, i) => ({ key: `F${i + 2}`, label: `${i + 2}층` })),
  { key: "rooftop", label: "옥탑층" },
];

type FloorHazardGroup = { category: string; items: string[] };
const FLOOR_HAZARD_MAP: Record<string, FloorHazardGroup[]> = {
  "all": [{ category: "전층 공통 위험/유해 요소", items: [
    "비상구 및 피난경로 위치 사전 확인",
    "소화설비(소화기·소화전) 위치 및 사용법 확인",
    "작업구역 출입통제 및 안전표지판 설치",
    "낙하물 방지 조치(낙하물방지망·안전난간) 설치 확인",
    "작업 중 분진·소음 발생 시 인근 입주사 사전 통보",
    "작업 종료 후 청결 유지 및 원상복구",
  ]}],
  "B7": [{ category: "B7층 위험/유해 요소", items: [
    "지하주차장 차량 이동 동선 파악 및 작업구역 안전통제",
    "밀폐 공간 내 유해가스(CO 등) 축적 위험 — 충분한 환기 실시",
    "기계실·전기실 내 고압 전기설비, 회전체 접촉 위험",
    "저조도 환경 — 조명 추가 설치로 시야 확보",
    "소화펌프실·전기실 진입 시 시설팀 관계자 동행",
  ]}],
  "B6": [{ category: "B6층 위험/유해 요소", items: [
    "지하주차장 차량 통행 중 작업 충돌 위험",
    "환기 불충분으로 인한 산소 결핍·유해가스 위험",
    "설비 배관 작업 시 고압 유체 누출 위험",
    "저조도 환경 내 보행 중 장애물 충돌 주의",
  ]}],
  "B5": [{ category: "B5층 위험/유해 요소", items: [
    "지하주차장 차량 통행 중 작업 충돌 위험",
    "환기 불충분으로 인한 산소 결핍·유해가스 위험",
    "설비 배관 작업 시 고압 유체 누출 위험",
    "저조도 환경 내 보행 중 장애물 충돌 주의",
  ]}],
  "B4": [{ category: "B4층 위험/유해 요소", items: [
    "지하주차장 차량 통행 중 작업 충돌 위험",
    "습기·결로로 인한 미끄러짐 위험",
    "환기 불충분으로 인한 산소 결핍·유해가스 위험",
  ]}],
  "B3": [{ category: "B3층 위험/유해 요소", items: [
    "지하주차장 차량 통행 중 작업 충돌 위험",
    "습기·결로로 인한 미끄러짐 위험",
    "천장 배관·덕트 작업 시 고소 추락 위험",
  ]}],
  "B2": [{ category: "B2층 위험/유해 요소", items: [
    "지하주차장 차량 통행 중 작업 충돌 위험",
    "습기·결로로 인한 미끄러짐 위험",
    "천장 배관·덕트 작업 시 고소 추락 위험",
  ]}],
  "B1": [{ category: "B1층 위험/유해 요소", items: [
    "지하주차장 차량 통행 중 작업 충돌 위험",
    "주출입구 인근 방문객 통행 방해 및 안전사고 위험",
    "천장 배관·덕트 작업 시 고소 추락 위험",
    "습기·결로로 인한 미끄러짐 위험",
  ]}],
  "F1": [{ category: "1층 및 외곽 위험/유해 요소", items: [
    "로비 내 방문객·임직원 통행 구역 — 작업구역 출입통제 필수",
    "외곽 작업 시 차도·인도 인근 추락 및 낙하물 위험",
    "우천 시 외부 작업면 미끄러짐 위험",
    "외곽 고소작업 시 강풍으로 인한 작업 불안정 위험",
    "주·출입구 차단 시 비상대피 동선 사전 확보",
  ]}],
  "rooftop": [{ category: "옥탑층 위험/유해 요소", items: [
    "강풍으로 인한 작업자 추락 위험 — 안전대 착용 필수",
    "고온·자외선 노출로 인한 온열질환(열사병 등) 위험",
    "옥상 난간·개구부 근접 작업 시 추락 위험",
    "우천·결빙 시 미끄러짐 및 낙뢰 위험",
    "냉각탑·공조기 등 회전체·소음 노출 위험",
    "작업 중 자재 낙하로 인한 하층부 위험 — 하부 안전통제",
  ]}],
};

function getFloorHazards(key: string): FloorHazardGroup[] {
  if (FLOOR_HAZARD_MAP[key]) return FLOOR_HAZARD_MAP[key];
  const num = parseInt(key.replace("F", ""));
  const isHigh = num >= 26;
  const items = [
    `${num}층 입주사 근무 중 작업 — 소음·분진 발생 시 사전 협의 필수`,
    "천장·고소 작업 시 추락 방지 조치 — 사다리·고소작업대 활용",
    "전기 배선·분전반 작업 시 감전 위험 — 정전 확인 후 작업",
    "화재감지기 인근 화기작업 시 오작동 방지 커버 설치",
  ];
  if (isHigh) {
    items.push("고층 창측 작업 시 추락 방지 조치 강화");
    items.push("강풍으로 인한 창문 인근 작업 불안정 위험 주의");
  }
  return [{ category: `${num}층 위험/유해 요소`, items }];
}

// ════════════════════════════════════════════════════
// 모달: 층 안내 그림
// ════════════════════════════════════════════════════
function FloorGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxWidth: 700, width: "95vw", maxHeight: "90vh" }}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-bold text-slate-800">🏢 SK서린사옥 층 안내</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <img src="/floor-guide1.png" alt="층 안내 1" className="w-full rounded-xl border border-slate-200 object-contain" />
          <img src="/floor-guide2.png" alt="층 안내 2" className="w-full rounded-xl border border-slate-200 object-contain" />
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button onClick={onClose}
            className="px-6 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: TEAL }}>닫기</button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// 섹션 3: SK서린사옥 위험/유해 요소
// ════════════════════════════════════════════════════
const SK_RISK_CARD = "bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm";

function SKRiskSection({
  selectedFloors,
  get,
  set,
  subforms,
}: {
  selectedFloors: string[];
  get: (k: string) => string;
  set: (k: string, v: string) => void;
  subforms?: React.ReactNode;
}) {
  const riskChecked: Record<string, boolean> = (() => {
    try { return JSON.parse(get("skRiskChecked")) || {}; } catch { return {}; }
  })();
  const toggleRisk = (key: string) => {
    set("skRiskChecked", JSON.stringify({ ...riskChecked, [key]: !riskChecked[key] }));
  };

  const floorSections = selectedFloors.map(floorKey => {
    const floorOption = FLOOR_OPTIONS.find(f => f.key === floorKey);
    const hazards = getFloorHazards(floorKey);
    return { floorKey, floorLabel: floorOption?.label ?? floorKey, hazards };
  });

  const allItemKeys = floorSections.flatMap(s =>
    s.hazards.flatMap(h => h.items.map(item => `${s.floorKey}::${item}`))
  );
  const checkedCount = allItemKeys.filter(k => riskChecked[k]).length;

  return (
    <div className={SK_RISK_CARD}>
      <SectionHeader num={2} title="추가정보 입력/확인" badge={selectedFloors.length > 0 ? `확인 ${checkedCount} / ${allItemKeys.length}` : undefined} />
      <div className="p-6 space-y-4">
        {subforms && (
          <div className="space-y-3 pb-2 border-b border-slate-100">
            {subforms}
          </div>
        )}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs font-bold text-slate-600">SK서린사옥 층별 위험/유해 요소 안내</span>
          {selectedFloors.length > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
              {selectedFloors.length}개 층 선택됨
            </span>
          )}
        </div>
        {selectedFloors.length === 0 ? (
          <div className="flex items-center justify-center px-4 py-8 rounded-xl border-2 border-dashed border-slate-200">
            <p className="text-sm text-slate-400 text-center">작업 개요에서 작업 층수를 선택하면<br />해당 층의 위험/유해 요소가 표시됩니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {floorSections.map(({ floorKey, hazards }) => (
              <div key={floorKey} className="space-y-1">
                {hazards.map((group, gi) => (
                  <div key={gi} className="rounded-xl overflow-hidden border border-slate-200">
                    <div className="flex items-center justify-between px-4 py-2.5" style={{ background: `${TEAL}12` }}>
                      <span className="text-xs font-bold" style={{ color: TEAL }}>{group.category}</span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {group.items.filter(item => riskChecked[`${floorKey}::${item}`]).length} / {group.items.length} 확인
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {group.items.map((item, idx) => {
                        const key = `${floorKey}::${item}`;
                        const checked = !!riskChecked[key];
                        return (
                          <div key={idx}
                            className="flex items-center gap-3 px-4 py-3 transition-colors"
                            style={{ background: checked ? `${TEAL}06` : "white" }}>
                            <span className="w-5 text-[10px] font-bold text-slate-300 flex-shrink-0">{idx + 1}</span>
                            <span className="flex-1 text-sm text-slate-700 leading-snug">{item}</span>
                            <button onClick={() => toggleRisk(key)}
                              className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                              style={{ background: checked ? TEAL : "white", borderColor: checked ? TEAL : "#e2e8f0" }}>
                              {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// 메인 CHMPermitForm
// ════════════════════════════════════════════════════
export function CHMPermitForm({ permit }: { permit: WorkPermit }) {
  const { updatePermit } = useWorkPermitStore();
  const { initDocument, document: approvalDoc } = useApprovalStore();
  const router = useRouter();

  const get = useCallback((k: string): string => (permit.specifics ?? {})[`chm_${k}`] ?? "", [permit.specifics]);
  const set = useCallback((k: string, v: string) => {
    updatePermit(permit.id, { specifics: { ...(permit.specifics ?? {}), [`chm_${k}`]: v } });
  }, [permit.id, permit.specifics, updatePermit]);
  const upd = (key: keyof WorkPermit, val: unknown) => updatePermit(permit.id, { [key]: val });

  // 작업 종류 (exclusive: special | general | safety)
  const workCategory = get("workCategory") || ""; // "special" | "general" | "safety"
  const setWorkCategory = (c: string) => set("workCategory", c);

  // 안전작업 세부 유형 (workCategory === "safety" 일 때)
  const safetyWorks: Record<string, boolean> = (() => { try { return JSON.parse(get("safetyWorks")) || {}; } catch { return {}; } })();
  const toggleWork = (k: string) => set("safetyWorks", JSON.stringify({ ...safetyWorks, [k]: !safetyWorks[k] }));

  // 체크리스트
  const chmChecklist: Record<string, boolean> = (() => { try { return JSON.parse(get("chmChecklist")) || {}; } catch { return {}; } })();
  const toggleCheck = (key: string) => set("chmChecklist", JSON.stringify({ ...chmChecklist, [key]: !chmChecklist[key] }));

  // PPE 체크
  const ppeChecked: Record<string, boolean> = (() => { try { return JSON.parse(get("ppeChecked")) || {}; } catch { return {}; } })();
  const togglePPE = (item: string) => set("ppeChecked", JSON.stringify({ ...ppeChecked, [item]: !ppeChecked[item] }));

  // 교육 수강자 명단
  const eduRows: EduRow[] = (() => { try { return JSON.parse(get("eduRows")) || []; } catch { return []; } })();
  const setEdu = (rows: EduRow[]) => set("eduRows", JSON.stringify(rows));

  // 층수 선택
  const selectedFloors: string[] = (() => { try { return JSON.parse(get("selectedFloors")) || []; } catch { return []; } })();
  const toggleFloor = (key: string) => {
    const next = selectedFloors.includes(key)
      ? selectedFloors.filter(k => k !== key)
      : [...selectedFloors, key];
    set("selectedFloors", JSON.stringify(next));
  };
  const [floorPickerOpen, setFloorPickerOpen] = useState(false);
  const [floorGuideOpen, setFloorGuideOpen] = useState(false);

  // 서명 모달 상태
  const [sigModal, setSigModal] = useState<{ target: string; label: string } | null>(null);
  const [reqModal, setReqModal] = useState<string | null>(null); // label for request modal
  // 세이프버디 교육 모달
  const [safeBuddyModal, setSafeBuddyModal] = useState(false);

  const WORK_TYPES = [
    { key: "hotWork",       label: "화기작업",        icon: "🔥", color: "#dc2626", bg: "#fff1f2" },
    { key: "confinedSpace", label: "밀폐공간작업",    icon: "🚪", color: "#1d4ed8", bg: "#eff6ff" },
    { key: "heightWork",    label: "중량물/장비취급", icon: "🏗️", color: "#d97706", bg: "#fffbeb" },
    { key: "crane",         label: "고소작업",        icon: "🪜", color: "#7c3aed", bg: "#f5f3ff" },
    { key: "electrical",    label: "전기작업",        icon: "⚡", color: "#0369a1", bg: "#f0f9ff" },
  ];

  const startDay = getDayKo(permit.startDate);
  const endDay   = getDayKo(permit.endDate);
  const checklistDone = SAFETY_CHECKLIST.filter(c => !!chmChecklist[c.key]).length;
  const CARD = "bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm";
  const isCompleted = get("formCompleted") === "true";

  return (
    <div className="space-y-4">

      {/* ══════ 섹션 1 비활성화 래퍼: 작성완료 후 섹션1만 편집 불가 ══════ */}
      <div
        className={isCompleted ? "pointer-events-none select-none" : ""}
        style={isCompleted ? { opacity: 0.6 } : undefined}
      >

      {/* ══════ 섹션 1: 작업 개요 ══════ */}
      <div className={CARD}>
        <SectionHeader num={1} title="작업 개요" />
        <div className="p-6 space-y-5">

          {/* 문서번호 + 허가번호 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LBL}>문서번호</label>
              <input className={INP} value={get("docNumber")} onChange={e => set("docNumber", e.target.value)} placeholder="문서번호 입력" />
            </div>
            <div>
              <label className={LBL}>허가번호</label>
              <input className={INP} value={get("permitNumber")} onChange={e => set("permitNumber", e.target.value)} placeholder="허가번호 입력" />
            </div>
          </div>

          {/* 작업 시작일자 / 종료일자 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LBL}>작업 시작일자</label>
              <div className="flex items-center gap-2">
                <input type="date" className={INP} value={permit.startDate} onChange={e => upd("startDate", e.target.value)} />
                {startDay && <span className="flex-shrink-0 px-3 py-2.5 rounded-lg bg-slate-100 text-sm font-bold text-slate-600">({startDay})</span>}
              </div>
            </div>
            <div>
              <label className={LBL}>작업 종료일자</label>
              <div className="flex items-center gap-2">
                <input type="date" className={INP} value={permit.endDate} onChange={e => upd("endDate", e.target.value)} />
                {endDay && <span className="flex-shrink-0 px-3 py-2.5 rounded-lg bg-slate-100 text-sm font-bold text-slate-600">({endDay})</span>}
              </div>
            </div>
          </div>

          {/* 작업 시작/종료 시간 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LBL}>작업 시작시간</label>
              <input type="time" className={INP} value={permit.startTime} onChange={e => upd("startTime", e.target.value)} />
            </div>
            <div>
              <label className={LBL}>작업 종료시간</label>
              <input type="time" className={INP} value={permit.endTime} onChange={e => upd("endTime", e.target.value)} />
            </div>
          </div>

          {/* 작업장소 + 층수 선택 */}
          <div>
            <label className={LBL}>작업장소</label>
            <div className="flex items-start gap-2">
              <input className={INP + " flex-1"} value={permit.location} onChange={e => upd("location", e.target.value)} placeholder="작업 장소 기입" />

              {/* 층수 선택 피커 */}
              <div className="relative flex-shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setFloorPickerOpen(v => !v)}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-semibold transition-all whitespace-nowrap"
                    style={{ borderColor: selectedFloors.length > 0 ? TEAL : "#e2e8f0", color: selectedFloors.length > 0 ? TEAL : "#94a3b8", background: selectedFloors.length > 0 ? `${TEAL}08` : "white" }}>
                    층수 {selectedFloors.length > 0 ? `(${selectedFloors.length})` : "선택"}
                    <svg className="w-3.5 h-3.5 ml-0.5" fill="none" viewBox="0 0 12 12">
                      <path d={floorPickerOpen ? "M2 8l4-4 4 4" : "M2 4l4 4 4-4"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => setFloorGuideOpen(true)}
                    className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-teal-600 hover:border-teal-300 transition-all text-sm font-bold"
                    title="층 안내 보기">
                    ?
                  </button>
                </div>

                {/* 클릭 외부 닫기용 오버레이 */}
                {floorPickerOpen && (
                  <div className="fixed inset-0 z-20" onClick={() => setFloorPickerOpen(false)} />
                )}

                {/* 드롭다운 */}
                {floorPickerOpen && (
                  <div className="absolute right-0 top-full mt-1 z-30 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden" style={{ width: 200, maxHeight: 360 }}>
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50">
                      <span className="text-xs font-bold text-slate-600">층수 선택 (복수)</span>
                      <button onClick={() => set("selectedFloors", "[]")} className="text-[10px] text-slate-400 hover:text-red-400 transition-colors">전체해제</button>
                    </div>
                    <div className="overflow-y-auto" style={{ maxHeight: 280 }}>
                      {FLOOR_OPTIONS.map(({ key, label }) => {
                        const on = selectedFloors.includes(key);
                        return (
                          <label key={key}
                            className="flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors"
                            style={{ background: on ? `${TEAL}08` : "white" }}
                            onClick={e => { e.preventDefault(); toggleFloor(key); }}>
                            <span className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                              style={{ background: on ? TEAL : "white", borderColor: on ? TEAL : "#e2e8f0" }}>
                              {on && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </span>
                            <span className="text-sm text-slate-700">{label}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 flex justify-end">
                      <button onClick={() => setFloorPickerOpen(false)}
                        className="text-xs font-bold px-4 py-1.5 rounded-lg text-white"
                        style={{ background: TEAL }}>확인</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 선택된 층 태그 */}
            {selectedFloors.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedFloors.map(key => {
                  const option = FLOOR_OPTIONS.find(f => f.key === key);
                  return (
                    <span key={key} className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border"
                      style={{ borderColor: `${TEAL}40`, background: `${TEAL}0d`, color: TEAL }}>
                      {option?.label ?? key}
                      <button onClick={() => toggleFloor(key)} className="hover:text-red-400 transition-colors ml-0.5 leading-none text-teal-400">×</button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* 작업내용 */}
          <div>
            <label className={LBL}>작업내용</label>
            <textarea className={INP + " resize-none"} rows={3} value={permit.description}
              onChange={e => upd("description", e.target.value)} placeholder="작업 내용을 상세히 기입하세요" />
          </div>

          {/* 작업 종류 (3개 중 하나만 선택) */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <span className={GTITLE}>작업 종류</span>
            </div>
            <div className="p-4 space-y-4">

              {/* 세그먼트 탭 형식 선택 (2개 탭) */}
              <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-1 gap-1">
                {[
                  { key: "general", label: "일반작업", icon: "🔧", color: "#059669", bg: "#059669" },
                  { key: "special", label: "특별작업", icon: "⭐", color: "#7c3aed", bg: "#7c3aed" },
                ].map(({ key, label, icon, color, bg }) => {
                  const on = workCategory === key;
                  return (
                    <button key={key} onClick={() => setWorkCategory(on ? "" : key)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                      style={on
                        ? { background: bg, color: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.18)" }
                        : { background: "transparent", color: "#94a3b8" }}>
                      <span className="text-base leading-none">{icon}</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* 일반작업: 별도 입력 없음 — 선택 완료 표시 */}
              {workCategory === "general" && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-semibold">
                  <span>✓</span>
                  <span>일반작업으로 등록됩니다.</span>
                </div>
              )}

              {/* 특별작업: 안전작업 유형 선택 (복수 선택) */}
              {workCategory === "special" && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">안전작업 유형 선택 (복수 선택 가능)</p>
                  <div className="grid grid-cols-5 gap-2">
                    {WORK_TYPES.map(({ key, label, icon, color, bg }) => {
                      const on = !!safetyWorks[key];
                      return (
                        <button key={key} onClick={() => toggleWork(key)}
                          className="relative flex flex-col items-center gap-1.5 pt-3 pb-2.5 rounded-xl border-2 text-xs font-semibold transition-all"
                          style={{ borderColor: on ? color : "#e2e8f0", background: on ? bg : "white", color: on ? color : "#94a3b8" }}>
                          {on && (
                            <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                              style={{ background: color }}>✓</span>
                          )}
                          <span className="text-xl leading-none">{icon}</span>
                          <span className="text-center leading-tight">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      </div>{/* /섹션 1 비활성화 래퍼 */}

      {/* ══════ 섹션 2: 추가정보 입력/확인 ══════ */}
      <SKRiskSection selectedFloors={selectedFloors} get={get} set={set}
        subforms={workCategory === "special" ? (
          <>
            {safetyWorks.hotWork && (
              <div className="space-y-2">
                <SubFormModeToggle modeKey="hotWork_mode" label="화기작업" icon="🔥" color="#dc2626" get={get} set={set} />
                {(get("hotWork_mode") || "form") === "form"
                  ? <HotWorkSubForm get={get} set={set} />
                  : <PdfUploadBlock label="화기작업" icon="🔥" color="#dc2626" bg="#fef2f2" storeKey="hotWork" get={get} set={set} />}
              </div>
            )}
            {safetyWorks.confinedSpace && (
              <div className="space-y-2">
                <SubFormModeToggle modeKey="confinedSpace_mode" label="밀폐공간" icon="🚪" color="#1d4ed8" get={get} set={set} />
                {(get("confinedSpace_mode") || "form") === "form"
                  ? <ConfinedSpaceSubForm get={get} set={set} />
                  : <PdfUploadBlock label="밀폐공간" icon="🚪" color="#1d4ed8" bg="#eff6ff" storeKey="confinedSpace" get={get} set={set} />}
              </div>
            )}
            {safetyWorks.heightWork && (
              <div className="space-y-2">
                <SubFormModeToggle modeKey="heightWork_mode" label="중량물/장비취급" icon="🏗️" color="#d97706" get={get} set={set} />
                {(get("heightWork_mode") || "form") === "form"
                  ? <HeightWorkSubForm get={get} set={set} />
                  : <PdfUploadBlock label="중량물/장비취급" icon="🏗️" color="#d97706" bg="#fffbeb" storeKey="heightWork" get={get} set={set} />}
              </div>
            )}
          </>
        ) : undefined}
      />


      {/* ══════ 섹션 3: 작업허가 승인 전 안전조치 확인 ══════ */}
      <div className={CARD}>
        <SectionHeader num={3} title="작업허가 승인 전 안전조치 확인"
          badge={`확인 ${checklistDone} / ${SAFETY_CHECKLIST.length}`} />
        <div className="p-6 space-y-4">

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">작업 전 안전조치사항</p>
            <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {SAFETY_CHECKLIST.map((item, i) => {
                const on = !!chmChecklist[item.key];
                return (
                  <div key={item.key}
                    className="transition-colors"
                    style={{ background: on ? `${TEAL}06` : "white" }}>

                    {/* 메인 체크 행 — 체크박스 우측 고정 */}
                    <label className="flex items-center gap-3 px-4 py-3 cursor-pointer group">
                      <span className="w-5 text-[10px] font-bold text-slate-300 flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                        {item.detail && <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{item.detail}</p>}
                      </div>
                      <button onClick={() => toggleCheck(item.key)}
                        className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ background: on ? TEAL : "white", borderColor: on ? TEAL : "#e2e8f0" }}>
                        {on && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </button>
                    </label>

                    {/* PPE 서브 체크박스 */}
                    {item.isPPE && (
                      <div className="px-12 pb-3">
                        <div className="flex flex-wrap gap-2">
                          {PPE_ITEMS.map(ppe => {
                            const checked = !!ppeChecked[ppe];
                            return (
                              <button key={ppe} onClick={() => togglePPE(ppe)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all"
                                style={{ borderColor: checked ? TEAL : "#e2e8f0", background: checked ? `${TEAL}0d` : "white", color: checked ? TEAL : "#94a3b8" }}>
                                <span className="w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0"
                                  style={{ background: checked ? TEAL : "white", borderColor: checked ? TEAL : "#cbd5e1" }}>
                                  {checked && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </span>
                                {ppe}
                              </button>
                            );
                          })}
                          {/* 기타 (직접입력) */}
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => togglePPE("기타")}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-l-lg border-2 border-r-0 text-xs font-semibold transition-all"
                              style={{ borderColor: ppeChecked["기타"] ? TEAL : "#e2e8f0", background: ppeChecked["기타"] ? `${TEAL}0d` : "white", color: ppeChecked["기타"] ? TEAL : "#94a3b8" }}>
                              <span className="w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0"
                                style={{ background: ppeChecked["기타"] ? TEAL : "white", borderColor: ppeChecked["기타"] ? TEAL : "#cbd5e1" }}>
                                {ppeChecked["기타"] && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                              </span>
                              기타
                            </button>
                            <input className="px-2 py-1.5 border-2 border-l-0 rounded-r-lg text-xs bg-white outline-none transition-all"
                              style={{ borderColor: ppeChecked["기타"] ? `${TEAL}60` : "#e2e8f0", minWidth: 80 }}
                              placeholder="직접 입력"
                              value={get("ppeOther")}
                              onChange={e => set("ppeOther", e.target.value)} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 특이사항 / 추가 안전조치 */}
          <div>
            <label className={LBL}>특이사항 / 추가 안전조치</label>
            <textarea className={INP + " resize-none"} rows={2} value={get("safetyNote")} onChange={e => set("safetyNote", e.target.value)} placeholder="특이사항이나 추가 안전조치 기입" />
          </div>
        </div>
      </div>

      {/* ══════ 섹션 4: 작업자 안전교육 ══════ */}
      <div className={CARD}>
        <SectionHeader num={4} title="작업자 안전교육 현황" />
        <div className="p-6 space-y-4">

          {/* 세이프버디 불러오기 버튼 */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-indigo-100 bg-indigo-50/60">
            <div className="flex items-center gap-2">
              <span className="text-base">🛡️</span>
              <div>
                <p className="text-xs font-bold text-indigo-700">세이프버디 연동</p>
                <p className="text-[10px] text-indigo-400 mt-0.5">기존 안전교육 내역을 불러와 자동 입력합니다</p>
              </div>
            </div>
            <button
              onClick={() => setSafeBuddyModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: "#4f46e5" }}>
              <span>📋</span>
              <span>안전교육 불러오기</span>
            </button>
          </div>

          <EduTable
            rows={eduRows}
            onAdd={() => setEdu([...eduRows, { type: "", detail: "", date: "", duration: "", instructor: "", count: "0", completers: [] }])}
            onRemove={i => setEdu(eduRows.filter((_, j) => j !== i))}
            onUpdate={(i, k, v) => {
              const n = [...eduRows];
              if (k === "completers") {
                n[i] = { ...n[i], completers: JSON.parse(v), count: String(JSON.parse(v).length) };
              } else {
                n[i] = { ...n[i], [k]: v };
              }
              setEdu(n);
            }}
            onAddCompleter={(i, person) => {
              const n = [...eduRows];
              const cs = [...(n[i].completers || []), person];
              n[i] = { ...n[i], completers: cs, count: String(cs.length) };
              setEdu(n);
            }}
            onRemoveCompleter={(i, pi) => {
              const n = [...eduRows];
              const cs = (n[i].completers || []).filter((_, j) => j !== pi);
              n[i] = { ...n[i], completers: cs, count: String(cs.length) };
              setEdu(n);
            }}
          />
        </div>
      </div>

      {/* ══════ 작성완료 버튼 ══════ */}
      {get("formCompleted") !== "true" ? (
        <div className="flex justify-end px-1">
          <button
            onClick={() => {
              set("formCompleted", "true");
              if (!approvalDoc) {
                initDocument();
              }
              router.push("/permit-approval");
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:opacity-90 active:scale-95"
            style={{ background: "#00B7AF" }}
          >
            <span>✅</span>
            <span>작성완료 및 서명진행</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[10px]">✓</span>
            작성완료 — 우측에서 서명 결재가 진행됩니다
          </span>
          <button
            onClick={() => set("formCompleted", "false")}
            className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors"
          >
            수정하기
          </button>
        </div>
      )}

      {/* ══════ 섹션 5: 작업 연장 여부 ══════ */}
      <div className={CARD}>
        <SectionHeader num={5} title="작업 연장 여부" />
        <div className="p-6">
          <label className="flex items-center gap-3 cursor-pointer group w-fit">
            <button
              type="button"
              onClick={() => set("hasExtension", get("hasExtension") === "true" ? "false" : "true")}
              className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
              style={{
                borderColor: get("hasExtension") === "true" ? "#7c3aed" : "#cbd5e1",
                background: get("hasExtension") === "true" ? "#7c3aed" : "white",
              }}
            >
              {get("hasExtension") === "true" && <span className="text-white text-xs leading-none font-bold">✓</span>}
            </button>
            <div>
              <span className="text-sm font-semibold text-slate-700">작업기간 연장</span>
              <p className="text-xs text-slate-400 mt-0.5">체크 시 우측 결재란에서 작업허가 연장 서명이 진행됩니다</p>
            </div>
          </label>
          {get("hasExtension") === "true" && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className={LBL}>연장 기간</label>
                <input className={INP} value={get("extensionPeriod")} onChange={e => set("extensionPeriod", e.target.value)} placeholder="예: 2025-01-10 ~ 2025-01-12" />
              </div>
              <div>
                <label className={LBL}>연장 사유</label>
                <input className={INP} value={get("extensionReason")} onChange={e => set("extensionReason", e.target.value)} placeholder="작업 연장 사유 기입" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════ 모달 ══════ */}
      {floorGuideOpen && (
        <FloorGuideModal onClose={() => setFloorGuideOpen(false)} />
      )}
      {sigModal && (
        <SignatureDrawModal
          title={sigModal.label}
          onSave={(dataUrl) => set(sigModal.target, dataUrl)}
          onClose={() => setSigModal(null)}
        />
      )}
      {reqModal && (
        <SignatureRequestModal
          targetLabel={reqModal}
          onClose={() => setReqModal(null)}
        />
      )}
      {safeBuddyModal && (
        <SafeBuddyEduModal
          onImport={() => {}}
          onClose={() => setSafeBuddyModal(false)}
        />
      )}
    </div>
  );
}
