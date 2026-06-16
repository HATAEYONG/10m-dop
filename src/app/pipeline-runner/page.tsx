"use client";

import { useState, useEffect, useRef } from "react";
import {
  Play, Square, RotateCcw, CheckCircle2, Loader2, Circle,
  AlertCircle, ChevronRight, Database, FileSearch, Sparkles,
  Users, GitBranch, Network, Share2, CheckSquare, ClipboardCheck,
  Factory, BarChart3,
} from "lucide-react";

const COMPANIES = ["A업체 (ERP + BOM + PDF)", "B업체 (SAP + MES)", "C업체 (수기 Excel)", "D업체 (Odoo + CSV)"];

const STEPS = [
  { id: 1, name: "Source Scanner", icon: Database, desc: "데이터 원천 탐색 및 목록화", duration: 1200 },
  { id: 2, name: "Schema Profiler", icon: GitBranch, desc: "테이블·컬럼 구조 분석", duration: 1500 },
  { id: 3, name: "Document Parser", icon: FileSearch, desc: "PDF·CSV 문서 파싱", duration: 1800 },
  { id: 4, name: "Data Cleaner", icon: Sparkles, desc: "날짜·단위·중복 정제", duration: 1400 },
  { id: 5, name: "Entity Resolver", icon: Users, desc: "엔티티 통합 및 ID 부여", duration: 1600 },
  { id: 6, name: "Canonical Mapper", icon: GitBranch, desc: "표준 필드 매핑", duration: 1300 },
  { id: 7, name: "Ontology Mapper", icon: Network, desc: "10M 도메인 배치", duration: 1100 },
  { id: 8, name: "Graph Builder", icon: Share2, desc: "지식 그래프 노드·엣지 생성", duration: 2000 },
  { id: 9, name: "Quality Validator", icon: CheckSquare, desc: "품질 점수 산출 및 이슈 감지", duration: 1400 },
  { id: 10, name: "Human Review", icon: ClipboardCheck, desc: "AI 저신뢰 항목 검토 큐 전송", duration: 800 },
];

type StepStatus = "pending" | "running" | "done" | "error";

interface StepResult {
  records?: number;
  columns?: number;
  docs?: number;
  rules?: number;
  merged?: number;
  mapped?: number;
  domains?: number;
  nodes?: number;
  edges?: number;
  score?: number;
  issues?: number;
  queued?: number;
  message?: string;
}

const MOCK_RESULTS: Record<number, StepResult> = {
  1: { records: 182441, message: "12개 원천 연결 확인" },
  2: { columns: 347, message: "47개 테이블 프로파일링 완료" },
  3: { docs: 23, message: "PDF 18건 · CSV 5건 파싱 완료" },
  4: { rules: 6, records: 4523, message: "활성 규칙 6개 적용, 4,523건 변환" },
  5: { merged: 47, message: "중복 엔티티 47쌍 통합" },
  6: { mapped: 312, message: "312개 필드 Canonical 매핑 완료" },
  7: { domains: 12, message: "12개 도메인에 배치 완료" },
  8: { nodes: 1240, edges: 3871, message: "지식 그래프 생성 완료" },
  9: { score: 87, issues: 14, message: "품질 점수 87점, 이슈 14건" },
  10: { queued: 5, message: "Human Review 큐 5건 전송" },
};

export default function PipelineRunner() {
  const [company, setCompany] = useState(0);
  const [statuses, setStatuses] = useState<StepStatus[]>(Array(10).fill("pending"));
  const [results, setResults] = useState<(StepResult | null)[]>(Array(10).fill(null));
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(-1);
  const abortRef = useRef(false);

  async function runPipeline() {
    abortRef.current = false;
    setRunning(true);
    setStatuses(Array(10).fill("pending"));
    setResults(Array(10).fill(null));
    setSelected(null);

    for (let i = 0; i < STEPS.length; i++) {
      if (abortRef.current) break;
      setCurrentStep(i);
      setStatuses(prev => { const n = [...prev]; n[i] = "running"; return n; });
      await new Promise(r => setTimeout(r, STEPS[i].duration));
      if (abortRef.current) { setStatuses(prev => { const n = [...prev]; n[i] = "pending"; return n; }); break; }
      // 무작위로 5% 확률 오류 시뮬 (step 3 이후)
      const isError = i > 2 && Math.random() < 0.05;
      setStatuses(prev => { const n = [...prev]; n[i] = isError ? "error" : "done"; return n; });
      setResults(prev => { const n = [...prev]; n[i] = MOCK_RESULTS[i + 1]; return n; });
    }

    setRunning(false);
    setCurrentStep(-1);
  }

  function stop() {
    abortRef.current = true;
    setRunning(false);
  }

  function reset() {
    abortRef.current = true;
    setRunning(false);
    setStatuses(Array(10).fill("pending"));
    setResults(Array(10).fill(null));
    setSelected(null);
    setCurrentStep(-1);
  }

  const done = statuses.filter(s => s === "done").length;
  const errors = statuses.filter(s => s === "error").length;
  const progress = Math.round((done / 10) * 100);

  const sel = selected !== null ? STEPS[selected] : null;
  const selResult = selected !== null ? results[selected] : null;
  const selStatus = selected !== null ? statuses[selected] : null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pipeline Runner</h1>
        <p className="text-slate-500 mt-1">업체 데이터를 선택하고 10단계 온보딩 파이프라인을 실행합니다</p>
      </div>

      {/* 컨트롤 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-5 flex-wrap">
        <div className="flex-1 min-w-48">
          <label className="text-xs font-semibold text-slate-500 block mb-1.5">업체 선택</label>
          <select
            value={company}
            onChange={e => setCompany(Number(e.target.value))}
            disabled={running}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 disabled:opacity-50"
          >
            {COMPANIES.map((c, i) => <option key={i} value={i}>{c}</option>)}
          </select>
        </div>

        <div className="flex gap-2 mt-4">
          {!running ? (
            <button
              onClick={runPipeline}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <Play className="w-4 h-4" /> 파이프라인 실행
            </button>
          ) : (
            <button
              onClick={stop}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition-colors"
            >
              <Square className="w-4 h-4" /> 중지
            </button>
          )}
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50"
          >
            <RotateCcw className="w-4 h-4" /> 초기화
          </button>
        </div>

        <div className="flex gap-4 ml-auto text-sm">
          <div className="text-center">
            <div className="text-xl font-bold text-slate-900">{progress}%</div>
            <div className="text-xs text-slate-400">진행률</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-emerald-600">{done}</div>
            <div className="text-xs text-slate-400">완료</div>
          </div>
          {errors > 0 && (
            <div className="text-center">
              <div className="text-xl font-bold text-rose-600">{errors}</div>
              <div className="text-xs text-slate-400">오류</div>
            </div>
          )}
        </div>
      </div>

      {/* 진행바 */}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex gap-4">
        {/* 스텝 목록 */}
        <div className="flex-1 space-y-2">
          {STEPS.map((step, i) => {
            const status = statuses[i];
            const result = results[i];
            const Icon = step.icon;
            const isSelected = selected === i;
            return (
              <div
                key={step.id}
                onClick={() => setSelected(isSelected ? null : i)}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm flex items-center gap-4 ${isSelected ? "border-blue-400 ring-2 ring-blue-100" : status === "error" ? "border-rose-200" : "border-slate-200"}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${status === "done" ? "bg-emerald-100 text-emerald-700" : status === "running" ? "bg-blue-100 text-blue-700" : status === "error" ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-400"}`}>
                  {status === "done" ? <CheckCircle2 className="w-5 h-5" /> : status === "running" ? <Loader2 className="w-5 h-5 animate-spin" /> : status === "error" ? <AlertCircle className="w-5 h-5" /> : step.id}
                </div>
                <div className={`p-2 rounded-lg shrink-0 ${status === "done" ? "bg-emerald-50 text-emerald-600" : status === "running" ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-400"}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{step.name}</span>
                    {status === "running" && <span className="text-xs text-blue-600 font-medium animate-pulse">처리 중...</span>}
                  </div>
                  <div className="text-xs text-slate-400">{result ? result.message : step.desc}</div>
                </div>
                <ChevronRight className={`w-4 h-4 text-slate-300 shrink-0 transition-transform ${isSelected ? "rotate-90" : ""}`} />
              </div>
            );
          })}
        </div>

        {/* 상세 패널 */}
        {sel && (
          <div className="w-64 shrink-0 bg-white rounded-xl border border-slate-200 p-5 self-start sticky top-6">
            <div className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium mb-4 ${selStatus === "done" ? "bg-emerald-100 text-emerald-700" : selStatus === "running" ? "bg-blue-100 text-blue-700" : selStatus === "error" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"}`}>
              {selStatus === "done" ? "완료" : selStatus === "running" ? "실행 중" : selStatus === "error" ? "오류" : "대기"}
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">{sel.name}</h3>
            <p className="text-xs text-slate-500 mb-4">{sel.desc}</p>
            {selResult && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">처리 결과</p>
                {Object.entries(selResult).filter(([k]) => k !== "message").map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-semibold text-slate-800">{typeof v === "number" ? v.toLocaleString() : v}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-600">{selResult.message}</div>
              </div>
            )}
            {selStatus === "pending" && <div className="text-xs text-slate-400 mt-2">이 단계는 아직 실행되지 않았습니다</div>}
          </div>
        )}
      </div>
    </div>
  );
}
