"use client";

import { useState, useEffect, useRef } from "react";
import { Check, HelpCircle, X, Network, Lightbulb, Database, ChevronRight, Activity } from "lucide-react";

type MapStatus = "approved" | "pending" | "review";

interface Mapping {
  id: number; canonical: string; domain: string; relation: string;
  confidence: number; status: MapStatus; desc: string;
  examples: string[]; altDomains: string[]; reviewReason?: string;
}

const DOMAINS = ["Material","Product","Customer","Supplier","Order","BOM","Process","Machine","Measurement","Maintenance","Money","Method"];

const RELATION_COLORS: Record<string,string> = {
  "is_a": "bg-blue-100 text-blue-700",
  "part_of": "bg-violet-100 text-violet-700",
  "defines_structure_of": "bg-indigo-100 text-indigo-700",
  "produces": "bg-green-100 text-green-700",
  "triggers": "bg-orange-100 text-orange-700",
  "located_at": "bg-slate-100 text-slate-700",
  "documents": "bg-teal-100 text-teal-700",
  "references": "bg-pink-100 text-pink-700",
};

const BASE_MAPPINGS: Mapping[] = [
  { id:1, canonical:"Customer", domain:"Customer", relation:"is_a", confidence:98, status:"approved", desc:"구매 거래처 → Customer 도메인", examples:["삼성전자","현대모비스","LG화학"], altDomains:["Supplier"] },
  { id:2, canonical:"Product", domain:"Product", relation:"is_a", confidence:95, status:"approved", desc:"완제품/반제품 → Product 도메인", examples:["PCB 기판 A타입","AL6061-T6 판재"], altDomains:["Material"] },
  { id:3, canonical:"Material", domain:"Material", relation:"is_a", confidence:97, status:"approved", desc:"원자재/부자재 → Material 도메인", examples:["고무 오링","SUS304 파이프"], altDomains:["Product"] },
  { id:4, canonical:"BOM", domain:"BOM", relation:"defines_structure_of", confidence:93, status:"approved", desc:"자재명세서 → BOM 도메인", examples:["BOM-2026-001","BOM-ENG-REV3"], altDomains:["Process"] },
  { id:5, canonical:"Order", domain:"Order", relation:"is_a", confidence:91, status:"approved", desc:"판매/구매 주문 → Order 도메인", examples:["PO-2026-0847","SO-2026-1234"], altDomains:[] },
  { id:6, canonical:"OrderLine", domain:"Order", relation:"part_of", confidence:89, status:"approved", desc:"주문 라인 → Order 도메인 하위", examples:["PO-0847-L01","SO-1234-L03"], altDomains:[] },
  { id:7, canonical:"Plant", domain:"Process", relation:"located_at", confidence:82, status:"pending", desc:"공장/사업장 → Process 또는 별도 Location 도메인 검토", examples:["구미1공장","평택사업장"], altDomains:["Machine","Material"] },
  { id:8, canonical:"WorkOrder", domain:"Process", relation:"is_a", confidence:87, status:"pending", desc:"작업지시 → Process 도메인", examples:["WO-2026-3812","WO-MES-0041"], altDomains:["Maintenance"] },
  { id:9, canonical:"Equipment", domain:"Machine", relation:"is_a", confidence:90, status:"pending", desc:"설비/기계 → Machine 도메인", examples:["CNC-001","프레스-A3"], altDomains:["Maintenance"] },
  { id:10, canonical:"InspectionResult", domain:"Measurement", relation:"produces", confidence:85, status:"pending", desc:"검사성적서 결과 → Measurement 도메인", examples:["INSP-2026-0512","QC-REP-0089"], altDomains:["Process"] },
  { id:11, canonical:"FailureLog", domain:"Maintenance", relation:"triggers", confidence:78, status:"pending", desc:"설비 고장 로그 → Maintenance 도메인", examples:["FAIL-2026-0331","ALM-CNC-012"], altDomains:["Machine","Measurement"] },
  { id:12, canonical:"CostRecord", domain:"Money", relation:"is_a", confidence:83, status:"pending", desc:"원가 기록 → Money 도메인", examples:["COST-2026-Q1","MFGCOST-0091"], altDomains:["Order"] },
  { id:13, canonical:"SOP", domain:"Method", relation:"documents", confidence:88, status:"pending", desc:"표준작업절차 → Method 도메인", examples:["SOP-WELD-001","SOP-QC-REV2"], altDomains:["Process"] },
  { id:14, canonical:"Supplier", domain:"Supplier", relation:"is_a", confidence:94, status:"approved", desc:"공급업체 → Supplier 도메인", examples:["A업체","B업체"], altDomains:["Customer"] },
  { id:15, canonical:"MeasurementPoint", domain:"Measurement", relation:"references", confidence:81, status:"pending", desc:"측정 포인트 → Measurement 도메인", examples:["MP-001-TEMP","MP-002-PRES"], altDomains:["Machine"] },
  { id:16, canonical:"MaintenancePlan", domain:"Maintenance", relation:"is_a", confidence:86, status:"pending", desc:"정비 계획 → Maintenance 도메인", examples:["PM-2026-Q2","CBM-CNC-001"], altDomains:["Process"] },
];

const AI_SUGGEST_POOL = [
  () => ({ canonical: "Routing", domain: "Process", relation: "is_a", confidence: 84, desc: "공정 라우팅 → Process 도메인 제안" }),
  () => ({ canonical: "QualityPlan", domain: "Measurement", relation: "documents", confidence: 79, desc: "품질 계획 → Measurement 도메인 제안" }),
  () => ({ canonical: "StockLot", domain: "Material", relation: "part_of", confidence: 91, desc: "재고 lot → Material 도메인 제안" }),
  () => ({ canonical: "CostCenter", domain: "Money", relation: "references", confidence: 77, desc: "원가 센터 → Money 도메인 제안" }),
];

function ConfBar({ v }: { v: number }) {
  const color = v >= 90 ? "bg-emerald-500" : v >= 75 ? "bg-blue-400" : "bg-amber-400";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${v}%` }}/>
      </div>
      <span className={`text-xs font-bold ${v>=90?"text-emerald-600":v>=75?"text-blue-600":"text-amber-600"}`}>{v}%</span>
    </div>
  );
}

function DistChart({ items }: { items: Mapping[] }) {
  const high = items.filter(m=>m.confidence>=90).length;
  const mid  = items.filter(m=>m.confidence>=75&&m.confidence<90).length;
  const low  = items.filter(m=>m.confidence<75).length;
  const total = items.length || 1;
  const bars = [
    { label:"≥90%", count:high, color:"bg-emerald-500" },
    { label:"75-89%", count:mid, color:"bg-blue-400" },
    { label:"<75%", count:low, color:"bg-amber-400" },
  ];
  return (
    <div className="space-y-1.5">
      {bars.map(b => (
        <div key={b.label} className="flex items-center gap-2 text-xs">
          <span className="w-14 text-slate-500 text-right">{b.label}</span>
          <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
            <div className={`h-full ${b.color} rounded`} style={{ width: `${(b.count/total)*100}%`, transition:"width 0.5s" }}/>
          </div>
          <span className="w-6 text-slate-600 font-medium">{b.count}</span>
        </div>
      ))}
    </div>
  );
}

function DetailPanel({ item, onClose, onApprove, onReview }:
  { item: Mapping; onClose:()=>void; onApprove:(id:number)=>void; onReview:(id:number,reason:string,domain:string)=>void }) {
  const [tab, setTab] = useState<"relation"|"examples"|"suggest">("relation");
  const [altDomain, setAltDomain] = useState(item.domain);
  const [reason, setReason] = useState(item.reviewReason ?? "");

  return (
    <div className="fixed inset-y-0 right-0 w-[440px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50">
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
        <div>
          <div className="font-mono font-bold text-slate-900">{item.canonical}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold text-blue-700 bg-blue-50`}>{item.domain}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${RELATION_COLORS[item.relation]||"bg-slate-100 text-slate-700"}`}>{item.relation}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4"/></button>
      </div>

      <div className="flex border-b border-slate-200 px-4">
        {([["relation","관계 정보"],["examples","예시 데이터"],["suggest","AI 제안"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${tab===key?"border-blue-600 text-blue-600":"border-transparent text-slate-500 hover:text-slate-700"}`}>
            {key==="relation"&&<Network className="w-3.5 h-3.5"/>}
            {key==="examples"&&<Database className="w-3.5 h-3.5"/>}
            {key==="suggest"&&<Lightbulb className="w-3.5 h-3.5"/>}
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab==="relation" && (
          <>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-xs">
              <div className="font-semibold text-slate-700 mb-2">관계 정보</div>
              {[["Canonical 객체", item.canonical],["대상 도메인", item.domain],["관계 유형", item.relation],["신뢰도", `${item.confidence}%`]].map(([k,v])=>(
                <div key={k} className="flex justify-between">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-800 font-medium">{v}</span>
                </div>
              ))}
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="text-xs font-semibold text-slate-700 mb-2">설명</div>
              <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-700 mb-1.5">신뢰도</div>
              <ConfBar v={item.confidence}/>
            </div>
            {item.altDomains.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <div className="text-xs font-semibold text-amber-700 mb-1.5">대안 도메인 후보</div>
                <div className="flex flex-wrap gap-1.5">
                  {item.altDomains.map(d=>(
                    <span key={d} className="text-xs px-2 py-0.5 rounded-full bg-white border border-amber-200 text-amber-700">{d}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {tab==="examples" && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700 mb-2">실제 데이터 예시</div>
            {item.examples.map((ex,i)=>(
              <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2">
                <Database className="w-3.5 h-3.5 text-blue-400 shrink-0"/>
                <span className="text-xs font-mono text-slate-800">{ex}</span>
                <span className="ml-auto text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">{item.domain}</span>
              </div>
            ))}
          </div>
        )}

        {tab==="suggest" && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-700">AI 매핑 제안</div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
              <Lightbulb className="w-3.5 h-3.5 inline mr-1"/>
              현재 매핑의 신뢰도 기반으로 최적 도메인을 추천합니다.
            </div>
            <div className="space-y-1.5">
              {DOMAINS.slice(0,4).map((d,i)=>(
                <div key={d} className={`flex items-center gap-3 rounded-lg px-3 py-2 border ${d===item.domain?"bg-emerald-50 border-emerald-200":"bg-white border-slate-200"}`}>
                  <span className="text-xs font-medium text-slate-800 w-24">{d}</span>
                  <div className="flex-1 h-1.5 bg-slate-100 rounded overflow-hidden">
                    <div className="h-full bg-blue-400 rounded" style={{width:`${[item.confidence, item.confidence-5, item.confidence-12, item.confidence-18][i]}%`}}/>
                  </div>
                  <span className="text-xs text-slate-500">{[item.confidence, item.confidence-5, item.confidence-12, item.confidence-18][i]}%</span>
                  {d===item.domain && <span className="text-[10px] text-emerald-600 font-semibold">현재</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {item.status !== "approved" && (
        <div className="p-4 border-t border-slate-200 space-y-3">
          {item.status === "review" && (
            <div>
              <div className="text-xs font-semibold text-slate-700 mb-1.5">재검토 사유</div>
              <textarea value={reason} onChange={e=>setReason(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-400 resize-none h-16"
                placeholder="재검토 사유를 입력하세요..."/>
              <div className="mt-1.5">
                <select value={altDomain} onChange={e=>setAltDomain(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400">
                  {DOMAINS.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={()=>onApprove(item.id)} className="flex-1 text-xs py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition-colors">
              승인
            </button>
            <button onClick={()=>onReview(item.id, reason, altDomain)} className="flex-1 text-xs py-2 bg-violet-50 border border-violet-200 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors">
              재검토 등록
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OntologyMapping() {
  const [items, setItems] = useState<Mapping[]>(BASE_MAPPINGS);
  const [selected, setSelected] = useState<number|null>(null);
  const [statusFilter, setStatusFilter] = useState<MapStatus|"all">("all");
  const [aiSuggests, setAiSuggests] = useState<{canonical:string;domain:string;relation:string;confidence:number;desc:string;ts:string}[]>([]);
  const tickRef = useRef(0);

  useEffect(()=>{
    const id = setInterval(()=>{
      tickRef.current++;
      if(tickRef.current%7===0){
        const tmpl = AI_SUGGEST_POOL[Math.floor(Math.random()*AI_SUGGEST_POOL.length)]();
        const now = new Date();
        const ts = `${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}:${now.getSeconds().toString().padStart(2,"0")}`;
        setAiSuggests(prev=>[{...tmpl,ts},...prev].slice(0,10));
      }
    },1200);
    return ()=>clearInterval(id);
  },[]);

  const approve = (id:number) => setItems(prev=>prev.map(m=>m.id===id?{...m,status:"approved" as MapStatus}:m));
  const markReview = (id:number, reason:string, domain:string) =>
    setItems(prev=>prev.map(m=>m.id===id?{...m,status:"review" as MapStatus,reviewReason:reason,domain}:m));

  const domainStats = DOMAINS.map(d=>({
    domain:d,
    total: items.filter(m=>m.domain===d).length,
    approved: items.filter(m=>m.domain===d&&m.status==="approved").length,
  })).filter(d=>d.total>0);

  const counts = {
    all: items.length,
    approved: items.filter(m=>m.status==="approved").length,
    pending: items.filter(m=>m.status==="pending").length,
    review: items.filter(m=>m.status==="review").length,
  };
  const approvalRate = Math.round((counts.approved/counts.all)*100);

  const filtered = items.filter(m=>statusFilter==="all"||m.status===statusFilter);
  const selectedItem = items.find(m=>m.id===selected);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ontology Mapping</h1>
          <p className="text-slate-500 mt-1 text-sm">Canonical 객체를 10M 온톨로지 도메인에 배치</p>
        </div>
        <div className="text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
          승인율 <span className={`font-bold ${approvalRate>=70?"text-emerald-600":"text-amber-600"}`}>{approvalRate}%</span>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {label:"전체 매핑",value:counts.all,cls:"text-slate-800"},
          {label:"승인 완료",value:counts.approved,cls:"text-emerald-600"},
          {label:"승인 대기",value:counts.pending,cls:"text-amber-600"},
          {label:"재검토",value:counts.review,cls:"text-violet-600"},
        ].map(({label,value,cls})=>(
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="text-xs text-slate-500 mb-1">{label}</div>
            <div className={`text-2xl font-bold ${cls}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* 도메인 진행률 */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-700 mb-3">도메인별 승인 진행률</div>
          <div className="space-y-2">
            {domainStats.map(({domain,total,approved})=>(
              <div key={domain} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-24 font-medium">{domain}</span>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${approved===total?"bg-emerald-500":"bg-blue-400"}`}
                    style={{width:`${(approved/total)*100}%`}}/>
                </div>
                <span className="text-xs text-slate-500 w-12 text-right">{approved}/{total}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 신뢰도 분포 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-700 mb-3">신뢰도 분포</div>
          <DistChart items={items}/>
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
            평균 신뢰도 <span className="font-bold text-slate-800">{Math.round(items.reduce((a,m)=>a+m.confidence,0)/items.length)}%</span>
          </div>
        </div>
      </div>

      {/* 10M 도메인 히트맵 */}
      <div className="bg-slate-900 rounded-xl p-5">
        <div className="text-xs font-semibold text-slate-300 mb-3">10M Ontology — 도메인 커버리지</div>
        <div className="grid grid-cols-6 gap-2">
          {DOMAINS.map(d=>{
            const stat = domainStats.find(s=>s.domain===d);
            const pct = stat ? stat.approved/stat.total : 0;
            return (
              <div key={d} className={`rounded-lg p-2.5 text-center cursor-pointer transition-all ${!stat?"bg-slate-800 text-slate-600":pct===1?"bg-blue-600 text-white":"bg-slate-700 text-blue-300"}`}
                onClick={()=>stat&&setStatusFilter("all")}>
                <div className="text-xs font-medium">{d}</div>
                {stat && <div className="text-[10px] mt-0.5 opacity-70">{stat.approved}/{stat.total}</div>}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 mt-2">파란색: 완료 · 밝은색: 진행 중 · 어두운색: 미사용</p>
        <svg viewBox="0 0 600 48" className="w-full mt-3">
          {domainStats.map((d,i)=>{
            const pct=d.approved/d.total; const bw=pct*48; const x=i*62+4;
            return (
              <g key={d.domain}>
                <rect x={x} y={0} width={56} height={48} rx={4} fill="#1e293b"/>
                <rect x={x} y={48-bw} width={56} height={bw} rx={4} fill="#3b82f6" opacity={0.9}/>
                <text x={x+28} y={24} textAnchor="middle" fontSize="7.5" fill="#94a3b8" dominantBaseline="middle">{d.domain.slice(0,5)}</text>
                <text x={x+28} y={42} textAnchor="middle" fontSize="7" fill="#60a5fa">{Math.round(pct*100)}%</text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 필터 */}
      <div className="flex gap-2">
        {([["all","전체"],["approved","승인"],["pending","대기"],["review","재검토"]] as const).map(([s,label])=>(
          <button key={s} onClick={()=>setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${statusFilter===s?"bg-blue-600 text-white border-blue-600":"bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}>
            {label} <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter===s?"bg-white/20":"bg-slate-100"}`}>{counts[s]}</span>
          </button>
        ))}
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["Canonical 객체","10M 도메인","관계 유형","신뢰도","설명","상태",""].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(m=>(
              <tr key={m.id} onClick={()=>setSelected(s=>s===m.id?null:m.id)}
                className={`hover:bg-slate-50 transition-colors cursor-pointer ${selected===m.id?"bg-blue-50":""}`}>
                <td className="px-4 py-3 font-mono font-semibold text-slate-900 text-sm">{m.canonical}</td>
                <td className="px-4 py-3"><span className="text-sm font-semibold text-blue-700">{m.domain}</span></td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RELATION_COLORS[m.relation]||"bg-slate-100 text-slate-700"}`}>{m.relation}</span>
                </td>
                <td className="px-4 py-3"><ConfBar v={m.confidence}/></td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-xs">{m.desc}</td>
                <td className="px-4 py-3">
                  {m.status==="approved"&&<span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">승인</span>}
                  {m.status==="pending"&&<span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">대기</span>}
                  {m.status==="review"&&<span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">재검토</span>}
                </td>
                <td className="px-4 py-3"><ChevronRight className="w-3.5 h-3.5 text-slate-300"/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AI 제안 피드 */}
      {aiSuggests.length > 0 && (
        <div className="bg-slate-900 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse"/>
            <span className="text-xs font-semibold text-slate-300">AI 매핑 제안 피드</span>
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {aiSuggests.slice(0,5).map((s,i)=>(
              <div key={i} className="flex items-center gap-3 text-xs font-mono">
                <span className="text-slate-500 whitespace-nowrap">{s.ts}</span>
                <span className="text-blue-300 font-medium">{s.canonical}</span>
                <span className="text-slate-400">→</span>
                <span className="text-emerald-400">{s.domain}</span>
                <span className="text-slate-500">({s.confidence}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 상세 패널 */}
      {selectedItem && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={()=>setSelected(null)}/>
          <DetailPanel item={selectedItem} onClose={()=>setSelected(null)} onApprove={approve} onReview={markReview}/>
        </>
      )}
    </div>
  );
}
