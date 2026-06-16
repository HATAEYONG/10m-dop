"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, Clock, Wifi, WifiOff, Plus, RefreshCw } from "lucide-react";

type SourceStatus = "connected" | "error" | "pending";

const sources = [
  { id: 1, name: "더존 ERP (A업체)", type: "DB", dept: "경영지원팀", cycle: "실시간", security: "기밀", status: "connected" as SourceStatus, lastSync: "2분 전", rows: "124,382", files: null },
  { id: 2, name: "Excel BOM 폴더 (A업체)", type: "파일서버", dept: "생산기술팀", cycle: "주 1회", security: "내부", status: "connected" as SourceStatus, lastSync: "3일 전", rows: null, files: "247개" },
  { id: 3, name: "PDF 작업표준서 (A업체)", type: "파일서버", dept: "품질팀", cycle: "수시", security: "내부", status: "error" as SourceStatus, lastSync: "실패", rows: null, files: "89개" },
  { id: 4, name: "SAP ERP (B업체)", type: "API", dept: "경영지원팀", cycle: "실시간", security: "기밀", status: "connected" as SourceStatus, lastSync: "1분 전", rows: "892,441", files: null },
  { id: 5, name: "MES 시스템 (B업체)", type: "DB", dept: "생산팀", cycle: "10분", security: "내부", status: "connected" as SourceStatus, lastSync: "9분 전", rows: "3,201,882", files: null },
  { id: 6, name: "설비 CSV 로그 (B업체)", type: "파일서버", dept: "설비팀", cycle: "일 1회", security: "일반", status: "connected" as SourceStatus, lastSync: "6시간 전", rows: null, files: "1,204개" },
  { id: 7, name: "자체 ERP (C업체)", type: "DB", dept: "경영지원팀", cycle: "일 1회", security: "기밀", status: "connected" as SourceStatus, lastSync: "18시간 전", rows: "45,221", files: null },
  { id: 8, name: "수기 Excel (C업체)", type: "Google Drive", dept: "영업팀", cycle: "수시", security: "일반", status: "error" as SourceStatus, lastSync: "실패", rows: null, files: "132개" },
  { id: 9, name: "카카오톡/메일 발주 (C업체)", type: "이메일", dept: "구매팀", cycle: "실시간", security: "내부", status: "pending" as SourceStatus, lastSync: "설정 필요", rows: null, files: null },
  { id: 10, name: "Odoo ERP (D업체)", type: "API", dept: "경영지원팀", cycle: "30분", security: "기밀", status: "connected" as SourceStatus, lastSync: "28분 전", rows: "78,331", files: null },
  { id: 11, name: "Google Sheets (D업체)", type: "Google Drive", dept: "품질팀", cycle: "수시", security: "내부", status: "pending" as SourceStatus, lastSync: "권한 필요", rows: null, files: null },
  { id: 12, name: "PDF 검사성적서 (D업체)", type: "파일서버", dept: "품질팀", cycle: "수시", security: "내부", status: "connected" as SourceStatus, lastSync: "2일 전", rows: null, files: "521개" },
];

const typeColor: Record<string, string> = {
  "DB": "bg-blue-100 text-blue-700",
  "API": "bg-violet-100 text-violet-700",
  "파일서버": "bg-slate-100 text-slate-700",
  "Google Drive": "bg-green-100 text-green-700",
  "이메일": "bg-orange-100 text-orange-700",
};

const secColor: Record<string, string> = {
  "기밀": "bg-rose-100 text-rose-700",
  "내부": "bg-amber-100 text-amber-700",
  "일반": "bg-slate-100 text-slate-600",
};

export default function SourceRegistry() {
  const [filter, setFilter] = useState<SourceStatus | "all">("all");

  const counts = {
    all: sources.length,
    connected: sources.filter(s => s.status === "connected").length,
    error: sources.filter(s => s.status === "error").length,
    pending: sources.filter(s => s.status === "pending").length,
  };

  const filtered = filter === "all" ? sources : sources.filter(s => s.status === filter);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Source Registry</h1>
          <p className="text-slate-500 mt-1">데이터 원천 등록 및 연결 상태 관리</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          데이터 원천 추가
        </button>
      </div>

      <div className="flex gap-3">
        {(["all", "connected", "error", "pending"] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${filter === s ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}
          >
            {s === "connected" && <Wifi className="w-3.5 h-3.5" />}
            {s === "error" && <WifiOff className="w-3.5 h-3.5" />}
            {s === "pending" && <Clock className="w-3.5 h-3.5" />}
            {s === "all" ? "전체" : s === "connected" ? "연결됨" : s === "error" ? "오류" : "미설정"}
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${filter === s ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>{counts[s]}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["원천명", "유형", "소유부서", "갱신주기", "보안등급", "데이터량", "연결상태", "최근 동기화", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(src => (
              <tr key={src.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900">{src.name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${typeColor[src.type] || "bg-slate-100 text-slate-600"}`}>{src.type}</span>
                </td>
                <td className="px-4 py-3 text-slate-600">{src.dept}</td>
                <td className="px-4 py-3 text-slate-600">{src.cycle}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${secColor[src.security]}`}>{src.security}</span>
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">
                  {src.rows ? `${src.rows} 행` : src.files ? src.files : "-"}
                </td>
                <td className="px-4 py-3">
                  {src.status === "connected" && (
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs font-medium">연결됨</span>
                    </div>
                  )}
                  {src.status === "error" && (
                    <div className="flex items-center gap-1.5 text-rose-600">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-xs font-medium">오류</span>
                    </div>
                  )}
                  {src.status === "pending" && (
                    <div className="flex items-center gap-1.5 text-amber-600">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-medium">미설정</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{src.lastSync}</td>
                <td className="px-4 py-3">
                  <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-emerald-700">{counts.connected}</div>
          <div className="text-sm text-emerald-600 mt-1">정상 연결</div>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-rose-700">{counts.error}</div>
          <div className="text-sm text-rose-600 mt-1">연결 오류 — 즉시 조치 필요</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-amber-700">{counts.pending}</div>
          <div className="text-sm text-amber-600 mt-1">설정 대기중</div>
        </div>
      </div>
    </div>
  );
}
