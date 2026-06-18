"use client";

import { useState, useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle2, TrendingUp, X, Zap, Package } from "lucide-react";

type ScenarioId = "base"|"optimistic"|"risk";

interface PlanItem {
  product:string; material:string; demand:number; stock:number; inbound:number;
  gap:number; dueDate:string; risk:"ok"|"warn"|"danger";
  cause:string; action:string;
  history:{date:string;event:string}[];
  orderedQty:number;
}

const SCENARIOS: Record<ScenarioId,{label:string;desc:string;badge:string;items:PlanItem[]}> = {
  base:{
    label:"기본 시나리오", desc:"현재 수주 + 예상 발주 기준", badge:"bg-blue-600 text-white",
    items:[
      {product:"AL6061 판재 가공품",  material:"AL6061-T6",  demand:820,  stock:450, inbound:300, gap:-70,  dueDate:"2026-07-05", risk:"warn",   orderedQty:0, cause:"입고 예정 부족 — 공급사 리드타임 초과", action:"AL6061 공급사 B와 긴급 납기 협의 필요", history:[{date:"06-15","event":"수주 확정 820EA"},{date:"06-17","event":"입고 300EA 예약"}]},
      {product:"PCB 기판 A타입",      material:"PCB 원판",   demand:500,  stock:620, inbound:0,   gap:120,  dueDate:"2026-06-30", risk:"ok",     orderedQty:0, cause:"재고 충분", action:"정상 납기 가능", history:[{date:"06-10","event":"재고 620EA 확인"}]},
      {product:"CNC 가공 부품 #1042", material:"초경 인서트",demand:200,  stock:80,  inbound:200, gap:80,   dueDate:"2026-07-10", risk:"ok",     orderedQty:0, cause:"입고 예정으로 충족", action:"정상 납기 가능", history:[{date:"06-16","event":"입고 200EA 확정"}]},
      {product:"PDF 검사 성적서 부품", material:"SUS304",    demand:350,  stock:120, inbound:100, gap:-130, dueDate:"2026-07-03", risk:"danger", orderedQty:0, cause:"재고+입고 부족 130단위", action:"SUS304 긴급 발주 최소 130EA 필요", history:[{date:"06-12","event":"수주 350EA"},{date:"06-14","event":"입고 100EA 예약 — 부족 확인"}]},
      {product:"설비 스페어 파트",     material:"베어링 6205",demand:60,   stock:45,  inbound:20,  gap:5,    dueDate:"2026-07-20", risk:"ok",     orderedQty:0, cause:"소폭 여유", action:"정상 납기 가능", history:[{date:"06-18","event":"재고 45EA 확인"}]},
    ],
  },
  optimistic:{
    label:"낙관 시나리오", desc:"삼성전자 추가 발주 30% 반영", badge:"bg-emerald-600 text-white",
    items:[
      {product:"AL6061 판재 가공품",  material:"AL6061-T6",  demand:1060, stock:450, inbound:500, gap:-110, dueDate:"2026-07-05", risk:"danger", orderedQty:0, cause:"수요 30% 증가로 공급 부족", action:"AL6061 추가 500EA 긴급 발주", history:[{date:"06-17","event":"삼성전자 추가 수주 240EA"}]},
      {product:"PCB 기판 A타입",      material:"PCB 원판",   demand:650,  stock:620, inbound:150, gap:120,  dueDate:"2026-06-30", risk:"ok",     orderedQty:0, cause:"재고+입고 충족", action:"정상 납기 가능", history:[{date:"06-15","event":"추가 수주 150EA"}]},
      {product:"CNC 가공 부품 #1042", material:"초경 인서트",demand:260,  stock:80,  inbound:200, gap:20,   dueDate:"2026-07-10", risk:"warn",   orderedQty:0, cause:"소폭 부족 위험", action:"추가 발주 20EA 권장", history:[{date:"06-17","event":"수요 260EA로 조정"}]},
      {product:"PDF 검사 성적서 부품", material:"SUS304",    demand:455,  stock:120, inbound:100, gap:-235, dueDate:"2026-07-03", risk:"danger", orderedQty:0, cause:"수요 증가로 부족 심화", action:"SUS304 긴급 발주 235EA 필요", history:[{date:"06-17","event":"수주 455EA로 증가"}]},
      {product:"설비 스페어 파트",     material:"베어링 6205",demand:60,   stock:45,  inbound:20,  gap:5,    dueDate:"2026-07-20", risk:"ok",     orderedQty:0, cause:"영향 없음", action:"정상 납기 가능", history:[]},
    ],
  },
  risk:{
    label:"위험 시나리오", desc:"AL6061 수급 차질 + 물류 지연", badge:"bg-rose-600 text-white",
    items:[
      {product:"AL6061 판재 가공품",  material:"AL6061-T6",  demand:820,  stock:450, inbound:100, gap:-270, dueDate:"2026-07-05", risk:"danger", orderedQty:0, cause:"공급사 물류 차질 — 입고 300→100EA 감소", action:"대체 공급사 긴급 탐색 + 270EA 발주", history:[{date:"06-17","event":"공급사 B 물류 지연 통보"},{date:"06-18","event":"입고 300→100EA 조정"}]},
      {product:"PCB 기판 A타입",      material:"PCB 원판",   demand:500,  stock:620, inbound:0,   gap:120,  dueDate:"2026-07-04", risk:"warn",   orderedQty:0, cause:"납기 1일 당겨짐", action:"생산 일정 조정 확인", history:[{date:"06-18","event":"납기 2026-07-04로 변경"}]},
      {product:"CNC 가공 부품 #1042", material:"초경 인서트",demand:200,  stock:80,  inbound:200, gap:80,   dueDate:"2026-07-10", risk:"ok",     orderedQty:0, cause:"영향 없음", action:"정상 납기 가능", history:[]},
      {product:"PDF 검사 성적서 부품", material:"SUS304",    demand:350,  stock:120, inbound:0,   gap:-230, dueDate:"2026-07-03", risk:"danger", orderedQty:0, cause:"입고 전량 취소", action:"SUS304 대체 공급사 긴급 발주 230EA", history:[{date:"06-18","event":"입고 100EA 취소 — 공급사 파업"}]},
      {product:"설비 스페어 파트",     material:"베어링 6205",demand:60,   stock:45,  inbound:0,   gap:-15,  dueDate:"2026-07-20", risk:"warn",   orderedQty:0, cause:"입고 취소로 소폭 부족", action:"베어링 15EA 발주 필요", history:[{date:"06-18","event":"입고 20EA 취소"}]},
    ],
  },
};

const FEED_POOL = [
  "AL6061-T6 — 공급사 B 납기 지연 1주 통보",
  "SUS304 — 시장가 3.2% 상승 감지",
  "PCB 원판 — 재고 소진 예측 D-12",
  "베어링 6205 — 대체 공급사 견적 수신",
  "AL6061 판재 — 긴급 발주 승인 대기",
  "초경 인서트 — 입고 확정 200EA",
  "SUS304 — 공급사 C 납기 협의 완료",
];

const DUE_DATES = [
  {product:"PCB 기판",    date:"06-30", col:0,  risk:"ok"},
  {product:"PDF 성적서",  date:"07-03", col:3,  risk:"danger"},
  {product:"AL6061",     date:"07-05", col:5,  risk:"warn"},
  {product:"CNC #1042",  date:"07-10", col:10, risk:"ok"},
  {product:"스페어파트",  date:"07-20", col:20, risk:"ok"},
];

function GapChart({ items }: { items: PlanItem[] }) {
  const W=400; const H=80; const bw=56; const gap=10;
  return (
    <svg width={W} height={H+30} viewBox={`0 0 ${W} ${H+30}`} className="w-full">
      {items.map((it,i)=>{
        const avail = Math.min(it.stock+it.inbound, it.demand);
        const pct = Math.round((avail/it.demand)*100);
        const bh = (pct/100)*H; const x=i*(bw+gap);
        const color = it.risk==="ok"?"#10b981":it.risk==="warn"?"#f59e0b":"#ef4444";
        const short = it.product.split(" ")[0].slice(0,5);
        return (
          <g key={it.product}>
            <rect x={x} y={0} width={bw} height={H} rx={4} fill="#f1f5f9"/>
            <rect x={x} y={H-bh} width={bw} height={bh} rx={4} fill={color} opacity={0.85}/>
            <text x={x+bw/2} y={H-bh-4} textAnchor="middle" fontSize={8} fill={color} fontWeight="700">{pct}%</text>
            <text x={x+bw/2} y={H+14} textAnchor="middle" fontSize={7} fill="#94a3b8">{short}</text>
          </g>
        );
      })}
      <line x1={0} y1={H} x2={W} y2={H} stroke="#e2e8f0" strokeWidth={1}/>
    </svg>
  );
}

function Timeline() {
  const W=500; const H=32; const pad=20;
  return (
    <svg width={W} height={H+24} viewBox={`0 0 ${W} ${H+24}`} className="w-full">
      <line x1={pad} y1={H/2} x2={W-pad} y2={H/2} stroke="#e2e8f0" strokeWidth={2}/>
      {DUE_DATES.map((d,i)=>{
        const x = pad + (d.col/30)*(W-pad*2);
        const color = d.risk==="ok"?"#10b981":d.risk==="warn"?"#f59e0b":"#ef4444";
        return (
          <g key={d.product}>
            <circle cx={x} cy={H/2} r={6} fill={color}/>
            <text x={x} y={i%2===0?H/2-11:H/2+20} textAnchor="middle" fontSize={7} fill={color} fontWeight="600">{d.product}</text>
            <text x={x} y={i%2===0?H/2-20:H/2+29} textAnchor="middle" fontSize={6} fill="#94a3b8">{d.date}</text>
          </g>
        );
      })}
    </svg>
  );
}

function ItemPanel({ item, onClose, onOrder }: { item:PlanItem; onClose:()=>void; onOrder:(qty:number)=>void }) {
  const [tab, setTab] = useState<"supply"|"action"|"history">("supply");
  const [orderQty, setOrderQty] = useState(Math.max(0, -item.gap));
  const [ordered, setOrdered] = useState(item.orderedQty>0);
  const avail = item.stock+item.inbound;
  const pct = Math.min(100, Math.round((avail/item.demand)*100));
  const riskCls = item.risk==="ok"?"text-emerald-600 bg-emerald-50":item.risk==="warn"?"text-amber-600 bg-amber-50":"text-rose-600 bg-rose-50";

  return (
    <div className="fixed inset-y-0 right-0 w-[460px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50">
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-400"/>
            <span className="font-bold text-slate-900 text-sm">{item.product}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${riskCls}`}>
              {item.risk==="ok"?"정상":item.risk==="warn"?"주의":"납기위험"}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{item.material} · 납기 {item.dueDate}</div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4"/></button>
      </div>
      <div className="flex border-b border-slate-100">
        {(["supply","action","history"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`flex-1 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${tab===t?"border-blue-600 text-blue-700":"border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t==="supply"?"수급 현황":t==="action"?"조치 계획":"변경 이력"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab==="supply"&&(
          <>
            <div className="grid grid-cols-3 gap-3 text-xs">
              {[["수요량",item.demand,"text-slate-800"],["현재고",item.stock,"text-blue-700"],["입고예정",item.inbound,"text-violet-700"]].map(([l,v,c])=>(
                <div key={l as string} className="bg-slate-50 rounded-xl p-3">
                  <div className="text-slate-400 mb-1">{l as string}</div>
                  <div className={`text-lg font-bold ${c as string}`}>{(v as number).toLocaleString()}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">가용량 충족률</span>
                <span className={`font-bold ${pct>=100?"text-emerald-600":pct>=80?"text-amber-600":"text-rose-600"}`}>{pct}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${pct>=100?"bg-emerald-500":pct>=80?"bg-amber-400":"bg-rose-500"}`} style={{width:`${pct}%`}}/>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-xs">
              <div className="text-slate-500 mb-1">수급 갭</div>
              <div className={`text-xl font-bold ${item.gap>=0?"text-emerald-600":"text-rose-600"}`}>
                {item.gap>=0?"+":""}{item.gap.toLocaleString()}
              </div>
              <div className="text-slate-400 mt-1">{item.cause}</div>
            </div>
          </>
        )}
        {tab==="action"&&(
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              <strong>권고 조치:</strong> {item.action}
            </div>
            {item.gap<0&&!ordered&&(
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-700">긴급 발주 시뮬레이션</div>
                <div className="flex gap-2 items-center">
                  <input type="number" value={orderQty} onChange={e=>setOrderQty(Number(e.target.value))}
                    className="w-24 text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400"/>
                  <span className="text-xs text-slate-400">EA 발주 시</span>
                  <span className={`text-xs font-semibold ${item.stock+item.inbound+orderQty>=item.demand?"text-emerald-600":"text-rose-600"}`}>
                    {item.stock+item.inbound+orderQty>=item.demand?"납기 충족":"여전히 부족 "+(item.demand-item.stock-item.inbound-orderQty)}
                  </span>
                </div>
                <button onClick={()=>{onOrder(orderQty);setOrdered(true);}}
                  className="w-full py-2 bg-rose-600 text-white text-xs font-medium rounded-xl hover:bg-rose-700">
                  긴급 발주 {orderQty.toLocaleString()}EA 확정
                </button>
              </div>
            )}
            {(item.gap>=0||ordered)&&(
              <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-xl p-3">
                <CheckCircle2 className="w-4 h-4"/>
                {ordered?"발주 완료 — 수급 충족 예정":"정상 납기 가능"}
              </div>
            )}
          </>
        )}
        {tab==="history"&&(
          <div className="space-y-2">
            {item.history.length===0&&<div className="text-xs text-slate-400 text-center pt-4">변경 이력 없음</div>}
            {item.history.map((h,i)=>(
              <div key={i} className="flex gap-3 text-xs bg-slate-50 rounded-lg px-3 py-2">
                <span className="font-mono text-slate-400 shrink-0">{h.date}</span>
                <span className="text-slate-700">{h.event}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApsPlanner() {
  const [scenario, setScenario] = useState<ScenarioId>("base");
  const [items, setItems] = useState<Record<ScenarioId,PlanItem[]>>({
    base:       SCENARIOS.base.items.map(i=>({...i})),
    optimistic: SCENARIOS.optimistic.items.map(i=>({...i})),
    risk:       SCENARIOS.risk.items.map(i=>({...i})),
  });
  const [filterRisk, setFilterRisk] = useState<"all"|"ok"|"warn"|"danger">("all");
  const [selectedItem, setSelectedItem] = useState<PlanItem|null>(null);
  const [feed, setFeed] = useState<{msg:string;ts:string}[]>([]);
  const tickRef = useRef(0);

  useEffect(()=>{
    const id=setInterval(()=>{
      tickRef.current++;
      if(tickRef.current%3===0){
        const msg=FEED_POOL[Math.floor(Math.random()*FEED_POOL.length)];
        const ts=new Date().toLocaleTimeString("ko-KR",{hour12:false});
        setFeed(prev=>[{msg,ts},...prev].slice(0,8));
      }
    },1200);
    return ()=>clearInterval(id);
  },[]);

  const sc = SCENARIOS[scenario];
  const scItems = items[scenario];
  const dangerCount = scItems.filter(i=>i.risk==="danger").length;
  const warnCount   = scItems.filter(i=>i.risk==="warn").length;
  const okCount     = scItems.filter(i=>i.risk==="ok").length;
  const filtered = filterRisk==="all" ? scItems : scItems.filter(i=>i.risk===filterRisk);

  const handleOrder = (product:string, qty:number) => {
    setItems(prev=>({
      ...prev,
      [scenario]: prev[scenario].map(it=>it.product===product
        ? {...it, inbound:it.inbound+qty, gap:it.gap+qty, orderedQty:qty,
            risk:(it.stock+it.inbound+qty>=it.demand?"ok":it.gap+qty>=-50?"warn":"danger") as "ok"|"warn"|"danger"}
        : it)
    }));
    setSelectedItem(prev=>prev&&prev.product===product
      ? {...prev, inbound:prev.inbound+qty, gap:prev.gap+qty, orderedQty:qty} : prev);
  };

  const RISK_CFG = {
    ok:    {label:"정상",    cls:"text-emerald-600 bg-emerald-50 border-emerald-200"},
    warn:  {label:"주의",    cls:"text-amber-600 bg-amber-50 border-amber-200"},
    danger:{label:"납기위험", cls:"text-rose-600 bg-rose-50 border-rose-200"},
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">APS Planner</h1>
          <p className="text-slate-500 mt-1 text-sm">시나리오별 수요·재고·입고 계획 비교 및 납기 위험 조기 식별</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"/>
          <span className="text-amber-700 font-medium">수급 실시간 모니터링</span>
        </div>
      </div>

      {/* 시나리오 선택 */}
      <div className="grid grid-cols-3 gap-3">
        {(Object.entries(SCENARIOS) as [ScenarioId,typeof SCENARIOS[ScenarioId]][]).map(([id,s])=>{
          const sitems = items[id];
          const dc = sitems.filter(i=>i.risk==="danger").length;
          return (
            <button key={id} onClick={()=>setScenario(id)}
              className={`rounded-xl border-2 p-4 text-left transition-all ${scenario===id?"border-blue-400 ring-2 ring-blue-100 bg-white shadow-sm":"border-slate-200 bg-white hover:border-slate-300"}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.badge}`}>{s.label}</span>
                {dc>0&&<span className="text-xs text-rose-600 font-semibold">위험 {dc}건</span>}
              </div>
              <div className="text-xs text-slate-500 mt-1">{s.desc}</div>
            </button>
          );
        })}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-5 gap-3">
        {[
          {label:"전체 품목",  value:scItems.length,  sub:"관리 대상",     cls:"text-slate-700 bg-white border-slate-200"},
          {label:"납기 위험",  value:dangerCount,     sub:"긴급 조치 필요", cls:dangerCount>0?"text-rose-700 bg-rose-50 border-rose-200":"text-slate-600 bg-white border-slate-200"},
          {label:"주의 품목",  value:warnCount,       sub:"선제 대응 권장", cls:warnCount>0?"text-amber-700 bg-amber-50 border-amber-200":"text-slate-600 bg-white border-slate-200"},
          {label:"정상 품목",  value:okCount,         sub:"납기 충족",      cls:"text-emerald-700 bg-emerald-50 border-emerald-200"},
          {label:"기준일",     value:"06-18",         sub:"계획 갱신일",    cls:"text-slate-600 bg-slate-50 border-slate-200"},
        ].map(({label,value,sub,cls})=>(
          <div key={label} className={`rounded-xl border p-4 ${cls}`}>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs font-medium mt-0.5">{label}</div>
            <div className="text-[10px] opacity-70 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* 수급 충족률 차트 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="text-xs font-semibold text-slate-700 mb-3">품목별 가용량 충족률</div>
        <GapChart items={scItems}/>
        <div className="flex gap-4 mt-1 text-xs">
          {[["#10b981","정상 (≥100%)"],["#f59e0b","주의 (80–99%)"],["#ef4444","위험 (<80%)"]].map(([c,l])=>(
            <span key={l} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{background:c}}/>
              <span className="text-slate-500">{l}</span>
            </span>
          ))}
        </div>
      </div>

      {/* 납기 타임라인 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="text-xs font-semibold text-slate-700 mb-3">납기일 타임라인 (6–7월)</div>
        <Timeline/>
      </div>

      {/* 필터 + 테이블 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 flex-wrap">
          <TrendingUp className="w-4 h-4 text-slate-400"/>
          <span className="text-xs font-semibold text-slate-700">수급 계획 목록</span>
          <div className="flex gap-1.5 ml-auto">
            {([["all","전체"],["danger","위험"],["warn","주의"],["ok","정상"]] as const).map(([k,l])=>(
              <button key={k} onClick={()=>setFilterRisk(k)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${filterRisk===k?"bg-blue-600 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["제품명","원자재","수요량","현재고","입고예정","충족률","납기일","상태"].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(item=>{
                const avail = item.stock+item.inbound;
                const pct = Math.min(100,Math.round((avail/item.demand)*100));
                const rc = RISK_CFG[item.risk];
                const color = pct>=100?"bg-emerald-500":pct>=80?"bg-amber-400":"bg-rose-500";
                return (
                  <tr key={item.product} onClick={()=>setSelectedItem(item)}
                    className={`cursor-pointer hover:bg-blue-50/30 transition-colors ${item.risk==="danger"?"bg-rose-50/20":""}`}>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-900">{item.product}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{item.material}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-800">{item.demand.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{item.stock.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{item.inbound.toLocaleString()}</td>
                    <td className="px-4 py-3 w-36">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full`} style={{width:`${pct}%`}}/>
                        </div>
                        <span className="text-xs text-slate-500 w-8 text-right shrink-0">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{item.dueDate}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${rc.cls}`}>{rc.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 긴급 조치 배너 */}
      {dangerCount>0&&(
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-rose-600"/>
            <h3 className="font-semibold text-rose-700">긴급 조치 필요 — {dangerCount}개 품목 납기 위험</h3>
          </div>
          <div className="space-y-2">
            {scItems.filter(i=>i.risk==="danger").map(i=>(
              <div key={i.product} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-rose-100">
                <div>
                  <span className="text-sm font-semibold text-slate-800">{i.product}</span>
                  <span className="text-xs text-slate-500 ml-2">({i.material})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-rose-600 font-bold">부족 {Math.abs(i.gap).toLocaleString()}단위</span>
                  <span className="text-xs text-slate-500">{i.dueDate}</span>
                  <button onClick={()=>setSelectedItem(i)}
                    className="text-xs px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700">
                    긴급 발주
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 실시간 경보 피드 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-500"/>
          <span className="text-xs font-semibold text-slate-700">실시간 수급 경보 피드</span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-auto"/>
        </div>
        <div className="divide-y divide-slate-50 max-h-44 overflow-y-auto">
          {feed.length===0&&<div className="px-4 py-3 text-xs text-slate-400">이벤트 대기 중...</div>}
          {feed.map((f,i)=>(
            <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-xs">
              <span className="text-slate-400 font-mono shrink-0">{f.ts}</span>
              <span className="text-slate-700">{f.msg}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedItem&&(
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={()=>setSelectedItem(null)}/>
          <ItemPanel item={selectedItem} onClose={()=>setSelectedItem(null)}
            onOrder={(qty)=>handleOrder(selectedItem.product, qty)}/>
        </>
      )}
    </div>
  );
}
