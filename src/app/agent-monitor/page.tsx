"use client";

import { useState, useEffect, useRef } from "react";
import { X, Cpu, Zap, AlertTriangle, CheckCircle2, GitMerge, Tag, SkipForward } from "lucide-react";

type Stage = "Source Scanner"|"Schema Profiler"|"Document Parser"|"Data Cleaner"|"Entity Resolver"|"Canonical Mapper"|"Ontology Mapper"|"Graph Builder"|"Quality Validator"|"Human Review";
type Decision = "approved"|"merged"|"mapped"|"flagged"|"skipped";

interface AgentLog {
  id:number; time:string; stage:Stage; model:string; confidence:number;
  decision:Decision; action:string; reasoning:string; tokens:number; latency:number; company:string;
  inputTokens:number; outputTokens:number;
}

const LOGS: AgentLog[] = [
  { id:1,  time:"08:03:14", stage:"Source Scanner",    model:"claude-sonnet-4-6",         confidence:96, decision:"approved", company:"A업체", tokens:1240, latency:380,  inputTokens:900,  outputTokens:340, action:"ERP DB 연결 확인 — 12개 테이블, 182,441 레코드 감지", reasoning:"DB 연결 메타데이터(owner, last_updated, row_count)가 모두 유효. 보안등급 'internal'로 자동 분류." },
  { id:2,  time:"08:05:22", stage:"Schema Profiler",   model:"claude-sonnet-4-6",         confidence:88, decision:"flagged",  company:"A업체", tokens:890,  latency:290,  inputTokens:620,  outputTokens:270, action:"컬럼 'CUST_NM' — 한글·영문 혼재 감지, 정제 필요", reasoning:"전체 23,411건 중 1,204건(5.1%)에 영문 고객명 존재. 동일 거래처의 이중 표기 가능성. Data Cleaner로 전달." },
  { id:3,  time:"08:11:45", stage:"Document Parser",   model:"claude-haiku-4-5-20251001", confidence:91, decision:"approved", company:"A업체", tokens:2100, latency:1240, inputTokens:1600, outputTokens:500, action:"작업표준서 WI-2024-003.pdf — 공정 테이블 4개, 엔티티 12개 추출", reasoning:"PDF 레이아웃이 표준 작업표준서 형식과 일치. OCR 신뢰도 98.2%. 테이블 헤더 자동 감지 성공." },
  { id:4,  time:"08:18:03", stage:"Data Cleaner",      model:"claude-sonnet-4-6",         confidence:97, decision:"approved", company:"A업체", tokens:560,  latency:210,  inputTokens:380,  outputTokens:180, action:"날짜 표준화 규칙 적용 — 1,243건 'YYYYMMDD' → 'YYYY-MM-DD' 변환", reasoning:"패턴 매칭 정확도 100%. 예외 케이스 없음. ISO 8601 강제 적용." },
  { id:5,  time:"08:25:30", stage:"Entity Resolver",   model:"claude-sonnet-4-6",         confidence:67, decision:"flagged",  company:"A업체", tokens:1850, latency:640,  inputTokens:1300, outputTokens:550, action:"CUST_0021 vs CUST_0022 병합 여부 — Human Review 큐 전달", reasoning:"사업자번호 앞 6자리 일치, 주소 동일, 이메일 도메인 동일이나 사업부 단위 분리 가능성 존재. 신뢰도 67%로 자동 결정 기준치(80%) 미달." },
  { id:6,  time:"08:31:18", stage:"Entity Resolver",   model:"claude-sonnet-4-6",         confidence:94, decision:"merged",   company:"A업체", tokens:1340, latency:480,  inputTokens:950,  outputTokens:390, action:"삼성전자(주) / Samsung Electronics / 삼성전자 → CUST_0001로 통합", reasoning:"사업자번호 완전 일치, 대표자 동일, 주소 동일. 신뢰도 94%로 자동 병합 기준(80%) 초과." },
  { id:7,  time:"08:38:55", stage:"Canonical Mapper",  model:"claude-sonnet-4-6",         confidence:58, decision:"flagged",  company:"C업체", tokens:1720, latency:590,  inputTokens:1200, outputTokens:520, action:"컬럼 '수량' — OrderLine.quantity vs BOM.quantity_per 매핑 불명확", reasoning:"시트명 '수주현황'이나 인접에 'BOM번호' 컬럼 존재. 소수점 값 일부 포함. 두 Canonical 필드 모두 후보." },
  { id:8,  time:"08:44:12", stage:"Ontology Mapper",   model:"claude-haiku-4-5-20251001", confidence:99, decision:"mapped",   company:"B업체", tokens:410,  latency:180,  inputTokens:290,  outputTokens:120, action:"SAP MARA 테이블 → Material 도메인 전체 매핑 완료", reasoning:"MARA는 SAP 표준 자재 마스터 테이블. 필드 구조가 10M Material 도메인과 97% 일치." },
  { id:9,  time:"08:52:07", stage:"Graph Builder",     model:"claude-sonnet-4-6",         confidence:92, decision:"approved", company:"A업체", tokens:3200, latency:1800, inputTokens:2400, outputTokens:800, action:"노드 1,240개, 엣지 3,871개 생성 — Supplier→Material→Product 체인 완성", reasoning:"참조 무결성 검사 통과. 고립 노드 3개 감지 → Quality Validator 플래그 처리. 순환 참조 없음." },
  { id:10, time:"09:01:44", stage:"Quality Validator", model:"claude-sonnet-4-6",         confidence:89, decision:"approved", company:"A업체", tokens:2400, latency:950,  inputTokens:1800, outputTokens:600, action:"AI-Readiness 점수 87점 산출 — 이슈 14건 (오류 2, 경고 8, 정보 4)", reasoning:"필수 필드 누락 0건. 중복 엔티티 잔존 0건. 단위 불일치 2건(경고). 관계 오류 0건." },
];

const STAGES: Stage[] = ["Source Scanner","Schema Profiler","Document Parser","Data Cleaner","Entity Resolver","Canonical Mapper","Ontology Mapper","Graph Builder","Quality Validator","Human Review"];

const FEED_POOL = [
  "Entity Resolver — CUST_0034 신뢰도 91% → 자동 병합",
  "Schema Profiler — B업체 SAP 테이블 17개 프로파일링 완료",
  "Ontology Mapper — Product 도메인 23개 필드 매핑",
  "Quality Validator — 완성도 점수 재계산 중...",
  "Data Cleaner — 단위 통일 규칙 492건 적용",
  "Document Parser — PDF 3건 OCR 추출 완료",
  "Canonical Mapper — 신뢰도 55% — Human Review 전달",
  "Graph Builder — 엣지 128개 추가 생성",
  "Source Scanner — D업체 ERP 연결 확인",
];

const decisionColor: Record<Decision,string> = {
  approved:"bg-emerald-100 text-emerald-700", merged:"bg-blue-100 text-blue-700",
  mapped:"bg-violet-100 text-violet-700", flagged:"bg-amber-100 text-amber-700", skipped:"bg-slate-100 text-slate-500",
};
const decisionLabel: Record<Decision,string> = { approved:"승인", merged:"병합", mapped:"매핑", flagged:"검토 전달", skipped:"건너뜀" };
const DecisionIcon: Record<Decision, React.ReactNode> = {
  approved:<CheckCircle2 className="w-3.5 h-3.5"/>, merged:<GitMerge className="w-3.5 h-3.5"/>,
  mapped:<Tag className="w-3.5 h-3.5"/>, flagged:<AlertTriangle className="w-3.5 h-3.5"/>,
  skipped:<SkipForward className="w-3.5 h-3.5"/>,
};

function PipelineFlow({ logs }: { logs: AgentLog[] }) {
  const stageStatus = (s: Stage) => {
    const stageLogs = logs.filter(l=>l.stage===s);
    if(!stageLogs.length) return "pending";
    if(stageLogs.some(l=>l.decision==="flagged")) return "flagged";
    return "done";
  };
  const statusColor = { done:"#10b981", flagged:"#f59e0b", pending:"#e2e8f0" };
  const statusText  = { done:"#fff",    flagged:"#fff",    pending:"#94a3b8" };
  const W=700; const H=56; const bw=56; const gap=14;
  const total = STAGES.length;
  return (
    <svg width={W} height={H+20} viewBox={`0 0 ${W} ${H+20}`} className="w-full">
      {STAGES.map((s,i)=>{
        const st = stageStatus(s);
        const x = i*(bw+gap); const y=0;
        const short = s.replace(" ","\n").split("\n");
        return (
          <g key={s}>
            {i<total-1&&<line x1={x+bw} y1={H/2} x2={x+bw+gap} y2={H/2} stroke="#e2e8f0" strokeWidth={2}/>}
            <rect x={x} y={y} width={bw} height={H} rx={8} fill={statusColor[st]}/>
            {short.map((w,wi)=>(
              <text key={wi} x={x+bw/2} y={H/2+(wi-0.3)*10} textAnchor="middle" fontSize={7} fontWeight="600" fill={statusText[st]}>{w}</text>
            ))}
            {st==="done"&&<text x={x+bw/2} y={H+14} textAnchor="middle" fontSize={7} fill="#10b981">✓</text>}
            {st==="flagged"&&<text x={x+bw/2} y={H+14} textAnchor="middle" fontSize={7} fill="#f59e0b">⚠</text>}
          </g>
        );
      })}
    </svg>
  );
}

function TokenChart({ logs }: { logs: AgentLog[] }) {
  const byStage = STAGES.map(s=>({
    s, v: logs.filter(l=>l.stage===s).reduce((a,l)=>a+l.tokens,0)
  })).filter(d=>d.v>0);
  const max = Math.max(...byStage.map(d=>d.v),1);
  const W=500; const H=60; const bw=36; const gap=8;
  return (
    <svg width={W} height={H+28} viewBox={`0 0 ${W} ${H+28}`} className="w-full">
      {byStage.map((d,i)=>{
        const bh=(d.v/max)*H; const x=i*(bw+gap);
        const short = d.s.split(" ").map(w=>w.slice(0,4)).join(".");
        return (
          <g key={d.s}>
            <rect x={x} y={H-bh} width={bw} height={bh} fill="#6366f1" rx={4} opacity={0.8}/>
            <text x={x+bw/2} y={H+10} textAnchor="middle" fontSize={7} fill="#94a3b8">{short}</text>
            <text x={x+bw/2} y={H-bh-3} textAnchor="middle" fontSize={7} fill="#6366f1" fontWeight="600">{d.v>=1000?(d.v/1000).toFixed(1)+"k":d.v}</text>
          </g>
        );
      })}
    </svg>
  );
}

function ConfBar({ value, threshold=80 }: { value:number; threshold?:number }) {
  const cls = value>=threshold?"bg-emerald-500":value>=60?"bg-amber-400":"bg-rose-400";
  return (
    <div className="relative w-24 h-2 bg-slate-100 rounded-full overflow-visible">
      <div className={`absolute inset-y-0 left-0 rounded-full ${cls}`} style={{width:`${value}%`}}/>
      <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400 opacity-60" style={{left:`${threshold}%`}}/>
    </div>
  );
}

function DetailPanel({ log, onClose }: { log:AgentLog; onClose:()=>void }) {
  const [tab, setTab] = useState<"reason"|"meta"|"compare">("reason");
  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50">
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{log.stage}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${decisionColor[log.decision]}`}>
              {DecisionIcon[log.decision]}{decisionLabel[log.decision]}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-900 mt-1 leading-snug">{log.action}</p>
          <div className="text-xs text-slate-400 mt-0.5">{log.time} · {log.company}</div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 shrink-0"><X className="w-4 h-4"/></button>
      </div>
      <div className="flex border-b border-slate-100">
        {(["reason","meta","compare"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`flex-1 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${tab===t?"border-blue-600 text-blue-700":"border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t==="reason"?"판단 근거":t==="meta"?"메타 정보":"신뢰도 비교"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab==="reason"&&(
          <>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-500 mb-2">AI 판단 근거</div>
              <p className="text-sm text-slate-800 leading-relaxed">{log.reasoning}</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">신뢰도</span>
                <span className={`text-sm font-bold ${log.confidence>=80?"text-emerald-600":log.confidence>=60?"text-amber-600":"text-rose-600"}`}>{log.confidence}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative">
                <div className={`h-full rounded-full ${log.confidence>=80?"bg-emerald-500":log.confidence>=60?"bg-amber-400":"bg-rose-400"}`} style={{width:`${log.confidence}%`}}/>
                <div className="absolute inset-y-0 w-0.5 bg-slate-500 opacity-40" style={{left:"80%"}}/>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">임계치 80% {log.confidence>=80?"초과 → 자동 처리":"미달 → Human Review"}</div>
            </div>
            {log.decision==="flagged"&&(
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <strong>Human Review 전달됨</strong> — 신뢰도가 임계치(80%)에 미달하거나 복수 후보가 팽팽해 자동 결정이 불가합니다.
              </div>
            )}
          </>
        )}
        {tab==="meta"&&(
          <div className="space-y-3">
            {[
              ["모델", log.model],
              ["단계", log.stage],
              ["업체", log.company],
              ["처리 시각", log.time],
              ["응답 지연", `${log.latency}ms`],
              ["총 토큰", `${log.tokens.toLocaleString()} (입력 ${log.inputTokens.toLocaleString()} / 출력 ${log.outputTokens.toLocaleString()})`],
            ].map(([k,v])=>(
              <div key={k} className="flex items-start gap-3 text-xs">
                <span className="text-slate-400 w-20 shrink-0">{k}</span>
                <span className="text-slate-800 font-medium break-all">{v}</span>
              </div>
            ))}
          </div>
        )}
        {tab==="compare"&&(
          <div className="space-y-2">
            <div className="text-xs text-slate-500 mb-3">동일 단계 다른 결정들과 신뢰도 비교</div>
            {LOGS.filter(l=>l.stage===log.stage).map(l=>(
              <div key={l.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs ${l.id===log.id?"bg-blue-50 border border-blue-200":"bg-slate-50"}`}>
                <span className="text-slate-400 font-mono w-14 shrink-0">{l.time}</span>
                <ConfBar value={l.confidence}/>
                <span className={`font-semibold w-8 shrink-0 ${l.confidence>=80?"text-emerald-600":"text-amber-600"}`}>{l.confidence}%</span>
                <span className={`px-1.5 py-0.5 rounded-full ${decisionColor[l.decision]}`}>{decisionLabel[l.decision]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentMonitor() {
  const [filterStage, setFilterStage]       = useState<Stage|"all">("all");
  const [filterDecision, setFilterDecision] = useState<Decision|"all">("all");
  const [selectedLog, setSelectedLog]       = useState<AgentLog|null>(null);
  const [feed, setFeed]                     = useState<{msg:string;ts:string}[]>([]);
  const [totalDecisions, setTotalDecisions] = useState(LOGS.length);
  const [totalTokens, setTotalTokens]       = useState(LOGS.reduce((s,l)=>s+l.tokens,0));
  const tickRef = useRef(0);

  useEffect(()=>{
    const id = setInterval(()=>{
      tickRef.current++;
      if(tickRef.current%2===0){
        const msg = FEED_POOL[Math.floor(Math.random()*FEED_POOL.length)];
        const ts = new Date().toLocaleTimeString("ko-KR",{hour12:false});
        setFeed(prev=>[{msg,ts},...prev].slice(0,10));
        setTotalDecisions(p=>p+1);
        setTotalTokens(p=>p+Math.floor(Math.random()*800+200));
      }
    },1200);
    return ()=>clearInterval(id);
  },[]);

  const filtered = LOGS.filter(l=>
    (filterStage==="all"||l.stage===filterStage)&&
    (filterDecision==="all"||l.decision===filterDecision)
  );

  const avgConf = Math.round(LOGS.reduce((s,l)=>s+l.confidence,0)/LOGS.length);
  const flagged = LOGS.filter(l=>l.decision==="flagged").length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agent Monitor</h1>
          <p className="text-slate-500 mt-1 text-sm">AI 에이전트가 각 파이프라인 단계에서 내린 결정과 근거를 추적합니다</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-violet-50 border border-violet-200 rounded-xl px-3 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"/>
          <span className="text-violet-700 font-medium">에이전트 활성 (시뮬레이션)</span>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-5 gap-3">
        {[
          {label:"총 결정 수",        value:totalDecisions,                sub:"실시간 누적",         cls:"text-slate-700 bg-white border-slate-200"},
          {label:"평균 신뢰도",       value:`${avgConf}%`,               sub:"전 단계 평균",        cls:"text-emerald-700 bg-emerald-50 border-emerald-200"},
          {label:"Human Review 전달", value:flagged,                        sub:`${Math.round(flagged/LOGS.length*100)}% escalation율`, cls:"text-amber-700 bg-amber-50 border-amber-200"},
          {label:"총 토큰 사용",      value:(totalTokens/1000).toFixed(1)+"k", sub:"입출력 합산",     cls:"text-violet-700 bg-violet-50 border-violet-200"},
          {label:"활성 모델",         value:"2종",                          sub:"Sonnet·Haiku",       cls:"text-blue-700 bg-blue-50 border-blue-200"},
        ].map(({label,value,sub,cls})=>(
          <div key={label} className={`rounded-xl border p-4 ${cls}`}>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs font-medium mt-0.5">{label}</div>
            <div className="text-[10px] opacity-70 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* 파이프라인 흐름도 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="text-xs font-semibold text-slate-700 mb-3">파이프라인 단계별 상태</div>
        <div className="overflow-x-auto">
          <PipelineFlow logs={LOGS}/>
        </div>
        <div className="flex gap-4 mt-2 text-xs">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"/>완료</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block"/>검토 전달</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-200 inline-block"/>미실행</span>
        </div>
      </div>

      {/* 토큰 차트 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="text-xs font-semibold text-slate-700 mb-3">단계별 토큰 사용량</div>
        <div className="overflow-x-auto">
          <TokenChart logs={LOGS}/>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs text-slate-500">단계:</span>
        {(["all",...STAGES.slice(0,5)] as (Stage|"all")[]).map(s=>(
          <button key={s} onClick={()=>setFilterStage(s)}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${filterStage===s?"bg-blue-600 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {s==="all"?"전체":s.split(" ")[0]}
          </button>
        ))}
        {(["all",...STAGES.slice(5)] as (Stage|"all")[]).map(s=>(
          <button key={s} onClick={()=>setFilterStage(s)}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${filterStage===s?"bg-blue-600 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {s==="all"?"전체":s.split(" ")[0]}
          </button>
        ))}
        <span className="text-slate-200">|</span>
        {(["all","approved","merged","mapped","flagged"] as (Decision|"all")[]).map(d=>(
          <button key={d} onClick={()=>setFilterDecision(d)}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${filterDecision===d?"bg-violet-600 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {d==="all"?"전체결정":decisionLabel[d as Decision]}
          </button>
        ))}
        <span className="text-xs text-slate-400 ml-auto">{filtered.length}건</span>
      </div>

      {/* 로그 목록 */}
      <div className="space-y-2">
        {filtered.map(log=>(
          <div key={log.id} onClick={()=>setSelectedLog(log)}
            className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4 cursor-pointer hover:shadow-sm hover:border-slate-300 transition-all">
            <div className="text-xs font-mono text-slate-400 shrink-0 mt-0.5 w-16">{log.time}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 font-medium">{log.stage}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5 ${decisionColor[log.decision]}`}>
                  {DecisionIcon[log.decision]}{decisionLabel[log.decision]}
                </span>
                <span className="text-xs text-slate-400">{log.company}</span>
              </div>
              <p className="text-sm text-slate-800 mt-0.5 font-medium truncate">{log.action}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <div className="flex items-center gap-2">
                <ConfBar value={log.confidence}/>
                <span className={`text-xs font-bold w-8 text-right ${log.confidence>=80?"text-emerald-600":log.confidence>=60?"text-amber-600":"text-rose-600"}`}>{log.confidence}%</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-0.5"><Zap className="w-3 h-3"/>{log.latency}ms</span>
                <span className="flex items-center gap-0.5"><Cpu className="w-3 h-3"/>{log.tokens.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 실시간 피드 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">실시간 에이전트 활동</span>
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse ml-auto"/>
        </div>
        <div className="divide-y divide-slate-50 max-h-44 overflow-y-auto">
          {feed.length===0&&<div className="px-4 py-3 text-xs text-slate-400">활동 대기 중...</div>}
          {feed.map((f,i)=>(
            <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-xs">
              <span className="text-slate-400 font-mono shrink-0">{f.ts}</span>
              <span className="text-slate-700">{f.msg}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedLog&&(
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={()=>setSelectedLog(null)}/>
          <DetailPanel log={selectedLog} onClose={()=>setSelectedLog(null)}/>
        </>
      )}
    </div>
  );
}
