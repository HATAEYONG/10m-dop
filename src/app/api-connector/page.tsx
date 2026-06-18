"use client";

import { useState } from "react";
import {
  Plus, Play, CheckCircle2, XCircle, Clock, AlertCircle,
  Key, Globe, RefreshCw, ChevronDown, ChevronRight, Loader2, Lock, Unlock,
} from "lucide-react";

type AuthType = "none" | "apikey" | "oauth" | "basic";
type ConnStatus = "connected" | "error" | "pending" | "untested";

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
  schemaPreview: { field: string; type: string; sample: string }[];
}

const ENDPOINTS: ApiEndpoint[] = [
  {
    id: "ep1",
    name: "SAP Material API",
    company: "B업체",
    url: "https://sap.b-company.internal/api/v2/materials",
    method: "GET",
    auth: "oauth",
    status: "connected",
    lastSync: "2분 전",
    schemaFields: 34,
    recordsPerSync: 12440,
    tags: ["Material", "ERP", "실시간"],
    schemaPreview: [
      { field: "MATNR", type: "string", sample: "10000123" },
      { field: "MAKTX", type: "string", sample: "AL6061-T6 판재" },
      { field: "MEINS", type: "string", sample: "KG" },
      { field: "MTART", type: "string", sample: "ROH" },
      { field: "MATKL", type: "string", sample: "001" },
    ],
  },
  {
    id: "ep2",
    name: "MES 공정 실적 API",
    company: "B업체",
    url: "https://mes.b-company.internal/api/process-results",
    method: "GET",
    auth: "apikey",
    status: "connected",
    lastSync: "8분 전",
    schemaFields: 22,
    recordsPerSync: 3810,
    tags: ["Process", "MES", "실시간"],
    schemaPreview: [
      { field: "WO_NO", type: "string", sample: "WO-2026-0541" },
      { field: "PROC_CD", type: "string", sample: "CNC-TURN" },
      { field: "START_DT", type: "datetime", sample: "2026-06-18 08:03" },
      { field: "END_DT", type: "datetime", sample: "2026-06-18 09:47" },
      { field: "DEFECT_QTY", type: "number", sample: "2" },
    ],
  },
  {
    id: "ep3",
    name: "Odoo Product API",
    company: "D업체",
    url: "https://odoo.d-company.com/api/v1/products",
    method: "GET",
    auth: "basic",
    status: "error",
    lastSync: "1시간 전",
    schemaFields: 28,
    recordsPerSync: 0,
    tags: ["Product", "ERP"],
    schemaPreview: [
      { field: "id", type: "integer", sample: "1042" },
      { field: "name", type: "string", sample: "PCB 기판 A타입" },
      { field: "default_code", type: "string", sample: "PCB-A-001" },
      { field: "categ_id", type: "object", sample: "{id:5, name:'전자부품'}" },
    ],
  },
  {
    id: "ep4",
    name: "더존 ERP 거래처 API",
    company: "A업체",
    url: "https://erp.a-company.co.kr/api/bizpartner",
    method: "POST",
    auth: "apikey",
    status: "pending",
    lastSync: "미연결",
    schemaFields: 0,
    recordsPerSync: 0,
    tags: ["Customer", "Supplier", "ERP"],
    schemaPreview: [],
  },
  {
    id: "ep5",
    name: "Google Sheets 수발주 API",
    company: "D업체",
    url: "https://sheets.googleapis.com/v4/spreadsheets/{id}/values",
    method: "GET",
    auth: "oauth",
    status: "untested",
    lastSync: "미연결",
    schemaFields: 0,
    recordsPerSync: 0,
    tags: ["Order", "비정형"],
    schemaPreview: [],
  },
];

const AUTH_LABEL: Record<AuthType, string> = {
  none: "인증 없음", apikey: "API Key", oauth: "OAuth 2.0", basic: "Basic Auth",
};
const AUTH_COLOR: Record<AuthType, string> = {
  none: "bg-slate-100 text-slate-500",
  apikey: "bg-amber-100 text-amber-700",
  oauth: "bg-blue-100 text-blue-700",
  basic: "bg-violet-100 text-violet-700",
};
const STATUS_CONFIG: Record<ConnStatus, { label: string; color: string; icon: React.ReactNode }> = {
  connected: { label: "연결됨", color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  error:     { label: "오류",   color: "text-rose-600 bg-rose-50 border-rose-200",       icon: <XCircle className="w-3.5 h-3.5" /> },
  pending:   { label: "대기",   color: "text-amber-600 bg-amber-50 border-amber-200",     icon: <Clock className="w-3.5 h-3.5" /> },
  untested:  { label: "미테스트", color: "text-slate-500 bg-slate-50 border-slate-200",   icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

export default function ApiConnector() {
  const [selected, setSelected] = useState<string>("ep1");
  const [testing, setTesting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const ep = ENDPOINTS.find(e => e.id === selected)!;

  async function testConnection(id: string) {
    setTesting(id);
    await new Promise(r => setTimeout(r, 1800));
    setTesting(null);
  }

  const connected = ENDPOINTS.filter(e => e.status === "connected").length;
  const totalRecords = ENDPOINTS.reduce((s, e) => s + e.recordsPerSync, 0);
  const totalFields = ENDPOINTS.reduce((s, e) => s + e.schemaFields, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">API Connector</h1>
        <p className="text-slate-500 mt-1">외부 시스템 REST API를 등록·인증하고 실시간 데이터 수집 스케줄을 설정합니다</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "등록 엔드포인트", value: ENDPOINTS.length, unit: "개", color: "text-blue-600" },
          { label: "연결 성공",       value: connected,         unit: "개", color: "text-emerald-600" },
          { label: "탐색 필드 수",    value: totalFields,       unit: "개", color: "text-violet-600" },
          { label: "동기화 레코드",   value: totalRecords.toLocaleString(), unit: "건", color: "text-amber-600" },
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
          {ENDPOINTS.map(e => {
            const sc = STATUS_CONFIG[e.status];
            return (
              <div
                key={e.id}
                onClick={() => setSelected(e.id)}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm ${selected === e.id ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{e.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{e.company}</div>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${sc.color}`}>
                    {sc.icon} {sc.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${AUTH_COLOR[e.auth]}`}>
                    {AUTH_LABEL[e.auth]}
                  </span>
                  {e.tags.slice(0, 2).map(t => (
                    <span key={t} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{t}</span>
                  ))}
                </div>
                <div className="text-xs text-slate-400 mt-2">마지막 동기화: {e.lastSync}</div>
              </div>
            );
          })}
        </div>

        {/* 상세 패널 */}
        <div className="flex-1 space-y-4">
          {/* 연결 정보 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">{ep.name}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => testConnection(ep.id)}
                  disabled={testing === ep.id}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {testing === ep.id
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 테스트 중...</>
                    : <><Play className="w-3.5 h-3.5" /> 연결 테스트</>
                  }
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /> 동기화
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">엔드포인트 URL</label>
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
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
                    <span className={`text-xs px-2 py-1 rounded font-medium ${AUTH_COLOR[ep.auth]}`}>
                      {AUTH_LABEL[ep.auth]}
                    </span>
                    {ep.auth !== "none"
                      ? <Lock className="w-3.5 h-3.5 text-emerald-500" />
                      : <Unlock className="w-3.5 h-3.5 text-slate-400" />
                    }
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">연결 상태</label>
                  <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border w-fit ${STATUS_CONFIG[ep.status].color}`}>
                    {STATUS_CONFIG[ep.status].icon}
                    {STATUS_CONFIG[ep.status].label}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">탐색 필드 수</label>
                  <span className="text-lg font-bold text-slate-900">{ep.schemaFields}<span className="text-xs font-normal text-slate-400 ml-1">개</span></span>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">동기화 레코드</label>
                  <span className="text-lg font-bold text-slate-900">{ep.recordsPerSync.toLocaleString()}<span className="text-xs font-normal text-slate-400 ml-1">건/회</span></span>
                </div>
              </div>
            </div>

            {ep.status === "error" && (
              <div className="mt-4 flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-lg p-3">
                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-700">
                  <strong>연결 오류:</strong> 401 Unauthorized — Basic Auth 자격증명이 만료됐습니다. API 키를 갱신하세요.
                </div>
              </div>
            )}
          </div>

          {/* 스키마 탐색 결과 */}
          {ep.schemaPreview.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <button
                className="flex items-center justify-between w-full"
                onClick={() => setExpanded(p => ({ ...p, schema: !p.schema }))}
              >
                <h3 className="font-semibold text-slate-900 text-sm">스키마 탐색 결과</h3>
                {expanded.schema
                  ? <ChevronDown className="w-4 h-4 text-slate-400" />
                  : <ChevronRight className="w-4 h-4 text-slate-400" />
                }
              </button>

              {!expanded.schema && (
                <div className="mt-4 overflow-hidden rounded-lg border border-slate-100">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        {["필드명", "타입", "샘플 값", "10M 매핑 후보"].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ep.schemaPreview.map(f => (
                        <tr key={f.field} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono font-medium text-slate-800">{f.field}</td>
                          <td className="px-3 py-2">
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">{f.type}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-500 font-mono">{f.sample}</td>
                          <td className="px-3 py-2">
                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs">
                              {ep.tags[0]}.{f.field.toLowerCase().replace(/_/g, "_")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="bg-slate-50 px-3 py-2 text-xs text-slate-400 border-t border-slate-100">
                    총 {ep.schemaFields}개 필드 탐색됨 — 상위 {ep.schemaPreview.length}개 미리보기
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 인증 설정 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 text-sm mb-4">인증 설정</h3>
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
                <button className="text-xs px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors">
                  자격증명 갱신
                </button>
                <button className="text-xs px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                  인증 테스트
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
