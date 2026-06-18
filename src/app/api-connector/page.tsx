"use client";

import { useState } from "react";
import {
  Plus, Play, CheckCircle2, XCircle, Clock, AlertCircle,
  Key, Globe, RefreshCw, Loader2, Lock, Unlock,
  Calendar, ArrowRight, BarChart2, FileText, GitBranch,
  ChevronDown,
} from "lucide-react";

type AuthType  = "none" | "apikey" | "oauth" | "basic";
type ConnStatus = "connected" | "error" | "pending" | "untested";
type DetailTab  = "info" | "mapping" | "logs" | "history";
type ScheduleInterval = "5m" | "30m" | "1h" | "6h" | "daily";

interface FieldMapping {
  srcField: string;
  srcType: string;
  sample: string;
  domainTarget: string;   // "Material.mat_cd" etc.
  transform: string;      // "직접 매핑" | "소문자" | "날짜 형식 변환" etc.
  mapped: boolean;
}

interface ApiLog {
  id: string;
  ts: string;
  status: number;
  method: string;
  url: string;
  respMs: number;
  records: number;
  payload: string;
}

interface SyncDay {
  date: string;   // "06/12"
  success: number;
  failed: number;
}

interface ApiEndpoint {
  id: string;
  name: string;
  company: string;
  url: string;
  method: "GET" | "POST";
  auth: AuthType;
  status: ConnStatus;
  lastSync: string;
  schemaFields: number;
  recordsPerSync: number;
  tags: string[];
  schedule: ScheduleInterval;
  nextRun: string;
  mappings: FieldMapping[];
  logs: ApiLog[];
  history: SyncDay[];
  errorMsg?: string;
}

// ─── 10M 도메인 필드 후보 ─────────────────────────────────────────────
const DOMAIN_OPTIONS = [
  "— 매핑 없음 —",
  "Material.mat_cd", "Material.mat_nm", "Material.unit", "Material.safe_qty",
  "Product.prod_cd", "Product.prod_nm", "Product.bom_ver",
  "Customer.cust_cd", "Customer.cust_nm", "Customer.region",
  "Supplier.sup_cd", "Supplier.sup_nm", "Supplier.lead_time",
  "Order.ord_no", "Order.ord_qty", "Order.due_dt",
  "Process.proc_cd", "Process.proc_nm", "Process.equip_cd",
  "Machine.equip_cd", "Machine.equip_nm", "Machine.status",
  "Measurement.tag_id", "Measurement.value_num", "Measurement.ts",
  "Maintenance.maint_id", "Maintenance.alarm_cd",
];

const TRANSFORM_OPTIONS = ["직접 매핑", "소문자 변환", "대문자 변환", "날짜 형식(ISO)", "숫자 파싱", "NULL → 기본값"];

// ─── 샘플 데이터 ─────────────────────────────────────────────────────
function makeLogs(prefix: string, good: boolean): ApiLog[] {
  if (!good) return [
    { id:"l1", ts:"14:23:04", status:401, method:"GET", url:prefix, respMs:128,  records:0, payload:'{"error":"Unauthorized","message":"Token expired"}' },
    { id:"l2", ts:"13:23:04", status:401, method:"GET", url:prefix, respMs:112,  records:0, payload:'{"error":"Unauthorized"}' },
    { id:"l3", ts:"12:23:04", status:401, method:"GET", url:prefix, respMs:143,  records:0, payload:'{"error":"Unauthorized"}' },
  ];
  return [
    { id:"l1", ts:"14:08:11", status:200, method:"GET", url:prefix, respMs:342,  records:1240, payload:'{"total":1240,"page":1,"data":[{"id":1,"name":"AL6061-T6 판재",...}]}' },
    { id:"l2", ts:"13:08:11", status:200, method:"GET", url:prefix, respMs:298,  records:1238, payload:'{"total":1238,"page":1,"data":[...]}' },
    { id:"l3", ts:"12:08:11", status:200, method:"GET", url:prefix, respMs:411,  records:1241, payload:'{"total":1241,"page":1,"data":[...]}' },
    { id:"l4", ts:"11:08:11", status:429, method:"GET", url:prefix, respMs:88,   records:0,    payload:'{"error":"RateLimitExceeded","retry_after":60}' },
    { id:"l5", ts:"10:08:11", status:200, method:"GET", url:prefix, respMs:321,  records:1235, payload:'{"total":1235,"page":1,"data":[...]}' },
  ];
}

function makeHistory(goodRate: number): SyncDay[] {
  const days = ["06/12","06/13","06/14","06/15","06/16","06/17","06/18"];
  return days.map(d => {
    const total = Math.floor(Math.random() * 20) + 10;
    const failed = goodRate > 0.9 ? Math.floor(Math.random() * 2) : Math.floor(total * (1 - goodRate));
    return { date: d, success: total - failed, failed };
  });
}

const ENDPOINTS: ApiEndpoint[] = [
  {
    id:"ep1", name:"SAP Material API", company:"B업체",
    url:"https://sap.b-company.internal/api/v2/materials",
    method:"GET", auth:"oauth", status:"connected",
    lastSync:"2분 전", schemaFields:34, recordsPerSync:12440, tags:["Material","ERP","실시간"],
    schedule:"30m", nextRun:"14:38:00",
    errorMsg: undefined,
    mappings: [
      { srcField:"MATNR", srcType:"string",  sample:"10000123",      domainTarget:"Material.mat_cd",    transform:"직접 매핑",   mapped:true },
      { srcField:"MAKTX", srcType:"string",  sample:"AL6061-T6 판재",domainTarget:"Material.mat_nm",    transform:"직접 매핑",   mapped:true },
      { srcField:"MEINS", srcType:"string",  sample:"KG",            domainTarget:"Material.unit",      transform:"소문자 변환", mapped:true },
      { srcField:"MTART", srcType:"string",  sample:"ROH",           domainTarget:"— 매핑 없음 —",      transform:"직접 매핑",   mapped:false },
      { srcField:"MATKL", srcType:"string",  sample:"001",           domainTarget:"— 매핑 없음 —",      transform:"직접 매핑",   mapped:false },
    ],
    logs: makeLogs("https://sap.b-company.internal/api/v2/materials", true),
    history: makeHistory(0.95),
  },
  {
    id:"ep2", name:"MES 공정 실적 API", company:"B업체",
    url:"https://mes.b-company.internal/api/process-results",
    method:"GET", auth:"apikey", status:"connected",
    lastSync:"8분 전", schemaFields:22, recordsPerSync:3810, tags:["Process","MES","실시간"],
    schedule:"5m", nextRun:"14:13:00",
    mappings: [
      { srcField:"WO_NO",     srcType:"string",   sample:"WO-2026-0541",      domainTarget:"Order.ord_no",     transform:"직접 매핑",      mapped:true },
      { srcField:"PROC_CD",   srcType:"string",   sample:"CNC-TURN",          domainTarget:"Process.proc_cd",  transform:"직접 매핑",      mapped:true },
      { srcField:"START_DT",  srcType:"datetime", sample:"2026-06-18 08:03",  domainTarget:"Measurement.ts",   transform:"날짜 형식(ISO)", mapped:true },
      { srcField:"END_DT",    srcType:"datetime", sample:"2026-06-18 09:47",  domainTarget:"— 매핑 없음 —",    transform:"날짜 형식(ISO)", mapped:false },
      { srcField:"DEFECT_QTY",srcType:"number",   sample:"2",                 domainTarget:"Measurement.value_num", transform:"숫자 파싱",  mapped:true },
    ],
    logs: makeLogs("https://mes.b-company.internal/api/process-results", true),
    history: makeHistory(0.98),
  },
  {
    id:"ep3", name:"Odoo Product API", company:"D업체",
    url:"https://odoo.d-company.com/api/v1/products",
    method:"GET", auth:"basic", status:"error",
    lastSync:"1시간 전", schemaFields:28, recordsPerSync:0, tags:["Product","ERP"],
    schedule:"1h", nextRun:"—",
    errorMsg:"401 Unauthorized — Basic Auth 자격증명이 만료됐습니다. API 키를 갱신하세요.",
    mappings: [
      { srcField:"id",           srcType:"integer", sample:"1042",               domainTarget:"Product.prod_cd", transform:"직접 매핑", mapped:true  },
      { srcField:"name",         srcType:"string",  sample:"PCB 기판 A타입",      domainTarget:"Product.prod_nm", transform:"직접 매핑", mapped:true  },
      { srcField:"default_code", srcType:"string",  sample:"PCB-A-001",          domainTarget:"— 매핑 없음 —",   transform:"직접 매핑", mapped:false },
      { srcField:"categ_id",     srcType:"object",  sample:"{id:5,name:'전자부품'}",domainTarget:"— 매핑 없음 —", transform:"직접 매핑", mapped:false },
    ],
    logs: makeLogs("https://odoo.d-company.com/api/v1/products", false),
    history: makeHistory(0.3),
  },
  {
    id:"ep4", name:"더존 ERP 거래처 API", company:"A업체",
    url:"https://erp.a-company.co.kr/api/bizpartner",
    method:"POST", auth:"apikey", status:"pending",
    lastSync:"미연결", schemaFields:0, recordsPerSync:0, tags:["Customer","Supplier","ERP"],
    schedule:"6h", nextRun:"—",
    mappings: [],
    logs: [],
    history: makeHistory(0),
  },
  {
    id:"ep5", name:"Google Sheets 수발주 API", company:"D업체",
    url:"https://sheets.googleapis.com/v4/spreadsheets/{id}/values",
    method:"GET", auth:"oauth", status:"untested",
    lastSync:"미연결", schemaFields:0, recordsPerSync:0, tags:["Order","비정형"],
    schedule:"daily", nextRun:"—",
    mappings: [],
    logs: [],
    history: makeHistory(0),
  },
];

// ─── 설정 상수 ──────────────────────────────────────────────────────
const AUTH_LABEL: Record<AuthType, string> = { none:"인증 없음", apikey:"API Key", oauth:"OAuth 2.0", basic:"Basic Auth" };
const AUTH_COLOR: Record<AuthType, string> = {
  none:"bg-slate-100 text-slate-500", apikey:"bg-amber-100 text-amber-700",
  oauth:"bg-blue-100 text-blue-700",  basic:"bg-violet-100 text-violet-700",
};
const STATUS_CFG: Record<ConnStatus, { label: string; color: string; icon: React.ReactNode }> = {
  connected:{ label:"연결됨",   color:"text-emerald-600 bg-emerald-50 border-emerald-200", icon:<CheckCircle2 className="w-3.5 h-3.5" /> },
  error:    { label:"오류",     color:"text-rose-600 bg-rose-50 border-rose-200",           icon:<XCircle className="w-3.5 h-3.5" /> },
  pending:  { label:"대기",     color:"text-amber-600 bg-amber-50 border-amber-200",        icon:<Clock className="w-3.5 h-3.5" /> },
  untested: { label:"미테스트", color:"text-slate-500 bg-slate-50 border-slate-200",        icon:<AlertCircle className="w-3.5 h-3.5" /> },
};
const SCHEDULE_LABELS: Record<ScheduleInterval, string> = {
  "5m":"5분마다", "30m":"30분마다", "1h":"1시간마다", "6h":"6시간마다", "daily":"일 1회 (자정)",
};
const HTTP_COLOR: Record<number, string> = {};
function httpColor(s: number) {
  return s >= 200 && s < 300 ? "text-emerald-600 bg-emerald-50" : s >= 400 ? "text-rose-600 bg-rose-50" : "text-amber-600 bg-amber-50";
}

// ─── 7일 바 차트 ────────────────────────────────────────────────────
function HistoryChart({ history }: { history: SyncDay[] }) {
  const maxTotal = Math.max(...history.map(d => d.success + d.failed), 1);
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2 h-28">
        {history.map(day => {
          const total = day.success + day.failed;
          const succH = (day.success / maxTotal) * 100;
          const failH = (day.failed  / maxTotal) * 100;
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5 group">
              <div className="relative w-full flex flex-col-reverse" style={{ height: 96 }}>
                <div className="w-full rounded-b bg-emerald-400 transition-all" style={{ height: `${succH}%` }} />
                {day.failed > 0 && (
                  <div className="w-full rounded-t bg-rose-400 transition-all" style={{ height: `${failH}%` }} />
                )}
              </div>
              <span className="text-xs text-slate-400 mt-1">{day.date}</span>
              {/* 툴팁 */}
              <div className="hidden group-hover:block absolute -top-10 bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                성공 {day.success} / 실패 {day.failed}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-emerald-400 inline-block" />성공</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-rose-400 inline-block" />실패</span>
      </div>
    </div>
  );
}

// ─── 메인 ──────────────────────────────────────────────────────────
export default function ApiConnector() {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>(ENDPOINTS);
  const [selected,  setSelected]  = useState<string>("ep1");
  const [tab,       setTab]       = useState<DetailTab>("info");
  const [testing,   setTesting]   = useState<string | null>(null);
  const [expandLog, setExpandLog] = useState<string | null>(null);

  const ep = endpoints.find(e => e.id === selected)!;

  const connected     = endpoints.filter(e => e.status === "connected").length;
  const totalRecords  = endpoints.reduce((s, e) => s + e.recordsPerSync, 0);
  const totalFields   = endpoints.reduce((s, e) => s + e.schemaFields, 0);
  const mappedFields  = endpoints.reduce((s, e) => s + e.mappings.filter(m => m.mapped).length, 0);

  async function testConnection(id: string) {
    setTesting(id);
    await new Promise(r => setTimeout(r, 1800));
    setTesting(null);
  }

  function updateMapping(epId: string, fieldIdx: number, key: "domainTarget" | "transform", val: string) {
    setEndpoints(prev => prev.map(e => e.id !== epId ? e : {
      ...e,
      mappings: e.mappings.map((m, i) => i !== fieldIdx ? m : {
        ...m,
        [key]: val,
        mapped: key === "domainTarget" ? val !== "— 매핑 없음 —" : m.mapped,
      }),
    }));
  }

  function updateSchedule(epId: string, interval: ScheduleInterval) {
    setEndpoints(prev => prev.map(e => e.id !== epId ? e : { ...e, schedule: interval }));
  }

  const TABS: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
    { id:"info",    label:"연결 정보",   icon:<Globe className="w-3.5 h-3.5" /> },
    { id:"mapping", label:`필드 매핑 (${ep.mappings.length})`, icon:<GitBranch className="w-3.5 h-3.5" /> },
    { id:"logs",    label:`요청 로그 (${ep.logs.length})`,     icon:<FileText className="w-3.5 h-3.5" /> },
    { id:"history", label:"동기화 이력", icon:<BarChart2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">API Connector</h1>
        <p className="text-slate-500 mt-1 text-sm">외부 REST API 등록·인증·스케줄·필드 매핑·동기화 이력 통합 관리</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label:"등록 엔드포인트", value:endpoints.length,          unit:"개",  color:"text-blue-600" },
          { label:"연결 성공",       value:connected,                   unit:"개",  color:"text-emerald-600" },
          { label:"탐색 필드",       value:totalFields,                 unit:"개",  color:"text-violet-600" },
          { label:"매핑 완료",       value:mappedFields,                unit:"건",  color:"text-orange-600" },
          { label:"동기화 레코드",   value:totalRecords.toLocaleString(),unit:"건",  color:"text-amber-600" },
        ].map(({ label, value, unit, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="text-xs text-slate-500 mb-1">{label}</div>
            <div className={`text-2xl font-bold ${color}`}>{value}<span className="text-sm font-normal text-slate-400 ml-1">{unit}</span></div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        {/* 엔드포인트 목록 */}
        <div className="w-80 shrink-0 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900 text-sm">엔드포인트 목록</h2>
            <button className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-3.5 h-3.5" /> 추가
            </button>
          </div>
          {endpoints.map(e => {
            const sc = STATUS_CFG[e.status];
            const mapped   = e.mappings.filter(m => m.mapped).length;
            const unmapped = e.mappings.filter(m => !m.mapped).length;
            return (
              <div key={e.id} onClick={() => { setSelected(e.id); setTab("info"); }}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm ${selected === e.id ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{e.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{e.company}</div>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${sc.color}`}>
                    {sc.icon}{sc.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${AUTH_COLOR[e.auth]}`}>{AUTH_LABEL[e.auth]}</span>
                  {e.tags.slice(0, 2).map(t => (
                    <span key={t} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{t}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{SCHEDULE_LABELS[e.schedule]}</span>
                  {e.mappings.length > 0 && (
                    <span className={`font-medium ${unmapped > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                      매핑 {mapped}/{e.mappings.length}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 상세 패널 */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* 헤더 + 액션 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">{ep.name}</h3>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                  <span>{ep.company}</span>
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{ep.method}</span>
                  <span className={`flex items-center gap-1 font-medium px-2 py-0.5 rounded-full border ${STATUS_CFG[ep.status].color}`}>
                    {STATUS_CFG[ep.status].icon}{STATUS_CFG[ep.status].label}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => testConnection(ep.id)} disabled={testing === ep.id}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors">
                  {testing === ep.id
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />테스트 중...</>
                    : <><Play className="w-3.5 h-3.5" />연결 테스트</>}
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />즉시 동기화
                </button>
              </div>
            </div>

            {ep.errorMsg && (
              <div className="mt-3 flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-lg p-3">
                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-700"><strong>연결 오류:</strong> {ep.errorMsg}</p>
              </div>
            )}
          </div>

          {/* 탭 바 */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* ── TAB 1: 연결 정보 + 스케줄 ── */}
          {tab === "info" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-slate-700 mb-4">연결 설정</h4>
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">엔드포인트 URL</label>
                      <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                        <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs text-slate-700 font-mono truncate">{ep.url}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">HTTP 메서드</label>
                      <span className="text-xs font-bold px-2.5 py-1 rounded bg-slate-900 text-white">{ep.method}</span>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">인증 방식</label>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded font-medium ${AUTH_COLOR[ep.auth]}`}>{AUTH_LABEL[ep.auth]}</span>
                        {ep.auth !== "none" ? <Lock className="w-3.5 h-3.5 text-emerald-500" /> : <Unlock className="w-3.5 h-3.5 text-slate-400" />}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">탐색 필드 수</label>
                      <span className="text-lg font-bold text-slate-900">{ep.schemaFields}<span className="text-xs text-slate-400 ml-1">개</span></span>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">동기화 레코드</label>
                      <span className="text-lg font-bold text-slate-900">{ep.recordsPerSync.toLocaleString()}<span className="text-xs text-slate-400 ml-1">건/회</span></span>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">마지막 동기화</label>
                      <span className="text-sm text-slate-600">{ep.lastSync}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 스케줄 설정 */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" /> 동기화 스케줄
                </h4>
                <div className="flex items-center gap-3 flex-wrap">
                  {(["5m","30m","1h","6h","daily"] as ScheduleInterval[]).map(iv => (
                    <button key={iv} onClick={() => updateSchedule(ep.id, iv)}
                      className={`text-xs px-4 py-2 rounded-lg border font-semibold transition-all ${
                        ep.schedule === iv ? "bg-blue-600 text-white border-blue-600 shadow" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                      }`}>
                      {SCHEDULE_LABELS[iv]}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                    다음 실행: <span className="font-mono font-semibold text-slate-700">{ep.nextRun !== "—" ? ep.nextRun : "스케줄 미설정"}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ArrowRight className="w-3 h-3" />
                    현재 간격: <span className="font-semibold text-blue-600">{SCHEDULE_LABELS[ep.schedule]}</span>
                  </span>
                </div>
              </div>

              {/* 인증 설정 */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-slate-700 mb-4">인증 자격증명</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">
                      {ep.auth === "oauth" ? "Client ID" : ep.auth === "apikey" ? "API Key" : "Username"}
                    </label>
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                      <Key className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-400 font-mono">{"•".repeat(24)} (암호화 저장됨)</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-xs px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors">자격증명 갱신</button>
                    <button className="text-xs px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">인증 테스트</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: 필드 매핑 ── */}
          {tab === "mapping" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {ep.mappings.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-slate-400 text-sm">연결 후 스키마 탐색 시 자동으로 필드를 채웁니다</div>
              ) : (
                <>
                  <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700">원천 필드 → 10M 도메인 매핑</h4>
                      <p className="text-xs text-slate-400 mt-0.5">드롭다운으로 대상 도메인 필드와 변환 규칙을 선택하세요</p>
                    </div>
                    <div className="text-xs text-slate-400">
                      매핑 완료 <span className="font-bold text-emerald-600">{ep.mappings.filter(m=>m.mapped).length}</span> / {ep.mappings.length}
                    </div>
                  </div>
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {["원천 필드","타입","샘플 값","10M 도메인 필드","변환 규칙","상태"].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left font-semibold text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {ep.mappings.map((m, i) => (
                        <tr key={m.srcField} className={`hover:bg-slate-50 ${!m.mapped ? "bg-amber-50/30" : ""}`}>
                          <td className="px-4 py-3 font-mono font-semibold text-slate-800">{m.srcField}</td>
                          <td className="px-4 py-3">
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">{m.srcType}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500 max-w-[140px] truncate">{m.sample}</td>
                          <td className="px-4 py-3">
                            <div className="relative">
                              <select value={m.domainTarget}
                                onChange={e => updateMapping(ep.id, i, "domainTarget", e.target.value)}
                                className={`text-xs border rounded-lg px-2 py-1.5 pr-6 appearance-none cursor-pointer w-full focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                                  m.mapped ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"
                                }`}>
                                {DOMAIN_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                              <ChevronDown className="w-3 h-3 absolute right-1.5 top-2 pointer-events-none text-slate-400" />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="relative">
                              <select value={m.transform}
                                onChange={e => updateMapping(ep.id, i, "transform", e.target.value)}
                                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 pr-6 bg-white appearance-none cursor-pointer w-full focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-600">
                                {TRANSFORM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                              <ChevronDown className="w-3 h-3 absolute right-1.5 top-2 pointer-events-none text-slate-400" />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {m.mapped
                              ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" />매핑됨</span>
                              : <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold"><AlertCircle className="w-3.5 h-3.5" />미매핑</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}

          {/* ── TAB 3: 요청 로그 ── */}
          {tab === "logs" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {ep.logs.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-slate-400 text-sm">아직 호출 이력이 없습니다</div>
              ) : (
                <>
                  <div className="px-5 py-3 border-b border-slate-100">
                    <h4 className="text-sm font-semibold text-slate-700">API 요청 로그</h4>
                    <p className="text-xs text-slate-400 mt-0.5">최근 {ep.logs.length}건 — 행 클릭으로 페이로드 확인</p>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {ep.logs.map(log => (
                      <div key={log.id}>
                        <button
                          onClick={() => setExpandLog(expandLog === log.id ? null : log.id)}
                          className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono shrink-0 ${httpColor(log.status)}`}>{log.status}</span>
                          <span className="font-mono text-xs text-slate-400 shrink-0 w-16">{log.ts}</span>
                          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">{log.method}</span>
                          <span className="text-xs text-slate-600 flex-1 truncate font-mono">{log.url}</span>
                          <span className={`text-xs font-semibold shrink-0 ${log.respMs > 400 ? "text-amber-600" : "text-slate-500"}`}>{log.respMs}ms</span>
                          <span className={`text-xs shrink-0 ${log.records > 0 ? "text-emerald-600" : "text-slate-300"}`}>
                            {log.records > 0 ? `${log.records.toLocaleString()}건` : "—"}
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-300 shrink-0 transition-transform ${expandLog === log.id ? "rotate-180" : ""}`} />
                        </button>
                        {expandLog === log.id && (
                          <div className="px-5 pb-3 bg-slate-50 border-t border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 mb-1.5 mt-2">응답 페이로드</p>
                            <pre className="text-xs font-mono text-slate-600 bg-white border border-slate-200 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                              {log.payload}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── TAB 4: 동기화 이력 ── */}
          {tab === "history" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-slate-700 mb-4">최근 7일 동기화 이력</h4>
                <HistoryChart history={ep.history} />
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                  <h4 className="text-sm font-semibold text-slate-700">일별 상세</h4>
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {["날짜","성공","실패","성공률","상태"].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-semibold text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {[...ep.history].reverse().map(d => {
                      const total = d.success + d.failed;
                      const rate  = total > 0 ? Math.round((d.success / total) * 100) : 0;
                      return (
                        <tr key={d.date} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-slate-600">{d.date}</td>
                          <td className="px-4 py-3 font-bold text-emerald-600">{d.success}</td>
                          <td className="px-4 py-3 font-bold text-rose-500">{d.failed > 0 ? d.failed : "—"}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${rate >= 95 ? "bg-emerald-400" : rate >= 70 ? "bg-amber-400" : "bg-rose-400"}`}
                                  style={{ width:`${rate}%` }} />
                              </div>
                              <span className={`font-mono font-semibold ${rate >= 95 ? "text-emerald-600" : rate >= 70 ? "text-amber-600" : "text-rose-600"}`}>{rate}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${rate >= 95 ? "bg-emerald-50 text-emerald-700" : rate >= 70 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
                              {rate >= 95 ? "정상" : rate >= 70 ? "불안정" : "오류"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
