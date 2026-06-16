"use client";

import { useState } from "react";
import { Check, X, HelpCircle } from "lucide-react";

type MapStatus = "approved" | "pending" | "review";

const domains = [
  "Material", "Product", "Customer", "Supplier", "Order", "BOM",
  "Process", "Machine", "Measurement", "Maintenance", "Money", "Method",
];

const mappings = [
  { id: 1, canonical: "Customer", domain: "Customer", relation: "is_a", confidence: 98, status: "approved" as MapStatus, desc: "구매 거래처 → Customer 도메인" },
  { id: 2, canonical: "Product", domain: "Product", relation: "is_a", confidence: 95, status: "approved" as MapStatus, desc: "완제품/반제품 → Product 도메인" },
  { id: 3, canonical: "Material", domain: "Material", relation: "is_a", confidence: 97, status: "approved" as MapStatus, desc: "원자재/부자재 → Material 도메인" },
  { id: 4, canonical: "BOM", domain: "BOM", relation: "defines_structure_of", confidence: 93, status: "approved" as MapStatus, desc: "자재명세서 → BOM 도메인" },
  { id: 5, canonical: "Order", domain: "Order", relation: "is_a", confidence: 91, status: "approved" as MapStatus, desc: "판매/구매 주문 → Order 도메인" },
  { id: 6, canonical: "OrderLine", domain: "Order", relation: "part_of", confidence: 89, status: "approved" as MapStatus, desc: "주문 라인 → Order 도메인 하위" },
  { id: 7, canonical: "Plant", domain: "Process", relation: "located_at", confidence: 82, status: "pending" as MapStatus, desc: "공장/사업장 → Process 또는 별도 Location 도메인 검토" },
  { id: 8, canonical: "WorkOrder", domain: "Process", relation: "is_a", confidence: 87, status: "pending" as MapStatus, desc: "작업지시 → Process 도메인" },
  { id: 9, canonical: "Equipment", domain: "Machine", relation: "is_a", confidence: 90, status: "pending" as MapStatus, desc: "설비/기계 → Machine 도메인" },
  { id: 10, canonical: "InspectionResult", domain: "Measurement", relation: "produces", confidence: 85, status: "pending" as MapStatus, desc: "검사성적서 결과 → Measurement 도메인" },
  { id: 11, canonical: "FailureLog", domain: "Maintenance", relation: "triggers", confidence: 78, status: "pending" as MapStatus, desc: "설비 고장 로그 → Maintenance 도메인" },
  { id: 12, canonical: "CostRecord", domain: "Money", relation: "is_a", confidence: 83, status: "pending" as MapStatus, desc: "원가 기록 → Money 도메인" },
  { id: 13, canonical: "SOP", domain: "Method", relation: "documents", confidence: 88, status: "pending" as MapStatus, desc: "표준작업절차 → Method 도메인" },
  { id: 14, canonical: "Supplier", domain: "Supplier", relation: "is_a", confidence: 94, status: "approved" as MapStatus, desc: "공급업체 → Supplier 도메인" },
];

const relationColors: Record<string, string> = {
  "is_a": "bg-blue-100 text-blue-700",
  "part_of": "bg-violet-100 text-violet-700",
  "defines_structure_of": "bg-indigo-100 text-indigo-700",
  "produces": "bg-green-100 text-green-700",
  "triggers": "bg-orange-100 text-orange-700",
  "located_at": "bg-slate-100 text-slate-700",
  "documents": "bg-teal-100 text-teal-700",
};

export default function OntologyMapping() {
  const [items, setItems] = useState(mappings);

  function approve(id: number) {
    setItems(prev => prev.map(m => m.id === id ? { ...m, status: "approved" as MapStatus } : m));
  }
  function markReview(id: number) {
    setItems(prev => prev.map(m => m.id === id ? { ...m, status: "review" as MapStatus } : m));
  }

  const domainStats = domains.map(d => ({
    domain: d,
    count: items.filter(m => m.domain === d).length,
    approved: items.filter(m => m.domain === d && m.status === "approved").length,
  })).filter(d => d.count > 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ontology Mapping</h1>
        <p className="text-slate-500 mt-1">Canonical 객체를 10M 온톨로지 도메인에 배치</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="font-semibold text-slate-900">도메인 배치 현황</h2>
          <div className="grid grid-cols-3 gap-2">
            {domainStats.map(({ domain, count, approved }) => (
              <div key={domain} className={`rounded-xl border p-3 text-center ${approved === count ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"}`}>
                <div className="text-lg font-bold text-slate-900">{domain}</div>
                <div className="text-xs text-slate-500 mt-0.5">{approved}/{count} 승인</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl p-5 text-white space-y-2">
          <h2 className="font-semibold text-sm text-slate-300 mb-3">10M Ontology — 핵심 도메인</h2>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {["Material", "Product", "Customer", "Supplier", "Order", "BOM", "Process", "Machine", "Measurement", "Maintenance", "Money", "Method"].map(d => (
              <div key={d} className={`px-2 py-1.5 rounded-lg text-center font-medium ${domainStats.find(s => s.domain === d)?.approved === domainStats.find(s => s.domain === d)?.count && domainStats.find(s => s.domain === d)?.count ? "bg-blue-600 text-white" : domainStats.find(s => s.domain === d)?.count ? "bg-slate-700 text-blue-300" : "bg-slate-800 text-slate-500"}`}>
                {d}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">파란색: 매핑 완료 · 밝은색: 매핑 중 · 어두운색: 미사용</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["Canonical 객체", "10M 도메인", "관계 유형", "신뢰도", "설명", "상태", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(m => (
              <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono font-medium text-slate-900 text-sm">{m.canonical}</td>
                <td className="px-4 py-3">
                  <span className="text-sm font-semibold text-blue-700">{m.domain}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${relationColors[m.relation] || "bg-slate-100 text-slate-700"}`}>{m.relation}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.confidence >= 90 ? "bg-emerald-50 text-emerald-700" : m.confidence >= 75 ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
                    {m.confidence}%
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-xs">{m.desc}</td>
                <td className="px-4 py-3">
                  {m.status === "approved" && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">승인</span>}
                  {m.status === "pending" && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">대기</span>}
                  {m.status === "review" && <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">재검토</span>}
                </td>
                <td className="px-4 py-3">
                  {m.status === "pending" && (
                    <div className="flex gap-1">
                      <button onClick={() => approve(m.id)} className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => markReview(m.id)} className="p-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-600 transition-colors">
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
