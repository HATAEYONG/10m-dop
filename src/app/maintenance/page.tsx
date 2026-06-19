"use client";

import { useState, useEffect, useRef } from "react";
import { Wrench, AlertTriangle, CheckCircle2, Clock, TrendingUp, TrendingDown, X, Activity, Zap, Calendar } from "lucide-react";

type MaintStatus = "normal" | "warning" | "critical" | "overhaul";
type MaintType = "PM" | "CBM" | "CM" | "PdM";

interface Equipment {
  id: number;
  name: string;
  area: string;
  status: MaintStatus;
  mtbf: number;           // 평균 고장 간격 (시간)
  mttr: number;           // 평균 수리 시간 (시간)
  lastMaint: string;
  nextMaint: string;
  daysUntilMaint: number;
  maintType: MaintType;
  healthScore: number;    // 0~100
  vibration: number;      // mm/s
  temperature: number;    // °C
  failureProb: number;    // % (30일 내)
  history: { date: string; type: string; desc: string; duration: number }[];
  vibHistory: number[];
  aiInsight: string;
}

const mkVibHistory = (base: number) =>
  Array.from({ length: 30 }, () => +(base + (Math.random() - 0.4) * base * 0.3).toFixed(2));

const INIT_EQUIP: Equipment[] = [
  {
    id: 1, name: "CNC 머시닝센터 #1", area: "가공1라인",
    status: "warning", maintType: "PdM", healthScore: 63,
    mtbf: 720, mttr: 4.2, lastMaint: "2026-05-28", nextMaint: "2026-06-25", daysUntilMaint: 6,
    vibration: 4.8, temperature: 72, failureProb: 34,
    vibHistory: mkVibHistory(3.5),
    aiInsight: "주축 베어링 이상 진동 증가 감지. 2.8mm/s → 4.8mm/s (30일). ISO 10816-3 경보 임박.",
    history: [
      { date: "2026-05-28", type: "PM", desc: "정기 오일 교환 및 필터 청소", duration: 2 },
      { date: "2026-04-15", type: "CM", desc: "척 클램프 불량 긴급 수리", duration: 6 },
      { date: "2026-03-10", type: "PM", desc: "정기 점검 (이상 없음)", duration: 1.5 },
    ],
  },
  {
    id: 2, name: "TIG 용접기 #1", area: "용접라인",
    status: "normal", maintType: "PM", healthScore: 88,
    mtbf: 1200, mttr: 2.1, lastMaint: "2026-06-01", nextMaint: "2026-07-15", daysUntilMaint: 26,
    vibration: 1.2, temperature: 58, failureProb: 8,
    vibHistory: mkVibHistory(1.1),
    aiInsight: "정상 운전 중. 다음 PM 일정 준수 권장. 토치 노즐 마모 상태 주기적 확인 필요.",
    history: [
      { date: "2026-06-01", type: "PM", desc: "용접 토치 교체 및 접지 점검", duration: 1 },
      { date: "2026-04-28", type: "PM", desc: "정기 점검", duration: 1 },
    ],
  },
  {
    id: 3, name: "열처리로 #1", area: "열처리동",
    status: "critical", maintType: "CBM", healthScore: 38,
    mtbf: 480, mttr: 8.5, lastMaint: "2026-05-10", nextMaint: "2026-06-20", daysUntilMaint: 1,
    vibration: 0.4, temperature: 1048, failureProb: 71,
    vibHistory: mkVibHistory(0.3),
    aiInsight: "발열체 저항값 편차 확대 (±8%). 로 내부 온도 불균일 감지. 즉각 발열체 교체 권고.",
    history: [
      { date: "2026-05-10", type: "CBM", desc: "발열체 저항 측정 — 편차 4%", duration: 3 },
      { date: "2026-03-20", type: "CM", desc: "온도 센서 고장 긴급 교체", duration: 12 },
      { date: "2026-02-15", type: "PM", desc: "정기 점검 및 내화벽돌 점검", duration: 4 },
    ],
  },
  {
    id: 4, name: "프레스 #3", area: "프레스동",
    status: "normal", maintType: "PM", healthScore: 91,
    mtbf: 2000, mttr: 3.0, lastMaint: "2026-06-05", nextMaint: "2026-08-01", daysUntilMaint: 43,
    vibration: 2.1, temperature: 45, failureProb: 5,
    vibHistory: mkVibHistory(2.0),
    aiInsight: "최적 운전 상태. MTBF 업계 평균 대비 +38%. 현재 정비 주기 유지 권장.",
    history: [
      { date: "2026-06-05", type: "PM", desc: "유압 오일 교환 및 금형 점검", duration: 3 },
      { date: "2026-04-10", type: "PM", desc: "정기 점검", duration: 2 },
    ],
  },
  {
    id: 5, name: "컴프레서 #2", area: "유틸리티",
    status: "warning", maintType: "PdM", healthScore: 71,
    mtbf: 960, mttr: 5.5, lastMaint: "2026-05-20", nextMaint: "2026-06-28", daysUntilMaint: 9,
    vibration: 3.9, temperature: 88, failureProb: 28,
    vibHistory: mkVibHistory(2.8),
    aiInsight: "흡입 밸브 마모 조짐. 진동 및 흡입 효율 소폭 저하. 밸브 점검 우선 실시 권고.",
    history: [
      { date: "2026-05-20", type: "CBM", desc: "진동 측정 및 오일 분석", duration: 1.5 },
      { date: "2026-04-02", type: "CM", desc: "안전밸브 오작동 긴급 교체", duration: 4 },
    ],
  },
  {
    id: 6, name: "도금 정류기", area: "도금라인",
    status: "overhaul", maintType: "CM", healthScore: 22,
    mtbf: 350, mttr: 16, lastMaint: "2026-06-18", nextMaint: "2026-06-19", daysUntilMaint: 0,
    vibration: 0, temperature: 0, failureProb: 95,
    vibHistory: mkVibHistory(0),
    aiInsight: "정류 모듈 3번 고장 중. 긴급 수리 진행 중 (예상 완료: 금일 18:00). 예비 부품 수배 완료.",
    history: [
      { date: "2026-06-18", type: "CM", desc: "정류 모듈 #3 고장 — 긴급 수리 중", duration: 0 },
      { date: "2026-05-01", type: "PM", desc: "정기 절연 점검", duration: 2 },
    ],
  },
];

const FEED_POOL = [
  (n: string) => ({ msg: `${n} 진동 이상 감지 — ${(3+Math.random()*3).toFixed(1)} mm/s`, ok: false }),
  (n: string) => ({ msg: `${n} AI 예지 알림 — 30일 내 고장 확률 ${Math.round(20+Math.random()*40)}%`, ok: false }),
  (n: string) => ({ msg: `${n} 정기 점검 완료 — 이상 없음`, ok: true }),
  (n: string) => ({ msg: `${n} 온도 정상화 — ${Math.round(50+Math.random()*30)}°C`, ok: true }),
  (n: string) => ({ msg: `${n} 오일 교환 예약 생성됨`, ok: true }),
  (n: string) => ({ msg: `${n} MTBF 목표치 달성 (${Math.round(800+Math.random()*400)}h)`, ok: true }),
];

const statusLabel: Record<MaintStatus, string> = { normal: "정상", warning: "주의", critical: "위험", overhaul: "정비중" };
const statusColor: Record<MaintStatus, string> = {
  normal:  "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  critical:"bg-rose-100 text-rose-700",
  overhaul:"bg-slate-200 text-slate-600",
};
const maintTypeColor: Record<MaintType, string> = {
  PM:  "bg-blue-100 text-blue-700",
  CBM: "bg-violet-100 text-violet-700",
  CM:  "bg-rose-100 text-rose-700",
  PdM: "bg-emerald-100 text-emerald-700",
};

function VibChart({ data }: { data: number[] }) {
  const W = 300; const H = 60;
  const max = Math.max(...data, 0.1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * H}`).join(" ");
  const last = data[data.length - 1];
  const color = last > 4.5 ? "#ef4444" : last > 2.5 ? "#f59e0b" : "#10b981";
  return (
    <svg width={W} height={H + 10} viewBox={`0 0 ${W} ${H + 10}`} className="w-full">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" opacity={0.9} />
      <line x1={0} y1={H - (2.8/max)*H} x2={W} y2={H - (2.8/max)*H} stroke="#f59e0b" strokeWidth={0.8} strokeDasharray="4 3" opacity={0.6}/>
      <line x1={0} y1={H - (4.5/max)*H} x2={W} y2={H - (4.5/max)*H} stroke="#ef4444" strokeWidth={0.8} strokeDasharray="4 3" opacity={0.6}/>
      <circle cx={(data.length-1)/(data.length-1)*W} cy={H-(last/max)*H} r={3} fill={color}/>
      <text x={W-2} y={H-( 2.8/max)*H-3} textAnchor="end" fontSize={8} fill="#f59e0b">경보</text>
      <text x={W-2} y={H-(4.5/max)*H-3} textAnchor="end" fontSize={8} fill="#ef4444">위험</text>
    </svg>
  );
}

function HealthGauge({ score }: { score: number }) {
  const color = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const r = 26; const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={66} height={66} viewBox="0 0 66 66">
      <circle cx={33} cy={33} r={r} fill="none" stroke="#e2e8f0" strokeWidth={6} />
      <circle cx={33} cy={33} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25}
        strokeLinecap="round" style={{ transition: "stroke-dasharray 0.6s" }} />
      <text x={33} y={37} textAnchor="middle" fontSize={13} fontWeight={700} fill={color}>{score}</text>
    </svg>
  );
}

function MaintPanel({ eq, onClose }: { eq: Equipment; onClose: () => void }) {
  const [tab, setTab] = useState<"status" | "history" | "ai">("status");
  return (
    <div className="fixed inset-y-0 right-0 w-[460px] bg-white shadow-2xl z-50 flex flex-col">
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">{eq.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColor[eq.status]}`}>{statusLabel[eq.status]}</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{eq.area} · {eq.maintType} 정비 방식</div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex border-b border-slate-200 px-4">
        {(["status", "history", "ai"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors ${tab === t ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t === "status" ? "설비 상태" : t === "history" ? "정비 이력" : "AI 예측"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {tab === "status" && (
          <>
            <div className="flex items-center gap-4">
              <HealthGauge score={eq.healthScore} />
              <div className="text-xs text-slate-500">
                <div className="font-semibold text-slate-800 text-sm mb-1">종합 건전도 {eq.healthScore}점</div>
                <div>{eq.healthScore >= 80 ? "최적 상태" : eq.healthScore >= 50 ? "주의 관찰 필요" : "즉각 조치 필요"}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "MTBF", value: `${eq.mtbf}h`, sub: "평균 고장 간격" },
                { label: "MTTR", value: `${eq.mttr}h`, sub: "평균 수리 시간" },
                { label: "진동", value: `${eq.vibration} mm/s`, sub: eq.vibration > 4.5 ? "위험 수준" : eq.vibration > 2.8 ? "경보 수준" : "정상" },
                { label: "온도", value: `${eq.temperature}°C`, sub: "현재 측정값" },
              ].map(c => (
                <div key={c.label} className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-500">{c.label}</div>
                  <div className="font-bold text-slate-900 mt-0.5">{c.value}</div>
                  <div className="text-xs text-slate-400">{c.sub}</div>
                </div>
              ))}
            </div>
            {eq.vibHistory.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs font-semibold text-slate-600 mb-2">진동 추이 (30일, mm/s)</div>
                <VibChart data={eq.vibHistory} />
              </div>
            )}
          </>
        )}
        {tab === "history" && (
          <div className="space-y-3">
            {eq.history.map((h, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${maintTypeColor[h.type as MaintType]}`}>{h.type}</div>
                  {i < eq.history.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
                </div>
                <div className="pb-4">
                  <div className="text-xs text-slate-400">{h.date}</div>
                  <div className="text-sm font-medium text-slate-800 mt-0.5">{h.desc}</div>
                  {h.duration > 0 && <div className="text-xs text-slate-500 mt-0.5">소요 시간: {h.duration}h</div>}
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === "ai" && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="text-xs font-semibold text-blue-700 mb-1">AI 예지정비 분석</div>
              <div className="text-xs text-blue-700 leading-relaxed">{eq.aiInsight}</div>
            </div>
            <div className={`rounded-xl p-4 ${eq.failureProb > 60 ? "bg-rose-50" : eq.failureProb > 30 ? "bg-amber-50" : "bg-emerald-50"}`}>
              <div className="text-xs font-semibold mb-1" style={{ color: eq.failureProb > 60 ? "#991b1b" : eq.failureProb > 30 ? "#92400e" : "#065f46" }}>
                30일 내 고장 확률
              </div>
              <div className="text-3xl font-bold" style={{ color: eq.failureProb > 60 ? "#dc2626" : eq.failureProb > 30 ? "#d97706" : "#10b981" }}>
                {eq.failureProb}%
              </div>
              <div className="w-full h-2 bg-white/50 rounded-full mt-2 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${eq.failureProb}%`, background: eq.failureProb > 60 ? "#dc2626" : eq.failureProb > 30 ? "#d97706" : "#10b981" }} />
              </div>
            </div>
            <div className="text-xs space-y-2">
              <div className="font-semibold text-slate-700">권고 조치</div>
              <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-500">다음 정비 예정일</span><span className="font-medium text-slate-800">{eq.nextMaint}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">D-day</span><span className={`font-bold ${eq.daysUntilMaint <= 3 ? "text-rose-600" : "text-slate-800"}`}>{eq.daysUntilMaint === 0 ? "오늘" : `D-${eq.daysUntilMaint}`}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">정비 방식</span><span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${maintTypeColor[eq.maintType]}`}>{eq.maintType}</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 메인 ──────────────────────────────────────────────────────────────
export default function MaintenancePage() {
  const [equip, setEquip] = useState<Equipment[]>(INIT_EQUIP);
  const [selected, setSelected] = useState<Equipment | null>(null);
  const [feed, setFeed] = useState<{ msg: string; ok: boolean; ts: string }[]>([]);
  const [statusFilter, setStatusFilter] = useState<MaintStatus | "all">("all");
  const tickRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current++;
      setEquip(prev => prev.map(e => ({
        ...e,
        healthScore: Math.min(100, Math.max(0, e.healthScore + Math.round((Math.random() - 0.52) * 2))),
        vibration: e.status !== "overhaul" ? +(e.vibration + (Math.random() - 0.45) * 0.15).toFixed(2) : 0,
      })));
      const e = INIT_EQUIP[Math.floor(Math.random() * INIT_EQUIP.length)];
      const ev = FEED_POOL[Math.floor(Math.random() * FEED_POOL.length)](e.name.split(" ")[0]);
      const now = new Date();
      const ts = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
      setFeed(prev => [{ ...ev, ts }, ...prev].slice(0, 25));
    }, 1200);
    return () => clearInterval(id);
  }, []);

  const counts = {
    all: equip.length,
    normal: equip.filter(e => e.status === "normal").length,
    warning: equip.filter(e => e.status === "warning").length,
    critical: equip.filter(e => e.status === "critical").length,
    overhaul: equip.filter(e => e.status === "overhaul").length,
  };
  const avgHealth = Math.round(equip.reduce((a, e) => a + e.healthScore, 0) / equip.length);
  const avgMtbf = Math.round(equip.reduce((a, e) => a + e.mtbf, 0) / equip.length);
  const criticalCount = counts.critical + counts.overhaul;

  const filtered = statusFilter === "all" ? equip : equip.filter(e => e.status === statusFilter);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Maintenance</h1>
          <p className="text-slate-500 mt-1 text-sm">설비 보전 · 예지정비 관리 — 10M Maintenance 도메인</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-violet-600 bg-violet-50 border border-violet-200 px-3 py-1.5 rounded-full">
          <Activity className="w-3.5 h-3.5" />PdM AI 모니터링 중
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-3">
        <div className={`border rounded-xl p-4 ${criticalCount > 0 ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200"}`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-medium ${criticalCount > 0 ? "text-rose-600" : "text-emerald-600"}`}>요주의 설비</span>
            <AlertTriangle className={`w-4 h-4 ${criticalCount > 0 ? "text-rose-500" : "text-emerald-500"}`} />
          </div>
          <div className={`text-2xl font-bold ${criticalCount > 0 ? "text-rose-700" : "text-emerald-700"}`}>{criticalCount}</div>
          <div className={`text-[11px] mt-0.5 ${criticalCount > 0 ? "text-rose-500" : "text-emerald-500"}`}>위험+정비중</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-blue-600 font-medium">평균 건전도</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-700">{avgHealth}</div>
          <div className="text-[11px] text-blue-500 mt-0.5">0~100 종합 점수</div>
        </div>
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-violet-600 font-medium">평균 MTBF</span>
            <Clock className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-2xl font-bold text-violet-700">{avgMtbf}<span className="text-sm font-normal ml-1">h</span></div>
          <div className="text-[11px] text-violet-500 mt-0.5">평균 고장 간격</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-amber-600 font-medium">PM 달성률</span>
            <CheckCircle2 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700">87<span className="text-sm font-normal ml-1">%</span></div>
          <div className="text-[11px] text-amber-500 mt-0.5">이번 달 계획 대비</div>
        </div>
      </div>

      {/* 실시간 피드 */}
      <div className="bg-slate-900 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wrench className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs font-semibold text-slate-300">Maintenance 실시간 이벤트</span>
        </div>
        <div className="space-y-1.5 max-h-28 overflow-y-auto">
          {feed.length === 0 ? <div className="text-xs text-slate-500 text-center py-3">이벤트 대기 중...</div> :
            feed.map((ev, i) => (
              <div key={i} className="flex items-center gap-3 text-xs font-mono">
                <span className="text-slate-500 whitespace-nowrap">{ev.ts}</span>
                <span className={ev.ok ? "text-emerald-400" : "text-rose-400"}>{ev.msg}</span>
              </div>
            ))}
        </div>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 font-medium">상태 필터:</span>
        {([["all", "전체"], ["normal", "정상"], ["warning", "주의"], ["critical", "위험"], ["overhaul", "정비중"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setStatusFilter(k)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${statusFilter === k ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {l} {k !== "all" && `(${counts[k]})`}
          </button>
        ))}
      </div>

      {/* 설비 테이블 */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["설비명", "구역", "건전도", "진동 (mm/s)", "MTBF", "다음 정비", "D-day", "정비 방식", "상태", ""].map(h => (
                <th key={h} className="px-3 py-3 text-left text-[11px] text-slate-500 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(e => (
              <tr key={e.id} onClick={() => setSelected(e)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                <td className="px-3 py-3 font-medium text-slate-800 text-sm">{e.name}</td>
                <td className="px-3 py-3 text-xs text-slate-500">{e.area}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${e.healthScore}%`, background: e.healthScore >= 80 ? "#10b981" : e.healthScore >= 50 ? "#f59e0b" : "#ef4444" }} />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: e.healthScore >= 80 ? "#059669" : e.healthScore >= 50 ? "#d97706" : "#dc2626" }}>{e.healthScore}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className={`text-xs font-semibold ${e.vibration > 4.5 ? "text-rose-600" : e.vibration > 2.8 ? "text-amber-600" : "text-slate-700"}`}>
                    {e.status === "overhaul" ? "—" : e.vibration}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs text-slate-600">{e.mtbf}h</td>
                <td className="px-3 py-3 text-xs text-slate-600">{e.nextMaint}</td>
                <td className="px-3 py-3">
                  <span className={`text-xs font-bold ${e.daysUntilMaint === 0 ? "text-rose-600" : e.daysUntilMaint <= 7 ? "text-amber-600" : "text-slate-600"}`}>
                    {e.daysUntilMaint === 0 ? "오늘" : `D-${e.daysUntilMaint}`}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${maintTypeColor[e.maintType]}`}>{e.maintType}</span>
                </td>
                <td className="px-3 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[e.status]}`}>{statusLabel[e.status]}</span>
                </td>
                <td className="px-3 py-3 text-xs text-blue-600">상세 →</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setSelected(null)} />
          <MaintPanel eq={selected} onClose={() => setSelected(null)} />
        </>
      )}
    </div>
  );
}
