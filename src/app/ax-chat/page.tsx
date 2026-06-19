"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageSquareText, Send, Bot, User, Sparkles, Database,
  Share2, CheckCircle2, RefreshCw, ChevronDown, X, Clock,
  Zap, History, ShieldCheck, ShieldAlert, AlertTriangle,
  BookOpen, GitBranch, Activity,
} from "lucide-react";

// ─── 타입 ─────────────────────────────────────────────────────────
interface TraceStage {
  name: string;
  time?: string;
  status: "done" | "running" | "pending" | "blocked";
  detail?: string;
}

interface FollowUp {
  label: string;
  query: string;
}

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  sources?: string[];
  nodes?: string[];
  queryPlan?: string[];
  confidence?: number;
  thinking?: boolean;
  dictUsed?: string[];
  safetyPassed?: boolean;
  rowCited?: boolean;
  trace?: TraceStage[];
  followUps?: FollowUp[];
}

// ─── Dict 정의 ────────────────────────────────────────────────────
const DICTS: Record<string, { name: string; color: string }> = {
  D1: { name:"SN/EQP_ID 구조",   color:"bg-blue-100 text-blue-700" },
  D2: { name:"SPG 제품군 계층",   color:"bg-violet-100 text-violet-700" },
  D3: { name:"ECO revision 규칙", color:"bg-orange-100 text-orange-700" },
  D4: { name:"INV 설비 컬럼 맵",  color:"bg-teal-100 text-teal-700" },
  D5: { name:"LOT FIFO 알고리즘", color:"bg-rose-100 text-rose-700" },
  D6: { name:"발효일 매핑 규칙",  color:"bg-amber-100 text-amber-700" },
};

// ─── 프리셋 ───────────────────────────────────────────────────────
const PRESET_GROUPS = [
  {
    label: "Quality Escape",
    color: "rose",
    questions: [
      "G100 제품군 최근 3개월 시장 클레임 중 제조일 직전 15일 이내 ECO 변경이 있었던 SN을 추적해줘",
      "이번 ECO 영향을 받은 BOM은 어떤 게 있나?",
      "SN 550AB 시리즈의 INV 검사 이력 보여줘",
    ],
  },
  {
    label: "ECO 분석",
    color: "orange",
    questions: [
      "최근 발효된 ECO 중 RPAR=Y인 것 목록",
      "ECO #1이 영향을 준 자재 LOT 역추적해줘",
      "ECO revision 분기별 영향 SN 합산",
    ],
  },
  {
    label: "Supply",
    color: "blue",
    questions: [
      "AL6061 재고가 부족한 공급사는 어디입니까?",
      "납기 지연 위험이 있는 주문 목록을 알려줘",
    ],
  },
];

// ─── 봇 답변 ─────────────────────────────────────────────────────
const BOT_ANSWERS: Record<string, Omit<Message,"id"|"role">> = {
  "G100 제품군 최근 3개월 시장 클레임 중 제조일 직전 15일 이내 ECO 변경이 있었던 SN을 추적해줘": {
    text: "**Quality Escape 추적 결과 — TOP 5 ECO (제조일 직전 15일 영향)**\n\n| ECO_NO | 매칭 SN | RPAR=Y | 영향 자재 | 직전(일) |\n|--------|--------|--------|----------|----------|\n| ECO #1 | 48건 | 14건 | 20H85****** | 6일 |\n| ECO #2 | 37건 | 11건 | 20K42****** | 9일 |\n| ECO #3 | 29건 | 8건 | 20K42****** | 12일 |\n| ECO #4 | 22건 | 5건 | 20H85****** | 4일 |\n| ECO #5 | 18건 | 3건 | 60400004** | 13일 |\n\n→ 검증: 인용 RPAR=Y SN 모두 실제 행에서 가져옴 (verify 통과)\n→ 대상 SN 193건 · 총 응답 26.0초 · 매칭 행 629행",
    sources: ["QMS.claim_dt","PLM.ECO_EFF_DT","tbl_MES_RESULT_INV","MATERIAL_TRAN"],
    nodes: ["ECO#1·rev①","ECO#1·rev②","SN#550AB","QMS#G100"],
    queryPlan: ["classify: quality_escape","dispatch: claim_eco_correlate worker","slot_check: SN prefix=G100, SPG=550 (D1,D2)","item_code_check: 20H85/20K42 등록 확인","orchestrate: SQL×6 (claim→ECO→BOM→INV→MES→FIFO)","worker: 629행 매칭","verify: 실제 행 인용 검증 통과"],
    confidence: 91,
    dictUsed: ["D1","D2","D3","D5","D6"],
    safetyPassed: true,
    rowCited: true,
    trace: [
      { name:"classify",      time:"4.7s", status:"done", detail:"quality_escape 의도 분류" },
      { name:"dispatch",      time:"2.8s", status:"done", detail:"claim_eco_correlate 워커 배정" },
      { name:"slot_check",    time:"0.3s", status:"done", detail:"D1·D2: SN prefix·SPG 검증 통과" },
      { name:"item_code_check",time:"0.2s",status:"done", detail:"20H85·20K42 ITEM_CD 등록 확인" },
      { name:"orchestrate",   time:"3.5s", status:"done", detail:"SQL×6 실행" },
      { name:"worker",        time:"0ms",  status:"done", detail:"629행 매칭" },
      { name:"summarize",     time:"0ms",  status:"done", detail:"TOP5 집계" },
      { name:"interpret",     time:"—",    status:"done", detail:"—" },
      { name:"verify",        time:"7.7s", status:"done", detail:"실제 행 인용 검증 통과 ✓" },
    ],
    followUps: [
      { label:"이 SN의 INV 검사 이력", query:"SN 550AB 시리즈의 INV 검사 이력 보여줘" },
      { label:"같은 ECO 영향 SN 군집", query:"ECO revision 분기별 영향 SN 합산" },
      { label:"이 SN이 쓴 자재 LOT 역추적", query:"ECO #1이 영향을 준 자재 LOT 역추적해줘" },
    ],
  },
  "SN 550AB 시리즈의 INV 검사 이력 보여줘": {
    text: "**INV 검사 이력 — SN 550AB****** (D08·D10 일관 표)**\n\n| 검사일시 | 설비 | 결과 컬럼 | 판정 | 검사 항목 | 비고 |\n|----------|------|----------|------|----------|------|\n| 2026-04-12 09:14 | INVD08 | INRS_3 | NG | 출력단 안정성 | 오류 발생, 재투입 |\n| 2026-04-12 10:02 | INVD08 | INRS_3 | NG | 출력단 안정성 | 재검사 Fail |\n| 2026-04-12 14:38 | INVD10 | INRS_7 | NG | 보호회로 동작 | D10 단독 NG |\n| 2026-04-12 15:21 | INVD10 | INRS_7 | OK | — | 재검사 → 출하 → 시장 클레임 |\n\n→ **dict #4 적용**: INV 설비별 결과 컬럼 매핑 (INVD08→INRS_3, INVD10→INRS_7)\n→ 이 dict 없이 조회 시 D10 결과 누락 발생",
    sources: ["tbl_MES_RESULT_INV","D4:INVD08→INRS_3","D4:INVD10→INRS_7"],
    nodes: ["SN#550AB","INVD08","INVD10","INRS_3","INRS_7"],
    queryPlan: ["slot_check: SN=550AB 등록 확인 (D1)","SELECT INVD08.INRS_3 WHERE SN='550AB'","SELECT INVD10.INRS_7 WHERE SN='550AB'","UNION → 시간순 정렬","verify: 실제 행 4건 인용"],
    confidence: 94,
    dictUsed: ["D1","D4"],
    safetyPassed: true,
    rowCited: true,
    trace: [
      { name:"classify",       time:"2.1s", status:"done", detail:"inv_inspection_query" },
      { name:"dispatch",       time:"1.4s", status:"done", detail:"inv_history_worker 배정" },
      { name:"slot_check",     time:"0.2s", status:"done", detail:"D1: SN=550AB 유효 확인" },
      { name:"item_code_check",time:"0.1s", status:"done", detail:"D4: INVD08·INVD10 컬럼 로드" },
      { name:"orchestrate",    time:"1.8s", status:"done", detail:"SQL×2 (D08·D10 별도)" },
      { name:"worker",         time:"0ms",  status:"done", detail:"4행 반환" },
      { name:"summarize",      time:"0ms",  status:"done", detail:"시간순 정렬" },
      { name:"interpret",      time:"—",    status:"done", detail:"—" },
      { name:"verify",         time:"4.2s", status:"done", detail:"4건 인용 검증 통과 ✓" },
    ],
    followUps: [
      { label:"같은 ECO 영향 SN 군집", query:"ECO revision 분기별 영향 SN 합산" },
      { label:"자재 LOT 역추적",       query:"ECO #1이 영향을 준 자재 LOT 역추적해줘" },
    ],
  },
  "ECO #1이 영향을 준 자재 LOT 역추적해줘": {
    text: "**자재 LOT 역추적 결과 — 8단계 FIFO 알고리즘 적용**\n\n• MATERIAL_TRAN에 LOT_ID 컬럼 없음 → dict #5 (8단계 FIFO) 자동 적용\n\n| LOT 키 | confidence | 매칭 ECO |\n|--------|-----------|----------|\n| 20H85**** | 0.91 | ECO #1·rev① |\n| 20K42**** | 0.83 | ECO #1·rev② |\n| 20K42**** | 0.71 | ECO #1·rev③ |\n\n→ **단일 시드 결과**: RPAR=Y SN 41/193 (21.5%) · TOP3 ECO: ECO #1·#2·#3\n→ LLM 단독 추론 시도 시 = 환각의 입구. dict #5 알고리즘으로 안전 처리됨",
    sources: ["MATERIAL_TRAN","D5:8단계FIFO","D3:ECO_revision","D6:발효일기준"],
    nodes: ["LOT#20H85","LOT#20K42","ECO#1·rev①","ECO#1·rev②"],
    queryPlan: ["slot_check: ITEM_CD 유효 확인 (D1)","D5 Step1: SN→WO 매핑","D5 Step2: 자재 Issue 시점 조회","D5 Step3~5: Job결합·LOT후보·FIFO정렬","D5 Step6~8: LOT매핑·ECO매칭·confidence 산출","verify: LOT키 3건 실제 행 인용 ✓"],
    confidence: 88,
    dictUsed: ["D1","D3","D5","D6"],
    safetyPassed: true,
    rowCited: true,
    trace: [
      { name:"classify",       time:"3.2s", status:"done", detail:"lot_traceback_query" },
      { name:"dispatch",       time:"2.1s", status:"done", detail:"lot_fifo_worker 배정" },
      { name:"slot_check",     time:"0.4s", status:"done", detail:"D1: SN prefix 검증" },
      { name:"item_code_check",time:"0.3s", status:"done", detail:"D5 알고리즘 dict 로드" },
      { name:"orchestrate",    time:"5.1s", status:"done", detail:"SQL×8 (FIFO 8단계)" },
      { name:"worker",         time:"0ms",  status:"done", detail:"LOT 후보 193건 처리" },
      { name:"summarize",      time:"0ms",  status:"done", detail:"TOP3 confidence 산출" },
      { name:"interpret",      time:"—",    status:"done", detail:"—" },
      { name:"verify",         time:"6.8s", status:"done", detail:"3건 인용 검증 통과 ✓" },
    ],
    followUps: [
      { label:"발효일 기준 재조정",    query:"ECO revision 분기별 영향 SN 합산" },
      { label:"클레임 원인 추적 완성", query:"G100 제품군 최근 3개월 시장 클레임 중 제조일 직전 15일 이내 ECO 변경이 있었던 SN을 추적해줘" },
    ],
  },
  "ECO revision 분기별 영향 SN 합산": {
    text: "**ECO revision 인스턴스 분기 분석 — dict #3 적용**\n\nPLM은 한 번의 변경을 N개 revision 인스턴스로 분기함.\n\n• ECO_NO 끝 3자리 = revision 식별자 (이 규칙이 dict #3에 없으면 같은 ECO를 N건으로 셈)\n\n| ECO_NO | 발효일 | rev | 영향 ItemCode | 영향 SN |\n|--------|--------|-----|--------------|--------|\n| ****** | 2026-03-22 | ① | 60400004** | 48건 |\n| ****** | 2026-03-29 | ② | 60400004** | 37건 |\n| ****** | 2026-04-05 | ③ | 60400004** | 22건 |\n| **합집합** | — | — | 동일 자재 | **92건** |\n\n→ dict #3 없이 조회 시: 각 rev를 별개 ECO로 계산 → 영향 SN 1/3 토막 (약 30건으로 과소 추정)",
    sources: ["PLM.ECO_NO","D3:ECO_rev_suffix_len=3","D6:PLM_ECO_EFF_DATE"],
    nodes: ["ECO#rev①","ECO#rev②","ECO#rev③","ITEM#60400004"],
    queryPlan: ["slot_check: ECO_NO 형식 검증","D3: ECO_NO[-3:] → revision 식별","GROUP BY ECO_NO[:-3]","UNION_ALL revisions → 중복 SN deduplicate","verify: 합집합 92건 실제 행 인용 ✓"],
    confidence: 96,
    dictUsed: ["D3","D6"],
    safetyPassed: true,
    rowCited: true,
    trace: [
      { name:"classify",       time:"1.8s", status:"done", detail:"eco_revision_analysis" },
      { name:"dispatch",       time:"1.2s", status:"done", detail:"eco_revision_worker" },
      { name:"slot_check",     time:"0.2s", status:"done", detail:"D3: ECO_NO 형식 검증" },
      { name:"item_code_check",time:"0.1s", status:"done", detail:"60400004** 등록 확인" },
      { name:"orchestrate",    time:"2.3s", status:"done", detail:"SQL×3 (rev별)" },
      { name:"worker",         time:"0ms",  status:"done", detail:"합집합 92건" },
      { name:"summarize",      time:"0ms",  status:"done", detail:"—" },
      { name:"interpret",      time:"—",    status:"done", detail:"—" },
      { name:"verify",         time:"3.1s", status:"done", detail:"실제 행 인용 ✓" },
    ],
    followUps: [
      { label:"자재 LOT 역추적", query:"ECO #1이 영향을 준 자재 LOT 역추적해줘" },
    ],
  },
  "AL6061 재고가 부족한 공급사는 어디입니까?": {
    text: "**Material 도메인 조회 결과:**\n\n현재 AL6061-T6 기준으로 재고 부족 위험 공급사는 **2곳**입니다.\n\n• **㈜대성금속** — 현재 재고 120kg, 안전재고(300kg) 대비 **60% 부족**. 리드타임 3주 고려 시 즉시 발주 필요.\n• **한국알루미늄** — 현재 재고 280kg, 안전재고 300kg 대비 **소폭 부족**.\n\n→ Supply Chain Twin에서 충격 시나리오를 확인하거나, 발주 요청을 생성하시겠습니까?",
    sources: ["Material.mat_cd = AL6061","Supplier.stock_qty"],
    nodes: ["Material#AL6061","Supplier#대성금속","Supplier#한국알루미늄"],
    queryPlan: ["slot_check: mat_cd=AL6061 검증","MATCH (m:Material {mat_cd:'AL6061'})","→ Supplier.stock_qty < safety_stock","verify: 실제 행 인용 ✓"],
    confidence: 91,
    dictUsed: ["D2"],
    safetyPassed: true,
    rowCited: true,
    trace: [
      { name:"classify",       time:"2.3s", status:"done", detail:"stock_shortage_query" },
      { name:"dispatch",       time:"1.5s", status:"done", detail:"material_stock_worker" },
      { name:"slot_check",     time:"0.3s", status:"done", detail:"D2: 제품군 SPG 검증" },
      { name:"item_code_check",time:"0.1s", status:"done", detail:"AL6061 등록 확인" },
      { name:"orchestrate",    time:"2.0s", status:"done", detail:"SQL×2" },
      { name:"worker",         time:"0ms",  status:"done", detail:"2건 반환" },
      { name:"summarize",      time:"0ms",  status:"done", detail:"—" },
      { name:"interpret",      time:"—",    status:"done", detail:"—" },
      { name:"verify",         time:"3.5s", status:"done", detail:"실제 행 인용 ✓" },
    ],
    followUps: [
      { label:"납기 지연 위험 주문 확인", query:"납기 지연 위험이 있는 주문 목록을 알려줘" },
    ],
  },
};

const FALLBACK_BLOCKED = (text: string): Omit<Message,"id"|"role"> => ({
  text: `**⚠ 안전막 ① 차단 — slot_check 미통과**\n\n질의 내 SN 또는 ITEM_CD가 dict에 등록되지 않아 워커 호출을 차단했습니다.\n\n• 원인: "${text.slice(0,20)}..." 에서 인식된 코드가 D1(SN 구조) 또는 D2(제품군 코드)에 없음\n• 조치: Ontology Mapping 페이지에서 해당 코드를 dict에 등록하거나, 등록된 코드로 다시 질문해 주세요.\n\n→ 미등록 코드로 답변을 생성하면 **환각·추측·누락** 위험이 있습니다.`,
  sources: [],
  nodes: [],
  queryPlan: ["slot_check: FAILED — 미등록 SN/ITEM_CD 탐지","워커 호출 차단 (안전막 ① 동작)"],
  confidence: 0,
  dictUsed: [],
  safetyPassed: false,
  rowCited: false,
  trace: [
    { name:"classify",        time:"2.1s", status:"done",    detail:"의도 분류 완료" },
    { name:"dispatch",        time:"1.3s", status:"done",    detail:"워커 배정 시도" },
    { name:"slot_check",      time:"0.4s", status:"blocked", detail:"미등록 코드 → 차단" },
    { name:"item_code_check", status:"pending" },
    { name:"orchestrate",     status:"pending" },
    { name:"worker",          status:"pending" },
    { name:"summarize",       status:"pending" },
    { name:"interpret",       status:"pending" },
    { name:"verify",          status:"pending" },
  ],
  followUps: [
    { label:"Dict 등록 페이지로", query:"" },
  ],
});

// ─── 유틸 ─────────────────────────────────────────────────────────
const FEED_POOL = [
  "GraphRAG 인덱싱 — ECO 노드 12개 갱신",
  "slot_check — SN prefix G100 검증 통과",
  "D5 FIFO 알고리즘 — LOT 후보 산출 완료",
  "verify — RPAR=Y SN 14건 실제 행 인용 확인",
  "D3 dict — revision 인스턴스 식별자 업데이트",
  "임베딩 업데이트 — Measurement 최신 레코드 반영",
];

function TypingDots() {
  return (
    <div className="flex gap-1 items-center py-1">
      {[0,1,2].map(i => (
        <div key={i} className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{animationDelay:i*0.15+"s"}}/>
      ))}
    </div>
  );
}

function ConfBar({ value }: { value: number }) {
  const cls = value>=80?"bg-emerald-500":value>=60?"bg-amber-400":"bg-rose-400";
  const textCls = value>=80?"text-emerald-600":value>=60?"text-amber-600":"text-rose-600";
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`absolute inset-y-0 left-0 rounded-full ${cls}`} style={{width:value+"%"}}/>
      </div>
      <span className={`text-xs font-semibold ${textCls}`}>신뢰도 {value}%</span>
    </div>
  );
}

function TraceBar({ trace }: { trace: TraceStage[] }) {
  return (
    <div className="bg-slate-900 rounded-xl p-3 mt-2">
      <div className="text-[11px] font-semibold text-slate-400 mb-2">9-stage 추적 트레이스</div>
      <div className="flex gap-1 items-center overflow-x-auto pb-1">
        {trace.map((s, i) => {
          const color = s.status==="done"?"bg-emerald-500":s.status==="blocked"?"bg-red-500":s.status==="running"?"bg-amber-400":"bg-slate-700";
          const textColor = s.status==="pending"?"text-slate-600":"text-slate-200";
          return (
            <div key={s.name} className="flex items-center gap-1">
              <div className={`flex flex-col items-center gap-0.5 min-w-[52px]`}>
                <div className={`w-3 h-3 rounded-full ${color} shrink-0`}/>
                <span className={`text-[9px] font-mono whitespace-nowrap ${textColor}`}>{s.name}</span>
                {s.time && <span className="text-[9px] text-slate-500">{s.time}</span>}
              </div>
              {i < trace.length-1 && (
                <div className={`w-4 h-px mb-3 ${s.status==="done"?"bg-emerald-800":"bg-slate-700"}`}/>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("**") && line.endsWith("**") && !line.slice(2,-2).includes("**"))
          return <p key={i} className="font-semibold text-slate-800">{line.slice(2,-2)}</p>;
        if (line.startsWith("| ")) {
          const cells = line.split("|").filter(c => c.trim());
          return (
            <div key={i} className="flex gap-2 font-mono text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
              {cells.map((c,j) => <span key={j} className="flex-1">{c.trim()}</span>)}
            </div>
          );
        }
        if (line.startsWith("• ") || line.startsWith("- ")) {
          return (
            <p key={i} className="flex items-start gap-2 text-slate-700">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"/>
              <span dangerouslySetInnerHTML={{__html:line.slice(2).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")}}/>
            </p>
          );
        }
        if (line.startsWith("→ "))
          return (
            <p key={i} className="text-blue-600 font-medium flex items-center gap-1">
              <span>→</span>
              <span dangerouslySetInnerHTML={{__html:line.slice(2).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")}}/>
            </p>
          );
        if (line.startsWith("• **⚠"))
          return <p key={i} className="text-amber-700 font-medium" dangerouslySetInnerHTML={{__html:line.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")}}/>;
        if (line.trim()==="" || line.startsWith("|---")) return null;
        return <p key={i} className="text-slate-700" dangerouslySetInnerHTML={{__html:line.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")}}/>;
      })}
    </div>
  );
}

function DetailPanel({ msg, onClose }: { msg: Message; onClose: () => void }) {
  const [tab, setTab] = useState<"sources"|"nodes"|"plan">("sources");
  return (
    <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <span className="font-semibold text-slate-800 text-sm">응답 상세</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400"><X className="w-4 h-4"/></button>
      </div>
      {msg.confidence!==undefined && (
        <div className="px-4 py-2 border-b border-slate-100">
          <ConfBar value={msg.confidence}/>
        </div>
      )}
      <div className="flex border-b border-slate-100">
        {(["sources","nodes","plan"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${tab===t?"border-emerald-600 text-emerald-700":"border-transparent text-slate-500"}`}>
            {t==="sources"?`소스 (${msg.sources?.length??0})`:t==="nodes"?`노드 (${msg.nodes?.length??0})`:"쿼리 계획"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {tab==="sources" && (msg.sources??[]).map((s,i) => (
          <div key={i} className="flex items-center gap-2 bg-emerald-50 rounded-lg px-3 py-2">
            <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0"/>
            <span className="text-xs font-mono text-emerald-800">{s}</span>
          </div>
        ))}
        {tab==="nodes" && (msg.nodes??[]).map((n,i) => (
          <div key={i} className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
            <Share2 className="w-3.5 h-3.5 text-blue-500 shrink-0"/>
            <span className="text-xs font-mono text-blue-800">{n}</span>
          </div>
        ))}
        {tab==="plan" && (
          <div className="bg-slate-900 rounded-xl p-3 space-y-1">
            {(msg.queryPlan??["쿼리 계획 없음"]).map((line,i) => (
              <div key={i} className="text-xs font-mono text-emerald-400">{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────────
export default function AXChatPage() {
  const [messages, setMessages] = useState<Message[]>([{
    id:0, role:"assistant",
    text:"안녕하세요. 저는 **온톨로지 챗봇**입니다.\n\n기존 챗봇과의 차이: 도메인 지식이 LLM 추측이 아닌 **dict로 명시**됩니다.\n\n→ 안전막 ①: dict로 SN·ITEM_CD 사전 검증 (미등록 시 워커 차단)\n→ 안전막 ②: 실제 행 인용 못 하면 응답 안 냄\n\nQuality Escape 추적, ECO 분석, 자재 LOT 역추적 등을 질문해 보세요.",
    sources:[], nodes:[], queryPlan:[], confidence:100,
    dictUsed:["D1","D2","D3","D4","D5","D6"], safetyPassed:true, rowCited:true,
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [panelMsg, setPanelMsg] = useState<Message|null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string|null>(null);
  const [feed, setFeed] = useState<{msg:string;ts:string}[]>([]);
  const [totalQueries, setTotalQueries] = useState(147);
  const [indexPct, setIndexPct] = useState(31);
  const bottomRef = useRef<HTMLDivElement>(null);
  const tickRef = useRef(0);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current++;
      setIndexPct(p => Math.min(100, p + Math.random()*0.3));
      if (tickRef.current % 4 === 0) {
        const msg = FEED_POOL[Math.floor(Math.random()*FEED_POOL.length)];
        const ts = new Date().toLocaleTimeString("ko-KR",{hour12:false});
        setFeed(prev => [{msg,ts},...prev].slice(0,6));
      }
    }, 1200);
    return () => clearInterval(id);
  }, []);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now(), role:"user", text };
    setMessages(prev => [...prev, userMsg, { id: Date.now()+1, role:"assistant", text:"", thinking:true }]);
    setInput("");
    setLoading(true);
    await new Promise(r => setTimeout(r, 1800));
    const answer = BOT_ANSWERS[text] ?? FALLBACK_BLOCKED(text);
    setMessages(prev => [...prev.slice(0,-1), { id: Date.now()+2, role:"assistant", ...answer }]);
    setTotalQueries(p => p+1);
    setLoading(false);
  }

  const userMessages = messages.filter(m => m.role==="user");

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] p-6 gap-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-emerald-600"/> AX Chat
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">온톨로지 챗봇 · dict 안전막 · 실제 행 인용 강제</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 text-xs">
            {(["D1","D2","D3","D4","D5","D6"] as const).map(k => {
              const d = DICTS[k];
              return (
                <span key={k} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${d.color}`}>{k}</span>
              );
            })}
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-lg flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5"/> 안전막 활성
          </span>
          <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-slate-400">질의</span> <span className="font-bold text-blue-600">{totalQueries}</span>
          </div>
          <button onClick={() => setShowHistory(p=>!p)}
            className={`p-2 rounded-lg border transition-colors ${showHistory?"bg-blue-50 border-blue-300 text-blue-600":"bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
            <History className="w-4 h-4"/>
          </button>
        </div>
      </div>

      {/* 프리셋 */}
      <div className="shrink-0 space-y-2">
        <div className="flex gap-2">
          {PRESET_GROUPS.map(g => (
            <button key={g.label} onClick={() => setActiveGroup(activeGroup===g.label?null:g.label)}
              className={`text-xs px-3 py-1 rounded-full font-medium border transition-colors ${
                activeGroup===g.label
                  ? g.color==="rose"?"bg-rose-600 text-white border-rose-600"
                    : g.color==="orange"?"bg-orange-600 text-white border-orange-600"
                    : "bg-blue-600 text-white border-blue-600"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}>
              {g.label}
            </button>
          ))}
        </div>
        {activeGroup && (
          <div className="flex gap-2 flex-wrap">
            {PRESET_GROUPS.find(g=>g.label===activeGroup)?.questions.map(q => (
              <button key={q} onClick={() => send(q)} disabled={loading}
                className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-all disabled:opacity-40">
                {q.length > 40 ? q.slice(0,40)+"..." : q}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 gap-3 min-h-0">
        {/* 히스토리 */}
        {showHistory && (
          <div className="w-52 shrink-0 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5"/> 대화 이력
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {userMessages.length===0 && <div className="px-3 py-3 text-xs text-slate-400">질문이 없습니다</div>}
              {userMessages.map((m,i) => (
                <button key={m.id} onClick={() => send(m.text)}
                  className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors">
                  <div className="text-[10px] text-slate-400 mb-0.5">Q{i+1}</div>
                  <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{m.text}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 채팅 창 */}
        <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role==="user"?"flex-row-reverse":""}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role==="assistant"?"bg-emerald-100":"bg-blue-100"}`}>
                {msg.role==="assistant" ? <Bot className="w-4 h-4 text-emerald-600"/> : <User className="w-4 h-4 text-blue-600"/>}
              </div>
              <div className={`max-w-2xl flex flex-col gap-1.5 ${msg.role==="user"?"items-end":"items-start"}`}>
                {/* 버블 */}
                <div className={`rounded-2xl px-4 py-3 ${msg.role==="user"?"bg-blue-600 text-white text-sm":"bg-slate-50 border border-slate-100"} ${!msg.safetyPassed&&msg.safetyPassed!==undefined?"border-red-200 bg-red-50":""}`}>
                  {msg.thinking ? <TypingDots/> : msg.role==="user" ? <p className="text-sm">{msg.text}</p> : <MarkdownText text={msg.text}/>}
                </div>

                {/* 안전막 표시 */}
                {msg.role==="assistant" && !msg.thinking && msg.safetyPassed !== undefined && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {msg.safetyPassed ? (
                      <span className="text-[11px] flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <ShieldCheck className="w-3 h-3"/> 안전막 통과
                      </span>
                    ) : (
                      <span className="text-[11px] flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                        <ShieldAlert className="w-3 h-3"/> 안전막 차단
                      </span>
                    )}
                    {msg.rowCited && (
                      <span className="text-[11px] flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        <CheckCircle2 className="w-3 h-3"/> 실제 행 인용
                      </span>
                    )}
                    {(msg.dictUsed??[]).map(d => (
                      <span key={d} className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${DICTS[d]?.color||"bg-slate-100 text-slate-600"}`}>{d}</span>
                    ))}
                    {msg.confidence !== undefined && <ConfBar value={msg.confidence}/>}
                    {msg.sources && msg.sources.length > 0 && (
                      <button onClick={() => setPanelMsg(panelMsg?.id===msg.id?null:msg)}
                        className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                        <Database className="w-3 h-3"/> 소스 {msg.sources.length}건
                        <ChevronDown className={`w-3 h-3 transition-transform ${panelMsg?.id===msg.id?"rotate-180":""}`}/>
                      </button>
                    )}
                  </div>
                )}

                {/* 9-stage 트레이스 */}
                {msg.role==="assistant" && !msg.thinking && msg.trace && (
                  <TraceBar trace={msg.trace}/>
                )}

                {/* 후속 질문 칩 */}
                {msg.role==="assistant" && !msg.thinking && msg.followUps && msg.followUps.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-1">
                    {msg.followUps.filter(f => f.query).map((f, i) => (
                      <button key={i} onClick={() => send(f.query)} disabled={loading}
                        className="text-xs bg-white border border-blue-200 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-50 transition-colors disabled:opacity-40">
                        ↗ {f.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef}/>
        </div>
      </div>

      {/* 입력 */}
      <div className="shrink-0 flex gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm focus-within:border-emerald-400 transition-colors">
          <Sparkles className="w-4 h-4 text-slate-300 shrink-0"/>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key==="Enter" && !e.shiftKey && send(input)}
            placeholder="ECO 영향 분석, 클레임 추적, 자재 LOT 역추적... (Enter)"
            className="flex-1 text-sm outline-none text-slate-700 placeholder:text-slate-300"
            disabled={loading}/>
          {loading && <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin shrink-0"/>}
        </div>
        <button onClick={() => send(input)} disabled={!input.trim()||loading}
          className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-colors disabled:opacity-40 shadow">
          <Send className="w-4 h-4"/>
        </button>
      </div>

      {/* 상태 바 */}
      <div className="shrink-0 flex items-center justify-between text-xs text-slate-400 gap-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400"/>
            dict 6종 활성 · 안전막 ①② 동작 중
          </span>
          <span className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-blue-400"/>
            인덱싱 {indexPct.toFixed(0)}%
            <div className="w-14 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 rounded-full transition-all" style={{width:indexPct.toFixed(0)+"%"}}/>
            </div>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 truncate">
          <Zap className="w-3 h-3 text-amber-400 shrink-0"/>
          {feed[0]?.msg ?? "인덱싱 대기 중..."}
        </div>
      </div>

      {panelMsg && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setPanelMsg(null)}/>
          <DetailPanel msg={panelMsg} onClose={() => setPanelMsg(null)}/>
        </>
      )}
    </div>
  );
}
