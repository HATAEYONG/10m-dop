"use client";

import { useState, useRef } from "react";
import {
  Play, Square, RotateCcw, CheckCircle2, Loader2, AlertCircle,
  X, Database, FileSearch, Sparkles, Users, GitBranch, Network,
  Share2, CheckSquare, ClipboardCheck, Clock, Cpu, Zap,
} from "lucide-react";

const COMPANIES = [
  { id:0, name:"A업체", sub:"ERP + BOM + PDF", color:"bg-blue-50 border-blue-200 text-blue-700" },
  { id:1, name:"B업체", sub:"SAP + MES",        color:"bg-violet-50 border-violet-200 text-violet-700" },
  { id:2, name:"C업체", sub:"수기 Excel",        color:"bg-amber-50 border-amber-200 text-amber-700" },
  { id:3, name:"D업체", sub:"Odoo + CSV",        color:"bg-emerald-50 border-emerald-200 text-emerald-700" },
];

const STEPS = [
  { id:1, name:"Source Scanner",   icon:Database,      desc:"데이터 원천 탐색 및 목록화",    duration:1200, tokens:1240 },
  { id:2, name:"Schema Profiler",  icon:GitBranch,     desc:"테이블·컬럼 구조 분석",         duration:1500, tokens:890  },
  { id:3, name:"Document Parser",  icon:FileSearch,    desc:"PDF·CSV 문서 파싱",             duration:1800, tokens:2100 },
  { id:4, name:"Data Cleaner",     icon:Sparkles,      desc:"날짜·단위·중복 정제",           duration:1400, tokens:560  },
  { id:5, name:"Entity Resolver",  icon:Users,         desc:"엔티티 통합 및 ID 부여",         duration:1600, tokens:1850 },
  { id:6, name:"Canonical Mapper", icon:GitBranch,     desc:"표준 필드 매핑",                duration:1300, tokens:1720 },
  { id:7, name:"Ontology Mapper",  icon:Network,       desc:"10M 도메인 배치",               duration:1100, tokens:410  },
  { id:8, name:"Graph Builder",    icon:Share2,        desc:"지식 그래프 노드·엣지 생성",     duration:2000, tokens:3200 },
  { id:9, name:"Quality Validator",icon:CheckSquare,   desc:"품질 점수 산출 및 이슈 감지",   duration:1400, tokens:2400 },
  { id:10,name:"Human Review",     icon:ClipboardCheck,desc:"AI 저신뢰 항목 검토 큐 전송",   duration:800,  tokens:320  },
];

const MOCK_RESULTS: Record<number,{summary:string; details:Record<string,string|number>; logs:string[]}> = {
  1:  { summary:"12개 원천 연결 확인", details:{레코드수:"182,441",테이블수:12,연결상태:"정상"}, logs:["[08:03:10] DB 연결 시작","[08:03:11] A업체 ERP 연결 성공 — 182,441 레코드","[08:03:12] 보안등급 'internal' 자동 분류","[08:03:14] Source Scanner 완료"] },
  2:  { summary:"47개 테이블 프로파일링 완료", details:{테이블수:47,컬럼수:347,"NULL 비율":"3.2%"}, logs:["[08:05:20] Schema 분석 시작","[08:05:21] CUST_NM 한글·영문 혼재 감지","[08:05:22] 프로파일링 완료 — 347개 컬럼"] },
  3:  { summary:"PDF 18건 · CSV 5건 파싱 완료", details:{PDF:18,CSV:5,"OCR 신뢰도":"98.2%"}, logs:["[08:11:40] 문서 23건 로드","[08:11:43] OCR 처리 중...","[08:11:45] 엔티티 12개 추출 완료"] },
  4:  { summary:"활성 규칙 6개 적용, 4,523건 변환", details:{적용규칙:6,변환건수:"4,523",오류:63}, logs:["[08:18:00] 규칙 6개 로드","[08:18:02] 날짜 표준화 1,243건","[08:18:03] 변환 완료"] },
  5:  { summary:"중복 엔티티 47쌍 통합", details:{후보:47,병합:44,분리:3}, logs:["[08:25:28] 엔티티 매칭 시작","[08:25:30] 신뢰도 67% — Human Review 전달","[08:31:18] 44쌍 자동 병합"] },
  6:  { summary:"312개 필드 Canonical 매핑 완료", details:{매핑완료:312,미매핑:8,"매핑률":"97.5%"}, logs:["[08:38:50] 필드 매핑 시작","[08:38:55] 신뢰도 58% 항목 Human Review","[08:39:00] 312개 완료"] },
  7:  { summary:"12개 도메인에 배치 완료", details:{도메인:12,배치완료:"100%"}, logs:["[08:44:10] Ontology 배치 시작","[08:44:12] MARA → Material 도메인 완료","[08:44:12] 전 도메인 배치 완료"] },
  8:  { summary:"지식 그래프 생성 완료", details:{노드:"1,240",엣지:"3,871","고립노드":3}, logs:["[08:52:00] 그래프 생성 시작","[08:52:05] 고립 노드 3개 감지","[08:52:07] Supplier→Material→Product 체인 완성"] },
  9:  { summary:"품질 점수 87점, 이슈 14건", details:{"품질점수":87,이슈:14,오류:2,경고:8}, logs:["[09:01:40] 품질 검증 시작","[09:01:43] 필수 필드 누락 0건","[09:01:44] AI-Readiness 87점 산출"] },
  10: { summary:"Human Review 큐 5건 전송", details:{"큐 전송":5,"자동처리":9}, logs:["[09:05:10] Review 큐 생성","[09:05:11] 5건 전송 완료"] },
};

const HISTORY = [
  { id:1, company:"A업체", date:"2026-06-17 14:22", duration:"18.4초", done:10, errors:0,  score:87, tokens:"14.7k" },
  { id:2, company:"B업체", date:"2026-06-17 10:05", duration:"16.1초", done:9,  errors:1,  score:79, tokens:"12.3k" },
  { id:3, company:"C업체", date:"2026-06-16 16:48", duration:"19.2초", done:10, errors:0,  score:82, tokens:"13.9k" },
];

type StepStatus = "pending"|"running"|"done"|"error";

function DurationChart({ durations }: { durations: number[] }) {
  const max = Math.max(...durations, 1);
  const W = 460; const H = 60; const bw = 36; const gap = 8;
  return (
    <svg width={W} height={H+22} viewBox={`0 0 ${W} ${H+22}`} className="w-full">
      {durations.map((d, i) => {
        const bh = (d / max) * H; const x = i * (bw + gap);
        return (
          <g key={i}>
            <rect x={x} y={H - bh} width={bw} height={bh} fill={d===0?"#e2e8f0":"#3b82f6"} rx={4} opacity={0.85}/>
            <text x={x+bw/2} y={H+12} textAnchor="middle" fontSize={7} fill="#94a3b8">{i+1}</text>
            {d>0&&<text x={x+bw/2} y={H-bh-4} textAnchor="middle" fontSize={7} fill="#3b82f6" fontWeight="600">{(d/1000).toFixed(1)}s</text>}
          </g>
        );
      })}
    </svg>
  );
}

function StepPanel({ idx, statuses, results, onClose, onRetry }: {
  idx: number; statuses: StepStatus[];
  results: (typeof MOCK_RESULTS[1]|null)[]; onClose: ()=>void; onRetry: (i:number)=>void;
}) {
  const [tab, setTab] = useState<"result"|"log"|"meta">("result");
  const step = STEPS[idx]; const status = statuses[idx]; const result = results[idx];
  const Icon = step.icon;
  const statusCls = status==="done"?"bg-emerald-100 text-emerald-700":status==="running"?"bg-blue-100 text-blue-700":status==="error"?"bg-rose-100 text-rose-700":"bg-slate-100 text-slate-500";
  const statusLabel = status==="done"?"완료":status==="running"?"실행 중":status==="error"?"오류":"대기";
  return (
    <div className="fixed inset-y-0 right-0 w-[440px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50">
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${status==="done"?"bg-emerald-50 text-emerald-600":status==="running"?"bg-blue-50 text-blue-600":"bg-slate-100 text-slate-400"}`}>
            <Icon className="w-4 h-4"/>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">{step.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusCls}`}>{statusLabel}</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Step {step.id} / 10 · {step.desc}</div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4"/></button>
      </div>
      <div className="flex border-b border-slate-100">
        {(["result","log","meta"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`flex-1 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${tab===t?"border-blue-600 text-blue-700":"border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t==="result"?"처리 결과":t==="log"?"실행 로그":"메타 정보"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tab==="result"&&(
          result ? (
            <>
              <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-700">{result.summary}</div>
              <div className="space-y-2">
                {Object.entries(result.details).map(([k,v])=>(
                  <div key={k} className="flex justify-between text-xs px-1">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-semibold text-slate-800">{v}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-400 pt-4 text-center">
              {status==="pending"?"이 단계는 아직 실행되지 않았습니다":status==="running"?"실행 중...":"결과 없음"}
            </div>
          )
        )}
        {tab==="log"&&(
          result ? (
            <div className="space-y-1.5">
              {result.logs.map((l,i)=>(
                <div key={i} className="text-xs font-mono bg-slate-50 rounded-lg px-3 py-2 text-slate-700">{l}</div>
              ))}
            </div>
          ) : <div className="text-xs text-slate-400 pt-4 text-center">로그 없음</div>
        )}
        {tab==="meta"&&(
          <div className="space-y-2">
            {[["단계 번호", `Step ${step.id} / 10`], ["예상 소요시간", `${(step.duration/1000).toFixed(1)}초`], ["토큰 사용", step.tokens.toLocaleString()], ["상태", statusLabel]].map(([k,v])=>(
              <div key={k} className="flex justify-between text-xs px-1">
                <span className="text-slate-500">{k}</span><span className="font-semibold text-slate-800">{v}</span>
              </div>
            ))}
          </div>
        )}
        {status==="error"&&(
          <button onClick={()=>onRetry(idx)} className="w-full mt-2 py-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl hover:bg-rose-100">
            이 단계 재실행 (Retry)
          </button>
        )}
      </div>
    </div>
  );
}

export default function PipelineRunner() {
  const [company, setCompany] = useState(0);
  const [statuses, setStatuses] = useState<StepStatus[]>(Array(10).fill("pending"));
  const [results, setResults] = useState<(typeof MOCK_RESULTS[1]|null)[]>(Array(10).fill(null));
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState<number|null>(null);
  const [mainTab, setMainTab] = useState<"runner"|"history">("runner");
  const [elapsed, setElapsed] = useState(0);
  const [actualDurations, setActualDurations] = useState<number[]>(Array(10).fill(0));
  const abortRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);

  async function runPipeline() {
    abortRef.current = false;
    setRunning(true);
    setStatuses(Array(10).fill("pending"));
    setResults(Array(10).fill(null));
    setActualDurations(Array(10).fill(0));
    setSelected(null);
    setElapsed(0);
    const start = Date.now();
    timerRef.current = setInterval(()=>setElapsed(Math.round((Date.now()-start)/100)/10), 100);

    for (let i = 0; i < STEPS.length; i++) {
      if (abortRef.current) break;
      setStatuses(prev=>{ const n=[...prev]; n[i]="running"; return n; });
      const t0 = Date.now();
      await new Promise(r=>setTimeout(r, STEPS[i].duration));
      if (abortRef.current) { setStatuses(prev=>{ const n=[...prev]; n[i]="pending"; return n; }); break; }
      const isError = i>2 && Math.random()<0.05;
      const dur = Date.now()-t0;
      setStatuses(prev=>{ const n=[...prev]; n[i]=isError?"error":"done"; return n; });
      setResults(prev=>{ const n=[...prev]; n[i]=isError?null:MOCK_RESULTS[i+1]; return n; });
      setActualDurations(prev=>{ const n=[...prev]; n[i]=dur; return n; });
    }

    if(timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
  }

  function stop() { abortRef.current=true; setRunning(false); if(timerRef.current) clearInterval(timerRef.current); }

  function reset() {
    abortRef.current=true; setRunning(false);
    if(timerRef.current) clearInterval(timerRef.current);
    setStatuses(Array(10).fill("pending")); setResults(Array(10).fill(null));
    setActualDurations(Array(10).fill(0)); setSelected(null); setElapsed(0);
  }

  async function retryStep(idx: number) {
    setStatuses(prev=>{ const n=[...prev]; n[idx]="running"; return n; });
    await new Promise(r=>setTimeout(r, STEPS[idx].duration));
    setStatuses(prev=>{ const n=[...prev]; n[idx]="done"; return n; });
    setResults(prev=>{ const n=[...prev]; n[idx]=MOCK_RESULTS[idx+1]; return n; });
  }

  const done   = statuses.filter(s=>s==="done").length;
  const errors = statuses.filter(s=>s==="error").length;
  const progress = Math.round((done/10)*100);
  const totalTokens = STEPS.reduce((s,st)=>s+st.tokens,0);
  const totalRecords = 182441;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pipeline Runner</h1>
        <p className="text-slate-500 mt-1 text-sm">업체 데이터를 선택하고 10단계 온보딩 파이프라인을 실행합니다</p>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-slate-200">
        {([["runner","파이프라인 실행"],["history","실행 이력"]] as const).map(([k,l])=>(
          <button key={k} onClick={()=>setMainTab(k)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${mainTab===k?"border-blue-600 text-blue-700":"border-transparent text-slate-500 hover:text-slate-700"}`}>
            {l}
          </button>
        ))}
      </div>

      {mainTab==="runner"&&(
        <>
          {/* 업체 카드 선택 */}
          <div className="grid grid-cols-4 gap-3">
            {COMPANIES.map(c=>(
              <button key={c.id} onClick={()=>!running&&setCompany(c.id)} disabled={running}
                className={`rounded-xl border-2 p-3 text-left transition-all disabled:opacity-50 ${company===c.id?c.color+" shadow-sm":c.color.replace("border-","border-").replace("bg-","bg-").replace("50","50")+" opacity-50 border-slate-200 bg-white"}`}>
                <div className="text-sm font-bold">{c.name}</div>
                <div className="text-xs opacity-70 mt-0.5">{c.sub}</div>
              </button>
            ))}
          </div>

          {/* 컨트롤 + KPI */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-6 flex-wrap">
            <div className="flex gap-2">
              {!running ? (
                <button onClick={runPipeline}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">
                  <Play className="w-4 h-4"/>파이프라인 실행
                </button>
              ) : (
                <button onClick={stop}
                  className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700">
                  <Square className="w-4 h-4"/>중지
                </button>
              )}
              <button onClick={reset}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50">
                <RotateCcw className="w-4 h-4"/>초기화
              </button>
            </div>
            <div className="flex gap-5 ml-auto text-center">
              {[
                {label:"진행률", value:`${progress}%`, cls:"text-blue-700"},
                {label:"완료",   value:done,             cls:"text-emerald-600"},
                {label:"오류",   value:errors,           cls:"text-rose-600"},
                {label:"소요",   value:`${elapsed}s`,  cls:"text-slate-700"},
                {label:"토큰",   value:`${(totalTokens/1000).toFixed(1)}k`, cls:"text-violet-700"},
              ].map(({label,value,cls})=>(
                <div key={label}>
                  <div className={`text-xl font-bold ${cls}`}>{value}</div>
                  <div className="text-xs text-slate-400">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 전체 진행바 */}
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{width:`${progress}%`}}/>
          </div>

          {/* 소요시간 차트 */}
          {actualDurations.some(d=>d>0)&&(
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-semibold text-slate-700 mb-2">단계별 소요시간</div>
              <DurationChart durations={actualDurations}/>
            </div>
          )}

          {/* 스텝 목록 */}
          <div className="space-y-2">
            {STEPS.map((step,i)=>{
              const status = statuses[i];
              const result = results[i];
              const Icon = step.icon;
              const isSelected = selected===i;
              return (
                <div key={step.id} onClick={()=>setSelected(isSelected?null:i)}
                  className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm flex items-center gap-4 ${isSelected?"border-blue-400 ring-2 ring-blue-100":status==="error"?"border-rose-200":"border-slate-200"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${status==="done"?"bg-emerald-100 text-emerald-700":status==="running"?"bg-blue-100 text-blue-700":status==="error"?"bg-rose-100 text-rose-600":"bg-slate-100 text-slate-400"}`}>
                    {status==="done"?<CheckCircle2 className="w-5 h-5"/>:status==="running"?<Loader2 className="w-5 h-5 animate-spin"/>:status==="error"?<AlertCircle className="w-5 h-5"/>:step.id}
                  </div>
                  <div className={`p-2 rounded-lg shrink-0 ${status==="done"?"bg-emerald-50 text-emerald-600":status==="running"?"bg-blue-50 text-blue-600":"bg-slate-50 text-slate-400"}`}>
                    <Icon className="w-4 h-4"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{step.name}</span>
                      {status==="running"&&<span className="text-xs text-blue-600 font-medium animate-pulse">처리 중...</span>}
                      {status==="error"&&(
                        <button onClick={e=>{e.stopPropagation();retryStep(i);}}
                          className="text-xs px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full border border-rose-200 hover:bg-rose-100">Retry</button>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 truncate">{result?result.summary:step.desc}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs text-slate-400">
                    {actualDurations[i]>0&&(
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3"/>{(actualDurations[i]/1000).toFixed(1)}s</span>
                    )}
                    <span className="flex items-center gap-1"><Cpu className="w-3 h-3"/>{step.tokens.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {mainTab==="history"&&(
        <div className="space-y-3">
          {HISTORY.map(h=>(
            <div key={h.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{h.company}</span>
                    <span className="text-xs text-slate-400">{h.date}</span>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs">
                    <span className="flex items-center gap-1 text-slate-500"><Clock className="w-3 h-3"/>{h.duration}</span>
                    <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3 h-3"/>완료 {h.done}/10</span>
                    {h.errors>0&&<span className="flex items-center gap-1 text-rose-500"><AlertCircle className="w-3 h-3"/>오류 {h.errors}</span>}
                    <span className="flex items-center gap-1 text-blue-600"><Zap className="w-3 h-3"/>품질 {h.score}점</span>
                    <span className="flex items-center gap-1 text-violet-600"><Cpu className="w-3 h-3"/>토큰 {h.tokens}</span>
                  </div>
                </div>
                <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-emerald-500 rounded-full" style={{width:`${(h.done/10)*100}%`}}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected!==null&&(
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={()=>setSelected(null)}/>
          <StepPanel idx={selected} statuses={statuses} results={results as any}
            onClose={()=>setSelected(null)} onRetry={retryStep}/>
        </>
      )}
    </div>
  );
}
