"use client";

import { useState, useEffect, useRef } from "react";
import { Globe, CloudRain, Truck, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, X, Thermometer, Wind, Ship, Package } from "lucide-react";

// ── 타입 ──────────────────────────────────────────────────────────────
type RiskLevel = "critical" | "high" | "medium" | "low";

interface ExternalRisk {
  id: number;
  supplier: string;
  country: string;
  category: "weather" | "logistics" | "geopolitical" | "regulatory" | "pandemic";
  title: string;
  detail: string;
  level: RiskLevel;
  impact: string;
  probability: number;
  trend: "up" | "down" | "stable";
  affectedMaterial: string;
  leadTimeImpact: number; // 일 단위
  actions: string[];
  history: number[];       // 리스크 점수 7일
}

// ── 데이터 ────────────────────────────────────────────────────────────
const mkRiskHistory = (base: number) =>
  Array.from({ length: 7 }, () => Math.round(Math.max(10, Math.min(100, base + (Math.random()-0.5)*20))));

const INIT_RISKS: ExternalRisk[] = [
  {
    id:1, supplier:"A업체 (구미)", country:"대한민국", category:"weather",
    title:"태풍 KHANUN 접근 — 영남권 영향 예상",
    detail:"기상청 예보에 따르면 8월 11일 태풍이 경북 내륙을 통과 예정. 구미공단 가동 차질 우려.",
    level:"high", impact:"AL6061-T6 입고 지연 2~4일", probability:72, trend:"up",
    affectedMaterial:"AL6061-T6 판재", leadTimeImpact:3,
    actions:["A업체에 사전 재고 확보 요청","비상 재고 목표 15일 → 25일 상향","대체 공급사 B업체 견적 요청"],
    history: mkRiskHistory(65),
  },
  {
    id:2, supplier:"B업체 (평택)", country:"대한민국", category:"logistics",
    title:"평택항 항만 파업 예고 — 9월 1일",
    detail:"전국항운노조 파업 예고. 수출입 컨테이너 처리 중단 가능성. SAP ERP 발주 연기 필요.",
    level:"critical", impact:"SAP ERP 연동 부품 전반 영향", probability:85, trend:"up",
    affectedMaterial:"수입 부품 전반", leadTimeImpact:7,
    actions:["항구 경유 발주 일정 2주 앞당기기","인천항 대체 경로 검토","비상 재고 카테고리 지정"],
    history: mkRiskHistory(80),
  },
  {
    id:3, supplier:"C업체 (해외)", country:"중국 광저우", category:"geopolitical",
    title:"미중 반도체 수출 통제 확대",
    detail:"미국 BIS의 반도체 수출 규제 확대로 중국산 부품 조달 불확실성 증가.",
    level:"high", impact:"컨트롤러 IC 리드타임 6주→14주", probability:61, trend:"stable",
    affectedMaterial:"MCU·FPGA 부품", leadTimeImpact:56,
    actions:["국내 대체 공급처 발굴 (삼성, SK)","재고 12주치 선확보","PCB 설계 변경 검토"],
    history: mkRiskHistory(60),
  },
  {
    id:4, supplier:"D업체 (인도)", country:"인도 푸네", category:"weather",
    title:"몬순 시즌 인도 물류 차질",
    detail:"6~9월 인도 몬순 시즌. Odoo ERP 연동 D업체 생산 공장 침수 위험 중간 수준.",
    level:"medium", impact:"정밀 주조 부품 지연 1~2주", probability:45, trend:"stable",
    affectedMaterial:"정밀 주조 부품", leadTimeImpact:10,
    actions:["D업체 공장 고도 확인 완료 (해발 540m — 안전)","9월 이후 발주 집중"],
    history: mkRiskHistory(40),
  },
  {
    id:5, supplier:"E업체 (베트남)", country:"베트남 하노이", category:"regulatory",
    title:"베트남 탄소세 시행 — 2026 Q4",
    detail:"베트남 탄소세 법안 통과. 2026년 Q4부터 제조업 탄소 배출에 과세. 납품 원가 상승 예상.",
    level:"medium", impact:"부품 단가 5~8% 상승 예상", probability:90, trend:"up",
    affectedMaterial:"PCB 기판 (베트남산)", leadTimeImpact:0,
    actions:["2026 Q4 이전 장기 계약 체결","원가 상승분 판매가 반영 검토","국내 PCB 제조사 견적 비교"],
    history: mkRiskHistory(50),
  },
  {
    id:6, supplier:"공급망 전반", country:"글로벌", category:"pandemic",
    title:"동남아 신규 감염병 모니터링 중",
    detail:"WHO 공지: 미얀마·태국 국경 지역 원인불명 발열 환자 증가. 현재 물류 영향 없음. 관찰 단계.",
    level:"low", impact:"현재 영향 없음 — 모니터링 중", probability:18, trend:"stable",
    affectedMaterial:"동남아 경유 수입 부품", leadTimeImpact:0,
    actions:["WHO 주간 브리핑 모니터링","동남아 공급사 1차 영향 조사"],
    history: mkRiskHistory(20),
  },
];

const FEED_POOL = [
  ()=>({ msg:"태풍 KHANUN — 예상 경로 경북 내륙 통과 확정", ok:false }),
  ()=>({ msg:"평택항 파업 협상 재개 — 진행 중", ok:true }),
  ()=>({ msg:`기상 예보 업데이트 — 구미 강수 확률 ${Math.round(60+Math.random()*30)}%`, ok:false }),
  ()=>({ msg:"D업체 (인도) 공장 정상 가동 확인", ok:true }),
  ()=>({ msg:`탄소세 적용 단가 시뮬레이션 완료 — +${(5+Math.random()*3).toFixed(1)}%`, ok:false }),
  ()=>({ msg:"공급망 AI 리스크 스코어 갱신 완료", ok:true }),
  ()=>({ msg:"글로벌 해상 운임 WCI 지수 전주 대비 +2.3%", ok:false }),
];

const levelColor: Record<RiskLevel, string> = {
  critical: "bg-rose-100 text-rose-700",
  high:     "bg-orange-100 text-orange-700",
  medium:   "bg-amber-100 text-amber-700",
  low:      "bg-slate-100 text-slate-600",
};
const levelBorder: Record<RiskLevel, string> = {
  critical: "border-l-rose-500",
  high:     "border-l-orange-400",
  medium:   "border-l-amber-400",
  low:      "border-l-slate-300",
};
const catIcon: Record<string, React.ElementType> = {
  weather: CloudRain, logistics: Truck, geopolitical: Globe, regulatory: Package, pandemic: Wind,
};
const catLabel: Record<string, string> = {
  weather:"기상", logistics:"물류", geopolitical:"지정학", regulatory:"규제", pandemic:"감염병",
};

function RiskSparkLine({ data }: { data: number[] }) {
  const W = 120; const H = 32;
  const min = Math.min(...data); const max = Math.max(...data,1);
  const pts = data.map((v,i)=>`${(i/(data.length-1))*W},${H-((v-min)/(max-min||1))*H}`).join(" ");
  const color = data[data.length-1]>70?"#ef4444":data[data.length-1]>40?"#f59e0b":"#10b981";
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round"/>
      <circle cx={(data.length-1)/(data.length-1)*W} cy={H-((data[data.length-1]-min)/(max-min||1))*H} r={2.5} fill={color}/>
    </svg>
  );
}

function RiskPanel({ risk, onClose }: { risk: ExternalRisk; onClose: () => void }) {
  const [tab, setTab] = useState<"detail"|"impact"|"action">("detail");
  const Icon = catIcon[risk.category];
  return (
    <div className="fixed inset-y-0 right-0 w-[460px] bg-white shadow-2xl z-50 flex flex-col">
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
        <div className="flex-1 pr-3">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${levelColor[risk.level]}`}>
              {risk.level==="critical"?"위급":risk.level==="high"?"높음":risk.level==="medium"?"보통":"낮음"}
            </span>
            <span className="text-xs text-slate-400">{catLabel[risk.category]}</span>
          </div>
          <div className="font-bold text-slate-900 text-sm">{risk.title}</div>
          <div className="text-xs text-slate-400 mt-0.5">{risk.supplier} · {risk.country}</div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4"/></button>
      </div>
      <div className="flex border-b border-slate-200 px-4">
        {(["detail","impact","action"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors ${tab===t?"border-blue-600 text-blue-700":"border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t==="detail"?"리스크 상세":t==="impact"?"영향 분석":"대응 방안"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {tab==="detail"&&(
          <>
            <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed">{risk.detail}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs text-slate-500">발생 확률</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{risk.probability}%</div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                  <div className="h-full rounded-full" style={{width:`${risk.probability}%`,background:risk.probability>70?"#ef4444":risk.probability>40?"#f59e0b":"#10b981"}}/>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs text-slate-500">리스크 추이 (7일)</div>
                <RiskSparkLine data={risk.history}/>
              </div>
            </div>
          </>
        )}
        {tab==="impact"&&(
          <div className="space-y-3">
            <div className={`border-l-4 ${levelBorder[risk.level]} pl-4 py-2`}>
              <div className="text-xs text-slate-500">영향 요약</div>
              <div className="text-sm font-semibold text-slate-800 mt-0.5">{risk.impact}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-slate-500">영향 자재</div>
                <div className="font-semibold text-slate-800 mt-0.5">{risk.affectedMaterial}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-slate-500">리드타임 영향</div>
                <div className={`font-semibold mt-0.5 ${risk.leadTimeImpact>0?"text-rose-700":"text-emerald-700"}`}>
                  {risk.leadTimeImpact>0?`+${risk.leadTimeImpact}일 지연`:"영향 없음"}
                </div>
              </div>
            </div>
          </div>
        )}
        {tab==="action"&&(
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-600 mb-1">AI 권고 대응 방안</div>
            {risk.actions.map((a,i)=>(
              <div key={i} className="flex items-start gap-3 bg-blue-50 rounded-lg p-3">
                <span className="text-xs font-bold text-blue-600 mt-0.5">{i+1}</span>
                <div className="text-xs text-blue-700">{a}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────────
export default function MilieuMonitor() {
  const [risks, setRisks] = useState<ExternalRisk[]>(INIT_RISKS);
  const [selected, setSelected] = useState<ExternalRisk|null>(null);
  const [feed, setFeed] = useState<{msg:string;ok:boolean;ts:string}[]>([]);
  const [levelFilter, setLevelFilter] = useState<RiskLevel|"all">("all");
  const tickRef = useRef(0);

  useEffect(()=>{
    const id = setInterval(()=>{
      tickRef.current++;
      setRisks(prev=>prev.map(r=>({
        ...r,
        probability: Math.min(99,Math.max(5,r.probability+(Math.random()-.5)*3|0)),
      })));
      const pool = FEED_POOL[Math.floor(Math.random()*FEED_POOL.length)];
      const ev = pool();
      const now = new Date();
      const ts = `${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}:${now.getSeconds().toString().padStart(2,"0")}`;
      setFeed(prev=>[{...ev,ts},...prev].slice(0,25));
    },1200);
    return ()=>clearInterval(id);
  },[]);

  const counts = {
    all: risks.length,
    critical: risks.filter(r=>r.level==="critical").length,
    high: risks.filter(r=>r.level==="high").length,
    medium: risks.filter(r=>r.level==="medium").length,
    low: risks.filter(r=>r.level==="low").length,
  };
  const filtered = levelFilter==="all" ? risks : risks.filter(r=>r.level===levelFilter);
  const avgRisk = Math.round(risks.reduce((a,r)=>a+r.probability,0)/risks.length);
  const totalDelay = risks.reduce((a,r)=>a+r.leadTimeImpact,0);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Milieu Monitor</h1>
          <p className="text-slate-500 mt-1 text-sm">공장 외부 환경·공급망 기후 리스크 — 10M Milieu 도메인</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full">
          <Globe className="w-3.5 h-3.5"/>글로벌 모니터링 중
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-rose-600 font-medium">위험 리스크</span>
            <AlertTriangle className="w-4 h-4 text-rose-500"/>
          </div>
          <div className="text-2xl font-bold text-rose-700">{counts.critical+counts.high}</div>
          <div className="text-[11px] text-rose-500 mt-0.5">즉각 대응 필요</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-amber-600 font-medium">모니터링 중</span>
            <Globe className="w-4 h-4 text-amber-500"/>
          </div>
          <div className="text-2xl font-bold text-amber-700">{counts.medium+counts.low}</div>
          <div className="text-[11px] text-amber-500 mt-0.5">중·저 리스크</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-blue-600 font-medium">평균 리스크 점수</span>
            <TrendingUp className="w-4 h-4 text-blue-500"/>
          </div>
          <div className="text-2xl font-bold text-blue-700">{avgRisk}</div>
          <div className="text-[11px] text-blue-500 mt-0.5">0~100 스케일</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-orange-600 font-medium">예상 리드타임 영향</span>
            <Truck className="w-4 h-4 text-orange-500"/>
          </div>
          <div className="text-2xl font-bold text-orange-700">{totalDelay}<span className="text-sm font-normal ml-1">일</span></div>
          <div className="text-[11px] text-orange-500 mt-0.5">누적 지연 합산</div>
        </div>
      </div>

      {/* 실시간 피드 */}
      <div className="bg-slate-900 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-3.5 h-3.5 text-blue-400"/>
          <span className="text-xs font-semibold text-slate-300">외부 환경 실시간 이벤트</span>
        </div>
        <div className="space-y-1.5 max-h-28 overflow-y-auto">
          {feed.length===0?<div className="text-xs text-slate-500 text-center py-3">이벤트 대기 중...</div>:
          feed.map((ev,i)=>(
            <div key={i} className="flex items-center gap-3 text-xs font-mono">
              <span className="text-slate-500 whitespace-nowrap">{ev.ts}</span>
              <span className={ev.ok?"text-emerald-400":"text-rose-400"}>{ev.msg}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 font-medium">리스크 수준:</span>
        {([["all","전체"],["critical","위급"],["high","높음"],["medium","보통"],["low","낮음"]] as const).map(([k,l])=>(
          <button key={k} onClick={()=>setLevelFilter(k)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${levelFilter===k?"bg-blue-600 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {l} {k!=="all"&&`(${counts[k]})`}
          </button>
        ))}
      </div>

      {/* 리스크 카드 목록 */}
      <div className="space-y-3">
        {filtered.map(r=>{
          const Icon = catIcon[r.category];
          return (
            <div key={r.id} onClick={()=>setSelected(r)}
              className={`bg-white border border-slate-200 border-l-4 ${levelBorder[r.level]} rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow`}>
              <div className="flex items-start gap-4">
                <div className="mt-0.5 p-2 bg-slate-100 rounded-lg">
                  <Icon className="w-4 h-4 text-slate-600"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${levelColor[r.level]}`}>
                      {r.level==="critical"?"위급":r.level==="high"?"높음":r.level==="medium"?"보통":"낮음"}
                    </span>
                    <span className="text-xs text-slate-400">{catLabel[r.category]}</span>
                    <span className="text-xs text-slate-400">· {r.country}</span>
                  </div>
                  <div className="font-semibold text-slate-800 text-sm">{r.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">{r.impact}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs text-slate-400 mb-1">발생확률</div>
                  <div className={`text-lg font-bold ${r.probability>70?"text-rose-600":r.probability>40?"text-amber-600":"text-emerald-600"}`}>{r.probability}%</div>
                  <RiskSparkLine data={r.history}/>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selected&&(
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={()=>setSelected(null)}/>
          <RiskPanel risk={selected} onClose={()=>setSelected(null)}/>
        </>
      )}
    </div>
  );
}
