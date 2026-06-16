"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle, Activity, Cpu } from "lucide-react";

const processes = [
  { id: "P001", name: "원자재 입고", machine: "INSP-01", start: "08:00", end: "08:45", duration: 45, status: "done", worker: "김철수" },
  { id: "P002", name: "CNC 선삭 #1", machine: "CNC-01", start: "08:50", end: "10:20", duration: 90, status: "done", worker: "이영희" },
  { id: "P003", name: "CNC 밀링 #2", machine: "CNC-02", start: "10:25", end: "12:10", duration: 105, status: "done", worker: "박민준" },
  { id: "P004", name: "열처리 (담금질)", machine: "HT-01", start: "12:30", end: "14:00", duration: 90, status: "done", worker: "정수진" },
  { id: "P005", name: "표면연삭", machine: "GRD-01", start: "14:05", end: "15:00", duration: 55, status: "running", worker: "한동훈" },
  { id: "P006", name: "품질검사 (CMM)", machine: "CMM-01", start: "15:10", end: "16:00", duration: 50, status: "pending", worker: "-" },
  { id: "P007", name: "도장·후처리", machine: "COAT-01", start: "16:10", end: "17:00", duration: 50, status: "pending", worker: "-" },
];

const machines = [
  { id: "CNC-01", name: "CNC 선반 #1", util: 87, status: "running", temp: 64, vibration: 0.8, alarms: 0 },
  { id: "CNC-02", name: "CNC 밀링 #2", util: 91, status: "running", temp: 71, vibration: 1.2, alarms: 1 },
  { id: "HT-01", name: "열처리로 #1", util: 55, status: "idle", temp: 820, vibration: 0.1, alarms: 0 },
  { id: "GRD-01", name: "표면연삭기 #1", util: 73, status: "running", temp: 45, vibration: 0.5, alarms: 0 },
  { id: "CMM-01", name: "3D 측정기 (CMM)", util: 30, status: "idle", temp: 22, vibration: 0.0, alarms: 0 },
  { id: "COAT-01", name: "도장 부스 #1", util: 0, status: "offline", temp: 28, vibration: 0.0, alarms: 0 },
  { id: "INSP-01", name: "입고검사대", util: 40, status: "idle", temp: 23, vibration: 0.0, alarms: 0 },
];

const alarms = [
  { id: 1, machine: "CNC-02", time: "13:42", type: "warning", message: "주축 진동값 초과 (1.2mm/s > 임계치 1.0)", resolved: false },
  { id: 2, machine: "HT-01", time: "11:15", type: "info", message: "열처리 사이클 완료 — 냉각 대기", resolved: true },
  { id: 3, machine: "CNC-01", time: "09:30", type: "info", message: "공구 수명 80% 도달 — 교체 예정 공지", resolved: true },
  { id: 4, machine: "GRD-01", time: "14:20", type: "warning", message: "냉각수 유량 저하 감지 (8.2L/min → 정상 10L/min)", resolved: false },
];

const statusColor = {
  done: "bg-emerald-100 text-emerald-700",
  running: "bg-blue-100 text-blue-700",
  pending: "bg-slate-100 text-slate-500",
  error: "bg-rose-100 text-rose-700",
};
const statusLabel = { done: "완료", running: "진행 중", pending: "대기", error: "오류" };
const machineStatusColor: Record<string, string> = { running: "bg-emerald-500", idle: "bg-slate-300", offline: "bg-rose-400" };

const TOTAL_MIN = 9 * 60; // 08:00~17:00 = 540분
function toMinutes(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m - 8 * 60; }

export default function MesViewer() {
  const [tab, setTab] = useState<"timeline" | "machines" | "alarms">("timeline");

  const activeAlarms = alarms.filter(a => !a.resolved);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">MES Viewer</h1>
          <p className="text-slate-500 mt-1">A업체 생산 라인 · 2024-03-15 주간 1교대 현황</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
          <Activity className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-blue-700 font-medium">실시간 MES 연동 (시뮬레이션)</span>
        </div>
      </div>

      {/* KPI 바 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "설비 가동률 평균", value: "62.3%", sub: "7대 기준", color: "text-blue-700 bg-blue-50 border-blue-200" },
          { label: "공정 진행", value: `${processes.filter(p => p.status === "done").length}/${processes.length}`, sub: "완료/전체", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
          { label: "미해소 경보", value: activeAlarms.length.toString(), sub: "즉시 확인 필요", color: activeAlarms.length > 0 ? "text-rose-700 bg-rose-50 border-rose-200" : "text-slate-600 bg-slate-50 border-slate-200" },
          { label: "목표 수량 달성률", value: "78%", sub: "목표 200ea 중 156ea", color: "text-amber-700 bg-amber-50 border-amber-200" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className={`rounded-xl border p-4 ${color}`}>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm mt-0.5">{label}</div>
            <div className="text-xs opacity-70 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* 탭 */}
      <div className="flex gap-2 border-b border-slate-200">
        {(["timeline", "machines", "alarms"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {t === "timeline" ? "공정 타임라인" : t === "machines" ? "설비별 현황" : `경보 목록 ${activeAlarms.length > 0 ? `(${activeAlarms.length})` : ""}`}
          </button>
        ))}
      </div>

      {/* 공정 타임라인 */}
      {tab === "timeline" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>08:00</span><span>10:00</span><span>12:00</span><span>14:00</span><span>16:00</span><span>17:00</span>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {processes.map(p => {
              const left = (toMinutes(p.start) / TOTAL_MIN) * 100;
              const width = (p.duration / TOTAL_MIN) * 100;
              return (
                <div key={p.id} className="p-3 flex items-center gap-4 hover:bg-slate-50">
                  <div className="w-28 shrink-0">
                    <div className="text-xs font-medium text-slate-800">{p.machine}</div>
                    <div className="text-xs text-slate-400">{p.worker}</div>
                  </div>
                  <div className="flex-1 relative h-8 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`absolute top-0 h-full rounded-full flex items-center px-2 text-xs font-medium truncate ${p.status === "done" ? "bg-emerald-400 text-white" : p.status === "running" ? "bg-blue-500 text-white animate-pulse" : "bg-slate-300 text-slate-600"}`}
                      style={{ left: `${left}%`, width: `${Math.max(width, 3)}%` }}
                    >
                      {p.name}
                    </div>
                  </div>
                  <div className="w-24 shrink-0 text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[p.status as keyof typeof statusColor]}`}>
                      {statusLabel[p.status as keyof typeof statusLabel]}
                    </span>
                    <div className="text-xs text-slate-400 mt-0.5">{p.start}~{p.end}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 설비 현황 */}
      {tab === "machines" && (
        <div className="grid grid-cols-2 gap-4">
          {machines.map(m => (
            <div key={m.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${machineStatusColor[m.status]}`} />
                    <span className="text-sm font-semibold text-slate-900">{m.name}</span>
                    {m.alarms > 0 && <span className="text-xs bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full">경보 {m.alarms}</span>}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{m.id} · {m.status === "running" ? "가동 중" : m.status === "idle" ? "대기" : "오프라인"}</div>
                </div>
                <Cpu className="w-4 h-4 text-slate-300" />
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">가동률</span>
                  <span className={`font-semibold ${m.util >= 80 ? "text-emerald-600" : m.util >= 50 ? "text-amber-600" : "text-slate-400"}`}>{m.util}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${m.util >= 80 ? "bg-emerald-500" : m.util >= 50 ? "bg-amber-400" : "bg-slate-300"}`} style={{ width: `${m.util}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="bg-slate-50 rounded-lg p-2">
                  <div className="text-slate-400">온도</div>
                  <div className="font-semibold text-slate-800 mt-0.5">{m.temp}°C</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <div className="text-slate-400">진동 (mm/s)</div>
                  <div className={`font-semibold mt-0.5 ${m.vibration > 1.0 ? "text-rose-600" : "text-slate-800"}`}>{m.vibration.toFixed(1)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 경보 목록 */}
      {tab === "alarms" && (
        <div className="space-y-3">
          {alarms.map(a => (
            <div key={a.id} className={`bg-white rounded-xl border p-4 flex items-start gap-3 ${a.resolved ? "opacity-60 border-slate-100" : a.type === "warning" ? "border-amber-200" : "border-slate-200"}`}>
              {a.type === "warning"
                ? <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${a.resolved ? "text-slate-300" : "text-amber-500"}`} />
                : <CheckCircle className="w-5 h-5 mt-0.5 shrink-0 text-blue-400" />
              }
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">{a.machine}</span>
                  <span className="text-xs text-slate-400">{a.time}</span>
                  {a.resolved && <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">해소됨</span>}
                  {!a.resolved && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">미해소</span>}
                </div>
                <p className="text-sm text-slate-600 mt-0.5">{a.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
