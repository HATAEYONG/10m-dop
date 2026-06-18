"use client";

import { useState, useRef } from "react";
import {
  Upload, Database, Radio, FileText, CheckCircle2, AlertCircle,
  X, Plus, Eye, ArrowRight, Loader2, RefreshCw, Wifi, WifiOff,
} from "lucide-react";

// ── 타입 정의 ────────────────────────────────────────────────────
type DataType = "structured" | "semi" | "unstructured";

interface IngestionJob {
  id: string;
  name: string;
  type: DataType;
  size: string;
  status: "uploading" | "parsing" | "profiling" | "done" | "error";
  progress: number;
  records: number;
  issues: number;
}

// ── 탭 설정 ──────────────────────────────────────────────────────
const TABS = [
  {
    id: "structured" as DataType,
    label: "정형 데이터",
    icon: Database,
    color: "blue",
    desc: "ERP·MES·CSV·Excel — 행/열 구조 데이터",
    exts: [".xlsx", ".csv", ".json", "DB 연결"],
    sources: ["더존 ERP", "SAP", "MES", "Oracle DB", "MySQL", "CSV", "Excel"],
  },
  {
    id: "semi" as DataType,
    label: "반정형 데이터",
    icon: Radio,
    color: "violet",
    desc: "센서·JSON API·이메일·메신저 — 느슨한 구조 데이터",
    exts: [".json", ".xml", "API", "Email", "MQTT"],
    sources: ["Sensor Gateway (OPC-UA)", "REST API", "Email Parser", "Kafka Topic", "XML EDI"],
  },
  {
    id: "unstructured" as DataType,
    label: "비정형 데이터",
    icon: FileText,
    color: "amber",
    desc: "PDF·이미지·텍스트·음성 — 자유 형식 데이터",
    exts: [".pdf", ".png", ".jpg", ".txt", ".mp3"],
    sources: ["PDF 작업표준서", "검사성적서 이미지", "카카오톡 발주", "이메일 첨부", "음성 메모"],
  },
];

// ── 기존 적재 이력 ────────────────────────────────────────────────
const HISTORY: IngestionJob[] = [
  { id: "j1", name: "더존 ERP 자재마스터.xlsx",   type: "structured",   size: "2.4 MB", status: "done",      progress: 100, records: 8420,  issues: 3 },
  { id: "j2", name: "MES 설비 로그 2026-06.csv",   type: "structured",   size: "18 MB",  status: "done",      progress: 100, records: 182400, issues: 0 },
  { id: "j3", name: "OPC-UA 센서 스트림",           type: "semi",         size: "실시간",  status: "uploading", progress: 65,  records: 4820,  issues: 1 },
  { id: "j4", name: "API_발주데이터_2026Q2.json",   type: "semi",         size: "880 KB", status: "done",      progress: 100, records: 1240,  issues: 0 },
  { id: "j5", name: "작업표준서_CNC가공.pdf",       type: "unstructured", size: "3.1 MB", status: "done",      progress: 100, records: 216,   issues: 7 },
  { id: "j6", name: "검사성적서_이미지.zip",        type: "unstructured", size: "42 MB",  status: "parsing",   progress: 38,  records: 0,     issues: 0 },
];

const colorMap: Record<string, string> = {
  blue:   "bg-blue-50 text-blue-600 border-blue-200",
  violet: "bg-violet-50 text-violet-600 border-violet-200",
  amber:  "bg-amber-50 text-amber-600 border-amber-200",
};
const activeBg: Record<string, string> = {
  blue:   "bg-blue-600",
  violet: "bg-violet-600",
  amber:  "bg-amber-600",
};

const statusLabel: Record<string, string> = {
  uploading: "업로드 중",
  parsing:   "파싱 중",
  profiling: "프로파일링",
  done:      "완료",
  error:     "오류",
};
const statusColor: Record<string, string> = {
  uploading: "text-blue-600 bg-blue-50",
  parsing:   "text-violet-600 bg-violet-50",
  profiling: "text-amber-600 bg-amber-50",
  done:      "text-emerald-600 bg-emerald-50",
  error:     "text-rose-600 bg-rose-50",
};

const typeColor: Record<DataType, string> = {
  structured:   "text-blue-600 bg-blue-100",
  semi:         "text-violet-600 bg-violet-100",
  unstructured: "text-amber-600 bg-amber-100",
};
const typeLabel: Record<DataType, string> = {
  structured:   "정형",
  semi:         "반정형",
  unstructured: "비정형",
};

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export default function IngestPage() {
  const [activeTab, setActiveTab] = useState<DataType>("structured");
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const tab = TABS.find(t => t.id === activeTab)!;
  const tabJobs = HISTORY.filter(j => j.type === activeTab);
  const allDone = HISTORY.filter(j => j.status === "done").length;

  return (
    <div className="p-6 space-y-6">

      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Ingestion Hub</h1>
          <p className="text-slate-500 mt-1">정형·반정형·비정형 데이터를 한 곳에서 적재·처리·10M 표준화로 연결합니다</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <Wifi className="w-3.5 h-3.5" />
          <span>파이프라인 연결됨</span>
        </div>
      </div>

      {/* ── 요약 KPI ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "총 적재 소스",  value: HISTORY.length,                   unit: "건",     color: "text-slate-700" },
          { label: "처리 완료",     value: allDone,                           unit: "건",     color: "text-emerald-600" },
          { label: "총 레코드",     value: "196,096",                         unit: "rows",  color: "text-blue-600" },
          { label: "이슈 발견",     value: HISTORY.reduce((s,j)=>s+j.issues,0), unit: "건",  color: "text-amber-600" },
        ].map(({ label, value, unit, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-400">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>
              {value}<span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* ── 탭 ── */}
      <div className="flex gap-2">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id
                ? `${activeBg[t.color]} text-white shadow`
                : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-5">

        {/* ── 왼쪽: 업로드 영역 (3/5) ── */}
        <div className="col-span-3 space-y-4">

          {/* 드래그앤드롭 존 */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); }}
            onClick={() => fileRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
              dragging
                ? `border-${tab.color}-400 bg-${tab.color}-50`
                : "border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white"
            }`}
          >
            <input ref={fileRef} type="file" className="hidden" multiple />
            <div className={`w-14 h-14 rounded-2xl ${colorMap[tab.color].split(" ").slice(0,2).join(" ")} flex items-center justify-center mb-4`}>
              <tab.icon className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">
              {tab.label} 파일을 드래그하거나 클릭하여 업로드
            </p>
            <p className="text-xs text-slate-400 mb-3">{tab.desc}</p>
            <div className="flex gap-2 flex-wrap justify-center">
              {tab.exts.map(ext => (
                <span key={ext} className={`text-xs border rounded px-2 py-0.5 ${colorMap[tab.color]}`}>{ext}</span>
              ))}
            </div>
          </div>

          {/* 또는 소스 직접 연결 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 mb-3">또는 데이터 소스 직접 연결</p>
            <div className="grid grid-cols-3 gap-2">
              {tab.sources.map(src => (
                <button
                  key={src}
                  className="text-left px-3 py-2.5 rounded-lg border border-slate-100 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    <span className="text-xs text-slate-600 group-hover:text-blue-600 transition-colors">{src}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 적재 이력 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">{tab.label} 적재 이력</h3>
              <button className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> 새로고침
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {tabJobs.length === 0 && (
                <div className="px-4 py-8 text-center text-xs text-slate-400">아직 적재된 데이터가 없습니다</div>
              )}
              {tabJobs.map(job => (
                <div key={job.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-slate-700 truncate">{job.name}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${statusColor[job.status]}`}>
                        {job.status === "uploading" || job.status === "parsing"
                          ? <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />{statusLabel[job.status]}</span>
                          : statusLabel[job.status]
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-400">{job.size}</span>
                      {job.status === "done" && (
                        <button onClick={() => setPreview(job.id)} className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
                          <Eye className="w-3 h-3" /> 미리보기
                        </button>
                      )}
                    </div>
                  </div>
                  {job.status !== "done" && <ProgressBar value={job.progress} color={
                    job.status === "error" ? "bg-rose-400" : `bg-${tab.color}-500`
                  } />}
                  {job.status === "done" && (
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>{job.records.toLocaleString()} 레코드</span>
                      {job.issues > 0 && (
                        <span className="flex items-center gap-1 text-amber-500">
                          <AlertCircle className="w-3 h-3" /> 이슈 {job.issues}건
                        </span>
                      )}
                      {job.issues === 0 && (
                        <span className="flex items-center gap-1 text-emerald-500">
                          <CheckCircle2 className="w-3 h-3" /> 이슈 없음
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 오른쪽: 10M 도메인 연결 + 파이프라인 (2/5) ── */}
        <div className="col-span-2 space-y-4">

          {/* 10M 도메인 매핑 현황 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">10M 도메인 매핑 현황</h3>
            <div className="space-y-2">
              {[
                { domain: "Material",     mapped: 12, total: 14, done: true },
                { domain: "Product",      mapped: 8,  total: 10, done: false },
                { domain: "Customer",     mapped: 6,  total: 8,  done: false },
                { domain: "Supplier",     mapped: 5,  total: 6,  done: true },
                { domain: "Order",        mapped: 9,  total: 12, done: false },
                { domain: "BOM",          mapped: 4,  total: 7,  done: false },
                { domain: "Process",      mapped: 11, total: 11, done: true },
                { domain: "Machine",      mapped: 7,  total: 9,  done: false },
                { domain: "Measurement",  mapped: 5,  total: 8,  done: false },
                { domain: "Maintenance",  mapped: 3,  total: 5,  done: false },
              ].map(d => (
                <div key={d.domain} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${d.done ? "bg-emerald-400" : "bg-slate-200"}`} />
                  <span className="text-xs text-slate-600 w-24">{d.domain}</span>
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${d.done ? "bg-emerald-400" : "bg-blue-300"}`}
                      style={{ width: `${(d.mapped / d.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-10 text-right">{d.mapped}/{d.total}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 다음 단계 안내 */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 text-white">
            <h3 className="text-sm font-semibold mb-1">다음 단계</h3>
            <p className="text-xs text-slate-400 mb-4">적재 완료 후 표준화 파이프라인을 실행하세요</p>
            <div className="space-y-2">
              {[
                { href: "/schema-mapping",  label: "Schema Mapping",     count: "14건 대기" },
                { href: "/data-cleaner",    label: "Data Cleaner",        count: "실행 준비됨" },
                { href: "/ontology-mapping",label: "Ontology Mapping",   count: "25건 미매핑" },
                { href: "/ax-chat",         label: "AX Chat으로 검증",   count: "→" },
              ].map(({ href, label, count }) => (
                <a key={href} href={href} className="flex items-center justify-between py-2 border-b border-slate-700 hover:border-slate-500 transition-colors group">
                  <span className="text-xs text-slate-300 group-hover:text-white transition-colors">{label}</span>
                  <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors flex items-center gap-1">
                    {count} <ArrowRight className="w-3 h-3" />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 미리보기 모달 */}
      {preview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">데이터 미리보기</h3>
              <button onClick={() => setPreview(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-emerald-400 overflow-x-auto">
              <pre>{`{
  "mat_cd": "AL6061-T6",
  "mat_nm": "알루미늄 합금 봉재",
  "unit": "EA",
  "std_qty": 100,
  "domain": "Material",    // 10M 매핑 완료
  "quality": 0.94
}`}</pre>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Material 도메인 자동 매핑 완료 · 신뢰도 94%
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
