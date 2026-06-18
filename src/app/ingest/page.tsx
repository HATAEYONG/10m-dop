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
  const [activeTab, setActiveTab] = useState<"sources" | "pdf" | "domains">("sources");
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
