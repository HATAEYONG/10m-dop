"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, TrendingUp, BarChart3, ChevronDown, ChevronUp } from "lucide-react";

type ScenarioId = "base" | "optimistic" | "risk";

interface PlanItem {
  product: string;
  material: string;
  demand: number;
  stock: number;
  inbound: number;
  gap: number;
  dueDate: string;
  risk: "ok" | "warn" | "danger";
}

const SCENARIOS: Record<ScenarioId, { label: string; desc: string; color: string; badge: string; items: PlanItem[] }> = {
  base: {
    label: "기본 시나리오",
    desc: "현재 수주 + 예상 발주 기준",
    color: "blue",
    badge: "bg-blue-600 text-white",
    items: [
      { product: "AL6061 판재 가공품",  material: "AL6061-T6", demand: 820,  stock: 450, inbound: 300, gap: -70,  dueDate: "2026-07-05", risk: "warn" },
      { product: "PCB 기판 A타입",      material: "PCB 원판",   demand: 500,  stock: 620, inbound: 0,   gap: 120,  dueDate: "2026-06-30", risk: "ok" },
      { product: "CNC 가공 부품 #1042", material: "초경 인서트",demand: 200,  stock: 80,  inbound: 200, gap: 80,   dueDate: "2026-07-10", risk: "ok" },
      { product: "PDF 검사 성적서 부품", material: "SUS304",    demand: 350,  stock: 120, inbound: 100, gap: -130, dueDate: "2026-07-03", risk: "danger" },
      { product: "설비 스페어 파트",     material: "베어링 6205",demand: 60,   stock: 45,  inbound: 20,  gap: 5,    dueDate: "2026-07-20", risk: "ok" },
    ],
  },
  optimistic: {
    label: "낙관 시나리오",
    desc: "삼성전자 추가 발주 30% 반영",
    color: "emerald",
    badge: "bg-emerald-600 text-white",
    items: [
      { product: "AL6061 판재 가공품",  material: "AL6061-T6", demand: 1060, stock: 450, inbound: 500, gap: -110, dueDate: "2026-07-05", risk: "danger" },
      { product: "PCB 기판 A타입",      material: "PCB 원판",   demand: 650,  stock: 620, inbound: 150, gap: 120,  dueDate: "2026-06-30", risk: "ok" },
      { product: "CNC 가공 부품 #1042", material: "초경 인서트",demand: 260,  stock: 80,  inbound: 200, gap: 20,   dueDate: "2026-07-10", risk: "warn" },
      { product: "PDF 검사 성적서 부품", material: "SUS304",    demand: 455,  stock: 120, inbound: 100, gap: -235, dueDate: "2026-07-03", risk: "danger" },
      { product: "설비 스페어 파트",     material: "베어링 6205",demand: 60,   stock: 45,  inbound: 20,  gap: 5,    dueDate: "2026-07-20", risk: "ok" },
    ],
  },
  risk: {
    label: "위험 시나리오",
    desc: "AL6061 수급 차질 + 물류 지연 반영",
    color: "rose",
    badge: "bg-rose-600 text-white",
    items: [
      { product: "AL6061 판재 가공품",  material: "AL6061-T6", demand: 820,  stock: 450, inbound: 100, gap: -270, dueDate: "2026-07-05", risk: "danger" },
      { product: "PCB 기판 A타입",      material: "PCB 원판",   demand: 500,  stock: 620, inbound: 0,   gap: 120,  dueDate: "2026-07-04", risk: "warn" },
      { product: "CNC 가공 부품 #1042", material: "초경 인서트",demand: 200,  stock: 80,  inbound: 200, gap: 80,   dueDate: "2026-07-10", risk: "ok" },
      { product: "PDF 검사 성적서 부품", material: "SUS304",    demand: 350,  stock: 120, inbound: 0,   gap: -230, dueDate: "2026-07-03", risk: "danger" },
      { product: "설비 스페어 파트",     material: "베어링 6205",demand: 60,   stock: 45,  inbound: 0,   gap: -15,  dueDate: "2026-07-20", risk: "warn" },
    ],
  },
};

const RISK_CFG = {
  ok:     { label: "정상",   color: "text-emerald-600 bg-emerald-50",  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  warn:   { label: "주의",   color: "text-amber-600 bg-amber-50",      icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  danger: { label: "납기위험",color: "text-rose-600 bg-rose-50",       icon: <AlertTriangle className="w-3.5 h-3.5" /> },
};

function GapBar({ demand, stock, inbound }: { demand: number; stock: number; inbound: number }) {
  const available = stock + inbound;
  const fillPct = Math.min(100, Math.round((available / demand) * 100));
  const color = fillPct >= 100 ? "bg-emerald-500" : fillPct >= 80 ? "bg-amber-400" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${fillPct}%` }} />
      </div>
      <span className="text-xs text-slate-500 w-8 text-right">{fillPct}%</span>
    </div>
  );
}

export default function ApsPlanner() {
  const [scenario, setScenario] = useState<ScenarioId>("base");
  const [expanded, setExpanded] = useState<string | null>(null);

  const sc = SCENARIOS[scenario];
  const dangerCount = sc.items.filter(i => i.risk === "danger").length;
  const warnCount   = sc.items.filter(i => i.risk === "warn").length;
  const okCount     = sc.items.filter(i => i.risk === "ok").length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">APS Planner</h1>
        <p className="text-slate-500 mt-1">시나리오별 수요·재고·입고 계획을 비교하고 납기 위험 품목을 조기 식별합니다</p>
      </div>

      {/* 시나리오 선택 */}
      <div className="flex gap-3">
        {(Object.entries(SCENARIOS) as [ScenarioId, typeof SCENARIOS[ScenarioId]][]).map(([id, s]) => (
          <button
            key={id}
            onClick={() => setScenario(id)}
            className={`flex-1 rounded-xl border p-4 text-left transition-all ${scenario === id ? "border-blue-400 ring-2 ring-blue-100 bg-white" : "border-slate-200 bg-white hover:border-slate-300"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.badge}`}>{s.label}</span>
            </div>
            <div className="text-xs text-slate-500">{s.desc}</div>
          </button>
        ))}
      </div>

      {/* KPI 요약 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "전체 품목",   value: sc.items.length, unit: "개",  color: "text-slate-800",   icon: <BarChart3 className="w-4 h-4" /> },
          { label: "납기 위험",   value: dangerCount,     unit: "개",  color: "text-rose-600",    icon: <AlertTriangle className="w-4 h-4" /> },
          { label: "주의 품목",   value: warnCount,       unit: "개",  color: "text-amber-600",   icon: <AlertTriangle className="w-4 h-4" /> },
          { label: "정상 품목",   value: okCount,         unit: "개",  color: "text-emerald-600", icon: <CheckCircle2 className="w-4 h-4" /> },
        ].map(({ label, value, unit, color, icon }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">{label}</span>
              <div className={`${color} opacity-60`}>{icon}</div>
            </div>
            <div className={`text-2xl font-bold ${color}`}>{value}<span className="text-sm font-normal text-slate-400 ml-1">{unit}</span></div>
          </div>
        ))}
      </div>

      {/* 수급 갭 테이블 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 text-sm">수요·재고·입고 계획 (단위: EA / KG / PCS)</h2>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <TrendingUp className="w-3.5 h-3.5" />
            기준일: 2026-06-18
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["제품명", "원자재", "수요량", "현재고", "입고예정", "가용량 충족률", "납기일", "상태", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sc.items.map((item, idx) => {
                const rc = RISK_CFG[item.risk];
                const isExpanded = expanded === item.product;
                const available = item.stock + item.inbound;
                return (
                  <>
                    <tr key={item.product} className={`hover:bg-slate-50 ${item.risk === "danger" ? "bg-rose-50/30" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="text-xs font-semibold text-slate-900">{item.product}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{item.material}</td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-800">{item.demand.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{item.stock.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{item.inbound.toLocaleString()}</td>
                      <td className="px-4 py-3 w-40">
                        <GapBar demand={item.demand} stock={item.stock} inbound={item.inbound} />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{item.dueDate}</td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit ${rc.color}`}>
                          {rc.icon} {rc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpanded(isExpanded ? null : item.product)}
                          className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${item.product}-detail`} className="bg-slate-50">
                        <td colSpan={9} className="px-4 py-3">
                          <div className="flex gap-6 text-xs">
                            <div>
                              <span className="font-semibold text-slate-600">수급 갭: </span>
                              <span className={`font-bold ${item.gap >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                {item.gap >= 0 ? "+" : ""}{item.gap.toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-600">가용량: </span>
                              <span className="text-slate-700">{available.toLocaleString()} / {item.demand.toLocaleString()}</span>
                            </div>
                            {item.risk !== "ok" && (
                              <div className="text-rose-600 font-semibold">
                                → 긴급 발주 {Math.abs(item.gap).toLocaleString()}단위 필요
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 권고 조치 */}
      {dangerCount > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h3 className="font-semibold text-rose-700">긴급 조치 필요 — {dangerCount}개 품목 납기 위험</h3>
          </div>
          <div className="space-y-2">
            {sc.items.filter(i => i.risk === "danger").map(i => (
              <div key={i.product} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-rose-100">
                <div>
                  <span className="text-sm font-semibold text-slate-800">{i.product}</span>
                  <span className="text-xs text-slate-500 ml-2">({i.material})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-rose-600 font-bold">부족: {Math.abs(i.gap).toLocaleString()}단위</span>
                  <span className="text-xs text-slate-500">납기: {i.dueDate}</span>
                  <button className="text-xs px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors">
                    긴급 발주
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
