"use client";

import { useState, useEffect, useRef } from "react";
import {
  Database, Radio, FileText, CheckCircle2, AlertCircle, Loader2,
  Wifi, WifiOff, ChevronRight, Activity, MessageCircle, Zap,
  ArrowRight, RefreshCw, Eye, X, TrendingUp, Package,
  Cpu, GitBranch, BarChart3, Clock,
} from "lucide-react";

// ────────────────────────────────────────────────────────────
//  업체 정보
// ────────────────────────────────────────────────────────────
const COMPANY = {
  name: "㈜한국정밀기계",
  biz: "자동차 부품 정밀 가공 (1차 협력사)",
  erp: "더존 iCUBE 2019",
  mes: "자체 개발 MES v2.3",
  employees: 87,
  since: "2008년 설립",
};

// ────────────────────────────────────────────────────────────
//  데이터 소스 정의
// ────────────────────────────────────────────────────────────
type SrcStatus = "connected" | "live" | "parsing" | "waiting" | "error";

interface Source {
  id: string;
  name: string;
  system: string;
  type: "erp" | "mes" | "sensor" | "unstructured" | "messaging";
  protocol: string;
  status: SrcStatus;
  records: number;
  unit: string;
  lastSync: string;
  domains: string[];
  steps: StepState[];
  issues?: string;
}

type StepState = "done" | "active" | "wait" | "error";

const SOURCES: Source[] = [
  {
    id: "erp",
    name: "더존 iCUBE ERP",
    system: "더존 iCUBE 2019 (Oracle 19c)",
    type: "erp",
    protocol: "JDBC / REST API",
    status: "connected",
    records: 312480,
    unit: "rows",
    lastSync: "2분 전",
    domains: ["Material", "Supplier", "Order", "Customer", "BOM"],
    steps: ["done", "done", "done", "done"],
    issues: undefined,
  },
  {
    id: "mes",
    name: "자체 MES",
    system: "MES v2.3 (MySQL 8.0)",
    type: "mes",
    protocol: "JDBC / CSV 배치",
    status: "connected",
    records: 2841600,
    unit: "rows",
    lastSync: "5분 전",
    domains: ["Process", "Machine", "Measurement", "Maintenance"],
    steps: ["done", "done", "done", "active"],
    issues: "spindle_wear 컬럼 단위 혼재 (mm vs inch) — 표준화 대기",
  },
  {
    id: "opcua",
    name: "CNC 설비 OPC-UA",
    system: "Siemens S7-1500 × 4대",
    type: "sensor",
    protocol: "OPC-UA DA (UA-TCP)",
    status: "live",
    records: 0,
    unit: "tag·s",
    lastSync: "실시간",
    domains: ["Machine", "Measurement"],
    steps: ["done", "done", "done", "done"],
    issues: undefined,
  },
  {
    id: "modbus",
    name: "유압 프레스 Modbus",
    system: "Parker 유압 컨트롤러 × 2대",
    type: "sensor",
    protocol: "Modbus TCP/IP",
    status: "live",
    records: 0,
    unit: "tag·s",
    lastSync: "실시간",
    domains: ["Machine", "Measurement"],
    steps: ["done", "done", "done", "done"],
    issues: undefined,
  },
  {
    id: "pdf",
    name: "작업표준서 · 검사성적서",
    system: "공유 드라이브 (PDF/이미지)",
    type: "unstructured",
    protocol: "파일 업로드 / AI 파싱",
    status: "parsing",
    records: 0,
    unit: "문서",
    lastSync: "파싱 중",
    domains: ["Process", "Measurement"],
    steps: ["done", "done", "active", "wait"],
    issues: "검사성적서 42건 — 표 구조 불규칙으로 재파싱 필요",
  },
  {
    id: "kakao",
    name: "카카오톡 발주 메시지",
    system: "카카오 비즈채널 (발주 협의)",
    type: "messaging",
    protocol: "카카오 Open API",
    status: "waiting",
    records: 0,
    unit: "건",
    lastSync: "연결 대기",
    domains: ["Order", "Supplier"],
    steps: ["wait", "wait", "wait", "wait"],
    issues: "API 키 미설정 — 담당자 발급 필요",
  },
];

// ────────────────────────────────────────────────────────────
//  OPC-UA 실시간 태그
// ────────────────────────────────────────────────────────────
interface Tag {
  id: string;
  node: string;
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  normal: [number, number];
  quality: "GOOD" | "UNCERTAIN";
  domain: string;
}

const INIT_TAGS: Tag[] = [
  { id: "t1", node: "CNC-01.spindle_rpm",    label: "주축 회전수",  value: 1420, unit: "rpm",     min: 0,    max: 4000, normal: [800, 2000],  quality: "GOOD",      domain: "Machine" },
  { id: "t2", node: "CNC-01.feed_rate",      label: "이송 속도",   value: 850,  unit: "mm/min", min: 0,    max: 3000, normal: [200, 1500],  quality: "GOOD",      domain: "Machine" },
  { id: "t3", node: "CNC-01.temp_spindle",   label: "주축 온도",   value: 42.1, unit: "°C",     min: 15,   max: 80,   normal: [20, 55],     quality: "GOOD",      domain: "Measurement" },
  { id: "t4", node: "CNC-02.vibration_x",    label: "진동 X축",   value: 0.12, unit: "mm/s",   min: 0,    max: 5,    normal: [0, 0.8],     quality: "GOOD",      domain: "Measurement" },
  { id: "t5", node: "CNC-03.coolant_flow",   label: "절삭유 유량", value: 18.4, unit: "L/min",  min: 0,    max: 40,   normal: [12, 30],     quality: "GOOD",      domain: "Machine" },
  { id: "t6", node: "PRESS-01.pressure",     label: "유압 압력",   value: 6.24, unit: "bar",    min: 0,    max: 15,   normal: [4, 10],      quality: "GOOD",      domain: "Machine" },
  { id: "t7", node: "PRESS-02.stroke_pos",   label: "스트로크",    value: 124,  unit: "mm",     min: 0,    max: 200,  normal: [50, 180],    quality: "GOOD",      domain: "Machine" },
  { id: "t8", node: "CNC-04.tool_wear",      label: "공구 마모",   value: 0.31, unit: "mm",     min: 0,    max: 0.5,  normal: [0, 0.3],     quality: "UNCERTAIN", domain: "Measurement" },
];

// ────────────────────────────────────────────────────────────
//  10M 도메인 적재 결과
// ────────────────────────────────────────────────────────────
const DOMAIN_RESULT = [
  { domain: "Machine",      records: 2841600, color: "bg-blue-500",    pct: 100 },
  { domain: "Measurement",  records: 892400,  color: "bg-violet-500",  pct: 31 },
  { domain: "Material",     records: 312480,  color: "bg-indigo-500",  pct: 11 },
  { domain: "Process",      records: 248000,  color: "bg-cyan-500",    pct: 9 },
  { domain: "Order",        records: 87200,   color: "bg-emerald-500", pct: 3 },
  { domain: "Supplier",     records: 42600,   color: "bg-teal-500",    pct: 2 },
  { domain: "BOM",          records: 18400,   color: "bg-amber-500",   pct: 1 },
  { domain: "Customer",     records: 9800,    color: "bg-rose-500",    pct: 0.3 },
  { domain: "Maintenance",  records: 6200,    color: "bg-orange-500",  pct: 0.2 },
  { domain: "Product",      records: 3100,    color: "bg-pink-500",    pct: 0.1 },
];

// ────────────────────────────────────────────────────────────
//  PDF 파싱 작업
// ────────────────────────────────────────────────────────────
const PDF_JOBS = [
  { name: "작업표준서_CNC가공_v3.pdf",      pages: 24, status: "done",    extracted: 18, tables: 6 },
  { name: "작업표준서_프레스성형_v2.pdf",    pages: 16, status: "done",    extracted: 12, tables: 4 },
  { name: "검사성적서_2026-06-17.pdf",      pages: 8,  status: "done",    extracted: 7,  tables: 3 },
  { name: "검사성적서_이미지_batch_042.zip", pages: 42, status: "parsing", extracted: 19, tables: 0 },
  { name: "설비점검표_월간_2026-06.xlsx",    pages: 3,  status: "done",    extracted: 3,  tables: 3 },
];

// ────────────────────────────────────────────────────────────
//  유틸
// ────────────────────────────────────────────────────────────
const STATUS_CONF: Record<SrcStatus, { label: string; dot: string; bg: string; text: string }> = {
  connected: { label: "연결됨",   dot: "bg-emerald-400", bg: "bg-emerald-50",  text: "text-emerald-700" },
  live:      { label: "실시간",   dot: "bg-blue-400 animate-pulse", bg: "bg-blue-50", text: "text-blue-700" },
  parsing:   { label: "파싱 중",  dot: "bg-amber-400 animate-pulse", bg: "bg-amber-50", text: "text-amber-700" },
  waiting:   { label: "대기",    dot: "bg-slate-300",   bg: "bg-slate-100",   text: "text-slate-500" },
  error:     { label: "오류",    dot: "bg-rose-400",    bg: "bg-rose-50",     text: "text-rose-700" },
};

const TYPE_ICON: Record<Source["type"], React.ElementType> = {
  erp:          Database,
  mes:          Cpu,
  sensor:       Activity,
  unstructured: FileText,
  messaging:    MessageCircle,
};

const STEP_LABELS = ["연결 확인", "스키마 발견", "데이터 추출", "10M 적재"];

function jitter(v: number, pct = 0.008) {
  return +(v * (1 + (Math.random() - 0.5) * 2 * pct)).toFixed(2);
}

function StepBar({ steps }: { steps: StepState[] }) {
  return (
    <div className="flex items-center gap-0 mt-3">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 shrink-0 ${
            s === "done"   ? "bg-emerald-500 border-emerald-500" :
            s === "active" ? "bg-blue-500 border-blue-500 ring-2 ring-blue-200" :
            s === "error"  ? "bg-rose-500 border-rose-500" :
                             "bg-white border-slate-200"
          }`}>
            {s === "done"   && <CheckCircle2 className="w-3 h-3 text-white" />}
            {s === "active" && <Loader2 className="w-3 h-3 text-white animate-spin" />}
            {s === "error"  && <X className="w-3 h-3 text-white" />}
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-0.5 ${s === "done" ? "bg-emerald-400" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
//  메인 컴포넌트
// ────────────────────────────────────────────────────────────
export default function IngestPage() {
  const [tags, setTags] = useState<Tag[]>(INIT_TAGS);
  const [selected, setSelected] = useState<string>("erp");
  const [activeTab, setActiveTab] = useState<"sources" | "pdf" | "domains" | "schema">("sources");
  const [schemaSource, setSchemaSource] = useState<string>("erp");
  const [totalEvents, setTotalEvents] = useState(4820);
  const tickRef = useRef(0);

  // 실시간 센서 갱신
  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current++;
      setTags(prev => prev.map(t => ({ ...t, value: jitter(t.value, 0.012) })));
      if (tickRef.current % 3 === 0) setTotalEvents(v => v + Math.floor(Math.random() * 8 + 2));
    }, 1200);
    return () => clearInterval(id);
  }, []);

  const src = SOURCES.find(s => s.id === selected)!;
  const totalRecords = SOURCES.filter(s => s.status !== "waiting").reduce((a, s) => a + s.records, 0);
  const connectedCount = SOURCES.filter(s => s.status === "connected" || s.status === "live").length;

  return (
    <div className="p-6 space-y-5">

      {/* ── 헤더 ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">AX 전환 진행중</span>
            <span className="text-xs text-slate-400">컨설턴트 뷰</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{COMPANY.name}</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {COMPANY.biz} · {COMPANY.erp} · {COMPANY.mes}
          </p>
        </div>
        <div className="text-right text-xs text-slate-400 space-y-1">
          <div>{COMPANY.employees}명 · {COMPANY.since}</div>
          <div className="flex items-center gap-1.5 justify-end text-emerald-600">
            <Wifi className="w-3.5 h-3.5" />
            <span>{connectedCount}/6 소스 연결됨</span>
          </div>
        </div>
      </div>

      {/* ── KPI 4개 ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "연결된 소스",     value: `${connectedCount} / 6`,     icon: Database,   color: "text-blue-600 bg-blue-50" },
          { label: "총 적재 레코드",  value: totalRecords.toLocaleString(), icon: BarChart3,  color: "text-violet-600 bg-violet-50" },
          { label: "실시간 이벤트",   value: totalEvents.toLocaleString(), icon: Activity,   color: "text-emerald-600 bg-emerald-50" },
          { label: "AI 파싱 완료",    value: `${PDF_JOBS.filter(j=>j.status==="done").length} / ${PDF_JOBS.length}문서`, icon: FileText, color: "text-amber-600 bg-amber-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">{label}</span>
              <div className={`p-1.5 rounded-lg ${color}`}><Icon className="w-3.5 h-3.5" /></div>
            </div>
            <div className="text-xl font-bold text-slate-900">{value}</div>
          </div>
        ))}
      </div>

      {/* ── 탭 ── */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: "sources",  label: "데이터 소스 연결" },
          { id: "pdf",      label: "비정형 AI 파싱" },
          { id: "domains",  label: "10M 도메인 분류 결과" },
          { id: "schema",   label: "연결 테이블 설계" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as typeof activeTab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════
          TAB 1: 데이터 소스 연결
      ══════════════════════════════════ */}
      {activeTab === "sources" && (
        <div className="grid grid-cols-5 gap-5">

          {/* 소스 카드 목록 */}
          <div className="col-span-2 space-y-2">
            {SOURCES.map(s => {
              const cfg = STATUS_CONF[s.status];
              const Icon = TYPE_ICON[s.type];
              const isSelected = selected === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelected(s.id)}
                  className={`w-full text-left rounded-xl border p-3.5 transition-all ${
                    isSelected
                      ? "border-blue-400 bg-blue-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${isSelected ? "bg-blue-100" : "bg-slate-100"}`}>
                        <Icon className={`w-4 h-4 ${isSelected ? "text-blue-600" : "text-slate-500"}`} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{s.name}</div>
                        <div className="text-xs text-slate-400">{s.protocol}</div>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </div>
                  </div>
                  <StepBar steps={s.steps} />
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-1 flex-wrap">
                      {s.domains.slice(0, 3).map(d => (
                        <span key={d} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{d}</span>
                      ))}
                      {s.domains.length > 3 && <span className="text-xs text-slate-400">+{s.domains.length - 3}</span>}
                    </div>
                    {s.issues && <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 상세 패널 */}
          <div className="col-span-3 space-y-4">

            {/* 선택된 소스 상세 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">{src.name} — 연결 상세</h3>
                <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${STATUS_CONF[src.status].bg} ${STATUS_CONF[src.status].text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONF[src.status].dot}`} />
                  {STATUS_CONF[src.status].label}
                </div>
              </div>

              {/* 4단계 상세 */}
              <div className="grid grid-cols-4 gap-2 mb-5">
                {STEP_LABELS.map((label, i) => {
                  const s = src.steps[i];
                  return (
                    <div key={label} className={`rounded-lg p-3 border text-center ${
                      s === "done"   ? "bg-emerald-50 border-emerald-200" :
                      s === "active" ? "bg-blue-50 border-blue-200" :
                      s === "error"  ? "bg-rose-50 border-rose-200" :
                                       "bg-slate-50 border-slate-100"
                    }`}>
                      <div className="flex items-center justify-center mb-1.5">
                        {s === "done"   && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                        {s === "active" && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                        {s === "error"  && <X className="w-5 h-5 text-rose-500" />}
                        {s === "wait"   && <Clock className="w-5 h-5 text-slate-300" />}
                      </div>
                      <div className={`text-xs font-medium ${
                        s === "done" ? "text-emerald-700" :
                        s === "active" ? "text-blue-700" :
                        s === "error" ? "text-rose-700" : "text-slate-400"
                      }`}>{label}</div>
                    </div>
                  );
                })}
              </div>

              {/* 소스 메타 */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                {[
                  ["시스템", src.system],
                  ["프로토콜", src.protocol],
                  ["마지막 동기화", src.lastSync],
                  ["적재량", src.records > 0 ? `${src.records.toLocaleString()} ${src.unit}` : src.status === "live" ? `실시간 스트리밍` : "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400">{k}</span>
                    <span className="font-medium text-slate-700">{v}</span>
                  </div>
                ))}
              </div>

              {src.issues && (
                <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-700 mb-0.5">발견된 이슈</p>
                    <p className="text-xs text-amber-600">{src.issues}</p>
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                {src.status === "waiting" ? (
                  <button className="flex items-center gap-1.5 bg-blue-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    <Wifi className="w-3.5 h-3.5" /> 연결 설정
                  </button>
                ) : (
                  <button className="flex items-center gap-1.5 bg-slate-100 text-slate-600 text-xs px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" /> 재동기화
                  </button>
                )}
                <button className="flex items-center gap-1.5 border border-slate-200 text-slate-500 text-xs px-4 py-2 rounded-lg hover:border-slate-300 transition-colors">
                  <Eye className="w-3.5 h-3.5" /> 데이터 미리보기
                </button>
              </div>
            </div>

            {/* 실시간 센서 (OPC-UA / Modbus일 때) */}
            {(src.id === "opcua" || src.id === "modbus") && (
              <div className="bg-slate-900 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    실시간 태그 스트림
                  </h4>
                  <span className="text-xs text-slate-500">1.2s 갱신</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {tags.filter(t =>
                    src.id === "modbus"
                      ? t.node.startsWith("PRESS")
                      : t.node.startsWith("CNC")
                  ).map(tag => {
                    const pct = Math.min(100, ((tag.value - tag.min) / (tag.max - tag.min)) * 100);
                    const inRange = tag.value >= tag.normal[0] && tag.value <= tag.normal[1];
                    return (
                      <div key={tag.id} className="bg-slate-800 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-400">{tag.label}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                            tag.quality === "GOOD"
                              ? inRange ? "text-emerald-400" : "text-amber-400"
                              : "text-rose-400"
                          }`}>{tag.quality}</span>
                        </div>
                        <div className="flex items-end gap-1.5 mb-1.5">
                          <span className={`text-lg font-bold font-mono ${
                            inRange ? "text-white" : "text-amber-400"
                          }`}>{tag.value}</span>
                          <span className="text-xs text-slate-500 mb-0.5">{tag.unit}</span>
                        </div>
                        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${inRange ? "bg-emerald-400" : "bg-amber-400"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-xs text-slate-600 mt-1 font-mono truncate">{tag.node}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          TAB 2: 비정형 AI 파싱
      ══════════════════════════════════ */}
      {activeTab === "pdf" && (
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">AI 파싱 진행 중</p>
                <p className="text-xs text-amber-600 mt-0.5">검사성적서 이미지 42건 — 표 구조 불규칙으로 AI 재파싱 적용. 완료 예상 약 8분.</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">파싱 작업 목록</h3>
                <span className="text-xs text-slate-400">{PDF_JOBS.filter(j=>j.status==="done").length}/{PDF_JOBS.length} 완료</span>
              </div>
              <div className="divide-y divide-slate-50">
                {PDF_JOBS.map((job, i) => (
                  <div key={i} className="px-4 py-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      job.status === "done" ? "bg-emerald-100" : "bg-amber-100"
                    }`}>
                      {job.status === "done"
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        : <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-700 truncate">{job.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {job.pages}페이지 · 추출됨 {job.extracted}페이지 · 표 {job.tables}개
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      job.status === "done"
                        ? "text-emerald-700 bg-emerald-50"
                        : "text-amber-700 bg-amber-50"
                    }`}>
                      {job.status === "done" ? "완료" : "파싱 중"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI 파싱 결과 예시 */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">AI 추출 결과 예시</h4>
              <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs">
                <div className="text-slate-500 mb-2">{"// 작업표준서_CNC가공_v3.pdf — p.14"}</div>
                <div className="text-emerald-400">{`{`}</div>
                <div className="text-blue-300 pl-3">{`"proc_cd": "CNC-M001",`}</div>
                <div className="text-blue-300 pl-3">{`"proc_nm": "황삭 가공",`}</div>
                <div className="text-blue-300 pl-3">{`"spindle_rpm": 1500,`}</div>
                <div className="text-blue-300 pl-3">{`"feed_rate": 800,`}</div>
                <div className="text-blue-300 pl-3">{`"tolerance": "±0.05mm",`}</div>
                <div className="text-amber-400 pl-3">{`"domain": "Process",`}</div>
                <div className="text-emerald-300 pl-3">{`"confidence": 0.92`}</div>
                <div className="text-emerald-400">{`}`}</div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Process 도메인 자동 분류 · 신뢰도 92%
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">파싱 요약</h4>
              <div className="space-y-2 text-sm">
                {[
                  ["총 문서", `${PDF_JOBS.length}건`],
                  ["총 페이지", `${PDF_JOBS.reduce((a,j)=>a+j.pages,0)}p`],
                  ["추출 성공", `${PDF_JOBS.reduce((a,j)=>a+j.extracted,0)}p`],
                  ["표 구조 추출", `${PDF_JOBS.reduce((a,j)=>a+j.tables,0)}개`],
                  ["Process 매핑", "18건"],
                  ["Measurement 매핑", "12건"],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between text-xs">
                    <span className="text-slate-400">{k}</span>
                    <span className="font-semibold text-slate-700">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          TAB 4: 연결 테이블 설계
      ══════════════════════════════════ */}
      {activeTab === "schema" && (
        <SchemaTab selected={schemaSource} onSelect={setSchemaSource} />
      )}

      {/* ══════════════════════════════════
          TAB 3: 10M 도메인 분류 결과
      ══════════════════════════════════ */}
      {activeTab === "domains" && (
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-900">10M 마스터 도메인 적재 현황</h3>
              <span className="text-xs text-slate-400">총 {DOMAIN_RESULT.reduce((a,d)=>a+d.records,0).toLocaleString()} 레코드</span>
            </div>
            <div className="space-y-3">
              {DOMAIN_RESULT.map(d => (
                <div key={d.domain} className="flex items-center gap-4">
                  <span className="text-sm text-slate-600 w-28 shrink-0">{d.domain}</span>
                  <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden">
                    <div
                      className={`h-full ${d.color} rounded-lg flex items-center justify-end pr-2 transition-all duration-500`}
                      style={{ width: `${Math.max(d.pct, 2)}%` }}
                    >
                      {d.pct >= 8 && (
                        <span className="text-xs font-bold text-white">{d.records.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  {d.pct < 8 && (
                    <span className="text-xs font-semibold text-slate-600 w-20 text-right">{d.records.toLocaleString()}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 분류 인사이트 */}
          <div className="space-y-4">
            <div className="bg-blue-600 rounded-xl p-4 text-white">
              <h4 className="text-sm font-bold mb-3">컨설턴트 진단</h4>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-3.5 h-3.5 mt-0.5 text-blue-200 shrink-0" />
                  <p className="text-blue-100">Machine·Measurement 도메인이 전체 99%를 차지 — 설비 데이터 집중형 구조</p>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-amber-300 shrink-0" />
                  <p className="text-blue-100">Customer·Product 데이터 절대 부족 — ERP에서 추가 테이블 연결 필요</p>
                </div>
                <div className="flex items-start gap-2">
                  <Package className="w-3.5 h-3.5 mt-0.5 text-green-300 shrink-0" />
                  <p className="text-blue-100">BOM 데이터 18,400건 — LLM이 공정-자재 연계 분석 가능한 최소 임계치 충족</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">다음 액션</h4>
              <div className="space-y-1.5">
                {[
                  { label: "Schema Mapping",   sub: "14건 컬럼 표준화 대기", href: "/schema-mapping" },
                  { label: "Data Cleaner",     sub: "단위 혼재 3종 정제",    href: "/data-cleaner" },
                  { label: "Ontology Mapping", sub: "25건 미매핑 처리",      href: "/ontology-mapping" },
                  { label: "AX Chat 검증",    sub: "LLM 질의로 확인",       href: "/ax-chat" },
                ].map(({ label, sub, href }) => (
                  <a key={href} href={href} className="flex items-center justify-between py-2 border-b border-slate-100 hover:bg-slate-50 px-1 rounded transition-colors group">
                    <div>
                      <div className="text-xs font-medium text-slate-700 group-hover:text-blue-600">{label}</div>
                      <div className="text-xs text-slate-400">{sub}</div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ────────────────────────────────────────────────────────────
//  연결 테이블 설계 — 데이터 정의
// ────────────────────────────────────────────────────────────
type ColKind = "PK" | "FK" | "IDX" | "";
interface ColDef { name: string; type: string; nullable: boolean; kind: ColKind; desc: string; sample: string; domain?: string; }
interface TableDef { name: string; layer: "RAW" | "STAGING" | "CANONICAL"; desc: string; cols: ColDef[]; }
interface SourceSchema { id: string; label: string; color: string; system: string; connType: string; connDetail: string; tables: TableDef[]; }

const SCHEMA_SOURCES: SourceSchema[] = [
  {
    id: "erp", label: "더존 iCUBE ERP", color: "blue", system: "Oracle 19c",
    connType: "JDBC", connDetail: "jdbc:oracle:thin:@192.168.10.5:1521:ERPDB",
    tables: [
      { name: "raw_erp_material", layer: "RAW", desc: "자재 마스터 — 원자재·부품·반제품 기준 정보",
        cols: [
          { name: "raw_id",      type: "BIGINT",        nullable: false, kind: "PK",  desc: "RAW 적재 고유키",       sample: "1001",                     domain: "" },
          { name: "mat_cd",      type: "VARCHAR(20)",   nullable: false, kind: "IDX", desc: "더존 자재코드",          sample: "AL6061-T6",                 domain: "Material.mat_cd" },
          { name: "mat_nm",      type: "VARCHAR(100)",  nullable: false, kind: "",    desc: "자재명",                sample: "알루미늄 합금 봉재",          domain: "Material.mat_nm" },
          { name: "mat_spec",    type: "VARCHAR(200)",  nullable: true,  kind: "",    desc: "자재 규격",              sample: "Ø50×L3000",                 domain: "Material.spec" },
          { name: "unit_cd",     type: "VARCHAR(10)",   nullable: false, kind: "",    desc: "단위코드",               sample: "EA",                        domain: "Material.unit" },
          { name: "std_qty",     type: "DECIMAL(15,3)", nullable: true,  kind: "",    desc: "표준 수량",              sample: "100.000",                   domain: "" },
          { name: "safe_qty",    type: "DECIMAL(15,3)", nullable: true,  kind: "",    desc: "안전 재고",              sample: "300.000",                   domain: "" },
          { name: "supplier_cd", type: "VARCHAR(20)",   nullable: true,  kind: "FK",  desc: "주 공급처 코드",         sample: "SUP-001",                   domain: "Supplier.sup_cd" },
          { name: "ingested_at", type: "TIMESTAMP",     nullable: false, kind: "",    desc: "DOP 적재 일시",         sample: "2026-06-18 14:23:00",       domain: "" },
          { name: "src_updated", type: "TIMESTAMP",     nullable: true,  kind: "",    desc: "ERP 원본 수정 일시",    sample: "2026-06-17 09:11:00",       domain: "" },
        ],
      },
      { name: "raw_erp_order", layer: "RAW", desc: "수주 마스터 — 고객사 발주·납기 기준",
        cols: [
          { name: "raw_id",      type: "BIGINT",        nullable: false, kind: "PK",  desc: "RAW 적재 고유키",   sample: "2001",                  domain: "" },
          { name: "ord_no",      type: "VARCHAR(30)",   nullable: false, kind: "IDX", desc: "수주번호",           sample: "ORD-2026-0412",         domain: "Order.ord_no" },
          { name: "ord_dt",      type: "DATE",          nullable: false, kind: "",    desc: "수주일",             sample: "2026-06-10",            domain: "Order.ord_dt" },
          { name: "due_dt",      type: "DATE",          nullable: false, kind: "",    desc: "납기일",             sample: "2026-06-21",            domain: "Order.due_dt" },
          { name: "cust_cd",     type: "VARCHAR(20)",   nullable: false, kind: "FK",  desc: "고객코드",           sample: "CUST-SAMSUNG",          domain: "Customer.cust_cd" },
          { name: "item_cd",     type: "VARCHAR(20)",   nullable: false, kind: "FK",  desc: "품목코드",           sample: "PRD-BRK-001",           domain: "Product.prod_cd" },
          { name: "ord_qty",     type: "DECIMAL(15,3)", nullable: false, kind: "",    desc: "수주 수량",          sample: "500.000",               domain: "Order.qty" },
          { name: "unit_price",  type: "DECIMAL(15,2)", nullable: true,  kind: "",    desc: "단가",               sample: "12500.00",              domain: "Order.unit_price" },
          { name: "status_cd",   type: "VARCHAR(10)",   nullable: false, kind: "",    desc: "상태 (01=접수)",     sample: "01",                    domain: "Order.status" },
          { name: "ingested_at", type: "TIMESTAMP",     nullable: false, kind: "",    desc: "DOP 적재 일시",     sample: "2026-06-18 14:23:00",   domain: "" },
        ],
      },
      { name: "raw_erp_supplier", layer: "RAW", desc: "거래처 마스터 — 협력사·공급사 기준 정보",
        cols: [
          { name: "raw_id",      type: "BIGINT",       nullable: false, kind: "PK",  desc: "RAW 적재 고유키", sample: "3001",          domain: "" },
          { name: "sup_cd",      type: "VARCHAR(20)",  nullable: false, kind: "IDX", desc: "거래처코드",       sample: "SUP-001",        domain: "Supplier.sup_cd" },
          { name: "sup_nm",      type: "VARCHAR(100)", nullable: false, kind: "",    desc: "거래처명",         sample: "㈜대성금속",      domain: "Supplier.sup_nm" },
          { name: "biz_no",      type: "CHAR(10)",     nullable: true,  kind: "",    desc: "사업자등록번호",   sample: "1234567890",     domain: "Supplier.biz_no" },
          { name: "tel",         type: "VARCHAR(20)",  nullable: true,  kind: "",    desc: "전화번호",         sample: "031-123-4567",   domain: "Supplier.tel" },
          { name: "addr",        type: "VARCHAR(200)", nullable: true,  kind: "",    desc: "주소",             sample: "경기도 안산시",  domain: "Supplier.addr" },
          { name: "grade_cd",    type: "VARCHAR(5)",   nullable: true,  kind: "",    desc: "협력사 등급",      sample: "A",              domain: "Supplier.grade" },
          { name: "ingested_at", type: "TIMESTAMP",    nullable: false, kind: "",    desc: "DOP 적재 일시",   sample: "2026-06-18 14:23:00", domain: "" },
        ],
      },
    ],
  },
  {
    id: "mes", label: "자체 MES", color: "violet", system: "MySQL 8.0",
    connType: "JDBC / CSV 배치", connDetail: "jdbc:mysql://192.168.10.10:3306/mesdb",
    tables: [
      { name: "raw_mes_work_order", layer: "RAW", desc: "작업 지시 — 공정별 생산 계획·실적",
        cols: [
          { name: "raw_id",     type: "BIGINT",        nullable: false, kind: "PK",  desc: "RAW 적재 고유키",        sample: "5001",               domain: "" },
          { name: "wo_no",      type: "VARCHAR(30)",   nullable: false, kind: "IDX", desc: "작업지시번호",            sample: "WO-2026-1842",        domain: "Process.wo_no" },
          { name: "proc_cd",    type: "VARCHAR(20)",   nullable: false, kind: "",    desc: "공정코드",                sample: "CNC-M001",            domain: "Process.proc_cd" },
          { name: "proc_nm",    type: "VARCHAR(100)",  nullable: false, kind: "",    desc: "공정명",                  sample: "황삭 가공",            domain: "Process.proc_nm" },
          { name: "equip_cd",   type: "VARCHAR(20)",   nullable: false, kind: "FK",  desc: "설비코드",                sample: "EQ-CNC-01",           domain: "Machine.equip_cd" },
          { name: "plan_qty",   type: "DECIMAL(15,3)", nullable: false, kind: "",    desc: "계획 수량",               sample: "100.000",             domain: "" },
          { name: "actual_qty", type: "DECIMAL(15,3)", nullable: true,  kind: "",    desc: "실적 수량",               sample: "98.000",              domain: "Process.actual_qty" },
          { name: "defect_qty", type: "DECIMAL(15,3)", nullable: true,  kind: "",    desc: "불량 수량",               sample: "2.000",               domain: "Measurement.defect_qty" },
          { name: "start_dt",   type: "DATETIME",      nullable: true,  kind: "",    desc: "작업 시작",               sample: "2026-06-18 08:00",    domain: "" },
          { name: "end_dt",     type: "DATETIME",      nullable: true,  kind: "",    desc: "작업 종료",               sample: "2026-06-18 12:30",    domain: "" },
          { name: "ingested_at",type: "TIMESTAMP",     nullable: false, kind: "",    desc: "DOP 적재 일시",          sample: "2026-06-18 14:23:00", domain: "" },
        ],
      },
      { name: "raw_mes_machine_log", layer: "RAW", desc: "설비 가동 로그 — 시간별 설비 상태·KPI",
        cols: [
          { name: "raw_id",      type: "BIGINT",        nullable: false, kind: "PK",  desc: "RAW 적재 고유키",         sample: "9001",               domain: "" },
          { name: "log_dt",      type: "DATETIME",      nullable: false, kind: "IDX", desc: "로그 일시 (1분 단위)",    sample: "2026-06-18 14:00",    domain: "" },
          { name: "equip_cd",    type: "VARCHAR(20)",   nullable: false, kind: "IDX", desc: "설비코드",                sample: "EQ-CNC-01",           domain: "Machine.equip_cd" },
          { name: "equip_nm",    type: "VARCHAR(100)",  nullable: true,  kind: "",    desc: "설비명",                  sample: "CNC 가공기 #1",        domain: "Machine.equip_nm" },
          { name: "status_cd",   type: "VARCHAR(5)",    nullable: false, kind: "",    desc: "가동상태 (RUN/IDLE/ERR)", sample: "RUN",                 domain: "Machine.status" },
          { name: "spindle_rpm", type: "DECIMAL(10,2)", nullable: true,  kind: "",    desc: "주축 회전수 (rpm)",       sample: "1420.00",             domain: "Machine.spindle_rpm" },
          { name: "feed_rate",   type: "DECIMAL(10,2)", nullable: true,  kind: "",    desc: "이송속도 (mm/min)",       sample: "850.00",              domain: "Machine.feed_rate" },
          { name: "utilization", type: "DECIMAL(5,2)",  nullable: true,  kind: "",    desc: "가동률 (%)",              sample: "87.50",               domain: "Machine.utilization" },
          { name: "alarm_cd",    type: "VARCHAR(20)",   nullable: true,  kind: "",    desc: "알람코드 (정상=NULL)",    sample: "NULL",                domain: "Maintenance.alarm_cd" },
          { name: "ingested_at", type: "TIMESTAMP",     nullable: false, kind: "",    desc: "DOP 적재 일시",          sample: "2026-06-18 14:23:00", domain: "" },
        ],
      },
    ],
  },
  {
    id: "sensor", label: "OPC-UA / Modbus", color: "emerald", system: "TimescaleDB (PostgreSQL 16)",
    connType: "Node-RED → Kafka → TimescaleDB", connDetail: "opc.tcp://192.168.10.20:4840  |  modbus-tcp://192.168.10.30:502",
    tables: [
      { name: "raw_sensor_tag_catalog", layer: "RAW", desc: "센서 태그 카탈로그 — OPC-UA / Modbus 태그 메타",
        cols: [
          { name: "tag_id",       type: "SERIAL",       nullable: false, kind: "PK",  desc: "태그 고유 ID",         sample: "1",                domain: "" },
          { name: "tag_path",     type: "VARCHAR(200)",  nullable: false, kind: "IDX", desc: "태그 노드 경로",       sample: "CNC-01.spindle_rpm", domain: "" },
          { name: "tag_alias",    type: "VARCHAR(100)",  nullable: true,  kind: "",    desc: "별칭",                 sample: "CNC1_주축회전수",   domain: "" },
          { name: "protocol",     type: "VARCHAR(20)",   nullable: false, kind: "",    desc: "프로토콜",              sample: "OPC-UA",            domain: "" },
          { name: "data_type",    type: "VARCHAR(20)",   nullable: false, kind: "",    desc: "OPC 데이터 타입",      sample: "Float",             domain: "" },
          { name: "eng_unit",     type: "VARCHAR(20)",   nullable: true,  kind: "",    desc: "공학 단위",             sample: "rpm",               domain: "Measurement.unit" },
          { name: "equip_cd",     type: "VARCHAR(20)",   nullable: true,  kind: "FK",  desc: "연결 설비코드",        sample: "EQ-CNC-01",         domain: "Machine.equip_cd" },
          { name: "domain_hint",  type: "VARCHAR(30)",   nullable: true,  kind: "",    desc: "10M 도메인 힌트",      sample: "Machine",           domain: "" },
          { name: "scan_rate_ms", type: "INT",           nullable: false, kind: "",    desc: "수집 주기 (ms)",       sample: "1000",              domain: "" },
          { name: "active",       type: "BOOLEAN",       nullable: false, kind: "",    desc: "수집 활성 여부",       sample: "true",              domain: "" },
        ],
      },
      { name: "raw_sensor_timeseries", layer: "RAW", desc: "센서 시계열 — TimescaleDB 하이퍼테이블 (파티션: 1일)",
        cols: [
          { name: "ts",           type: "TIMESTAMPTZ",       nullable: false, kind: "PK", desc: "타임스탬프 (UTC)",        sample: "2026-06-18 14:23:01.234", domain: "" },
          { name: "tag_id",       type: "INT",               nullable: false, kind: "PK", desc: "태그 ID (FK)",            sample: "1",                       domain: "" },
          { name: "value_num",    type: "DOUBLE PRECISION",  nullable: true,  kind: "",   desc: "수치 값",                 sample: "1420.3",                  domain: "Measurement.value" },
          { name: "value_str",    type: "VARCHAR(100)",      nullable: true,  kind: "",   desc: "문자 값 (상태 태그)",     sample: "RUN",                     domain: "" },
          { name: "quality",      type: "SMALLINT",          nullable: false, kind: "",   desc: "OPC 품질 (192=GOOD)",     sample: "192",                     domain: "" },
          { name: "kafka_offset", type: "BIGINT",            nullable: true,  kind: "",   desc: "Kafka 메시지 오프셋",     sample: "8420148",                 domain: "" },
        ],
      },
    ],
  },
  {
    id: "pdf", label: "PDF · 이미지 (비정형)", color: "amber", system: "PostgreSQL 16 + S3",
    connType: "파일 업로드 / AI OCR 파싱", connDetail: "s3://10m-dop-docs  /  AI Parser API",
    tables: [
      { name: "raw_doc_registry", layer: "RAW", desc: "문서 등록부 — 업로드된 모든 비정형 문서 메타",
        cols: [
          { name: "doc_id",       type: "BIGSERIAL",    nullable: false, kind: "PK", desc: "문서 고유 ID",        sample: "101",                    domain: "" },
          { name: "doc_nm",       type: "VARCHAR(255)", nullable: false, kind: "",   desc: "원본 파일명",          sample: "작업표준서_CNC가공_v3.pdf", domain: "" },
          { name: "doc_type",     type: "VARCHAR(30)",  nullable: false, kind: "",   desc: "문서 유형",            sample: "작업표준서",              domain: "" },
          { name: "file_ext",     type: "VARCHAR(10)",  nullable: false, kind: "",   desc: "확장자",               sample: "pdf",                    domain: "" },
          { name: "file_size",    type: "BIGINT",       nullable: false, kind: "",   desc: "파일 크기 (bytes)",   sample: "3145728",                domain: "" },
          { name: "s3_key",       type: "VARCHAR(500)", nullable: false, kind: "",   desc: "S3 오브젝트 키",      sample: "raw/2026/06/doc_101.pdf", domain: "" },
          { name: "pages",        type: "INT",          nullable: true,  kind: "",   desc: "총 페이지 수",         sample: "24",                     domain: "" },
          { name: "parse_status", type: "VARCHAR(20)",  nullable: false, kind: "",   desc: "파싱 상태",            sample: "done",                   domain: "" },
          { name: "domain_hint",  type: "VARCHAR(30)",  nullable: true,  kind: "",   desc: "추정 10M 도메인",     sample: "Process",                domain: "" },
          { name: "uploaded_at",  type: "TIMESTAMP",    nullable: false, kind: "",   desc: "업로드 일시",          sample: "2026-06-18 09:00:00",    domain: "" },
        ],
      },
      { name: "raw_doc_content", layer: "RAW", desc: "AI 파싱 결과 — 페이지·표·텍스트 단위 추출 내용",
        cols: [
          { name: "content_id",   type: "BIGSERIAL",    nullable: false, kind: "PK", desc: "콘텐츠 고유 ID",       sample: "5001",                        domain: "" },
          { name: "doc_id",       type: "BIGINT",       nullable: false, kind: "FK", desc: "문서 ID",              sample: "101",                         domain: "" },
          { name: "page_no",      type: "INT",          nullable: false, kind: "",   desc: "페이지 번호",           sample: "14",                          domain: "" },
          { name: "content_type", type: "VARCHAR(20)",  nullable: false, kind: "",   desc: "콘텐츠 유형 (text/table/image)", sample: "table",           domain: "" },
          { name: "raw_text",     type: "TEXT",         nullable: true,  kind: "",   desc: "추출된 원본 텍스트",   sample: "공정: 황삭 가공...",           domain: "" },
          { name: "parsed_json",  type: "JSONB",        nullable: true,  kind: "",   desc: "구조화된 파싱 결과",   sample: `{"proc_cd":"CNC-M001"}`,      domain: "" },
          { name: "confidence",   type: "DECIMAL(4,3)", nullable: true,  kind: "",   desc: "AI 신뢰도 (0~1)",      sample: "0.920",                       domain: "" },
          { name: "domain_map",   type: "VARCHAR(30)",  nullable: true,  kind: "",   desc: "10M 도메인 분류",      sample: "Process",                     domain: "" },
          { name: "embed_vector", type: "vector(1536)", nullable: true,  kind: "",   desc: "임베딩 벡터 (pgvector)", sample: "[0.021, ...]",              domain: "" },
          { name: "parsed_at",    type: "TIMESTAMP",    nullable: false, kind: "",   desc: "파싱 완료 일시",       sample: "2026-06-18 09:45:00",         domain: "" },
        ],
      },
    ],
  },
  {
    id: "kakao", label: "카카오톡 발주 메시지", color: "yellow", system: "PostgreSQL 16",
    connType: "카카오 Open API → 웹훅", connDetail: "https://kapi.kakao.com/v1/biz/message  (API 키 미설정)",
    tables: [
      { name: "raw_msg_order", layer: "RAW", desc: "카카오톡 발주 메시지 원문 — 비정형 텍스트 발주",
        cols: [
          { name: "msg_id",        type: "BIGSERIAL",    nullable: false, kind: "PK", desc: "메시지 고유 ID",      sample: "7001",                   domain: "" },
          { name: "channel_id",    type: "VARCHAR(50)",  nullable: false, kind: "",   desc: "카카오 비즈채널 ID", sample: "CH-HKPM-001",            domain: "" },
          { name: "sender_id",     type: "VARCHAR(50)",  nullable: false, kind: "",   desc: "발신자 ID",           sample: "user_samsung_buyer01",   domain: "" },
          { name: "sender_nm",     type: "VARCHAR(100)", nullable: true,  kind: "",   desc: "발신자명",             sample: "삼성전자 구매1팀 이대리", domain: "Customer.contact" },
          { name: "raw_text",      type: "TEXT",         nullable: false, kind: "",   desc: "메시지 원문",          sample: "브라켓 500EA 6/21까지...", domain: "" },
          { name: "sent_at",       type: "TIMESTAMP",    nullable: false, kind: "",   desc: "메시지 발송 시각",    sample: "2026-06-18 10:15:32",    domain: "" },
          { name: "parse_status",  type: "VARCHAR(20)",  nullable: false, kind: "",   desc: "AI 파싱 상태",         sample: "pending",                domain: "" },
          { name: "parsed_ord_no", type: "VARCHAR(30)",  nullable: true,  kind: "",   desc: "파싱된 수주번호",      sample: "NULL (미파싱)",           domain: "Order.ord_no" },
          { name: "parsed_qty",    type: "DECIMAL(15,3)",nullable: true,  kind: "",   desc: "파싱된 수량",          sample: "NULL (미파싱)",           domain: "Order.qty" },
          { name: "ingested_at",   type: "TIMESTAMP",    nullable: false, kind: "",   desc: "DOP 적재 일시",       sample: "(API 미연결)",            domain: "" },
        ],
      },
    ],
  },
  // ── 10M 캐노니컬 도메인 테이블 ──────────────────────────────
  {
    id: "10m", label: "10M 표준 도메인 (Canonical)", color: "indigo", system: "PostgreSQL 16 (10M Ontology DB)",
    connType: "내부 표준화 레이어 (RAW → CANONICAL)", connDetail: "schema: dop_canonical  /  host: 192.168.10.50:5432",
    tables: [
      // ── 1. Material ──────────────────────────────────────────
      { name: "canon_material", layer: "CANONICAL", desc: "자재 마스터 — 원자재·부품·반제품·소모품 표준화 기준",
        cols: [
          { name: "mat_id",       type: "BIGSERIAL",     nullable: false, kind: "PK",  desc: "10M 내부 자재 고유키",        sample: "10001",          domain: "" },
          { name: "mat_cd",       type: "VARCHAR(30)",   nullable: false, kind: "IDX", desc: "표준 자재코드 (DOP 정규화)",  sample: "MAT-AL6061-T6",  domain: "" },
          { name: "mat_nm",       type: "VARCHAR(200)",  nullable: false, kind: "",    desc: "표준 자재명",                 sample: "알루미늄 합금 봉재 AL6061-T6", domain: "" },
          { name: "mat_type_cd",  type: "VARCHAR(20)",   nullable: false, kind: "",    desc: "자재 유형 (RAW/SEMI/PROD/CONS)", sample: "RAW",          domain: "" },
          { name: "spec",         type: "VARCHAR(300)",  nullable: true,  kind: "",    desc: "표준 규격",                   sample: "Ø50×L3000 mm",   domain: "" },
          { name: "unit_cd",      type: "VARCHAR(10)",   nullable: false, kind: "",    desc: "표준 단위 (ISO 80000 기반)",  sample: "EA",             domain: "" },
          { name: "weight_kg",    type: "DECIMAL(15,4)", nullable: true,  kind: "",    desc: "단위 중량 (kg)",              sample: "0.2850",         domain: "" },
          { name: "safe_stock",   type: "DECIMAL(15,3)", nullable: true,  kind: "",    desc: "안전 재고량",                 sample: "300.000",        domain: "" },
          { name: "lead_day",     type: "INT",           nullable: true,  kind: "",    desc: "조달 리드타임 (일)",          sample: "14",             domain: "" },
          { name: "main_sup_id",  type: "BIGINT",        nullable: true,  kind: "FK",  desc: "주 공급처 ID → canon_supplier", sample: "20001",        domain: "" },
          { name: "hazmat_yn",    type: "BOOLEAN",       nullable: false, kind: "",    desc: "위험물 여부",                 sample: "false",          domain: "" },
          { name: "src_system",   type: "VARCHAR(30)",   nullable: false, kind: "",    desc: "원천 시스템",                 sample: "더존_ERP",       domain: "" },
          { name: "src_key",      type: "VARCHAR(50)",   nullable: false, kind: "",    desc: "원천 시스템 원본키",          sample: "AL6061-T6",      domain: "" },
          { name: "created_at",   type: "TIMESTAMP",     nullable: false, kind: "",    desc: "최초 생성 일시",              sample: "2026-06-18 14:23:00", domain: "" },
          { name: "updated_at",   type: "TIMESTAMP",     nullable: false, kind: "",    desc: "마지막 수정 일시",            sample: "2026-06-18 14:23:00", domain: "" },
        ],
      },
      // ── 2. Product ───────────────────────────────────────────
      { name: "canon_product", layer: "CANONICAL", desc: "제품 마스터 — 완제품·반제품 표준화 기준",
        cols: [
          { name: "prod_id",      type: "BIGSERIAL",     nullable: false, kind: "PK",  desc: "10M 내부 제품 고유키",        sample: "11001",          domain: "" },
          { name: "prod_cd",      type: "VARCHAR(30)",   nullable: false, kind: "IDX", desc: "표준 품목코드",               sample: "PRD-BRK-001",    domain: "" },
          { name: "prod_nm",      type: "VARCHAR(200)",  nullable: false, kind: "",    desc: "표준 제품명",                 sample: "브레이크 브라켓 A형", domain: "" },
          { name: "prod_type_cd", type: "VARCHAR(20)",   nullable: false, kind: "",    desc: "제품 유형 (FG/WIP)",          sample: "FG",             domain: "" },
          { name: "spec",         type: "VARCHAR(300)",  nullable: true,  kind: "",    desc: "제품 규격",                   sample: "L120×W80×H35 mm", domain: "" },
          { name: "unit_cd",      type: "VARCHAR(10)",   nullable: false, kind: "",    desc: "표준 단위",                   sample: "EA",             domain: "" },
          { name: "unit_price",   type: "DECIMAL(15,2)", nullable: true,  kind: "",    desc: "표준 단가 (원)",              sample: "12500.00",       domain: "" },
          { name: "customer_id",  type: "BIGINT",        nullable: true,  kind: "FK",  desc: "주 고객사 ID → canon_customer", sample: "30001",        domain: "" },
          { name: "drawing_no",   type: "VARCHAR(50)",   nullable: true,  kind: "",    desc: "도면 번호",                   sample: "DRW-BRK-001-v3", domain: "" },
          { name: "revision",     type: "VARCHAR(10)",   nullable: true,  kind: "",    desc: "개정 차수",                   sample: "v3",             domain: "" },
          { name: "src_system",   type: "VARCHAR(30)",   nullable: false, kind: "",    desc: "원천 시스템",                 sample: "더존_ERP",       domain: "" },
          { name: "src_key",      type: "VARCHAR(50)",   nullable: false, kind: "",    desc: "원천 원본키",                 sample: "PRD-BRK-001",    domain: "" },
          { name: "created_at",   type: "TIMESTAMP",     nullable: false, kind: "",    desc: "생성 일시",                   sample: "2026-06-18 14:23:00", domain: "" },
          { name: "updated_at",   type: "TIMESTAMP",     nullable: false, kind: "",    desc: "수정 일시",                   sample: "2026-06-18 14:23:00", domain: "" },
        ],
      },
      // ── 3. Customer ──────────────────────────────────────────
      { name: "canon_customer", layer: "CANONICAL", desc: "고객 마스터 — 납품처·발주처 표준화 기준",
        cols: [
          { name: "cust_id",      type: "BIGSERIAL",     nullable: false, kind: "PK",  desc: "10M 내부 고객 고유키",        sample: "30001",          domain: "" },
          { name: "cust_cd",      type: "VARCHAR(30)",   nullable: false, kind: "IDX", desc: "표준 고객코드",               sample: "CUST-SAMSUNG",   domain: "" },
          { name: "cust_nm",      type: "VARCHAR(200)",  nullable: false, kind: "IDX", desc: "표준 고객명 (엔티티 정규화)", sample: "삼성전자㈜",     domain: "" },
          { name: "biz_no",       type: "CHAR(10)",      nullable: true,  kind: "IDX", desc: "사업자등록번호 (중복 제거키)", sample: "1248100998",    domain: "" },
          { name: "cust_type_cd", type: "VARCHAR(10)",   nullable: false, kind: "",    desc: "고객 유형 (OEM/TIER1/DIST)", sample: "OEM",            domain: "" },
          { name: "rep_nm",       type: "VARCHAR(100)",  nullable: true,  kind: "",    desc: "대표자명",                    sample: "한종희",         domain: "" },
          { name: "contact_nm",   type: "VARCHAR(100)",  nullable: true,  kind: "",    desc: "담당자명",                    sample: "이대리",         domain: "" },
          { name: "contact_tel",  type: "VARCHAR(30)",   nullable: true,  kind: "",    desc: "담당자 연락처",               sample: "010-1234-5678",  domain: "" },
          { name: "addr",         type: "VARCHAR(300)",  nullable: true,  kind: "",    desc: "본사 주소",                   sample: "경기도 수원시…", domain: "" },
          { name: "credit_grade", type: "VARCHAR(5)",    nullable: true,  kind: "",    desc: "신용 등급",                   sample: "AA",             domain: "" },
          { name: "src_system",   type: "VARCHAR(30)",   nullable: false, kind: "",    desc: "원천 시스템",                 sample: "더존_ERP",       domain: "" },
          { name: "src_key",      type: "VARCHAR(50)",   nullable: false, kind: "",    desc: "원천 원본키",                 sample: "CUST-SAMSUNG",   domain: "" },
          { name: "created_at",   type: "TIMESTAMP",     nullable: false, kind: "",    desc: "생성 일시",                   sample: "2026-06-18 14:23:00", domain: "" },
          { name: "updated_at",   type: "TIMESTAMP",     nullable: false, kind: "",    desc: "수정 일시",                   sample: "2026-06-18 14:23:00", domain: "" },
        ],
      },
      // ── 4. Supplier ──────────────────────────────────────────
      { name: "canon_supplier", layer: "CANONICAL", desc: "공급사 마스터 — 원자재·부품 공급 협력사 표준화 기준",
        cols: [
          { name: "sup_id",       type: "BIGSERIAL",     nullable: false, kind: "PK",  desc: "10M 내부 공급사 고유키",      sample: "20001",          domain: "" },
          { name: "sup_cd",       type: "VARCHAR(30)",   nullable: false, kind: "IDX", desc: "표준 공급사코드",             sample: "SUP-DAESUNG",    domain: "" },
          { name: "sup_nm",       type: "VARCHAR(200)",  nullable: false, kind: "IDX", desc: "표준 공급사명",               sample: "㈜대성금속",     domain: "" },
          { name: "biz_no",       type: "CHAR(10)",      nullable: true,  kind: "IDX", desc: "사업자등록번호",              sample: "2208700123",     domain: "" },
          { name: "sup_type_cd",  type: "VARCHAR(10)",   nullable: false, kind: "",    desc: "공급사 유형 (RAW/PART/SVC)", sample: "RAW",            domain: "" },
          { name: "grade_cd",     type: "VARCHAR(5)",    nullable: true,  kind: "",    desc: "협력사 등급 (A/B/C)",         sample: "A",              domain: "" },
          { name: "lead_day",     type: "INT",           nullable: true,  kind: "",    desc: "평균 납기 리드타임 (일)",     sample: "21",             domain: "" },
          { name: "defect_rate",  type: "DECIMAL(5,3)",  nullable: true,  kind: "",    desc: "최근 불량률 (%)",             sample: "0.420",          domain: "" },
          { name: "on_time_rate", type: "DECIMAL(5,2)",  nullable: true,  kind: "",    desc: "납기 준수율 (%)",             sample: "96.80",          domain: "" },
          { name: "contact_tel",  type: "VARCHAR(30)",   nullable: true,  kind: "",    desc: "담당자 연락처",               sample: "031-123-4567",   domain: "" },
          { name: "addr",         type: "VARCHAR(300)",  nullable: true,  kind: "",    desc: "공장 주소",                   sample: "경기도 안산시…", domain: "" },
          { name: "src_system",   type: "VARCHAR(30)",   nullable: false, kind: "",    desc: "원천 시스템",                 sample: "더존_ERP",       domain: "" },
          { name: "src_key",      type: "VARCHAR(50)",   nullable: false, kind: "",    desc: "원천 원본키",                 sample: "SUP-001",        domain: "" },
          { name: "created_at",   type: "TIMESTAMP",     nullable: false, kind: "",    desc: "생성 일시",                   sample: "2026-06-18 14:23:00", domain: "" },
          { name: "updated_at",   type: "TIMESTAMP",     nullable: false, kind: "",    desc: "수정 일시",                   sample: "2026-06-18 14:23:00", domain: "" },
        ],
      },
      // ── 5. Order ─────────────────────────────────────────────
      { name: "canon_order", layer: "CANONICAL", desc: "수주·발주 마스터 — 영업 수주 / 구매 발주 통합 기준",
        cols: [
          { name: "ord_id",       type: "BIGSERIAL",     nullable: false, kind: "PK",  desc: "10M 내부 주문 고유키",        sample: "40001",          domain: "" },
          { name: "ord_no",       type: "VARCHAR(40)",   nullable: false, kind: "IDX", desc: "표준 주문번호",               sample: "ORD-2026-0412",  domain: "" },
          { name: "ord_type_cd",  type: "VARCHAR(10)",   nullable: false, kind: "",    desc: "주문 유형 (SO=수주/PO=발주)", sample: "SO",             domain: "" },
          { name: "ord_dt",       type: "DATE",          nullable: false, kind: "IDX", desc: "주문일",                      sample: "2026-06-10",     domain: "" },
          { name: "due_dt",       type: "DATE",          nullable: false, kind: "",    desc: "납기일",                      sample: "2026-06-21",     domain: "" },
          { name: "cust_id",      type: "BIGINT",        nullable: true,  kind: "FK",  desc: "고객 ID → canon_customer",    sample: "30001",          domain: "" },
          { name: "sup_id",       type: "BIGINT",        nullable: true,  kind: "FK",  desc: "공급사 ID → canon_supplier",  sample: "NULL (SO일 때)", domain: "" },
          { name: "prod_id",      type: "BIGINT",        nullable: true,  kind: "FK",  desc: "제품 ID → canon_product",     sample: "11001",          domain: "" },
          { name: "mat_id",       type: "BIGINT",        nullable: true,  kind: "FK",  desc: "자재 ID → canon_material",    sample: "NULL (SO일 때)", domain: "" },
          { name: "qty",          type: "DECIMAL(15,3)", nullable: false, kind: "",    desc: "주문 수량",                   sample: "500.000",        domain: "" },
          { name: "unit_cd",      type: "VARCHAR(10)",   nullable: false, kind: "",    desc: "단위",                        sample: "EA",             domain: "" },
          { name: "unit_price",   type: "DECIMAL(15,2)", nullable: true,  kind: "",    desc: "단가 (원)",                   sample: "12500.00",       domain: "" },
          { name: "status_cd",    type: "VARCHAR(10)",   nullable: false, kind: "",    desc: "주문 상태 (접수/생산/완료)",  sample: "생산중",         domain: "" },
          { name: "delay_risk",   type: "DECIMAL(5,3)",  nullable: true,  kind: "",    desc: "납기 지연 위험도 (AI 산출)", sample: "0.340",          domain: "" },
          { name: "src_system",   type: "VARCHAR(30)",   nullable: false, kind: "",    desc: "원천 시스템",                 sample: "더존_ERP",       domain: "" },
          { name: "src_key",      type: "VARCHAR(50)",   nullable: false, kind: "",    desc: "원천 원본키",                 sample: "ORD-2026-0412",  domain: "" },
          { name: "created_at",   type: "TIMESTAMP",     nullable: false, kind: "",    desc: "생성 일시",                   sample: "2026-06-18 14:23:00", domain: "" },
          { name: "updated_at",   type: "TIMESTAMP",     nullable: false, kind: "",    desc: "수정 일시",                   sample: "2026-06-18 14:23:00", domain: "" },
        ],
      },
      // ── 6. BOM ───────────────────────────────────────────────
      { name: "canon_bom", layer: "CANONICAL", desc: "자재 명세서 — 제품-자재 계층 구조 (다단계 BOM)",
        cols: [
          { name: "bom_id",       type: "BIGSERIAL",     nullable: false, kind: "PK",  desc: "BOM 항목 고유키",             sample: "50001",          domain: "" },
          { name: "parent_id",    type: "BIGINT",        nullable: true,  kind: "FK",  desc: "상위 BOM ID (NULL=최상위)",   sample: "NULL",           domain: "" },
          { name: "prod_id",      type: "BIGINT",        nullable: false, kind: "FK",  desc: "완성품 ID → canon_product",   sample: "11001",          domain: "" },
          { name: "child_mat_id", type: "BIGINT",        nullable: true,  kind: "FK",  desc: "하위 자재 ID → canon_material", sample: "10001",        domain: "" },
          { name: "child_prod_id",type: "BIGINT",        nullable: true,  kind: "FK",  desc: "하위 반제품 ID → canon_product (WIP)", sample: "NULL", domain: "" },
          { name: "level_no",     type: "SMALLINT",      nullable: false, kind: "",    desc: "BOM 레벨 (1=직속 구성품)",   sample: "1",              domain: "" },
          { name: "qty_per",      type: "DECIMAL(15,4)", nullable: false, kind: "",    desc: "모품목 1개당 소요량",         sample: "2.0000",         domain: "" },
          { name: "unit_cd",      type: "VARCHAR(10)",   nullable: false, kind: "",    desc: "소요량 단위",                 sample: "EA",             domain: "" },
          { name: "scrap_rate",   type: "DECIMAL(5,4)",  nullable: true,  kind: "",    desc: "손실률 (0~1)",                sample: "0.0200",         domain: "" },
          { name: "eff_from",     type: "DATE",          nullable: false, kind: "",    desc: "적용 시작일",                 sample: "2026-01-01",     domain: "" },
          { name: "eff_to",       type: "DATE",          nullable: true,  kind: "",    desc: "적용 종료일 (NULL=현행)",     sample: "NULL",           domain: "" },
          { name: "src_system",   type: "VARCHAR(30)",   nullable: false, kind: "",    desc: "원천 시스템",                 sample: "더존_ERP",       domain: "" },
          { name: "created_at",   type: "TIMESTAMP",     nullable: false, kind: "",    desc: "생성 일시",                   sample: "2026-06-18 14:23:00", domain: "" },
        ],
      },
      // ── 7. Process ───────────────────────────────────────────
      { name: "canon_process", layer: "CANONICAL", desc: "공정 마스터 — 제조 공정 순서·표준 작업 기준",
        cols: [
          { name: "proc_id",       type: "BIGSERIAL",     nullable: false, kind: "PK",  desc: "공정 고유키",                 sample: "60001",          domain: "" },
          { name: "proc_cd",       type: "VARCHAR(30)",   nullable: false, kind: "IDX", desc: "표준 공정코드",               sample: "CNC-M001",       domain: "" },
          { name: "proc_nm",       type: "VARCHAR(200)",  nullable: false, kind: "",    desc: "공정명",                      sample: "황삭 가공",       domain: "" },
          { name: "proc_type_cd",  type: "VARCHAR(20)",   nullable: false, kind: "",    desc: "공정 유형 (가공/조립/검사)", sample: "가공",           domain: "" },
          { name: "prod_id",       type: "BIGINT",        nullable: true,  kind: "FK",  desc: "적용 제품 ID → canon_product", sample: "11001",         domain: "" },
          { name: "seq_no",        type: "INT",           nullable: false, kind: "",    desc: "공정 순서번호",               sample: "10",             domain: "" },
          { name: "std_time_min",  type: "DECIMAL(10,2)", nullable: true,  kind: "",    desc: "표준 작업 시간 (분)",         sample: "45.00",          domain: "" },
          { name: "equip_id",      type: "BIGINT",        nullable: true,  kind: "FK",  desc: "표준 설비 ID → canon_machine", sample: "70001",         domain: "" },
          { name: "wo_no",         type: "VARCHAR(40)",   nullable: true,  kind: "",    desc: "작업지시번호",                sample: "WO-2026-1842",   domain: "" },
          { name: "plan_qty",      type: "DECIMAL(15,3)", nullable: true,  kind: "",    desc: "계획 수량",                   sample: "100.000",        domain: "" },
          { name: "actual_qty",    type: "DECIMAL(15,3)", nullable: true,  kind: "",    desc: "실적 수량",                   sample: "98.000",         domain: "" },
          { name: "start_dt",      type: "DATETIME",      nullable: true,  kind: "",    desc: "시작 일시",                   sample: "2026-06-18 08:00", domain: "" },
          { name: "end_dt",        type: "DATETIME",      nullable: true,  kind: "",    desc: "종료 일시",                   sample: "2026-06-18 12:30", domain: "" },
          { name: "src_system",    type: "VARCHAR(30)",   nullable: false, kind: "",    desc: "원천 시스템",                 sample: "자체_MES",       domain: "" },
          { name: "src_key",       type: "VARCHAR(50)",   nullable: false, kind: "",    desc: "원천 원본키",                 sample: "CNC-M001",       domain: "" },
          { name: "created_at",    type: "TIMESTAMP",     nullable: false, kind: "",    desc: "생성 일시",                   sample: "2026-06-18 14:23:00", domain: "" },
          { name: "updated_at",    type: "TIMESTAMP",     nullable: false, kind: "",    desc: "수정 일시",                   sample: "2026-06-18 14:23:00", domain: "" },
        ],
      },
      // ── 8. Machine ───────────────────────────────────────────
      { name: "canon_machine", layer: "CANONICAL", desc: "설비 마스터 — 생산 설비·CNC·프레스 표준화 기준",
        cols: [
          { name: "equip_id",      type: "BIGSERIAL",     nullable: false, kind: "PK",  desc: "설비 고유키",                 sample: "70001",             domain: "" },
          { name: "equip_cd",      type: "VARCHAR(30)",   nullable: false, kind: "IDX", desc: "표준 설비코드",               sample: "EQ-CNC-01",         domain: "" },
          { name: "equip_nm",      type: "VARCHAR(200)",  nullable: false, kind: "",    desc: "설비명",                      sample: "CNC 가공기 #1",      domain: "" },
          { name: "equip_type_cd", type: "VARCHAR(20)",   nullable: false, kind: "",    desc: "설비 유형 (CNC/PRESS/ROBOT)", sample: "CNC",               domain: "" },
          { name: "maker",         type: "VARCHAR(100)",  nullable: true,  kind: "",    desc: "제조사",                      sample: "Siemens",            domain: "" },
          { name: "model_no",      type: "VARCHAR(100)",  nullable: true,  kind: "",    desc: "모델명",                      sample: "S7-1500",            domain: "" },
          { name: "serial_no",     type: "VARCHAR(50)",   nullable: true,  kind: "",    desc: "시리얼 번호",                 sample: "SN-2019-00412",      domain: "" },
          { name: "install_dt",    type: "DATE",          nullable: true,  kind: "",    desc: "설치일",                      sample: "2019-03-15",         domain: "" },
          { name: "status_cd",     type: "VARCHAR(10)",   nullable: false, kind: "",    desc: "현재 상태 (RUN/IDLE/DOWN)",   sample: "RUN",                domain: "" },
          { name: "opc_node_id",   type: "VARCHAR(200)",  nullable: true,  kind: "",    desc: "OPC-UA 노드 경로",            sample: "CNC-01",             domain: "" },
          { name: "utilization",   type: "DECIMAL(5,2)",  nullable: true,  kind: "",    desc: "최근 30일 가동률 (%)",        sample: "87.50",              domain: "" },
          { name: "mtbf_hr",       type: "DECIMAL(10,2)", nullable: true,  kind: "",    desc: "평균 고장 간격 (시간)",       sample: "420.00",             domain: "" },
          { name: "mttr_hr",       type: "DECIMAL(10,2)", nullable: true,  kind: "",    desc: "평균 수리 시간 (시간)",       sample: "2.50",               domain: "" },
          { name: "loc_cd",        type: "VARCHAR(30)",   nullable: true,  kind: "",    desc: "설치 위치 (공장/라인)",       sample: "LINE-A",             domain: "" },
          { name: "src_system",    type: "VARCHAR(30)",   nullable: false, kind: "",    desc: "원천 시스템",                 sample: "자체_MES",           domain: "" },
          { name: "src_key",       type: "VARCHAR(50)",   nullable: false, kind: "",    desc: "원천 원본키",                 sample: "EQ-CNC-01",          domain: "" },
          { name: "created_at",    type: "TIMESTAMP",     nullable: false, kind: "",    desc: "생성 일시",                   sample: "2026-06-18 14:23:00", domain: "" },
          { name: "updated_at",    type: "TIMESTAMP",     nullable: false, kind: "",    desc: "수정 일시",                   sample: "2026-06-18 14:23:00", domain: "" },
        ],
      },
      // ── 9. Measurement ───────────────────────────────────────
      { name: "canon_measurement", layer: "CANONICAL", desc: "측정·품질 데이터 — 검사 결과·센서 측정값 표준화",
        cols: [
          { name: "meas_id",       type: "BIGSERIAL",     nullable: false, kind: "PK",  desc: "측정 고유키",                 sample: "80001",              domain: "" },
          { name: "meas_type_cd",  type: "VARCHAR(20)",   nullable: false, kind: "IDX", desc: "측정 유형 (QC/SENSOR/MES)",  sample: "SENSOR",             domain: "" },
          { name: "meas_dt",       type: "TIMESTAMPTZ",   nullable: false, kind: "IDX", desc: "측정 일시",                   sample: "2026-06-18 14:23:01", domain: "" },
          { name: "equip_id",      type: "BIGINT",        nullable: true,  kind: "FK",  desc: "설비 ID → canon_machine",     sample: "70001",              domain: "" },
          { name: "proc_id",       type: "BIGINT",        nullable: true,  kind: "FK",  desc: "공정 ID → canon_process",     sample: "60001",              domain: "" },
          { name: "prod_id",       type: "BIGINT",        nullable: true,  kind: "FK",  desc: "제품 ID → canon_product",     sample: "11001",              domain: "" },
          { name: "tag_path",      type: "VARCHAR(200)",  nullable: true,  kind: "",    desc: "센서 태그 경로 (센서 측정시)", sample: "CNC-01.spindle_rpm", domain: "" },
          { name: "item_nm",       type: "VARCHAR(100)",  nullable: false, kind: "",    desc: "측정 항목명",                 sample: "주축 회전수",         domain: "" },
          { name: "value_num",     type: "DOUBLE PRECISION", nullable: true, kind: "",  desc: "측정 수치값",                 sample: "1420.30",            domain: "" },
          { name: "value_str",     type: "VARCHAR(100)",  nullable: true,  kind: "",    desc: "측정 문자값 (판정 등)",       sample: "합격",               domain: "" },
          { name: "unit_cd",       type: "VARCHAR(20)",   nullable: true,  kind: "",    desc: "측정 단위",                   sample: "rpm",                domain: "" },
          { name: "usl",           type: "DOUBLE PRECISION", nullable: true, kind: "",  desc: "규격 상한 (USL)",             sample: "2000.0",             domain: "" },
          { name: "lsl",           type: "DOUBLE PRECISION", nullable: true, kind: "",  desc: "규격 하한 (LSL)",             sample: "800.0",              domain: "" },
          { name: "pass_yn",       type: "BOOLEAN",       nullable: true,  kind: "",    desc: "합격 여부 (NULL=미판정)",     sample: "true",               domain: "" },
          { name: "defect_cd",     type: "VARCHAR(20)",   nullable: true,  kind: "",    desc: "불량 코드 (불합격시)",        sample: "NULL",               domain: "" },
          { name: "src_system",    type: "VARCHAR(30)",   nullable: false, kind: "",    desc: "원천 시스템",                 sample: "OPC-UA",             domain: "" },
          { name: "src_key",       type: "VARCHAR(50)",   nullable: false, kind: "",    desc: "원천 원본키",                 sample: "tag_id=1 / ts=…",    domain: "" },
          { name: "created_at",    type: "TIMESTAMP",     nullable: false, kind: "",    desc: "생성 일시",                   sample: "2026-06-18 14:23:00", domain: "" },
        ],
      },
      // ── 10. Maintenance ──────────────────────────────────────
      { name: "canon_maintenance", layer: "CANONICAL", desc: "유지보수 — 예방·사후·예측 정비 이력 표준화",
        cols: [
          { name: "maint_id",      type: "BIGSERIAL",     nullable: false, kind: "PK",  desc: "정비 고유키",                 sample: "90001",              domain: "" },
          { name: "maint_type_cd", type: "VARCHAR(10)",   nullable: false, kind: "IDX", desc: "정비 유형 (PM/CM/PdM)",      sample: "CM",                 domain: "" },
          { name: "equip_id",      type: "BIGINT",        nullable: false, kind: "FK",  desc: "설비 ID → canon_machine",     sample: "70001",              domain: "" },
          { name: "occur_dt",      type: "DATETIME",      nullable: false, kind: "IDX", desc: "발생 일시",                   sample: "2026-06-18 09:32:00", domain: "" },
          { name: "complete_dt",   type: "DATETIME",      nullable: true,  kind: "",    desc: "완료 일시",                   sample: "2026-06-18 11:45:00", domain: "" },
          { name: "alarm_cd",      type: "VARCHAR(30)",   nullable: true,  kind: "",    desc: "알람 코드",                   sample: "ALM-SPINDLE-OVERHEAT", domain: "" },
          { name: "symptom",       type: "TEXT",          nullable: true,  kind: "",    desc: "증상 설명",                   sample: "주축 온도 55°C 초과", domain: "" },
          { name: "cause_cd",      type: "VARCHAR(30)",   nullable: true,  kind: "",    desc: "원인 코드 (AI 분류)",         sample: "LUBRICATION",        domain: "" },
          { name: "action_taken",  type: "TEXT",          nullable: true,  kind: "",    desc: "조치 내용",                   sample: "윤활유 교체 및 냉각 점검", domain: "" },
          { name: "parts_used",    type: "JSONB",         nullable: true,  kind: "",    desc: "사용 부품 (mat_cd·qty 배열)", sample: `[{"mat_cd":"LUB-001","qty":1}]`, domain: "" },
          { name: "down_min",      type: "INT",           nullable: true,  kind: "",    desc: "설비 다운타임 (분)",          sample: "133",                domain: "" },
          { name: "cost_krw",      type: "DECIMAL(15,2)", nullable: true,  kind: "",    desc: "정비 비용 (원)",              sample: "85000.00",           domain: "" },
          { name: "worker_nm",     type: "VARCHAR(100)",  nullable: true,  kind: "",    desc: "정비 담당자",                 sample: "박기사",              domain: "" },
          { name: "next_pm_dt",    type: "DATE",          nullable: true,  kind: "",    desc: "다음 예방 정비 예정일",       sample: "2026-09-18",         domain: "" },
          { name: "src_system",    type: "VARCHAR(30)",   nullable: false, kind: "",    desc: "원천 시스템",                 sample: "자체_MES",           domain: "" },
          { name: "src_key",       type: "VARCHAR(50)",   nullable: false, kind: "",    desc: "원천 원본키",                 sample: "MNT-2026-0892",      domain: "" },
          { name: "created_at",    type: "TIMESTAMP",     nullable: false, kind: "",    desc: "생성 일시",                   sample: "2026-06-18 14:23:00", domain: "" },
          { name: "updated_at",    type: "TIMESTAMP",     nullable: false, kind: "",    desc: "수정 일시",                   sample: "2026-06-18 14:23:00", domain: "" },
        ],
      },
    ],
  },
];

// ────────────────────────────────────────────────────────────
//  연결 테이블 설계 탭
// ────────────────────────────────────────────────────────────
const LAYER_CONF = {
  RAW:       { bg: "bg-slate-100",   text: "text-slate-600" },
  STAGING:   { bg: "bg-blue-100",    text: "text-blue-700" },
  CANONICAL: { bg: "bg-emerald-100", text: "text-emerald-700" },
};
const KIND_CONF: Record<ColKind, { label: string; bg: string; text: string }> = {
  PK:  { label: "PK",  bg: "bg-amber-100",  text: "text-amber-700" },
  FK:  { label: "FK",  bg: "bg-violet-100", text: "text-violet-700" },
  IDX: { label: "IDX", bg: "bg-blue-100",   text: "text-blue-700" },
  "":  { label: "",    bg: "",              text: "" },
};
const SRC_BTN: Record<string, string> = {
  blue:   "bg-blue-600 text-white",
  violet: "bg-violet-600 text-white",
  emerald:"bg-emerald-600 text-white",
  amber:  "bg-amber-500 text-white",
  yellow: "bg-yellow-500 text-white",
  indigo: "bg-indigo-600 text-white",
};
const SRC_BORDER: Record<string, string> = {
  blue: "border-blue-200", violet: "border-violet-200", emerald: "border-emerald-200",
  amber: "border-amber-200", yellow: "border-yellow-200", indigo: "border-indigo-200",
};

function SchemaTab({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const src = SCHEMA_SOURCES.find(s => s.id === selected)!;
  const [activeTable, setActiveTable] = useState(src.tables[0].name);

  const handleSrcChange = (id: string) => {
    onSelect(id);
    const s = SCHEMA_SOURCES.find(x => x.id === id)!;
    setActiveTable(s.tables[0].name);
  };

  const table = src.tables.find(t => t.name === activeTable) ?? src.tables[0];
  const totalCols = src.tables.reduce((a, t) => a + t.cols.length, 0);

  return (
    <div className="space-y-4">
      {/* 범례 */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-slate-400">범례:</span>
        {(["PK","FK","IDX"] as ColKind[]).map(k => (
          <span key={k} className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${KIND_CONF[k].bg} ${KIND_CONF[k].text}`}>{k}</span>
        ))}
        <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono">→ 10M 매핑</span>
        <span className="text-xs px-2 py-0.5 rounded bg-rose-50 text-rose-600 font-semibold">N = NOT NULL</span>
        <span className="ml-auto text-xs text-slate-400">선택 소스: {src.tables.length}테이블 · {totalCols}컬럼</span>
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* 소스·테이블 선택 */}
        <div className="col-span-1 space-y-3">
          <div className="space-y-1">
            {SCHEMA_SOURCES.map(s => (
              <button key={s.id} onClick={() => handleSrcChange(s.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  selected === s.id ? SRC_BTN[s.color] : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
                }`}>
                <div className="truncate">{s.label}</div>
                <div className={`text-xs font-normal mt-0.5 ${selected === s.id ? "opacity-70" : "text-slate-400"}`}>{s.tables.length}테이블</div>
              </button>
            ))}
          </div>

          <div className={`rounded-xl border ${SRC_BORDER[src.color]} p-2 space-y-1`}>
            <p className="text-xs font-bold text-slate-400 px-2 pb-1">테이블 목록</p>
            {src.tables.map(t => (
              <button key={t.name} onClick={() => setActiveTable(t.name)}
                className={`w-full text-left px-2 py-2 rounded-lg text-xs transition-all ${
                  activeTable === t.name ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}>
                <div className="font-mono font-semibold truncate">{t.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-xs px-1 rounded ${LAYER_CONF[t.layer].bg} ${LAYER_CONF[t.layer].text}`}>{t.layer}</span>
                  <span className={`text-xs ${activeTable === t.name ? "text-slate-400" : "text-slate-300"}`}>{t.cols.length}col</span>
                </div>
              </button>
            ))}
          </div>

          <div className="bg-slate-900 rounded-xl p-3 space-y-2 text-xs">
            <p className="font-bold text-slate-400">연결 정보</p>
            <div><span className="text-slate-500">시스템</span><br /><span className="text-slate-200 font-mono">{src.system}</span></div>
            <div><span className="text-slate-500">유형</span><br /><span className="text-blue-300">{src.connType}</span></div>
            <div className="pt-2 border-t border-slate-700 break-all">
              <span className="text-slate-500">DSN</span><br />
              <span className="text-emerald-400 font-mono leading-relaxed">{src.connDetail}</span>
            </div>
          </div>
        </div>

        {/* 컬럼 테이블 */}
        <div className="col-span-4 space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-slate-900 text-base">{table.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-semibold ${LAYER_CONF[table.layer].bg} ${LAYER_CONF[table.layer].text}`}>{table.layer}</span>
                </div>
                <p className="text-sm text-slate-500">{table.desc}</p>
              </div>
              <div className="text-right text-xs text-slate-400 space-y-0.5">
                <div>{table.cols.length}개 컬럼</div>
                <div className="text-rose-500 font-semibold">{table.cols.filter(c => !c.nullable).length}개 NOT NULL</div>
                <div className="text-emerald-600">{table.cols.filter(c => c.domain).length}개 10M 매핑</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-400 w-12">키</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-500">컬럼명</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-500">데이터 타입</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-slate-500 w-12">NULL</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-500">설명</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-500">샘플 값</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-500">10M 도메인 매핑</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {table.cols.map((col, i) => (
                    <tr key={col.name} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}>
                      <td className="px-3 py-2.5">
                        {col.kind && (
                          <span className={`px-1.5 py-0.5 rounded font-mono font-bold ${KIND_CONF[col.kind].bg} ${KIND_CONF[col.kind].text}`}>
                            {col.kind}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono font-semibold">
                        <span className={
                          col.kind === "PK" ? "text-amber-700" :
                          col.kind === "FK" ? "text-violet-700" : "text-slate-800"
                        }>{col.name}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded whitespace-nowrap">{col.type}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {col.nullable ? <span className="text-slate-300">Y</span> : <span className="font-bold text-rose-500">N</span>}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{col.desc}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-400 text-xs whitespace-nowrap">{col.sample}</td>
                      <td className="px-3 py-2.5">
                        {col.domain
                          ? <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-xs">{col.domain}</span>
                          : <span className="text-slate-200">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
