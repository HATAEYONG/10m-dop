"use client";

import Link from "next/link";
import {
  Upload, Database, MessageSquareText, ArrowRight, CheckCircle2,
  AlertCircle, Zap, FileText, Radio, Mail, TrendingUp, Bot,
  ChevronRight, Play, CircleDot,
} from "lucide-react";

// ── AX Readiness 게이지 ───────────────────────────────────────────
const AX_SCORE = 61;

function AXGauge({ score }: { score: number }) {
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#3b82f6" : score >= 40 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "LLM 질의 가능" : score >= 60 ? "표준화 진행중" : score >= 40 ? "데이터 부족" : "적재 필요";
  const r = 52, cx = 64, cy = 64;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ * 0.75;
  const gap = circ - dash;
  const rotation = 135;
  return (
    <div className="flex flex-col items-center">
      <svg width="128" height="96" viewBox="0 0 128 128">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="10"
          strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(${rotation} ${cx} ${cy})`} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${gap + circ * 0.25}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(${rotation} ${cx} ${cy})`} />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="22" fontWeight="700" fill="#0f172a">{score}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fill="#64748b">/ 100</text>
      </svg>
      <div className="text-xs font-semibold mt-1" style={{ color }}>{label}</div>
    </div>
  );
}

// ── 데이터 적재 현황 ──────────────────────────────────────────────
const DATA_STATUS = [
  { type: "정형", icon: Database, count: 182400, unit: "레코드", color: "text-blue-600 bg-blue-50", fill: 72, sources: ["더존 ERP", "SAP ERP", "MES CSV"] },
  { type: "반정형", icon: Radio, count: 4820, unit: "이벤트/일", color: "text-violet-600 bg-violet-50", fill: 48, sources: ["Sensor Gateway", "JSON API", "Email"] },
  { type: "비정형", icon: FileText, count: 216, unit: "문서", color: "text-amber-600 bg-amber-50", fill: 31, sources: ["PDF 작업표준서", "이미지 검사서", "카카오톡"] },
];

// ── 표준화 파이프라인 단계 ─────────────────────────────────────────
const PIPELINE = [
  { id: 1, name: "적재",    sub: "Ingest",        done: true  },
  { id: 2, name: "스키마",  sub: "Schema Map",    done: true  },
  { id: 3, name: "정제",    sub: "Clean",         done: true  },
  { id: 4, name: "엔티티",  sub: "Entity Merge",  done: false },
  { id: 5, name: "온톨로지", sub: "10M Mapping",  done: false },
  { id: 6, name: "그래프",  sub: "Graph Build",   done: false },
  { id: 7, name: "LLM 준비", sub: "Embed + Index", done: false },
];

// ── 최근 활동 ────────────────────────────────────────────────────
const RECENT = [
  { time: "14:23", text: "A업체 SAP MARA 자재 마스터 → Material 도메인 매핑 완료 (97%)", type: "success" },
  { time: "14:19", text: "C업체 '수량' 컬럼 매핑 모호 — Human Review 에스컬레이션", type: "warn" },
  { time: "14:11", text: "B업체 설비 CSV 1,240건 정제 완료 · 중복 18건 제거", type: "success" },
  { time: "13:58", text: "D업체 PDF 검사성적서 표 구조 불일치 — 파서 재구성 필요", type: "error" },
];

// ── 빠른 진입 카드 ────────────────────────────────────────────────
const STEPS = [
  {
    step: "STEP 1",
    title: "데이터 적재",
    desc: "정형·반정형·비정형 데이터를 한 곳에서 업로드·연결",
    href: "/ingest",
    icon: Upload,
    color: "from-blue-600 to-blue-700",
    badge: "3종 데이터",
  },
  {
    step: "STEP 2",
    title: "표준화 파이프라인",
    desc: "10M 마스터 도메인으로 스키마 매핑·정제·온톨로지 구축",
    href: "/pipeline-runner",
    icon: Play,
    color: "from-violet-600 to-violet-700",
    badge: "7단계",
  },
  {
    step: "STEP 3",
    title: "AI 질의 (AX Chat)",
    desc: "표준화된 데이터로 LLM에게 실제 제조 데이터 질의",
    href: "/ax-chat",
    icon: MessageSquareText,
    color: "from-emerald-600 to-emerald-700",
    badge: "GraphRAG",
  },
];

export default function Dashboard() {
  const currentStep = 3; // 파이프라인 현재 위치

  return (
    <div className="p-6 space-y-6">

      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">10M DOP · AX 전환 플랫폼</h1>
          <p className="text-slate-500 mt-1">
            정형·반정형·비정형 데이터를 표준화하여 LLM이 제조 데이터에 자연어로 답할 수 있는 상태를 만듭니다
          </p>
        </div>
        <Link href="/roadmap" className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
          로드맵 보기 <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* ── 3단계 여정 카드 ── */}
      <div className="grid grid-cols-3 gap-4">
        {STEPS.map(({ step, title, desc, href, icon: Icon, color, badge }) => (
          <Link
            key={href}
            href={href}
            className={`bg-gradient-to-br ${color} rounded-xl p-5 text-white hover:opacity-90 transition-opacity group`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold opacity-70">{step}</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{badge}</span>
            </div>
            <Icon className="w-8 h-8 mb-3 opacity-90" />
            <h2 className="font-bold text-lg leading-tight">{title}</h2>
            <p className="text-sm opacity-75 mt-1 leading-relaxed">{desc}</p>
            <div className="mt-4 flex items-center gap-1 text-sm font-medium opacity-80 group-hover:opacity-100">
              시작하기 <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        ))}
      </div>

      {/* ── AX Readiness + 데이터 현황 ── */}
      <div className="grid grid-cols-4 gap-4">

        {/* AX Readiness 게이지 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col items-center justify-center">
          <p className="text-xs font-semibold text-slate-500 mb-2">AX Readiness</p>
          <AXGauge score={AX_SCORE} />
          <p className="text-xs text-slate-400 mt-2 text-center">LLM 질의 가능 상태까지<br /><strong className="text-slate-600">39점</strong> 남음</p>
        </div>

        {/* 데이터 유형별 현황 3개 */}
        {DATA_STATUS.map(({ type, icon: Icon, count, unit, color, fill, sources }) => (
          <div key={type} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs text-slate-400">{type} 데이터</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {count.toLocaleString()}
              <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>
            </div>
            <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-current rounded-full transition-all" style={{ width: `${fill}%` }} />
            </div>
            <div className="text-xs text-slate-400 mt-1">표준화 완료 {fill}%</div>
            <div className="mt-2 flex gap-1 flex-wrap">
              {sources.map(s => (
                <span key={s} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{s}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── 파이프라인 진행 상태 ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">표준화 파이프라인 진행 상태</h2>
          <Link href="/pipeline-runner" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
            파이프라인 실행 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="flex items-center gap-0">
          {PIPELINE.map((p, i) => (
            <div key={p.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                  p.done
                    ? "bg-emerald-500 border-emerald-500"
                    : i === currentStep
                    ? "bg-blue-500 border-blue-500 ring-4 ring-blue-100"
                    : "bg-white border-slate-200"
                }`}>
                  {p.done
                    ? <CheckCircle2 className="w-5 h-5 text-white" />
                    : i === currentStep
                    ? <CircleDot className="w-5 h-5 text-white" />
                    : <span className="text-xs text-slate-400">{p.id}</span>
                  }
                </div>
                <div className="mt-2 text-center">
                  <div className={`text-xs font-semibold ${p.done ? "text-emerald-600" : i === currentStep ? "text-blue-600" : "text-slate-400"}`}>{p.name}</div>
                  <div className="text-xs text-slate-300">{p.sub}</div>
                </div>
              </div>
              {i < PIPELINE.length - 1 && (
                <div className={`h-0.5 w-full mx-1 rounded-full transition-all ${p.done ? "bg-emerald-400" : "bg-slate-200"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 하단 2열: 최근 활동 + 바로 가기 ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* 최근 활동 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">최근 활동</h2>
            <Link href="/agent-monitor" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              전체 로그 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {RECENT.map((r, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${r.type === "success" ? "bg-emerald-400" : r.type === "warn" ? "bg-amber-400" : "bg-rose-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-600 leading-relaxed">{r.text}</p>
                </div>
                <span className="text-xs text-slate-300 shrink-0">{r.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 빠른 이동 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-3">주요 화면 바로 가기</h2>
          <div className="space-y-1.5">
            {[
              { href: "/ingest",         label: "Data Ingestion Hub",  sub: "3종 데이터 통합 적재", icon: Upload },
              { href: "/schema-mapping", label: "Schema Mapping",       sub: "컬럼 표준화 · 14건 대기", icon: TrendingUp },
              { href: "/human-review",   label: "Human Review",         sub: "AI 저신뢰 · 5건 검토 필요", icon: AlertCircle },
              { href: "/ax-chat",        label: "AX Chat",              sub: "LLM 자연어 질의", icon: MessageSquareText },
              { href: "/agent-monitor",  label: "Agent Monitor",        sub: "AI 결정 로그", icon: Bot },
              { href: "/governance",     label: "Governance",           sub: "오너십·SLA·컴플라이언스", icon: Zap },
            ].map(({ href, label, sub, icon: Icon }) => (
              <Link key={href} href={href} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors group">
                <Icon className="w-4 h-4 text-slate-400 group-hover:text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700 group-hover:text-blue-600">{label}</div>
                  <div className="text-xs text-slate-400">{sub}</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400" />
              </Link>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
