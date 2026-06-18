"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bot, Play, StopCircle, CheckCircle2, AlertTriangle, Clock,
  ChevronRight, Loader2, Brain, FileSearch, GitBranch, Sparkles,
  Users, Network, Share2, CheckSquare, BarChart2, FileBarChart2,
  AlertCircle, RefreshCw
} from "lucide-react";

type StepStatus = "waiting" | "thinking" | "running" | "done" | "error" | "escalated";

interface PipelineStep {
  id: number;
  name: string;
  nameEn: string;
  icon: React.ReactNode;
  desc: string;
  aiDecision: string;
  duration: number;
  escalate?: boolean;
}

const COMPANIES = [
  { id: "A", name: "A업체 (주)한국정밀", score: 0, sector: "CNC 정밀가공" },
  { id: "B", name: "B업체 (주)대성금속", score: 0, sector: "프레스·판금" },
  { id: "C", name: "C업체 서울테크", score: 0, sector: "전자부품 조립" },
  { id: "D", name: "D업체 (주)미래PCB", score: 0, sector: "PCB 제조" },
];

const STEPS: PipelineStep[] = [
  {
    id: 1, name: "데이터 원천 스캔", nameEn: "Source Scan",
    icon: <FileSearch className="w-4 h-4" />,
    desc: "ERP DB, 파일서버, API 엔드포인트 자동 탐지",
    aiDecision: "총 7개 데이터 원천 발견. ERP (Oracle 19c) × 1, Excel 파일 × 4, REST API × 2. 모두 접근 가능 상태 확인됨.",
    duration: 2200,
  },
  {
    id: 2, name: "스키마 프로파일링", nameEn: "Schema Profile",
    icon: <GitBranch className="w-4 h-4" />,
    desc: "컬럼 구조·Null 비율·중복률 분석",
    aiDecision: "312개 컬럼 분석 완료. Null 비율 5% 초과 컬럼 18개 식별. 중복 키 패턴 3종 감지. 자동 정규화 룰 생성 준비.",
    duration: 3100,
  },
  {
    id: 3, name: "문서 파싱", nameEn: "Document Parse",
    icon: <FileSearch className="w-4 h-4" />,
    desc: "PDF 성적서·거래명세서 OCR 추출",
    aiDecision: "PDF 23건 파싱 성공. 수기 작성 스캔본 2건은 신뢰도 낮아 Human Review 큐에 별도 등록.",
    duration: 4800,
    escalate: false,
  },
  {
    id: 4, name: "데이터 정제", nameEn: "Data Clean",
    icon: <Sparkles className="w-4 h-4" />,
    desc: "날짜 포맷·단위·중복 레코드 정제",
    aiDecision: "날짜 포맷 3종 → ISO8601 통일. 단위 혼용(kg/KG/킬로그램) 표준화. 중복 레코드 47건 제거.",
    duration: 2600,
  },
  {
    id: 5, name: "엔티티 통합", nameEn: "Entity Resolution",
    icon: <Users className="w-4 h-4" />,
    desc: "동일 공급사·제품의 이름 변형 통합",
    aiDecision: "공급사 표기 변형 12쌍 통합 (예: 삼성전자㈜ = 삼성전자(주)). 제품코드 매핑 테이블 자동 생성.",
    duration: 3400,
  },
  {
    id: 6, name: "온톨로지 매핑", nameEn: "Ontology Map",
    icon: <Network className="w-4 h-4" />,
    desc: "10M 온톨로지 12개 도메인 매핑",
    aiDecision: "컬럼 312개 중 287개 자동 매핑 성공 (92%). 미매핑 25개는 유사도 0.6 이하 — 상위 3개 후보와 함께 Human Review 요청.",
    duration: 3900,
    escalate: true,
  },
  {
    id: 7, name: "그래프 구축", nameEn: "Graph Build",
    icon: <Share2 className="w-4 h-4" />,
    desc: "지식 그래프 노드·엣지 생성",
    aiDecision: "노드 1,847개, 엣지 5,214개 생성. 고립 노드 3개 감지 → 자동 연결 시도. 그래프 밀도 지수: 0.72 (목표 0.6 초과).",
    duration: 5200,
  },
  {
    id: 8, name: "품질 검증", nameEn: "Quality Validate",
    icon: <CheckSquare className="w-4 h-4" />,
    desc: "6대 품질 지표 자동 측정",
    aiDecision: "완전성 89%, 정확성 91%, 일관성 87%, 유효성 93%, 적시성 85%, 유일성 96%. 종합 품질 점수 89.8점.",
    duration: 2100,
  },
  {
    id: 9, name: "GraphRAG 색인", nameEn: "GraphRAG Index",
    icon: <Brain className="w-4 h-4" />,
    desc: "벡터 임베딩 생성 및 검색 인덱스 빌드",
    aiDecision: "1,847개 노드 임베딩 완료. HNSW 인덱스 빌드 성공. 쿼리 응답 시간 P95 180ms — 목표값 200ms 달성.",
    duration: 6100,
  },
  {
    id: 10, name: "AI-Readiness 평가", nameEn: "Readiness Score",
    icon: <BarChart2 className="w-4 h-4" />,
    desc: "종합 점수 산출 및 리포트 생성",
    aiDecision: "AI-Readiness 종합 82점 산출. 데이터 품질 89점, 연결성 78점, 완전성 84점, 표준화 81점. 전체 업체 상위 15% 수준.",
    duration: 1800,
  },
];

const STATUS_CFG: Record<StepStatus, { color: string; bg: string; label: string }> = {
  waiting:   { color: "text-slate-400",   bg: "bg-slate-100",    label: "대기" },
  thinking:  { color: "text-purple-600",  bg: "bg-purple-50",    label: "AI 분석 중" },
  running:   { color: "text-blue-600",    bg: "bg-blue-50",      label: "실행 중" },
  done:      { color: "text-emerald-600", bg: "bg-emerald-50",   label: "완료" },
  error:     { color: "text-rose-600",    bg: "bg-rose-50",      label: "오류" },
  escalated: { color: "text-amber-600",   bg: "bg-amber-50",     label: "Human Review" },
};

export default function AutoOnboarding() {
  const [company, setCompany] = useState("A");
  const [running, setRunning] = useState(false);
  const [stepStatuses, setStepStatuses] = useState<Record<number, StepStatus>>(
    Object.fromEntries(STEPS.map(s => [s.id, "waiting"]))
  );
  const [stepLogs, setStepLogs] = useState<Record<number, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setElapsed(e => e + 100), 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running]);

  const reset = () => {
    abortRef.current = true;
    setRunning(false);
    setCompleted(false);
    setCurrentStep(0);
    setElapsed(0);
    setStepStatuses(Object.fromEntries(STEPS.map(s => [s.id, "waiting"])));
    setStepLogs({});
    setTimeout(() => { abortRef.current = false; }, 100);
  };

  const runPipeline = async () => {
    abortRef.current = false;
    setRunning(true);
    setCompleted(false);
    setElapsed(0);
    setStepStatuses(Object.fromEntries(STEPS.map(s => [s.id, "waiting"])));
    setStepLogs({});

    for (const step of STEPS) {
      if (abortRef.current) break;
      setCurrentStep(step.id);

      // thinking phase
      setStepStatuses(prev => ({ ...prev, [step.id]: "thinking" }));
      await delay(600);
      if (abortRef.current) break;

      // running phase
      setStepStatuses(prev => ({ ...prev, [step.id]: "running" }));
      await delay(step.duration);
      if (abortRef.current) break;

      // result
      const finalStatus: StepStatus = step.escalate ? "escalated" : "done";
      setStepStatuses(prev => ({ ...prev, [step.id]: finalStatus }));
      setStepLogs(prev => ({ ...prev, [step.id]: step.aiDecision }));
    }

    if (!abortRef.current) {
      setCompleted(true);
      setRunning(false);
    }
  };

  const doneCount = Object.values(stepStatuses).filter(s => s === "done" || s === "escalated").length;
  const progress  = Math.round((doneCount / STEPS.length) * 100);

  const comp = COMPANIES.find(c => c.id === company)!;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Auto Onboarding</h1>
          <p className="text-slate-500 mt-1">AI 에이전트가 10단계 온보딩 파이프라인을 자율 실행합니다</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-purple-600 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg">
          <Bot className="w-3.5 h-3.5" />
          AI Agent v2.1 · Sonnet 4.6
        </div>
      </div>

      {/* 업체 선택 + 실행 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-48">
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">대상 업체 선택</label>
            <select
              value={company}
              onChange={e => { if (!running) { reset(); setCompany(e.target.value); } }}
              disabled={running}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 disabled:bg-slate-50"
            >
              {COMPANIES.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.sector}</option>
              ))}
            </select>
          </div>

          {/* 진행 바 */}
          <div className="flex-1 min-w-48">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-500">진행률</span>
              <span className="text-xs font-bold text-slate-700">{progress}%</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* 경과 시간 */}
          <div className="text-right shrink-0">
            <div className="text-xs text-slate-500 mb-0.5">경과 시간</div>
            <div className="text-lg font-bold font-mono text-slate-700">
              {(elapsed / 1000).toFixed(1)}s
            </div>
          </div>

          {/* 실행/중단 버튼 */}
          <div className="flex gap-2 shrink-0">
            {running ? (
              <button
                onClick={reset}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-sm font-semibold"
              >
                <StopCircle className="w-4 h-4" /> 중단
              </button>
            ) : (
              <button
                onClick={runPipeline}
                disabled={completed}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-semibold disabled:opacity-40"
              >
                <Play className="w-4 h-4" /> AI 자율 실행
              </button>
            )}
            {(completed || doneCount > 0) && !running && (
              <button
                onClick={reset}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm"
              >
                <RefreshCw className="w-4 h-4" /> 초기화
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        {/* 파이프라인 스텝 */}
        <div className="flex-1 space-y-2">
          {STEPS.map((step, idx) => {
            const status = stepStatuses[step.id];
            const sc = STATUS_CFG[status];
            const log = stepLogs[step.id];
            const isActive = currentStep === step.id && running;

            return (
              <div
                key={step.id}
                className={`bg-white rounded-xl border p-4 transition-all ${
                  isActive ? "border-blue-300 ring-2 ring-blue-100 shadow-md" :
                  status === "done" ? "border-emerald-200" :
                  status === "escalated" ? "border-amber-200" :
                  status === "error" ? "border-rose-200" : "border-slate-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* 스텝 번호 + 상태 */}
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 font-bold text-sm ${sc.bg} ${sc.color}`}>
                    {status === "thinking" || status === "running"
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : status === "done" ? <CheckCircle2 className="w-4 h-4" />
                      : status === "escalated" ? <AlertTriangle className="w-4 h-4" />
                      : status === "error" ? <AlertCircle className="w-4 h-4" />
                      : <span>{step.id}</span>
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800">{step.name}</span>
                      <span className="text-xs text-slate-400">{step.nameEn}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>
                        {sc.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>

                    {/* AI 의사결정 로그 */}
                    {log && (
                      <div className={`mt-2 text-xs rounded-lg px-3 py-2 flex items-start gap-2 ${
                        status === "escalated"
                          ? "bg-amber-50 border border-amber-100 text-amber-800"
                          : "bg-slate-50 border border-slate-100 text-slate-600"
                      }`}>
                        <Brain className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-500" />
                        <span>{log}</span>
                      </div>
                    )}

                    {/* 실행 중 진행 표시 */}
                    {isActive && (
                      <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse w-3/4" />
                      </div>
                    )}
                  </div>

                  {/* 화살표 연결 */}
                  {idx < STEPS.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-2" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 우측 요약 패널 */}
        <div className="w-64 shrink-0 space-y-4">
          {/* 업체 정보 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 mb-2">대상 업체</div>
            <div className="text-sm font-bold text-slate-800">{comp.name}</div>
            <div className="text-xs text-slate-500 mt-0.5">{comp.sector}</div>
          </div>

          {/* 단계별 집계 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="text-xs font-semibold text-slate-500">실행 현황</div>
            {(["done","escalated","running","waiting"] as StepStatus[]).map(s => {
              const cnt = Object.values(stepStatuses).filter(v => v === s).length;
              const sc = STATUS_CFG[s];
              return (
                <div key={s} className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${sc.color}`}>{sc.label}</span>
                  <span className="font-bold text-slate-700">{cnt}단계</span>
                </div>
              );
            })}
          </div>

          {/* 완료 결과 카드 */}
          {completed && (
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-bold">온보딩 완료</span>
              </div>
              <div className="text-3xl font-black mb-1">82점</div>
              <div className="text-xs text-blue-200 mb-3">AI-Readiness 종합</div>
              <div className="space-y-1">
                {[["데이터 품질","89점"],["연결성","78점"],["완전성","84점"],["표준화","81점"]].map(([k,v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-blue-200">{k}</span>
                    <span className="font-bold">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-blue-500 text-xs text-blue-200">
                소요 시간: {(elapsed/1000).toFixed(1)}s · Human Review 1건
              </div>
            </div>
          )}

          {/* 에스컬레이션 항목 */}
          {Object.entries(stepStatuses).some(([,v]) => v === "escalated") && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 mb-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Human Review 필요
              </div>
              <div className="text-xs text-amber-600">
                온톨로지 미매핑 25개 컬럼 — 상위 3개 후보와 함께 Human Review 큐에 등록됨
              </div>
              <button className="mt-2 text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors w-full">
                Human Review 이동
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
