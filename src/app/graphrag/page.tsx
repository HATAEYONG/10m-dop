"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, ChevronRight, Database, Users, Package, Settings, DollarSign, BarChart2, Network, X, Zap } from "lucide-react";

interface NodeCard {
  id: string; domain: string; label: string;
  props: { key: string; value: string }[]; color: string;
}
interface Message {
  role: "user"|"assistant"; text: string;
  confidence?: number; domains?: string[];
  nodes?: NodeCard[]; path?: string; streaming?: boolean;
}

const DOMAIN_COLOR: Record<string,string> = {
  Customer:"bg-blue-100 text-blue-700", Material:"bg-emerald-100 text-emerald-700",
  Product:"bg-violet-100 text-violet-700", Process:"bg-amber-100 text-amber-700",
  Machine:"bg-rose-100 text-rose-700", Supplier:"bg-cyan-100 text-cyan-700",
  Order:"bg-orange-100 text-orange-700", BOM:"bg-indigo-100 text-indigo-700",
  Measurement:"bg-pink-100 text-pink-700", Maintenance:"bg-teal-100 text-teal-700",
  Money:"bg-yellow-100 text-yellow-700", Method:"bg-slate-100 text-slate-700",
};
const DOMAIN_ICON: Record<string,React.ReactNode> = {
  Customer:<Users className="w-3.5 h-3.5"/>, Material:<Database className="w-3.5 h-3.5"/>,
  Product:<Package className="w-3.5 h-3.5"/>, Process:<Settings className="w-3.5 h-3.5"/>,
  Machine:<BarChart2 className="w-3.5 h-3.5"/>, Supplier:<Network className="w-3.5 h-3.5"/>,
  Money:<DollarSign className="w-3.5 h-3.5"/>,
};
const DOMAIN_DIST = [
  {d:"Customer",n:180},{d:"Material",n:210},{d:"Product",n:170},{d:"Process",n:140},
  {d:"Machine",n:95},{d:"Supplier",n:120},{d:"Order",n:130},{d:"BOM",n:88},
  {d:"Measurement",n:65},{d:"Maintenance",n:42},
];
const FEED_POOL = [
  "그래프 탐색 — Material → Supplier 2홉 경로 128개 인덱싱",
  "그래프 탐색 — Customer#삼성전자 연결 노드 갱신",
  "엣지 추가 — Process → Measurement 관계 23개",
  "서브그래프 캐시 갱신 — AL6061 관련 클러스터",
  "그래프 탐색 — BOM 변경 이력 추적 완료",
  "노드 임베딩 업데이트 — Supplier 도메인 120개",
];

const QA_GROUPS = [
  {
    label:"Supply", color:"blue",
    items:[
      "AL6061-T6 자재를 사용하는 모든 제품과 납기일은?",
      "전체 공급망에서 단일 공급사 의존도가 높은 자재는?",
    ],
  },
  {
    label:"Quality", color:"rose",
    items:[
      "A업체에서 삼성전자에 납품하는 부품의 공정 불량률은?",
      "지난 분기 CNC-01 설비의 가동률 저하 원인은?",
    ],
  },
  {
    label:"Operation", color:"amber",
    items:[
      "B업체 SAP에서 BOM 변경이 가장 잦은 품목 TOP 3는?",
      "C업체 수주 데이터에서 이상값 패턴이 있는 거래처는?",
    ],
  },
];

const EXAMPLE_QA: {q:string;answer:string;confidence:number;domains:string[];nodes:NodeCard[];path:string}[] = [
  {
    q:"A업체에서 삼성전자에 납품하는 부품의 공정 불량률은?",
    answer:"A업체 → 삼성전자(CUST_0001) 납품 부품은 총 **12개 품목**입니다. 최근 3개월 평균 공정 불량률은 **1.8%**이며, 이 중 CNC 선삭 공정(P-CNC-01)에서 발생한 치수 불량이 전체의 63%를 차지합니다. 특히 AL6061-T6 소재 적용 부품(PRD_0041, PRD_0042)에서 불량률이 2.4%로 평균 대비 높게 나타납니다.",
    confidence:91, domains:["Customer","Product","Process","Measurement"],
    path:"CUST_0001 → PRD_0041 → PROC_CNC01 → MEAS_0089",
    nodes:[
      {id:"CUST_0001",domain:"Customer",label:"삼성전자",props:[{key:"업종",value:"전자·반도체"},{key:"납품 품목수",value:"12개"}],color:"blue"},
      {id:"PRD_0041",domain:"Product",label:"정밀 브래킷 A형",props:[{key:"소재",value:"AL6061-T6"},{key:"불량률",value:"2.4%"}],color:"violet"},
      {id:"PROC_CNC01",domain:"Process",label:"CNC 선삭 공정",props:[{key:"설비",value:"CNC-01"},{key:"주요 불량",value:"치수 이탈"}],color:"amber"},
      {id:"MEAS_0089",domain:"Measurement",label:"치수 검사 #89",props:[{key:"기준치",value:"±0.05mm"},{key:"최근 결과",value:"불량 3건"}],color:"pink"},
    ],
  },
  {
    q:"AL6061-T6 자재를 사용하는 모든 제품과 납기일은?",
    answer:"AL6061-T6(MAT_0042)를 사용하는 제품은 **총 7개**입니다. 현재 수주 잔량 기준 납기 현황:\n\n• PRD_0041 정밀 브래킷 A형 — 2026-07-15 (정상)\n• PRD_0042 하우징 플레이트 — 2026-07-22 (위험: 재고 부족)\n• PRD_0055 어댑터 블록 — 2026-08-03 (정상)\n\n**PRD_0042**는 현재 재고 2.1kg로 수주 소요량 3.8kg에 미달합니다. 즉시 발주 필요.",
    confidence:87, domains:["Material","Product","Order"],
    path:"MAT_0042 → PRD_0041 · PRD_0042 · PRD_0055 → ORD_2026Q2",
    nodes:[
      {id:"MAT_0042",domain:"Material",label:"AL6061-T6",props:[{key:"현재 재고",value:"2.1 kg"},{key:"소요량",value:"3.8 kg"}],color:"emerald"},
      {id:"PRD_0042",domain:"Product",label:"하우징 플레이트",props:[{key:"납기일",value:"2026-07-22"},{key:"상태",value:"재고 위험"}],color:"violet"},
      {id:"ORD_2026Q2",domain:"Order",label:"2Q 수주 묶음",props:[{key:"총 품목",value:"7개"},{key:"긴급 건수",value:"1건"}],color:"orange"},
    ],
  },
  {
    q:"지난 분기 CNC-01 설비의 가동률 저하 원인은?",
    answer:"CNC-01(MCH_0001) 지난 분기 가동률은 **74.3%**로 목표치 85% 대비 **10.7%p 미달**했습니다. 주요 원인:\n\n1. **공구 교체 지연** (전체 비가동 중 41%) — 비계획 정지 8회\n2. **냉각수 유량 부족** (28%) — 필터 교체 주기 초과\n3. **프로그램 오류 수정** (21%) — NC 코드 재셋업\n\n유지보수 이력(MNT_0034)에 따르면 2월 예방정비가 1주일 지연 시행됐습니다.",
    confidence:89, domains:["Machine","Process","Maintenance"],
    path:"MCH_0001 → MNT_0034 → PROC_CNC01",
    nodes:[
      {id:"MCH_0001",domain:"Machine",label:"CNC-01",props:[{key:"가동률",value:"74.3%"},{key:"목표",value:"85%"}],color:"rose"},
      {id:"MNT_0034",domain:"Maintenance",label:"2월 예방정비",props:[{key:"지연",value:"7일"},{key:"원인",value:"작업자 부재"}],color:"teal"},
      {id:"TOOL_0021",domain:"Process",label:"절삭공구 교체 이력",props:[{key:"비계획 정지",value:"8회"},{key:"손실시간",value:"14.2h"}],color:"amber"},
    ],
  },
  {
    q:"B업체 SAP에서 BOM 변경이 가장 잦은 품목 TOP 3는?",
    answer:"B업체 SAP 데이터 분석 결과, 최근 12개월 BOM 변경 빈도 상위 3개 품목:\n\n1. **어셈블리 A-2201** (BOM_0021) — 변경 11회\n2. **샤프트 컴플리트** (BOM_0034) — 변경 8회\n3. **커버 플레이트 B형** (BOM_0047) — 변경 6회\n\nBOM 변경이 잦은 품목은 Graph 상에서 Product → Material 엣지가 동적으로 바뀌어 추적이 어렵습니다. Canonical 고정 매핑 후 변경 이력 관리 권장.",
    confidence:83, domains:["BOM","Product","Material"],
    path:"BOM_0021 → PRD_0021 → MAT_변경이력",
    nodes:[
      {id:"BOM_0021",domain:"BOM",label:"어셈블리 A-2201 BOM",props:[{key:"변경 횟수",value:"11회/년"},{key:"최근 변경",value:"2026-03-01"}],color:"indigo"},
      {id:"BOM_0034",domain:"BOM",label:"샤프트 컴플리트 BOM",props:[{key:"변경 횟수",value:"8회/년"},{key:"사유",value:"공차 개정"}],color:"indigo"},
      {id:"PRD_0021",domain:"Product",label:"어셈블리 A-2201",props:[{key:"업체",value:"B업체"},{key:"고객",value:"현대모비스"}],color:"violet"},
    ],
  },
  {
    q:"C업체 수주 데이터에서 이상값 패턴이 있는 거래처는?",
    answer:"C업체 수기 Excel 수주 데이터 분석 결과 이상값 패턴이 감지된 거래처 **3곳**:\n\n• **CUST_0031 (미확인 거래처)** — 동일 품목 단가가 월별로 최대 340% 차이\n• **CUST_0045 (가산전자)** — 수량 컬럼에 소수점 값 존재\n• **CUST_0052 (미확인 코드)** — 사업자번호 형식 불일치\n\n3건 모두 Human Review 큐에 등록 권장합니다.",
    confidence:78, domains:["Customer","Order","Measurement"],
    path:"CUST_0031 → ORD_이상값 → MEAS_검증",
    nodes:[
      {id:"CUST_0031",domain:"Customer",label:"미확인 거래처",props:[{key:"이상 유형",value:"단가 변동 340%"},{key:"상태",value:"Human Review 대기"}],color:"blue"},
      {id:"CUST_0045",domain:"Customer",label:"가산전자",props:[{key:"이상 유형",value:"수량 소수점 혼용"},{key:"건수",value:"14건"}],color:"blue"},
    ],
  },
  {
    q:"전체 공급망에서 단일 공급사 의존도가 높은 자재는?",
    answer:"4개 업체 공급망 통합 분석 결과, **단일 공급사 의존도 80% 이상** 자재는 **5개**입니다:\n\n| 자재 | 공급사 | 의존도 | 위험도 |\n|------|--------|--------|--------|\n| AL6061-T6 | 포스코INX | 94% | 고위험 |\n| SUS304 | 현대제철 | 88% | 고위험 |\n| PCB 기판 | 삼성전기 | 82% | 중위험 |\n\nAL6061-T6의 경우 4개 업체 전체에서 포스코INX 단일 소싱 구조입니다.",
    confidence:94, domains:["Supplier","Material","Money"],
    path:"SUP_포스코INX → MAT_0042 → PRD_0041 · PRD_0042",
    nodes:[
      {id:"SUP_0031",domain:"Supplier",label:"포스코INX",props:[{key:"공급 자재수",value:"3종"},{key:"최대 의존도",value:"94%"}],color:"cyan"},
      {id:"MAT_0042",domain:"Material",label:"AL6061-T6",props:[{key:"단일 공급",value:"포스코INX 94%"},{key:"사용 업체",value:"전체 4개"}],color:"emerald"},
    ],
  },
];

function ConfBar({ value }: { value: number }) {
  const cls = value>=80?"bg-emerald-500":value>=60?"bg-amber-400":"bg-rose-400";
  const textCls = value>=80?"text-emerald-600":value>=60?"text-amber-600":"text-rose-600";
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-20 h-1.5 bg-slate-200 rounded-full overflow-visible">
        <div className={"absolute inset-y-0 left-0 rounded-full "+cls} style={{width:value+"%"}}/>
        <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400 opacity-40" style={{left:"80%"}}/>
      </div>
      <span className={"text-xs font-semibold "+textCls}>{value}%</span>
    </div>
  );
}

function DomainDistChart() {
  const max = Math.max(...DOMAIN_DIST.map(d=>d.n));
  return (
    <div className="space-y-1.5">
      {DOMAIN_DIST.map(({d,n})=>(
        <div key={d} className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 w-20 shrink-0 text-right">{d}</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={"h-full rounded-full "+(DOMAIN_COLOR[d]?.includes("blue")?"bg-blue-400":DOMAIN_COLOR[d]?.includes("emerald")?"bg-emerald-400":DOMAIN_COLOR[d]?.includes("violet")?"bg-violet-400":DOMAIN_COLOR[d]?.includes("amber")?"bg-amber-400":DOMAIN_COLOR[d]?.includes("rose")?"bg-rose-400":DOMAIN_COLOR[d]?.includes("cyan")?"bg-cyan-400":DOMAIN_COLOR[d]?.includes("orange")?"bg-orange-400":DOMAIN_COLOR[d]?.includes("indigo")?"bg-indigo-400":DOMAIN_COLOR[d]?.includes("pink")?"bg-pink-400":"bg-teal-400")} style={{width:Math.round(n/max*100)+"%"}}/>
          </div>
          <span className="text-[10px] text-slate-500 w-6 text-right">{n}</span>
        </div>
      ))}
    </div>
  );
}

function NodePanel({ nodes, path, onClose }: { nodes: NodeCard[]; path: string; onClose: ()=>void }) {
  const [tab, setTab] = useState<"nodes"|"path"|"dist">("nodes");
  return (
    <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <span className="font-semibold text-slate-800 text-sm">그래프 근거 상세</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400"><X className="w-4 h-4"/></button>
      </div>
      <div className="flex border-b border-slate-100">
        {(["nodes","path","dist"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={"flex-1 py-2 text-xs font-medium border-b-2 -mb-px transition-colors "+(tab===t?"border-blue-600 text-blue-700":"border-transparent text-slate-500 hover:text-slate-700")}>
            {t==="nodes"?"참조 노드 ("+nodes.length+")":t==="path"?"탐색 경로":"도메인 분포"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {tab==="nodes"&&(
          <div className="space-y-3">
            {nodes.map(node=>(
              <div key={node.id} className="bg-white rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className={"flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium "+(DOMAIN_COLOR[node.domain]??"bg-slate-100 text-slate-600")}>
                    {DOMAIN_ICON[node.domain]}{node.domain}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-800">{node.label}</div>
                <div className="text-xs text-slate-400 mb-2">{node.id}</div>
                <div className="space-y-1">
                  {node.props.map(p=>(
                    <div key={p.key} className="flex justify-between text-xs">
                      <span className="text-slate-400">{p.key}</span>
                      <span className="font-medium text-slate-700">{p.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {tab==="path"&&(
          <div className="space-y-3">
            <div className="bg-slate-900 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-400 mb-2">탐색 경로</p>
              <p className="text-sm text-emerald-400 font-mono leading-relaxed">{path||"경로 없음"}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-xs space-y-1.5">
              <p className="font-semibold text-slate-500 mb-2">경로 분석</p>
              <div className="flex justify-between"><span className="text-slate-400">홉 수</span><span className="font-medium">{path.split("→").length-1}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">노드 수</span><span className="font-medium">{nodes.length}개</span></div>
              <div className="flex justify-between"><span className="text-slate-400">도메인 수</span><span className="font-medium">{[...new Set(nodes.map(n=>n.domain))].length}개</span></div>
            </div>
          </div>
        )}
        {tab==="dist"&&(
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500">전체 그래프 도메인 분포 (1,240 노드)</p>
            <DomainDistChart/>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GraphRAG() {
  const [messages, setMessages] = useState<Message[]>([{
    role:"assistant",
    text:"10M 지식 그래프에 연결됐습니다. 온보딩된 4개 업체 데이터 기반으로 자연어로 질문하세요.\n\n아래 예시 질문을 클릭하거나 직접 입력할 수 있습니다.",
    confidence:100, domains:["Customer","Material","Product","Process","Machine","Supplier"],
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [panelData, setPanelData] = useState<{nodes:NodeCard[];path:string}|null>(null);
  const [activeGroup, setActiveGroup] = useState<string|null>("Supply");
  const [feed, setFeed] = useState<{msg:string;ts:string}[]>([]);
  const [totalQ, setTotalQ] = useState(0);
  const [avgConf, setAvgConf] = useState(85);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    bottomRef.current?.scrollIntoView({behavior:"smooth"});
  },[messages]);

  useEffect(()=>{
    const id=setInterval(()=>{
      const msg=FEED_POOL[Math.floor(Math.random()*FEED_POOL.length)];
      const ts=new Date().toLocaleTimeString("ko-KR",{hour12:false});
      setFeed(prev=>[{msg,ts},...prev].slice(0,5));
    },1200);
    return ()=>clearInterval(id);
  },[]);

  async function ask(question: string) {
    if(!question.trim()||loading) return;
    setLoading(true); setInput("");
    setMessages(prev=>[...prev,{role:"user",text:question}]);
    const qa=EXAMPLE_QA.find(q=>q.q===question)??{
      answer:"해당 질문에 대한 데이터를 그래프에서 탐색 중입니다. 현재 온보딩된 4개 업체 데이터 기반으로 관련 노드를 검색했으나, 명확한 경로를 찾지 못했습니다. 질문을 더 구체적으로 입력하거나 예시 질문을 사용해보세요.",
      confidence:62, domains:["Customer","Material"], path:"탐색 중...", nodes:[],
    };
    const streamingMsg: Message={role:"assistant",text:"",streaming:true,confidence:qa.confidence,domains:qa.domains,nodes:qa.nodes,path:qa.path};
    setMessages(prev=>[...prev,streamingMsg]);
    setPanelData({nodes:qa.nodes,path:qa.path});
    const chars=qa.answer.split("");
    let idx=0;
    const interval=setInterval(()=>{
      idx+=3;
      const partial=chars.slice(0,idx).join("");
      setMessages(prev=>{
        const n=[...prev];
        n[n.length-1]={...streamingMsg,text:partial,streaming:idx<chars.length};
        return n;
      });
      if(idx>=chars.length){
        clearInterval(interval);
        setLoading(false);
        setTotalQ(p=>p+1);
        setAvgConf(p=>Math.round(p*0.85+qa.confidence*0.15));
      }
    },18);
  }

  const groupQuestions=QA_GROUPS.find(g=>g.label===activeGroup)?.items??[];

  return (
    <div className="p-6 h-[calc(100vh-2rem)] flex flex-col gap-3">
      {/* 헤더 + KPI */}
      <div className="flex items-start justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">GraphRAG Demo</h1>
          <p className="text-slate-500 mt-1 text-sm">온보딩된 지식 그래프에 자연어로 질문하세요 — AI가 근거 노드와 함께 답변합니다</p>
        </div>
        <div className="flex gap-2 text-xs">
          {[
            {label:"노드",value:"1,240",cls:"text-slate-700"},
            {label:"엣지",value:"3,871",cls:"text-slate-700"},
            {label:"질의",value:String(totalQ),cls:"text-blue-600"},
            {label:"평균신뢰도",value:avgConf+"%",cls:avgConf>=80?"text-emerald-600":"text-amber-600"},
          ].map(({label,value,cls})=>(
            <div key={label} className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-400">{label} </span><span className={"font-bold "+cls}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* 채팅 패널 */}
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* 그룹 필터 + 예시 질문 */}
          <div className="p-3 border-b border-slate-100 bg-slate-50 space-y-2">
            <div className="flex gap-2">
              {QA_GROUPS.map(g=>(
                <button key={g.label} onClick={()=>setActiveGroup(activeGroup===g.label?null:g.label)}
                  className={"text-xs px-3 py-1 rounded-full font-medium border transition-colors "+
                    (activeGroup===g.label
                      ?(g.color==="blue"?"bg-blue-600 text-white border-blue-600":g.color==="rose"?"bg-rose-600 text-white border-rose-600":"bg-amber-500 text-white border-amber-500")
                      :"bg-white border-slate-200 text-slate-600 hover:bg-slate-100")}>
                  {g.label}
                </button>
              ))}
            </div>
            {groupQuestions.length>0&&(
              <div className="flex flex-wrap gap-1.5">
                {groupQuestions.map(q=>(
                  <button key={q} onClick={()=>ask(q)} disabled={loading}
                    className="text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50 text-left">
                    {q.length>32?q.slice(0,32)+"…":q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 메시지 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg,i)=>(
              <div key={i}
                onClick={()=>msg.nodes?.length&&setPanelData({nodes:msg.nodes!,path:msg.path??""})}
                className={"flex "+(msg.role==="user"?"justify-end":"justify-start")+(msg.nodes?.length?" cursor-pointer":"")}>
                {msg.role==="assistant"&&(
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mr-2 mt-1">
                    <Sparkles className="w-3.5 h-3.5 text-white"/>
                  </div>
                )}
                <div className={"max-w-[75%] rounded-2xl px-4 py-3 "+(msg.role==="user"?"bg-blue-600 text-white rounded-br-sm":"bg-slate-100 text-slate-800 rounded-bl-sm")}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.text}
                    {msg.streaming&&<span className="inline-block w-1.5 h-4 bg-slate-400 ml-0.5 animate-pulse rounded-sm"/>}
                  </p>
                  {msg.role==="assistant"&&msg.confidence&&!msg.streaming&&(
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <ConfBar value={msg.confidence}/>
                      {msg.domains?.map(d=>(
                        <span key={d} className={"text-xs px-1.5 py-0.5 rounded-full font-medium "+(DOMAIN_COLOR[d]??"bg-slate-100 text-slate-600")}>{d}</span>
                      ))}
                      {msg.nodes&&msg.nodes.length>0&&(
                        <span className="text-xs text-blue-500 flex items-center gap-0.5">
                          근거 {msg.nodes.length}개<ChevronRight className="w-3 h-3"/>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>

          {/* 입력 */}
          <div className="p-3 border-t border-slate-100">
            <div className="flex gap-2">
              <input value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&ask(input)}
                placeholder="공급망, 품질, 설비, BOM에 대해 자유롭게 질문하세요..."
                disabled={loading}
                className="flex-1 text-sm px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 disabled:opacity-50"/>
              <button onClick={()=>ask(input)} disabled={loading||!input.trim()}
                className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors">
                <Send className="w-4 h-4"/>
              </button>
            </div>
          </div>
        </div>

        {/* 우측 사이드 */}
        <div className="w-64 shrink-0 flex flex-col gap-3">
          {/* 그래프 통계 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">그래프 통계</p>
            <div className="space-y-2 text-xs">
              {[{label:"총 노드",value:"1,240"},{label:"총 엣지",value:"3,871"},{label:"도메인",value:"12개"},{label:"업체",value:"A·B·C·D"}].map(({label,value})=>(
                <div key={label} className="flex justify-between">
                  <span className="text-slate-400">{label}</span>
                  <span className="font-semibold text-slate-700">{value}</span>
                </div>
              ))}
            </div>
            {panelData&&(
              <button onClick={()=>setPanelData(panelData)}
                className="mt-3 w-full text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                상세 패널 열기 →
              </button>
            )}
          </div>

          {/* 실시간 피드 */}
          <div className="bg-slate-900 rounded-xl overflow-hidden flex-1">
            <div className="px-3 py-2.5 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400"/>
              <span className="text-xs text-slate-300 font-medium">그래프 탐색 피드</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-auto"/>
            </div>
            <div className="divide-y divide-slate-800">
              {feed.length===0&&<div className="px-3 py-2 text-xs text-slate-500">대기 중...</div>}
              {feed.map((f,i)=>(
                <div key={i} className="px-3 py-2">
                  <div className="text-[10px] text-slate-500 font-mono">{f.ts}</div>
                  <div className="text-xs text-slate-300 mt-0.5 leading-relaxed">{f.msg}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {panelData&&(
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={()=>setPanelData(null)}/>
          <NodePanel nodes={panelData.nodes} path={panelData.path} onClose={()=>setPanelData(null)}/>
        </>
      )}
    </div>
  );
}
