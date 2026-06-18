"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, Zap } from "lucide-react";

type NodeType = "customer"|"supplier"|"product"|"material"|"process"|"machine"|"order"|"measurement";

interface GraphNode { id:string; label:string; type:NodeType; x:number; y:number; count?:number; desc?:string; }
interface GraphEdge { from:string; to:string; label:string; }

const NODES: GraphNode[] = [
  { id:"cust1",  label:"삼성전자\n(CUST_0001)",   type:"customer",    x:60,  y:110, count:3, desc:"사업자 129-81-00742, 서울 서초구" },
  { id:"cust2",  label:"현대자동차\n(CUST_0002)", type:"customer",    x:60,  y:250, count:2, desc:"사업자 211-81-00099, 서울 서초구" },
  { id:"order1", label:"수주 #ORD-001",             type:"order",       x:240, y:140, desc:"2026-06-18 수주, 납기 2026-07-05" },
  { id:"order2", label:"수주 #ORD-002",             type:"order",       x:240, y:290, desc:"2026-06-15 수주, 납기 2026-07-10" },
  { id:"prod1",  label:"완제품 A\n(PROD_0001)",    type:"product",     x:420, y:110, desc:"AL6061 가공 완제품, BOM 3레벨" },
  { id:"prod2",  label:"완제품 B\n(PROD_0002)",    type:"product",     x:420, y:270, desc:"SUS304 용접 조립품" },
  { id:"mat1",   label:"AL6061\n(MAT_0001)",       type:"material",    x:600, y:70,  count:4, desc:"알루미늄 합금, 단위 KG" },
  { id:"mat2",   label:"SUS304\n(MAT_0010)",       type:"material",    x:600, y:210, desc:"스테인리스강, 단위 KG" },
  { id:"mat3",   label:"가스킷-001\n(PROD_0001)",  type:"material",    x:600, y:330, desc:"패킹 부품, 단위 EA" },
  { id:"proc1",  label:"CNC 가공\n공정",           type:"process",     x:780, y:110, desc:"CNC 선삭·밀링 복합 공정" },
  { id:"proc2",  label:"용접\n공정",               type:"process",     x:780, y:260, desc:"TIG 용접, 작업표준서 WI-2024-003" },
  { id:"mach1",  label:"CNC-001\n설비",            type:"machine",     x:950, y:70,  desc:"가동률 87%, 온도 64°C" },
  { id:"mach2",  label:"WLD-002\n설비",            type:"machine",     x:950, y:210, desc:"가동률 73%, 진동 0.5mm/s" },
  { id:"meas1",  label:"검사성적서\n#QC-2406",     type:"measurement", x:950, y:340, desc:"CMM 측정, 합격 판정" },
  { id:"sup1",   label:"포스코\n(SUP_0001)",       type:"supplier",    x:600, y:450, count:2, desc:"법인 110111-0000190, 리드타임 14일" },
];

const EDGES: GraphEdge[] = [
  { from:"cust1",  to:"order1", label:"orders" },
  { from:"cust2",  to:"order2", label:"orders" },
  { from:"order1", to:"prod1",  label:"requests" },
  { from:"order2", to:"prod2",  label:"requests" },
  { from:"prod1",  to:"mat1",   label:"uses" },
  { from:"prod1",  to:"mat2",   label:"uses" },
  { from:"prod2",  to:"mat1",   label:"uses" },
  { from:"prod2",  to:"mat3",   label:"uses" },
  { from:"mat1",   to:"proc1",  label:"input_to" },
  { from:"mat2",   to:"proc2",  label:"input_to" },
  { from:"proc1",  to:"mach1",  label:"uses" },
  { from:"proc2",  to:"mach2",  label:"uses" },
  { from:"proc1",  to:"meas1",  label:"produces" },
  { from:"sup1",   to:"mat1",   label:"supplies" },
  { from:"sup1",   to:"mat2",   label:"supplies" },
];

const NS: Record<NodeType,{bg:string;border:string;text:string;dot:string;label:string}> = {
  customer:    {bg:"#eff6ff",border:"#3b82f6",text:"#1e40af",dot:"#3b82f6",label:"Customer"},
  supplier:    {bg:"#fdf4ff",border:"#a855f7",text:"#7e22ce",dot:"#a855f7",label:"Supplier"},
  product:     {bg:"#f0fdf4",border:"#22c55e",text:"#15803d",dot:"#22c55e",label:"Product"},
  material:    {bg:"#fff7ed",border:"#f97316",text:"#c2410c",dot:"#f97316",label:"Material"},
  process:     {bg:"#f0f9ff",border:"#0ea5e9",text:"#0369a1",dot:"#0ea5e9",label:"Process"},
  machine:     {bg:"#fafaf9",border:"#78716c",text:"#44403c",dot:"#78716c",label:"Machine"},
  order:       {bg:"#fefce8",border:"#eab308",text:"#854d0e",dot:"#eab308",label:"Order"},
  measurement: {bg:"#fff1f2",border:"#f43f5e",text:"#be123c",dot:"#f43f5e",label:"Measurement"},
};

const NODE_W=110; const NODE_H=52;
const center = (n:GraphNode)=>({x:n.x+NODE_W/2, y:n.y+NODE_H/2});

const FEED_POOL = [
  "노드 추가 — CUST_0048 (두산중공업) 온보딩",
  "관계 생성 — SUP_0001 → supplies → MAT_0023",
  "노드 병합 — MAT_0015 / MAT_0016 → MAT_0015 통합",
  "엣지 업데이트 — ORD-003 → requests → PROD_0001",
  "품질 태그 — MEAS #QC-2407 합격 판정",
  "노드 추가 — PROC_0008 (도장 공정) 생성",
  "관계 강화 — CNC-001 uses 빈도 ×3 갱신",
];

function DistChart() {
  const counts = (Object.keys(NS) as NodeType[]).map(t=>({t, c:NODES.filter(n=>n.type===t).length})).filter(d=>d.c>0);
  const max = Math.max(...counts.map(d=>d.c),1);
  const W=260; const bh=14; const gap=5; const labelW=80;
  const H=counts.length*(bh+gap);
  return (
    <svg width={W+labelW+30} height={H} viewBox={`0 0 ${W+labelW+30} ${H}`} className="w-full">
      {counts.map((d,i)=>{
        const y=i*(bh+gap); const bw=(d.c/max)*W;
        return (
          <g key={d.t}>
            <text x={labelW-4} y={y+bh-2} textAnchor="end" fontSize={9} fill="#64748b">{NS[d.t].label}</text>
            <rect x={labelW} y={y} width={W} height={bh} rx={3} fill="#f1f5f9"/>
            <rect x={labelW} y={y} width={bw} height={bh} rx={3} fill={NS[d.t].dot} opacity={0.8}/>
            <text x={labelW+bw+4} y={y+bh-2} fontSize={9} fill={NS[d.t].dot} fontWeight="600">{d.c}</text>
          </g>
        );
      })}
    </svg>
  );
}

function NodePanel({ node, onClose }: { node:GraphNode; onClose:()=>void }) {
  const [tab, setTab] = useState<"info"|"conn"|"path">("info");
  const style = NS[node.type];
  const connEdges = EDGES.filter(e=>e.from===node.id||e.to===node.id);
  const hop2Ids = new Set(connEdges.flatMap(e=>[e.from,e.to]));
  const hop2Edges = EDGES.filter(e=>
    (hop2Ids.has(e.from)||hop2Ids.has(e.to)) && e.from!==node.id && e.to!==node.id
  ).slice(0,6);

  return (
    <div className="fixed inset-y-0 right-0 w-[440px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50">
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full shrink-0" style={{background:style.dot}}/>
          <div>
            <div className="font-bold text-slate-900">{node.label.split("\n")[0]}</div>
            <div className="text-xs text-slate-400 mt-0.5">{node.label.split("\n")[1]||""} · {style.label}</div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4"/></button>
      </div>
      <div className="flex border-b border-slate-100">
        {(["info","conn","path"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`flex-1 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${tab===t?"border-blue-600 text-blue-700":"border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t==="info"?"노드 정보":t==="conn"?`직접 연결 (${connEdges.length})`:"2-hop 경로"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tab==="info"&&(
          <>
            <div className="bg-slate-50 rounded-xl p-3 text-xs">
              <div className="text-slate-400 mb-1">설명</div>
              <div className="text-slate-800">{node.desc||"설명 없음"}</div>
            </div>
            {[["노드 ID",node.id],["타입",style.label],["통합 원천",node.count?node.count+"개":"—"],["연결 수",connEdges.length+"건"]].map(([k,v])=>(
              <div key={k as string} className="flex justify-between text-xs px-1">
                <span className="text-slate-400">{k as string}</span>
                <span className="font-semibold text-slate-800">{v as string}</span>
              </div>
            ))}
          </>
        )}
        {tab==="conn"&&(
          <div className="space-y-2">
            {connEdges.map((e,i)=>{
              const isOut = e.from===node.id;
              const other = NODES.find(n=>n.id===(isOut?e.to:e.from))!;
              return (
                <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 text-xs">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{background:NS[other.type].dot}}/>
                  <span className="text-slate-400">{isOut?"→":"←"}</span>
                  <span className="text-blue-600 font-medium">{e.label}</span>
                  <span className="text-slate-700 truncate">{other.label.split("\n")[0]}</span>
                  <span className="text-[10px] text-slate-400 ml-auto shrink-0">{NS[other.type].label}</span>
                </div>
              );
            })}
          </div>
        )}
        {tab==="path"&&(
          <div className="space-y-2">
            <div className="text-xs text-slate-500 mb-2">2-hop 이내 연결 노드</div>
            {hop2Edges.map((e,i)=>{
              const fromN = NODES.find(n=>n.id===e.from)!;
              const toN   = NODES.find(n=>n.id===e.to)!;
              return (
                <div key={i} className="flex items-center gap-1.5 text-xs bg-slate-50 rounded-lg px-3 py-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{background:NS[fromN.type].dot}}/>
                  <span className="text-slate-600 truncate max-w-[80px]">{fromN.label.split("\n")[0]}</span>
                  <span className="text-blue-500 font-medium shrink-0">—{e.label}→</span>
                  <div className="w-1.5 h-1.5 rounded-full" style={{background:NS[toN.type].dot}}/>
                  <span className="text-slate-600 truncate max-w-[80px]">{toN.label.split("\n")[0]}</span>
                </div>
              );
            })}
            {hop2Edges.length===0&&<div className="text-xs text-slate-400 text-center pt-4">추가 경로 없음</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GraphPreview() {
  const [selected, setSelected]     = useState<string|null>(null);
  const [filterType, setFilterType] = useState<NodeType|"all">("all");
  const [search, setSearch]         = useState("");
  const [hoveredEdge, setHoveredEdge] = useState<string|null>(null);
  const [feed, setFeed]             = useState<{msg:string;ts:string}[]>([]);
  const [panelOpen, setPanelOpen]   = useState(false);
  const tickRef = useRef(0);

  useEffect(()=>{
    const id=setInterval(()=>{
      tickRef.current++;
      if(tickRef.current%4===0){
        const msg=FEED_POOL[Math.floor(Math.random()*FEED_POOL.length)];
        const ts=new Date().toLocaleTimeString("ko-KR",{hour12:false});
        setFeed(prev=>[{msg,ts},...prev].slice(0,8));
      }
    },1200);
    return ()=>clearInterval(id);
  },[]);

  const selNode = NODES.find(n=>n.id===selected);
  const connEdges = selected ? EDGES.filter(e=>e.from===selected||e.to===selected) : [];
  const hop1Ids = new Set(connEdges.flatMap(e=>[e.from,e.to]));

  const visibleNodes = NODES.filter(n=>{
    const typeOk = filterType==="all"||n.type===filterType;
    const searchOk = search===""||n.label.toLowerCase().includes(search.toLowerCase())||n.id.toLowerCase().includes(search.toLowerCase());
    return typeOk&&searchOk;
  });
  const visibleIds = new Set(visibleNodes.map(n=>n.id));
  const visibleEdges = EDGES.filter(e=>visibleIds.has(e.from)&&visibleIds.has(e.to));

  const handleNodeClick = (id:string) => {
    if(selected===id){ setSelected(null); setPanelOpen(false); }
    else { setSelected(id); setPanelOpen(true); }
  };

  const typeCounts = (Object.keys(NS) as NodeType[]).map(t=>NODES.filter(n=>n.type===t).length);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Graph Preview</h1>
          <p className="text-slate-500 mt-1 text-sm">10M 지식 그래프 — 노드를 클릭해 연결 관계를 탐색합니다</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-slate-800 rounded-xl px-3 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
          <span className="text-slate-300 font-medium">그래프 활성</span>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-5 gap-3">
        {[
          {label:"노드 (엔티티)",  value:NODES.length,   sub:"전체 도메인",       cls:"text-slate-700 bg-white border-slate-200"},
          {label:"관계 (엣지)",    value:EDGES.length,   sub:"방향성 관계",       cls:"text-blue-700 bg-blue-50 border-blue-200"},
          {label:"도메인 유형",    value:[...new Set(NODES.map(n=>n.type))].length, sub:"8M 커버리지", cls:"text-violet-700 bg-violet-50 border-violet-200"},
          {label:"병합 통합",      value:NODES.filter(n=>n.count).reduce((s,n)=>s+(n.count||0),0), sub:"중복 원천 통합", cls:"text-emerald-700 bg-emerald-50 border-emerald-200"},
          {label:"연결 밀도",      value:"1.0",          sub:"엣지/노드 비율",    cls:"text-amber-700 bg-amber-50 border-amber-200"},
        ].map(({label,value,sub,cls})=>(
          <div key={label} className={`rounded-xl border p-4 ${cls}`}>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs font-medium mt-0.5">{label}</div>
            <div className="text-[10px] opacity-70 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* 필터 + 검색 */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="노드 검색..."
            className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 w-40"/>
        </div>
        <span className="text-xs text-slate-400">|</span>
        <button onClick={()=>setFilterType("all")}
          className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${filterType==="all"?"bg-slate-800 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
          전체
        </button>
        {(Object.entries(NS) as [NodeType,typeof NS[NodeType]][]).map(([t,s])=>(
          <button key={t} onClick={()=>setFilterType(t)}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${filterType===t?"text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            style={filterType===t?{background:s.dot}:{}}>
            {s.label}
          </button>
        ))}
        <span className="text-xs text-slate-400 ml-auto">{visibleNodes.length}개 표시</span>
      </div>

      <div className="flex gap-4">
        {/* 그래프 */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-slate-500">범례</span>
            {(Object.entries(NS) as [NodeType,typeof NS[NodeType]][]).map(([t,s])=>(
              <div key={t} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{background:s.dot}}/>
                <span className="text-xs text-slate-500">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="relative overflow-auto" style={{height:520}}>
            <svg width={1100} height={510} className="absolute top-0 left-0">
              <defs>
                <marker id="arr"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#cbd5e1"/></marker>
                <marker id="arr2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#3b82f6"/></marker>
                <marker id="arr3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#93c5fd"/></marker>
              </defs>
              {visibleEdges.map((edge,i)=>{
                const from=NODES.find(n=>n.id===edge.from)!; const to=NODES.find(n=>n.id===edge.to)!;
                const fc=center(from); const tc=center(to);
                const mx=(fc.x+tc.x)/2; const my=(fc.y+tc.y)/2;
                const isDirect = selected&&(edge.from===selected||edge.to===selected);
                const key=`${edge.from}-${edge.to}`;
                const stroke=isDirect?"#3b82f6":hoveredEdge===key?"#93c5fd":"#e2e8f0";
                const mId=isDirect?"arr2":hoveredEdge===key?"arr3":"arr";
                return (
                  <g key={i} onMouseEnter={()=>setHoveredEdge(key)} onMouseLeave={()=>setHoveredEdge(null)}>
                    <line x1={fc.x} y1={fc.y} x2={tc.x} y2={tc.y} stroke={stroke}
                      strokeWidth={isDirect?2:1.5} markerEnd={`url(#${mId})`} className="cursor-pointer"/>
                    {(hoveredEdge===key||isDirect)&&(
                      <text x={mx} y={my-4} textAnchor="middle" fontSize="9" fill={isDirect?"#3b82f6":"#94a3b8"} fontWeight="500">{edge.label}</text>
                    )}
                  </g>
                );
              })}
              {visibleNodes.map(node=>{
                const style=NS[node.type];
                const isSel=selected===node.id;
                const isHop1=selected?hop1Ids.has(node.id):true;
                const opacity=selected&&!isHop1?0.25:1;
                return (
                  <g key={node.id} transform={`translate(${node.x},${node.y})`} className="cursor-pointer"
                    onClick={()=>handleNodeClick(node.id)} opacity={opacity}>
                    <rect width={NODE_W} height={NODE_H} rx={8}
                      fill={style.bg} stroke={isSel?style.border:"#e2e8f0"} strokeWidth={isSel?2.5:1.5}/>
                    {isSel&&<rect width={NODE_W} height={NODE_H} rx={8} fill={style.border} opacity={0.08}/>}
                    {node.count&&<circle cx={NODE_W-8} cy={8} r={9} fill={style.dot}/>}
                    {node.count&&<text x={NODE_W-8} y={12} textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">{node.count}</text>}
                    {node.label.split("\n").map((line,li)=>(
                      <text key={li} x={NODE_W/2} y={li===0?20:36} textAnchor="middle"
                        fontSize={li===0?"10":"9"} fill={li===0?style.text:"#94a3b8"} fontWeight={li===0?"700":"400"}>
                        {line}
                      </text>
                    ))}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* 우측 사이드 */}
        <div className="w-64 shrink-0 space-y-3">
          {/* 도메인 분포 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-semibold text-slate-700 mb-3">노드 유형 분포</div>
            <DistChart/>
          </div>
          {/* 관계 패턴 */}
          <div className="bg-slate-900 rounded-xl p-4 text-white text-xs space-y-1.5">
            <p className="font-semibold text-slate-300 mb-2">주요 관계 패턴</p>
            {["Supplier → supplies → Material","Material → input_to → Process","Process → uses → Machine","Process → produces → Measurement","Customer → orders → Order","Order → requests → Product","Product → uses → Material"].map(r=>(
              <div key={r} className="text-slate-400 font-mono text-[10px] leading-relaxed">{r}</div>
            ))}
          </div>
          {/* 실시간 피드 */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
              <Zap className="w-3 h-3 text-blue-500"/>
              <span className="text-xs font-semibold text-slate-700">그래프 이벤트</span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse ml-auto"/>
            </div>
            <div className="divide-y divide-slate-50 max-h-40 overflow-y-auto">
              {feed.length===0&&<div className="px-3 py-2 text-xs text-slate-400">대기 중...</div>}
              {feed.map((f,i)=>(
                <div key={i} className="px-3 py-2 text-[10px]">
                  <div className="text-slate-400 font-mono">{f.ts}</div>
                  <div className="text-slate-600 mt-0.5">{f.msg}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 노드 상세 패널 */}
      {panelOpen&&selNode&&(
        <>
          <div className="fixed inset-0 bg-black/10 z-40" onClick={()=>{setSelected(null);setPanelOpen(false);}}/>
          <NodePanel node={selNode} onClose={()=>{setSelected(null);setPanelOpen(false);}}/>
        </>
      )}
    </div>
  );
}
