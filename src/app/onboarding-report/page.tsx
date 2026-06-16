"use client";

import { useState } from "react";
import { Download, CheckCircle2, AlertTriangle, XCircle, TrendingUp } from "lucide-react";

interface CompanyReport {
  id: string;
  name: string;
  type: string;
  score: number;
  completeness: number;
  reliability: number;
  coverage: number;
  timeliness: number;
  consistency: number;
  traceability: number;
  completedSteps: number;
  totalSteps: number;
  issues: { type: "error" | "warning" | "info"; msg: string }[];
  recommendation: string;
}

const companies: CompanyReport[] = [
  {
    id: "A", name: "A업체", type: "ERP + BOM + PDF", score: 87,
    completeness: 91, reliability: 83, coverage: 88, timeliness: 86, consistency: 90, traceability: 84,
    completedSteps: 10, totalSteps: 10,
    issues: [
      { type: "warning", msg: "CUST_NM 컬럼 한글·영문 혼재 (5.1%)" },
      { type: "warning", msg: "단위 불일치 2건 — mm/cm 혼용" },
      { type: "info", msg: "Human Review 큐 5건 대기 중" },
    ],
    recommendation: "전체 파이프라인 완료. AI Agent 학습 데이터로 활용 가능합니다.",
  },
  {
    id: "B", name: "B업체", type: "SAP + MES", score: 79,
    completeness: 82, reliability: 75, coverage: 80, timeliness: 78, consistency: 81, traceability: 77,
    completedSteps: 8, totalSteps: 10,
    issues: [
      { type: "error", msg: "Schema Profiler — D업체 연동 미완료" },
      { type: "warning", msg: "MES 공정 코드 표준화 미완료" },
      { type: "info", msg: "SAP MARA 자재 마스터 매핑 완료" },
    ],
    recommendation: "Schema Profiler와 Ontology Mapper 2개 단계 완료 후 재검증 권장.",
  },
  {
    id: "C", name: "C업체", type: "수기 Excel", score: 62,
    completeness: 58, reliability: 55, coverage: 65, timeliness: 70, consistency: 60, traceability: 63,
    completedSteps: 6, totalSteps: 10,
    issues: [
      { type: "error", msg: "필수 필드 누락 — 거래처코드 18% 공란" },
      { type: "error", msg: "날짜 형식 불일치 — 5가지 패턴 혼재" },
      { type: "warning", msg: "컬럼 '수량' 매핑 불명확 (Human Review 대기)" },
      { type: "warning", msg: "수기 입력 오타 패턴 다수 (삼성전자/삼성전재 등)" },
    ],
    recommendation: "Data Cleaner 재실행 및 수기 입력 원칙 수립 후 재온보딩 권장.",
  },
  {
    id: "D", name: "D업체", type: "Odoo + CSV", score: 74,
    completeness: 77, reliability: 71, coverage: 74, timeliness: 76, consistency: 73, traceability: 72,
    completedSteps: 7, totalSteps: 10,
    issues: [
      { type: "warning", msg: "Odoo 모듈 버전 불일치 (v16 → v17 마이그레이션 예정)" },
      { type: "warning", msg: "CSV 인코딩 혼재 — UTF-8 / EUC-KR" },
      { type: "info", msg: "공급사 데이터 품질 양호" },
    ],
    recommendation: "Odoo 버전 업그레이드 후 ERP 연동 재설정 필요.",
  },
];

const AXES = ["completeness", "reliability", "coverage", "timeliness", "consistency", "traceability"] as const;
const AXIS_LABELS: Record<typeof AXES[number], string> = {
  completeness: "완전성", reliability: "신뢰성", coverage: "커버리지",
  timeliness: "적시성", consistency: "일관성", traceability: "추적성",
};
const N = AXES.length;

function radarPoints(values: number[], cx: number, cy: number, r: number) {
  return values.map((v, i) => {
    const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
    const rv = (v / 100) * r;
    return [cx + rv * Math.cos(angle), cy + rv * Math.sin(angle)] as [number, number];
  });
}

function RadarChart({ report }: { report: CompanyReport }) {
  const cx = 110, cy = 110, r = 80;
  const vals = AXES.map(a => report[a]);
  const pts = radarPoints(vals, cx, cy, r);
  const dataPath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + "Z";

  const gridLevels = [20, 40, 60, 80, 100];

  const scoreColor = report.score >= 80 ? "#10b981" : report.score >= 65 ? "#f59e0b" : "#ef4444";

  return (
    <svg width="220" height="220" viewBox="0 0 220 220">
      {/* 그리드 */}
      {gridLevels.map(lv => {
        const gpts = AXES.map((_, i) => {
          const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
          const rv = (lv / 100) * r;
          return [cx + rv * Math.cos(angle), cy + rv * Math.sin(angle)] as [number, number];
        });
        return (
          <polygon
            key={lv}
            points={gpts.map(p => p.join(",")).join(" ")}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        );
      })}

      {/* 축선 */}
      {AXES.map((_, i) => {
        const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={cx + r * Math.cos(angle)} y2={cy + r * Math.sin(angle)}
            stroke="#e2e8f0" strokeWidth="1"
          />
        );
      })}

      {/* 데이터 영역 */}
      <path d={dataPath} fill={scoreColor} fillOpacity="0.15" stroke={scoreColor} strokeWidth="2" />

      {/* 데이터 점 */}
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={scoreColor} />
      ))}

      {/* 축 레이블 */}
      {AXES.map((a, i) => {
        const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
        const lx = cx + (r + 18) * Math.cos(angle);
        const ly = cy + (r + 18) * Math.sin(angle);
        return (
          <text key={a} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fontSize="9" fill="#64748b" fontFamily="sans-serif">
            {AXIS_LABELS[a]}
          </text>
        );
      })}

      {/* 중앙 점수 */}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="bold" fill={scoreColor} fontFamily="sans-serif">
        {report.score}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="8" fill="#94a3b8" fontFamily="sans-serif">
        AI-Readiness
      </text>
    </svg>
  );
}

export default function OnboardingReport() {
  const [selected, setSelected] = useState<string>("A");
  const report = companies.find(c => c.id === selected)!;

  const overall = Math.round(companies.reduce((s, c) => s + c.score, 0) / companies.length);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Onboarding Report</h1>
          <p className="text-slate-500 mt-1">업체별 AI-Readiness 점수와 온보딩 완료 현황을 확인합니다</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors">
          <Download className="w-4 h-4" /> 보고서 다운로드 (PDF)
        </button>
      </div>

      {/* 전체 요약 */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-4xl font-bold">{overall}</div>
            <div className="text-blue-200 text-sm mt-0.5">전체 평균 AI-Readiness</div>
          </div>
          <div className="flex-1 ml-4">
            <div className="text-sm font-semibold mb-2">4개 업체 기준</div>
            <div className="flex gap-2">
              {companies.map(c => (
                <div key={c.id} className="flex-1">
                  <div className="text-xs text-blue-200 mb-1">{c.name}</div>
                  <div className="h-1.5 bg-blue-500 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full" style={{ width: `${c.score}%` }} />
                  </div>
                  <div className="text-xs mt-1 font-semibold">{c.score}점</div>
                </div>
              ))}
            </div>
          </div>
          <TrendingUp className="w-12 h-12 text-blue-300 opacity-50" />
        </div>
      </div>

      {/* 업체 탭 */}
      <div className="flex gap-3">
        {companies.map(c => (
          <button
            key={c.id}
            onClick={() => setSelected(c.id)}
            className={`flex-1 rounded-xl border p-4 text-left transition-all ${selected === c.id ? "border-blue-400 ring-2 ring-blue-100 bg-white" : "border-slate-200 bg-white hover:border-slate-300"}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-slate-900">{c.name}</span>
              <span className={`text-lg font-bold ${c.score >= 80 ? "text-emerald-600" : c.score >= 65 ? "text-amber-600" : "text-rose-600"}`}>{c.score}</span>
            </div>
            <div className="text-xs text-slate-400">{c.type}</div>
            <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${c.score >= 80 ? "bg-emerald-500" : c.score >= 65 ? "bg-amber-400" : "bg-rose-500"}`} style={{ width: `${c.score}%` }} />
            </div>
            <div className="text-xs text-slate-400 mt-1">{c.completedSteps}/{c.totalSteps} 단계 완료</div>
          </button>
        ))}
      </div>

      {/* 선택 업체 상세 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 레이더 차트 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">{report.name} — 6대 품질 지표</h3>
          <div className="flex justify-center">
            <RadarChart report={report} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {AXES.map(a => (
              <div key={a} className="text-center">
                <div className="text-xs text-slate-400">{AXIS_LABELS[a]}</div>
                <div className="text-sm font-bold text-slate-800">{report[a]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 이슈 + 완료 현황 */}
        <div className="space-y-4">
          {/* 완료 체크리스트 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">파이프라인 완료 현황</h3>
            <div className="space-y-1.5">
              {["Source Scanner", "Schema Profiler", "Document Parser", "Data Cleaner", "Entity Resolver", "Canonical Mapper", "Ontology Mapper", "Graph Builder", "Quality Validator", "Human Review"].map((s, i) => (
                <div key={s} className="flex items-center gap-2 text-sm">
                  {i < report.completedSteps
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    : <div className="w-4 h-4 rounded-full border-2 border-slate-200 shrink-0" />}
                  <span className={i < report.completedSteps ? "text-slate-700" : "text-slate-300"}>{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 이슈 목록 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">이슈 목록</h3>
            <div className="space-y-2">
              {report.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  {issue.type === "error" ? <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    : issue.type === "warning" ? <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      : <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />}
                  <span className="text-slate-600">{issue.msg}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 권고사항 */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-700 mb-1">AI 권고사항</p>
            <p className="text-sm text-blue-800">{report.recommendation}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
