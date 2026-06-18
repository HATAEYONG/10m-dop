"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Circle, ChevronRight, Users, Package, FileText, Wrench, Database, GitBranch, Network, Share2, CheckSquare, Eye, Factory, Plug, Mail, Newspaper, CalendarClock } from "lucide-react";

type ModuleStatus = "done" | "in_progress" | "planned" | "blocked";
type MvpPhase = 1 | 2 | 3 | 4;

interface Module {
  id: number;
  name: string;
  nameEn: string;
  icon: React.ReactNode;
  desc: string;
  phase: MvpPhase;
  status: ModuleStatus;
  progress: number;
  companies: { name: string; done: boolean }[];
  inputTypes: string[];
  outputTypes: string[];
  eta?: string;
}

const modules: Module[] = [
  {
    id: 1,
    name: "Source Scanner",
    nameEn: "Source Scanner",
    icon: <Database className="w-4 h-4" />,
    desc: "업체 데이터 원천 자동 조사 — DB, 파일서버, API, 이메일, 설비 로그",
    phase: 1,
    status: "done",
    progress: 100,
    companies: [
      { name: "A업체", done: true },
      { name: "B업체", done: true },
      { name: "C업체", done: true },
      { name: "D업체", done: true },
    ],
    inputTypes: ["DB 연결정보", "파일서버 경로", "API 엔드포인트"],
    outputTypes: ["데이터 원천 목록", "소유부서", "갱신주기", "보안등급"],
  },
  {
    id: 2,
    name: "Schema Profiler",
    nameEn: "Schema Profiler",
    icon: <GitBranch className="w-4 h-4" />,
    desc: "정형 데이터 구조 분석 — 컬럼명·타입·Null비율·중복률·코드값",
    phase: 1,
    status: "in_progress",
    progress: 75,
    companies: [
      { name: "A업체", done: true },
      { name: "B업체", done: true },
      { name: "C업체", done: true },
      { name: "D업체", done: false },
    ],
    inputTypes: ["ERP 테이블", "Excel", "CSV"],
    outputTypes: ["스키마 분석 보고서", "Canonical 매핑 추천"],
    eta: "2026 Q3",
  },
  {
    id: 3,
    name: "Document Parser",
    nameEn: "Document Parser",
    icon: <FileText className="w-4 h-4" />,
    desc: "비정형 문서 구조화 — PDF, Word, 작업표준서, 검사성적서, 계약서",
    phase: 2,
    status: "in_progress",
    progress: 70,
    companies: [
      { name: "A업체", done: true },
      { name: "B업체", done: false },
      { name: "C업체", done: false },
      { name: "D업체", done: true },
    ],
    inputTypes: ["PDF", "Word", "PPT", "스캔 문서"],
    outputTypes: ["구조화 텍스트", "표 추출", "엔티티 목록", "청크"],
    eta: "2026 Q3",
  },
  {
    id: 4,
    name: "Data Cleaner",
    nameEn: "Data Cleaner",
    icon: <Wrench className="w-4 h-4" />,
    desc: "날짜 표준화·단위 변환·중복 제거·결측치 처리·이상값 탐지",
    phase: 2,
    status: "in_progress",
    progress: 80,
    companies: [
      { name: "A업체", done: true },
      { name: "B업체", done: true },
      { name: "C업체", done: false },
      { name: "D업체", done: false },
    ],
    inputTypes: ["원천 데이터", "Schema Profiler 결과"],
    outputTypes: ["정제된 데이터", "이상값 리포트", "변환 이력"],
    eta: "2026 Q3",
  },
  {
    id: 5,
    name: "Entity Resolver",
    nameEn: "Entity Resolver",
    icon: <Users className="w-4 h-4" />,
    desc: "동일 엔티티 통합 — 삼성전자·Samsung Electronics·삼성전자(주) → CUST_0001",
    phase: 1,
    status: "in_progress",
    progress: 25,
    companies: [
      { name: "A업체", done: true },
      { name: "B업체", done: false },
      { name: "C업체", done: false },
      { name: "D업체", done: false },
    ],
    inputTypes: ["정제된 Customer", "정제된 Product/Material"],
    outputTypes: ["Canonical ID 매핑", "병합 이력", "Human Review 큐"],
    eta: "2026 Q3",
  },
  {
    id: 6,
    name: "Canonical Mapper",
    nameEn: "Canonical Mapper",
    icon: <GitBranch className="w-4 h-4" />,
    desc: "업체별 컬럼 → 표준 Canonical 모델 매핑 (ITEM_CD → Product.product_id)",
    phase: 1,
    status: "in_progress",
    progress: 25,
    companies: [
      { name: "A업체", done: true },
      { name: "B업체", done: false },
      { name: "C업체", done: false },
      { name: "D업체", done: false },
    ],
    inputTypes: ["Schema Profiler 결과", "Entity Resolver 결과"],
    outputTypes: ["Canonical 필드 매핑표", "미승인 매핑 목록"],
    eta: "2026 Q3",
  },
  {
    id: 7,
    name: "Ontology Mapper",
    nameEn: "10M Ontology Mapper",
    icon: <Network className="w-4 h-4" />,
    desc: "Canonical 데이터를 10M 온톨로지 12개 도메인에 배치",
    phase: 1,
    status: "in_progress",
    progress: 25,
    companies: [
      { name: "A업체", done: true },
      { name: "B업체", done: false },
      { name: "C업체", done: false },
      { name: "D업체", done: false },
    ],
    inputTypes: ["Canonical 모델"],
    outputTypes: ["도메인 배치 결과", "관계 유형 태그"],
    eta: "2026 Q3",
  },
  {
    id: 8,
    name: "Graph Builder",
    nameEn: "Graph Builder",
    icon: <Share2 className="w-4 h-4" />,
    desc: "노드·관계 생성 — Supplier→Material→Product→Process→Machine",
    phase: 2,
    status: "planned",
    progress: 0,
    companies: [
      { name: "A업체", done: false },
      { name: "B업체", done: false },
      { name: "C업체", done: false },
      { name: "D업체", done: false },
    ],
    inputTypes: ["Ontology Mapper 결과", "Canonical 데이터"],
    outputTypes: ["Neo4j / 그래프 DB", "Knowledge Graph"],
    eta: "2026 Q4",
  },
  {
    id: 9,
    name: "Quality Validator",
    nameEn: "Quality Validator",
    icon: <CheckSquare className="w-4 h-4" />,
    desc: "필수 필드 누락·중복·관계 오류·단위 불일치·신뢰도 검증",
    phase: 2,
    status: "planned",
    progress: 0,
    companies: [
      { name: "A업체", done: false },
      { name: "B업체", done: false },
      { name: "C업체", done: false },
      { name: "D업체", done: false },
    ],
    inputTypes: ["Graph Builder 결과", "모든 매핑 결과"],
    outputTypes: ["품질 점수", "이슈 목록", "검증 리포트"],
    eta: "2026 Q4",
  },
  {
    id: 10,
    name: "Human Review Console",
    nameEn: "Human Review Console",
    icon: <Eye className="w-4 h-4" />,
    desc: "AI가 애매한 항목을 사람에게 넘기는 Review UI — 신뢰도·근거 제시",
    phase: 2,
    status: "in_progress",
    progress: 90,
    companies: [
      { name: "A업체", done: false },
      { name: "B업체", done: false },
      { name: "C업체", done: false },
      { name: "D업체", done: false },
    ],
    inputTypes: ["Entity Resolver 낮은 신뢰도", "Canonical Mapper 미승인"],
    outputTypes: ["승인/거절 결정", "매핑 이력 DB"],
    eta: "2026 Q3",
  },
  {
    id: 11,
    name: "MES Viewer",
    nameEn: "MES Viewer",
    icon: <Factory className="w-4 h-4" />,
    desc: "공정 타임라인·설비 가동률·이상값 경보 — MES/설비 CSV 로그 시각화",
    phase: 2,
    status: "in_progress",
    progress: 85,
    companies: [
      { name: "A업체", done: true },
      { name: "B업체", done: false },
      { name: "C업체", done: false },
      { name: "D업체", done: false },
    ],
    inputTypes: ["MES 공정 데이터", "설비 CSV 로그", "IoT 센서값"],
    outputTypes: ["공정 타임라인", "가동률 대시보드", "경보 목록"],
    eta: "2026 Q3",
  },
  {
    id: 12,
    name: "Pipeline Runner",
    nameEn: "Pipeline Runner",
    icon: <Share2 className="w-4 h-4" />,
    desc: "10단계 파이프라인 실행 시뮬레이션 — 업체 선택 후 Step-by-step 실행",
    phase: 3,
    status: "in_progress",
    progress: 90,
    companies: [
      { name: "A업체", done: true },
      { name: "B업체", done: false },
      { name: "C업체", done: false },
      { name: "D업체", done: false },
    ],
    inputTypes: ["전체 파이프라인 모듈"],
    outputTypes: ["실행 결과 요약", "단계별 처리 통계"],
    eta: "2026 Q3",
  },
  {
    id: 13,
    name: "Agent Monitor",
    nameEn: "Agent Monitor",
    icon: <CheckSquare className="w-4 h-4" />,
    desc: "AI Agent 결정 로그 타임라인 — 단계별 신뢰도·근거·토큰 사용량 추적",
    phase: 3,
    status: "in_progress",
    progress: 90,
    companies: [
      { name: "A업체", done: true },
      { name: "B업체", done: false },
      { name: "C업체", done: false },
      { name: "D업체", done: false },
    ],
    inputTypes: ["각 파이프라인 단계 AI 결정"],
    outputTypes: ["결정 로그", "escalation 현황"],
    eta: "2026 Q3",
  },
  {
    id: 15,
    name: "API Connector",
    nameEn: "API Connector",
    icon: <Plug className="w-4 h-4" />,
    desc: "외부 ERP·MES REST API 등록, OAuth/API Key 인증, 스키마 자동 탐색, 실시간 동기화",
    phase: 4,
    status: "in_progress",
    progress: 90,
    companies: [
      { name: "A업체", done: true },
      { name: "B업체", done: true },
      { name: "C업체", done: false },
      { name: "D업체", done: true },
    ],
    inputTypes: ["REST API 엔드포인트", "인증 정보"],
    outputTypes: ["스키마 필드 목록", "실시간 레코드", "동기화 이력"],
    eta: "2027 Q1",
  },
  {
    id: 16,
    name: "Email Parser",
    nameEn: "Email Parser",
    icon: <Mail className="w-4 h-4" />,
    desc: "이메일·카카오톡·Slack 발주 메시지에서 구조화 필드 자동 추출 — 신뢰도 기반 Human Review 연동",
    phase: 4,
    status: "in_progress",
    progress: 90,
    companies: [
      { name: "A업체", done: true },
      { name: "B업체", done: true },
      { name: "C업체", done: false },
      { name: "D업체", done: true },
    ],
    inputTypes: ["이메일 본문", "카카오톡 메시지", "Slack 알림"],
    outputTypes: ["구조화 발주 데이터", "신뢰도 점수", "Human Review 큐"],
    eta: "2027 Q1",
  },
  {
    id: 17,
    name: "News Monitor",
    nameEn: "News Monitor",
    icon: <Newspaper className="w-4 h-4" />,
    desc: "공급망 관련 뉴스 실시간 수집 — 원자재 가격·물류 리스크·협력사 이슈 탐지",
    phase: 4,
    status: "in_progress",
    progress: 90,
    companies: [
      { name: "A업체", done: true },
      { name: "B업체", done: true },
      { name: "C업체", done: true },
      { name: "D업체", done: true },
    ],
    inputTypes: ["뉴스 RSS 피드", "키워드 설정"],
    outputTypes: ["위험 신호 분류", "연관 업체·품목 매핑", "담당자 알림"],
    eta: "2027 Q1",
  },
  {
    id: 18,
    name: "APS Planner",
    nameEn: "APS Planner",
    icon: <CalendarClock className="w-4 h-4" />,
    desc: "시나리오별 수요·재고·입고 계획 비교 — 납기 위험 품목 조기 식별 및 긴급 발주 지원",
    phase: 4,
    status: "in_progress",
    progress: 90,
    companies: [
      { name: "A업체", done: true },
      { name: "B업체", done: true },
      { name: "C업체", done: false },
      { name: "D업체", done: true },
    ],
    inputTypes: ["수주 데이터", "재고 현황", "입고 예정"],
    outputTypes: ["수급 갭 분석", "납기 위험 목록", "긴급 발주 권고"],
    eta: "2027 Q1",
  },
  {
    id: 14,
    name: "Onboarding Report",
    nameEn: "Onboarding Report",
    icon: <Users className="w-4 h-4" />,
    desc: "업체별 AI-Readiness 점수 + 6대 품질 지표 레이더 차트 + PDF 다운로드",
    phase: 3,
    status: "in_progress",
    progress: 90,
    companies: [
      { name: "A업체", done: true },
      { name: "B업체", done: true },
      { name: "C업체", done: true },
      { name: "D업체", done: true },
    ],
    inputTypes: ["Quality Validator 결과", "전체 파이프라인 완료 현황"],
    outputTypes: ["AI-Readiness 점수", "레이더 차트", "PDF 리포트"],
    eta: "2026 Q3",
  },
];

const mvpConfig = {
  1: {
    label: "MVP 1",
    sub: "Excel + ERP DB + PDF",
    color: "blue",
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-600 text-white",
    bar: "bg-blue-500",
    eta: "2026 Q2–Q3",
  },
  2: {
    label: "MVP 2",
    sub: "MES + 설비 CSV + 품질문서",
    color: "violet",
    bg: "bg-violet-50",
    border: "border-violet-200",
    badge: "bg-violet-600 text-white",
    bar: "bg-violet-500",
    eta: "2026 Q4",
  },
  3: {
    label: "MVP 3",
    sub: "Pipeline Runner + Agent Monitor + Report",
    color: "emerald",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    badge: "bg-emerald-600 text-white",
    bar: "bg-emerald-500",
    eta: "2026 Q3",
  },
  4: {
    label: "MVP 4",
    sub: "API + 이메일 + 뉴스 + APS",
    color: "orange",
    bg: "bg-orange-50",
    border: "border-orange-200",
    badge: "bg-orange-600 text-white",
    bar: "bg-orange-500",
    eta: "2027 Q1–Q2",
  },
};

const statusConfig: Record<ModuleStatus, { label: string; icon: React.ReactNode; color: string }> = {
  done: { label: "완료", icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  in_progress: { label: "진행중", icon: <Clock className="w-3.5 h-3.5" />, color: "text-blue-600 bg-blue-50 border-blue-200" },
  planned: { label: "예정", icon: <Circle className="w-3.5 h-3.5" />, color: "text-slate-500 bg-slate-50 border-slate-200" },
  blocked: { label: "차단됨", icon: <Circle className="w-3.5 h-3.5" />, color: "text-rose-600 bg-rose-50 border-rose-200" },
};

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
    </div>
  );
}

export default function Roadmap() {
  const [selected, setSelected] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"lane" | "table">("lane");

  const selModule = modules.find(m => m.id === selected);

  const mvpModules = (phase: MvpPhase) => modules.filter(m => m.phase === phase);
  const mvpProgress = (phase: MvpPhase) => {
    const mods = mvpModules(phase);
    return Math.round(mods.reduce((s, m) => s + m.progress, 0) / mods.length);
  };

  const totalDone = modules.filter(m => m.status === "done").length;
  const totalInProgress = modules.filter(m => m.status === "in_progress").length;
  const overallProgress = Math.round(modules.reduce((s, m) => s + m.progress, 0) / modules.length);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Product Roadmap</h1>
          <p className="text-slate-500 mt-1">10개 모듈 × MVP 3단계 개발 현황 — 내부 팀 전용</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setViewMode("lane")} className={`px-3 py-1.5 text-sm rounded-lg border font-medium transition-colors ${viewMode === "lane" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
            레인 뷰
          </button>
          <button onClick={() => setViewMode("table")} className={`px-3 py-1.5 text-sm rounded-lg border font-medium transition-colors ${viewMode === "table" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
            테이블 뷰
          </button>
        </div>
      </div>

      {/* 전체 진행률 */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm col-span-1">
          <div className="text-xs text-slate-500 mb-2">전체 진행률</div>
          <div className="text-3xl font-bold text-slate-900 mb-2">{overallProgress}%</div>
          <ProgressBar value={overallProgress} color="bg-slate-800" />
          <div className="flex gap-3 mt-3 text-xs">
            <span className="text-emerald-600">완료 {totalDone}개</span>
            <span className="text-blue-600">진행중 {totalInProgress}개</span>
            <span className="text-slate-400">예정 {modules.length - totalDone - totalInProgress}개</span>
          </div>
        </div>
        {([1, 2, 3, 4] as MvpPhase[]).map(phase => {
          const cfg = mvpConfig[phase];
          const prog = mvpProgress(phase);
          return (
            <div key={phase} className={`rounded-xl border p-4 shadow-sm ${cfg.bg} ${cfg.border}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                <span className="text-xs text-slate-500">{cfg.eta}</span>
              </div>
              <div className="text-sm font-medium text-slate-700 mt-2 mb-3">{cfg.sub}</div>
              <div className="text-2xl font-bold text-slate-900 mb-2">{prog}%</div>
              <ProgressBar value={prog} color={cfg.bar} />
              <div className="text-xs text-slate-500 mt-2">{mvpModules(phase).length}개 모듈</div>
            </div>
          );
        })}
      </div>

      {viewMode === "lane" ? (
        <div className="space-y-8">
          {([1, 2, 3, 4] as MvpPhase[]).map(phase => {
            const cfg = mvpConfig[phase];
            const mods = mvpModules(phase);
            return (
              <div key={phase}>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                  <span className="font-semibold text-slate-900">{cfg.sub}</span>
                  <span className="text-sm text-slate-400">{cfg.eta}</span>
                  <div className="flex-1 h-px bg-slate-200 ml-2" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {mods.map(mod => {
                    const sc = statusConfig[mod.status];
                    const isSelected = selected === mod.id;
                    return (
                      <div
                        key={mod.id}
                        onClick={() => setSelected(isSelected ? null : mod.id)}
                        className={`bg-white rounded-xl border shadow-sm p-4 cursor-pointer transition-all hover:shadow-md ${isSelected ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${cfg.bg}`}>
                              {mod.icon}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 text-sm">{mod.name}</div>
                              <div className="text-xs text-slate-400">모듈 {mod.id}</div>
                            </div>
                          </div>
                          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${sc.color}`}>
                            {sc.icon}
                            {sc.label}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 mb-3 leading-relaxed">{mod.desc}</p>

                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>진행률</span>
                            <span className="font-medium text-slate-600">{mod.progress}%</span>
                          </div>
                          <ProgressBar value={mod.progress} color={cfg.bar} />
                        </div>

                        <div className="flex gap-1 flex-wrap">
                          {mod.companies.map(co => (
                            <div
                              key={co.name}
                              className={`text-xs px-2 py-0.5 rounded-full ${co.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}
                            >
                              {co.name}
                            </div>
                          ))}
                        </div>

                        {isSelected && (
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-1">입력</p>
                              <div className="flex flex-wrap gap-1">
                                {mod.inputTypes.map(t => <span key={t} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{t}</span>)}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-1">출력</p>
                              <div className="flex flex-wrap gap-1">
                                {mod.outputTypes.map(t => <span key={t} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{t}</span>)}
                              </div>
                            </div>
                            {mod.eta && <p className="text-xs text-slate-400">예상 완료: {mod.eta}</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* MVP 3 예고 */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-bold px-3 py-1 rounded-full bg-emerald-600 text-white">MVP 3 예고</span>
              <span className="text-sm text-slate-600">API + 이메일 + 뉴스 + APS — 2027 Q1 이후</span>
            </div>
            <div className="flex gap-3 text-sm text-slate-600">
              {["실시간 API 연결", "이메일·메신저 파싱", "뉴스·외부 데이터", "APS 계획 데이터", "멀티 테넌트 확장"].map(f => (
                <div key={f} className="flex items-center gap-1.5">
                  <Circle className="w-3 h-3 text-emerald-400" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // 테이블 뷰
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["#", "모듈명", "MVP", "상태", "진행률", "A업체", "B업체", "C업체", "D업체", "ETA"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {modules.map(mod => {
                const sc = statusConfig[mod.status];
                const cfg = mvpConfig[mod.phase];
                return (
                  <tr key={mod.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-xs">{mod.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded ${cfg.bg}`}>{mod.icon}</div>
                        <span className="font-medium text-slate-900">{mod.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border w-fit ${sc.color}`}>
                        {sc.icon}{sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 w-28">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${cfg.bar} rounded-full`} style={{ width: `${mod.progress}%` }} />
                        </div>
                        <span className="text-xs font-medium text-slate-600 w-8 text-right">{mod.progress}%</span>
                      </div>
                    </td>
                    {mod.companies.map(co => (
                      <td key={co.name} className="px-4 py-3 text-center">
                        {co.done
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                          : <Circle className="w-4 h-4 text-slate-200 mx-auto" />
                        }
                      </td>
                    ))}
                    <td className="px-4 py-3 text-xs text-slate-400">{mod.eta || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 파이프라인 흐름 */}
      <div className="bg-slate-900 rounded-xl p-5 text-white">
        <h2 className="font-semibold text-slate-300 mb-4 text-sm">온보딩 파이프라인 — 데이터 흐름</h2>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {modules.map((mod, i) => {
            const isDone = mod.status === "done";
            const isInProgress = mod.status === "in_progress";
            return (
              <div key={mod.id} className="flex items-center gap-1 shrink-0">
                {i > 0 && <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />}
                <div className={`text-center px-3 py-2 rounded-lg border text-xs font-medium ${isDone ? "bg-emerald-900 border-emerald-700 text-emerald-300" : isInProgress ? "bg-blue-900 border-blue-700 text-blue-300" : "bg-slate-800 border-slate-700 text-slate-500"}`}>
                  <div>{mod.name}</div>
                  <div className="text-xs opacity-60 mt-0.5">MVP {mod.phase}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />완료</span>
          <span className="flex items-center gap-1.5 text-blue-400"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />진행중</span>
          <span className="flex items-center gap-1.5 text-slate-500"><span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />예정</span>
        </div>
      </div>
    </div>
  );
}
