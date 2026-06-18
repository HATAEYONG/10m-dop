"use client";

import { useState, useEffect, useRef } from "react";
import { Download, CheckCircle2, AlertTriangle, XCircle, TrendingUp, Zap, X, ChevronRight } from "lucide-react";

interface CompanyReport {
  id: string; name: string; type: string; score: number;
  completeness: number; reliability: number; coverage: number;
  timeliness: number; consistency: number; traceability: number;
  completedSteps: number; totalSteps: number;
  issues: { type: "error"|"warning"|"info"; msg: string; resolved: boolean }[];
  recommendation: string;
  trend: number[];
}

const INIT_COMPANIES: CompanyReport[] = [
  { id:"A", name:"A업체", type:"ERP + BOM + PDF", score:87,
    completeness:91, reliability:83, coverage:88, timeliness:86, consistency:90, traceability:84,
    completedSteps:10, totalSteps:10, trend:[72,78,83,87],
    issues:[
      { type:"warning", msg:"CUST_NM 컬럼 한글·영문 혼재 (5.1%)", resolved:false },
      { type:"warning", msg:"단위 불일치 2건 — mm/cm 혼용", resolved:true },
      { type:"info",    msg:"Human Review 큐 5건 대기 중", resolved:false },
    ],
    recommendation:"전체 파이프라인 완료. AI Agent 학습 데이터로 활용 가능합니다." },
  { id:"B", name:"B업체", type:"SAP + MES", score:79,
    completeness:82, reliability:75, coverage:80, timeliness:78, consistency:81, traceability:77,
    completedSteps:8, totalSteps:10, trend:[60,65,72,79],
    issues:[
      { type:"error",   msg:"Schema Profiler — D업체 연동 미완료", resolved:false },
      { type:"warning", msg:"MES 공정 코드 표준화 미완료", resolved:false },
      { type:"info",    msg:"SAP MARA 자재 마스터 매핑 완료", resolved:true },
    ],
    recommendation:"Schema Profiler와 Ontology Mapper 2개 단계 완료 후 재검증 권장." },
  { id:"C", name:"C업체", type:"수기 Excel", score:62,
    completeness:58, reliability:55, coverage:65, timeliness:70, consistency:60, traceability:63,
    completedSteps:6, totalSteps:10, trend:[45,50,55,62],
    issues:[
      { type:"error",   msg:"필수 필드 누락 — 거래처코드 18% 공란", resolved:false },
      { type:"error",   msg:"날짜 형식 불일치 — 5가지 패턴 혼재", resolved:false },
      { type:"warning", msg:"컬럼 수량 매핑 불명확 (Human Review 대기)", resolved:false },
      { type:"warning", msg:"수기 입력 오타 패턴 다수 (삼성전자/삼성전재 등)", resolved:false },
    ],
    recommendation:"Data Cleaner 재실행 및 수기 입력 원칙 수립 후 재온보딩 권장." },
  { id:"D", name:"D업체", type:"Odoo + CSV", score:74,
    completeness:77, reliability:71, coverage:74, timeliness:76, consistency:73, traceability:72,
    completedSteps:7, totalSteps:10, trend:[55,61,68,74],
    issues:[
      { type:"warning", msg:"Odoo 모듈 버전 불일치 (v16 → v17 마이그레이션 예정)", resolved:false },
      { type:"warning", msg:"CSV 인코딩 혼재 — UTF-8 / EUC-KR", resolved:true },
      { type:"info",    msg:"공급사 데이터 품질 양호", resolved:true },
    ],
    recommendation:"Odoo 버전 업그레이드 후 ERP 연동 재설정 필요." },
];

const AXES = ["completeness","reliability","coverage","timeliness","consistency","traceability"] as const;
const AXIS_LABELS: Record<typeof AXES[number],string> = {
  completeness:"완전성", reliability:"신뢰성", coverage:"커버리지",
  timeliness:"적시성", consistency:"일관성", traceability:"추적성",
};
const N = AXES.length;
const STEPS = ["Source Scanner","Schema Profiler","Document Parser","Data Cleaner","Entity Resolver","Canonical Mapper","Ontology Mapper","Graph Builder","Quality Validator","Human Review"];
const FEED_POOL = [
  "A업체 — Entity Resolution 완료 (신뢰도 91%)",
  "B업체 — Schema Profiler 단계 재시도 중",
  "C업체 — Data Cleaner 오류 3건 감지",
  "D업체 — Canonical Mapper 완료",
  "A업체 — Graph Builder 노드 1,240개 생성",
  "B업체 — Quality Validator 검증 통과",
  "C업체 — Human Review 에스컬레이션 2건",
];
const WEEKS = ["W1","W2","W3","W4"];
const LINE_COLORS = ["#3b82f6","#8b5cf6","#f59e0b","#10b981"];

function radarPoints(values: number[], cx: number, cy: number, r: number) {
  return values.map((v,i) => {
    const angle = (Math.PI*2*i)/N - Math.PI/2;
    const rv = (v/100)*r;
    return [cx+rv*Math.cos(angle), cy+rv*Math.sin(angle)] as [number,number];
  });
}

function RadarChart({ report }: { report: CompanyReport }) {
  const cx=110, cy=110, r=80;
  const vals = AXES.map(a => report[a]);
  const pts = radarPoints(vals, cx, cy, r);
  const dataPath = pts.map((p,i) => (i===0?"M":"L")+p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ")+"Z";
  const scoreColor = report.score>=80?"#10b981":report.score>=65?"#f59e0b":"#ef4444";
  return (
    <svg width="220" height="220" viewBox="0 0 220 220">
      {[20,40,60,80,100].map(lv => {
        const gpts = AXES.map((_,i) => {
          const angle=(Math.PI*2*i)/N-Math.PI/2;
          const rv=(lv/100)*r;
          return [cx+rv*Math.cos(angle), cy+rv*Math.sin(angle)] as [number,number];
        });
        return <polygon key={lv} points={gpts.map(p=>p.join(",")).join(" ")} fill="none" stroke="#e2e8f0" strokeWidth="1"/>;
      })}
      {AXES.map((_,i) => {
        const angle=(Math.PI*2*i)/N-Math.PI/2;
        return <line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(angle)} y2={cy+r*Math.sin(angle)} stroke="#e2e8f0" strokeWidth="1"/>;
      })}
      <path d={dataPath} fill={scoreColor} fillOpacity="0.15" stroke={scoreColor} strokeWidth="2"/>
      {pts.map((p,i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={scoreColor}/>)}
      {AXES.map((a,i) => {
        const angle=(Math.PI*2*i)/N-Math.PI/2;
        const lx=cx+(r+18)*Math.cos(angle);
        const ly=cy+(r+18)*Math.sin(angle);
        return <text key={a} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#64748b" fontFamily="sans-serif">{AXIS_LABELS[a]}</text>;
      })}
      <text x={cx} y={cy-6} textAnchor="middle" fontSize="18" fontWeight="bold" fill={scoreColor} fontFamily="sans-serif">{report.score}</text>
      <text x={cx} y={cy+12} textAnchor="middle" fontSize="8" fill="#94a3b8" fontFamily="sans-serif">AI-Readiness</text>
    </svg>
  );
}

function TrendChart({ companies }: { companies: CompanyReport[] }) {
  const W=340, H=100, padL=24, padB=18, padT=10;
  const iW=W-padL-8, iH=H-padB-padT;
  const yOf = (v:number) => padT+iH*(1-(v-40)/60);
  const xOf = (i:number) => padL+i*(iW/3);
  return (
    <svg width={W} height={H} viewBox={"0 0 "+W+" "+H}>
      {[40,60,80,100].map(v => (
        <g key={v}>
          <line x1={padL} x2={W-8} y1={yOf(v)} y2={yOf(v)} stroke="#f1f5f9" strokeWidth="1"/>
          <text x={padL-4} y={yOf(v)} textAnchor="end" dominantBaseline="middle" fontSize="8" fill="#94a3b8">{v}</text>
        </g>
      ))}
      {WEEKS.map((w,i) => (
        <text key={w} x={xOf(i)} y={H-4} textAnchor="middle" fontSize="8" fill="#94a3b8">{w}</text>
      ))}
      {companies.map((c,ci) => {
        const pts = c.trend.map((v,i) => [xOf(i), yOf(v)] as [number,number]);
        const d = pts.map((p,i) => (i===0?"M":"L")+p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ");
        return (
          <g key={c.id}>
            <path d={d} fill="none" stroke={LINE_COLORS[ci]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            {pts.map((p,i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={LINE_COLORS[ci]}/>)}
            <text x={xOf(3)+8} y={yOf(c.trend[3])} dominantBaseline="middle" fontSize="8" fill={LINE_COLORS[ci]} fontWeight="bold">{c.name}</text>
          </g>
        );
      })}
    </svg>
  );
}

function CompanyPanel({ company, onClose, onResolve }: {
  company: CompanyReport; onClose: ()=>void;
  onResolve: (id:string, idx:number)=>void;
}) {
  const [tab, setTab] = useState<"summary"|"issues"|"recommend">("summary");
  const scoreColor = company.score>=80?"text-emerald-600":company.score>=65?"text-amber-600":"text-rose-600";
  const unresolvedErrors = company.issues.filter(i=>!i.resolved&&i.type==="error").length;
  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50">
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
        <div>
          <div className="text-xs text-slate-500">{company.type}</div>
          <h2 className="text-lg font-bold text-slate-900">{company.name}</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className={"text-3xl font-bold "+scoreColor}>{company.score}</span>
            <span className="text-xs text-slate-400">AI-Readiness</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{company.completedSteps}/{company.totalSteps} 단계</span>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4"/></button>
      </div>
      <div className="flex border-b border-slate-100">
        {(["summary","issues","recommend"] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)}
            className={"flex-1 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors "+(tab===t?"border-blue-600 text-blue-700":"border-transparent text-slate-500 hover:text-slate-700")}>
            {t==="summary"?"요약":t==="issues"?"이슈 (미해결 "+company.issues.filter(i=>!i.resolved).length+")":"권고사항"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab==="summary"&&(
          <>
            <div className="flex justify-center"><RadarChart report={company}/></div>
            <div className="grid grid-cols-3 gap-2">
              {AXES.map(a => (
                <div key={a} className="text-center bg-slate-50 rounded-lg py-2">
                  <div className="text-xs text-slate-400">{AXIS_LABELS[a]}</div>
                  <div className="text-sm font-bold text-slate-800">{company[a]}</div>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500">파이프라인 완료 현황</p>
              {STEPS.map((s,i) => (
                <div key={s} className="flex items-center gap-2 text-sm">
                  {i<company.completedSteps
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/>
                    : <div className="w-4 h-4 rounded-full border-2 border-slate-200 shrink-0"/>}
                  <span className={i<company.completedSteps?"text-slate-700":"text-slate-300"}>{s}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {tab==="issues"&&(
          <div className="space-y-2">
            {company.issues.map((issue,i) => (
              <div key={i} className={"flex items-start gap-2 p-3 rounded-xl border "+(issue.resolved?"opacity-50 bg-slate-50 border-slate-100":"bg-white border-slate-200")}>
                {issue.type==="error"
                  ? <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5"/>
                  : issue.type==="warning"
                  ? <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"/>
                  : <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5"/>}
                <div className="flex-1">
                  <p className="text-sm text-slate-700">{issue.msg}</p>
                  {issue.resolved&&<p className="text-xs text-emerald-600 mt-0.5">해소됨</p>}
                </div>
                {!issue.resolved&&(
                  <button onClick={()=>onResolve(company.id,i)}
                    className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 shrink-0">
                    해소
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {tab==="recommend"&&(
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-700 mb-1">AI 권고사항</p>
              <p className="text-sm text-blue-800 leading-relaxed">{company.recommendation}</p>
            </div>
            {unresolvedErrors>0&&(
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-rose-700 mb-1">미해결 오류 {unresolvedErrors}건</p>
                <p className="text-sm text-rose-800">오류를 먼저 해소해야 다음 단계 진행이 가능합니다.</p>
              </div>
            )}
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 mb-2">점수 추이</p>
              {company.trend.map((v,i) => (
                <div key={i} className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-slate-400 w-6">{WEEKS[i]}</span>
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{width:v+"%"}}/>
                  </div>
                  <span className="text-xs font-medium text-slate-700 w-6 text-right">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OnboardingReport() {
  const [companies, setCompanies] = useState(INIT_COMPANIES);
  const [selected, setSelected] = useState<string|null>(null);
  const [filterGrade, setFilterGrade] = useState<"all"|"good"|"mid"|"low">("all");
  const [feed, setFeed] = useState<{msg:string; ts:string}[]>([]);
  const [avgDelta, setAvgDelta] = useState(0);
  const tickRef = useRef(0);

  useEffect(()=>{
    const id = setInterval(()=>{
      tickRef.current++;
      setAvgDelta(p => {
        const d = (Math.random()-0.45)*0.2;
        return Math.round((p+d)*10)/10;
      });
      if(tickRef.current%3===0){
        const msg = FEED_POOL[Math.floor(Math.random()*FEED_POOL.length)];
        const ts = new Date().toLocaleTimeString("ko-KR",{hour12:false});
        setFeed(prev => [{msg,ts},...prev].slice(0,8));
      }
    }, 1200);
    return ()=>clearInterval(id);
  },[]);

  const resolveIssue = (compId: string, idx: number) => {
    setCompanies(prev => prev.map(c => c.id!==compId?c:{
      ...c, issues: c.issues.map((iss,i) => i===idx?{...iss,resolved:true}:iss)
    }));
  };

  const overall = Math.round(companies.reduce((s,c)=>s+c.score,0)/companies.length);
  const totalIssues = companies.reduce((s,c)=>s+c.issues.length,0);
  const resolvedIssues = companies.reduce((s,c)=>s+c.issues.filter(i=>i.resolved).length,0);
  const resolveRate = Math.round((resolvedIssues/totalIssues)*100);
  const doneCompanies = companies.filter(c=>c.completedSteps===c.totalSteps).length;

  const filtered = companies.filter(c =>
    filterGrade==="all" ||
    (filterGrade==="good"&&c.score>=80) ||
    (filterGrade==="mid"&&c.score>=65&&c.score<80) ||
    (filterGrade==="low"&&c.score<65)
  );

  const selCompany = companies.find(c=>c.id===selected)||null;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Onboarding Report</h1>
          <p className="text-slate-500 mt-1 text-sm">업체별 AI-Readiness 점수와 온보딩 완료 현황을 확인합니다</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors">
          <Download className="w-4 h-4"/>보고서 다운로드 (PDF)
        </button>
      </div>

      {/* KPI 4카드 */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 text-white">
          <div className="flex items-end gap-1">
            <div className="text-3xl font-bold">{overall}</div>
            <div className={"text-sm font-medium mb-0.5 "+(avgDelta>=0?"text-blue-200":"text-rose-300")}>
              {avgDelta>=0?"+":""}{avgDelta.toFixed(1)}
            </div>
          </div>
          <div className="text-blue-200 text-xs mt-1">전체 평균 AI-Readiness</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-3xl font-bold text-emerald-600">{doneCompanies}<span className="text-sm text-slate-400 ml-1">/ {companies.length}</span></div>
          <div className="text-xs text-slate-500 mt-1">완료 업체</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-3xl font-bold text-rose-600">{totalIssues-resolvedIssues}<span className="text-sm text-slate-400 ml-1">건 미해결</span></div>
          <div className="text-xs text-slate-500 mt-1">전체 이슈 {totalIssues}건</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-3xl font-bold text-amber-600">{resolveRate}%</div>
          <div className="text-xs text-slate-500 mt-1">이슈 해소율</div>
          <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full transition-all" style={{width:resolveRate+"%"}}/>
          </div>
        </div>
      </div>

      {/* 트렌드 차트 + 피드 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-3.5 h-3.5 text-blue-500"/>
            <p className="text-xs font-semibold text-slate-500">주별 AI-Readiness 점수 추이</p>
            <div className="flex gap-3 ml-auto">
              {companies.map((c,ci)=>(
                <span key={c.id} className="flex items-center gap-1 text-xs text-slate-500">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{background:LINE_COLORS[ci]}}/>
                  {c.name}
                </span>
              ))}
            </div>
          </div>
          <TrendChart companies={companies}/>
        </div>
        <div className="bg-slate-900 rounded-xl overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400"/>
            <span className="text-sm text-slate-300 font-medium">파이프라인 이벤트 피드</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-auto"/>
          </div>
          <div className="divide-y divide-slate-800 max-h-[108px] overflow-y-auto">
            {feed.length===0&&<div className="px-4 py-2 text-xs text-slate-500">대기 중...</div>}
            {feed.map((f,i)=>(
              <div key={i} className="px-4 py-2">
                <div className="text-[10px] text-slate-500 font-mono">{f.ts}</div>
                <div className="text-xs text-slate-300 mt-0.5">{f.msg}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 필터 + 업체 카드 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">등급 필터</span>
          {([["all","전체"],["good","우수 (80+)"],["mid","보통 (65-79)"],["low","미흡 (~64)"]] as const).map(([v,label])=>(
            <button key={v} onClick={()=>setFilterGrade(v)}
              className={"text-xs px-3 py-1 rounded-full font-medium transition-colors "+(filterGrade===v?"bg-blue-600 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200")}>
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {filtered.map(c => (
            <button key={c.id} onClick={()=>setSelected(c.id)}
              className={"bg-white rounded-xl border p-4 text-left transition-all hover:shadow-sm "+(selected===c.id?"border-blue-400 ring-2 ring-blue-100":"border-slate-200")}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-900">{c.name}</span>
                <span className={"text-lg font-bold "+(c.score>=80?"text-emerald-600":c.score>=65?"text-amber-600":"text-rose-600")}>{c.score}</span>
              </div>
              <div className="text-xs text-slate-400">{c.type}</div>
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={"h-full rounded-full "+(c.score>=80?"bg-emerald-500":c.score>=65?"bg-amber-400":"bg-rose-500")} style={{width:c.score+"%"}}/>
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-slate-400">{c.completedSteps}/{c.totalSteps} 단계</span>
                <span className="text-xs text-rose-500">{c.issues.filter(i=>!i.resolved).length}건 미해결</span>
              </div>
              <div className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                상세 보기<ChevronRight className="w-3 h-3"/>
              </div>
            </button>
          ))}
          {filtered.length===0&&(
            <div className="col-span-4 text-center py-8 text-slate-400 text-sm">해당 등급의 업체가 없습니다</div>
          )}
        </div>
      </div>

      {selected&&selCompany&&(
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={()=>setSelected(null)}/>
          <CompanyPanel company={selCompany} onClose={()=>setSelected(null)} onResolve={resolveIssue}/>
        </>
      )}
    </div>
  );
}
