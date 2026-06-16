"use client";

import { useState } from "react";
import { Bot, Filter, ChevronDown, ChevronUp, Cpu, Zap, AlertTriangle, CheckCircle2 } from "lucide-react";

type Stage = "Source Scanner" | "Schema Profiler" | "Document Parser" | "Data Cleaner" | "Entity Resolver" | "Canonical Mapper" | "Ontology Mapper" | "Graph Builder" | "Quality Validator" | "Human Review";
type Decision = "approved" | "merged" | "mapped" | "flagged" | "skipped";

interface AgentLog {
  id: number;
  time: string;
  stage: Stage;
  model: string;
  confidence: number;
  decision: Decision;
  action: string;
  reasoning: string;
  tokens: number;
  latency: number;
  company: string;
}

const logs: AgentLog[] = [
  {
    id: 1, time: "08:03:14", stage: "Source Scanner", model: "claude-sonnet-4-6", confidence: 96,
    decision: "approved", company: "A업체",
    action: "ERP DB 연결 확인 — 12개 테이블, 182,441 레코드 감지",
    reasoning: "DB 연결 메타데이터(owner, last_updated, row_count)가 모두 유효. 보안등급 'internal'로 자동 분류.",
    tokens: 1240, latency: 380,
  },
  {
    id: 2, time: "08:05:22", stage: "Schema Profiler", model: "claude-sonnet-4-6", confidence: 88,
    decision: "flagged", company: "A업체",
    action: "컬럼 'CUST_NM' — 한글·영문 혼재 감지, 정제 필요",
    reasoning: "전체 23,411건 중 1,204건(5.1%)에 영문 고객명 존재. 동일 거래처의 이중 표기 가능성. Data Cleaner로 전달.",
    tokens: 890, latency: 290,
  },
  {
    id: 3, time: "08:11:45", stage: "Document Parser", model: "claude-haiku-4-5-20251001", confidence: 91,
    decision: "approved", company: "A업체",
    action: "작업표준서 WI-2024-003.pdf — 공정 테이블 4개, 엔티티 12개 추출",
    reasoning: "PDF 레이아웃이 표준 작업표준서 형식과 일치. OCR 신뢰도 98.2%. 테이블 헤더 자동 감지 성공.",
    tokens: 2100, latency: 1240,
  },
  {
    id: 4, time: "08:18:03", stage: "Data Cleaner", model: "claude-sonnet-4-6", confidence: 97,
    decision: "approved", company: "A업체",
    action: "날짜 표준화 규칙 적용 — 1,243건 'YYYYMMDD' → 'YYYY-MM-DD' 변환",
    reasoning: "패턴 매칭 정확도 100%. 예외 케이스 없음. ISO 8601 강제 적용.",
    tokens: 560, latency: 210,
  },
  {
    id: 5, time: "08:25:30", stage: "Entity Resolver", model: "claude-sonnet-4-6", confidence: 67,
    decision: "flagged", company: "A업체",
    action: "CUST_0021 vs CUST_0022 병합 여부 — Human Review 큐 전달",
    reasoning: "사업자번호 앞 6자리 일치, 주소 동일, 이메일 도메인 동일이나 사업부 단위 분리 가능성 존재. 신뢰도 67%로 자동 결정 기준치(80%) 미달. Human Review로 escalation.",
    tokens: 1850, latency: 640,
  },
  {
    id: 6, time: "08:31:18", stage: "Entity Resolver", model: "claude-sonnet-4-6", confidence: 94,
    decision: "merged", company: "A업체",
    action: "삼성전자(주) / Samsung Electronics / 삼성전자 → CUST_0001로 통합",
    reasoning: "사업자번호 완전 일치, 대표자 동일, 주소 동일. 신뢰도 94%로 자동 병합 기준(80%) 초과.",
    tokens: 1340, latency: 480,
  },
  {
    id: 7, time: "08:38:55", stage: "Canonical Mapper", model: "claude-sonnet-4-6", confidence: 58,
    decision: "flagged", company: "C업체",
    action: "컬럼 '수량' — OrderLine.quantity vs BOM.quantity_per 매핑 불명확",
    reasoning: "시트명 '수주현황'이나 인접에 'BOM번호' 컬럼 존재. 소수점 값 일부 포함. 두 Canonical 필드 모두 후보. Human Review 전달.",
    tokens: 1720, latency: 590,
  },
  {
    id: 8, time: "08:44:12", stage: "Ontology Mapper", model: "claude-haiku-4-5-20251001", confidence: 99,
    decision: "mapped", company: "B업체",
    action: "SAP MARA 테이블 → Material 도메인 전체 매핑 완료",
    reasoning: "MARA는 SAP 표준 자재 마스터 테이블. 필드 구조가 10M Material 도메인과 97% 일치. 나머지 3% (SAP 내부 필드) 는 무시.",
    tokens: 410, latency: 180,
  },
  {
    id: 9, time: "08:52:07", stage: "Graph Builder", model: "claude-sonnet-4-6", confidence: 92,
    decision: "approved", company: "A업체",
    action: "노드 1,240개, 엣지 3,871개 생성 — Supplier→Material→Product 체인 완성",
    reasoning: "참조 무결성 검사 통과. 고립 노드 3개 감지 → Quality Validator 플래그 처리. 순환 참조 없음.",
    tokens: 3200, latency: 1800,
  },
  {
    id: 10, time: "09:01:44", stage: "Quality Validator", model: "claude-sonnet-4-6", confidence: 89,
    decision: "approved", company: "A업체",
    action: "AI-Readiness 점수 87점 산출 — 이슈 14건 (오류 2, 경고 8, 정보 4)",
    reasoning: "필수 필드 누락 0건. 중복 엔티티 잔존 0건. 단위 불일치 2건(경고). 관계 오류 0건. 최종 점수: 완성도 91 × 신뢰도 83 = 87.",
    tokens: 2400, latency: 950,
  },
];

const decisionColor: Record<Decision, string> = {
  approved: "bg-emerald-100 text-emerald-700",
  merged: "bg-blue-100 text-blue-700",
  mapped: "bg-violet-100 text-violet-700",
  flagged: "bg-amber-100 text-amber-700",
  skipped: "bg-slate-100 text-slate-500",
};
const decisionLabel: Record<Decision, string> = {
  approved: "승인", merged: "병합", mapped: "매핑", flagged: "검토 전달", skipped: "건너뜀",
};

const stageList = Array.from(new Set(logs.map(l => l.stage)));

export default function AgentMonitor() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filterStage, setFilterStage] = useState<Stage | "all">("all");
  const [filterDecision, setFilterDecision] = useState<Decision | "all">("all");

  const filtered = logs.filter(l =>
    (filterStage === "all" || l.stage === filterStage) &&
    (filterDecision === "all" || l.decision === filterDecision)
  );

  const totalTokens = logs.reduce((s, l) => s + l.tokens, 0);
  const avgConf = Math.round(logs.reduce((s, l) => s + l.confidence, 0) / logs.length);
  const flagged = logs.filter(l => l.decision === "flagged").length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Agent Monitor</h1>
        <p className="text-slate-500 mt-1">AI Agent가 각 파이프라인 단계에서 내린 결정과 근거를 추적합니다</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "총 결정 수", value: logs.length, sub: "A업체 파이프라인 1회 실행" },
          { label: "평균 신뢰도", value: `${avgConf}%`, sub: "모든 단계 평균" },
          { label: "Human Review 전달", value: flagged, sub: `${Math.round(flagged / logs.length * 100)}% escalation율` },
          { label: "총 토큰 사용", value: totalTokens.toLocaleString(), sub: "입출력 합산" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <div className="text-sm text-slate-700 mt-0.5">{label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500">단계:</span>
          <select
            value={filterStage}
            onChange={e => setFilterStage(e.target.value as Stage | "all")}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400"
          >
            <option value="all">전체</option>
            {stageList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">결정:</span>
          <select
            value={filterDecision}
            onChange={e => setFilterDecision(e.target.value as Decision | "all")}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400"
          >
            <option value="all">전체</option>
            {(Object.keys(decisionLabel) as Decision[]).map(d => <option key={d} value={d}>{decisionLabel[d]}</option>)}
          </select>
        </div>
        <span className="text-xs text-slate-400 ml-auto self-center">{filtered.length}건 표시</span>
      </div>

      {/* 로그 타임라인 */}
      <div className="space-y-2">
        {filtered.map(log => (
          <div key={log.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div
              className="p-4 flex items-start gap-4 cursor-pointer hover:bg-slate-50"
              onClick={() => setExpanded(expanded === log.id ? null : log.id)}
            >
              <div className="text-xs font-mono text-slate-400 shrink-0 mt-0.5 w-16">{log.time}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500 font-medium">{log.stage}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${decisionColor[log.decision]}`}>{decisionLabel[log.decision]}</span>
                  <span className="text-xs text-slate-400">{log.company}</span>
                </div>
                <p className="text-sm text-slate-800 mt-0.5 font-medium">{log.action}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5" />
                  <span className={log.confidence >= 80 ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>{log.confidence}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" />
                  {log.latency}ms
                </div>
                {expanded === log.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {expanded === log.id && (
              <div className="px-4 pb-4 pt-1 border-t border-slate-100">
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">AI 판단 근거</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{log.reasoning}</p>
                  </div>
                  <div className="flex gap-6 text-xs text-slate-500 pt-2 border-t border-slate-200">
                    <span>모델: <strong className="text-slate-700">{log.model}</strong></span>
                    <span>토큰: <strong className="text-slate-700">{log.tokens.toLocaleString()}</strong></span>
                    <span>지연: <strong className="text-slate-700">{log.latency}ms</strong></span>
                    {log.decision === "flagged" && (
                      <span className="flex items-center gap-1 text-amber-600 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" /> Human Review 전달됨
                      </span>
                    )}
                    {log.decision === "approved" && (
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 자동 처리 완료
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
