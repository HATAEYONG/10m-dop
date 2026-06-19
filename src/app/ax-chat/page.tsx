"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageSquareText, Send, Bot, User, Sparkles, Database,
  Share2, AlertCircle, CheckCircle2, RefreshCw, ChevronDown,
  X, Clock, Zap, History,
} from "lucide-react";

interface Message {
  id: number;
  role: "user"|"assistant";
  text: string;
  sources?: string[];
  nodes?: string[];
  queryPlan?: string[];
  confidence?: number;
  thinking?: boolean;
}

const PRESET_GROUPS = [
  {
    label: "Supply", color: "blue",
    questions: [
      "AL6061 재고가 부족한 공급사는 어디입니까?",
      "납기 지연 위험이 있는 주문 목록을 알려줘",
      "이번 달 발주량 상위 5개 품목은?",
    ],
  },
  {
    label: "Quality", color: "rose",
    questions: [
      "이번 달 불량률이 가장 높은 공정은?",
      "Machine 도메인에서 최근 이상 감지된 설비는?",
    ],
  },
  {
    label: "Order", color: "emerald",
    questions: [
      "고객별 월별 발주 추이를 요약해줘",
      "ORD-2026-04 시리즈 주문 상태를 알려줘",
      "잔여 생산 용량 대비 수주 잔량은?",
    ],
  },
];

const BOT_ANSWERS: Record<string, Omit<Message,"id"|"role">> = {
  "AL6061 재고가 부족한 공급사는 어디입니까?": {
    text: "**Material 도메인 조회 결과:**\n\n현재 AL6061-T6 기준으로 재고 부족 위험 공급사는 **2곳**입니다.\n\n• **㈜대성금속** — 현재 재고 120kg, 안전재고(300kg) 대비 **60% 부족**. 리드타임 3주 고려 시 즉시 발주 필요.\n• **한국알루미늄** — 현재 재고 280kg, 안전재고 300kg 대비 **소폭 부족**. 1주 내 발주 권고.\n\n→ Supply Chain Twin에서 충격 시나리오를 확인하거나, 발주 요청을 생성하시겠습니까?",
    sources: ["Material.mat_cd = AL6061","Supplier.stock_qty","Order.lead_time"],
    nodes: ["Material#AL6061","Supplier#대성금속","Supplier#한국알루미늄"],
    queryPlan: ["MATCH (m:Material {mat_cd:'AL6061'})","→ Supplier.stock_qty JOIN lead_time","→ FILTER stock_qty < safety_stock","→ ORDER BY shortage_ratio DESC"],
    confidence: 91,
  },
  "이번 달 불량률이 가장 높은 공정은?": {
    text: "**Measurement + Process 도메인 교차 조회 결과:**\n\n2026년 6월 기준 공정별 불량률:\n\n| 공정 | 불량률 | 전월 대비 |\n|------|--------|----------|\n| **CNC 정밀 가공** | **4.2%** | ↑ +1.1% |\n| 표면 처리 | 2.8% | → 동일 |\n| 조립 | 1.4% | ↓ -0.3% |\n\nCNC 정밀 가공 공정의 불량률이 가장 높으며 전월 대비 악화되었습니다. Machine 도메인 조회 결과 **spindle_rpm 편차** 증가가 원인으로 추정됩니다.",
    sources: ["Measurement.defect_rate","Process.proc_nm","Machine.spindle_rpm"],
    nodes: ["Process#CNC가공","Measurement#2026-06","Machine#CNC-S7-1500"],
    queryPlan: ["MATCH (p:Process)-[:HAS_MEASUREMENT]->(m:Measurement)","→ WHERE m.meas_dt >= '2026-06-01'","→ GROUP BY p.proc_nm","→ ORDER BY defect_rate DESC LIMIT 5"],
    confidence: 87,
  },
  "납기 지연 위험이 있는 주문 목록을 알려줘": {
    text: "**Order + Supplier + Machine 도메인 통합 조회 결과:**\n\n납기 지연 위험 주문 **3건** 탐지:\n\n1. **ORD-2026-0412** (삼성전자향) — D-3일, AL6061 재고 부족으로 생산 대기 중\n2. **ORD-2026-0398** (현대자동차향) — D-7일, CNC 설비 가동률 저하로 일정 지연 예상\n3. **ORD-2026-0445** (LG전자향) — D-12일, 표면처리 외주 업체 납기 지연 신호\n\n→ APS Planner에서 일정 재조정을 시작하시겠습니까?",
    sources: ["Order.due_date","Supplier.lead_time","Machine.utilization_rate"],
    nodes: ["Order#0412","Customer#삼성전자","Supplier#AL재고"],
    queryPlan: ["MATCH (o:Order)-[:REQUIRES]->(m:Material)","→ JOIN Machine.utilization WHERE o.due_date <= NOW()+14d","→ FILTER risk_score > 0.6","→ RETURN o.ord_no, risk_score"],
    confidence: 83,
  },
};

const FALLBACK = (text: string): Omit<Message,"id"|"role"> => ({
  text: "**10M 지식 그래프 조회 완료**\n\n질의하신 내용에 대해 현재 적재된 데이터를 검색했습니다.\n\n관련 도메인에서 데이터를 찾았으나, 정확한 답변을 위해 추가 데이터 표준화가 필요합니다. Data Ingestion Hub에서 관련 데이터를 먼저 적재해 주세요.\n\n→ /ingest 에서 관련 데이터를 업로드하면 더 정확한 답변이 가능합니다.",
  sources: ["10M Knowledge Graph"],
  nodes: [],
  queryPlan: ["MATCH (n) WHERE n.text CONTAINS '"+text.slice(0,10)+"'","→ RETURN n LIMIT 20"],
  confidence: 42,
});

const FEED_POOL = [
  "GraphRAG 인덱싱 — Process 도메인 노드 38개 추가",
  "GraphRAG 인덱싱 — 엣지 120개 재계산 완료",
  "임베딩 업데이트 — Measurement 최신 레코드 반영",
  "온톨로지 버전 v2.3 → v2.4 마이그레이션 완료",
  "GraphRAG 인덱싱 — Supplier 관계망 최적화",
  "쿼리 캐시 갱신 — AL6061 관련 서브그래프",
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
      <div className="relative w-24 h-1.5 bg-slate-100 rounded-full overflow-visible">
        <div className={"absolute inset-y-0 left-0 rounded-full "+cls} style={{width:value+"%"}}/>
        <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400 opacity-40" style={{left:"80%"}}/>
      </div>
      <span className={"text-xs font-semibold "+textCls}>신뢰도 {value}%</span>
    </div>
  );
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line,i) => {
        if(line.startsWith("**")&&line.endsWith("**")&&!line.slice(2,-2).includes("**"))
          return <p key={i} className="font-semibold text-slate-800">{line.slice(2,-2)}</p>;
        if(line.startsWith("| ")) {
          const cells=line.split("|").filter(c=>c.trim());
          return (
            <div key={i} className="flex gap-4 font-mono text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
              {cells.map((c,j)=><span key={j} className="flex-1">{c.trim()}</span>)}
            </div>
          );
        }
        if(line.startsWith("• ")||line.startsWith("- ")) {
          const content=line.slice(2);
          return (
            <p key={i} className="flex items-start gap-2 text-slate-700">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"/>
              <span dangerouslySetInnerHTML={{__html:content.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")}}/>
            </p>
          );
        }
        if(line.startsWith("→ "))
          return (
            <p key={i} className="text-blue-600 font-medium flex items-center gap-1">
              <span>→</span>
              <span dangerouslySetInnerHTML={{__html:line.slice(2).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")}}/>
            </p>
          );
        if(line.trim()===""||line.startsWith("|---")) return null;
        return <p key={i} className="text-slate-700" dangerouslySetInnerHTML={{__html:line.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")}}/>;
      })}
    </div>
  );
}

function SourcePanel({ msg, onClose }: { msg: Message; onClose: ()=>void }) {
  const [tab, setTab] = useState<"sources"|"nodes"|"plan">("sources");
  return (
    <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <span className="font-semibold text-slate-800 text-sm">응답 상세</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400"><X className="w-4 h-4"/></button>
      </div>
      {msg.confidence!==undefined&&(
        <div className="px-4 py-2 border-b border-slate-100">
          <ConfBar value={msg.confidence}/>
        </div>
      )}
      <div className="flex border-b border-slate-100">
        {(["sources","nodes","plan"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={"flex-1 py-2 text-xs font-medium border-b-2 -mb-px transition-colors "+(tab===t?"border-emerald-600 text-emerald-700":"border-transparent text-slate-500 hover:text-slate-700")}>
            {t==="sources"?"소스 ("+(msg.sources?.length??0)+")":t==="nodes"?"노드 ("+(msg.nodes?.length??0)+")":"쿼리 계획"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {tab==="sources"&&(msg.sources??[]).map((s,i)=>(
          <div key={i} className="flex items-center gap-2 bg-emerald-50 rounded-lg px-3 py-2">
            <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0"/>
            <span className="text-xs font-mono text-emerald-800">{s}</span>
          </div>
        ))}
        {tab==="nodes"&&(msg.nodes??[]).map((n,i)=>(
          <div key={i} className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
            <Share2 className="w-3.5 h-3.5 text-blue-500 shrink-0"/>
            <span className="text-xs font-mono text-blue-800">{n}</span>
          </div>
        ))}
        {tab==="plan"&&(
          <div className="bg-slate-900 rounded-xl p-3 space-y-1">
            {(msg.queryPlan??["쿼리 계획 없음"]).map((line,i)=>(
              <div key={i} className="text-xs font-mono text-emerald-400">{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AXChatPage() {
  const [messages, setMessages] = useState<Message[]>([{
    id:0, role:"assistant",
    text:"안녕하세요. 저는 10M 지식 그래프에 연결된 AX Chat입니다.\n\n제조 데이터에 대해 자연어로 질문해 주세요. Material, Product, Customer, Supplier, Order, BOM, Process, Machine, Measurement, Maintenance 도메인의 데이터를 검색합니다.",
    sources:[], nodes:[], queryPlan:[], confidence:100,
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [panelMsg, setPanelMsg] = useState<Message|null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string|null>(null);
  const [feed, setFeed] = useState<{msg:string;ts:string}[]>([]);
  const [totalQueries, setTotalQueries] = useState(147);
  const [avgConf, setAvgConf] = useState(82);
  const [indexPct, setIndexPct] = useState(31);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    bottomRef.current?.scrollIntoView({behavior:"smooth"});
  },[messages]);

  useEffect(()=>{
    const id=setInterval(()=>{
      setIndexPct(p=>Math.min(100,p+Math.random()*0.3));
      const msg=FEED_POOL[Math.floor(Math.random()*FEED_POOL.length)];
      const ts=new Date().toLocaleTimeString("ko-KR",{hour12:false});
      setFeed(prev=>[{msg,ts},...prev].slice(0,6));
    },1200);
    return ()=>clearInterval(id);
  },[]);

  async function send(text: string) {
    if(!text.trim()||loading) return;
    const userMsg: Message={id:Date.now(), role:"user", text};
    setMessages(prev=>[...prev, userMsg, {id:Date.now()+1, role:"assistant", text:"", thinking:true}]);
    setInput("");
    setLoading(true);
    await new Promise(r=>setTimeout(r,1400));
    const answer = BOT_ANSWERS[text]??FALLBACK(text);
    setMessages(prev=>[...prev.slice(0,-1), {id:Date.now()+2, role:"assistant", ...answer}]);
    setTotalQueries(p=>p+1);
    setAvgConf(p=>Math.round((p*0.9+(answer.confidence??50)*0.1)));
    setLoading(false);
  }

  const userMessages = messages.filter(m=>m.role==="user");

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] p-6 gap-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-emerald-600"/>AX Chat
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">10M 지식 그래프 기반 제조 데이터 자연어 질의</p>
        </div>
        <div className="flex items-center gap-2">
          {/* KPI 칩 */}
          <div className="flex gap-2 text-xs">
            <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-400">노드</span> <span className="font-bold text-slate-700">1,240</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-400">엣지</span> <span className="font-bold text-slate-700">3,871</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-400">질의</span> <span className="font-bold text-blue-600">{totalQueries}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-400">평균신뢰도</span> <span className={"font-bold "+(avgConf>=80?"text-emerald-600":"text-amber-600")}>{avgConf}%</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>GraphRAG 연결됨
          </div>
          <button onClick={()=>setShowHistory(p=>!p)}
            className={"p-2 rounded-lg border transition-colors "+(showHistory?"bg-blue-50 border-blue-300 text-blue-600":"bg-white border-slate-200 text-slate-500 hover:bg-slate-50")}>
            <History className="w-4 h-4"/>
          </button>
        </div>
      </div>

      {/* 프리셋 그룹 */}
      <div className="shrink-0 space-y-2">
        <div className="flex gap-2">
          {PRESET_GROUPS.map(g=>(
            <button key={g.label} onClick={()=>setActiveGroup(activeGroup===g.label?null:g.label)}
              className={"text-xs px-3 py-1 rounded-full font-medium border transition-colors "+
                (activeGroup===g.label
                  ?(g.color==="blue"?"bg-blue-600 text-white border-blue-600":g.color==="rose"?"bg-rose-600 text-white border-rose-600":"bg-emerald-600 text-white border-emerald-600")
                  :"bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}>
              {g.label}
            </button>
          ))}
        </div>
        {activeGroup&&(
          <div className="flex gap-2 flex-wrap">
            {PRESET_GROUPS.find(g=>g.label===activeGroup)?.questions.map(q=>(
              <button key={q} onClick={()=>send(q)} disabled={loading}
                className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-all disabled:opacity-40">
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 gap-3 min-h-0">
        {/* 히스토리 사이드바 */}
        {showHistory&&(
          <div className="w-56 shrink-0 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5"/>대화 이력
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {userMessages.length===0&&<div className="px-3 py-3 text-xs text-slate-400">질문이 없습니다</div>}
              {userMessages.map((m,i)=>(
                <button key={m.id} onClick={()=>send(m.text)}
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
          {messages.map(msg=>(
            <div key={msg.id} className={"flex gap-3 "+(msg.role==="user"?"flex-row-reverse":"")}>
              <div className={"w-8 h-8 rounded-full flex items-center justify-center shrink-0 "+(msg.role==="assistant"?"bg-emerald-100":"bg-blue-100")}>
                {msg.role==="assistant"
                  ? <Bot className="w-4 h-4 text-emerald-600"/>
                  : <User className="w-4 h-4 text-blue-600"/>}
              </div>
              <div className={"max-w-xl flex flex-col gap-1 "+(msg.role==="user"?"items-end":"items-start")}>
                <div className={"rounded-2xl px-4 py-3 "+(msg.role==="user"?"bg-blue-600 text-white text-sm":"bg-slate-50 border border-slate-100")}>
                  {msg.thinking
                    ? <TypingDots/>
                    : msg.role==="user"
                    ? <p className="text-sm">{msg.text}</p>
                    : <MarkdownText text={msg.text}/>}
                </div>
                {msg.role==="assistant"&&!msg.thinking&&msg.confidence!==undefined&&(
                  <div className="flex items-center gap-3">
                    <ConfBar value={msg.confidence}/>
                    {msg.sources&&msg.sources.length>0&&(
                      <button onClick={()=>setPanelMsg(panelMsg?.id===msg.id?null:msg)}
                        className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                        <Database className="w-3 h-3"/>소스 {msg.sources.length}건
                        <ChevronDown className={"w-3 h-3 transition-transform "+(panelMsg?.id===msg.id?"rotate-180":"")}/>
                      </button>
                    )}
                    {msg.nodes&&msg.nodes.length>0&&(
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Share2 className="w-3 h-3"/>노드 {msg.nodes.length}건
                      </span>
                    )}
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
          <input value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send(input)}
            placeholder="제조 데이터에 대해 자연어로 질문하세요... (Enter)"
            className="flex-1 text-sm outline-none text-slate-700 placeholder:text-slate-300"
            disabled={loading}/>
          {loading&&<RefreshCw className="w-4 h-4 text-emerald-400 animate-spin shrink-0"/>}
        </div>
        <button onClick={()=>send(input)} disabled={!input.trim()||loading}
          className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow">
          <Send className="w-4 h-4"/>
        </button>
      </div>

      {/* 상태 바 + 피드 */}
      <div className="shrink-0 flex items-center justify-between text-xs text-slate-400 gap-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400"/>
            10M 온톨로지 연결됨 · 마지막 인덱싱 14:23
          </span>
          <span className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400"/>
            임베딩 진행중
            <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full transition-all" style={{width:indexPct.toFixed(0)+"%"}}/>
            </div>
            {indexPct.toFixed(0)}%
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 truncate">
          <Zap className="w-3 h-3 text-amber-400 shrink-0"/>
          {feed[0]?.msg??"인덱싱 대기 중..."}
        </div>
      </div>

      {panelMsg&&(
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={()=>setPanelMsg(null)}/>
          <SourcePanel msg={panelMsg} onClose={()=>setPanelMsg(null)}/>
        </>
      )}
    </div>
  );
}
