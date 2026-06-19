"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bot, Play, StopCircle, CheckCircle2, AlertTriangle, Clock,
  ChevronRight, Loader2, Brain, FileSearch, GitBranch, Sparkles,
  Users, Network, Share2, CheckSquare, BarChart2,
  AlertCircle, RefreshCw, X, Zap, Database, Activity
} from "lucide-react";

type StepStatus = "waiting"|"thinking"|"running"|"done"|"error"|"escalated";

interface PipelineStep {
  id:number; name:string; nameEn:string; icon:React.ReactNode; desc:string;
  aiDecision:string; duration:number; escalate?:boolean;
  dataSample:string[]; quality:{label:string;val:number}[];
}

const COMPANIES = [
  {id:"A",name:"A업체 (주)한국정밀",sector:"CNC 정밀가공"},
  {id:"B",name:"B업체 (주)대성금속",sector:"프레스·판금"},
  {id:"C",name:"C업체 서울테크",sector:"전자부품 조립"},
  {id:"D",name:"D업체 (주)미래PCB",sector:"PCB 제조"},
];

const STEPS: PipelineStep[] = [
  {id:1,name:"데이터 원천 스캔",nameEn:"Source Scan",icon:<FileSearch className="w-4 h-4"/>,
   desc:"ERP DB, 파일서버, API 엔드포인트 자동 탐지",
   aiDecision:"총 7개 데이터 원천 발견. ERP (Oracle 19c) × 1, Excel 파일 × 4, REST API × 2. 모두 접근 가능 상태 확인됨.",
   duration:2200,
   dataSample:["oracle_19c://erp.internal:1521","file://share/BOM_v3.xlsx","https://api.mes.internal/v2/quality"],
   quality:[{label:"접근성",val:100},{label:"응답속도",val:92},{label:"스키마 존재",val:86}]},
  {id:2,name:"스키마 프로파일링",nameEn:"Schema Profile",icon:<GitBranch className="w-4 h-4"/>,
   desc:"컬럼 구조·Null 비율·중복률 분석",
   aiDecision:"312개 컬럼 분석 완료. Null 비율 5% 초과 컬럼 18개 식별. 중복 키 패턴 3종 감지. 자동 정규화 룰 생성 준비.",
   duration:3100,
   dataSample:["ITEM_CODE VARCHAR2(20) NOT NULL","MFG_DATE DATE NULL (Null 12%)","QTY NUMBER(10,3) NOT NULL"],
   quality:[{label:"완전성",val:88},{label:"유일성",val:95},{label:"구조일관성",val:82}]},
  {id:3,name:"문서 파싱",nameEn:"Document Parse",icon:<FileSearch className="w-4 h-4"/>,
   desc:"PDF 성적서·거래명세서 OCR 추출",
   aiDecision:"PDF 23건 파싱 성공. 수기 작성 스캔본 2건은 신뢰도 낮아 Human Review 큐에 별도 등록.",
   duration:4800,escalate:false,
   dataSample:["성적서_20240310.pdf → 신뢰도 97%","거래명세서_Q1.pdf → 신뢰도 91%","스캔본_수기.pdf → 신뢰도 51% (에스컬레이션)"],
   quality:[{label:"OCR 정확도",val:94},{label:"파싱 성공률",val:92},{label:"구조 인식",val:88}]},
  {id:4,name:"데이터 정제",nameEn:"Data Clean",icon:<Sparkles className="w-4 h-4"/>,
   desc:"날짜 포맷·단위·중복 레코드 정제",
   aiDecision:"날짜 포맷 3종 → ISO8601 통일. 단위 혼용(kg/KG/킬로그램) 표준화. 중복 레코드 47건 제거.",
   duration:2600,
   dataSample:["2024/03/10 → 2024-03-10 (ISO8601)","KG → kg (단위 표준화)","중복 PO#20240112 제거 (47건)"],
   quality:[{label:"포맷 통일",val:100},{label:"단위 표준화",val:98},{label:"중복 제거",val:96}]},
  {id:5,name:"엔티티 통합",nameEn:"Entity Resolution",icon:<Users className="w-4 h-4"/>,
   desc:"동일 공급사·제품의 이름 변형 통합",
   aiDecision:"공급사 표기 변형 12쌍 통합 (예: 삼성전자주 = 삼성전자(주)). 제품코드 매핑 테이블 자동 생성.",
   duration:3400,
   dataSample:["삼성전자주 ≡ 삼성전자(주) [유사도 0.97]","AL6061-T6 ≡ AL6061T6 [유사도 0.95]","PCB_v2 ≡ PCB-REV2 [유사도 0.91]"],
   quality:[{label:"매핑 정확도",val:97},{label:"커버리지",val:89},{label:"충돌 해소",val:93}]},
  {id:6,name:"온톨로지 매핑",nameEn:"Ontology Map",icon:<Network className="w-4 h-4"/>,
   desc:"10M 온톨로지 12개 도메인 매핑",
   aiDecision:"컬럼 312개 중 287개 자동 매핑 성공 (92%). 미매핑 25개는 유사도 0.6 이하 — 상위 3개 후보와 함께 Human Review 요청.",
   duration:3900,escalate:true,
   dataSample:["ITEM_CODE → ont:ProductCode [0.98]","SHIP_DATE → ont:DeliveryDate [0.94]","PROC_CD → ? [후보: ont:ProcessCode 0.58]"],
   quality:[{label:"자동매핑률",val:92},{label:"매핑 신뢰도",val:89},{label:"도메인 커버",val:85}]},
  {id:7,name:"그래프 구축",nameEn:"Graph Build",icon:<Share2 className="w-4 h-4"/>,
   desc:"지식 그래프 노드·엣지 생성",
   aiDecision:"노드 1,847개, 엣지 5,214개 생성. 고립 노드 3개 감지 → 자동 연결 시도. 그래프 밀도 지수: 0.72 (목표 0.6 초과).",
   duration:5200,
   dataSample:["Node: Product#AL6061 [연결 12개]","Node: Supplier#Chalco [연결 7개]","Edge: supplies → 품질 0.89"],
   quality:[{label:"그래프 밀도",val:72},{label:"연결성",val:96},{label:"고립 노드",val:98}]},
  {id:8,name:"품질 검증",nameEn:"Quality Validate",icon:<CheckSquare className="w-4 h-4"/>,
   desc:"6대 품질 지표 자동 측정",
   aiDecision:"완전성 89%, 정확성 91%, 일관성 87%, 유효성 93%, 적시성 85%, 유일성 96%. 종합 품질 점수 89.8점.",
   duration:2100,
   dataSample:["완전성: 89% (목표 85% 초과)","정확성: 91% (목표 90% 초과)","일관성: 87% (목표 85% 초과)"],
   quality:[{label:"완전성",val:89},{label:"정확성",val:91},{label:"일관성",val:87},{label:"유효성",val:93}]},
  {id:9,name:"GraphRAG 색인",nameEn:"GraphRAG Index",icon:<Brain className="w-4 h-4"/>,
   desc:"벡터 임베딩 생성 및 검색 인덱스 빌드",
   aiDecision:"1,847개 노드 임베딩 완료. HNSW 인덱스 빌드 성공. 쿼리 응답 시간 P95 180ms — 목표값 200ms 달성.",
   duration:6100,
   dataSample:["노드 1,847개 임베딩 dim=1536","HNSW ef_construction=200, M=16","P95 쿼리 응답: 180ms"],
   quality:[{label:"임베딩 커버",val:100},{label:"인덱스 정확도",val:94},{label:"쿼리 성능",val:90}]},
  {id:10,name:"AI-Readiness 평가",nameEn:"Readiness Score",icon:<BarChart2 className="w-4 h-4"/>,
   desc:"종합 점수 산출 및 리포트 생성",
   aiDecision:"AI-Readiness 종합 82점 산출. 데이터 품질 89점, 연결성 78점, 완전성 84점, 표준화 81점. 전체 업체 상위 15% 수준.",
   duration:1800,
   dataSample:["종합 82점 (상위 15%)","데이터 품질: 89점","연결성: 78점 (개선 권고)"],
   quality:[{label:"종합",val:82},{label:"데이터품질",val:89},{label:"연결성",val:78},{label:"완전성",val:84}]},
];

const STATUS_CFG: Record<StepStatus,{color:string;bg:string;label:string}> = {
  waiting:   {color:"text-slate-400",  bg:"bg-slate-100",  label:"대기"},
  thinking:  {color:"text-purple-600", bg:"bg-purple-50",  label:"AI 분석 중"},
  running:   {color:"text-blue-600",   bg:"bg-blue-50",    label:"실행 중"},
  done:      {color:"text-emerald-600",bg:"bg-emerald-50", label:"완료"},
  error:     {color:"text-rose-600",   bg:"bg-rose-50",    label:"오류"},
  escalated: {color:"text-amber-600",  bg:"bg-amber-50",   label:"Human Review"},
};

const RADAR_AXES = ["완전성","정확성","일관성","유효성","적시성","유일성"];
const RADAR_VALS = [89,91,87,93,85,96];

function RadarChart({vals,active}:{vals:number[];active:boolean}) {
  const cx=80,cy=80,r=60,n=vals.length;
  const angle=(i:number)=>(Math.PI*2*i/n)-Math.PI/2;
  const pt=(i:number,pct:number)=>{
    const a=angle(i); const rr=r*pct/100;
    return {x:cx+rr*Math.cos(a), y:cy+rr*Math.sin(a)};
  };
  const axPt=(i:number)=>pt(i,100);
  const webPts=vals.map((_,i)=>pt(i,vals[i]));
  const toPath=(pts:{x:number;y:number}[])=>pts.map((p,i)=>(i===0?"M":"L")+p.x.toFixed(1)+","+p.y.toFixed(1)).join(" ")+"Z";
  return (
    <svg viewBox="0 0 160 160" width={140} height={140}>
      {[20,40,60,80,100].map(pct=>(
        <polygon key={pct}
          points={Array.from({length:n},(_,i)=>{const p=pt(i,pct);return p.x.toFixed(1)+","+p.y.toFixed(1);}).join(" ")}
          fill="none" stroke="#e2e8f0" strokeWidth="1"/>
      ))}
      {Array.from({length:n},(_,i)=>{const p=axPt(i);return <line key={i} x1={cx} y1={cy} x2={p.x.toFixed(1)} y2={p.y.toFixed(1)} stroke="#e2e8f0" strokeWidth="1"/>;}).flat()}
      <path d={toPath(webPts)} fill={active?"rgba(99,102,241,0.2)":"rgba(148,163,184,0.15)"} stroke={active?"#6366f1":"#94a3b8"} strokeWidth="2"/>
      {webPts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={3} fill={active?"#6366f1":"#94a3b8"}/>)}
      {Array.from({length:n},(_,i)=>{
        const a=angle(i); const lx=cx+(r+16)*Math.cos(a); const ly=cy+(r+16)*Math.sin(a);
        return <text key={i} x={lx.toFixed(1)} y={ly.toFixed(1)} fontSize="8" textAnchor="middle" dominantBaseline="middle" fill="#64748b">{RADAR_AXES[i]}</text>;
      })}
    </svg>
  );
}

function StepPanel({step,onClose}:{step:PipelineStep;onClose:()=>void}) {
  const [tab,setTab]=useState<"ai"|"data"|"quality">("ai");
  return (
    <div className="fixed inset-y-0 right-0 w-[440px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50">
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
        <div>
          <div className="text-xs text-slate-400 mb-1">Step {step.id} · {step.nameEn}</div>
          <h2 className="text-base font-bold text-slate-900">{step.name}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4"/></button>
      </div>
      <div className="flex border-b border-slate-100">
        {(["ai","data","quality"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={"flex-1 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors "+(tab===t?"border-blue-600 text-blue-700":"border-transparent text-slate-500 hover:text-slate-700")}>
            {t==="ai"?"AI 결정":t==="data"?"데이터 샘플":"품질 지표"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tab==="ai"&&(
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-purple-700">
              <Brain className="w-3.5 h-3.5"/>AI 의사결정 로그
            </div>
            <p className="text-sm text-purple-900 leading-relaxed">{step.aiDecision}</p>
          </div>
        )}
        {tab==="data"&&(
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500">샘플 데이터 ({step.dataSample.length}건)</p>
            {step.dataSample.map((d,i)=>(
              <div key={i} className="bg-slate-900 rounded-lg px-3 py-2 font-mono text-xs text-emerald-400">{d}</div>
            ))}
          </div>
        )}
        {tab==="quality"&&(
          <div className="space-y-3">
            {step.quality.map(q=>(
              <div key={q.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">{q.label}</span>
                  <span className={"font-bold "+(q.val>=90?"text-emerald-600":q.val>=75?"text-amber-600":"text-rose-600")}>{q.val}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={"h-full rounded-full "+(q.val>=90?"bg-emerald-400":q.val>=75?"bg-amber-400":"bg-rose-400")} style={{width:q.val+"%"}}/>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const FEED_POOL = [
  "스키마 스캔 완료 — ERP 312개 컬럼 인식",
  "OCR 처리 중 — 성적서 PDF 배치 실행",
  "엔티티 해소 — 공급사명 변형 12쌍 감지",
  "온톨로지 매핑 중 — 도메인 Order 처리",
  "임베딩 생성 중 — 노드 배치 #3 완료",
  "품질 지표 업데이트 — 완전성 89% 확인",
  "에스컬레이션 — 미매핑 컬럼 Human Review 등록",
  "그래프 인덱스 갱신 — 엣지 +127개",
];

export default function AutoOnboarding() {
  const [company,setCompany]=useState("A");
  const [running,setRunning]=useState(false);
  const [stepStatuses,setStepStatuses]=useState<Record<number,StepStatus>>(
    Object.fromEntries(STEPS.map(s=>[s.id,"waiting"]))
  );
  const [stepLogs,setStepLogs]=useState<Record<number,string>>({});
  const [currentStep,setCurrentStep]=useState(0);
  const [completed,setCompleted]=useState(false);
  const [elapsed,setElapsed]=useState(0);
  const [selectedStep,setSelectedStep]=useState<number|null>(null);
  const [feed,setFeed]=useState<{msg:string;ts:string}[]>([]);
  const [escalationTick,setEscalationTick]=useState(0);
  const timerRef=useRef<ReturnType<typeof setInterval>|null>(null);
  const feedRef=useRef<ReturnType<typeof setInterval>|null>(null);
  const abortRef=useRef(false);

  useEffect(()=>{
    if(running){
      timerRef.current=setInterval(()=>setElapsed(e=>e+100),100);
      feedRef.current=setInterval(()=>{
        const msg=FEED_POOL[Math.floor(Math.random()*FEED_POOL.length)];
        const ts=new Date().toLocaleTimeString("ko-KR",{hour12:false});
        setFeed(prev=>[{msg,ts},...prev].slice(0,8));
        setEscalationTick(p=>p+(Math.random()>0.85?1:0));
      },1200);
    } else {
      if(timerRef.current) clearInterval(timerRef.current);
      if(feedRef.current) clearInterval(feedRef.current);
    }
    return ()=>{
      if(timerRef.current) clearInterval(timerRef.current);
      if(feedRef.current) clearInterval(feedRef.current);
    };
  },[running]);

  const reset=()=>{
    abortRef.current=true;
    setRunning(false); setCompleted(false); setCurrentStep(0);
    setElapsed(0); setEscalationTick(0);
    setStepStatuses(Object.fromEntries(STEPS.map(s=>[s.id,"waiting"])));
    setStepLogs({}); setFeed([]);
    setTimeout(()=>{ abortRef.current=false; },100);
  };

  const runPipeline=async()=>{
    abortRef.current=false;
    setRunning(true); setCompleted(false); setElapsed(0); setEscalationTick(0);
    setStepStatuses(Object.fromEntries(STEPS.map(s=>[s.id,"waiting"])));
    setStepLogs({}); setFeed([]);
    for(const step of STEPS){
      if(abortRef.current) break;
      setCurrentStep(step.id);
      setStepStatuses(prev=>({...prev,[step.id]:"thinking"}));
      await delay(600);
      if(abortRef.current) break;
      setStepStatuses(prev=>({...prev,[step.id]:"running"}));
      await delay(step.duration);
      if(abortRef.current) break;
      const finalStatus:StepStatus=step.escalate?"escalated":"done";
      setStepStatuses(prev=>({...prev,[step.id]:finalStatus}));
      setStepLogs(prev=>({...prev,[step.id]:step.aiDecision}));
    }
    if(!abortRef.current){ setCompleted(true); setRunning(false); }
  };

  const doneCount=Object.values(stepStatuses).filter(s=>s==="done"||s==="escalated").length;
  const escalatedCount=Object.values(stepStatuses).filter(s=>s==="escalated").length;
  const progress=Math.round((doneCount/STEPS.length)*100);
  const comp=COMPANIES.find(c=>c.id===company)!;
  const selStep=STEPS.find(s=>s.id===selectedStep)||null;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Auto Onboarding</h1>
          <p className="text-slate-500 mt-1 text-sm">AI 에이전트 10단계 온보딩 파이프라인 — 스텝 클릭 시 상세 패널 오픈</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-purple-600 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg">
          <Bot className="w-3.5 h-3.5"/>AI Agent v2.1 · Sonnet 4.6
        </div>
      </div>

      {/* KPI 4카드 */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-slate-700">{STEPS.length}단계</div>
          <div className="text-xs text-slate-500 mt-0.5">총 파이프라인</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className={"text-2xl font-bold "+(doneCount>0?"text-emerald-600":"text-slate-300")}>{doneCount}완료</div>
          <div className="text-xs text-slate-500 mt-0.5">처리 완료 스텝</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className={"text-2xl font-bold "+(escalatedCount>0?"text-amber-600":"text-slate-300")}>
            {escalatedCount+(escalationTick>0?"+"+escalationTick:"")}건
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Human Review</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-600 font-mono">{(elapsed/1000).toFixed(1)}s</div>
          <div className="text-xs text-slate-500 mt-0.5">경과 시간</div>
        </div>
      </div>

      {/* 업체 선택 + 실행 컨트롤 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-48">
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">대상 업체</label>
            <select value={company} onChange={e=>{if(!running){reset();setCompany(e.target.value);}}} disabled={running}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 disabled:bg-slate-50">
              {COMPANIES.map(c=><option key={c.id} value={c.id}>{c.name} — {c.sector}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-500">진행률</span>
              <span className="text-xs font-bold text-slate-700">{progress}%</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500" style={{width:progress+"%"}}/>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {running?(
              <button onClick={reset}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-sm font-semibold">
                <StopCircle className="w-4 h-4"/>중단
              </button>
            ):(
              <button onClick={runPipeline} disabled={completed}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-semibold disabled:opacity-40">
                <Play className="w-4 h-4"/>AI 자율 실행
              </button>
            )}
            {(completed||doneCount>0)&&!running&&(
              <button onClick={reset}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm">
                <RefreshCw className="w-4 h-4"/>초기화
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        {/* 파이프라인 스텝 목록 */}
        <div className="flex-1 space-y-2">
          {STEPS.map((step,idx)=>{
            const status=stepStatuses[step.id];
            const sc=STATUS_CFG[status];
            const log=stepLogs[step.id];
            const isActive=currentStep===step.id&&running;
            return (
              <div key={step.id} onClick={()=>setSelectedStep(selectedStep===step.id?null:step.id)}
                className={"bg-white rounded-xl border p-4 transition-all cursor-pointer hover:shadow-md "+(
                  isActive?"border-blue-300 ring-2 ring-blue-100 shadow-md":
                  status==="done"?"border-emerald-200":
                  status==="escalated"?"border-amber-200":
                  status==="error"?"border-rose-200":"border-slate-200"
                )}>
                <div className="flex items-start gap-3">
                  <div className={"flex items-center justify-center w-8 h-8 rounded-full shrink-0 font-bold text-sm "+sc.bg+" "+sc.color}>
                    {status==="thinking"||status==="running"?<Loader2 className="w-4 h-4 animate-spin"/>:
                     status==="done"?<CheckCircle2 className="w-4 h-4"/>:
                     status==="escalated"?<AlertTriangle className="w-4 h-4"/>:
                     status==="error"?<AlertCircle className="w-4 h-4"/>:
                     <span>{step.id}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800">{step.name}</span>
                      <span className="text-xs text-slate-400">{step.nameEn}</span>
                      <span className={"text-xs font-medium px-2 py-0.5 rounded-full "+sc.bg+" "+sc.color}>{sc.label}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
                    {log&&(
                      <div className={"mt-2 text-xs rounded-lg px-3 py-2 flex items-start gap-2 "+(status==="escalated"?"bg-amber-50 border border-amber-100 text-amber-800":"bg-slate-50 border border-slate-100 text-slate-600")}>
                        <Brain className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-500"/>
                        <span>{log}</span>
                      </div>
                    )}
                    {isActive&&(
                      <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse w-3/4"/>
                      </div>
                    )}
                  </div>
                  {idx<STEPS.length-1&&<ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-2"/>}
                </div>
              </div>
            );
          })}
        </div>

        {/* 우측 패널 */}
        <div className="w-64 shrink-0 space-y-4">
          {/* 업체 정보 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 mb-1">대상 업체</div>
            <div className="text-sm font-bold text-slate-800">{comp.name}</div>
            <div className="text-xs text-slate-500 mt-0.5">{comp.sector}</div>
          </div>

          {/* 실행 현황 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2.5">
            <div className="text-xs font-semibold text-slate-500">실행 현황</div>
            {(["done","escalated","running","waiting"] as StepStatus[]).map(s=>{
              const cnt=Object.values(stepStatuses).filter(v=>v===s).length;
              const sc=STATUS_CFG[s];
              return (
                <div key={s} className="flex items-center justify-between text-xs">
                  <span className={"font-medium "+sc.color}>{sc.label}</span>
                  <span className="font-bold text-slate-700">{cnt}단계</span>
                </div>
              );
            })}
          </div>

          {/* AI-Readiness 레이더 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 mb-2">AI-Readiness 지표</div>
            <div className="flex justify-center">
              <RadarChart vals={RADAR_VALS} active={completed}/>
            </div>
            {completed&&(
              <div className="text-center mt-1">
                <span className="text-2xl font-black text-indigo-600">82점</span>
                <span className="text-xs text-slate-400 ml-1">종합</span>
              </div>
            )}
          </div>

          {/* 완료 결과 */}
          {completed&&(
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4"/><span className="text-sm font-bold">온보딩 완료</span>
              </div>
              {[["데이터 품질","89점"],["연결성","78점"],["완전성","84점"],["표준화","81점"]].map(([k,v])=>(
                <div key={k} className="flex justify-between text-xs py-0.5">
                  <span className="text-blue-200">{k}</span><span className="font-bold">{v}</span>
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-blue-500 text-xs text-blue-200">
                소요: {(elapsed/1000).toFixed(1)}s · Human Review {escalatedCount}건
              </div>
            </div>
          )}

          {/* 에스컬레이션 */}
          {Object.values(stepStatuses).some(v=>v==="escalated")&&(
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 mb-2">
                <AlertTriangle className="w-3.5 h-3.5"/>Human Review 필요
              </div>
              <p className="text-xs text-amber-600">온톨로지 미매핑 25개 컬럼 — 상위 3개 후보와 함께 큐 등록됨</p>
              <button className="mt-2 text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors w-full">
                Human Review 이동
              </button>
            </div>
          )}

          {/* 실시간 피드 */}
          <div className="bg-slate-900 rounded-xl overflow-hidden">
            <div className="px-3 py-2.5 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400"/>
              <span className="text-xs text-slate-300 font-medium">온보딩 이벤트 피드</span>
              {running&&<span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-auto"/>}
            </div>
            <div className="divide-y divide-slate-800 max-h-44 overflow-y-auto">
              {feed.length===0&&<div className="px-3 py-2 text-xs text-slate-500">실행 시 이벤트가 표시됩니다</div>}
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

      {/* 슬라이드 패널 */}
      {selStep&&(
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={()=>setSelectedStep(null)}/>
          <StepPanel step={selStep} onClose={()=>setSelectedStep(null)}/>
        </>
      )}
    </div>
  );
}

function delay(ms:number){return new Promise(r=>setTimeout(r,ms));}
