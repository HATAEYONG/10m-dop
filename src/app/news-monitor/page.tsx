"use client";

import { useState } from "react";
import { Newspaper, AlertTriangle, TrendingUp, TrendingDown, Search, Filter, ExternalLink, Clock, Building2, Package } from "lucide-react";

type RiskLevel = "high" | "medium" | "low" | "info";

interface NewsItem {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  risk: RiskLevel;
  categories: string[];
  relatedCompanies: string[];
  relatedMaterials: string[];
  summary: string;
}

const NEWS: NewsItem[] = [
  {
    id: "n1",
    title: "중국 알루미늄 수출 규제 강화… AL6061 시리즈 수급 차질 우려",
    source: "금속경제신문",
    publishedAt: "2시간 전",
    risk: "high",
    categories: ["원자재", "규제", "수출"],
    relatedCompanies: ["A업체", "B업체"],
    relatedMaterials: ["AL6061-T6"],
    summary: "중국 정부가 고강도 알루미늄 합금 수출에 쿼터제를 도입한다고 발표했습니다. 국내 제조업체의 AL6061 시리즈 원자재 수급에 단기 차질이 예상되며, 대체 공급선 확보가 시급합니다.",
  },
  {
    id: "n2",
    title: "삼성전자, 2026 하반기 PCB 발주량 30% 확대 예고",
    source: "전자부품 인사이트",
    publishedAt: "5시간 전",
    risk: "info",
    categories: ["수요", "반도체", "PCB"],
    relatedCompanies: ["D업체"],
    relatedMaterials: ["PCB 기판 A타입"],
    summary: "삼성전자 부품구매팀이 하반기 PCB 발주량을 전년 대비 30% 확대한다고 밝혔습니다. D업체를 포함한 1차 협력사에 대한 수주 증가가 예상됩니다.",
  },
  {
    id: "n3",
    title: "물류 파업으로 인천항 컨테이너 적체 — 납기 3~5일 지연 예상",
    source: "물류신문",
    publishedAt: "어제",
    risk: "medium",
    categories: ["물류", "납기", "항만"],
    relatedCompanies: ["A업체", "C업체", "D업체"],
    relatedMaterials: [],
    summary: "인천항 항만 노조 파업으로 컨테이너 처리 속도가 평시의 40% 수준으로 저하됐습니다. 수입 원자재 및 부품의 납기가 3~5일 추가 지연될 전망입니다.",
  },
  {
    id: "n4",
    title: "CNC 가공 전문 협력사 대도정밀, 경영난으로 부도 위기 보도",
    source: "중소기업 뉴스",
    publishedAt: "2일 전",
    risk: "high",
    categories: ["공급망", "부도", "협력사"],
    relatedCompanies: ["B업체"],
    relatedMaterials: [],
    summary: "B업체의 2차 협력사인 대도정밀이 자금난으로 어음 부도 가능성이 제기됐습니다. B업체 공정 중 CNC 가공 외주 물량의 30%를 담당하고 있어 공급망 점검이 필요합니다.",
  },
  {
    id: "n5",
    title: "구리 선물 가격 6개월 만에 최저… 전선·커넥터 원가 절감 기대",
    source: "원자재 시황",
    publishedAt: "3일 전",
    risk: "low",
    categories: ["원자재", "가격"],
    relatedCompanies: [],
    relatedMaterials: [],
    summary: "런던금속거래소(LME)에서 구리 선물 가격이 톤당 8,200달러로 하락해 6개월 최저치를 기록했습니다. 전선·커넥터 업체의 원재료비 절감 효과가 기대됩니다.",
  },
];

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bg: string; border: string; dot: string }> = {
  high:   { label: "위험",   color: "text-rose-700",    bg: "bg-rose-50",    border: "border-rose-200",   dot: "bg-rose-500" },
  medium: { label: "주의",   color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",  dot: "bg-amber-500" },
  low:    { label: "안전",   color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200",dot: "bg-emerald-500" },
  info:   { label: "기회",   color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200",   dot: "bg-blue-500" },
};

const RISK_ORDER: RiskLevel[] = ["high", "medium", "low", "info"];

export default function NewsMonitor() {
  const [selected, setSelected] = useState<string>("n1");
  const [filterRisk, setFilterRisk] = useState<RiskLevel | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = NEWS.filter(n =>
    (filterRisk === "all" || n.risk === filterRisk) &&
    (search === "" || n.title.includes(search) || n.summary.includes(search))
  );

  const item = NEWS.find(n => n.id === selected)!;
  const riskCounts = Object.fromEntries(
    RISK_ORDER.map(r => [r, NEWS.filter(n => n.risk === r).length])
  ) as Record<RiskLevel, number>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">News Monitor</h1>
        <p className="text-slate-500 mt-1">공급망 관련 뉴스를 실시간 수집하고 업체·품목 연관 위험 신호를 탐지합니다</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        {RISK_ORDER.map(r => {
          const rc = RISK_CONFIG[r];
          return (
            <div key={r} className={`rounded-xl border p-4 shadow-sm ${rc.bg} ${rc.border}`}>
              <div className={`text-xs font-semibold mb-1 ${rc.color}`}>{rc.label} 신호</div>
              <div className={`text-3xl font-bold ${rc.color}`}>{riskCounts[r]}<span className="text-sm font-normal ml-1 opacity-70">건</span></div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-4">
        {/* 뉴스 목록 */}
        <div className="w-80 shrink-0 space-y-3">
          {/* 검색·필터 */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="뉴스 검색..."
                className="w-full text-xs border border-slate-200 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {(["all", ...RISK_ORDER] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setFilterRisk(r)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                    filterRisk === r
                      ? r === "all" ? "bg-slate-900 text-white" : `${RISK_CONFIG[r].bg} ${RISK_CONFIG[r].color} ${RISK_CONFIG[r].border} border`
                      : "bg-white border border-slate-200 text-slate-500 hover:border-slate-400"
                  }`}
                >
                  {r === "all" ? "전체" : RISK_CONFIG[r].label}
                </button>
              ))}
            </div>
          </div>

          {filtered.map(n => {
            const rc = RISK_CONFIG[n.risk];
            return (
              <div
                key={n.id}
                onClick={() => setSelected(n.id)}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm ${selected === n.id ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"}`}
              >
                <div className="flex items-start gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${rc.dot}`} />
                  <div className="text-xs font-semibold text-slate-800 leading-relaxed">{n.title}</div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${rc.bg} ${rc.color} ${rc.border}`}>
                    {rc.label}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />{n.publishedAt}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 뉴스 상세 */}
        <div className="flex-1 space-y-4">
          <div className={`rounded-xl border p-5 shadow-sm ${RISK_CONFIG[item.risk].bg} ${RISK_CONFIG[item.risk].border}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="font-semibold text-slate-900 text-base leading-snug">{item.title}</h3>
              <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full shrink-0 border ${RISK_CONFIG[item.risk].bg} ${RISK_CONFIG[item.risk].color} ${RISK_CONFIG[item.risk].border}`}>
                {item.risk === "high" || item.risk === "medium"
                  ? <AlertTriangle className="w-3.5 h-3.5" />
                  : item.risk === "info"
                  ? <TrendingUp className="w-3.5 h-3.5" />
                  : <TrendingDown className="w-3.5 h-3.5" />
                }
                {RISK_CONFIG[item.risk].label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
              <span className="flex items-center gap-1"><Newspaper className="w-3 h-3" />{item.source}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.publishedAt}</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{item.summary}</p>
          </div>

          {/* 연관 정보 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h4 className="text-sm font-semibold text-slate-700 mb-4">연관 업체·품목</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
                  <Building2 className="w-3.5 h-3.5" /> 연관 업체
                </div>
                {item.relatedCompanies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {item.relatedCompanies.map(c => (
                      <span key={c} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium border border-blue-200">{c}</span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">특정 업체 해당 없음</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
                  <Package className="w-3.5 h-3.5" /> 연관 품목·자재
                </div>
                {item.relatedMaterials.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {item.relatedMaterials.map(m => (
                      <span key={m} className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium border border-amber-200">{m}</span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">특정 품목 해당 없음</span>
                )}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1">
              {item.categories.map(c => (
                <span key={c} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded"># {c}</span>
              ))}
            </div>
          </div>

          {/* 조치 버튼 */}
          {(item.risk === "high" || item.risk === "medium") && (
            <div className={`rounded-xl border p-4 ${RISK_CONFIG[item.risk].bg} ${RISK_CONFIG[item.risk].border}`}>
              <div className={`text-sm font-semibold ${RISK_CONFIG[item.risk].color} mb-3`}>권장 조치</div>
              <div className="flex gap-2 flex-wrap">
                <button className="text-xs px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                  담당자 알림 발송
                </button>
                <button className="text-xs px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                  Source Registry 연결 확인
                </button>
                <button className="text-xs px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> 원문 보기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
