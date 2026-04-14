"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useWorkPermitStore } from "@/store/workPermitStore";

// ─── 참고 모달 ────────────────────────────────────────────────────
const REF_LINKS = [
  {
    group: "화면 설계",
    items: [
      { href: "/screens", label: "화면 목록", icon: "🖥" },
      { href: "/screens/permit-list", label: "허가서 목록 화면", icon: "▤" },
      { href: "/screens/permit-detail", label: "허가서 상세 화면", icon: "▤" },
    ],
  },
  {
    group: "기획 참고",
    items: [
      { href: "/permit", label: "PTW 개요", icon: "📘" },
      { href: "/permit/flow", label: "허가 프로세스", icon: "→" },
      { href: "/permit/roles", label: "역할 & 권한", icon: "👤" },
      { href: "/permit/forms", label: "허가서 양식", icon: "📝" },
      { href: "/developer", label: "개발자 참고", icon: "💻" },
    ],
  },
  {
    group: "기타",
    items: [
      { href: "/old-dashboard", label: "구 대시보드", icon: "🏠" },
    ],
  },
];

function RefModal({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-start" onClick={onClose}>
      <div
        className="mb-16 ml-3 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        style={{ width: 240 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">화면설계 / 기획참고</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>
        <div className="p-2 max-h-80 overflow-y-auto">
          {REF_LINKS.map((section) => (
            <div key={section.group} className="mb-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">{section.group}</p>
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                      isActive ? "bg-orange-50 text-orange-700 font-semibold" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="w-4 text-center text-sm">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 사이드바 ─────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { createPermit } = useWorkPermitStore();
  const [refOpen, setRefOpen] = useState(false);

  const handleCreatePermit = () => {
    const newId = createPermit("general");
    router.push(`/work-plan/permits?permit=${newId}`);
  };

  const mainNav = [
    { href: "/approval", label: "대시보드", icon: "⊞" },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <aside className="w-56 h-screen bg-slate-900 flex flex-col overflow-y-auto flex-shrink-0">
        {/* 로고 */}
        <div className="px-4 py-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold"
              style={{ background: "#E05A2B" }}>
              C
            </div>
            <div>
              <div className="text-white text-sm font-semibold">PTW CHM</div>
              <div className="text-slate-400 text-xs">작업허가서 시스템</div>
            </div>
          </div>
        </div>

        {/* 메인 메뉴 */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {/* 대시보드 */}
          <Link
            href="/approval"
            className={`sidebar-link ${pathname === "/approval" || pathname === "/" ? "active" : ""}`}
          >
            <span className="w-5 text-center text-base">⊞</span>
            <span>대시보드</span>
          </Link>

          {/* 작업허가서 생성 — 버튼 */}
          <button
            onClick={handleCreatePermit}
            className="sidebar-link w-full text-left"
            style={{ background: "transparent" }}
          >
            <span className="w-5 text-center text-base">🔑</span>
            <span>작업허가서 생성</span>
          </button>

          {/* 작업허가서 설정 */}
          <Link
            href="/work-plan/permit-settings"
            className={`sidebar-link ${isActive("/work-plan/permit-settings") ? "active" : ""}`}
          >
            <span className="w-5 text-center text-base">⚙</span>
            <span>작업허가서 설정</span>
          </Link>
        </nav>

        {/* 하단 영역 */}
        <div className="px-3 pb-3 flex flex-col gap-1 border-t border-slate-700 pt-3">
          {/* 화면설계/기획참고 버튼 */}
          <button
            onClick={() => setRefOpen((v) => !v)}
            className="sidebar-link w-full text-left"
          >
            <span className="w-5 text-center text-base">📂</span>
            <span>화면설계 / 기획참고</span>
            <span className="ml-auto text-slate-500 text-xs">{refOpen ? "▼" : "▶"}</span>
          </button>

          <div className="px-3 py-2">
            <div className="text-slate-600 text-xs">v0.1 · CHM 작업허가서</div>
          </div>
        </div>
      </aside>

      {/* 참고 모달 */}
      {refOpen && <RefModal onClose={() => setRefOpen(false)} />}
    </>
  );
}
