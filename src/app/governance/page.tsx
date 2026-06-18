"use client";

import { useState } from "react";
import { Shield, CheckCircle2, AlertTriangle, XCircle, Clock, Users, BarChart2, FileText, Lock } from "lucide-react";

interface DomainOwner {
  domain: string;
  owner: string;
  team: string;
  records: number;
  quality: number;
  lastAudit: string;
  sla: number;
  slaTarget: number;
}

interface AuditLog {
  id: string;
  ts: string;
  actor: string;
  action: string;
  target: string;
  result: "success" | "warning" | "fail";
}

interface ComplianceItem {
  id: string;
  framework: string;
  requirement: string;
  status: "pass" | "warn" | "fail";
  note: string;
  dueDate?: string;
}

const DOMAIN_OWNERS: DomainOwner[] = [
  { domain: "Material",    owner: "이재혁",  team: "구매팀",  records: 8420,   quality: 94, lastAudit: "2026-06-15", sla: 99.1, slaTarget: 99 },
  { domain: "Product",     owner: "김민준",  team: "생산팀",  records: 12840,  quality: 91, lastAudit: "2026-06-14", sla: 98.4, slaTarget: 99 },
  { domain: "Customer",    owner: "박서연",  team: "영업팀",  records: 1240,   quality: 96, lastAudit: "2026-06-16", sla: 99.7, slaTarget: 99 },
  { domain: "Supplier",    owner: "정우성",  team: "구매팀",  records: 382,    quality: 88, lastAudit: "2026-06-12", sla: 97.2, slaTarget: 99 },
  { domain: "Order",       owner: "이수진",  team: "영업팀",  records: 45810,  quality: 93, lastAudit: "2026-06-18", sla: 99.9, slaTarget: 99 },
  { domain: "BOM",         owner: "최동현",  team: "생산팀",  records: 6720,   quality: 90, lastAudit: "2026-06-11", sla: 98.1, slaTarget: 99 },
  { domain: "Process",     owner: "강지훈",  team: "공정팀",  records: 28410,  quality: 87, lastAudit: "2026-06-10", sla: 96.8, slaTarget: 99 },
  { domain: "Machine",     owner: "윤성민",  team: "설비팀",  records: 182140, quality: 99, lastAudit: "2026-06-18", sla: 99.8, slaTarget: 99 },
  { domain: "Measurement", owner: "한수빈",  team: "품질팀",  records: 94200,  quality: 97, lastAudit: "2026-06-17", sla: 99.5, slaTarget: 99 },
  { domain: "Maintenance", owner: "오태양",  team: "설비팀",  records: 15320,  quality: 85, lastAudit: "2026-06-09", sla: 95.4, slaTarget: 99 },
  { domain: "Money",       owner: "임현아",  team: "재무팀",  records: 31040,  quality: 98, lastAudit: "2026-06-18", sla: 99.9, slaTarget: 99 },
  { domain: "Method",      owner: "류재원",  team: "기술팀",  records: 4120,   quality: 92, lastAudit: "2026-06-13", sla: 98.8, slaTarget: 99 },
];

const AUDIT_LOGS: AuditLog[] = [
  { id: "a1", ts: "2026-06-18 10:14:32", actor: "AI Agent",   action: "자동 온보딩 실행", target: "A업체 전체 파이프라인", result: "success" },
  { id: "a2", ts: "2026-06-18 09:44:11", actor: "김민준",     action: "Human Review 승인", target: "Order.order_date 매핑 25건", result: "success" },
  { id: "a3", ts: "2026-06-18 09:01:55", actor: "Data Cleaner", action: "스키마 변환 적용", target: "Material.mat_nm 정규화", result: "success" },
  { id: "a4", ts: "2026-06-17 16:30:00", actor: "박서연",     action: "소스 삭제 시도",  target: "TB_CUSTOMER (삭제 거부)", result: "fail" },
  { id: "a5", ts: "2026-06-17 14:22:10", actor: "Email Parser", action: "신규 발주 파싱", target: "B업체 카카오톡 메시지", result: "warning" },
  { id: "a6", ts: "2026-06-17 11:00:40", actor: "윤성민",     action: "Sensor Gateway 등록", target: "CNC-01 S7-1500", result: "success" },
  { id: "a7", ts: "2026-06-16 15:55:03", actor: "임현아",     action: "Money 도메인 접근", target: "TB_FIN_ACTUAL", result: "success" },
  { id: "a8", ts: "2026-06-16 09:20:18", actor: "외부 IP",    action: "비인가 접근 시도", target: "API /sources", result: "fail" },
];

const COMPLIANCE: ComplianceItem[] = [
  { id: "c1",  framework: "개인정보보호법", requirement: "개인정보 처리방침 고지",         status: "pass", note: "2026-01-15 갱신 완료" },
  { id: "c2",  framework: "개인정보보호법", requirement: "최소 수집 원칙 준수",            status: "pass", note: "불필요 개인정보 필드 제거 완료" },
  { id: "c3",  framework: "개인정보보호법", requirement: "개인정보 보유기간 설정",         status: "warn", note: "Customer 도메인 보유기간 미설정", dueDate: "2026-07-01" },
  { id: "c4",  framework: "ISO 27001",     requirement: "접근통제 정책 수립",             status: "pass", note: "Role 기반 접근통제 구현됨" },
  { id: "c5",  framework: "ISO 27001",     requirement: "암호화 전송 (TLS 1.2+)",        status: "pass", note: "전 API 엔드포인트 TLS 1.3" },
  { id: "c6",  framework: "ISO 27001",     requirement: "보안 감사로그 보존 (1년)",       status: "warn", note: "현재 90일 보존 — 1년으로 연장 필요", dueDate: "2026-08-01" },
  { id: "c7",  framework: "ISO 27001",     requirement: "취약점 정기 점검",               status: "pass", note: "분기 1회 외부 취약점 진단 완료" },
  { id: "c8",  framework: "GDPR",          requirement: "데이터 처리 기록 유지 (Art.30)", status: "pass", note: "처리 활동 기록부 최신화" },
  { id: "c9",  framework: "GDPR",          requirement: "데이터 주체 권리 (Art.17 삭제)", status: "fail", note: "삭제 요청 처리 절차 미비", dueDate: "2026-07-15" },
  { id: "c10", framework: "GDPR",          requirement: "DPO 지정 및 연락처 공개",        status: "pass", note: "DPO: 정보보호팀 (dpo@company.kr)" },
];

const STATUS_CFG = {
  pass:    { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "준수" },
  warn:    { color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",   icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "개선 필요" },
  fail:    { color: "text-rose-700",    bg: "bg-rose-50",    border: "border-rose-200",    icon: <XCircle className="w-3.5 h-3.5" />, label: "미준수" },
};

const RESULT_CFG = {
  success: { color: "text-emerald-600", label: "성공" },
  warning: { color: "text-amber-600",   label: "경고" },
  fail:    { color: "text-rose-600",    label: "실패" },
};

export default function Governance() {
  const [activeTab, setActiveTab] = useState<"ownership" | "sla" | "audit" | "compliance">("ownership");
  const [filterFw, setFilterFw] = useState<string>("all");

  const passCount = COMPLIANCE.filter(c => c.status === "pass").length;
  const warnCount = COMPLIANCE.filter(c => c.status === "warn").length;
  const failCount = COMPLIANCE.filter(c => c.status === "fail").length;
  const complianceScore = Math.round((passCount / COMPLIANCE.length) * 100);

  const slaBreach = DOMAIN_OWNERS.filter(d => d.sla < d.slaTarget).length;
  const avgQuality = Math.round(DOMAIN_OWNERS.reduce((s, d) => s + d.quality, 0) / DOMAIN_OWNERS.length);
  const totalRecords = DOMAIN_OWNERS.reduce((s, d) => s + d.records, 0);

  const frameworks = ["all", ...Array.from(new Set(COMPLIANCE.map(c => c.framework)))];
  const filteredCompliance = filterFw === "all" ? COMPLIANCE : COMPLIANCE.filter(c => c.framework === filterFw);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Governance Dashboard</h1>
          <p className="text-slate-500 mt-1">데이터 오너십 · SLA · 감사 로그 · 컴플라이언스 통합 관리</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
          <Shield className="w-3.5 h-3.5" />
          거버넌스 활성
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "컴플라이언스",  value: `${complianceScore}%`, sub: `${passCount}/${COMPLIANCE.length} 준수`, color: "text-emerald-700", icon: <Shield className="w-4 h-4" /> },
          { label: "SLA 위반 도메인", value: slaBreach,    sub: `${DOMAIN_OWNERS.length}개 도메인 중`, color: slaBreach > 0 ? "text-rose-600" : "text-emerald-600", icon: <BarChart2 className="w-4 h-4" /> },
          { label: "평균 데이터 품질", value: `${avgQuality}점`, sub: "12개 도메인 평균",   color: "text-blue-700", icon: <CheckCircle2 className="w-4 h-4" /> },
          { label: "총 레코드 수",   value: totalRecords.toLocaleString(), sub: "12개 도메인 합산", color: "text-slate-700", icon: <FileText className="w-4 h-4" /> },
        ].map(({ label, value, sub, color, icon }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">{label}</span>
              <div className={`${color} opacity-60`}>{icon}</div>
            </div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          ["ownership","데이터 오너십"],
          ["sla","SLA 현황"],
          ["audit","감사 로그"],
          ["compliance","컴플라이언스"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`text-xs px-4 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 오너십 탭 */}
      {activeTab === "ownership" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">도메인별 데이터 오너십 (10M 온톨로지 12개 도메인)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["도메인","오너","소속팀","레코드 수","품질 점수","최근 감사일"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {DOMAIN_OWNERS.map(d => (
                  <tr key={d.domain} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{d.domain}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800">{d.owner}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{d.team}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 tabular-nums">{d.records.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${d.quality >= 95 ? "bg-emerald-500" : d.quality >= 85 ? "bg-amber-400" : "bg-rose-500"}`}
                            style={{ width: `${d.quality}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold ${d.quality >= 95 ? "text-emerald-600" : d.quality >= 85 ? "text-amber-600" : "text-rose-600"}`}>
                          {d.quality}점
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 font-mono">{d.lastAudit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SLA 탭 */}
      {activeTab === "sla" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">SLA 준수율 — 목표: 99.0% 이상</h3>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            {DOMAIN_OWNERS.map(d => {
              const ok = d.sla >= d.slaTarget;
              return (
                <div key={d.domain} className={`rounded-xl border p-4 ${ok ? "border-slate-200" : "border-rose-200 bg-rose-50/30"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700">{d.domain}</span>
                    <span className={`text-sm font-black tabular-nums ${ok ? "text-emerald-600" : "text-rose-600"}`}>
                      {d.sla.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500"}`}
                      style={{ width: `${Math.min(100, d.sla)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>오너: {d.owner}</span>
                    <span className={ok ? "text-emerald-600" : "text-rose-600"}>
                      {ok ? "✓ 목표 달성" : `▼ ${(d.slaTarget - d.sla).toFixed(1)}% 미달`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 감사 로그 탭 */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">감사 로그 (최근 8건)</h3>
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <Lock className="w-3 h-3" /> 변경 불가 · 90일 보존
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {AUDIT_LOGS.map(log => {
              const rc = RESULT_CFG[log.result];
              return (
                <div key={log.id} className={`flex items-start gap-4 px-5 py-3.5 hover:bg-slate-50 ${log.result === "fail" ? "bg-rose-50/30" : ""}`}>
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${log.result === "success" ? "bg-emerald-500" : log.result === "warning" ? "bg-amber-400" : "bg-rose-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800">{log.action}</span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${log.result === "success" ? "bg-emerald-50 text-emerald-700" : log.result === "warning" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
                        {rc.label}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{log.target}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-semibold text-slate-600">{log.actor}</div>
                    <div className="text-xs font-mono text-slate-400">{log.ts.split(" ")[1]}</div>
                    <div className="text-xs text-slate-300">{log.ts.split(" ")[0]}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 컴플라이언스 탭 */}
      {activeTab === "compliance" && (
        <div className="space-y-4">
          {/* 요약 바 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-4 mb-3">
              <div className="text-sm font-semibold text-slate-700">컴플라이언스 종합</div>
              <div className={`text-lg font-black ${complianceScore >= 90 ? "text-emerald-600" : complianceScore >= 70 ? "text-amber-600" : "text-rose-600"}`}>
                {complianceScore}%
              </div>
            </div>
            <div className="flex gap-2 h-3 rounded-full overflow-hidden">
              <div className="bg-emerald-500 transition-all" style={{ width: `${(passCount/COMPLIANCE.length)*100}%` }} />
              <div className="bg-amber-400 transition-all" style={{ width: `${(warnCount/COMPLIANCE.length)*100}%` }} />
              <div className="bg-rose-500 transition-all" style={{ width: `${(failCount/COMPLIANCE.length)*100}%` }} />
            </div>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="text-emerald-600">✓ 준수 {passCount}건</span>
              <span className="text-amber-600">⚠ 개선 {warnCount}건</span>
              <span className="text-rose-600">✗ 미준수 {failCount}건</span>
            </div>
          </div>

          {/* 필터 */}
          <div className="flex gap-2 flex-wrap">
            {frameworks.map(fw => (
              <button
                key={fw}
                onClick={() => setFilterFw(fw)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${
                  filterFw === fw ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                }`}
              >
                {fw === "all" ? "전체" : fw}
              </button>
            ))}
          </div>

          {/* 체크리스트 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-50">
              {filteredCompliance.map(item => {
                const sc = STATUS_CFG[item.status];
                return (
                  <div key={item.id} className={`flex items-start gap-4 px-5 py-3.5 ${item.status === "fail" ? "bg-rose-50/30" : item.status === "warn" ? "bg-amber-50/20" : ""}`}>
                    <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border shrink-0 ${sc.bg} ${sc.color} ${sc.border}`}>
                      {sc.icon} {sc.label}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800">{item.requirement}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{item.note}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{item.framework}</div>
                      {item.dueDate && (
                        <div className="text-xs text-rose-500 mt-1 flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3" /> {item.dueDate}까지
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
