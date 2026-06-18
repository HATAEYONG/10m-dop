"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Database,
  GitBranch,
  Users,
  Network,
  Share2,
  CheckCircle,
  Building2,
  Map,
  FileSearch,
  ClipboardCheck,
  Sparkles,
  Factory,
  Play,
  Bot,
  FileBarChart2,
  MessageSquareText,
  Plug,
  Mail,
  Newspaper,
  CalendarClock,
} from "lucide-react";

const nav = [
  { href: "/", icon: LayoutDashboard, label: "대시보드", sub: "업체 데이터 진단" },
  { href: "/sources", icon: Database, label: "Source Registry", sub: "데이터 원천 관리" },
  { href: "/schema-mapping", icon: GitBranch, label: "Schema Mapping", sub: "컬럼 표준화" },
  { href: "/document-parser", icon: FileSearch, label: "Document Parser", sub: "PDF·CSV 파싱" },
  { href: "/data-cleaner", icon: Sparkles, label: "Data Cleaner", sub: "날짜·단위·중복 정제" },
  { href: "/entity-resolution", icon: Users, label: "Entity Resolution", sub: "엔티티 통합" },
  { href: "/ontology-mapping", icon: Network, label: "Ontology Mapping", sub: "10M 온톨로지" },
  { href: "/graph", icon: Share2, label: "Graph Preview", sub: "지식 그래프" },
  { href: "/quality", icon: CheckCircle, label: "Quality Validator", sub: "품질 검증" },
  { href: "/human-review", icon: ClipboardCheck, label: "Human Review", sub: "AI 저신뢰 항목 검토" },
  { href: "/mes-viewer", icon: Factory, label: "MES Viewer", sub: "공정·설비 현황" },
  { href: "/graphrag", icon: MessageSquareText, label: "GraphRAG Demo", sub: "지식 그래프 질의" },
  { href: "/pipeline-runner", icon: Play, label: "Pipeline Runner", sub: "파이프라인 실행" },
  { href: "/agent-monitor", icon: Bot, label: "Agent Monitor", sub: "AI 결정 로그" },
  { href: "/onboarding-report", icon: FileBarChart2, label: "Onboarding Report", sub: "AI-Readiness 리포트" },
  { href: "/api-connector", icon: Plug, label: "API Connector", sub: "외부 API 연동" },
  { href: "/email-parser", icon: Mail, label: "Email Parser", sub: "이메일·메신저 파싱" },
  { href: "/news-monitor", icon: Newspaper, label: "News Monitor", sub: "공급망 위험 탐지" },
  { href: "/aps-planner", icon: CalendarClock, label: "APS Planner", sub: "수급 계획·납기 관리" },
  { href: "/roadmap", icon: Map, label: "Roadmap", sub: "개발 현황 · 내부용" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col min-h-screen">
      <div className="p-5 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-6 h-6 text-blue-400" />
          <span className="font-bold text-lg tracking-tight">10M DOP</span>
        </div>
        <p className="text-xs text-slate-400">Data Onboarding Platform</p>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {nav.map(({ href, icon: Icon, label, sub }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group",
              pathname === href
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <div>
              <div className="text-sm font-medium">{label}</div>
              <div className={cn("text-xs", pathname === href ? "text-blue-200" : "text-slate-500 group-hover:text-slate-400")}>
                {sub}
              </div>
            </div>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700 shrink-0">
        <div className="text-xs text-slate-500">MVP 4 · API + Email + News + APS</div>
        <div className="flex gap-1 mt-2 flex-wrap">
          {["API", "Email", "News", "APS"].map(t => (
            <span key={t} className="text-xs bg-orange-900 text-orange-300 px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
      </div>
    </aside>
  );
}
