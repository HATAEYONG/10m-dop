"use client";

import { useState } from "react";
import { AlertCircle, TrendingUp, Database, BarChart3, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";

const companies = [
  {
    id: "A",
    name: "A업체 (더존 ERP)",
    sources: ["더존 ERP", "Excel BOM", "PDF 작업표준서"],
    score: 72,
    structured: 45,
    semi: 30,
    unstructured: 25,
    issues: ["날짜 형식 혼재 (3종)", "품목코드 중복 12건", "PDF 텍스트 추출 실패 8건"],
    aiReady: 68,
    status: "processing",
  },
  {
    id: "B",
    name: "B업체 (SAP ERP)",
    sources: ["SAP ERP", "MES", "설비 CSV 로그"],
    score: 88,
    structured: 70,
    semi: 20,
    unstructured: 10,
    issues: ["거래처명 표기 불일치 5건"],
    aiReady: 85,
    status: "ready",
  },
  {
    id: "C",
    name: "C업체 (자체 ERP)",
    sources: ["자체 ERP", "수기 Excel", "카카오톡/메일 발주"],
    score: 41,
    structured: 30,
    semi: 25,
    unstructured: 45,
    issues: ["비정형 비율 45% 초과", "수기 Excel 컬럼명 비표준 28건", "발주 데이터 파싱 불가"],
    aiReady: 32,
    status: "warning",
  },
  {
    id: "D",
    name: "D업체 (Odoo)",
    sources: ["Odoo ERP", "Google Sheets", "PDF 검사성적서"],
    score: 65,
    structured: 50,
    semi: 35,
    unstructured: 15,
    issues: ["Google Sheets 권한 미설정", "검사성적서 표 구조 불일치"],
    aiReady: 61,
    status: "processing",
  },
];

const statusColor: Record<string, string> = {
  ready: "bg-emerald-100 text-emerald-700",
  processing: "bg-blue-100 text-blue-700",
  warning: "bg-amber-100 text-amber-700",
};
const statusLabel: Record<string, string> = {
  ready: "완료",
  processing: "처리중",
  warning: "주의필요",
};

function ScoreBar({ value }: { value: number }) {
  const color = value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-blue-500" : value >= 40 ? "bg-amber-400" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-sm font-semibold w-8 text-right text-slate-700">{value}</span>
    </div>
  );
}

export default function Dashboard() {
  const [selected, setSelected] = useState<string | null>(null);

  const totalSources = companies.reduce((s, c) => s + c.sources.length, 0);
  const avgScore = Math.round(companies.reduce((s, c) => s + c.score, 0) / companies.length);
  const avgAI = Math.round(companies.reduce((s, c) => s + c.aiReady, 0) / companies.length);
  const warnings = companies.filter(c => c.status === "warning").length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">데이터 진단 대시보드</h1>
        <p className="text-slate-500 mt-1">업체별 데이터 현황 및 AI 적용 가능성 분석</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "등록 업체", value: companies.length, unit: "개", icon: Database },
          { label: "전체 데이터 원천", value: totalSources, unit: "개", icon: BarChart3 },
          { label: "평균 품질 점수", value: avgScore, unit: "점", icon: TrendingUp },
          { label: "AI 준비도", value: avgAI, unit: "%", icon: Zap },
        ].map(({ label, value, unit, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500">{label}</span>
              <div className="p-2 rounded-lg bg-blue-50">
                <Icon className="w-4 h-4 text-blue-500" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {value}
              <span className="text-base font-normal text-slate-400 ml-1">{unit}</span>
            </div>
          </div>
        ))}
      </div>

      {warnings > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-sm">
            <strong>{warnings}개 업체</strong>에서 데이터 품질 문제가 발견됐습니다. Human Review가 필요합니다.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {companies.map(co => (
          <div
            key={co.id}
            onClick={() => setSelected(selected === co.id ? null : co.id)}
            className={`bg-white rounded-xl border shadow-sm p-5 cursor-pointer transition-all hover:shadow-md ${selected === co.id ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-900">{co.name}</h3>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {co.sources.map(s => (
                    <span key={s} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[co.status]}`}>
                {statusLabel[co.status]}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">데이터 품질 점수</p>
                <ScoreBar value={co.score} />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">AI 준비도</p>
                <ScoreBar value={co.aiReady} />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
              {[["정형", co.structured], ["반정형", co.semi], ["비정형", co.unstructured]].map(([label, val]) => (
                <div key={label as string}>
                  <div className="font-semibold text-slate-700">{val}%</div>
                  <div className="text-slate-400">{label}</div>
                </div>
              ))}
            </div>

            {selected === co.id && co.issues.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                <p className="text-xs font-medium text-slate-600 mb-2">발견된 이슈</p>
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

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900 mb-4">온보딩 파이프라인 현황</h2>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {[
            { step: "Source Scanner", done: 4, total: 4 },
            { step: "Schema Profiler", done: 3, total: 4 },
            { step: "Document Parser", done: 2, total: 4 },
            { step: "Data Cleaner", done: 2, total: 4 },
            { step: "Entity Resolver", done: 1, total: 4 },
            { step: "Canonical Mapper", done: 1, total: 4 },
            { step: "Ontology Mapper", done: 1, total: 4 },
            { step: "Graph Builder", done: 0, total: 4 },
            { step: "Quality Validator", done: 0, total: 4 },
            { step: "Human Review", done: 0, total: 4 },
          ].map((s, i) => (
            <div key={s.step} className="flex items-center gap-1 shrink-0">
              {i > 0 && <ArrowRight className="w-3 h-3 text-slate-300" />}
              <div className={`text-center px-3 py-2 rounded-lg border text-xs font-medium ${s.done === s.total ? "bg-emerald-50 border-emerald-200 text-emerald-700" : s.done > 0 ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                <div>{s.step}</div>
                <div className="mt-0.5 text-xs opacity-70">{s.done}/{s.total}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { href: "/sources", label: "Source Registry 관리", desc: "데이터 원천 등록 및 연결 상태 확인" },
          { href: "/entity-resolution", label: "Entity Resolution 검토", desc: "AI 추천 병합 6건 승인 대기", badge: "6" },
          { href: "/schema-mapping", label: "Schema Mapping 확인", desc: "미승인 컬럼 매핑 14건", badge: "14" },
        ].map(({ href, label, desc, badge }) => (
          <Link key={href} href={href} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group">
            <div className="flex items-start justify-between">
              <h3 className="font-medium text-slate-900 text-sm">{label}</h3>
              {badge && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{badge}</span>}
            </div>
            <p className="text-xs text-slate-500 mt-1">{desc}</p>
            <div className="flex items-center gap-1 text-blue-600 text-xs mt-3 group-hover:gap-2 transition-all">
              바로가기 <ArrowRight className="w-3 h-3" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
