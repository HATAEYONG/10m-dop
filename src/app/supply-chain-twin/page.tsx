"use client";

import { useState, useEffect, useRef } from "react";
import { AlertTriangle, RefreshCw, Zap, Package, Factory, Truck, Users, CheckCircle2, X } from "lucide-react";

type NodeType = "supplier"|"warehouse"|"factory"|"customer";
type NodeStatus = "normal"|"warning"|"critical"|"affected";

interface SCNode {
  id:string; label:string; sub:string; type:NodeType; status:NodeStatus;
  stock?:number; leadTime?:number; risk?:number; x:number; y:number;
}
interface SCEdge { from:string; to:string; label:string; flow:number; affected:boolean; }

const BASE_NODES: SCNode[] = [
  {id:"s1",label:"중국 AL6061 공급사",sub:"Chalco Shandong",  type:"supplier",  status:"normal",stock:5200,leadTime:21,risk:12,x:60,  y:80 },
  {id:"s2",label:"국내 SUS304 공급사",sub:"(주)영진스틸",    type:"supplier",  status:"normal",stock:3800,leadTime:5, risk:5, x:60,  y:210},
  {id:"s3",label:"PCB 원판 공급사",   sub:"KB세라텍",          type:"supplier",  status:"normal",stock:1200,leadTime:7, risk:8, x:60,  y:340},
  {id:"s4",label:"초경 인서트 공급사",sub:"Sandvik Coromant", type:"supplier",  status:"normal",stock:800, leadTime:14,risk:15,x:60,  y:470},
  {id:"w1",label:"인천 물류창고",     sub:"재고 1,450kg",      type:"warehouse", status:"normal",stock:1450,leadTime:1, risk:3, x:280, y:140},
  {id:"w2",label:"성남 부품창고",     sub:"재고 620EA",        type:"warehouse", status:"normal",stock:620, leadTime:1, risk:2, x:280, y:340},
  {id:"f1",label:"A업체 CNC 공장",   sub:"LINE-01~04",        type:"factory",   status:"normal",stock:0,   leadTime:3, risk:10,x:500, y:140},
  {id:"f2",label:"B업체 프레스 공장",sub:"PRESS-01~06",       type:"factory",   status:"normal",stock:0,   leadTime:2, risk:8, x:500, y:340},
  {id:"c1",label:"삼성전자",         sub:"월 820ea 발주",      type:"customer",  status:"normal",stock:0,   leadTime:0, risk:0, x:720, y:200},
  {id:"c2",label:"LG이노텍",         sub:"월 350ea 발주",      type:"customer",  status:"normal",stock:0,   leadTime:0, risk:0, x:720, y:370},
];

const BASE_EDGES: SCEdge[] = [
  {from:"s1",to:"w1",label:"AL6061 5톤/월",  flow:5000,affected:false},
  {from:"s2",to:"w1",label:"SUS304 2톤/월",  flow:2000,affected:false},
  {from:"s3",to:"w2",label:"PCB 원판 400EA", flow:400, affected:false},
  {from:"s4",to:"w2",label:"인서트 200EA",   flow:200, affected:false},
  {from:"w1",to:"f1",label:"원자재 출고",    flow:1200,affected:false},
  {from:"w1",to:"f2",label:"원자재 출고",    flow:800, affected:false},
  {from:"w2",to:"f1",label:"부품 출고",      flow:300, affected:false},
  {from:"w2",to:"f2",label:"부품 출고",      flow:200, affected:false},
  {from:"f1",to:"c1",label:"완제품 납품",    flow:820, affected:false},
  {from:"f2",to:"c2",label:"완제품 납품",    flow:350, affected:false},
];

const SHOCKS = [
  {
    id:"sh1", label:"AL6061 수출 규제 (3주)",
    icon:<AlertTriangle className="w-3.5 h-3.5"/>, color:"bg-rose-600",
    desc:"중국 AL6061 수출 쿼터 발동 — 3주간 공급 차단",
    affectedNodes:["s1","w1","f1"], affectedEdges:["s1→w1","w1→f1"],
    alternative:"일본 UACJ사 대체 발주 (납기 +7일, 단가 +12%) 또는 국내 재고 조기 확보 권고",
    timeline:[
      {day:"D+0",event:"수출 쿼터 발동",impact:"공급사 s1 출하 중단"},
      {day:"D+3",event:"인천창고 재고 소진 예상",impact:"w1→f1 출고 중단"},
      {day:"D+7",event:"A업체 생산 차질 시작",impact:"라인 2개 정지"},
      {day:"D+14",event:"대체 공급사 발주",impact:"UACJ 납기 D+21"},
      {day:"D+21",event:"정상화 예상",impact:"공급망 회복"},
    ],
  },
  {
    id:"sh2", label:"인천항 파업 (5일)",
    icon:<Truck className="w-3.5 h-3.5"/>, color:"bg-amber-500",
    desc:"인천항 항만 노조 파업 — 수입 물류 5일 지연",
    affectedNodes:["w1","w2"], affectedEdges:["s1→w1","s2→w1","s3→w2","s4→w2"],
    alternative:"부산항 우회 물류 또는 항공 긴급 운송 (비용 +35%) 고려. 현재고로 3일 버퍼 확보 가능.",
    timeline:[
      {day:"D+0",event:"파업 시작",impact:"입항 물류 전면 중단"},
      {day:"D+1",event:"현재고 소진 시작",impact:"창고 w1/w2 재고 감소"},
      {day:"D+3",event:"부산항 우회 전환",impact:"물류 비용 +35%"},
      {day:"D+5",event:"파업 종료 예상",impact:"인천항 정상화"},
    ],
  },
  {
    id:"sh3", label:"삼성전자 발주 +30%",
    icon:<Zap className="w-3.5 h-3.5"/>, color:"bg-blue-600",
    desc:"삼성전자 하반기 발주 30% 증가 — 수요 급증",
    affectedNodes:["f1","w1","s1"], affectedEdges:["f1→c1","w1→f1"],
    alternative:"A업체 생산 라인 증설 (LINE-05 추가 가동) 및 AL6061 발주량 즉시 30% 상향 요청 권고.",
    timeline:[
      {day:"D+0",event:"발주 증가 확인",impact:"f1 생산 계획 상향"},
      {day:"D+3",event:"w1 재고 부족 감지",impact:"긴급 발주 트리거"},
      {day:"D+7",event:"s1 추가 발주",impact:"납기 협의 진행"},
      {day:"D+14",event:"LINE-05 가동",impact:"생산 능력 +30%"},
    ],
  },
];

const NODE_COLORS: Record<NodeType,{fill:string;stroke:string}> = {
  supplier:  {fill:"#eff6ff",stroke:"#3b82f6"},
  warehouse: {fill:"#f0fdf4",stroke:"#22c55e"},
  factory:   {fill:"#faf5ff",stroke:"#8b5cf6"},
  customer:  {fill:"#fff7ed",stroke:"#f97316"},
};
const STATUS_COLORS: Record<NodeStatus,string> = {
  normal:"#22c55e", warning:"#f59e0b", critical:"#ef4444", affected:"#f97316",
};

const FEED_POOL = [
  "재고 업데이트 — 인천창고 AL6061 1,438kg",
  "물류 추적 — Chalco Shandong 출하 확인",
  "리스크 감지 — 초경 인서트 리드타임 +2일",
  "재고 업데이트 — 성남창고 PCB 원판 598EA",
  "물류 추적 — KB세라텍 납품 완료",
  "공급망 이벤트 — 삼성전자 PO 수신",
  "리스크 감지 — 중국 AL 선물 가격 +3.2%",
];

function NodePanel({ node, shock, onClose }: {
  node: SCNode; shock: typeof SHOCKS[0]|undefined; onClose: ()=>void;
}) {
  const [tab, setTab] = useState<"detail"|"flow"|"alt">("detail");
  const nc = NODE_COLORS[node.type];
  const isAffected = shock?.affectedNodes.includes(node.id);
  const relEdges = BASE_EDGES.filter(e=>e.from===node.id||e.to===node.id);
  return (
    <div className="fixed inset-y-0 right-0 w-[440px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50">
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{background:STATUS_COLORS[node.status]}}/>
            <span className="text-xs text-slate-400">{{supplier:"공급사",warehouse:"창고",factory:"공장",customer:"고객"}[node.type]}</span>
            {isAffected&&<span className="text-xs bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded-full font-medium">충격 영향</span>}
          </div>
          <h2 className="text-base font-bold text-slate-900 mt-1">{node.label}</h2>
          <p className="text-xs text-slate-400">{node.sub}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4"/></button>
      </div>
      <div className="flex border-b border-slate-100">
        {(["detail","flow","alt"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={"flex-1 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors "+(tab===t?"border-blue-600 text-blue-700":"border-transparent text-slate-500 hover:text-slate-700")}>
            {t==="detail"?"노드 상세":t==="flow"?"물류 흐름":"AI 대안"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tab==="detail"&&(
          <>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">유형</span><span className="font-semibold text-slate-700">{{supplier:"공급사",warehouse:"창고",factory:"공장",customer:"고객"}[node.type]}</span></div>
              {node.stock!==undefined&&<div className="flex justify-between"><span className="text-slate-500">재고</span><span className="font-semibold text-slate-700">{node.stock.toLocaleString()}</span></div>}
              {node.leadTime!==undefined&&<div className="flex justify-between"><span className="text-slate-500">리드타임</span><span className="font-semibold text-slate-700">{node.leadTime}일</span></div>}
              {node.risk!==undefined&&(
                <div>
                  <div className="flex justify-between mb-1"><span className="text-slate-500">리스크</span><span className={"font-bold "+(node.risk>10?"text-rose-600":"text-emerald-600")}>{node.risk}%</span></div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className={"h-full rounded-full "+(node.risk>10?"bg-rose-400":"bg-emerald-400")} style={{width:node.risk+"%"}}/>
                  </div>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">상태</span>
                <span className={"font-semibold "+(node.status==="normal"?"text-emerald-600":node.status==="critical"?"text-rose-600":"text-amber-600")}>
                  {node.status==="normal"?"정상":node.status==="critical"?"위험":"주의"}
                </span>
              </div>
            </div>
          </>
        )}
        {tab==="flow"&&(
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500">연결된 물류 흐름 ({relEdges.length}건)</p>
            {relEdges.map((e,i)=>{
              const isFrom=e.from===node.id;
              return (
                <div key={i} className={"flex items-center gap-3 p-3 rounded-xl border "+(e.affected?"border-rose-200 bg-rose-50/30":"border-slate-200 bg-white")}>
                  <div className={"text-xs font-bold "+(isFrom?"text-blue-600":"text-emerald-600")}>{isFrom?"발신":"수신"}</div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-slate-700">{e.label}</div>
                    <div className="text-[10px] text-slate-400">{isFrom?e.from+"→"+e.to:e.from+"→"+e.to}</div>
                  </div>
                  {e.affected&&<span className="text-[10px] text-rose-600 font-bold">차단</span>}
                </div>
              );
            })}
          </div>
        )}
        {tab==="alt"&&(
          <div className="space-y-3">
            {shock&&isAffected?(
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/>AI 대안 제안</p>
                  <p className="text-sm text-blue-800 leading-relaxed">{shock.alternative}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-slate-500 mb-2">파급 타임라인</p>
                  {shock.timeline.map((t,i)=>(
                    <div key={i} className="flex gap-2 mb-2">
                      <div className="flex flex-col items-center">
                        <div className={"w-2 h-2 rounded-full shrink-0 "+(i===0?"bg-rose-500":"bg-slate-300")}/>
                        {i<shock.timeline.length-1&&<div className="w-0.5 flex-1 bg-slate-200 mt-1"/>}
                      </div>
                      <div className="pb-2">
                        <span className="text-[10px] font-bold text-slate-500">{t.day} </span>
                        <span className="text-xs font-medium text-slate-700">{t.event}</span>
                        <p className="text-[10px] text-slate-400">{t.impact}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ):(
              <div className="text-xs text-slate-400 text-center py-8">충격 시나리오 선택 시 AI 대안이 표시됩니다</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RiskHeatmap() {
  const suppliers = BASE_NODES.filter(n=>n.type==="supplier");
  const axes = ["재고 수준","납기 안정성","단일 의존도","지역 리스크"];
  const vals: Record<string,number[]> = {
    s1:[40,30,80,70], s2:[80,90,30,20], s3:[60,70,60,30], s4:[50,55,70,25],
  };
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        <div className="w-20 shrink-0"/>
        {axes.map(a=>(
          <div key={a} className="flex-1 text-[9px] text-slate-400 text-center leading-tight">{a}</div>
        ))}
      </div>
      {suppliers.map(s=>(
        <div key={s.id} className="flex gap-1 items-center">
          <div className="w-20 text-[10px] text-slate-500 truncate shrink-0">{s.label.slice(0,8)}</div>
          {(vals[s.id]||[50,50,50,50]).map((v,i)=>{
            const bg=v>=70?"bg-rose-400":v>=50?"bg-amber-300":"bg-emerald-300";
            return (
              <div key={i} className={"flex-1 h-6 rounded flex items-center justify-center text-[9px] font-bold text-white "+bg}>
                {v}
              </div>
            );
          })}
        </div>
      ))}
      <div className="flex gap-3 mt-1 text-[9px]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-rose-400 inline-block"/>고위험 (70+)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-300 inline-block"/>중위험 (50-69)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-300 inline-block"/>저위험 (~49)</span>
      </div>
    </div>
  );
}

function ShockTimeline({ shock }: { shock: typeof SHOCKS[0] }) {
  const days = shock.timeline;
  const W = 320; const padL = 10; const padR = 10;
  const iW = W - padL - padR;
  const xOf = (i:number) => padL + i*(iW/(days.length-1));
  return (
    <svg width={W} height={60} viewBox={"0 0 "+W+" 60"}>
      <line x1={padL} x2={W-padR} y1={24} y2={24} stroke="#e2e8f0" strokeWidth="2"/>
      {days.map((d,i)=>(
        <g key={i}>
          <circle cx={xOf(i)} cy={24} r={5} fill={i===0?"#ef4444":"#94a3b8"}/>
          <text x={xOf(i)} y={14} textAnchor="middle" fontSize="8" fill="#64748b" fontWeight="bold">{d.day}</text>
          <text x={xOf(i)} y={36} textAnchor="middle" fontSize="7" fill="#94a3b8">{d.event.slice(0,6)}</text>
        </g>
      ))}
    </svg>
  );
}

export default function SupplyChainTwin() {
  const [selectedShock, setSelectedShock] = useState<string|null>(null);
  const [selectedNode, setSelectedNode] = useState<string|null>(null);
  const [feed, setFeed] = useState<{msg:string;ts:string}[]>([]);
  const [stockTick, setStockTick] = useState(0);
  const [riskTick, setRiskTick] = useState(12);
  const tickRef = useRef(0);

  useEffect(()=>{
    const id=setInterval(()=>{
      tickRef.current++;
      setStockTick(p=>p+(Math.random()>0.5?1:-1));
      setRiskTick(p=>Math.round(p+(Math.random()-0.5)*0.2*10)/10);
      if(tickRef.current%2===0){
        const msg=FEED_POOL[Math.floor(Math.random()*FEED_POOL.length)];
        const ts=new Date().toLocaleTimeString("ko-KR",{hour12:false});
        setFeed(prev=>[{msg,ts},...prev].slice(0,6));
      }
    },1200);
    return ()=>clearInterval(id);
  },[]);

  const shock=SHOCKS.find(s=>s.id===selectedShock);
  const nodes=BASE_NODES.map(n=>({
    ...n,
    status:shock?.affectedNodes.includes(n.id)
      ?(shock.id==="sh3"?"warning":"critical") as NodeStatus
      :"normal" as NodeStatus,
  }));
  const edges=BASE_EDGES.map(e=>({
    ...e,
    affected:shock?shock.affectedEdges.includes(e.from+"→"+e.to):false,
  }));
  const selNode=nodes.find(n=>n.id===selectedNode)||null;
  const affectedCount=shock?shock.affectedNodes.length:0;
  const avgRisk=Math.round(BASE_NODES.filter(n=>n.risk).reduce((s,n)=>s+(n.risk||0),0)/BASE_NODES.filter(n=>n.risk).length);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Supply Chain Twin</h1>
          <p className="text-slate-500 mt-1 text-sm">공급망 디지털 트윈 — 실시간 재고·납기·리스크 시각화 + 충격 시뮬레이션</p>
        </div>
        {shock&&(
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5"/>충격 시뮬레이션 활성
          </div>
        )}
      </div>

      {/* KPI 4카드 */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {label:"총 노드",value:nodes.length+"개",cls:"text-slate-700"},
          {label:"정상 노드",value:nodes.filter(n=>n.status==="normal").length+"개",cls:"text-emerald-600"},
          {label:"위험 노드",value:affectedCount>0?(affectedCount+"개 (+"+affectedCount+")"):"0개",cls:affectedCount>0?"text-rose-600":"text-slate-400"},
          {label:"평균 리스크",value:riskTick.toFixed(1)+"%",cls:riskTick>10?"text-amber-600":"text-emerald-600"},
        ].map(({label,value,cls})=>(
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className={"text-2xl font-bold "+cls}>{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* 충격 시나리오 버튼 */}
      <div className="flex gap-3 flex-wrap items-center">
        <span className="text-xs font-semibold text-slate-500">충격 시뮬레이션:</span>
        {SHOCKS.map(s=>(
          <button key={s.id} onClick={()=>setSelectedShock(selectedShock===s.id?null:s.id)}
            className={"flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all border "+(selectedShock===s.id?s.color+" text-white border-transparent shadow-md":"bg-white text-slate-600 border-slate-200 hover:border-slate-400")}>
            {s.icon} {s.label}
          </button>
        ))}
        {shock&&(
          <button onClick={()=>setSelectedShock(null)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">
            <RefreshCw className="w-3 h-3"/>초기화
          </button>
        )}
      </div>

      {/* 충격 배너 + 타임라인 */}
      {shock&&(
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5"/>
            <div className="flex-1">
              <div className="text-sm font-semibold text-rose-700">{shock.desc}</div>
              <div className="text-xs text-rose-600 mt-0.5">영향 노드 {affectedCount}개 — 빨간색/주황색 노드 및 점선 경로 확인</div>
            </div>
          </div>
          <ShockTimeline shock={shock}/>
        </div>
      )}

      <div className="flex gap-4">
        {/* SVG 네트워크 맵 */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">공급망 네트워크 — 노드 클릭 시 상세</h3>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              {(["supplier","warehouse","factory","customer"] as NodeType[]).map(t=>(
                <div key={t} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm border" style={{background:NODE_COLORS[t].fill,borderColor:NODE_COLORS[t].stroke}}/>
                  <span>{{supplier:"공급사",warehouse:"창고",factory:"공장",customer:"고객"}[t]}</span>
                </div>
              ))}
            </div>
          </div>
          <svg viewBox="0 0 800 560" className="w-full" style={{minHeight:380}}>
            <defs>
              <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#94a3b8"/>
              </marker>
            </defs>
            {edges.map((e,i)=>{
              const from=nodes.find(n=>n.id===e.from)!;
              const to=nodes.find(n=>n.id===e.to)!;
              const mx=(from.x+to.x)/2;
              const my=(from.y+to.y)/2;
              return (
                <g key={i}>
                  <line x1={from.x+85} y1={from.y+22} x2={to.x} y2={to.y+22}
                    stroke={e.affected?"#ef4444":"#cbd5e1"} strokeWidth={e.affected?2.5:1.5}
                    strokeDasharray={e.affected?"6,3":"none"} markerEnd="url(#arrow)"/>
                  <text x={mx+43} y={my+18} fontSize="8" fill={e.affected?"#ef4444":"#94a3b8"} textAnchor="middle">{e.label}</text>
                </g>
              );
            })}
            {nodes.map(n=>{
              const nc=NODE_COLORS[n.type];
              const isSel=selectedNode===n.id;
              const isAffected=n.status!=="normal";
              return (
                <g key={n.id} style={{cursor:"pointer"}} onClick={()=>setSelectedNode(selectedNode===n.id?null:n.id)}>
                  <rect x={n.x} y={n.y} width={85} height={44} rx={6}
                    fill={nc.fill}
                    stroke={isAffected?STATUS_COLORS[n.status]:isSel?"#3b82f6":nc.stroke}
                    strokeWidth={isSel||isAffected?2.5:1.5}/>
                  <circle cx={n.x+77} cy={n.y+7} r={4} fill={STATUS_COLORS[n.status]}/>
                  <text x={n.x+8} y={n.y+17} fontSize="9" fontWeight="600" fill="#1e293b">{n.label.slice(0,9)}</text>
                  <text x={n.x+8} y={n.y+29} fontSize="8" fill="#64748b">{n.sub.slice(0,11)}</text>
                  {n.risk!==undefined&&n.risk>0&&(
                    <text x={n.x+8} y={n.y+40} fontSize="7.5" fill={n.risk>10?"#ef4444":"#94a3b8"}>위험 {n.risk}%</text>
                  )}
                </g>
              );
            })}
            {[["공급사",73],["창고",322],["공장",543],["고객",763]].map(([label,x])=>(
              <text key={String(label)} x={Number(x)} y={30} fontSize="10" fontWeight="700" fill="#94a3b8" textAnchor="middle">{label}</text>
            ))}
          </svg>
        </div>

        {/* 우측 패널 */}
        <div className="w-64 shrink-0 space-y-3">
          {/* 리스크 히트맵 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 mb-3">공급사 리스크 히트맵</p>
            <RiskHeatmap/>
          </div>

          {/* AI 대안 */}
          {shock&&(
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5"/>AI 대안 제안
              </div>
              <p className="text-xs text-blue-800 leading-relaxed">{shock.alternative}</p>
            </div>
          )}

          {/* 실시간 피드 */}
          <div className="bg-slate-900 rounded-xl overflow-hidden">
            <div className="px-3 py-2.5 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400"/>
              <span className="text-xs text-slate-300 font-medium">공급망 이벤트 피드</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-auto"/>
            </div>
            <div className="divide-y divide-slate-800 max-h-40 overflow-y-auto">
              {feed.length===0&&<div className="px-3 py-2 text-xs text-slate-500">대기 중...</div>}
              {feed.map((f,i)=>(
                <div key={i} className="px-3 py-2">
                  <div className="text-[10px] text-slate-500 font-mono">{f.ts}</div>
                  <div className="text-xs text-slate-300 mt-0.5">{f.msg}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedNode&&selNode&&(
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={()=>setSelectedNode(null)}/>
          <NodePanel node={selNode} shock={shock} onClose={()=>setSelectedNode(null)}/>
        </>
      )}
    </div>
  );
}
