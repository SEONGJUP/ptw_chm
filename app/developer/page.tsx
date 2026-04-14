export default function DeveloperPage() {
  const files = [
    { file: "store/workPermitStore.ts", desc: "작업허가서 상태, 유형, 서명, 체크리스트, 즐겨찾기" },
    { file: "components/work-permit/WorkPermitEditor.tsx", desc: "허가서 작성/편집 에디터 (풀 폼)" },
    { file: "components/work-permit/PermitCreateModal.tsx", desc: "허가서 신규 생성 모달" },
    { file: "app/work-plan/permits/page.tsx", desc: "허가서 목록 & 관리 페이지" },
    { file: "app/work-plan/permit-settings/page.tsx", desc: "허가서 유형 설정 & 체크리스트 관리" },
    { file: "app/approval/page.tsx", desc: "작업계획·허가서 승인 대시보드" },
  ];

  const permitTypes = [
    { type: "general", label: "일반작업", icon: "📋" },
    { type: "hot_work", label: "화기작업", icon: "🔥" },
    { type: "electrical", label: "전기작업", icon: "⚡" },
    { type: "working_at_height", label: "고소작업", icon: "🏗️" },
    { type: "excavation", label: "굴착작업", icon: "⛏️" },
    { type: "confined_space", label: "밀폐공간", icon: "🚪" },
    { type: "heavy_load", label: "중량물", icon: "🏋️" },
    { type: "night_overtime", label: "야간·휴일", icon: "🌙" },
    { type: "short_time", label: "단시간", icon: "⏱️" },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto overflow-y-auto">
      <div className="mb-2">
        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">개발자</span>
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">개발자 참고사항</h1>
      <p className="text-slate-500 mb-8">PTW CHM 작업허가서 시스템 파일 구조 및 참고 데이터</p>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">주요 파일 목록</h2>
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {files.map((f) => (
            <div key={f.file} className="px-5 py-3 flex items-start gap-4">
              <code className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono whitespace-nowrap">{f.file}</code>
              <span className="text-sm text-slate-500">{f.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">허가서 유형 (WorkPermitType)</h2>
        <div className="grid grid-cols-3 gap-3">
          {permitTypes.map((pt) => (
            <div key={pt.type} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <span className="text-2xl">{pt.icon}</span>
              <div>
                <div className="text-sm font-medium text-slate-800">{pt.label} 허가서</div>
                <code className="text-xs text-slate-400">{pt.type}</code>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
