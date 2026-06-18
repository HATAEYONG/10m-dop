"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Database, GitBranch, Users, Network, Share2,
  CheckCircle, Building2, Map, FileSearch, ClipboardCheck, Sparkles,
  Factory, Play, Bot, FileBarChart2, MessageSquareText, Plug, Mail,
  Newspaper, CalendarClock, RadioTower, Cpu, Network as NetworkIcon,
  GitMerge, ShieldCheck, Upload, ChevronDown,
} from "lucide-react";

type NavItem = { href: string; icon: React.ElementType; label: string; sub: string };

const STEP1: NavItem[] = [
  { href: "/ingest",          icon: Upload,    label: "Data Ingestion Hub", sub: "3종 데이터 통합 적재" },
  { href: "/sources",         icon: Database,  label: "Source Registry",    sub: "데이터 원천 관리" },
  { href: "/sensor-gateway",  icon: RadioTower,label: "Sensor Gateway",     sub: "설비·PLC·센서 프로토콜" },
  { href: "/document-parser", icon: FileSearch,label: "Document Parser",    sub: "PDF·CSV 파싱" },
  { href: "/api-connector",   icon: Plug,      label: "API Connector",      sub: "외부 API 연동" },
  { href: "/email-parser",    icon: Mail,      label: "Email Parser",       sub: "이메일·메신저 파싱" },
];

const STEP2: NavItem[] = [
  { href: "/schema-mapping",    icon: GitBranch,     label: "Schema Mapping",    sub: "컬럼 표준화" },
  { href: "/data-cleaner",      icon: Sparkles,      label: "Data Cleaner",      sub: "날짜·단위·중복 정제" },
  { href: "/entity-resolution", icon: Users,         label: "Entity Resolution", sub: "엔티티 통합" },
  { href: "/ontology-mapping",  icon: Network,       label: "Ontology Mapping",  sub: "10M 온톨로지" },
  { href: "/pipeline-runner",   icon: Play,          label: "Pipeline Runner",   sub: "파이프라인 실행" },
  { href: "/auto-onboarding",   icon: Cpu,           label: "Auto Onboarding",   sub: "AI 자율 파이프라인" },
  { href: "/human-review",      icon: ClipboardCheck,label: "Human Review",      sub: "AI 저신뢰 항목 검토" },
  { href: "/data-lineage",      icon: GitMerge,      label: "Data Lineage",      sub: "필드 단위 계보 추적" },
  { href: "/quality",           icon: CheckCircle,   label: "Quality Validator", sub: "품질 검증" },
];

const STEP3: NavItem[] = [
  { href: "/ax-chat",       icon: MessageSquareText, label: "AX Chat",       sub: "LLM 자연어 질의" },
  { href: "/graphrag",      icon: MessageSquareText, label: "GraphRAG Demo", sub: "지식 그래프 질의" },
  { href: "/graph",         icon: Share2,            label: "Graph Preview", sub: "지식 그래프" },
  { href: "/agent-monitor", icon: Bot,               label: "Agent Monitor", sub: "AI 결정 로그" },
];

const OPS: NavItem[] = [
  { href: "/",                  icon: LayoutDashboard, label: "대시보드",          sub: "AX 전환 현황" },
  { href: "/mes-viewer",        icon: Factory,         label: "MES Viewer",       sub: "공정·설비 현황" },
  { href: "/aps-planner",       icon: CalendarClock,   label: "APS Planner",      sub: "수급 계획·납기 관리" },
  { href: "/supply-chain-twin", icon: NetworkIcon,     label: "Supply Chain Twin",sub: "공급망 디지털 트윈" },
  { href: "/news-monitor",      icon: Newspaper,       label: "News Monitor",     sub: "공급망 위험 탐지" },
  { href: "/onboarding-report", icon: FileBarChart2,   label: "Onboarding Report",sub: "AI-Readiness 리포트" },
  { href: "/governance",        icon: ShieldCheck,     label: "Governance",       sub: "오너십·SLA·컴플라이언스" },
  { href: "/roadmap",           icon: Map,             label: "Roadmap",          sub: "개발 현황 · 내부용" },
];

const SECTIONS = [
  { key: "step1", label: "STEP 1  데이터 적재",    items: STEP1, accent: "text-blue-400",   dot: "bg-blue-500" },
  { key: "step2", label: "STEP 2  표준화 파이프라인", items: STEP2, accent: "text-violet-400", dot: "bg-violet-500" },
  { key: "step3", label: "STEP 3  AI 분석",        items: STEP3, accent: "text-emerald-400", dot: "bg-emerald-500" },
  { key: "ops",   label: "운영 관리",              items: OPS,   accent: "text-slate-400",   dot: "bg-slate-500" },
];

export default function Sidebar() {
  const pathname = usePathname();
  // 기본 열림 상태: 현재 경로가 속한 섹션만 열고 나머지는 닫음
  const defaultOpen = Object.fromEntries(
    SECTIONS.map(s => [s.key, s.items.some(i => i.href === pathname)])
  );
  // 어느 섹션도 해당 안 되면 step1 열어두기
  if (!Object.values(defaultOpen).some(Boolean)) defaultOpen["step1"] = true;
  const [open, setOpen] = useState<Record<string, boolean>>(defaultOpen);

  const toggle = (key: string) => setOpen(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col min-h-screen">
      <div className="p-5 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-6 h-6 text-blue-400" />
          <span className="font-bold text-lg tracking-tight">10M DOP</span>
        </div>
        <p className="text-xs text-slate-400">AX 전환 데이터 표준화 플랫폼</p>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {SECTIONS.map(({ key, label, items, accent, dot }) => {
          const isOpen = open[key];
          const hasActive = items.some(i => i.href === pathname);
          return (
            <div key={key}>
              {/* 섹션 헤더 — 클릭으로 펼치기/접기 */}
              <button
                onClick={() => toggle(key)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors hover:bg-slate-800 group",
                  hasActive && "bg-slate-800"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-bold tracking-wide", accent)}>{label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* 하위 메뉴 갯수 뱃지 */}
                  <span className={cn(
                    "text-xs font-semibold w-5 h-5 rounded-full flex items-center justify-center",
                    isOpen ? `${dot} text-white` : "bg-slate-700 text-slate-400"
                  )}>
                    {items.length}
                  </span>
                  <ChevronDown className={cn(
                    "w-3.5 h-3.5 text-slate-500 transition-transform duration-200",
                    isOpen && "rotate-180"
                  )} />
                </div>
              </button>

              {/* 하위 메뉴 목록 */}
              {isOpen && (
                <div className="mt-0.5 mb-1 space-y-0.5">
                  {items.map(({ href, icon: Icon, label: itemLabel, sub }) => {
                    const active = pathname === href;
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={cn(
                          "flex items-center gap-3 pl-4 pr-3 py-2 rounded-lg transition-colors group",
                          active
                            ? "bg-blue-600 text-white"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium leading-tight truncate">{itemLabel}</div>
                          <div className={cn(
                            "text-xs truncate",
                            active ? "text-blue-200" : "text-slate-500 group-hover:text-slate-400"
                          )}>
                            {sub}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700 shrink-0">
        <div className="text-xs text-slate-500">AX 전환 플랫폼 · MVP 5</div>
        <div className="flex gap-1 mt-2 flex-wrap">
          {["Ingest", "Std", "AXChat"].map(t => (
            <span key={t} className="text-xs bg-emerald-900 text-emerald-300 px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
      </div>
    </aside>
  );
}
