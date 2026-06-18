"use client";

import { useState, useRef } from "react";
import {
  FileText, CheckCircle2, Clock, AlertCircle, Table2, Tag, AlignLeft,
  Upload, RefreshCw, Database, ChevronRight, Zap, ScanLine, Layout,
  Braces, Layers, XCircle, Play, Hash,
} from "lucide-react";

type ParseStatus = "done" | "processing" | "failed" | "queued";

interface PipelineStage {
  id: string;
  label: string;
  status: "done" | "running" | "pending" | "error";
  elapsedMs?: number;
}

interface TextChunk {
  chunkId: string;
  page: number;
  section: string;
  tokens: number;
  text: string;
}

interface EmbeddingChunk {
  chunkId: string;
  page: number;
  tokens: number;
  vectorId: string;
  similarity?: number;
  preview: string;
}

interface ParsedTable {
  headers: string[];
  rows: string[][];
}

interface ParsedDoc {
  id: number;
  filename: string;
  type: "PDF" | "CSV" | "Word";
  source: string;
  size: string;
  status: ParseStatus;
  progress: number;
  pages?: number;
  tables: ParsedTable[];
  entities: { label: string; type: string; count: number }[];
  chunks: TextChunk[];
  embeddings: EmbeddingChunk[];
  pipeline: PipelineStage[];
  confidence: number;
  failReason?: string;
  failStack?: string;
  queuedEta?: string;
}

// ─── 데이터 ─────────────────────────────────────────────────────────
const PIPELINE_DONE: PipelineStage[] = [
  { id:"pre",    label:"전처리",      status:"done", elapsedMs:120  },
  { id:"ocr",    label:"OCR",         status:"done", elapsedMs:2840 },
  { id:"layout", label:"레이아웃 분석", status:"done", elapsedMs:680  },
  { id:"ner",    label:"NER 추출",    status:"done", elapsedMs:1240 },
  { id:"embed",  label:"임베딩",       status:"done", elapsedMs:3420 },
];

const PIPELINE_PROCESSING: PipelineStage[] = [
  { id:"pre",    label:"전처리",      status:"done",    elapsedMs:98   },
  { id:"ocr",    label:"OCR",         status:"done",    elapsedMs:1840 },
  { id:"layout", label:"레이아웃 분석", status:"running"              },
  { id:"ner",    label:"NER 추출",    status:"pending"               },
  { id:"embed",  label:"임베딩",       status:"pending"               },
];

const PIPELINE_FAILED: PipelineStage[] = [
  { id:"pre",    label:"전처리",      status:"done",  elapsedMs:110  },
  { id:"ocr",    label:"OCR",         status:"done",  elapsedMs:8200 },
  { id:"layout", label:"레이아웃 분석", status:"error"               },
  { id:"ner",    label:"NER 추출",    status:"pending"               },
  { id:"embed",  label:"임베딩",       status:"pending"               },
];

function makeDoneChunks(filename: string): TextChunk[] {
  const sections = ["개요", "적용 범위", "작업 절차", "안전 주의사항", "품질 기준"];
  return sections.map((sec, i) => ({
    chunkId: `${filename.split(".")[0]}_C${String(i + 1).padStart(3, "0")}`,
    page: i + 1,
    section: sec,
    tokens: 180 + Math.floor(Math.random() * 120),
    text: i === 0
      ? "본 작업표준서는 AL6061-T6 소재를 이용한 CNC 가공 공정의 표준 절차를 정의합니다. 작업자는 반드시 안전장비를 착용하고 작업 전 설비 점검을 완료해야 합니다."
      : i === 1
      ? "본 표준서는 A사업장 CNC 가공 라인 전체에 적용되며, 신규 작업자 교육 및 정기 작업 감사의 기준 문서로 활용됩니다."
      : i === 2
      ? "① 작업 지시서 확인 → ② 소재 규격 검수 → ③ 공구 장착 및 영점 설정 → ④ 시험 가공 → ⑤ 치수 검사 → ⑥ 본 가공 순으로 진행합니다."
      : i === 3
      ? "가공 중 비산 칩에 대비해 반드시 보안경을 착용합니다. 절삭유 미스트 발생 구간에서는 방진마스크를 추가로 착용합니다."
      : "완성품은 버니어캘리퍼스(0.02mm 정밀도)로 치수 검사를 실시하며, 도면 공차 초과 시 불량으로 분류합니다.",
  }));
}

function makeDoneEmbeddings(filename: string): EmbeddingChunk[] {
  const base = filename.split(".")[0];
  return Array.from({ length: 5 }, (_, i) => ({
    chunkId: `${base}_C${String(i + 1).padStart(3, "0")}`,
    page: i + 1,
    tokens: 180 + i * 24,
    vectorId: `vec_${base}_${(100000 + i * 13427).toString(16)}`,
    similarity: i === 0 ? undefined : parseFloat((0.72 + Math.random() * 0.22).toFixed(3)),
    preview: ["AL6061 CNC 가공 표준 절차 개요", "적용 범위: A사업장 전 CNC 라인", "작업 절차 단계별 정의", "안전장비 착용 기준", "치수 검사 품질 기준"][i],
  }));
}

const DOCS: ParsedDoc[] = [
  {
    id: 1,
    filename: "작업표준서_CNC가공_v3.2.pdf",
    type: "PDF", source: "A업체 / 생산기술팀", size: "2.4MB",
    status: "done", progress: 100, pages: 24, confidence: 91,
    pipeline: PIPELINE_DONE,
    chunks: makeDoneChunks("작업표준서_CNC가공_v3.2"),
    embeddings: makeDoneEmbeddings("작업표준서_CNC가공_v3.2"),
    tables: [
      {
        headers: ["공정번호","공정명","설비","작업시간(min)","불량기준"],
        rows: [
          ["P-001","황삭가공","CNC-001","45","치수편차 ±0.05mm"],
          ["P-002","정삭가공","CNC-002","30","표면조도 Ra1.6"],
          ["P-003","드릴링","MCT-001","20","직경공차 H7"],
          ["P-004","탭가공","MCT-001","15","나사게이지 합격"],
        ],
      },
      {
        headers: ["안전장비","착용여부","비고"],
        rows: [
          ["안전화","필수","KS 인증"],
          ["보안경","필수","비산칩 위험"],
          ["방진마스크","권장","절삭유 미스트"],
        ],
      },
    ],
    entities: [
      { label:"CNC-001, CNC-002, MCT-001", type:"Machine",     count:3 },
      { label:"P-001 ~ P-004",             type:"Process",     count:4 },
      { label:"AL6061-T6",                 type:"Material",    count:1 },
    ],
  },
  {
    id: 2,
    filename: "설비점검성적서_2406.pdf",
    type: "PDF", source: "B업체 / 설비팀", size: "1.1MB",
    status: "done", progress: 100, pages: 8, confidence: 88,
    pipeline: PIPELINE_DONE,
    chunks: makeDoneChunks("설비점검성적서_2406"),
    embeddings: makeDoneEmbeddings("설비점검성적서_2406"),
    tables: [
      {
        headers: ["설비ID","점검항목","기준값","측정값","판정"],
        rows: [
          ["CNC-001","주축 진동","≤0.003mm","0.0025mm","합격"],
          ["CNC-001","백래시","≤0.005mm","0.004mm","합격"],
          ["WLD-002","전류값","180±5A","183A","합격"],
          ["WLD-002","가스압력","0.15±0.01MPa","0.17MPa","주의"],
        ],
      },
    ],
    entities: [
      { label:"CNC-001, WLD-002",                   type:"Machine",     count:2 },
      { label:"주축진동, 백래시, 전류값, 가스압력", type:"Measurement", count:4 },
    ],
  },
  {
    id: 3,
    filename: "MES_공정실적_2406.csv",
    type: "CSV", source: "B업체 / MES", size: "8.7MB",
    status: "done", progress: 100, confidence: 97,
    pipeline: PIPELINE_DONE,
    chunks: makeDoneChunks("MES_공정실적_2406"),
    embeddings: makeDoneEmbeddings("MES_공정실적_2406"),
    tables: [
      {
        headers: ["작업지시번호","품목코드","공정","설비","시작시간","종료시간","수량","불량수"],
        rows: [
          ["WO-2406-001","PROD-001","황삭","CNC-001","09:00","09:45","10","0"],
          ["WO-2406-002","PROD-001","정삭","CNC-002","10:00","10:30","10","1"],
          ["WO-2406-003","PROD-002","용접","WLD-002","11:00","12:30","5","0"],
          ["WO-2406-004","MAT-001","검사","QC-001","13:00","13:20","15","2"],
        ],
      },
    ],
    entities: [
      { label:"WO-2406-001 ~ 004",               type:"WorkOrder", count:4 },
      { label:"PROD-001, PROD-002",               type:"Product",   count:2 },
      { label:"CNC-001, CNC-002, WLD-002, QC-001",type:"Machine",   count:4 },
    ],
  },
  {
    id: 4,
    filename: "검사성적서_QC-2406-089.pdf",
    type: "PDF", source: "D업체 / 품질팀", size: "0.8MB",
    status: "processing", progress: 62, pages: 5, confidence: 0,
    pipeline: PIPELINE_PROCESSING,
    chunks: [], embeddings: [], tables: [], entities: [],
  },
  {
    id: 5,
    filename: "품질매뉴얼_ISO9001_2024.pdf",
    type: "PDF", source: "C업체 / 품질팀", size: "15.2MB",
    status: "failed", progress: 23, pages: 120, confidence: 0,
    pipeline: PIPELINE_FAILED,
    chunks: [], embeddings: [], tables: [], entities: [],
    failReason: "레이아웃 분석 실패 — 복합 컬럼 PDF 구조 미지원",
    failStack: "LayoutAnalyzer: UnsupportedLayoutError: multi-column detected at page 14\n  at parseLayout (layout.ts:284)\n  at PipelineRunner.runStage (runner.ts:112)\n  at async DocumentPipeline.process (pipeline.ts:88)",
  },
  {
    id: 6,
    filename: "설비이력카드_MCT-001.pdf",
    type: "PDF", source: "A업체 / 설비팀", size: "3.1MB",
    status: "queued", progress: 0, pages: 32, confidence: 0,
    pipeline: [
      { id:"pre",    label:"전처리",      status:"pending" },
      { id:"ocr",    label:"OCR",         status:"pending" },
      { id:"layout", label:"레이아웃 분석", status:"pending" },
      { id:"ner",    label:"NER 추출",    status:"pending" },
      { id:"embed",  label:"임베딩",       status:"pending" },
    ],
    chunks: [], embeddings: [], tables: [], entities: [],
    queuedEta: "약 4분 후 시작 예정 (대기 2번째)",
  },
];

// ─── 설정 ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<ParseStatus, { label: string; color: string; icon: React.ReactNode }> = {
  done:       { label:"완료",   color:"text-emerald-600 bg-emerald-50 border-emerald-200", icon:<CheckCircle2 className="w-3.5 h-3.5" /> },
  processing: { label:"파싱중", color:"text-blue-600 bg-blue-50 border-blue-200",           icon:<RefreshCw className="w-3.5 h-3.5 animate-spin" /> },
  failed:     { label:"실패",   color:"text-rose-600 bg-rose-50 border-rose-200",           icon:<XCircle className="w-3.5 h-3.5" /> },
  queued:     { label:"대기",   color:"text-slate-500 bg-slate-50 border-slate-200",        icon:<Clock className="w-3.5 h-3.5" /> },
};

const TYPE_COLOR = { PDF:"bg-rose-100 text-rose-700", CSV:"bg-green-100 text-green-700", Word:"bg-blue-100 text-blue-700" };

const ENTITY_COLOR: Record<string, string> = {
  Machine:"bg-slate-100 text-slate-700", Process:"bg-blue-100 text-blue-700",
  Material:"bg-orange-100 text-orange-700", Measurement:"bg-violet-100 text-violet-700",
  WorkOrder:"bg-yellow-100 text-yellow-700", Product:"bg-green-100 text-green-700",
};

const STAGE_ICON: Record<string, React.ReactNode> = {
  pre:    <Zap className="w-3.5 h-3.5" />,
  ocr:    <ScanLine className="w-3.5 h-3.5" />,
  layout: <Layout className="w-3.5 h-3.5" />,
  ner:    <Braces className="w-3.5 h-3.5" />,
  embed:  <Layers className="w-3.5 h-3.5" />,
};

// ─── 파이프라인 바 ────────────────────────────────────────────────────
function PipelineBar({ stages }: { stages: PipelineStage[] }) {
  return (
    <div className="flex items-center gap-1 mt-3">
      {stages.map((s, i) => {
        const isDone    = s.status === "done";
        const isRunning = s.status === "running";
        const isError   = s.status === "error";
        const isPending = s.status === "pending";
        return (
          <div key={s.id} className="flex items-center gap-1 flex-1">
            <div className={`flex-1 rounded-lg px-2 py-1.5 text-center transition-all ${
              isDone    ? "bg-emerald-50 border border-emerald-200" :
              isRunning ? "bg-blue-50 border border-blue-300 shadow-sm" :
              isError   ? "bg-rose-50 border border-rose-200" :
              "bg-slate-50 border border-slate-200"
            }`}>
              <div className={`flex items-center justify-center gap-1 text-xs font-medium ${
                isDone    ? "text-emerald-600" :
                isRunning ? "text-blue-600" :
                isError   ? "text-rose-600" :
                "text-slate-400"
              }`}>
                <span className={isRunning ? "animate-pulse" : ""}>{STAGE_ICON[s.id]}</span>
                <span className="truncate">{s.label}</span>
              </div>
              {isDone && s.elapsedMs && (
                <div className="text-xs text-slate-400 mt-0.5">{(s.elapsedMs / 1000).toFixed(1)}s</div>
              )}
              {isRunning && <div className="text-xs text-blue-400 mt-0.5 animate-pulse">실행중…</div>}
              {isError   && <div className="text-xs text-rose-500 mt-0.5">오류</div>}
              {isPending && <div className="text-xs text-slate-300 mt-0.5">대기</div>}
            </div>
            {i < stages.length - 1 && (
              <ChevronRight className={`w-3 h-3 shrink-0 ${isDone ? "text-emerald-300" : "text-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── 업로드 존 ────────────────────────────────────────────────────────
function UploadZone({ onAdd }: { onAdd: () => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); onAdd(); }}
      onClick={() => inputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all select-none ${
        dragging ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
      }`}
    >
      <Upload className={`w-8 h-8 ${dragging ? "text-blue-400" : "text-slate-300"}`} />
      <div className="text-center">
        <p className={`text-sm font-medium ${dragging ? "text-blue-600" : "text-slate-500"}`}>
          {dragging ? "여기에 놓으세요" : "파일을 드래그하거나 클릭하여 업로드"}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">PDF · CSV · Word (.docx) 지원 · 최대 50MB</p>
      </div>
      <div className="flex gap-2 mt-1">
        {["PDF","CSV","Word"].map(t => (
          <span key={t} className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_COLOR[t as keyof typeof TYPE_COLOR]}`}>{t}</span>
        ))}
      </div>
      <input ref={inputRef} type="file" accept=".pdf,.csv,.docx" multiple className="hidden" onChange={onAdd} />
    </div>
  );
}

// ─── 메인 ────────────────────────────────────────────────────────────
export default function DocumentParser() {
  const [docs, setDocs] = useState<ParsedDoc[]>(DOCS);
  const [selected, setSelected] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<"tables" | "entities" | "text" | "embed">("tables");
  const [showStack, setShowStack] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const sel = docs.find(d => d.id === selected)!;
  const done      = docs.filter(d => d.status === "done").length;
  const totalTabs = docs.filter(d => d.status === "done").reduce((s, d) => s + d.tables.length, 0);
  const totalEnt  = docs.filter(d => d.status === "done").reduce((s, d) => s + d.entities.reduce((e, en) => e + en.count, 0), 0);
  const totalVec  = docs.filter(d => d.status === "done").reduce((s, d) => s + d.embeddings.length, 0);

  function handleUploadMock() {
    const newId = docs.length + 1;
    const newDoc: ParsedDoc = {
      id: newId, filename: `신규문서_${newId}.pdf`, type: "PDF",
      source: "업로드 / 사용자", size: "—",
      status: "queued", progress: 0, confidence: 0,
      pipeline: [
        { id:"pre",    label:"전처리",      status:"pending" },
        { id:"ocr",    label:"OCR",         status:"pending" },
        { id:"layout", label:"레이아웃 분석", status:"pending" },
        { id:"ner",    label:"NER 추출",    status:"pending" },
        { id:"embed",  label:"임베딩",       status:"pending" },
      ],
      chunks: [], embeddings: [], tables: [], entities: [],
      queuedEta: "약 6분 후 시작 예정",
    };
    setDocs(prev => [...prev, newDoc]);
    setSelected(newId);
  }

  function handleRetry(id: number) {
    setRetrying(true);
    setTimeout(() => {
      setDocs(prev => prev.map(d => d.id === id ? { ...d, status:"queued", progress:0, failReason:undefined, failStack:undefined, queuedEta:"즉시 재시도 예정", pipeline: [
        { id:"pre",    label:"전처리",      status:"pending" },
        { id:"ocr",    label:"OCR",         status:"pending" },
        { id:"layout", label:"레이아웃 분석", status:"pending" },
        { id:"ner",    label:"NER 추출",    status:"pending" },
        { id:"embed",  label:"임베딩",       status:"pending" },
      ]} : d));
      setRetrying(false);
      setShowStack(false);
    }, 800);
  }

  return (
    <div className="p-6 space-y-5">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Document Parser</h1>
        <p className="text-slate-500 mt-1 text-sm">PDF·CSV·Word 문서에서 표·텍스트·엔티티·임베딩을 자동 추출 — 5단계 AI 파이프라인</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label:"전체 문서",      value:docs.length,   unit:"건",  color:"text-slate-800" },
          { label:"파싱 완료",      value:done,           unit:"건",  color:"text-emerald-600" },
          { label:"추출된 표",      value:totalTabs,      unit:"개",  color:"text-blue-600" },
          { label:"추출된 엔티티",  value:totalEnt,       unit:"건",  color:"text-violet-600" },
          { label:"임베딩 벡터",    value:totalVec,       unit:"개",  color:"text-orange-600" },
        ].map(({ label, value, unit, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="text-xs text-slate-500 mb-1">{label}</div>
            <div className={`text-2xl font-bold ${color}`}>{value}<span className="text-sm font-normal text-slate-400 ml-1">{unit}</span></div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        {/* 좌측 */}
        <div className="w-72 shrink-0 space-y-3">
          {/* 업로드 존 */}
          <UploadZone onAdd={handleUploadMock} />

          {/* 문서 목록 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">문서 목록</div>
            <div className="divide-y divide-slate-100">
              {docs.map(doc => {
                const sc = STATUS_CFG[doc.status];
                const isSel = selected === doc.id;
                return (
                  <div key={doc.id} onClick={() => { setSelected(doc.id); setActiveTab("tables"); setShowStack(false); }}
                    className={`p-3 cursor-pointer transition-colors hover:bg-slate-50 ${isSel ? "bg-blue-50 border-l-2 border-blue-500" : ""}`}>
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-900 truncate">{doc.filename}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{doc.source}</div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${TYPE_COLOR[doc.type]}`}>{doc.type}</span>
                          <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border ${sc.color}`}>
                            {sc.icon} {sc.label}
                          </span>
                        </div>
                        {doc.status === "processing" && (
                          <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400 rounded-full" style={{ width:`${doc.progress}%` }} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 우측 패널 */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* 파이프라인 바 (항상 표시) */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h2 className="font-semibold text-slate-900 truncate">{sel.filename}</h2>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                  <span>{sel.source}</span>
                  <span>{sel.size}</span>
                  {sel.pages && <span>{sel.pages}p</span>}
                  {sel.confidence > 0 && (
                    <span className={`font-semibold ${sel.confidence >= 90 ? "text-emerald-600" : sel.confidence >= 75 ? "text-blue-600" : "text-amber-600"}`}>
                      신뢰도 {sel.confidence}%
                    </span>
                  )}
                </div>
              </div>
              <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_CFG[sel.status].color}`}>
                {STATUS_CFG[sel.status].icon} {STATUS_CFG[sel.status].label}
              </span>
            </div>
            <PipelineBar stages={sel.pipeline} />
          </div>

          {/* 완료 문서 탭 패널 */}
          {sel.status === "done" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 pt-4 border-b border-slate-100 pb-3">
                <div className="flex gap-2">
                  {([
                    ["tables",  `표 (${sel.tables.length})`,    <Table2 className="w-3.5 h-3.5" />],
                    ["entities",`엔티티 (${sel.entities.reduce((s,e)=>s+e.count,0)})`, <Tag className="w-3.5 h-3.5" />],
                    ["text",    "원문 청크",                     <AlignLeft className="w-3.5 h-3.5" />],
                    ["embed",   `임베딩 (${sel.embeddings.length})`, <Database className="w-3.5 h-3.5" />],
                  ] as [typeof activeTab, string, React.ReactNode][]).map(([id, label, icon]) => (
                    <button key={id} onClick={() => setActiveTab(id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        activeTab === id ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                      }`}>
                      {icon}{label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 overflow-auto max-h-[480px]">
                {/* 표 탭 */}
                {activeTab === "tables" && (
                  <div className="space-y-6">
                    {sel.tables.map((tbl, ti) => (
                      <div key={ti}>
                        <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">표 {ti + 1}</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50">
                                {tbl.headers.map(h => (
                                  <th key={h} className="px-3 py-2 text-left text-slate-600 font-semibold border border-slate-200">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {tbl.rows.map((row, ri) => (
                                <tr key={ri} className="hover:bg-slate-50">
                                  {row.map((cell, ci) => (
                                    <td key={ci} className="px-3 py-2 text-slate-700 border border-slate-200">{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 엔티티 탭 */}
                {activeTab === "entities" && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400 mb-3">NER 단계에서 추출된 엔티티 — Entity Resolution 대기열로 전송 가능</p>
                    {sel.entities.map((en, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${ENTITY_COLOR[en.type] || "bg-slate-100 text-slate-600"}`}>{en.type}</span>
                        <span className="text-sm text-slate-700 flex-1">{en.label}</span>
                        <span className="text-xs text-slate-400 shrink-0">{en.count}건</span>
                        <button className="text-xs px-2.5 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shrink-0">→ ER 전송</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 원문 청크 탭 */}
                {activeTab === "text" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-slate-400">섹션별 청크 분리 — {sel.chunks.length}개 청크</p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Hash className="w-3.5 h-3.5" />
                        총 {sel.chunks.reduce((s, c) => s + c.tokens, 0).toLocaleString()} 토큰
                      </div>
                    </div>
                    {sel.chunks.map((chunk, i) => (
                      <div key={i} className="border border-slate-100 rounded-lg overflow-hidden">
                        <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 border-b border-slate-100">
                          <span className="font-mono text-xs text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">{chunk.chunkId}</span>
                          <span className="text-xs text-slate-500 font-medium">{chunk.section}</span>
                          <span className="text-xs text-slate-400">p.{chunk.page}</span>
                          <span className="ml-auto text-xs text-blue-600 font-mono">{chunk.tokens} tok</span>
                        </div>
                        <div className="px-3 py-2.5 text-xs text-slate-600 leading-relaxed">{chunk.text}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 임베딩 탭 */}
                {activeTab === "embed" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[
                        { label:"저장 위치",    value:"pgvector (TimescaleDB)", color:"text-violet-600" },
                        { label:"벡터 차원",    value:"1536-dim (text-embed-3)", color:"text-slate-700" },
                        { label:"인덱스 타입",  value:"HNSW (m=16, ef=64)",      color:"text-slate-700" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                          <div className="text-xs text-slate-400">{label}</div>
                          <div className={`text-xs font-semibold mt-0.5 ${color}`}>{value}</div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 mb-2">청크별 벡터 저장 현황 — 유사도 값은 "CNC 가공 표준 절차" 쿼리 기준</p>
                    {sel.embeddings.map((emb, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                        <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center shrink-0">
                          <Database className="w-4 h-4 text-violet-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-xs text-slate-600">{emb.chunkId}</span>
                            <span className="text-xs text-slate-400">p.{emb.page} · {emb.tokens} tok</span>
                          </div>
                          <div className="text-xs text-slate-500 truncate">{emb.preview}</div>
                          <div className="font-mono text-xs text-slate-300 mt-0.5 truncate">{emb.vectorId}</div>
                        </div>
                        {emb.similarity !== undefined ? (
                          <div className="text-right shrink-0">
                            <div className="text-xs text-slate-400 mb-0.5">유사도</div>
                            <div className={`text-sm font-bold ${emb.similarity > 0.85 ? "text-emerald-600" : emb.similarity > 0.75 ? "text-blue-600" : "text-slate-500"}`}>
                              {emb.similarity.toFixed(3)}
                            </div>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                              <div className={`h-full rounded-full ${emb.similarity > 0.85 ? "bg-emerald-400" : "bg-blue-400"}`}
                                style={{ width:`${emb.similarity * 100}%` }} />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-200 shrink-0">기준 문서</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 파싱중 패널 */}
          {sel.status === "processing" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                <div>
                  <div className="text-sm font-semibold text-slate-800">파싱 진행 중</div>
                  <div className="text-xs text-slate-400 mt-0.5">진행률 {sel.progress}% — 레이아웃 분석 단계</div>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full transition-all duration-700" style={{ width:`${sel.progress}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-2">완료 후 결과를 자동으로 표시합니다.</p>
            </div>
          )}

          {/* 실패 패널 */}
          {sel.status === "failed" && (
            <div className="bg-white rounded-xl border border-rose-200 shadow-sm overflow-hidden">
              <div className="bg-rose-50 px-5 py-4 border-b border-rose-200 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-rose-800">파싱 실패</div>
                    <div className="text-xs text-rose-600 mt-0.5">{sel.failReason}</div>
                  </div>
                </div>
                <button onClick={() => handleRetry(sel.id)} disabled={retrying}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50 shrink-0">
                  <Play className="w-3 h-3" />
                  {retrying ? "재시도 중…" : "재시도"}
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <button onClick={() => setShowStack(s => !s)}
                    className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
                    {showStack ? "▾" : "▸"} 스택 트레이스 {showStack ? "숨기기" : "보기"}
                  </button>
                  {showStack && sel.failStack && (
                    <pre className="mt-2 text-xs font-mono text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {sel.failStack}
                    </pre>
                  )}
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">해결 방법</p>
                  <ul className="text-xs text-amber-600 space-y-1 list-disc list-inside">
                    <li>PDF를 Adobe Acrobat으로 열어 "단일 열" 레이아웃으로 재저장 후 재시도</li>
                    <li>또는 페이지 14 이후를 별도 파일로 분리하여 각각 업로드</li>
                    <li>OCR 전용 모드(레이아웃 분석 건너뜀)로 강제 실행 가능</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 대기 패널 */}
          {sel.status === "queued" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-slate-400" />
                <div>
                  <div className="text-sm font-semibold text-slate-700">처리 대기 중</div>
                  <div className="text-xs text-slate-400 mt-0.5">{sel.queuedEta ?? "대기 중"}</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-400">파싱 파이프라인이 시작되면 자동으로 처리됩니다.</div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
