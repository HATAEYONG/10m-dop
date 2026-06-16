"use client";

import { useState } from "react";
import { Check, X, ChevronRight, Users, Package } from "lucide-react";

type EntityStatus = "pending" | "merged" | "separated";

const candidates = [
  {
    id: 1,
    type: "Customer",
    canonicalId: "CUST_0001",
    recommendation: "merged",
    confidence: 94,
    status: "pending" as EntityStatus,
    reason: "사업자번호 일부 일치, 거래처 주소 유사, 전화번호 동일",
    variants: [
      { source: "A업체 ERP", value: "삼성전자(주)", extra: "사업자: 129-81-00742" },
      { source: "B업체 SAP", value: "Samsung Electronics", extra: "사업자: 129-81-00742" },
      { source: "C업체 Excel", value: "삼성전자", extra: "전화: 031-200-1114" },
    ],
  },
  {
    id: 2,
    type: "Customer",
    canonicalId: "CUST_0002",
    recommendation: "merged",
    confidence: 82,
    status: "pending" as EntityStatus,
    reason: "상호명 유사, 주소 동일 지역, 담당자 이름 일치",
    variants: [
      { source: "A업체 ERP", value: "현대자동차", extra: "서울 서초구" },
      { source: "D업체 Odoo", value: "현대자동차(주)", extra: "서울 서초구" },
    ],
  },
  {
    id: 3,
    type: "Product",
    canonicalId: "MAT_0001",
    recommendation: "merged",
    confidence: 91,
    status: "pending" as EntityStatus,
    reason: "규격 동일 (Al 6061-T6), 밀도/단위 일치",
    variants: [
      { source: "A업체 BOM", value: "AL6061", extra: "단위: KG" },
      { source: "B업체 SAP", value: "AL-6061", extra: "단위: KG" },
      { source: "B업체 MES", value: "AL 6061", extra: "단위: KG" },
      { source: "C업체 Excel", value: "6061 알루미늄", extra: "단위: KG" },
    ],
  },
  {
    id: 4,
    type: "Product",
    canonicalId: "MAT_0002",
    recommendation: "separated",
    confidence: 71,
    status: "pending" as EntityStatus,
    reason: "유사하지만 재질 코드 다름 — T4 vs T6 처리 상태 차이",
    variants: [
      { source: "A업체 BOM", value: "AL6061-T4", extra: "인장강도: 241MPa" },
      { source: "B업체 SAP", value: "AL6061-T6", extra: "인장강도: 310MPa" },
    ],
  },
  {
    id: 5,
    type: "Customer",
    canonicalId: "CUST_0003",
    recommendation: "merged",
    confidence: 88,
    status: "pending" as EntityStatus,
    reason: "법인등록번호 동일, 상호 변경 이력 있음",
    variants: [
      { source: "C업체 ERP", value: "LG전자", extra: "법인: 110111-0000190" },
      { source: "D업체 Odoo", value: "LG Electronics", extra: "법인: 110111-0000190" },
    ],
  },
  {
    id: 6,
    type: "Product",
    canonicalId: "PROD_0001",
    recommendation: "merged",
    confidence: 79,
    status: "pending" as EntityStatus,
    reason: "도면번호 일치, 규격 동일",
    variants: [
      { source: "A업체 ERP", value: "가스킷-001", extra: "도면: DWG-001-A" },
      { source: "A업체 BOM", value: "GASKET_001", extra: "도면: DWG-001-A" },
    ],
  },
];

const already = [
  { id: 101, type: "Customer", canonicalId: "CUST_0010", status: "merged" as EntityStatus, variants: ["포스코", "POSCO", "포스코(주)"], confidence: 97 },
  { id: 102, type: "Product", canonicalId: "MAT_0010", status: "merged" as EntityStatus, variants: ["SUS304", "SS304", "스텐304", "SUS 304"], confidence: 93 },
  { id: 103, type: "Product", canonicalId: "MAT_0011", status: "separated" as EntityStatus, variants: ["SUS304", "SUS316"], confidence: 44 },
];

export default function EntityResolution() {
  const [items, setItems] = useState(candidates);

  function decide(id: number, decision: EntityStatus) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, status: decision } : item));
  }

  const pending = items.filter(i => i.status === "pending");
  const resolved = items.filter(i => i.status !== "pending");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Entity Resolution</h1>
        <p className="text-slate-500 mt-1">동일 엔티티를 하나의 Canonical ID로 통합</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-amber-700">{pending.length}</div>
          <div className="text-sm text-amber-600">승인 대기</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-emerald-700">{resolved.filter(r => r.status === "merged").length + already.filter(a => a.status === "merged").length}</div>
          <div className="text-sm text-emerald-600">병합 완료</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-slate-700">{resolved.filter(r => r.status === "separated").length + already.filter(a => a.status === "separated").length}</div>
          <div className="text-sm text-slate-600">분리 결정</div>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-slate-900">검토 필요 ({pending.length}건)</h2>
          {pending.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-amber-200 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${item.type === "Customer" ? "bg-blue-50" : "bg-violet-50"}`}>
                    {item.type === "Customer" ? <Users className="w-4 h-4 text-blue-600" /> : <Package className="w-4 h-4 text-violet-600" />}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">{item.canonicalId}</span>
                    <span className="ml-2 text-xs text-slate-500">{item.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${item.recommendation === "merged" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                    AI 추천: {item.recommendation === "merged" ? "동일 엔티티" : "별개 엔티티"}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.confidence >= 90 ? "bg-emerald-50 text-emerald-700" : item.confidence >= 75 ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
                    신뢰도 {item.confidence}%
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 mb-4 bg-slate-50 rounded-lg p-3">
                <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-600">{item.reason}</p>
              </div>

              <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${Math.min(item.variants.length, 4)}, 1fr)` }}>
                {item.variants.map((v, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">{v.source}</div>
                    <div className="font-semibold text-slate-900 text-sm">{v.value}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{v.extra}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => decide(item.id, "merged")}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  동일 엔티티로 병합
                </button>
                <button
                  onClick={() => decide(item.id, "separated")}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:border-slate-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                  별개로 유지
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-900">이번 세션 처리 완료</h2>
          {resolved.map(item => (
            <div key={item.id} className={`bg-white rounded-xl border p-4 ${item.status === "merged" ? "border-emerald-200" : "border-slate-200"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.type === "Customer" ? <Users className="w-4 h-4 text-blue-500" /> : <Package className="w-4 h-4 text-violet-500" />}
                  <span className="font-medium text-slate-900">{item.canonicalId}</span>
                  <span className="text-xs text-slate-500">({item.variants.length}개 표기 통합)</span>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${item.status === "merged" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                  {item.status === "merged" ? "병합됨" : "분리됨"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-semibold text-slate-900">기처리 완료</h2>
        {already.map(item => (
          <div key={item.id} className={`bg-white rounded-xl border p-4 ${item.status === "merged" ? "border-emerald-200" : "border-slate-200"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                {item.type === "Customer" ? <Users className="w-4 h-4 text-blue-500" /> : <Package className="w-4 h-4 text-violet-500" />}
                <span className="font-medium text-slate-900">{item.canonicalId}</span>
                {item.variants.map(v => (
                  <span key={v} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{v}</span>
                ))}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-400">{item.confidence}%</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${item.status === "merged" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                  {item.status === "merged" ? "병합됨" : "분리됨"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
