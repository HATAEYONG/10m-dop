"use client";

import { useState, useEffect, useRef } from "react";
import { Zap, Flame, Wind, Leaf, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2, X, BarChart2, Clock, Settings } from "lucide-react";

// ── 타입 ──────────────────────────────────────────────────────────────
interface Equipment {
  id: number;
  name: string;
  area: string;
  power: number;       // kW 현재
  powerTarget: number; // kW 목표
  gas: number;         // m³/h
  status: "normal" | "peak" | "saving" | "off";
  efficiency: number;  // %
  dailyKwh: number;
  co2: number;         // kg
  history: number[];   // 전력 24h
  gasHistory: number[];
  tips: string[];
}

// ── 설비 데이터 ───────────────────────────────────────────────────────
const mkHistory = () => Array.from({ length: 24 }, (_, i) =>
  Math.round(60 + Math.sin(i / 3) * 20 + Math.random() * 10));
const mkGasHistory = () => Array.from({ length: 24 }, () =>
  Math.round((2 + Math.random() * 2) * 10) / 10);

const INIT_EQUIP: Equipment[] = [
  { id:1, name:"CNC 머시닝센터 #1", area:"가공1라인", power:48.2, powerTarget:45, gas:0, status:"peak", efficiency:82, dailyKwh:1157, co2:531, history:mkHistory(), gasHistory:[], tips:["주축 공회전 최소화","야간 저속 모드 적용"] },
  { id:2, name:"CNC 머시닝센터 #2", area:"가공1라인", power:45.7, powerTarget:45, gas:0, status:"normal", efficiency:88, dailyKwh:1097, co2:503, history:mkHistory(), gasHistory:[], tips:["냉각수 온도 최적화"] },
  { id:3, name:"TIG 용접기 #1", area:"용접라인", power:22.4, powerTarget:20, gas:1.8, status:"peak", efficiency:74, dailyKwh:538, co2:247, history:mkHistory(), gasHistory:mkGasHistory(), tips:["아크 온 타임 최소화","가스 유량 1.5→1.2 L/min 조정"] },
  { id:4, name:"프레스 #3", area:"프레스동", power:38.1, powerTarget:38, gas:0, status:"saving", efficiency:91, dailyKwh:915, co2:420, history:mkHistory(), gasHistory:[], tips:["대기 전력 우수"] },
  { id:5, name:"열처리로 #1", area:"열처리동", power:72.3, powerTarget:68, gas:12.4, status:"peak", efficiency:68, dailyKwh:1735, co2:1156, history:mkHistory(), gasHistory:mkGasHistory(), tips:["로 온도 설정값 5°C 하향","배치 가동률 향상 필요 (현재 72%)"] },
  { id:6, name:"공조 AHU-A", area:"전체", power:18.9, powerTarget:20, gas:0, status:"saving", efficiency:93, dailyKwh:454, co2:208, history:mkHistory(), gasHistory:[], tips:["인버터 효율 최고 상태"] },
  { id:7, name:"컴프레서 #2", area:"유틸리티", power:30.2, powerTarget:28, gas:0, status:"normal", efficiency:85, dailyKwh:725, co2:332, history:mkHistory(), gasHistory:[], tips:["공압 누기 점검 필요 (주 1회)"] },
  { id:8, name:"도금 정류기", area:"도금라인", power:55.8, powerTarget:55, gas:0, status:"normal", efficiency:87, dailyKwh:1339, co2:614, history:mkHistory(), gasHistory:[], tips:["전류 밀도 최적화 완료"] },
];

const FEED_POOL = [
  (n:string)=>({ msg:`${n} 전력 피크 감지 — ${Math.round(45+Math.random()*20)}kW 초과`, ok:false }),
  (n:string)=>({ msg:`${n} 절전 모드 전환 — ${Math.round(3+Math.random()*5)}kW 절감`, ok:true }),
  (n:string)=>({ msg:`가스 유량 정상화 — ${(1.2+Math.random()*0.8).toFixed(1)} m³/h`, ok:true }),
  (n:string)=>({ msg:`${n} 역률 개선 알림 — cos φ 0.91`, ok:true }),
  (n:string)=>({ msg:`${n} 과부하 경고 — 허용치의 107%`, ok:false }),
  (n:string)=>({ msg:`탄소 배출 임계치 도달 — 금일 ${Math.round(300+Math.random()*200)} tCO₂`, ok:false }),
  (n:string)=>({ msg:`${n} 대기 전력 자동 차단`, ok:true }),
];

const statusLabel: Record<string, string> = { peak:"피크", saving:"절전", normal:"정상", off:"정지" };
const statusColor: Record<string, string> = {
  peak:   "bg-rose-100 text-rose-700",
  saving: "bg-emerald-100 text-emerald-700",
  normal: "bg-blue-100 text-blue-700",
  off:    "bg-slate-100 text-slate-500",
};

// ── SVG 컴포넌트 ────────────────────────────────────────────────────
function PowerSparkLine({ data, color = "#3b82f6" }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const W = 220; const H = 50;
  const min = Math.min(...data); const max = Math.max(...data) + 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / (max - min)) * H}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <circle cx={(data.length - 1) / (data.length - 1) * W} cy={H - ((data[data.length-1] - min) / (max - min)) * H} r={3} fill={color} />
    </svg>
  );
}

function DailyBarChart({ equip }: { equip: Equipment[] }) {
  const W = 340; const H = 80;
  const vals = equip.map(e => e.dailyKwh);
  const max = Math.max(...vals, 1);
  const BW = Math.floor((W - 20) / vals.length) - 4;
  return (
    <svg width={W} height={H + 30} viewBox={`0 0 ${W} ${H + 30}`} className="w-full">
      {equip.map((e, i) => {
        const h = (e.dailyKwh / max) * H;
        const x = 10 + i * (BW + 4);
        const color = e.status === "peak" ? "#ef4444" : e.status === "saving" ? "#10b981" : "#3b82f6";
        return (
          <g key={e.id}>
            <rect x={x} y={H - h} width={BW} height={h} fill={color} rx={2} opacity={0.8} />
            <text x={x + BW/2} y={H + 14} textAnchor="middle" fontSize={8} fill="#94a3b8">{e.name.split(" ")[0]}</text>
            <text x={x + BW/2} y={H - h - 3} textAnchor="middle" fontSize={8} fill={color} fontWeight={600}>{(e.dailyKwh/1000).toFixed(1)}</text>
          </g>
        );
      })}
      <text x={W - 4} y={H + 28} textAnchor="end" fontSize={8} fill="#94a3b8">MWh/일</text>
    </svg>
  );
}

function EquipPanel({ eq, onClose }: { eq: Equipment; onClose: () => void }) {
  const [tab, setTab] = useState<"overview"|"history"|"ai">("overview");
  const tabs = [["overview","설비 현황"],["history","소비 이력"],["ai","AI 절감 제안"]] as const;
  const color = eq.status === "peak" ? "#ef4444" : eq.status === "saving" ? "#10b981" : "#3b82f6";

  return (
    <div className="fixed inset-y-0 right-0 w-[440px] bg-white shadow-2xl z-50 flex flex-col">
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
        <div>
          <div className="font-bold text-slate-900">{eq.name}</div>
          <div className="text-xs text-slate-400 mt-0.5">{eq.area}</div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4"/></button>
      </div>
      <div className="flex border-b border-slate-200 px-4">
        {tabs.map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors ${tab===k?"border-blue-600 text-blue-700":"border-transparent text-slate-500 hover:text-slate-700"}`}>{l}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {tab==="overview"&&(
          <>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label:"현재 전력", value:`${eq.power} kW`, sub:`목표 ${eq.powerTarget} kW` },
                { label:"가스 소비", value:eq.gas?`${eq.gas} m³/h`:"미사용", sub:"" },
                { label:"에너지 효율", value:`${eq.efficiency}%`, sub:eq.efficiency>=90?"우수":eq.efficiency>=75?"보통":"개선 필요" },
                { label:"CO₂ 환산", value:`${eq.co2} kg`, sub:"금일 누적" },
              ].map(c=>(
                <div key={c.label} className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-500">{c.label}</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">{c.value}</div>
                  {c.sub&&<div className="text-xs text-slate-400">{c.sub}</div>}
                </div>
              ))}
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-xs font-semibold text-slate-600 mb-2">24시간 전력 추이 (kW)</div>
              <PowerSparkLine data={eq.history} color={color}/>
            </div>
          </>
        )}
        {tab==="history"&&(
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              {["금일","금주","금월"].map((p,i)=>(
                <div key={p} className="bg-slate-50 rounded-lg p-3 text-center">
                  <div className="text-slate-400">{p}</div>
                  <div className="font-bold text-slate-900 mt-1">{((i+1)*eq.dailyKwh/1000).toFixed(1)}<span className="font-normal text-xs ml-0.5">MWh</span></div>
                </div>
              ))}
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-xs font-semibold text-slate-600 mb-2">시간대별 전력 소비</div>
              <PowerSparkLine data={eq.history} color={color}/>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>00:00</span><span>12:00</span><span>23:00</span></div>
            </div>
            {eq.gas>0&&(
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs font-semibold text-slate-600 mb-2">가스 소비 이력 (m³/h)</div>
                <PowerSparkLine data={eq.gasHistory} color="#f59e0b"/>
              </div>
            )}
          </div>
        )}
        {tab==="ai"&&(
          <div className="space-y-3">
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="text-xs font-semibold text-blue-700 mb-1">AI 분석 요약</div>
              <div className="text-xs text-blue-600">현재 에너지 효율 {eq.efficiency}% — {eq.efficiency>=90?"최적 운전 중입니다.":eq.efficiency>=75?`약 ${100-eq.efficiency}%의 개선 여지가 있습니다.`:"즉각적인 효율 개선이 필요합니다."}</div>
            </div>
            <div className="text-xs font-semibold text-slate-600">절감 제안</div>
            {eq.tips.map((t,i)=>(
              <div key={i} className="flex items-start gap-3 bg-emerald-50 rounded-lg p-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"/>
                <div className="text-xs text-emerald-700">{t}</div>
              </div>
            ))}
            <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-2">
              <div className="font-semibold text-slate-700">예상 절감 효과</div>
              <div className="flex justify-between"><span className="text-slate-500">월간 절감 전력</span><span className="font-semibold text-emerald-700">{Math.round(eq.dailyKwh*0.08*30/1000)} MWh</span></div>
              <div className="flex justify-between"><span className="text-slate-500">예상 비용 절감</span><span className="font-semibold text-emerald-700">{(Math.round(eq.dailyKwh*0.08*30/1000)*120).toLocaleString()}원</span></div>
              <div className="flex justify-between"><span className="text-slate-500">CO₂ 절감</span><span className="font-semibold text-emerald-700">{Math.round(eq.co2*0.08*30/1000)} tCO₂</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────
export default function EnergyMonitor() {
  const [equip, setEquip] = useState<Equipment[]>(INIT_EQUIP);
  const [selected, setSelected] = useState<Equipment | null>(null);
  const [feed, setFeed] = useState<{msg:string;ok:boolean;ts:string}[]>([]);
  const [areaFilter, setAreaFilter] = useState("전체");
  const tickRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current++;

      // 실시간 전력 변동
      setEquip(prev => prev.map(e => ({
        ...e,
        power: Math.round((e.power + (Math.random()-0.48)*2)*10)/10,
        efficiency: Math.min(99, Math.max(50, e.efficiency + Math.round((Math.random()-0.5)*2))),
      })));

      // 피드 생성
      const e = INIT_EQUIP[Math.floor(Math.random()*INIT_EQUIP.length)];
      const pool = FEED_POOL[Math.floor(Math.random()*FEED_POOL.length)];
      const ev = pool(e.name.split(" ")[0]);
      const now = new Date();
      const ts = `${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}:${now.getSeconds().toString().padStart(2,"0")}`;
      setFeed(prev => [{...ev,ts},...prev].slice(0,25));
    }, 1200);
    return () => clearInterval(id);
  }, []);

  const areas = ["전체", ...Array.from(new Set(INIT_EQUIP.map(e=>e.area)))];
  const filtered = areaFilter==="전체" ? equip : equip.filter(e=>e.area===areaFilter);

  const totalPower = equip.reduce((a,e)=>a+e.power,0);
  const totalGas   = equip.reduce((a,e)=>a+e.gas,0);
  const totalKwh   = equip.reduce((a,e)=>a+e.dailyKwh,0);
  const totalCo2   = equip.reduce((a,e)=>a+e.co2,0);
  const peakCount  = equip.filter(e=>e.status==="peak").length;

  return (
    <div className="p-6 space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Energy Monitor</h1>
          <p className="text-slate-500 mt-1 text-sm">전력·가스 소비 실시간 모니터링 — 10M Energy 도메인</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
          실시간 연동 중
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-blue-600 font-medium">현재 전력 소비</span>
            <Zap className="w-4 h-4 text-blue-500"/>
          </div>
          <div className="text-2xl font-bold text-blue-700">{totalPower.toFixed(1)}<span className="text-sm font-normal ml-1">kW</span></div>
          <div className="text-[11px] text-blue-500 mt-0.5 flex items-center gap-1">
            {peakCount>0?<><AlertTriangle className="w-3 h-3"/>{peakCount}개 설비 피크</>:<><CheckCircle2 className="w-3 h-3"/>정상 범위</>}
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-amber-600 font-medium">금일 누적 전력</span>
            <BarChart2 className="w-4 h-4 text-amber-500"/>
          </div>
          <div className="text-2xl font-bold text-amber-700">{(totalKwh/1000).toFixed(1)}<span className="text-sm font-normal ml-1">MWh</span></div>
          <div className="text-[11px] text-amber-500 mt-0.5">전일 대비 +3.2%</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-orange-600 font-medium">가스 소비량</span>
            <Flame className="w-4 h-4 text-orange-500"/>
          </div>
          <div className="text-2xl font-bold text-orange-700">{totalGas.toFixed(1)}<span className="text-sm font-normal ml-1">m³/h</span></div>
          <div className="text-[11px] text-orange-500 mt-0.5">열처리로 75% 비중</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-emerald-600 font-medium">탄소 배출 환산</span>
            <Leaf className="w-4 h-4 text-emerald-500"/>
          </div>
          <div className="text-2xl font-bold text-emerald-700">{(totalCo2/1000).toFixed(2)}<span className="text-sm font-normal ml-1">tCO₂</span></div>
          <div className="text-[11px] text-emerald-500 mt-0.5">금일 누적</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* 설비별 차트 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-700 mb-3">설비별 금일 소비 (MWh)</div>
          <DailyBarChart equip={equip}/>
        </div>

        {/* 실시간 피드 */}
        <div className="col-span-2 bg-slate-900 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-3.5 h-3.5 text-yellow-400"/>
            <span className="text-xs font-semibold text-slate-300">Energy 실시간 이벤트</span>
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {feed.length===0?<div className="text-xs text-slate-500 text-center py-4">이벤트 대기 중...</div>:
            feed.map((ev,i)=>(
              <div key={i} className="flex items-center gap-3 text-xs font-mono">
                <span className="text-slate-500 whitespace-nowrap">{ev.ts}</span>
                <span className={ev.ok?"text-emerald-400":"text-rose-400"}>{ev.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 font-medium">구역 필터:</span>
        {areas.map(a=>(
          <button key={a} onClick={()=>setAreaFilter(a)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${areaFilter===a?"bg-blue-600 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {a}
          </button>
        ))}
      </div>

      {/* 설비 테이블 */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["설비명","구역","현재 전력","가스","효율","금일 kWh","CO₂","상태",""].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-[11px] text-slate-500 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(e=>(
              <tr key={e.id} onClick={()=>setSelected(e)}
                className="hover:bg-slate-50 cursor-pointer transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800 text-sm">{e.name}</div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{e.area}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className={`font-semibold text-sm ${e.power>e.powerTarget?"text-rose-600":"text-slate-800"}`}>{e.power}</span>
                    <span className="text-xs text-slate-400">kW</span>
                    {e.power>e.powerTarget?<TrendingUp className="w-3 h-3 text-rose-400"/>:<TrendingDown className="w-3 h-3 text-emerald-400"/>}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">{e.gas?`${e.gas} m³/h`:"—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{width:`${e.efficiency}%`,background:e.efficiency>=85?"#10b981":e.efficiency>=70?"#f59e0b":"#ef4444"}}/>
                    </div>
                    <span className="text-xs text-slate-600">{e.efficiency}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs font-medium text-slate-700">{e.dailyKwh.toLocaleString()}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{e.co2} kg</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[e.status]}`}>{statusLabel[e.status]}</span>
                </td>
                <td className="px-4 py-3 text-xs text-blue-600">상세 →</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 슬라이드 패널 */}
      {selected&&(
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={()=>setSelected(null)}/>
          <EquipPanel eq={selected} onClose={()=>setSelected(null)}/>
        </>
      )}
    </div>
  );
}
