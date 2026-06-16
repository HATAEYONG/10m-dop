"use client";

import { useState } from "react";
import {
  AlertCircle, TrendingUp, Database, BarChart3, Zap, ArrowRight,
  Bot, Play, FileBarChart2, MessageSquareText, CheckCircle2,
  Network, GitBranch, Users, Share2, CheckSquare, ClipboardCheck,
  Factory, FileSearch, Sparkles, Map, AlertTriangle, XCircle,
} from "lucide-react";
import Link from "next/link";

// ── 업체 원본 데이터 ─────────────────────────────────────────────
const companies = [
  {
    id: "A", name: "A업체", label: "A업체 (더존 ERP)",
    sources: ["더존 ERP", "Excel BOM", "PDF 작업표준서"],
    score: 72, aiReady: 68, structured: 45, semi: 30, unstructured: 25,
    issues: ["날짜 형식 혼재 (3종)", "품목코드 중복 12건", "PDF 텍스트 추출 실패 8건"],
    reportScore: 87, completedSteps: 10, totalSteps: 10,
    status: "processing",
  },
  {
    id: "B", name: "B업체", label: "B업체 (SAP ERP)",
    sources: ["SAP ERP", "MES", "설비 CSV 로그"],
    score: 88, aiReady: 85, structured: 70, semi: 20, unstructured: 10,
    issues: ["거래처명 표기 불일치 5건"],
    reportScore: 79, completedSteps: 8, totalSteps: 10,
    status: "ready",
  },
  {
    id: "C", name: "C업체", label: "C업체 (자체 ERP)",
    sources: ["자체 ERP", "수기 Excel", "카카오톡/메일 발주"],
    score: 41, aiReady: 32, structured: 30, semi: 25, unstructured: 45,
    issues: ["비정형 비율 45% 초과", "수기 Excel 컬럼명 비표준 28건", "발주 데이터 파싱 불가"],
    reportScore: 62, completedSteps: 6, totalSteps: 10,
    status: "warning",
  },
  {
    id: "D", name: "D업체", label: "D업체 (Odoo)",
    sources: ["Odoo ERP", "Google Sheets", "PDF 검사성적서"],
    score: 65, aiReady: 61, structured: 50, semi: 35, unstructured: 15,
    issues: ["Google Sheets 권한 미설정", "검사성적서 표 구조 불일치"],
    reportScore: 74, completedSteps: 7, totalSteps: 10,
    status: "processing",
  },
];

// ── 최근 Agent 결정 로그 ─────────────────────────────────────────
const AGENT_LOG = [
  {
    id: 1, time: "14:23", company: "A업체", stage: "Entity Resolution",
    decision: "approved", label: "결정: 병합 승인",
    detail: "CUST_NM '삼성전자(주)' ↔ '삼성전자' 동일 엔티티 확신도 94.2%",
    confidence: 94, color: "text-emerald-600 bg-emerald-50",
  },
  {
    id: 2, time: "14:19", company: "C업체", stage: "Schema Mapping",
    decision: "flagged", label: "결정: Human Review",
    detail: "컬럼 '수량' — Material.qty vs Process.vol 매핑 모호 (신뢰도 58%)",
    confidence: 58, color: "text-amber-600 bg-amber-50",
  },
  {
    id: 3, time: "14:11", company: "B업체", stage: "Ontology Mapping",
    decision: "mapped", label: "결정: 도메인 배치",
    detail: "SAP MARA 자재 마스터 → Material 도메인 12개 필드 매핑 완료",
    confidence: 97, color: "text-blue-600 bg-blue-50",
  },
];

// ── 파이프라인 단계별 누적 현황 ───────────────────────────────────
const PIPELINE_STEPS = [
  { step: "Source Scanner",   done: 4 },
  { step: "Schema Profiler",  done: 3 },
  { step: "Document Parser",  done: 2 },
  { step: "Data Cleaner",     done: 2 },
  { step: "Entity Resolver",  done: 1 },
  { step: "Canonical Mapper", done: 1 },
  { step: "Ontology Mapper",  done: 1 },
  { step: "Graph Builder",    done: 0 },
  { step: "Quality Validator",done: 0 },
  { step: "Human Review",     done: 0 },
];

// ── 색상 유틸 ────────────────────────────────────────────────────
const statusColor: Record<string, string> = {
  ready: "bg-emerald-100 text-emerald-700",
  processing: "bg-blue-100 text-blue-700",
  warning: "bg-amber-100 text-amber-700",
};
const statusLabel: Record<string, string> = {
  ready: "완료", processing: "처리중", warning: "주의필요",
};

function ScoreBar({ value, small }: { value: number; small?: boolean }) {
  const color = value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-blue-500" : value >= 40 ? "bg-amber-400" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 ${small ? "h-1.5" : "h-2"} bg-slate-100 rounded-full overflow-hidden`}>
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className={`font-semibold w-8 text-right text-slate-700 ${small ? "text-xs" : "text-sm"}`}>{value}</span>
    </div>
  );
}

// ── 퀵 링크 목록 ─────────────────────────────────────────────────
const QUICK_LINKS = [
  { href: "/sources",           icon: Database,         label: "Source Registry",   badge: null },
  { href: "/schema-mapping",    icon: GitBranch,        label: "Schema Mapping",    badge: "14" },
  { href: "/document-parser",   icon: FileSearch,       label: "Document Parser",   badge: null },
  { href: "/data-cleaner",      icon: Sparkles,         label: "Data Cleaner",      badge: null },
  { href: "/entity-resolution", icon: Users,            label: "Entity Resolution", badge: "6" },
  { href: "/ontology-mapping",  icon: Network,          label: "Ontology Mapping",  badge: null },
  { href: "/graph",             icon: Share2,           label: "Graph Preview",     badge: null },
  { href: "/quality",           icon: CheckSquare,      label: "Quality Validator", badge: null },
  { href: "/human-review",      icon: ClipboardCheck,   label: "Human Review",      badge: "5" },
  { href: "/mes-viewer",        icon: Factory,          label: "MES Viewer",        badge: null },
  { href: "/graphrag",          icon: MessageSquareText,label: "GraphRAG Demo",     badge: null },
  { href: "/pipeline-runner",   icon: Play,             label: "Pipeline Runner",   badge: null },
  { href: "/agent-monitor",     icon: Bot,              label: "Agent Monitor",     badge: null },
  { href: "/onboarding-report", icon: FileBarChart2,    label: "Onboarding Report", badge: null },
  { href: "/roadmap",           icon: Map,              label: "Roadmap",           badge: null },
];

// ── 메인 컴포넌트 ────────────────────────────────────────────────
export default function Dashboard() {
  const [selected, setSelected] = useState<string | null>(null);

  const totalSources = companies.reduce((s, c) => s + c.sources.length, 0);
  const avgScore     = Math.round(companies.reduce((s, c) => s + c.score, 0) / companies.length);
  const avgAI        = Math.round(companies.reduce((s, c) => s + c.aiReady, 0) / companies.length);
  const avgReport    = Math.round(companies.reduce((s, c) => s + c.reportScore, 0) / companies.length);
  const warnings     = companies.filter(c => c.status === "warning").length;
  const humanReviewQ = 5;

  return (
    <div className="p-6 space-y-6">

      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Executive Summary</h1>
        <p className="text-slate-500 mt-1">데이터 온보딩 플랫폼 전체 현황 — 업체·파이프라인·AI Agent 통합 보기</p>
      </div>

      {/* ── KPI 카드 7개 ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "등록 업체",        value: companies.length, unit: "개",  icon: Database,     color: "bg-blue-50 text-blue-500" },
          { label: "전체 데이터 원천",  value: totalSources,     unit: "개",  icon: BarChart3,    color: "bg-indigo-50 text-indigo-500" },
          { label: "평균 품질 점수",    value: avgScore,         unit: "점",  icon: TrendingUp,   color: "bg-emerald-50 text-emerald-500" },
          { label: "AI 준비도",         value: avgAI,            unit: "%",   icon: Zap,          color: "bg-violet-50 text-violet-500" },
        ].map(({ label, value, unit, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500">{label}</span>
              <div className={`p-2 rounded-lg ${color}`}><Icon className="w-4 h-4" /></div>
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {value}<span className="text-base font-normal text-slate-400 ml-1">{unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* AI-Readiness 평균 */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-blue-200">AI-Readiness 종합</span>
            <FileBarChart2 className="w-5 h-5 text-blue-300 opacity-70" />
          </div>
          <div className="text-4xl font-bold mb-1">{avgReport}<span className="text-lg font-normal text-blue-300 ml-1">점</span></div>
          <div className="text-xs text-blue-200">4개 업체 온보딩 리포트 평균</div>
          <div className="mt-3 flex gap-2">
            {companies.map(c => (
              <div key={c.id} className="flex-1">
                <div className="text-xs text-blue-300 mb-1">{c.name}</div>
                <div className="h-1.5 bg-blue-500 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: `${c.reportScore}%` }} />
                </div>
                <div className="text-xs mt-1 font-semibold">{c.reportScore}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 지식 그래프 현황 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700">지식 그래프 현황</span>
            <Share2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "노드", value: "1,240", color: "text-blue-600" },
              { label: "엣지", value: "3,871", color: "text-violet-600" },
              { label: "도메인", value: "12", color: "text-emerald-600" },
              { label: "처리 레코드", value: "182K", color: "text-amber-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-50 rounded-lg p-3 text-center">
                <div className={`text-xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Human Review 대기 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700">Human Review 대기</span>
            <ClipboardCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-4xl font-bold text-amber-600">{humanReviewQ}</span>
            <span className="text-sm text-slate-400 mb-1">건 검토 필요</span>
          </div>
          <div className="space-y-1.5">
            {[
              { label: "엔티티 병합 검토", count: 2, color: "bg-blue-200" },
              { label: "매핑 모호 항목",   count: 2, color: "bg-amber-200" },
              { label: "온톨로지 분류",    count: 1, color: "bg-violet-200" },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-slate-600">{label}</span>
                </div>
                <span className="font-semibold text-slate-700">{count}건</span>
              </div>
            ))}
          </div>
          <Link href="/human-review" className="mt-4 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
            검토하러 가기 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* 경고 배너 */}
      {warnings > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-sm">
            <strong>{warnings}개 업체</strong>에서 데이터 품질 문제가 발견됐습니다.
            Human Review 및 Data Cleaner 재실행이 필요합니다.
          </span>
        </div>
      )}

      {/* ── 업체 현황 카드 ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">업체별 온보딩 현황</h2>
          <Link href="/onboarding-report" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
            전체 리포트 보기 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {companies.map(co => (
            <div
              key={co.id}
              onClick={() => setSelected(selected === co.id ? null : co.id)}
              className={`bg-white rounded-xl border shadow-sm p-5 cursor-pointer transition-all hover:shadow-md ${selected === co.id ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{co.label}</h3>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {co.sources.map(s => (
                      <span key={s} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ml-2 ${statusColor[co.status]}`}>
                  {statusLabel[co.status]}
                </span>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-xs text-slate-500 mb-1">데이터 품질 점수</p>
                  <ScoreBar value={co.score} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">AI 준비도</p>
                  <ScoreBar value={co.aiReady} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-slate-500">AI-Readiness (리포트)</p>
                    <span className={`text-xs font-bold ${co.reportScore >= 80 ? "text-emerald-600" : co.reportScore >= 65 ? "text-amber-600" : "text-rose-600"}`}>
                      {co.reportScore}점
                    </span>
                  </div>
                  <ScoreBar value={co.reportScore} small />
                </div>
              </div>

              {/* 파이프라인 완료 진행률 */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full"
                      style={{ width: `${(co.completedSteps / co.totalSteps) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 shrink-0">
                    파이프라인 {co.completedSteps}/{co.totalSteps}단계
                  </span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                {[["정형", co.structured], ["반정형", co.semi], ["비정형", co.unstructured]].map(([label, val]) => (
                  <div key={label as string}>
                    <div className="font-semibold text-slate-700">{val}%</div>
                    <div className="text-slate-400">{label}</div>
                  </div>
                ))}
              </div>

              {selected === co.id && co.issues.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                  <p className="text-xs font-medium text-slate-600 mb-1">발견된 이슈</p>
                  {co.issues.map(issue => (
                    <div key={issue} className="flex items-start gap-2 text-xs text-slate-600">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      {issue}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 하단 2열: 파이프라인 현황 + Agent 활동 ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* 파이프라인 단계 현황 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">온보딩 파이프라인 현황</h2>
            <Link href="/pipeline-runner" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              실행하기 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {PIPELINE_STEPS.map(s => (
              <div key={s.step} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${s.done === 4 ? "bg-emerald-100" : s.done > 0 ? "bg-blue-100" : "bg-slate-100"}`}>
                  {s.done === 4
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    : s.done > 0
                    ? <div className="w-2 h-2 rounded-full bg-blue-500" />
                    : <div className="w-2 h-2 rounded-full bg-slate-300" />
                  }
                </div>
                <span className="text-xs text-slate-700 flex-1">{s.step}</span>
                <div className="flex gap-1">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-sm ${i < s.done ? "bg-emerald-400" : "bg-slate-100"}`}
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-400 w-8 text-right">{s.done}/4</span>
              </div>
            ))}
          </div>
        </div>

        {/* 최근 AI Agent 활동 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">최근 AI Agent 활동</h2>
            <Link href="/agent-monitor" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              전체 로그 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {AGENT_LOG.map(entry => (
              <div key={entry.id} className="border border-slate-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Bot className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700">{entry.company}</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500">{entry.stage}</span>
                  </div>
                  <span className="text-xs text-slate-400">{entry.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${entry.color}`}>
                    {entry.label}
                  </div>
                  <span className="text-xs text-slate-500">신뢰도 {entry.confidence}%</span>
                </div>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{entry.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>오늘 총 AI 결정: <strong className="text-slate-700">47건</strong></span>
            <span>Human 에스컬레이션율: <strong className="text-amber-600">10.6%</strong></span>
          </div>
        </div>
      </div>

      {/* ── 빠른 실행 링크 그리드 ── */}
      <div>
        <h2 className="font-semibold text-slate-900 mb-3">빠른 화면 이동</h2>
        <div className="grid grid-cols-5 gap-2">
          {QUICK_LINKS.map(({ href, icon: Icon, label, badge }) => (
            <Link
              key={href}
              href={href}
              className="bg-white rounded-xl border border-slate-200 p-3 hover:border-blue-300 hover:shadow-sm transition-all group flex flex-col items-center gap-2 relative"
            >
              {badge && (
                <span className="absolute top-2 right-2 text-xs bg-rose-500 text-white w-4 h-4 rounded-full flex items-center justify-center font-bold leading-none">
                  {badge}
                </span>
              )}
              <div className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                <Icon className="w-4 h-4 text-slate-500 group-hover:text-blue-600 transition-colors" />
              </div>
              <span className="text-xs text-slate-600 group-hover:text-blue-600 text-center leading-tight transition-colors">{label}</span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
