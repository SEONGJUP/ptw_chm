import Link from "next/link";

const stats = [
  { label: "허가서 유형", value: "9종", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { label: "허가 프로세스 단계", value: "6단계", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { label: "서명 단계", value: "5단계", color: "bg-violet-50 text-violet-700 border-violet-200" },
  { label: "역할 유형", value: "4종", color: "bg-amber-50 text-amber-700 border-amber-200" },
];

const quickLinks = [
  {
    title: "허가서 관리",
    desc: "작업허가서 발급, 조회, 승인 현황을 관리합니다.",
    colorTop: "border-t-orange-500",
    badge: "bg-orange-100 text-orange-700",
    abbr: "PTW",
    links: [
      { href: "/work-plan/permits", label: "허가서 목록" },
      { href: "/approval", label: "승인 관리" },
      { href: "/work-plan/permit-settings", label: "허가서 설정" },
    ],
  },
  {
    title: "화면 설계",
    desc: "작업허가서 UI/UX 화면 설계 프로토타입입니다.",
    colorTop: "border-t-blue-500",
    badge: "bg-blue-100 text-blue-700",
    abbr: "UI",
    links: [
      { href: "/screens", label: "화면 목록" },
      { href: "/screens/permit-list", label: "허가서 목록 화면" },
      { href: "/screens/permit-detail", label: "허가서 상세 화면" },
    ],
  },
];

const permitTypes = [
  { label: "일반작업", icon: "📋", color: "bg-slate-100 text-slate-600" },
  { label: "화기작업", icon: "🔥", color: "bg-red-100 text-red-600" },
  { label: "전기작업", icon: "⚡", color: "bg-yellow-100 text-yellow-600" },
  { label: "고소작업", icon: "🏗️", color: "bg-blue-100 text-blue-600" },
  { label: "굴착작업", icon: "⛏️", color: "bg-amber-100 text-amber-600" },
  { label: "밀폐공간", icon: "🚪", color: "bg-purple-100 text-purple-600" },
  { label: "중량물", icon: "🏋️", color: "bg-indigo-100 text-indigo-600" },
  { label: "야간·휴일", icon: "🌙", color: "bg-slate-100 text-slate-600" },
  { label: "단시간", icon: "⏱️", color: "bg-green-100 text-green-600" },
];

export default function Home() {
  return (
    <div className="p-8 max-w-5xl mx-auto overflow-y-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-bold">CHM</span>
          <span className="text-xs text-slate-400">작업허가서 시스템</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">PTW CHM 대시보드</h1>
        <p className="text-slate-500 mt-1">화학물질 취급 사업장 작업허가서 관리 시스템 기획 프로토타입</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm mt-1 opacity-75">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {quickLinks.map((m) => (
          <div key={m.title} className={`bg-white rounded-2xl border-4 border-t-4 ${m.colorTop} border-slate-100 p-6 shadow-sm`}>
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${m.badge}`}>{m.abbr}</span>
              <h2 className="text-lg font-semibold text-slate-800">{m.title}</h2>
            </div>
            <p className="text-slate-500 text-sm mb-5 leading-relaxed">{m.desc}</p>
            <div className="flex gap-2 flex-wrap">
              {m.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                >
                  {l.label} →
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Permit Types */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
        <h3 className="font-semibold text-slate-800 mb-4">지원 허가서 유형 (9종)</h3>
        <div className="grid grid-cols-3 gap-3">
          {permitTypes.map((pt) => (
            <div key={pt.label} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${pt.color}`}>
              <span className="text-lg">{pt.icon}</span>
              <span className="text-sm font-medium">{pt.label} 허가서</span>
            </div>
          ))}
        </div>
      </div>

      {/* Process Overview */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">기획 항목</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {[
            { label: "허가서 양식 설계", type: "양식", href: "/permit/forms", date: "진행중" },
            { label: "역할 & 권한 매트릭스", type: "PTW", href: "/permit/roles", date: "검토중" },
            { label: "허가 프로세스 흐름", type: "PTW", href: "/permit/flow", date: "완료" },
            { label: "허가서 목록 화면 설계", type: "화면", href: "/screens/permit-list", date: "진행중" },
            { label: "허가서 상세 화면 설계", type: "화면", href: "/screens/permit-detail", date: "진행중" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">{item.type}</span>
                <span className="text-sm text-slate-700">{item.label}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                item.date === "완료" ? "bg-emerald-100 text-emerald-600" :
                item.date === "진행중" ? "bg-blue-100 text-blue-600" :
                item.date === "검토중" ? "bg-amber-100 text-amber-600" :
                "bg-slate-100 text-slate-500"
              }`}>{item.date}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
