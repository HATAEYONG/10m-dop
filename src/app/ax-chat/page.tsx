"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageSquareText, Send, Bot, User, Sparkles, Database,
  Share2, AlertCircle, CheckCircle2, RefreshCw, ChevronDown,
} from "lucide-react";

// ── 샘플 Q&A ─────────────────────────────────────────────────────
interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  sources?: string[];
  nodes?: string[];
  confidence?: number;
  thinking?: boolean;
}

const PRESET_QUESTIONS = [
  "AL6061 재고가 부족한 공급사는 어디입니까?",
  "이번 달 불량률이 가장 높은 공정은?",
  "납기 지연 위험이 있는 주문 목록을 알려줘",
  "Machine 도메인에서 최근 이상 감지된 설비는?",
  "고객별 월별 발주 추이를 요약해줘",
];

const BOT_ANSWERS: Record<string, Omit<Message, "id" | "role">> = {
  "AL6061 재고가 부족한 공급사는 어디입니까?": {
    text: `**Material 도메인 조회 결과:**\n\n현재 AL6061-T6 기준으로 재고 부족 위험 공급사는 **2곳**입니다.\n\n• **㈜대성금속** — 현재 재고 120kg, 안전재고(300kg) 대비 **60% 부족**. 리드타임 3주 고려 시 즉시 발주 필요.\n• **한국알루미늄** — 현재 재고 280kg, 안전재고 300kg 대비 **소폭 부족**. 1주 내 발주 권고.\n\n→ Supply Chain Twin에서 충격 시나리오를 확인하거나, 발주 요청을 생성하시겠습니까?`,
    sources: ["Material.mat_cd = AL6061", "Supplier.stock_qty", "Order.lead_time"],
    nodes: ["Material#AL6061", "Supplier#대성금속", "Supplier#한국알루미늄"],
    confidence: 91,
  },
  "이번 달 불량률이 가장 높은 공정은?": {
    text: `**Measurement + Process 도메인 교차 조회 결과:**\n\n2026년 6월 기준 공정별 불량률:\n\n| 공정 | 불량률 | 전월 대비 |\n|------|--------|----------|\n| **CNC 정밀 가공** | **4.2%** | ↑ +1.1% |\n| 표면 처리 | 2.8% | → 동일 |\n| 조립 | 1.4% | ↓ -0.3% |\n\nCNC 정밀 가공 공정의 불량률이 가장 높으며 전월 대비 악화되었습니다. Machine 도메인 조회 결과 **spindle_rpm 편차** 증가가 원인으로 추정됩니다.`,
    sources: ["Measurement.defect_rate", "Process.proc_nm", "Machine.spindle_rpm"],
    nodes: ["Process#CNC가공", "Measurement#2026-06", "Machine#CNC-S7-1500"],
    confidence: 87,
  },
  "납기 지연 위험이 있는 주문 목록을 알려줘": {
    text: `**Order + Supplier + Machine 도메인 통합 조회 결과:**\n\n납기 지연 위험 주문 **3건** 탐지:\n\n1. **ORD-2026-0412** (삼성전자향) — D-3일, AL6061 재고 부족으로 생산 대기 중\n2. **ORD-2026-0398** (현대자동차향) — D-7일, CNC 설비 가동률 저하로 일정 지연 예상\n3. **ORD-2026-0445** (LG전자향) — D-12일, 표면처리 외주 업체 납기 지연 신호\n\n→ APS Planner에서 일정 재조정을 시작하시겠습니까?`,
    sources: ["Order.due_date", "Supplier.lead_time", "Machine.utilization_rate"],
    nodes: ["Order#0412", "Customer#삼성전자", "Supplier#AL재고"],
    confidence: 83,
  },
};

function TypingDots() {
  return (
    <div className="flex gap-1 items-center py-1">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-slate-300 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("**") && line.endsWith("**") && !line.slice(2, -2).includes("**")) {
          return <p key={i} className="font-semibold text-slate-800">{line.slice(2, -2)}</p>;
        }
        if (line.startsWith("| ")) {
          const cells = line.split("|").filter(c => c.trim());
          return (
            <div key={i} className="flex gap-4 font-mono text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
              {cells.map((c, j) => <span key={j} className="flex-1">{c.trim()}</span>)}
            </div>
          );
        }
        if (line.startsWith("• ") || line.startsWith("- ")) {
          const content = line.slice(2);
          return (
            <p key={i} className="flex items-start gap-2 text-slate-700">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
              <span dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
            </p>
          );
        }
        if (line.startsWith("→ ")) {
          return (
            <p key={i} className="text-blue-600 font-medium flex items-center gap-1">
              <span>→</span>
              <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
            </p>
          );
        }
        if (line.trim() === "" || line.startsWith("|---")) return null;
        return (
          <p key={i} className="text-slate-700"
            dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
        );
      })}
    </div>
  );
}

export default function AXChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: "assistant",
      text: "안녕하세요. 저는 10M 지식 그래프에 연결된 AX Chat입니다.\n\n제조 데이터에 대해 자연어로 질문해 주세요. Material, Product, Customer, Supplier, Order, BOM, Process, Machine, Measurement, Maintenance 도메인의 데이터를 검색합니다.",
      sources: [],
      nodes: [],
      confidence: 100,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSources, setShowSources] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now(), role: "user", text };
    setMessages(prev => [...prev, userMsg, { id: Date.now() + 1, role: "assistant", text: "", thinking: true }]);
    setInput("");
    setLoading(true);
    await new Promise(r => setTimeout(r, 1400));
    const answer = BOT_ANSWERS[text] ?? {
      text: `**10M 지식 그래프 조회 완료**\n\n질의하신 "${text}"에 대해 현재 적재된 데이터를 검색했습니다.\n\n관련 도메인에서 데이터를 찾았으나, 정확한 답변을 위해 추가 데이터 표준화가 필요합니다. Data Ingestion Hub에서 관련 데이터를 먼저 적재해 주세요.\n\n→ /ingest 에서 관련 데이터를 업로드하면 더 정확한 답변이 가능합니다.`,
      sources: ["10M Knowledge Graph"],
      nodes: [],
      confidence: 42,
    };
    setMessages(prev => [
      ...prev.slice(0, -1),
      { id: Date.now() + 2, role: "assistant", ...answer },
    ]);
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] p-6 gap-4">

      {/* 헤더 */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-emerald-600" />
            AX Chat
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">10M 지식 그래프 기반 제조 데이터 자연어 질의</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            GraphRAG 연결됨
          </div>
          <div className="flex gap-2 text-xs text-slate-500">
            <span className="bg-slate-100 px-2 py-1 rounded">노드 1,240</span>
            <span className="bg-slate-100 px-2 py-1 rounded">엣지 3,871</span>
          </div>
        </div>
      </div>

      {/* 프리셋 질문 */}
      <div className="flex gap-2 flex-wrap shrink-0">
        {PRESET_QUESTIONS.map(q => (
          <button
            key={q}
            onClick={() => send(q)}
            disabled={loading}
            className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-all disabled:opacity-40"
          >
            {q}
          </button>
        ))}
      </div>

      {/* 채팅 창 */}
      <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === "assistant" ? "bg-emerald-100" : "bg-blue-100"
            }`}>
              {msg.role === "assistant"
                ? <Bot className="w-4 h-4 text-emerald-600" />
                : <User className="w-4 h-4 text-blue-600" />
              }
            </div>
            <div className={`max-w-xl ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
              <div className={`rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-blue-600 text-white text-sm"
                  : "bg-slate-50 border border-slate-100"
              }`}>
                {msg.thinking
                  ? <TypingDots />
                  : msg.role === "user"
                  ? <p className="text-sm">{msg.text}</p>
                  : <MarkdownText text={msg.text} />
                }
              </div>

              {/* 소스 / 신뢰도 */}
              {msg.role === "assistant" && !msg.thinking && msg.sources && msg.sources.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {msg.confidence !== undefined && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      msg.confidence >= 80 ? "text-emerald-600 bg-emerald-50"
                      : msg.confidence >= 60 ? "text-blue-600 bg-blue-50"
                      : "text-amber-600 bg-amber-50"
                    }`}>
                      신뢰도 {msg.confidence}%
                    </span>
                  )}
                  <button
                    onClick={() => setShowSources(showSources === msg.id ? null : msg.id)}
                    className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                  >
                    <Database className="w-3 h-3" />
                    소스 {msg.sources.length}건
                    <ChevronDown className={`w-3 h-3 transition-transform ${showSources === msg.id ? "rotate-180" : ""}`} />
                  </button>
                  {msg.nodes && msg.nodes.length > 0 && (
                    <button className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                      <Share2 className="w-3 h-3" />
                      그래프 노드 {msg.nodes.length}건
                    </button>
                  )}
                </div>
              )}
              {showSources === msg.id && msg.sources && (
                <div className="bg-slate-900 rounded-lg px-3 py-2 flex gap-2 flex-wrap">
                  {msg.sources.map(s => (
                    <span key={s} className="text-xs font-mono text-emerald-400">{s}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 입력 */}
      <div className="shrink-0 flex gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm focus-within:border-emerald-400 transition-colors">
          <Sparkles className="w-4 h-4 text-slate-300 shrink-0" />
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send(input)}
            placeholder="제조 데이터에 대해 자연어로 질문하세요... (Enter)"
            className="flex-1 text-sm outline-none text-slate-700 placeholder:text-slate-300"
            disabled={loading}
          />
          {loading && <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />}
        </div>
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* 상태 바 */}
      <div className="shrink-0 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          10M 온톨로지 연결됨 · 마지막 인덱싱 14:23
        </span>
        <span className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          비정형 데이터 임베딩 진행중 (31%)
        </span>
      </div>

    </div>
  );
}
