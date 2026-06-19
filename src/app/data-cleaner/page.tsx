"use client";

import { useState, useEffect, useRef } from "react";
import { RefreshCw, X, Play, CheckCircle, AlertTriangle, Clock, Zap } from "lucide-react";

type RuleType = "date" | "unit" | "dedup" | "trim" | "code";
type RuleStatus = "active" | "disabled";

interface Rule {
  id: number; type: RuleType; name: string; description: string;
  status: RuleStatus; affected: number; completed: number; errors: number;
  before: string; after: string; source: string; priority: number;
  sampleRows: { raw: string; cleaned: string; status: "ok"|"error" }[];
  logs: { time: string; msg: string; level: "info"|"warn"|"error" }[];
}

interface ErrRecord {
  id: string; rule: string; field: string; raw: string; reason: string; ignored: boolean;
}

const RULES: Rule[] = [
  {
    id:1, type:"date", name:"날짜 형식 표준화", status:"active", affected:1243, completed:1180, errors:63, priority:1,
    description:"다양한 날짜 형식을 ISO 8601 (YYYY-MM-DD)로 통일",
    before:"20240315, 2024/03/15, 15-03-2024, 24년3월15일", after:"2024-03-15",
    source:"A업체 Excel, C업체 수기장",
    sampleRows:[
      {raw:"20240315",     cleaned:"2024-03-15", status:"ok"},
      {raw:"2024/03/15",   cleaned:"2024-03-15", status:"ok"},
      {raw:"15-03-2024",   cleaned:"2024-03-15", status:"ok"},
      {raw:"24년3월15일",   cleaned:"2024-03-15", status:"ok"},
      {raw:"2024.3.5",     cleaned:"2024-03-05", status:"ok"},
      {raw:"unknown date", cleaned:"—",          status:"error"},
    ],
    logs:[
      {time:"14:02:11", msg:"규칙 적용 시작 — 대상 1,243건", level:"info"},
      {time:"14:02:13", msg:"1,180건 변환 완료", level:"info"},
      {time:"14:02:13", msg:"63건 패턴 불일치 — 수동 검토 필요", level:"warn"},
    ],
  },
  {
    id:2, type:"unit", name:"중량 단위 통일 (→ kg)", status:"active", affected:381, completed:381, errors:0, priority:2,
    description:"g, mg, ton 등 혼재 단위를 kg으로 통일",
    before:"1500g, 0.0015ton, 1.5kg", after:"1.5 kg",
    source:"A업체 BOM, B업체 SAP",
    sampleRows:[
      {raw:"1500g",    cleaned:"1.5 kg",   status:"ok"},
      {raw:"0.0015ton",cleaned:"1.5 kg",   status:"ok"},
      {raw:"1500mg",   cleaned:"0.0015 kg",status:"ok"},
    ],
    logs:[
      {time:"14:02:14", msg:"381건 전량 변환 완료 — 오류 없음", level:"info"},
    ],
  },
  {
    id:3, type:"unit", name:"통화 정규화 (→ KRW)", status:"active", affected:692, completed:689, errors:3, priority:3,
    description:"₩, KRW, 원 등 혼재 표기를 KRW 숫자로 통일",
    before:"₩1,200,000 / 1200000원 / KRW 1.2M", after:"1200000",
    source:"A업체 ERP, D업체 Odoo",
    sampleRows:[
      {raw:"₩1,200,000",  cleaned:"1200000", status:"ok"},
      {raw:"1200000원",   cleaned:"1200000", status:"ok"},
      {raw:"KRW 1.2M",   cleaned:"1200000", status:"ok"},
      {raw:"USD 1000",   cleaned:"—",        status:"error"},
    ],
    logs:[
      {time:"14:02:15", msg:"689건 정규화 완료", level:"info"},
      {time:"14:02:15", msg:"3건 외화 표기 감지 — 변환 불가", level:"warn"},
    ],
  },
  {
    id:4, type:"dedup", name:"거래처 중복 제거", status:"active", affected:47, completed:47, errors:0, priority:4,
    description:"동일 사업자번호 거래처 중 최신 레코드를 마스터로, 나머지 병합",
    before:"삼성전자(주) / Samsung Electronics / 삼성전자", after:"삼성전자 [CUST_0001]",
    source:"전체 업체 통합",
    sampleRows:[
      {raw:"삼성전자(주)",        cleaned:"삼성전자 [CUST_0001]", status:"ok"},
      {raw:"Samsung Electronics",cleaned:"삼성전자 [CUST_0001]", status:"ok"},
      {raw:"삼성전자",           cleaned:"삼성전자 [CUST_0001]", status:"ok"},
    ],
    logs:[
      {time:"14:02:16", msg:"47건 중복 병합 완료", level:"info"},
    ],
  },
  {
    id:5, type:"trim", name:"공백·특수문자 정리", status:"active", affected:2105, completed:2105, errors:0, priority:5,
    description:"앞뒤 공백 제거, 전각 문자 반각 변환, 연속 공백 단일화",
    before:"  삼성전자 (주)　", after:"삼성전자 (주)",
    source:"전체",
    sampleRows:[
      {raw:"  삼성전자 (주)　", cleaned:"삼성전자 (주)", status:"ok"},
      {raw:"LG　전자",         cleaned:"LG 전자",       status:"ok"},
    ],
    logs:[
      {time:"14:02:17", msg:"2,105건 정리 완료", level:"info"},
    ],
  },
  {
    id:6, type:"code", name:"NULL 표준화", status:"active", affected:318, completed:300, errors:18, priority:6,
    description:"'N/A', '없음', '-', '미입력' 등을 NULL로 통일",
    before:"N/A, -, 없음, 미기재, 해당없음", after:"NULL",
    source:"C업체 수기 Excel",
    sampleRows:[
      {raw:"N/A",   cleaned:"NULL", status:"ok"},
      {raw:"-",     cleaned:"NULL", status:"ok"},
      {raw:"없음",  cleaned:"NULL", status:"ok"},
      {raw:"미기재",cleaned:"NULL", status:"ok"},
    ],
    logs:[
      {time:"14:02:18", msg:"300건 NULL 처리 완료", level:"info"},
      {time:"14:02:18", msg:"18건 불확실 패턴 — 수동 확인 필요", level:"warn"},
    ],
  },
  {
    id:7, type:"unit", name:"길이 단위 통일 (→ m)", status:"disabled", affected:89, completed:0, errors:0, priority:7,
    description:"mm, cm, inch를 m로 변환 (활성화 전 BOM 검토 필요)",
    before:"1200mm, 120cm, 47.24inch", after:"1.2 m",
    source:"A업체 BOM",
    sampleRows:[
      {raw:"1200mm",   cleaned:"1.2 m",   status:"ok"},
      {raw:"120cm",    cleaned:"1.2 m",   status:"ok"},
      {raw:"47.24inch",cleaned:"1.2 m",   status:"ok"},
    ],
    logs:[
      {time:"—", msg:"비활성 상태 — 실행되지 않음", level:"warn"},
    ],
  },
];

const ERR_RECORDS: ErrRecord[] = [
  {id:"ERR-001", rule:"날짜 형식 표준화",  field:"주문일자",   raw:"unknown date",  reason:"알 수 없는 날짜 패턴", ignored:false},
  {id:"ERR-002", rule:"날짜 형식 표준화",  field:"납기일",     raw:"TBD",           reason:"약어 — 날짜 아님",    ignored:false},
  {id:"ERR-003", rule:"통화 정규화",       field:"단가",       raw:"USD 1000",      reason:"외화 표기 — 변환 불가", ignored:false},
  {id:"ERR-004", rule:"NULL 표준화",       field:"비고",       raw:"(미정)",        reason:"괄호 포함 패턴 불일치", ignored:false},
  {id:"ERR-005", rule:"날짜 형식 표준화",  field:"검사일",     raw:"2024년Q1",      reason:"분기 표기 — 날짜 아님", ignored:true},
];

const FEED_POOL = [
  "날짜 표준화 — 주문일자 14건 변환 완료",
  "공백 제거 — 거래처명 38건 정리",
  "통화 정규화 — 단가 12건 KRW 변환",
  "중복 제거 — CUST_0047 병합 처리",
  "NULL 처리 — 비고 필드 7건 표준화",
  "단위 통일 — BOM 무게 5건 kg 변환",
  "날짜 표준화 — 납기일 9건 변환",
  "오류 감지 — 'unknown date' 패턴 수동 검토 필요",
];

const typeColor: Record<RuleType,string> = {
  date:"bg-blue-100 text-blue-700", unit:"bg-violet-100 text-violet-700",
  dedup:"bg-amber-100 text-amber-700", trim:"bg-slate-100 text-slate-600",
  code:"bg-rose-100 text-rose-700",
};
const typeLabel: Record<RuleType,string> = {
  date:"날짜", unit:"단위", dedup:"중복제거", trim:"문자정리", code:"코드변환",
};

function RulePanel({ rule, onClose }: { rule:Rule; onClose:()=>void }) {
  const [tab, setTab] = useState<"detail"|"sample"|"log">("detail");
  const pct = rule.affected>0 ? Math.round((rule.completed/rule.affected)*100) : 0;
  return (
    <div className="fixed inset-y-0 right-0 w-[460px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50">
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor[rule.type]}`}>{typeLabel[rule.type]}</span>
            <span className="font-bold text-slate-900">{rule.name}</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">우선순위 #{rule.priority} · {rule.source}</div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4"/></button>
      </div>
      <div className="flex border-b border-slate-100">
        {(["detail","sample","log"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`flex-1 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${tab===t?"border-blue-600 text-blue-700":"border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t==="detail"?"상세정보":t==="sample"?"샘플 데이터":"실행 로그"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab==="detail"&&(
          <>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-xs text-slate-500 mb-1">설명</div>
              <div className="text-sm text-slate-800">{rule.description}</div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">처리 진행률</span>
                <span className={`font-semibold ${pct===100?"text-emerald-600":pct>=80?"text-blue-600":"text-amber-600"}`}>{pct}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${pct===100?"bg-emerald-500":pct>=80?"bg-blue-500":"bg-amber-400"}`} style={{width:`${pct}%`}}/>
              </div>
              <div className="flex gap-3 mt-2 text-xs">
                <span className="text-emerald-600">완료 {rule.completed.toLocaleString()}</span>
                {rule.errors>0&&<span className="text-rose-500">오류 {rule.errors}</span>}
                <span className="text-slate-400">전체 {rule.affected.toLocaleString()}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
                <div className="text-slate-400 mb-1">변환 전 (Before)</div>
                <div className="font-mono text-rose-800 break-all">{rule.before}</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                <div className="text-slate-400 mb-1">변환 후 (After)</div>
                <div className="font-mono text-emerald-800 break-all">{rule.after}</div>
              </div>
            </div>
          </>
        )}
        {tab==="sample"&&(
          <div className="space-y-2">
            {rule.sampleRows.map((r,i)=>(
              <div key={i} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs ${r.status==="ok"?"bg-slate-50":"bg-rose-50 border border-rose-100"}`}>
                <span className={`shrink-0 ${r.status==="ok"?"text-emerald-500":"text-rose-400"}`}>
                  {r.status==="ok"?<CheckCircle className="w-3.5 h-3.5"/>:<AlertTriangle className="w-3.5 h-3.5"/>}
                </span>
                <span className="font-mono text-rose-700 flex-1 truncate">{r.raw}</span>
                <span className="text-slate-400">→</span>
                <span className={`font-mono flex-1 truncate ${r.status==="ok"?"text-emerald-700":"text-rose-400"}`}>{r.cleaned}</span>
              </div>
            ))}
          </div>
        )}
        {tab==="log"&&(
          <div className="space-y-2">
            {rule.logs.map((l,i)=>(
              <div key={i} className={`flex gap-2 text-xs rounded-lg px-3 py-2 ${l.level==="error"?"bg-rose-50":l.level==="warn"?"bg-amber-50":"bg-slate-50"}`}>
                <span className="text-slate-400 shrink-0 font-mono">{l.time}</span>
                <span className={`${l.level==="error"?"text-rose-700":l.level==="warn"?"text-amber-700":"text-slate-700"}`}>{l.msg}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DataCleaner() {
  const [rules, setRules] = useState(RULES);
  const [errRecords, setErrRecords] = useState(ERR_RECORDS);
  const [filter, setFilter] = useState<RuleType|"all">("all");
  const [mainTab, setMainTab] = useState<"rules"|"errors">("rules");
  const [selectedRule, setSelectedRule] = useState<Rule|null>(null);
  const [running, setRunning] = useState(false);
  const [runPct, setRunPct] = useState(0);
  const [toast, setToast] = useState(false);
  const [feed, setFeed] = useState<{msg:string;ts:string}[]>([]);
  const tickRef = useRef(0);
  const [completedCount, setCompletedCount] = useState(4523);

  useEffect(()=>{
    const id = setInterval(()=>{
      tickRef.current++;
      if(tickRef.current%3===0){
        const msg = FEED_POOL[Math.floor(Math.random()*FEED_POOL.length)];
        const ts = new Date().toLocaleTimeString("ko-KR",{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit"});
        setFeed(prev=>[{msg,ts},...prev].slice(0,8));
        setCompletedCount(p=>p+Math.floor(Math.random()*3+1));
      }
    },1200);
    return ()=>clearInterval(id);
  },[]);

  const runSimulation = () => {
    if(running) return;
    setRunning(true); setRunPct(0);
    let p=0;
    const id = setInterval(()=>{
      p+=Math.random()*12+5;
      if(p>=100){
        p=100; clearInterval(id);
        setRunning(false); setToast(true);
        setTimeout(()=>setToast(false),3000);
      }
      setRunPct(Math.min(100,Math.round(p)));
    },200);
  };

  const activeRules = rules.filter(r=>r.status==="active");
  const totalAffected = activeRules.reduce((s,r)=>s+r.affected,0);
  const totalErrors = rules.reduce((s,r)=>s+r.errors,0);
  const openErrors = errRecords.filter(e=>!e.ignored).length;

  const filtered = filter==="all" ? rules : rules.filter(r=>r.type===filter);

  const typeTotals = (["date","unit","dedup","trim","code"] as RuleType[]).map(t=>({
    type:t, completed: rules.filter(r=>r.type===t).reduce((s,r)=>s+r.completed,0),
    affected: rules.filter(r=>r.type===t).reduce((s,r)=>s+r.affected,0),
  }));
  const grandTotal = typeTotals.reduce((s,t)=>s+t.affected,1);
  const barColors: Record<RuleType,string> = {
    date:"#3b82f6", unit:"#8b5cf6", dedup:"#f59e0b", trim:"#64748b", code:"#ef4444"
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Cleaner</h1>
          <p className="text-slate-500 mt-1 text-sm">날짜·단위·중복·공백 변환 규칙 관리 및 정제 현황 추적</p>
        </div>
        <div className="flex items-center gap-2">
          {toast&&<div className="text-xs bg-emerald-600 text-white px-3 py-2 rounded-xl font-medium flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5"/>정제 실행 완료</div>}
          <button onClick={runSimulation} disabled={running}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${running?"bg-slate-100 text-slate-400 cursor-not-allowed":"bg-blue-600 text-white hover:bg-blue-700"}`}>
            {running?<RefreshCw className="w-4 h-4 animate-spin"/>:<Play className="w-4 h-4"/>}
            {running?"실행 중...":"지금 실행"}
          </button>
        </div>
      </div>

      {/* 실행 진행바 */}
      {running&&(
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-blue-700 font-medium">정제 실행 중...</span>
            <span className="text-blue-600 font-semibold">{runPct}%</span>
          </div>
          <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-200" style={{width:`${runPct}%`}}/>
          </div>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-5 gap-3">
        {[
          {label:"전체 레코드",   value:"182,441",              sub:"4개 업체 통합",  cls:"text-slate-700 bg-white border-slate-200"},
          {label:"변환 대상",     value:totalAffected.toLocaleString(), sub:"활성 규칙 기준", cls:"text-blue-700 bg-blue-50 border-blue-200"},
          {label:"정제 완료",     value:completedCount.toLocaleString(), sub:"실시간 누적",    cls:"text-emerald-700 bg-emerald-50 border-emerald-200"},
          {label:"오류/검토 필요",value:totalErrors.toLocaleString(),     sub:"수동 처리 필요", cls:totalErrors>0?"text-rose-700 bg-rose-50 border-rose-200":"text-slate-600 bg-white border-slate-200"},
          {label:"활성 규칙",     value:`${activeRules.length}개`,       sub:`전체 ${rules.length}개 중`, cls:"text-violet-700 bg-violet-50 border-violet-200"},
        ].map(({label,value,sub,cls})=>(
          <div key={label} className={`rounded-xl border p-4 ${cls}`}>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs font-medium mt-0.5">{label}</div>
            <div className="text-[10px] opacity-70 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* 유형별 스택 바 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="text-xs font-semibold text-slate-700 mb-3">규칙 유형별 처리 현황</div>
        <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
          {typeTotals.map(t=>(
            <div key={t.type} className="h-full rounded-sm" title={`${typeLabel[t.type]}: ${t.completed}/${t.affected}`}
              style={{width:`${(t.affected/grandTotal)*100}%`, background:barColors[t.type]}}/>
          ))}
        </div>
        <div className="flex gap-4 mt-2 flex-wrap">
          {typeTotals.map(t=>(
            <div key={t.type} className="flex items-center gap-1.5 text-xs">
              <div className="w-2 h-2 rounded-full" style={{background:barColors[t.type]}}/>
              <span className="text-slate-600">{typeLabel[t.type]}</span>
              <span className="font-semibold text-slate-800">{t.completed.toLocaleString()}</span>
              <span className="text-slate-400">/ {t.affected.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-slate-200">
        {([["rules","변환 규칙"],["errors",`오류 레코드 (${openErrors})`]] as const).map(([k,l])=>(
          <button key={k} onClick={()=>setMainTab(k)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${mainTab===k?"border-blue-600 text-blue-700":"border-transparent text-slate-500 hover:text-slate-700"}`}>
            {l}
          </button>
        ))}
      </div>

      {mainTab==="rules"&&(
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">변환 규칙</span>
            <div className="flex gap-1.5 ml-auto flex-wrap">
              {(["all","date","unit","dedup","trim","code"] as const).map(f=>(
                <button key={f} onClick={()=>setFilter(f)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${filter===f?"bg-blue-600 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {f==="all"?"전체":typeLabel[f]}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {filtered.map(rule=>{
              const pct = rule.affected>0?Math.round((rule.completed/rule.affected)*100):0;
              return (
                <div key={rule.id} onClick={()=>setSelectedRule(rule)}
                  className="p-4 flex items-start gap-4 cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor[rule.type]}`}>{typeLabel[rule.type]}</span>
                      <span className="text-sm font-semibold text-slate-900">{rule.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${rule.status==="active"?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-500"}`}>
                        {rule.status==="active"?"활성":"비활성"}
                      </span>
                      {rule.errors>0&&<span className="text-xs bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full">오류 {rule.errors}</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{rule.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct===100?"bg-emerald-500":pct>=80?"bg-blue-500":"bg-amber-400"}`} style={{width:`${pct}%`}}/>
                      </div>
                      <span className={`text-xs font-semibold shrink-0 ${pct===100?"text-emerald-600":pct>=80?"text-blue-600":"text-amber-600"}`}>{pct}%</span>
                      <span className="text-xs text-slate-400 shrink-0">{rule.affected.toLocaleString()}건</span>
                    </div>
                  </div>
                  <button onClick={e=>{e.stopPropagation();setRules(prev=>prev.map(r=>r.id===rule.id?{...r,status:r.status==="active"?"disabled":"active"}:r));}}
                    className={`shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${rule.status==="active"?"bg-rose-50 text-rose-600 hover:bg-rose-100":"bg-emerald-50 text-emerald-600 hover:bg-emerald-100"}`}>
                    {rule.status==="active"?"비활성화":"활성화"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mainTab==="errors"&&(
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-50">
            {errRecords.map(e=>(
              <div key={e.id} className={`p-4 flex items-start gap-3 ${e.ignored?"opacity-50":""}`}>
                <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${e.ignored?"text-slate-300":"text-amber-500"}`}/>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-slate-500">{e.id}</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{e.rule}</span>
                    <span className="text-xs text-slate-500">필드: {e.field}</span>
                    {e.ignored&&<span className="text-xs bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full">무시됨</span>}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="font-mono bg-rose-50 text-rose-700 px-2 py-0.5 rounded">{e.raw}</span>
                    <span className="text-slate-400">—</span>
                    <span className="text-slate-600">{e.reason}</span>
                  </div>
                </div>
                {!e.ignored&&(
                  <div className="flex gap-2 shrink-0">
                    <button onClick={()=>setErrRecords(prev=>prev.map(r=>r.id===e.id?{...r,ignored:true}:r))}
                      className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">무시</button>
                    <button className="text-xs px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">재시도</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 실시간 피드 + 정제율 차트 */}
      <div className="flex gap-4">
        <div className="flex-1 bg-slate-900 rounded-xl overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400"/>
            <span className="text-xs text-slate-300 font-medium">실시간 정제 이벤트</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-auto"/>
          </div>
          <div className="divide-y divide-slate-800 max-h-36 overflow-y-auto">
            {feed.length===0&&<div className="px-4 py-2 text-xs text-slate-500">이벤트 대기 중...</div>}
            {feed.map((f,i)=>(
              <div key={i} className="px-4 py-2">
                <div className="text-[10px] text-slate-500 font-mono">{f.ts}</div>
                <div className="text-xs text-slate-300 mt-0.5">{f.msg}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-56 bg-white rounded-xl border border-slate-200 p-4 shrink-0">
          <div className="text-xs font-semibold text-slate-500 mb-3">규칙 유형별 처리 건수</div>
          <svg viewBox="0 0 180 80" className="w-full">
            {[{l:"날짜",v:1243,c:"#3b82f6"},{l:"단위",v:892,c:"#8b5cf6"},{l:"중복",v:547,c:"#f59e0b"},{l:"코드",v:341,c:"#10b981"}].map((d,i)=>{
              const max=1243; const bh=(d.v/max)*60; const x=i*46+8;
              return (
                <g key={d.l}>
                  <rect x={x} y={70-bh} width={32} height={bh} rx={4} fill={d.c} opacity={0.8}/>
                  <text x={x+16} y={76} textAnchor="middle" fontSize="7" fill="#94a3b8">{d.l}</text>
                  <text x={x+16} y={70-bh-3} textAnchor="middle" fontSize="7" fill={d.c} fontWeight="bold">{(d.v/1000).toFixed(1)}k</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* 규칙 상세 패널 */}
      {selectedRule&&(
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={()=>setSelectedRule(null)}/>
          <RulePanel rule={selectedRule} onClose={()=>setSelectedRule(null)}/>
        </>
      )}
    </div>
  );
}
