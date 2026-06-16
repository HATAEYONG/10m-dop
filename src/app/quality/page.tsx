"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, XCircle, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";

type IssueLevel = "error" | "warning" | "info";

interface QualityIssue {
  id: number;
  level: IssueLevel;
  category: string;
  message: string;
  entity?: string;
  source?: string;
  count?: number;
  resolved: boolean;
}

const issues: QualityIssue[] = [
  { id: 1, level: "error", category: "필수 필드 누락", message: "Customer.tax_id가 비어 있습니다", entity: "CUST_0001 (삼성전자)", source: "A업체 ERP", resolved: false },
  { id: 2, level: "error", category: "필수 필드 누락", message: "Material.unit이 정의되지 않았습니다", entity: "MAT_0003 (AL7075)", source: "A업체 BOM", resolved: false },
  { id: 3, level: "error", category: "관계 오류", message: "BOM 부모 제품이 존재하지 않는 Product를 참조합니다", entity: "BOM_0024", source: "A업체 BOM", resolved: false },
  { id: 4, level: "warning", category: "동일 엔티티 중복", message: "Customer 이름이 동일한 레코드 2건 — Entity Resolution 확인 필요", entity: "CUST_0091, CUST_0092", source: "C업체 ERP", count: 2, resolved: false },
  { id: 5, level: "warning", category: "단위 불일치", message: "BOM 소요량의 단위가 상위 Material 단위와 다름 (EA vs KG)", entity: "BOM_0012", source: "A업체 BOM", resolved: false },
  { id: 6, level: "warning", category: "신뢰도 낮은 매핑", message: "Schema Mapping 신뢰도 60% 미만 항목 3건", source: "C업체 수기 Excel", count: 3, resolved: false },
  { id: 7, level: "warning", category: "출처 누락", message: "InspectionResult.inspector_id 출처 정보 없음", entity: "QC-2406 ~ QC-2412", source: "D업체 PDF", count: 7, resolved: false },
  { id: 8, level: "info", category: "데이터 품질", message: "Customer.phone 컬럼 Null 비율 42% — 입력 권고", source: "C업체 ERP", resolved: false },
  { id: 9, level: "info", category: "데이터 품질", message: "Order.due_date 날짜 형식 표준화 완료 (127건)", source: "A업체 ERP", resolved: true },
  { id: 10, level: "info", category: "데이터 품질", message: "중복 Product 레코드 18건 제거 완료", source: "B업체 MES", resolved: true },
];

const scoreData = [
  { label: "A업체", score: 72, errors: 3, warnings: 2, sources: 3 },
  { label: "B업체", score: 88, errors: 0, warnings: 1, sources: 3 },
  { label: "C업체", score: 41, errors: 1, warnings: 3, sources: 3 },
  { label: "D업체", score: 65, errors: 0, warnings: 2, sources: 3 },
];

const levelIcon = {
  error: <XCircle className="w-4 h-4 text-rose-500" />,
  warning: <AlertCircle className="w-4 h-4 text-amber-500" />,
  info: <CheckCircle2 className="w-4 h-4 text-blue-400" />,
};
const levelBg = {
  error: "border-rose-200 bg-rose-50",
  warning: "border-amber-200 bg-amber-50",
  info: "border-blue-100 bg-blue-50",
};

export default function QualityValidator() {
  const [items, setItems] = useState(issues);
  const [expanded, setExpanded] = useState<IssueLevel | "all">("all");

  function resolve(id: number) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, resolved: true } : i));
  }

  const open = items.filter(i => !i.resolved);
  const errors = open.filter(i => i.level === "error").length;
  const warnings = open.filter(i => i.level === "warning").length;
  const infos = open.filter(i => i.level === "info").length;
  const resolved = items.filter(i => i.resolved).length;

  const filtered = expanded === "all" ? open : open.filter(i => i.level === expanded);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quality Validator</h1>
          <p className="text-slate-500 mt-1">AI 매핑 및 온보딩 결과의 품질 검증</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-blue-300 transition-colors">
          <RefreshCw className="w-4 h-4" />
          재검증 실행
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-medium text-rose-700">오류</span>
          </div>
          <div className="text-3xl font-bold text-rose-700">{errors}</div>
          <div className="text-xs text-rose-500 mt-1">즉시 조치 필요</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-700">경고</span>
          </div>
          <div className="text-3xl font-bold text-amber-700">{warnings}</div>
          <div className="text-xs text-amber-500 mt-1">검토 권고</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-700">정보</span>
          </div>
          <div className="text-3xl font-bold text-blue-700">{infos}</div>
          <div className="text-xs text-blue-500 mt-1">참고</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-700">해결됨</span>
          </div>
          <div className="text-3xl font-bold text-emerald-700">{resolved}</div>
          <div className="text-xs text-emerald-500 mt-1">처리 완료</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="font-semibold text-slate-900 mb-4">업체별 품질 점수</h2>
        <div className="space-y-3">
          {scoreData.map(({ label, score, errors: e, warnings: w }) => {
            const color = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-blue-500" : score >= 40 ? "bg-amber-400" : "bg-rose-500";
            return (
              <div key={label} className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-700 w-16">{label}</span>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
                </div>
                <span className="text-sm font-bold text-slate-700 w-8">{score}</span>
                <div className="flex gap-2 text-xs">
                  {e > 0 && <span className="text-rose-600 font-medium">오류 {e}</span>}
                  {w > 0 && <span className="text-amber-600 font-medium">경고 {w}</span>}
                  {e === 0 && w <= 1 && <span className="text-emerald-600 font-medium">양호</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-slate-900">미해결 이슈 ({open.length}건)</h2>
          <div className="flex gap-2">
            {(["all", "error", "warning", "info"] as const).map(l => (
              <button
                key={l}
                onClick={() => setExpanded(l)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${expanded === l ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}
              >
                {l === "all" ? "전체" : l === "error" ? "오류" : l === "warning" ? "경고" : "정보"}
              </button>
            ))}
          </div>
        </div>

        {filtered.map(issue => (
          <div key={issue.id} className={`rounded-xl border p-4 ${levelBg[issue.level]}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{levelIcon[issue.level]}</div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-500">{issue.category}</span>
                    {issue.source && <span className="text-xs text-slate-400">· {issue.source}</span>}
                    {issue.count && <span className="text-xs font-medium text-slate-600">{issue.count}건</span>}
                  </div>
                  <p className="text-sm font-medium text-slate-800">{issue.message}</p>
                  {issue.entity && <p className="text-xs text-slate-500 mt-0.5">대상: {issue.entity}</p>}
                </div>
              </div>
              <button
                onClick={() => resolve(issue.id)}
                className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
              >
                해결 표시
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
            이 카테고리의 이슈가 모두 해결됐습니다.
          </div>
        )}
      </div>
    </div>
  );
}
