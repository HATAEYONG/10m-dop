"use client";

import { useState, useEffect, useRef } from "react";
import {
  Mail, CheckCircle2, AlertTriangle, XCircle, Inbox, Tag,
  ChevronRight, FileText, Code2, RefreshCw, AlertCircle,
} from "lucide-react";

interface ParsedField {
  label: string; value: string; confidence: number; mapped: string;
}
interface EmailItem {
  id: string; from: string; company: string; subject: string;
  receivedAt: string; channel: "email" | "kakao" | "slack";
  status: "parsed" | "partial" | "failed";
  fields: ParsedField[];
  rawText: string;
  prompt: string;
  llmResponse: string;
  failReason?: string;
}

const BASE_EMAILS: EmailItem[] = [
  {
    id: "e1", from: "구매팀 <purchase@samsung-elec.co.kr>", company: "삼성전자",
    subject: "[발주서] AL6061-T6 판재 500kg 발주 요청 (2026-06-18)",
    receivedAt: "09:14", channel: "email", status: "parsed",
    fields: [
      { label: "발주번호", value: "PO-2026-0847", confidence: 98, mapped: "Order.order_no" },
      { label: "발주일",   value: "2026-06-18",   confidence: 97, mapped: "Order.order_date" },
      { label: "거래처",   value: "삼성전자",     confidence: 95, mapped: "Customer.cust_nm" },
      { label: "품목",     value: "AL6061-T6 판재", confidence: 96, mapped: "Material.mat_nm" },
      { label: "수량",     value: "500",           confidence: 99, mapped: "Order.qty" },
      { label: "단위",     value: "KG",            confidence: 99, mapped: "Order.unit" },
      { label: "납기일",   value: "2026-07-05",   confidence: 94, mapped: "Order.due_date" },
      { label: "단가",     value: "4,200원/kg",   confidence: 88, mapped: "Order.unit_price" },
    ],
    rawText: `발신: 구매팀 <purchase@samsung-elec.co.kr>
수신: A업체 영업팀
제목: [발주서] AL6061-T6 판재 500kg 발주 요청 (2026-06-18)

안녕하세요. 삼성전자 구매팀 이진우입니다.

발주서를 아래와 같이 전달드립니다.

발주번호: PO-2026-0847
발주일자: 2026년 6월 18일
거래처: 삼성전자 (주)
품목명: AL6061-T6 판재
수량: 500 KG
납기일: 2026년 7월 5일
단가: 4,200원/kg

감사합니다.`,
    prompt: `당신은 발주 문서에서 구조화 필드를 추출하는 AI입니다.

아래 이메일 본문에서 다음 필드를 JSON으로 추출하세요:
- order_no (발주번호)
- order_date (발주일)
- cust_nm (거래처명)
- mat_nm (품목명)
- qty (수량, 숫자만)
- unit (단위)
- due_date (납기일, YYYY-MM-DD)
- unit_price (단가)

각 필드에 confidence (0~100) 값을 함께 반환하세요.

[이메일 본문]
발주번호: PO-2026-0847
발주일자: 2026년 6월 18일
...`,
    llmResponse: `{
  "order_no":    { "value": "PO-2026-0847", "confidence": 98 },
  "order_date":  { "value": "2026-06-18",   "confidence": 97 },
  "cust_nm":     { "value": "삼성전자",     "confidence": 95 },
  "mat_nm":      { "value": "AL6061-T6 판재", "confidence": 96 },
  "qty":         { "value": "500",           "confidence": 99 },
  "unit":        { "value": "KG",            "confidence": 99 },
  "due_date":    { "value": "2026-07-05",   "confidence": 94 },
  "unit_price":  { "value": "4200",         "confidence": 88 }
}`,
  },
  {
    id: "e2", from: "카카오톡 채널 (B업체 구매팀)", company: "B업체",
    subject: "긴급발주) CNC 선반용 초경 인서트 200ea",
    receivedAt: "11:02", channel: "kakao", status: "partial",
    fields: [
      { label: "품목",     value: "초경 인서트 (DNMG)", confidence: 91, mapped: "Material.mat_nm" },
      { label: "수량",     value: "200",                confidence: 96, mapped: "Order.qty" },
      { label: "단위",     value: "EA",                 confidence: 95, mapped: "Order.unit" },
      { label: "납기일",   value: "불명확",             confidence: 41, mapped: "Order.due_date" },
      { label: "발주번호", value: "미확인",              confidence: 18, mapped: "Order.order_no" },
    ],
    rawText: `[카카오톡 채널 메시지]
발신: B업체 구매팀 박지훈
시각: 2026-06-18 11:02

긴급발주 들어갑니다.
CNC 선반용 초경 인서트 DNMG 200개 필요합니다.
빨리 처리 부탁드립니다. 언제까지 가능할지 확인해주세요.`,
    prompt: `당신은 비정형 메시지에서 발주 정보를 추출하는 AI입니다.

아래 카카오톡 메시지에서 발주 관련 필드를 최대한 추출하세요.
불명확한 경우 confidence를 낮게 설정하세요.

[메시지]
긴급발주 들어갑니다.
CNC 선반용 초경 인서트 DNMG 200개 필요합니다...`,
    llmResponse: `{
  "mat_nm":  { "value": "초경 인서트 (DNMG)", "confidence": 91 },
  "qty":     { "value": "200",                "confidence": 96 },
  "unit":    { "value": "EA",                 "confidence": 95 },
  "due_date":{ "value": null, "confidence": 41, "note": "명시적 납기일 없음" },
  "order_no":{ "value": null, "confidence": 18, "note": "발주번호 미확인" }
}`,
  },
  {
    id: "e3", from: "영업부 <sales@c-company.kr>", company: "C업체",
    subject: "Re: 수주확인서 첨부 (수기작성)",
    receivedAt: "어제 16:55", channel: "email", status: "failed",
    fields: [],
    rawText: `발신: 영업부 <sales@c-company.kr>
제목: Re: 수주확인서 첨부 (수기작성)

첨부 파일에 수기 작성 수주확인서 스캔본 첨부드립니다.
확인 부탁드립니다.

[첨부: scan_order_20260617.jpg — 1.2MB]`,
    prompt: "이미지 첨부 파일로 텍스트 추출 불가 — OCR 파이프라인 필요",
    llmResponse: `{
  "error": "image_only",
  "message": "첨부 파일이 이미지(JPG)로만 구성되어 텍스트 추출 불가",
  "suggestion": "Document Parser OCR 파이프라인으로 전달 필요"
}`,
    failReason: "수기 작성 이미지(스캔) 첨부로 텍스트 추출 불가능합니다. Document Parser OCR 파이프라인으로 전달하거나 Human Review 큐에 등록하세요.",
  },
  {
    id: "e4", from: "Slack #구매알림 (D업체)", company: "D업체",
    subject: "PCB 기판 A타입 150pcs 추가 발주",
    receivedAt: "어제 10:33", channel: "slack", status: "parsed",
    fields: [
      { label: "품목",   value: "PCB 기판 A타입", confidence: 97, mapped: "Product.prod_nm" },
      { label: "수량",   value: "150",            confidence: 98, mapped: "Order.qty" },
      { label: "단위",   value: "PCS",            confidence: 96, mapped: "Order.unit" },
      { label: "납기일", value: "2026-06-30",     confidence: 93, mapped: "Order.due_date" },
      { label: "담당자", value: "김민준",         confidence: 92, mapped: "Customer.contact_nm" },
    ],
    rawText: `[Slack #구매알림]
@영업팀 PCB 기판 A타입 150pcs 추가 발주 부탁드립니다.
납기: 6월 30일까지
담당: 김민준 매니저`,
    prompt: `Slack 메시지에서 발주 정보를 추출하세요.

[채널] #구매알림
[메시지] @영업팀 PCB 기판 A타입 150pcs 추가 발주 부탁드립니다...`,
    llmResponse: `{
  "prod_nm":      { "value": "PCB 기판 A타입", "confidence": 97 },
  "qty":          { "value": "150",            "confidence": 98 },
  "unit":         { "value": "PCS",            "confidence": 96 },
  "due_date":     { "value": "2026-06-30",     "confidence": 93 },
  "contact_nm":   { "value": "김민준",         "confidence": 92 }
}`,
  },
  {
    id: "e5", from: "발주팀 <order@hyundai-mobis.co.kr>", company: "현대모비스",
    subject: "[PO] 고무 오링 Ø45 × 2.5t 1,000ea 긴급발주",
    receivedAt: "09:41", channel: "email", status: "parsed",
    fields: [
      { label: "발주번호", value: "HM-2026-3312",   confidence: 97, mapped: "Order.order_no" },
      { label: "품목",     value: "고무 오링 Ø45",  confidence: 94, mapped: "Material.mat_nm" },
      { label: "수량",     value: "1000",            confidence: 99, mapped: "Order.qty" },
      { label: "단위",     value: "EA",              confidence: 99, mapped: "Order.unit" },
      { label: "납기일",   value: "2026-06-25",     confidence: 96, mapped: "Order.due_date" },
    ],
    rawText: `발신: 발주팀 <order@hyundai-mobis.co.kr>

[PO] 고무 오링 Ø45 × 2.5t 1,000ea 긴급발주

발주번호: HM-2026-3312
품목: 고무 오링 Ø45 × 2.5t
수량: 1,000 EA
납기: 2026-06-25 (긴급)`,
    prompt: "발주 이메일 파싱 프롬프트 v2.1...",
    llmResponse: `{
  "order_no": { "value": "HM-2026-3312", "confidence": 97 },
  "mat_nm":   { "value": "고무 오링 Ø45 × 2.5t", "confidence": 94 },
  "qty":      { "value": "1000", "confidence": 99 },
  "unit":     { "value": "EA",   "confidence": 99 },
  "due_date": { "value": "2026-06-25", "confidence": 96 }
}`,
  },
  {
    id: "e6", from: "카카오채널 (E업체)", company: "E업체",
    subject: "스테인리스 SUS304 파이프 50A × 6m 20본",
    receivedAt: "10:15", channel: "kakao", status: "partial",
    fields: [
      { label: "품목", value: "SUS304 파이프 50A×6m", confidence: 89, mapped: "Material.mat_nm" },
      { label: "수량", value: "20",                   confidence: 92, mapped: "Order.qty" },
      { label: "단위", value: "본",                   confidence: 71, mapped: "Order.unit" },
      { label: "단가", value: "불명확",               confidence: 32, mapped: "Order.unit_price" },
    ],
    rawText: "스테인리스 SUS304 파이프 50A × 6m 짜리 20본 필요합니다. 단가 얼마나 되나요?",
    prompt: "카카오 비정형 메시지 파싱...",
    llmResponse: `{ "mat_nm": {"value":"SUS304 파이프 50A×6m","confidence":89}, "qty":{"value":"20","confidence":92} }`,
  },
];

const WEEK_DAYS = ["06/12","06/13","06/14","06/15","06/16","06/17","06/18"];

const CHANNEL_BADGE: Record<string, string> = {
  email: "bg-blue-100 text-blue-700",
  kakao: "bg-yellow-100 text-yellow-700",
  slack: "bg-purple-100 text-purple-700",
};
const CHANNEL_LABEL: Record<string, string> = {
  email: "이메일", kakao: "카카오톡", slack: "Slack",
};
const STATUS_CFG = {
  parsed:  { label: "파싱 완료", cls: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  partial: { label: "부분 파싱", cls: "text-amber-600 bg-amber-50 border-amber-200",       icon: AlertTriangle },
  failed:  { label: "파싱 실패", cls: "text-rose-600 bg-rose-50 border-rose-200",           icon: XCircle },
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

function WeekChart({ data }: { data: { email: number; kakao: number; slack: number }[] }) {
  const max = Math.max(...data.map(d => d.email + d.kakao + d.slack), 1);
  const H = 60; const BAR_W = 22; const GAP = 14;
  return (
    <svg width={280} height={H + 18} viewBox={`0 0 280 ${H + 18}`} className="w-full">
      {data.map((d, i) => {
        const x = i * (BAR_W + GAP) + 4;
        const eh = (d.email / max) * H;
        const kh = (d.kakao / max) * H;
        const sh = (d.slack / max) * H;
        return (
          <g key={i}>
            <rect x={x} y={H - eh} width={BAR_W} height={eh} fill="#3b82f6" rx={2} opacity={0.85}/>
            <rect x={x} y={H - eh - kh} width={BAR_W} height={kh} fill="#eab308" rx={2} opacity={0.85}/>
            <rect x={x} y={H - eh - kh - sh} width={BAR_W} height={sh} fill="#a855f7" rx={2} opacity={0.85}/>
            <text x={x + BAR_W / 2} y={H + 13} textAnchor="middle" fontSize={8} fill="#94a3b8">{WEEK_DAYS[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

const WEEK_DATA = WEEK_DAYS.map(() => ({
  email: Math.floor(Math.random() * 20 + 5),
  kakao: Math.floor(Math.random() * 10 + 2),
  slack: Math.floor(Math.random() * 8 + 1),
}));

const NEW_MSG_POOL: Omit<EmailItem,"id">[] = [
  {
    from: "구매팀 <buy@lg-display.co.kr>", company: "LG디스플레이",
    subject: "[자동발주] ITO 타겟 소재 2kg",
    receivedAt: "", channel: "email", status: "parsed",
    fields: [
      { label: "품목", value: "ITO 타겟 소재", confidence: 95, mapped: "Material.mat_nm" },
      { label: "수량", value: "2",             confidence: 98, mapped: "Order.qty" },
      { label: "단위", value: "KG",            confidence: 99, mapped: "Order.unit" },
    ],
    rawText: "ITO 타겟 소재 2kg 자동발주 요청드립니다.", prompt: "...", llmResponse: "{}",
  },
  {
    from: "Slack #발주봇", company: "F업체",
    subject: "나사류 M6×20 스텐 500개 발주",
    receivedAt: "", channel: "slack", status: "parsed",
    fields: [
      { label: "품목", value: "나사 M6×20 SUS", confidence: 93, mapped: "Material.mat_nm" },
      { label: "수량", value: "500",             confidence: 98, mapped: "Order.qty" },
    ],
    rawText: "나사류 M6×20 스텐 500개 발주 요청합니다.", prompt: "...", llmResponse: "{}",
  },
  {
    from: "카카오채널 (G업체)", company: "G업체",
    subject: "에어 필터 엘리먼트 교체 10ea 필요",
    receivedAt: "", channel: "kakao", status: "partial",
    fields: [
      { label: "품목", value: "에어 필터 엘리먼트", confidence: 88, mapped: "Material.mat_nm" },
      { label: "수량", value: "10",                confidence: 95, mapped: "Order.qty" },
      { label: "납기일", value: "불명확",          confidence: 28, mapped: "Order.due_date" },
    ],
    rawText: "에어 필터 엘리먼트 교체용 10개 빨리 부탁드립니다.", prompt: "...", llmResponse: "{}",
  },
];

export default function EmailParser() {
  const [emails, setEmails] = useState<EmailItem[]>(BASE_EMAILS);
  const [selected, setSelected] = useState("e1");
  const [channelFilter, setChannelFilter] = useState<"all"|"email"|"kakao"|"slack">("all");
  const [detailTab, setDetailTab] = useState<"result"|"raw"|"llm">("result");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const counterRef = useRef(100);
  const tickRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current++;
      if (tickRef.current % 8 === 0) {
        const tmpl = NEW_MSG_POOL[Math.floor(Math.random() * NEW_MSG_POOL.length)];
        const now = new Date();
        const ts = `${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}`;
        const newItem: EmailItem = { ...tmpl, id: `auto-${counterRef.current++}`, receivedAt: ts };
        setEmails(prev => [newItem, ...prev].slice(0, 20));
      }
    }, 1200);
    return () => clearInterval(id);
  }, []);

  const filtered = emails.filter(e => channelFilter === "all" || e.channel === channelFilter);
  const item = emails.find(e => e.id === selected) ?? emails[0];

  const counts = {
    all: emails.length,
    parsed: emails.filter(e => e.status === "parsed").length,
    partial: emails.filter(e => e.status === "partial").length,
    failed: emails.filter(e => e.status === "failed").length,
  };
  const parseRate = counts.all > 0 ? Math.round((counts.parsed / counts.all) * 100) : 0;

  const lowConfFields = item?.fields.filter(f => f.confidence < 70) ?? [];

  const saveEdit = (label: string) => {
    setEmails(prev => prev.map(e => e.id === item.id
      ? { ...e, fields: e.fields.map(f => f.label === label ? { ...f, value: editVal } : f) }
      : e
    ));
    setEditingField(null);
  };

  const approve = () => {
    setApprovedIds(prev => new Set([...prev, item.id]));
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Email Parser</h1>
          <p className="text-slate-500 mt-1 text-sm">이메일·카카오톡·Slack 발주 메시지에서 구조화 필드를 자동 추출합니다</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
          실시간 수신 중
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "총 수신", value: counts.all, sub: "건", cls: "text-slate-800" },
          { label: "파싱 완료", value: counts.parsed, sub: "건", cls: "text-emerald-600" },
          { label: "부분 파싱", value: counts.partial, sub: "건", cls: "text-amber-600" },
          { label: "파싱 실패", value: counts.failed, sub: "건", cls: "text-rose-600" },
          { label: "완료율", value: parseRate, sub: "%", cls: parseRate >= 80 ? "text-emerald-600" : "text-amber-600" },
        ].map(({ label, value, sub, cls }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="text-xs text-slate-500 mb-1">{label}</div>
            <div className={`text-2xl font-bold ${cls}`}>{value}<span className="text-sm font-normal text-slate-400 ml-1">{sub}</span></div>
          </div>
        ))}
      </div>

      {/* 7일 채널별 차트 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="text-xs font-semibold text-slate-700 mb-3">7일 채널별 수신 현황</div>
        <div className="flex gap-4 text-xs mb-2">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-blue-500"/>이메일</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-yellow-400"/>카카오톡</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-purple-500"/>Slack</span>
        </div>
        <WeekChart data={WEEK_DATA} />
      </div>

      <div className="flex gap-4">
        {/* 수신함 */}
        <div className="w-80 shrink-0 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-slate-400"/>
              <span className="font-semibold text-slate-900 text-sm">수신함</span>
            </div>
          </div>
          {/* 채널 탭 */}
          <div className="flex gap-1 mb-2">
            {(["all","email","kakao","slack"] as const).map(ch => (
              <button key={ch} onClick={() => setChannelFilter(ch)}
                className={`flex-1 text-xs py-1 rounded-lg font-medium transition-colors ${channelFilter === ch ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                {ch === "all" ? "전체" : ch === "email" ? "메일" : ch === "kakao" ? "카카오" : "Slack"}
              </button>
            ))}
          </div>
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {filtered.map(e => {
              const sc = STATUS_CFG[e.status];
              const Icon = sc.icon;
              const isApproved = approvedIds.has(e.id);
              return (
                <div key={e.id} onClick={() => { setSelected(e.id); setDetailTab("result"); }}
                  className={`bg-white rounded-xl border p-3 cursor-pointer transition-all hover:shadow-sm ${selected === e.id ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"}`}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">{e.subject}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">{e.company}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isApproved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/>}
                      <span className={`flex items-center text-xs px-1.5 py-0.5 rounded-full border ${sc.cls}`}>
                        <Icon className="w-3 h-3"/>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CHANNEL_BADGE[e.channel]}`}>{CHANNEL_LABEL[e.channel]}</span>
                    <span className="text-[10px] text-slate-400">{e.receivedAt}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 상세 */}
        {item && (
          <div className="flex-1 min-w-0 space-y-3">
            {/* 헤더 */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm truncate">{item.subject}</h3>
                  <div className="text-xs text-slate-400 mt-0.5">{item.from} · {item.receivedAt}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {approvedIds.has(item.id) && (
                    <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5"/>승인됨
                    </span>
                  )}
                  <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_CFG[item.status].cls}`}>
                    {(() => { const Icon = STATUS_CFG[item.status].icon; return <Icon className="w-3.5 h-3.5"/>; })()}
                    {STATUS_CFG[item.status].label}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${CHANNEL_BADGE[item.channel]}`}>{CHANNEL_LABEL[item.channel]}</span>
                </div>
              </div>
            </div>

            {/* 신뢰도 경고 배너 */}
            {item.status !== "failed" && lowConfFields.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"/>
                <div className="text-xs text-amber-800">
                  <span className="font-semibold">{lowConfFields.length}개 필드</span>의 신뢰도가 낮습니다
                  ({lowConfFields.map(f => f.label).join(", ")}).
                  값을 직접 수정하거나 Human Review를 요청하세요.
                </div>
              </div>
            )}

            {/* 탭 */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex border-b border-slate-200 px-4">
                {([["result","파싱 결과","Tag"],["raw","원문","FileText"],["llm","LLM 프롬프트","Code2"]] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setDetailTab(key)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${detailTab === key ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                    {key === "result" && <Tag className="w-3.5 h-3.5"/>}
                    {key === "raw" && <FileText className="w-3.5 h-3.5"/>}
                    {key === "llm" && <Code2 className="w-3.5 h-3.5"/>}
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {detailTab === "result" && (
                  item.status === "failed" ? (
                    <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-lg p-4">
                      <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5"/>
                      <div>
                        <div className="text-sm font-semibold text-rose-700">파싱 실패</div>
                        <div className="text-xs text-rose-600 mt-1">{item.failReason}</div>
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
                            {["추출 필드","값 (클릭하여 수정)","신뢰도","10M 매핑"].map(h => (
                              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {item.fields.map(f => (
                            <tr key={f.label} className={`hover:bg-slate-50 ${f.confidence < 50 ? "bg-rose-50" : f.confidence < 70 ? "bg-amber-50" : ""}`}>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-1.5">
                                  <Tag className="w-3 h-3 text-slate-400"/>
                                  <span className="text-xs font-semibold text-slate-700">{f.label}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-xs">
                                {editingField === f.label ? (
                                  <input
                                    autoFocus
                                    value={editVal}
                                    onChange={e => setEditVal(e.target.value)}
                                    onBlur={() => saveEdit(f.label)}
                                    onKeyDown={e => { if (e.key === "Enter") saveEdit(f.label); if (e.key === "Escape") setEditingField(null); }}
                                    className="w-full border border-blue-400 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                                  />
                                ) : (
                                  <span
                                    onClick={() => { setEditingField(f.label); setEditVal(f.value); }}
                                    className="cursor-pointer text-slate-800 font-medium hover:text-blue-600 hover:underline"
                                    title="클릭하여 수정"
                                  >{f.value}</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 w-32"><ConfBar v={f.confidence}/></td>
                              <td className="px-4 py-2.5">
                                <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono">{f.mapped}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}

                {detailTab === "raw" && (
                  <pre className="text-xs text-slate-700 bg-slate-50 rounded-lg p-4 whitespace-pre-wrap font-mono leading-relaxed overflow-auto max-h-80">{item.rawText}</pre>
                )}

                {detailTab === "llm" && (
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-700 mb-1.5">프롬프트</div>
                      <pre className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed overflow-auto max-h-40">{item.prompt}</pre>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-700 mb-1.5">LLM 응답 (JSON)</div>
                      <pre className="text-xs text-emerald-700 bg-emerald-50 rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed overflow-auto max-h-48">{item.llmResponse}</pre>
                    </div>
                  </div>
                )}
              </div>

              {item.status !== "failed" && !approvedIds.has(item.id) && (
                <div className="px-4 pb-4 flex gap-2">
                  <button onClick={approve} className="text-xs px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold">
                    승인 및 저장
                  </button>
                  <button className="text-xs px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                    Human Review 요청
                  </button>
                  <button className="text-xs px-4 py-2 bg-white border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 transition-colors">
                    거부
                  </button>
                  <button className="ml-auto flex items-center gap-1 text-xs px-3 py-2 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-colors">
                    <RefreshCw className="w-3 h-3"/>재파싱
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 실시간 수신 피드 */}
      <div className="bg-slate-900 rounded-xl overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2">
          <span className="text-xs text-slate-300 font-medium">실시간 메시지 수신 피드</span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-auto"/>
        </div>
        <div className="grid grid-cols-3 gap-px bg-slate-800 divide-x divide-slate-800">
          {[{label:"총 수신",val:emails.length+"건",cls:"text-white"},{label:"파싱 성공률",val:parseRate+"%",cls:"text-emerald-400"},{label:"저신뢰 필드",val:emails.reduce((s,e)=>s+e.fields.filter(f=>f.confidence<70).length,0)+"건",cls:"text-amber-400"}].map(d=>(
            <div key={d.label} className="bg-slate-900 px-4 py-3 text-center">
              <div className={"text-xl font-bold "+d.cls}>{d.val}</div>
              <div className="text-xs text-slate-500 mt-0.5">{d.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
