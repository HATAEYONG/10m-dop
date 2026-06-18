"use client";

import { useState, useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle, Activity, Cpu, X, TrendingUp, TrendingDown, Minus, Thermometer, Zap } from "lucide-react";

interface Process {
  id: string; name: string; machine: string; start: string; end: string;
  duration: number; status: "done"|"running"|"pending"|"error"; worker: string;
}
interface Machine {
  id: string; name: string; util: number; status: "running"|"idle"|"offline";
  temp: number; vibration: number; alarms: number;
  tempHistory: number[]; vibHistory: number[]; utilHistory: number[];
  prodCount: number; targetCount: number;
}
interface Alarm {
  id: number; machine: string; time: string; type: "warning"|"info"|"error";
  message: string; resolved: boolean; memo: string;
}

const PROCESSES: Process[] = [
  { id:"P001", name:"원자재 입고",    machine:"INSP-01",  start:"08:00", end:"08:45", duration:45,  status:"done",    worker:"김철수" },
  { id:"P002", name:"CNC 선삭 #1",   machine:"CNC-01",   start:"08:50", end:"10:20", duration:90,  status:"done",    worker:"이영희" },
  { id:"P003", name:"CNC 밀링 #2",   machine:"CNC-02",   start:"10:25", end:"12:10", duration:105, status:"done",    worker:"박민준" },
  { id:"P004", name:"열처리 (담금질)",machine:"HT-01",    start:"12:30", end:"14:00", duration:90,  status:"done",    worker:"정수진" },
  { id:"P005", name:"표면연삭",       machine:"GRD-01",   start:"14:05", end:"15:00", duration:55,  status:"running", worker:"한동훈" },
  { id:"P006", name:"품질검사 (CMM)", machine:"CMM-01",   start:"15:10", end:"16:00", duration:50,  status:"pending", worker:"-" },
  { id:"P007", name:"도장·후처리",    machine:"COAT-01",  start:"16:10", end:"17:00", duration:50,  status:"pending", worker:"-" },
];

const mkHistory = (base: number, jitter: number) =>
  Array.from({length:30}, ()=>Math.max(0, base + (Math.random()-0.5)*jitter*2));

const INIT_MACHINES: Machine[] = [
  { id:"CNC-01",  name:"CNC 선반 #1",    util:87, status:"running", temp:64,  vibration:0.8, alarms:0, tempHistory:mkHistory(64,4),  vibHistory:mkHistory(0.8,0.3),  utilHistory:mkHistory(87,8),  prodCount:62, targetCount:80 },
  { id:"CNC-02",  name:"CNC 밀링 #2",    util:91, status:"running", temp:71,  vibration:1.2, alarms:1, tempHistory:mkHistory(71,5),  vibHistory:mkHistory(1.2,0.4),  utilHistory:mkHistory(91,6),  prodCount:58, targetCount:70 },
  { id:"HT-01",   name:"열처리로 #1",    util:55, status:"idle",    temp:820, vibration:0.1, alarms:0, tempHistory:mkHistory(820,20), vibHistory:mkHistory(0.1,0.05), utilHistory:mkHistory(55,10), prodCount:12, targetCount:15 },
  { id:"GRD-01",  name:"표면연삭기 #1",  util:73, status:"running", temp:45,  vibration:0.5, alarms:0, tempHistory:mkHistory(45,3),  vibHistory:mkHistory(0.5,0.2),  utilHistory:mkHistory(73,8),  prodCount:44, targetCount:60 },
  { id:"CMM-01",  name:"3D 측정기 (CMM)",util:30, status:"idle",    temp:22,  vibration:0.0, alarms:0, tempHistory:mkHistory(22,1),  vibHistory:mkHistory(0,0.02),   utilHistory:mkHistory(30,5),  prodCount:31, targetCount:40 },
  { id:"COAT-01", name:"도장 부스 #1",   util:0,  status:"offline", temp:28,  vibration:0.0, alarms:0, tempHistory:mkHistory(28,1),  vibHistory:mkHistory(0,0),      utilHistory:mkHistory(0,0),   prodCount:0,  targetCount:30 },
  { id:"INSP-01", name:"입고검사대",      util:40, status:"idle",    temp:23,  vibration:0.0, alarms:0, tempHistory:mkHistory(23,1),  vibHistory:mkHistory(0,0.05),   utilHistory:mkHistory(40,5),  prodCount:18, targetCount:25 },
];

const INIT_ALARMS: Alarm[] = [
  { id:1, machine:"CNC-02",  time:"13:42", type:"warning", message:"주축 진동값 초과 (1.2mm/s > 임계치 1.0)", resolved:false, memo:"" },
  { id:2, machine:"HT-01",   time:"11:15", type:"info",    message:"열처리 사이클 완료 — 냉각 대기",         resolved:true,  memo:"냉각 완료 확인" },
  { id:3, machine:"CNC-01",  time:"09:30", type:"info",    message:"공구 수명 80% 도달 — 교체 예정 공지",    resolved:true,  memo:"" },
  { id:4, machine:"GRD-01",  time:"14:20", type:"warning", message:"냉각수 유량 저하 감지 (8.2L/min → 정상 10L/min)", resolved:false, memo:"" },
];

const HOURLY_PROD = [
  {h:"08",v:18},{h:"09",v:24},{h:"10",v:21},{h:"11",v:27},
  {h:"12",v:15},{h:"13",v:22},{h:"14",v:19},{h:"15",v:8},
];

const TOTAL_MIN = 9*60;
function toMin(t: string){ const [h,m]=t.split(":").map(Number); return h*60+m-8*60; }

function Sparkline({ data, color="#3b82f6", h=28 }: { data:number[]; color?:string; h?:number }) {
  if(!data.length) return null;
  const W=120; const pad=2;
  const min=Math.min(...data); const max=Math.max(...data)||1;
  const pts = data.map((v,i)=>{
    const x = pad + (i/(data.length-1))*(W-pad*2);
    const y = h-pad - ((v-min)/(max-min||1))*(h-pad*2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={W} height={h} viewBox={`0 0 ${W} ${h}`} className="w-full">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round"/>
    </svg>
  );
}

function HourlyChart({ data }: { data:{h:string;v:number}[] }) {
  const max = Math.max(...data.map(d=>d.v),1);
  const W=280; const H=60; const bw=24; const gap=10;
  return (
    <svg width={W} height={H+16} viewBox={`0 0 ${W} ${H+16}`} className="w-full">
      {data.map((d,i)=>{
        const x=i*(bw+gap)+4; const bh=(d.v/max)*H;
        return (
          <g key={d.h}>
            <rect x={x} y={H-bh} width={bw} height={bh} fill="#3b82f6" rx={3} opacity={0.8}/>
            <text x={x+bw/2} y={H+13} textAnchor="middle" fontSize={8} fill="#94a3b8">{d.h}시</text>
          </g>
        );
      })}
    </svg>
  );
}

function MachinePanel({ m, onClose }: { m:Machine; onClose:()=>void }) {
  const lastTemp = m.tempHistory[m.tempHistory.length-1];
  const prevTemp = m.tempHistory[m.tempHistory.length-2]??lastTemp;
  const TrendIcon = lastTemp>prevTemp?TrendingUp:lastTemp<prevTemp?TrendingDown:Minus;
  const trendCls = lastTemp>prevTemp?"text-rose-500":lastTemp<prevTemp?"text-emerald-500":"text-slate-400";

  return (
    <div className="fixed inset-y-0 right-0 w-[440px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50">
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${m.status==="running"?"bg-emerald-500":m.status==="idle"?"bg-slate-300":"bg-rose-400"}`}/>
            <span className="font-bold text-slate-900">{m.name}</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{m.id} · {m.status==="running"?"가동 중":m.status==="idle"?"대기":"오프라인"}</div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4"/></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 가동률 */}
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700">가동률 추이 (30pt)</span>
            <span className={`text-sm font-bold ${m.util>=80?"text-emerald-600":m.util>=50?"text-amber-600":"text-slate-400"}`}>{m.util}%</span>
          </div>
          <Sparkline data={m.utilHistory} color={m.util>=80?"#10b981":m.util>=50?"#f59e0b":"#94a3b8"}/>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
            <div className={`h-full rounded-full ${m.util>=80?"bg-emerald-500":m.util>=50?"bg-amber-400":"bg-slate-300"}`} style={{width:`${m.util}%`}}/>
          </div>
        </div>
        {/* 온도 */}
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1"><Thermometer className="w-3.5 h-3.5"/>온도 추이</span>
            <div className="flex items-center gap-1">
              <TrendIcon className={`w-3.5 h-3.5 ${trendCls}`}/>
              <span className="text-sm font-bold text-slate-800">{m.temp.toFixed(1)}°C</span>
            </div>
          </div>
          <Sparkline data={m.tempHistory} color="#ef4444"/>
        </div>
        {/* 진동 */}
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1"><Zap className="w-3.5 h-3.5"/>진동 (mm/s)</span>
            <span className={`text-sm font-bold ${m.vibration>1.0?"text-rose-600":"text-slate-800"}`}>{m.vibration.toFixed(2)}</span>
          </div>
          <Sparkline data={m.vibHistory} color={m.vibration>1.0?"#ef4444":"#8b5cf6"}/>
          {m.vibration>1.0&&<div className="text-[10px] text-rose-600 mt-1 font-medium">⚠ 임계치 초과 (1.0 mm/s)</div>}
        </div>
        {/* 생산 실적 */}
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="text-xs font-semibold text-slate-700 mb-2">생산 실적</div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-slate-900">{m.prodCount}</span>
            <span className="text-xs text-slate-400 mb-1">/ {m.targetCount} ea (목표)</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-blue-500 rounded-full" style={{width:`${Math.min((m.prodCount/m.targetCount)*100,100)}%`}}/>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">{Math.round((m.prodCount/m.targetCount)*100)}% 달성</div>
        </div>
      </div>
    </div>
  );
}

export default function MesViewer() {
  const [tab, setTab] = useState<"timeline"|"machines"|"alarms"|"production">("timeline");
  const [machines, setMachines] = useState<Machine[]>(INIT_MACHINES);
  const [alarms, setAlarms] = useState<Alarm[]>(INIT_ALARMS);
  const [selectedMachine, setSelectedMachine] = useState<string|null>(null);
  const [selectedProcess, setSelectedProcess] = useState<string|null>(null);
  const [editMemo, setEditMemo] = useState<number|null>(null);
  const [memoVal, setMemoVal] = useState("");
  const tickRef = useRef(0);

  useEffect(()=>{
    const id = setInterval(()=>{
      tickRef.current++;
      setMachines(prev=>prev.map(m=>{
        if(m.status==="offline") return m;
        const jt = (v:number, r:number) => Math.max(0, v+(Math.random()-0.5)*r);
        const newTemp = parseFloat(jt(m.temp, m.id==="HT-01"?15:3).toFixed(1));
        const newVib  = parseFloat(jt(m.vibration, 0.15).toFixed(2));
        const newUtil = Math.min(100, Math.max(0, Math.round(jt(m.util, 4))));
        return {
          ...m,
          temp: newTemp, vibration: newVib, util: newUtil,
          tempHistory: [...m.tempHistory.slice(-29), newTemp],
          vibHistory:  [...m.vibHistory.slice(-29),  newVib],
          utilHistory: [...m.utilHistory.slice(-29),  newUtil],
        };
      }));
    },1200);
    return ()=>clearInterval(id);
  },[]);

  const activeAlarms = alarms.filter(a=>!a.resolved);
  const resolveAlarm = (id:number) => {
    setAlarms(prev=>prev.map(a=>a.id===id?{...a,resolved:true,memo:memoVal||a.memo}:a));
    setEditMemo(null); setMemoVal("");
  };

  const runningMachines = machines.filter(m=>m.status==="running");
  const avgUtil = runningMachines.length
    ? Math.round(runningMachines.reduce((a,m)=>a+m.util,0)/runningMachines.length) : 0;
  const donePct = Math.round(PROCESSES.filter(p=>p.status==="done").length/PROCESSES.length*100);
  const oee = Math.round(avgUtil * 0.95 * 0.92);

  const selectedM = machines.find(m=>m.id===selectedMachine);
  const selectedP = PROCESSES.find(p=>p.id===selectedProcess);

  const now = new Date();
  const curMin = now.getHours()*60+now.getMinutes()-8*60;
  const curPct = Math.min(100,Math.max(0,(curMin/TOTAL_MIN)*100));

  const statusColor = { done:"bg-emerald-100 text-emerald-700", running:"bg-blue-100 text-blue-700", pending:"bg-slate-100 text-slate-500", error:"bg-rose-100 text-rose-700" };
  const statusLabel = { done:"완료", running:"진행 중", pending:"대기", error:"오류" };
  const machineStatusColor: Record<string,string> = { running:"bg-emerald-500", idle:"bg-slate-300", offline:"bg-rose-400" };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">MES Viewer</h1>
          <p className="text-slate-500 mt-1 text-sm">A업체 생산 라인 · 2026-06-18 주간 1교대 현황</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block"/>
          <span className="text-blue-700 font-medium">실시간 MES 연동 (시뮬레이션)</span>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-5 gap-3">
        {[
          {label:"설비 가동률",    value:`${avgUtil}%`,          sub:"가동 설비 평균",       cls:"text-blue-700 bg-blue-50 border-blue-200"},
          {label:"공정 진행",     value:`${PROCESSES.filter(p=>p.status==="done").length}/${PROCESSES.length}`, sub:"완료/전체", cls:"text-emerald-700 bg-emerald-50 border-emerald-200"},
          {label:"OEE",          value:`${oee}%`,              sub:"가동×성능×품질",       cls:oee>=75?"text-emerald-700 bg-emerald-50 border-emerald-200":"text-amber-700 bg-amber-50 border-amber-200"},
          {label:"미해소 경보",   value:`${activeAlarms.length}`, sub:"즉시 확인 필요",    cls:activeAlarms.length>0?"text-rose-700 bg-rose-50 border-rose-200":"text-slate-600 bg-slate-50 border-slate-200"},
          {label:"목표 달성률",   value:"78%",                   sub:"목표 200ea 중 156ea", cls:"text-amber-700 bg-amber-50 border-amber-200"},
        ].map(({label,value,sub,cls})=>(
          <div key={label} className={`rounded-xl border p-4 ${cls}`}>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs font-medium mt-0.5">{label}</div>
            <div className="text-[10px] opacity-70 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-slate-200">
        {([["timeline","공정 타임라인"],["machines","설비별 현황"],["alarms",`경보${activeAlarms.length>0?" ("+activeAlarms.length+")":""}`],["production","생산 실적"]] as const).map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab===key?"border-blue-600 text-blue-700":"border-transparent text-slate-500 hover:text-slate-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* 타임라인 */}
      {tab==="timeline"&&(
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex justify-between text-xs text-slate-400">
              {["08:00","10:00","12:00","14:00","16:00","17:00"].map(t=><span key={t}>{t}</span>)}
            </div>
          </div>
          <div className="divide-y divide-slate-50 relative">
            {/* 현재시각 커서 */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-blue-400 opacity-60 z-10 pointer-events-none"
              style={{left:`calc(112px + 16px + ${curPct}% * (100% - 128px - 32px) / 100)`}}/>
            {PROCESSES.map(p=>{
              const left=(toMin(p.start)/TOTAL_MIN)*100;
              const width=(p.duration/TOTAL_MIN)*100;
              const isSelected = selectedProcess===p.id;
              return (
                <div key={p.id} onClick={()=>setSelectedProcess(s=>s===p.id?null:p.id)}
                  className={`p-3 flex items-center gap-4 cursor-pointer transition-colors ${isSelected?"bg-blue-50":"hover:bg-slate-50"}`}>
                  <div className="w-28 shrink-0">
                    <div className="text-xs font-medium text-slate-800">{p.machine}</div>
                    <div className="text-xs text-slate-400">{p.worker}</div>
                  </div>
                  <div className="flex-1 relative h-8 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`absolute top-0 h-full rounded-full flex items-center px-2 text-xs font-medium truncate ${p.status==="done"?"bg-emerald-400 text-white":p.status==="running"?"bg-blue-500 text-white animate-pulse":"bg-slate-300 text-slate-600"}`}
                      style={{left:`${left}%`,width:`${Math.max(width,3)}%`}}>
                      {p.name}
                    </div>
                  </div>
                  <div className="w-24 shrink-0 text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[p.status]}`}>{statusLabel[p.status]}</span>
                    <div className="text-xs text-slate-400 mt-0.5">{p.start}~{p.end}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {selectedP&&(
            <div className="px-4 py-3 border-t border-blue-100 bg-blue-50 text-xs">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-blue-800">{selectedP.name}</span>
                <span className="text-blue-600">{selectedP.machine}</span>
                <span className="text-blue-600">작업자: {selectedP.worker}</span>
                <span className="text-blue-600">{selectedP.start}~{selectedP.end} ({selectedP.duration}분)</span>
                <span className={`px-2 py-0.5 rounded-full font-medium ${statusColor[selectedP.status]}`}>{statusLabel[selectedP.status]}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 설비 현황 */}
      {tab==="machines"&&(
        <div className="grid grid-cols-2 gap-4">
          {machines.map(m=>(
            <div key={m.id} onClick={()=>setSelectedMachine(s=>s===m.id?null:m.id)}
              className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm ${selectedMachine===m.id?"border-blue-400 ring-2 ring-blue-100":"border-slate-200"}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${machineStatusColor[m.status]}`}/>
                    <span className="text-sm font-semibold text-slate-900">{m.name}</span>
                    {m.alarms>0&&<span className="text-xs bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full">경보 {m.alarms}</span>}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{m.id} · {m.status==="running"?"가동 중":m.status==="idle"?"대기":"오프라인"}</div>
                </div>
                <Cpu className="w-4 h-4 text-slate-300"/>
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">가동률</span>
                  <span className={`font-semibold ${m.util>=80?"text-emerald-600":m.util>=50?"text-amber-600":"text-slate-400"}`}>{m.util}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${m.util>=80?"bg-emerald-500":m.util>=50?"bg-amber-400":"bg-slate-300"}`} style={{width:`${m.util}%`}}/>
                </div>
              </div>
              <div className="mt-2 h-8">
                <Sparkline data={m.utilHistory} color={m.util>=80?"#10b981":m.util>=50?"#f59e0b":"#94a3b8"} h={32}/>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div className="bg-slate-50 rounded-lg p-2">
                  <div className="text-slate-400">온도</div>
                  <div className={`font-semibold mt-0.5 ${m.temp>100&&m.id!=="HT-01"?"text-rose-600":"text-slate-800"}`}>{m.temp.toFixed(1)}°C</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <div className="text-slate-400">진동 (mm/s)</div>
                  <div className={`font-semibold mt-0.5 ${m.vibration>1.0?"text-rose-600":"text-slate-800"}`}>{m.vibration.toFixed(2)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 경보 */}
      {tab==="alarms"&&(
        <div className="space-y-3">
          {alarms.map(a=>(
            <div key={a.id} className={`bg-white rounded-xl border p-4 ${a.resolved?"opacity-60 border-slate-100":a.type==="warning"?"border-amber-200":"border-slate-200"}`}>
              <div className="flex items-start gap-3">
                {a.type==="warning"
                  ? <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${a.resolved?"text-slate-300":"text-amber-500"}`}/>
                  : <CheckCircle className="w-5 h-5 mt-0.5 shrink-0 text-blue-400"/>
                }
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">{a.machine}</span>
                    <span className="text-xs text-slate-400">{a.time}</span>
                    {a.resolved
                      ? <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">해소됨</span>
                      : <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">미해소</span>
                    }
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{a.message}</p>
                  {a.memo&&<p className="text-xs text-slate-400 mt-1">메모: {a.memo}</p>}
                  {!a.resolved&&editMemo===a.id&&(
                    <div className="mt-2 flex gap-2">
                      <input autoFocus value={memoVal} onChange={e=>setMemoVal(e.target.value)}
                        placeholder="조치 메모 입력..."
                        className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400"/>
                      <button onClick={()=>resolveAlarm(a.id)} className="text-xs px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">해소</button>
                      <button onClick={()=>setEditMemo(null)} className="text-xs px-3 py-1 bg-white border border-slate-200 text-slate-500 rounded-lg">취소</button>
                    </div>
                  )}
                </div>
                {!a.resolved&&editMemo!==a.id&&(
                  <button onClick={()=>{setEditMemo(a.id);setMemoVal(a.memo);}}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-600 transition-colors">
                    해소 처리
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 생산 실적 */}
      {tab==="production"&&(
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-700 mb-3">시간당 생산량 (오늘)</div>
            <HourlyChart data={HOURLY_PROD}/>
            <div className="flex gap-3 mt-3 text-xs text-slate-500">
              <span>총 생산: <strong className="text-slate-800">154 ea</strong></span>
              <span>목표: <strong className="text-slate-800">200 ea</strong></span>
              <span>달성률: <strong className="text-emerald-600">77%</strong></span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {machines.filter(m=>m.prodCount>0).map(m=>(
              <div key={m.id} className="bg-white rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-800">{m.name}</span>
                  <span className="text-xs text-slate-500">{m.prodCount}/{m.targetCount} ea</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{width:`${Math.min((m.prodCount/m.targetCount)*100,100)}%`}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 설비 상세 패널 */}
      {selectedM&&(
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={()=>setSelectedMachine(null)}/>
          <MachinePanel m={selectedM} onClose={()=>setSelectedMachine(null)}/>
        </>
      )}
    </div>
  );
}
