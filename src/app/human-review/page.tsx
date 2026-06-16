"use client";

import { useState } from "react";
import { Users, Package, GitBranch, Network, ChevronRight, Check, X, Clock, MessageSquare } from "lucide-react";

type ReviewType = "entity" | "mapping" | "ontology";
type ReviewStatus = "pending" | "approved" | "rejected" | "deferred";

interface ReviewItem {
  id: number;
  type: ReviewType;
  confidence: number;
  status: ReviewStatus;
  title: string;
  question: string;
  reason: string;
  recommendation: string;
  evidence: string[];
  source: string;
  priority: "high" | "medium" | "low";
}

const items: ReviewItem[] = [
  {
    id: 1, type: "entity", confidence: 67, status: "pending", priority: "high",
    title: "CUST_0021 vs CUST_0022 — 동일 고객 여부",
    question: "\"엘지전자 BS사업부\"와 \"LG Electronics B2B\"를 동일 거래처로 병합할까요?",
    recommendation: "병합",
    reason: "상호명 패턴 일치 + 사업자번호 앞 6자리 동일. 단, 사업부 단위 분리 가능성 있어 신뢰도 67%",
    evidence: ["사업자번호 앞 6자리: 107-86", "청구지 주소 동일: 서울 영등포구 여의대로", "담당자 이메일 도메인 동일: @lge.com"],
    source: "A업체 ERP / C업체 Excel",
  },
  {
    id: 2, type: "mapping", confidence: 58, status: "pending", priority: "high",
    title: "C업체 Excel 컬럼 '수량' → Canonical 필드",
    question: "\"수량\" 컬럼을 OrderLine.quantity로 매핑할까요, 아니면 BOM.quantity_per로 매핑할까요?",
    recommendation: "OrderLine.quantity",
    reason: "시트명이 '수주현황'이나 인접 컬럼에 'BOM번호'가 있어 BOM 문맥도 존재. 동일 컬럼이 두 용도로 혼용 가능성",
    evidence: ["시트명: 수주현황", "인접 컬럼: 거래처, 품목, 수량, 단가, BOM번호", "일부 행에 소수점 값 존재 (BOM 가능성)"],
    source: "C업체 수기 Excel",
  },
  {
    id: 3, type: "entity", confidence: 72, status: "pending", priority: "medium",
    title: "MAT_0041 — AL6061-T4 vs AL6061-T6 통합 여부",
    question: "AL6061-T4와 AL6061-T6을 같은 자재로 볼까요, 아니면 별개로 관리할까요?",
    recommendation: "분리",
    reason: "동일 합금계열이나 열처리 상태(T4/T6)에 따라 인장강도 69MPa 차이. 생산 현장에서 혼용 시 불량 발생",
    evidence: ["AL6061-T4: 인장강도 241MPa", "AL6061-T6: 인장강도 310MPa", "BOM에서 교체 불가 처리됨"],
    source: "A업체 BOM / B업체 SAP",
  },
  {
    id: 4, type: "ontology", confidence: 61, status: "pending", priority: "medium",
    title: "Plant(공장/사업장) 도메인 배치",
    question: "Plant 객체를 Process 도메인에 포함할까요, 아니면 별도 Location 도메인을 신설할까요?",
    recommendation: "Location 도메인 신설",
    reason: "Plant는 물리적 위치 개념이나 Process와 연관됨. 향후 다공장 확장 시 Location 분리가 유리",
    evidence: ["B업체 SAP WERKS 필드: 공장 코드 4자리", "다공장 데이터 포함 (1100, 1200, 1300)", "향후 MES 연동 시 Plant 기준 집계 필요"],
    source: "B업체 SAP / Ontology Mapper",
  },
  {
    id: 5, type: "entity", confidence: 55, status: "pending", priority: "low",
    title: "SUP_0031 — 포스코 vs POSCO INX 분리 여부",
    question: "\"포스코\"와 \"POSCO INX\"를 같은 공급사로 병합할까요?",
    recommendation: "분리",
    reason: "POSCO INX는 포스코 계열사이나 별도 법인. 구매 계약·가격 조건이 다를 수 있음",
    evidence: ["사업자번호 완전히 다름", "결제 계좌 다름", "공급 품목 구분됨"],
    source: "D업체 Odoo",
  },
  {
    id: 6, type: "mapping", confidence: 79, status: "approved", priority: "medium",
    title: "B업체 SAP MATKL → Material.category 매핑",
    question: "MATKL(자재 그룹 코드)을 Material.category로 매핑할까요?",
    recommendation: "승인",
    reason: "SAP 자재 그룹은 표준 분류 코드로 category 매핑이 적합",
    evidence: ["MATKL 00001=원자재, 00002=반제품", "10M Material.category 와 1:1 대응"],
    source: "B업체 SAP",
  },
];

const typeIcon: Record<ReviewType, React.ReactNode> = {
  entity: <Users className="w-4 h-4" />,
  mapping: <GitBranch className="w-4 h-4" />,
  ontology: <Network className="w-4 h-4" />,
};
const typeBg: Record<ReviewType, string> = {
  entity: "bg-blue-50 text-blue-600",
  mapping: "bg-violet-50 text-violet-600",
  ontology: "bg-emerald-50 text-emerald-600",
};
const typeLabel: Record<ReviewType, string> = {
  entity: "Entity Resolution",
  mapping: "Schema Mapping",
  ontology: "Ontology",
};
const priorityColor = { high: "bg-rose-100 text-rose-700", medium: "bg-amber-100 text-amber-700", low: "bg-slate-100 text-slate-600" };
const priorityLabel = { high: "긴급", medium: "보통", low: "낮음" };

export default function HumanReview() {
  const [reviews, setReviews] = useState(items);
  const [selected, setSelected] = useState<number>(1);
  const [comment, setComment] = useState("");

  function decide(id: number, status: ReviewStatus) {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    const next = reviews.find(r => r.id !== id && r.status === "pending");
    if (next) setSelected(next.id);
    setComment("");
  }

  const pending = reviews.filter(r => r.status === "pending");
  const resolved = reviews.filter(r => r.status !== "pending");
  const sel = reviews.find(r => r.id === selected);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Human Review Console</h1>
        <p className="text-slate-500 mt-1">AI가 판단하기 어려운 항목을 사람이 직접 검토·승인합니다</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "검토 대기", value: pending.length, color: "text-amber-700 bg-amber-50 border-amber-200" },
          { label: "승인 완료", value: resolved.filter(r => r.status === "approved").length, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
          { label: "거절", value: resolved.filter(r => r.status === "rejected").length, color: "text-rose-700 bg-rose-50 border-rose-200" },
          { label: "보류", value: resolved.filter(r => r.status === "deferred").length, color: "text-slate-700 bg-slate-50 border-slate-200" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl border p-4 ${color}`}>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        {/* 항목 목록 */}
        <div className="w-72 shrink-0 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">대기 ({pending.length})</p>
          {pending.map(item => (
            <div
              key={item.id}
              onClick={() => setSelected(item.id)}
              className={`bg-white rounded-xl border p-3 cursor-pointer transition-all hover:shadow-sm ${selected === item.id ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"}`}
            >
              <div className="flex items-start gap-2">
                <div className={`p-1.5 rounded-lg shrink-0 ${typeBg[item.type]}`}>{typeIcon[item.type]}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-900 leading-tight">{item.title}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${priorityColor[item.priority]}`}>{priorityLabel[item.priority]}</span>
                    <span className="text-xs text-slate-400">신뢰도 {item.confidence}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {resolved.length > 0 && (
            <>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 mt-4">처리 완료 ({resolved.length})</p>
              {resolved.map(item => (
                <div key={item.id} className="bg-white rounded-xl border border-slate-100 p-3 opacity-60">
                  <div className="text-xs text-slate-600 truncate">{item.title}</div>
                  <span className={`text-xs mt-1 inline-block px-1.5 py-0.5 rounded-full ${item.status === "approved" ? "bg-emerald-100 text-emerald-700" : item.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                    {item.status === "approved" ? "승인" : item.status === "rejected" ? "거절" : "보류"}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* 상세 검토 패널 */}
        {sel ? (
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl ${typeBg[sel.type]}`}>{typeIcon[sel.type]}</div>
                <div>
                  <div className="text-xs font-medium text-slate-500">{typeLabel[sel.type]}</div>
                  <h2 className="font-semibold text-slate-900 mt-0.5">{sel.title}</h2>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                    <span>출처: {sel.source}</span>
                    <span>·</span>
                    <span className={`font-semibold ${sel.confidence >= 75 ? "text-blue-600" : "text-amber-600"}`}>AI 신뢰도 {sel.confidence}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* 질문 */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-900 mb-1">검토 요청</p>
                <p className="text-sm text-blue-800 leading-relaxed">{sel.question}</p>
              </div>

              {/* AI 추천 */}
              <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-4">
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-xs text-slate-500">AI 추천: </span>
                  <span className="text-sm font-semibold text-slate-900">{sel.recommendation}</span>
                </div>
                <div className="text-xs text-slate-400 ml-2">— {sel.reason}</div>
              </div>

              {/* 근거 */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">AI 판단 근거</p>
                <div className="space-y-1.5">
                  {sel.evidence.map((ev, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                      {ev}
                    </div>
                  ))}
                </div>
              </div>

              {/* 코멘트 */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">검토자 코멘트 (선택)</p>
                <div className="flex gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-400 mt-2.5 shrink-0" />
                  <input
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="결정 사유나 추가 맥락을 입력하세요..."
                    className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              {/* 결정 버튼 */}
              {sel.status === "pending" && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => decide(sel.id, "approved")}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    <Check className="w-4 h-4" /> AI 추천대로 승인
                  </button>
                  <button
                    onClick={() => decide(sel.id, "rejected")}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-rose-300 text-rose-600 rounded-xl text-sm font-semibold hover:bg-rose-50 transition-colors"
                  >
                    <X className="w-4 h-4" /> 거절
                  </button>
                  <button
                    onClick={() => decide(sel.id, "deferred")}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                  >
                    <Clock className="w-4 h-4" /> 보류
                  </button>
                </div>
              )}
              {sel.status !== "pending" && (
                <div className={`rounded-xl p-3 text-sm font-medium ${sel.status === "approved" ? "bg-emerald-50 text-emerald-700" : sel.status === "rejected" ? "bg-rose-50 text-rose-700" : "bg-slate-50 text-slate-600"}`}>
                  {sel.status === "approved" ? "✓ 승인됨" : sel.status === "rejected" ? "✗ 거절됨" : "⏸ 보류됨"}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
            모든 항목이 처리됐습니다
          </div>
        )}
      </div>
    </div>
  );
}
