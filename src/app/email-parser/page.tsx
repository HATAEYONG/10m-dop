"use client";

import { useState } from "react";
import { Mail, CheckCircle2, AlertTriangle, XCircle, ChevronRight, Inbox, Tag } from "lucide-react";

interface EmailItem {
  id: string;
  from: string;
  company: string;
  subject: string;
  receivedAt: string;
  channel: "email" | "kakao" | "slack";
  status: "parsed" | "partial" | "failed";
  fields: { label: string; value: string; confidence: number; mapped: string }[];
}

const EMAILS: EmailItem[] = [
  {
    id: "e1",
    from: "구매팀 <purchase@samsung-elec.co.kr>",
    company: "A업체 → 삼성전자",
    subject: "[발주서] AL6061-T6 판재 500kg 발주 요청 (2026-06-18)",
    receivedAt: "오늘 09:14",
    channel: "email",
    status: "parsed",
    fields: [
      { label: "발주번호",  value: "PO-2026-0847",        confidence: 98, mapped: "Order.order_no" },
      { label: "발주일",   value: "2026-06-18",           confidence: 97, mapped: "Order.order_date" },
      { label: "거래처",   value: "삼성전자",              confidence: 95, mapped: "Customer.cust_nm" },
      { label: "품목",     value: "AL6061-T6 판재",        confidence: 96, mapped: "Material.mat_nm" },
      { label: "수량",     value: "500",                  confidence: 99, mapped: "Order.qty" },
      { label: "단위",     value: "KG",                   confidence: 99, mapped: "Order.unit" },
      { label: "납기일",   value: "2026-07-05",           confidence: 94, mapped: "Order.due_date" },
      { label: "단가",     value: "4,200원/kg",            confidence: 88, mapped: "Order.unit_price" },
    ],
  },
  {
    id: "e2",
    from: "카카오톡 채널 (B업체 구매팀)",
    company: "B업체 내부",
    subject: "긴급발주) CNC 선반용 초경 인서트 200ea",
    receivedAt: "오늘 11:02",
    channel: "kakao",
    status: "partial",
    fields: [
      { label: "품목",     value: "초경 인서트 (DNMG)",   confidence: 91, mapped: "Material.mat_nm" },
      { label: "수량",     value: "200",                  confidence: 96, mapped: "Order.qty" },
      { label: "단위",     value: "EA",                   confidence: 95, mapped: "Order.unit" },
      { label: "납기일",   value: "불명확",               confidence: 41, mapped: "Order.due_date" },
      { label: "발주번호", value: "미확인",                confidence: 18, mapped: "Order.order_no" },
    ],
  },
  {
    id: "e3",
    from: "영업부 <sales@c-company.kr>",
    company: "C업체",
    subject: "Re: 수주확인서 첨부 (수기작성)",
    receivedAt: "어제 16:55",
    channel: "email",
    status: "failed",
    fields: [
      { label: "발주번호", value: "파싱 실패", confidence: 0, mapped: "-" },
      { label: "품목",     value: "파싱 실패", confidence: 0, mapped: "-" },
    ],
  },
  {
    id: "e4",
    from: "Slack #구매알림 (D업체)",
    company: "D업체",
    subject: "PCB 기판 A타입 150pcs 추가 발주",
    receivedAt: "어제 10:33",
    channel: "slack",
    status: "parsed",
    fields: [
      { label: "품목",     value: "PCB 기판 A타입",       confidence: 97, mapped: "Product.prod_nm" },
      { label: "수량",     value: "150",                  confidence: 98, mapped: "Order.qty" },
      { label: "단위",     value: "PCS",                  confidence: 96, mapped: "Order.unit" },
      { label: "납기일",   value: "2026-06-30",           confidence: 93, mapped: "Order.due_date" },
      { label: "담당자",   value: "김민준",               confidence: 92, mapped: "Customer.contact_nm" },
    ],
  },
];

const CHANNEL_BADGE: Record<string, string> = {
  email: "bg-blue-100 text-blue-700",
  kakao: "bg-yellow-100 text-yellow-700",
  slack: "bg-purple-100 text-purple-700",
};
const CHANNEL_LABEL: Record<string, string> = {
  email: "이메일", kakao: "카카오톡", slack: "Slack",
};
const STATUS_CONFIG = {
  parsed:  { label: "파싱 완료", color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  partial: { label: "부분 파싱", color: "text-amber-600 bg-amber-50 border-amber-200",       icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  failed:  { label: "파싱 실패", color: "text-rose-600 bg-rose-50 border-rose-200",           icon: <XCircle className="w-3.5 h-3.5" /> },
};

function ConfBar({ v }: { v: number }) {
  const color = v >= 90 ? "bg-emerald-500" : v >= 70 ? "bg-amber-400" : v >= 40 ? "bg-orange-400" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${v}%` }} />
      </div>
      <span className="text-xs text-slate-500 w-7 text-right">{v}%</span>
    </div>
  );
}

export default function EmailParser() {
  const [selected, setSelected] = useState("e1");
  const item = EMAILS.find(e => e.id === selected)!;

  const totalParsed  = EMAILS.filter(e => e.status === "parsed").length;
  const totalPartial = EMAILS.filter(e => e.status === "partial").length;
  const totalFailed  = EMAILS.filter(e => e.status === "failed").length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Email Parser</h1>
        <p className="text-slate-500 mt-1">이메일·카카오톡·Slack 발주 메시지에서 구조화 필드를 자동 추출합니다</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "수신 메시지",  value: EMAILS.length, unit: "건",  color: "text-slate-800" },
          { label: "파싱 완료",    value: totalParsed,   unit: "건",  color: "text-emerald-600" },
          { label: "부분 파싱",    value: totalPartial,  unit: "건",  color: "text-amber-600" },
          { label: "파싱 실패",    value: totalFailed,   unit: "건",  color: "text-rose-600" },
        ].map(({ label, value, unit, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="text-xs text-slate-500 mb-1">{label}</div>
            <div className={`text-2xl font-bold ${color}`}>{value}<span className="text-sm font-normal text-slate-400 ml-1">{unit}</span></div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        {/* 수신함 목록 */}
        <div className="w-80 shrink-0 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Inbox className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-slate-900 text-sm">수신함</h2>
          </div>
          {EMAILS.map(e => {
            const sc = STATUS_CONFIG[e.status];
            return (
              <div
                key={e.id}
                onClick={() => setSelected(e.id)}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm ${selected === e.id ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 truncate">{e.subject}</div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate">{e.company}</div>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full border shrink-0 ${sc.color}`}>
                    {sc.icon}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CHANNEL_BADGE[e.channel]}`}>
                    {CHANNEL_LABEL[e.channel]}
                  </span>
                  <span className="text-xs text-slate-400">{e.receivedAt}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 파싱 결과 상세 */}
        <div className="flex-1 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-900">{item.subject}</h3>
                <div className="text-xs text-slate-400 mt-1">{item.from} · {item.receivedAt}</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_CONFIG[item.status].color}`}>
                  {STATUS_CONFIG[item.status].icon}
                  {STATUS_CONFIG[item.status].label}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${CHANNEL_BADGE[item.channel]}`}>
                  {CHANNEL_LABEL[item.channel]}
                </span>
              </div>
            </div>

            {item.status === "failed" ? (
              <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-lg p-4">
                <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-rose-700">파싱 실패</div>
                  <div className="text-xs text-rose-600 mt-1">
                    수기 작성 이미지(스캔) 첨부로 텍스트 추출 불가능합니다.
                    Document Parser의 OCR 파이프라인으로 전달하거나 Human Review 큐에 등록하세요.
                  </div>
                  <button className="mt-3 text-xs px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors">
                    Human Review 큐 등록
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-100">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {["추출 필드", "값", "신뢰도", "10M 매핑"].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {item.fields.map(f => (
                      <tr key={f.label} className={`hover:bg-slate-50 ${f.confidence < 50 ? "bg-rose-50" : f.confidence < 80 ? "bg-amber-50" : ""}`}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <Tag className="w-3 h-3 text-slate-400" />
                            <span className="text-xs font-semibold text-slate-700">{f.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-800 font-medium">{f.value}</td>
                        <td className="px-4 py-2.5 w-32"><ConfBar v={f.confidence} /></td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono">{f.mapped}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {item.status !== "failed" && (
              <div className="mt-4 flex gap-2">
                <button className="text-xs px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold">
                  승인 및 저장
                </button>
                <button className="text-xs px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                  Human Review 요청
                </button>
                <button className="text-xs px-4 py-2 bg-white border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 transition-colors">
                  거부
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
