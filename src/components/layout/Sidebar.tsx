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
} from "lucide-react";

const nav = [
  { href: "/", icon: LayoutDashboard, label: "대시보드", sub: "업체 데이터 진단" },
  { href: "/sources", icon: Database, label: "Source Registry", sub: "데이터 원천 관리" },
  { href: "/schema-mapping", icon: GitBranch, label: "Schema Mapping", sub: "컬럼 표준화" },
  { href: "/entity-resolution", icon: Users, label: "Entity Resolution", sub: "엔티티 통합" },
  { href: "/ontology-mapping", icon: Network, label: "Ontology Mapping", sub: "10M 온톨로지" },
  { href: "/graph", icon: Share2, label: "Graph Preview", sub: "지식 그래프" },
  { href: "/quality", icon: CheckCircle, label: "Quality Validator", sub: "품질 검증" },
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

      <nav className="flex-1 p-3 space-y-1">
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

      <div className="p-4 border-t border-slate-700">
        <div className="text-xs text-slate-500">MVP 1 · Excel + ERP + PDF</div>
        <div className="flex gap-1 mt-2">
          {["Excel", "ERP", "PDF"].map(t => (
            <span key={t} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
      </div>
    </aside>
  );
}
