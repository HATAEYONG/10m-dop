"use client";

import { useState, useEffect, useRef } from "react";
import { Newspaper, AlertTriangle, TrendingUp, TrendingDown, Search, Clock, Building2, Package, X, CheckCircle2, Zap } from "lucide-react";

type RiskLevel = "high"|"medium"|"low"|"info";

interface NewsItem {
  id:string; title:string; source:string; publishedAt:string; risk:RiskLevel;
  categories:string[]; relatedCompanies:string[]; relatedMaterials:string[];
  summary:string; impactScore:number; impactItems:string[];
  actionDone:boolean; actionMemo:string;
}

const INIT_NEWS: NewsItem[] = [
  { id:"n1", title:"중국 알루미늄 수출 규제 강화… AL6061 시리즈 수급 차질 우려", source:"금속경제신문", publishedAt:"2시간 전",
    risk:"high", categories:["원자재","규제","수출"], relatedCompanies:["A업체","B업체"], relatedMaterials:["AL6061-T6"],
    summary:"중국 정부가 고강도 알루미늄 합금 수출에 쿼터제를 도입한다고 발표했습니다. 국내 제조업체의 AL6061 시리즈 원자재 수급에 단기 차질이 예상되며, 대체 공급선 확보가 시급합니다.",
    impactScore:88, impactItems:["AL6061-T6 재고 -270EA 위험","A업체 납기 2026-07-05 차질","B업체 BOM 수정 필요"],
    actionDone:false, actionMemo:"" },
  { id:"n2", title:"삼성전자, 2026 하반기 PCB 발주량 30% 확대 예고", source:"전자부품 인사이트", publishedAt:"5시간 전",
    risk:"info", categories:["수요","반도체","PCB"], relatedCompanies:["D업체"], relatedMaterials:["PCB 기판 A타입"],
    summary:"삼성전자 부품구매팀이 하반기 PCB 발주량을 전년 대비 30% 확대한다고 밝혔습니다. D업체를 포함한 1차 협력사에 대한 수주 증가가 예상됩니다.",
    impactScore:42, impactItems:["D업체 생산능력 검토 필요","PCB 원판 추가 발주 검토"],
    actionDone:false, actionMemo:"" },
  { id:"n3", title:"물류 파업으로 인천항 컨테이너 적체 — 납기 3~5일 지연 예상", source:"물류신문", publishedAt:"어제",
    risk:"medium", categories:["물류","납기","항만"], relatedCompanies:["A업체","C업체","D업체"], relatedMaterials:[],
    summary:"인천항 항만 노조 파업으로 컨테이너 처리 속도가 평시의 40% 수준으로 저하됐습니다. 수입 원자재 및 부품의 납기가 3~5일 추가 지연될 전망입니다.",
    impactScore:65, impactItems:["수입 원자재 3~5일 지연","A업체 납기 버퍼 소진 위험","대체 물류 루트 검토"],
    actionDone:false, actionMemo:"" },
  { id:"n4", title:"CNC 가공 전문 협력사 대도정밀, 경영난으로 부도 위기 보도", source:"중소기업 뉴스", publishedAt:"2일 전",
    risk:"high", categories:["공급망","부도","협력사"], relatedCompanies:["B업체"], relatedMaterials:[],
    summary:"B업체의 2차 협력사인 대도정밀이 자금난으로 어음 부도 가능성이 제기됐습니다. B업체 공정 중 CNC 가공 외주 물량의 30%를 담당하고 있어 공급망 점검이 필요합니다.",
    impactScore:82, impactItems:["B업체 CNC 외주 30% 차질","대체 협력사 긴급 발굴 필요","계약 리스크 법무 검토"],
    actionDone:true, actionMemo:"법무팀 검토 요청 완료" },
  { id:"n5", title:"구리 선물 가격 6개월 만에 최저… 전선·커넥터 원가 절감 기대", source:"원자재 시황", publishedAt:"3일 전",
    risk:"low", categories:["원자재","가격"], relatedCompanies:[], relatedMaterials:[],
    summary:"런던금속거래소(LME)에서 구리 선물 가격이 톤당 8,200달러로 하락해 6개월 최저치를 기록했습니다. 전선·커넥터 업체의 원재료비 절감 효과가 기대됩니다.",
    impactScore:18, impactItems:["전선·커넥터 원가 절감 기회"],
    actionDone:false, actionMemo:"" },
];

const TREND_DATA = [
  {date:"06-12", high:1, medium:0, low:1, info:0},
  {date:"06-13", high:0, medium:1, low:0, info:1},
  {date:"06-14", high:1, medium:1, low:0, info:0},
  {date:"06-15", high:0, medium:0, low:1, info:1},
  {date:"06-16", high:1, medium:0, low:0, info:0},
  {date:"06-17", high:1, medium:1, low:1, info:0},
  {date:"06-18", high:2, medium:1, low:1, info:1},
];

const FEED_POOL = [
  "新 뉴스 수집 — '포스코 원료탄 가격 협상 난항'",
  "新 뉴스 수집 — '현대차 부품 발주 계획 수정'",
  "위험 신호 — 'SUS304 시장가 2.1% 상승'",
  "新 뉴스 수집 — '베트남 제조업 PMI 49.2 — 위축'",
  "新 뉴스 수집 — '삼성전기 PCB 생산 라인 증설 확정'",
  "위험 신호 — '반도체 리드프레임 수급 불안'",
];

const RC: Record<RiskLevel,{label:string;color:string;bg:string;border:string;dot:string}> = {
  high:   {label:"위험", color:"text-rose-700",    bg:"bg-rose-50",    border:"border-rose-200",   dot:"bg-rose-500"},
  medium: {label:"주의", color:"text-amber-700",   bg:"bg-amber-50",   border:"border-amber-200",  dot:"bg-amber-500"},
  low:    {label:"안전", color:"text-emerald-700", bg:"bg-emerald-50", border:"border-emerald-200", dot:"bg-emerald-500"},
  info:   {label:"기회", color:"text-blue-700",    bg:"bg-blue-50",    border:"border-blue-200",   dot:"bg-blue-500"},
};
const RISK_ORDER: RiskLevel[] = ["high","medium","low","info"];

const ALL_CATS = [...new Set(INIT_NEWS.flatMap(n=>n.categories))];

function TrendChart() {
  const W=400; const H=60; const bw=40; const gap=10; const stackColors=["#ef4444","#f59e0b","#10b981","#3b82f6"];
  return (
    <svg width={W} height={H+20} viewBox={`0 0 ${W} ${H+20}`} className="w-full">
      {TREND_DATA.map((d,i)=>{
        const vals=[d.high,d.medium,d.low,d.info]; const total=vals.reduce((a,b)=>a+b,0)||1;
        const x=i*(bw+gap); let y=H;
        return (
          <g key={d.date}>
            {vals.map((v,vi)=>{
              if(v===0) return null;
              const bh=(v/total)*H; y-=bh;
              return <rect key={vi} x={x} y={y} width={bw} height={bh} fill={stackColors[vi]} rx={vi===0?4:0} opacity={0.85}/>;
            })}
            <text x={x+bw/2} y={H+14} textAnchor="middle" fontSize={8} fill="#94a3b8">{d.date}</text>
          </g>
        );
      })}
    </svg>
  );
}

function ImpactGauge({ score }: { score:number }) {
  const r=28; const cx=36; const cy=36; const circ=2*Math.PI*r;
  const pct=score/100; const dash=circ*pct; const gap2=circ*(1-pct);
  const color=score>=80?"#ef4444":score>=50?"#f59e0b":"#10b981";
  return (
    <svg width={72} height={72} viewBox="0 0 72 72">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={6}/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${gap2}`} strokeLinecap="round"
        transform="rotate(-90 36 36)" opacity={0.85}/>
      <text x={cx} y={cy+4} textAnchor="middle" fontSize={13} fontWeight="700" fill={color}>{score}</text>
    </svg>
  );
}

function NewsPanel({ item, onClose, onSave }: { item:NewsItem; onClose:()=>void; onSave:(id:string,done:boolean,memo:string)=>void }) {
  const [tab, setTab] = useState<"summary"|"related"|"action">("summary");
  const [done, setDone] = useState(item.actionDone);
  const [memo, setMemo] = useState(item.actionMemo);
  const rc = RC[item.risk];
  const RiskIcon = item.risk==="high"||item.risk==="medium"?AlertTriangle:item.risk==="info"?TrendingUp:TrendingDown;

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50">
      <div className={`px-5 py-4 border-b ${rc.border} ${rc.bg} flex items-start justify-between`}>
        <div className="flex-1 pr-3">
          <div className={`flex items-center gap-2 mb-1`}>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${rc.color} ${rc.bg} border ${rc.border}`}>
              <RiskIcon className="w-3 h-3"/>{rc.label}
            </span>
            <span className="text-xs text-slate-400">{item.source} · {item.publishedAt}</span>
          </div>
          <p className="text-sm font-semibold text-slate-900 leading-snug">{item.title}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/50 text-slate-400 shrink-0"><X className="w-4 h-4"/></button>
      </div>
      <div className="flex border-b border-slate-100">
        {(["summary","related","action"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`flex-1 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${tab===t?"border-blue-600 text-blue-700":"border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t==="summary"?"AI 요약":t==="related"?"연관 정보":"조치 계획"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab==="summary"&&(
          <>
            <div className="flex items-center gap-4 bg-slate-50 rounded-xl p-4">
              <ImpactGauge score={item.impactScore}/>
              <div>
                <div className="text-xs text-slate-500 mb-1">공급망 영향 점수</div>
                <div className={`text-sm font-bold ${item.impactScore>=80?"text-rose-600":item.impactScore>=50?"text-amber-600":"text-emerald-600"}`}>
                  {item.impactScore>=80?"높음 — 즉시 조치 필요":item.impactScore>=50?"중간 — 모니터링 강화":"낮음 — 관찰 유지"}
                </div>
                <div className="text-xs text-slate-400 mt-1">임계치: 위험 ≥80 / 주의 ≥50</div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="text-xs font-semibold text-slate-600 mb-2">AI 요약</div>
              <p className="text-sm text-slate-700 leading-relaxed">{item.summary}</p>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-600">영향 항목</div>
              {item.impactItems.map((it,i)=>(
                <div key={i} className="flex items-center gap-2 text-xs bg-slate-50 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0"/>
                  <span className="text-slate-700">{it}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {tab==="related"&&(
          <>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2"><Building2 className="w-3.5 h-3.5"/>연관 업체</div>
              {item.relatedCompanies.length>0
                ? <div className="flex flex-wrap gap-2">{item.relatedCompanies.map(c=><span key={c} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">{c}</span>)}</div>
                : <span className="text-xs text-slate-400">해당 없음</span>}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2"><Package className="w-3.5 h-3.5"/>연관 품목·자재</div>
              {item.relatedMaterials.length>0
                ? <div className="flex flex-wrap gap-2">{item.relatedMaterials.map(m=><span key={m} className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">{m}</span>)}</div>
                : <span className="text-xs text-slate-400">해당 없음</span>}
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-2">카테고리</div>
              <div className="flex flex-wrap gap-1">{item.categories.map(c=><span key={c} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded"># {c}</span>)}</div>
            </div>
          </>
        )}
        {tab==="action"&&(
          <>
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
              <button onClick={()=>setDone(p=>!p)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${done?"bg-emerald-500 border-emerald-500":"border-slate-300 hover:border-emerald-400"}`}>
                {done&&<CheckCircle2 className="w-3.5 h-3.5 text-white"/>}
              </button>
              <span className={`text-sm font-medium ${done?"text-emerald-700 line-through opacity-60":"text-slate-800"}`}>조치 완료로 표시</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1.5">조치 메모</div>
              <textarea value={memo} onChange={e=>setMemo(e.target.value)} rows={4}
                placeholder="조치 내용, 담당자, 완료 예정일 등을 기록하세요..."
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 resize-none"/>
            </div>
            <button onClick={()=>onSave(item.id,done,memo)}
              className="w-full py-2 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700">
              저장
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function NewsMonitor() {
  const [news, setNews]           = useState(INIT_NEWS);
  const [selected, setSelected]   = useState<string|null>(null);
  const [filterRisk, setFilterRisk] = useState<RiskLevel|"all">("all");
  const [filterCat, setFilterCat] = useState<string|"all">("all");
  const [search, setSearch]       = useState("");
  const [feed, setFeed]           = useState<{msg:string;ts:string}[]>([]);
  const [totalCollected, setTotalCollected] = useState(127);
  const tickRef = useRef(0);

  useEffect(()=>{
    const id=setInterval(()=>{
      tickRef.current++;
      if(tickRef.current%4===0){
        const msg=FEED_POOL[Math.floor(Math.random()*FEED_POOL.length)];
        const ts=new Date().toLocaleTimeString("ko-KR",{hour12:false});
        setFeed(prev=>[{msg,ts},...prev].slice(0,8));
        setTotalCollected(p=>p+1);
      }
    },1200);
    return ()=>clearInterval(id);
  },[]);

  const saveAction = (id:string, done:boolean, memo:string) => {
    setNews(prev=>prev.map(n=>n.id===id?{...n,actionDone:done,actionMemo:memo}:n));
  };

  const filtered = news.filter(n=>
    (filterRisk==="all"||n.risk===filterRisk)&&
    (filterCat==="all"||n.categories.includes(filterCat))&&
    (search===""||n.title.includes(search)||n.summary.includes(search))
  );

  const selItem = news.find(n=>n.id===selected);
  const riskCounts = Object.fromEntries(RISK_ORDER.map(r=>[r,news.filter(n=>n.risk===r).length])) as Record<RiskLevel,number>;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">News Monitor</h1>
          <p className="text-slate-500 mt-1 text-sm">공급망 관련 뉴스를 실시간 수집하고 업체·품목 연관 위험 신호를 탐지합니다</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-slate-800 rounded-xl px-3 py-2">
          <Newspaper className="w-3.5 h-3.5 text-slate-400"/>
          <span className="text-slate-300 font-medium">수집 {totalCollected}건</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1"/>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-5 gap-3">
        {RISK_ORDER.map(r=>{
          const rc=RC[r];
          return (
            <div key={r} className={`rounded-xl border p-4 ${rc.bg} ${rc.border}`}>
              <div className={`text-2xl font-bold ${rc.color}`}>{riskCounts[r]}<span className="text-sm font-normal ml-1 opacity-70">건</span></div>
              <div className={`text-xs font-medium mt-0.5 ${rc.color}`}>{rc.label} 신호</div>
            </div>
          );
        })}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-2xl font-bold text-slate-700">{news.filter(n=>n.actionDone).length}<span className="text-sm font-normal ml-1 text-slate-400">건</span></div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">조치 완료</div>
        </div>
      </div>

      {/* 7일 트렌드 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-700">7일 위험 신호 트렌드</span>
          <div className="flex gap-3 text-xs">
            {[["#ef4444","위험"],["#f59e0b","주의"],["#10b981","안전"],["#3b82f6","기회"]].map(([c,l])=>(
              <span key={l as string} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm inline-block" style={{background:c as string}}/>
                <span className="text-slate-500">{l as string}</span>
              </span>
            ))}
          </div>
        </div>
        <TrendChart/>
      </div>

      <div className="flex gap-4">
        {/* 목록 */}
        <div className="w-80 shrink-0 space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="뉴스 검색..."
              className="w-full text-xs border border-slate-200 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:border-blue-400"/>
          </div>
          <div className="flex gap-1 flex-wrap">
            {(["all",...RISK_ORDER] as const).map(r=>(
              <button key={r} onClick={()=>setFilterRisk(r)}
                className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${filterRisk===r?r==="all"?"bg-slate-800 text-white":`${RC[r].bg} ${RC[r].color} border ${RC[r].border}`:"bg-white border border-slate-200 text-slate-500 hover:border-slate-400"}`}>
                {r==="all"?"전체":RC[r].label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap">
            <button onClick={()=>setFilterCat("all")}
              className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${filterCat==="all"?"bg-slate-200 text-slate-700":"bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>
              전체
            </button>
            {ALL_CATS.map(c=>(
              <button key={c} onClick={()=>setFilterCat(c)}
                className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${filterCat===c?"bg-blue-100 text-blue-700":"bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>
                #{c}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {filtered.map(n=>{
              const rc=RC[n.risk];
              return (
                <div key={n.id} onClick={()=>setSelected(n.id)}
                  className={`bg-white rounded-xl border p-3.5 cursor-pointer transition-all hover:shadow-sm ${selected===n.id?"border-blue-400 ring-2 ring-blue-100":"border-slate-200"}`}>
                  <div className="flex items-start gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${rc.dot}`}/>
                    <div className="text-xs font-semibold text-slate-800 leading-relaxed">{n.title}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium border ${rc.bg} ${rc.color} ${rc.border}`}>{rc.label}</span>
                      {n.actionDone&&<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/>}
                    </div>
                    <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3"/>{n.publishedAt}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 실시간 피드 */}
          <div className="bg-slate-900 rounded-xl overflow-hidden">
            <div className="px-3 py-2 flex items-center gap-2">
              <Zap className="w-3 h-3 text-emerald-400"/>
              <span className="text-xs text-slate-300 font-medium">실시간 수집</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-auto"/>
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

        {/* 상세 (선택 없을 때 안내) */}
        {!selItem&&(
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm bg-slate-50 rounded-xl border border-slate-200">
            뉴스를 클릭하면 상세 정보를 확인합니다
          </div>
        )}
        {selItem&&(
          <div className="flex-1 space-y-4">
            <div className={`rounded-xl border p-5 ${RC[selItem.risk].bg} ${RC[selItem.risk].border}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="font-semibold text-slate-900 text-base leading-snug">{selItem.title}</h3>
                <div className="flex items-center gap-2 shrink-0">
                  {selItem.actionDone&&<span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/>완료</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${RC[selItem.risk].bg} ${RC[selItem.risk].color} ${RC[selItem.risk].border}`}>{RC[selItem.risk].label}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                <span className="flex items-center gap-1"><Newspaper className="w-3 h-3"/>{selItem.source}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3"/>{selItem.publishedAt}</span>
              </div>
              <div className="flex items-center gap-4">
                <ImpactGauge score={selItem.impactScore}/>
                <div>
                  <div className="text-xs text-slate-500 mb-1">공급망 영향 점수</div>
                  <div className={`text-sm font-bold ${selItem.impactScore>=80?"text-rose-600":selItem.impactScore>=50?"text-amber-600":"text-emerald-600"}`}>
                    {selItem.impactScore>=80?"높음":selItem.impactScore>=50?"중간":"낮음"} ({selItem.impactScore}점)
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-xs">{selItem.summary.slice(0,80)}...</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-semibold text-slate-700 mb-3">영향 항목</div>
              <div className="space-y-2">
                {selItem.impactItems.map((it,i)=>(
                  <div key={i} className="flex items-center gap-2 text-xs bg-slate-50 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0"/>
                    <span className="text-slate-700">{it}</span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={()=>setSelected(selItem.id)}
              className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
              상세 패널 열기 →
            </button>
          </div>
        )}
      </div>

      {selected&&selItem&&(
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={()=>setSelected(null)}/>
          <NewsPanel item={selItem} onClose={()=>setSelected(null)} onSave={saveAction}/>
        </>
      )}
    </div>
  );
}
