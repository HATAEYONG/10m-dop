"use client";

import { useState } from "react";
import { CheckCircle, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Eye } from "lucide-react";

type RuleType = "date" | "unit" | "dedup" | "trim" | "code";
type RuleStatus = "active" | "disabled";

interface Rule {
  id: number;
  type: RuleType;
  name: string;
  description: string;
  status: RuleStatus;
  affected: number;
  before: string;
  after: string;
  source: string;
}

const rules: Rule[] = [
  {
    id: 1, type: "date", name: "날짜 형식 표준화", status: "active", affected: 1243,
    description: "다양한 날짜 형식을 ISO 8601 (YYYY-MM-DD)로 통일",
    before: "20240315, 2024/03/15, 15-03-2024, 24년3월15일",
    after: "2024-03-15",
    source: "A업체 Excel, C업체 수기장",
  },
  {
    id: 2, type: "unit", name: "중량 단위 통일 (g → kg)", status: "active", affected: 381,
    description: "g, mg, ton 등 혼재 단위를 kg으로 통일",
    before: "1500g, 0.0015ton, 1.5kg",
    after: "1.5 kg",
    source: "A업체 BOM, B업체 SAP",
  },
  {
    id: 3, type: "unit", name: "통화 정규화 (원/KRW)", status: "active", affected: 692,
    description: "\\, ₩, KRW, 원 등 혼재 표기를 KRW 숫자로 통일",
    before: "₩1,200,000 / 1200000원 / KRW 1.2M",
    after: "1200000",
    source: "A업체 ERP, D업체 Odoo",
  },
  {
    id: 4, type: "dedup", name: "거래처 중복 제거", status: "active", affected: 47,
    description: "동일 사업자번호 거래처 중 최신 레코드를 마스터로, 나머지 병합",
    before: "삼성전자(주) / Samsung Electronics / 삼성전자",
    after: "삼성전자 [CUST_0001]",
    source: "전체 업체 통합",
  },
  {
    id: 5, type: "trim", name: "공백·특수문자 정리", status: "active", affected: 2105,
    description: "앞뒤 공백 제거, 전각 문자 반각 변환, 연속 공백 단일화",
    before: "\"  삼성전자 (주)　\"",
    after: "\"삼성전자 (주)\"",
    source: "전체",
  },
  {
    id: 6, type: "code", name: "NULL / 공란 처리 표준화", status: "active", affected: 318,
    description: "'N/A', '없음', '-', '미입력' 등을 NULL로 통일",
    before: "N/A, -, 없음, 미기재, 해당없음",
    after: "NULL",
    source: "C업체 수기 Excel",
  },
  {
    id: 7, type: "unit", name: "길이 단위 통일 (mm → m)", status: "disabled", affected: 89,
    description: "mm, cm, inch를 m로 변환 (활성화 전 BOM 검토 필요)",
    before: "1200mm, 120cm, 47.24inch",
    after: "1.2 m",
    source: "A업체 BOM",
  },
];

const typeColor: Record<RuleType, string> = {
  date: "bg-blue-100 text-blue-700",
  unit: "bg-violet-100 text-violet-700",
  dedup: "bg-amber-100 text-amber-700",
  trim: "bg-slate-100 text-slate-600",
  code: "bg-rose-100 text-rose-700",
};
const typeLabel: Record<RuleType, string> = {
  date: "날짜", unit: "단위", dedup: "중복제거", trim: "문자정리", code: "코드변환",
};

const summary = [
  { label: "전체 레코드", value: "182,441", sub: "4개 업체 통합" },
  { label: "변환 대상", value: "4,875", sub: "전체의 2.7%" },
  { label: "완료", value: "4,523", sub: "92.8%" },
  { label: "오류/검토 필요", value: "352", sub: "7.2%" },
];

export default function DataCleaner() {
  const [ruleList, setRuleList] = useState(rules);
  const [preview, setPreview] = useState<number | null>(null);
  const [filter, setFilter] = useState<RuleType | "all">("all");

  function toggle(id: number) {
    setRuleList(prev => prev.map(r => r.id === id ? { ...r, status: r.status === "active" ? "disabled" : "active" } : r));
  }

  const filtered = filter === "all" ? ruleList : ruleList.filter(r => r.type === filter);
  const active = ruleList.filter(r => r.status === "active").reduce((s, r) => s + r.affected, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Data Cleaner</h1>
        <p className="text-slate-500 mt-1">날짜·단위·중복·공백 등 변환 규칙을 관리하고 변환 현황을 추적합니다</p>
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-4 gap-4">
        {summary.map(({ label, value, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <div className="text-sm text-slate-700 mt-0.5">{label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* 진행바 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-700">전체 정제 진행률</span>
          <span className="text-sm font-semibold text-emerald-600">92.8%</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: "92.8%" }} />
        </div>
        <div className="flex gap-6 mt-3 text-xs text-slate-500">
          <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />완료 4,523</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-rose-400 mr-1" />오류 352</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-slate-300 mr-1" />비활성 규칙 제외</span>
        </div>
      </div>

      {/* 규칙 목록 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-700">변환 규칙</span>
          <div className="flex gap-2 ml-auto">
            {(["all", "date", "unit", "dedup", "trim", "code"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${filter === f ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {f === "all" ? "전체" : typeLabel[f]}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.map(rule => (
            <div key={rule.id}>
              <div className="p-4 flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor[rule.type]}`}>{typeLabel[rule.type]}</span>
                    <span className="text-sm font-semibold text-slate-900">{rule.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${rule.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {rule.status === "active" ? "활성" : "비활성"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{rule.description}</p>
                  <div className="flex gap-4 mt-2 text-xs text-slate-500">
                    <span>영향 레코드: <strong className="text-slate-800">{rule.affected.toLocaleString()}건</strong></span>
                    <span>출처: {rule.source}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setPreview(preview === rule.id ? null : rule.id)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    미리보기
                    {preview === rule.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => toggle(rule.id)}
                    className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${rule.status === "active" ? "bg-rose-50 text-rose-600 hover:bg-rose-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"}`}
                  >
                    {rule.status === "active" ? "비활성화" : "활성화"}
                  </button>
                </div>
              </div>

              {preview === rule.id && (
                <div className="mx-4 mb-4 bg-slate-50 rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">변환 미리보기</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1.5">변환 전 (Before)</p>
                      <div className="bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 font-mono text-xs text-rose-800">{rule.before}</div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1.5">변환 후 (After)</p>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 font-mono text-xs text-emerald-800">{rule.after}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <RefreshCw className="w-4 h-4 text-blue-500 shrink-0" />
        <span>활성 규칙 {ruleList.filter(r => r.status === "active").length}개 기준 영향 레코드 합계: <strong>{active.toLocaleString()}건</strong> — 규칙 적용 순서는 우선순위에 따라 자동 결정됩니다</span>
      </div>
    </div>
  );
}
