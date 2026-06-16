"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, ChevronRight, Database, Users, Package, Settings, DollarSign, BarChart2, Network } from "lucide-react";

interface NodeCard {
  id: string;
  domain: string;
  label: string;
  props: { key: string; value: string }[];
  color: string;
}

interface Message {
  role: "user" | "assistant";
  text: string;
  confidence?: number;
  domains?: string[];
  nodes?: NodeCard[];
  path?: string;
  streaming?: boolean;
}

const DOMAIN_COLOR: Record<string, string> = {
  Customer: "bg-blue-100 text-blue-700",
  Material: "bg-emerald-100 text-emerald-700",
  Product: "bg-violet-100 text-violet-700",
  Process: "bg-amber-100 text-amber-700",
  Machine: "bg-rose-100 text-rose-700",
  Supplier: "bg-cyan-100 text-cyan-700",
  Order: "bg-orange-100 text-orange-700",
  BOM: "bg-indigo-100 text-indigo-700",
  Measurement: "bg-pink-100 text-pink-700",
  Maintenance: "bg-teal-100 text-teal-700",
  Money: "bg-yellow-100 text-yellow-700",
  Method: "bg-slate-100 text-slate-700",
};

const DOMAIN_ICON: Record<string, React.ReactNode> = {
  Customer: <Users className="w-3.5 h-3.5" />,
  Material: <Database className="w-3.5 h-3.5" />,
  Product: <Package className="w-3.5 h-3.5" />,
  Process: <Settings className="w-3.5 h-3.5" />,
  Machine: <BarChart2 className="w-3.5 h-3.5" />,
  Supplier: <Network className="w-3.5 h-3.5" />,
  Money: <DollarSign className="w-3.5 h-3.5" />,
};

const EXAMPLE_QA: { q: string; answer: string; confidence: number; domains: string[]; nodes: NodeCard[]; path: string }[] = [
  {
    q: "A업체에서 삼성전자에 납품하는 부품의 공정 불량률은?",
    answer: "A업체 → 삼성전자(CUST_0001) 납품 부품은 총 **12개 품목**입니다. 최근 3개월 평균 공정 불량률은 **1.8%**이며, 이 중 CNC 선삭 공정(P-CNC-01)에서 발생한 치수 불량이 전체의 63%를 차지합니다. 특히 AL6061-T6 소재 적용 부품(PRD_0041, PRD_0042)에서 불량률이 2.4%로 평균 대비 높게 나타납니다.",
    confidence: 91,
    domains: ["Customer", "Product", "Process", "Measurement"],
    path: "CUST_0001 → PRD_0041 → PROC_CNC01 → MEAS_0089",
    nodes: [
      { id: "CUST_0001", domain: "Customer", label: "삼성전자", props: [{ key: "업종", value: "전자·반도체" }, { key: "납품 품목수", value: "12개" }], color: "blue" },
      { id: "PRD_0041", domain: "Product", label: "정밀 브래킷 A형", props: [{ key: "소재", value: "AL6061-T6" }, { key: "불량률", value: "2.4%" }], color: "violet" },
      { id: "PROC_CNC01", domain: "Process", label: "CNC 선삭 공정", props: [{ key: "설비", value: "CNC-01" }, { key: "주요 불량", value: "치수 이탈" }], color: "amber" },
      { id: "MEAS_0089", domain: "Measurement", label: "치수 검사 #89", props: [{ key: "기준치", value: "±0.05mm" }, { key: "최근 결과", value: "불량 3건" }], color: "pink" },
    ],
  },
  {
    q: "AL6061-T6 자재를 사용하는 모든 제품과 납기일은?",
    answer: "AL6061-T6(MAT_0042)를 사용하는 제품은 **총 7개**입니다. 현재 수주 잔량 기준 납기 현황은 다음과 같습니다:\n\n• PRD_0041 정밀 브래킷 A형 — 2024-04-15 (정상)\n• PRD_0042 하우징 플레이트 — 2024-04-22 (위험: 재고 부족)\n• PRD_0055 어댑터 블록 — 2024-05-03 (정상)\n\n특히 **PRD_0042**는 현재 재고 2.1kg로 수주 소요량 3.8kg에 미달합니다. 즉시 발주 필요.",
    confidence: 87,
    domains: ["Material", "Product", "Order"],
    path: "MAT_0042 → PRD_0041 · PRD_0042 · PRD_0055 → ORD_2024Q1",
    nodes: [
      { id: "MAT_0042", domain: "Material", label: "AL6061-T6", props: [{ key: "현재 재고", value: "2.1 kg" }, { key: "소요량", value: "3.8 kg" }], color: "emerald" },
      { id: "PRD_0042", domain: "Product", label: "하우징 플레이트", props: [{ key: "납기일", value: "2024-04-22" }, { key: "상태", value: "⚠ 재고 위험" }], color: "violet" },
      { id: "ORD_2024Q1", domain: "Order", label: "1Q 수주 묶음", props: [{ key: "총 품목", value: "7개" }, { key: "긴급 건수", value: "1건" }], color: "orange" },
    ],
  },
  {
    q: "지난 분기 CNC-01 설비의 가동률 저하 원인은?",
    answer: "CNC-01(MCH_0001) 지난 분기 가동률은 **74.3%**로 목표치 85% 대비 **10.7%p 미달**했습니다. 주요 원인 분석 결과:\n\n1. **공구 교체 지연** (전체 비가동 중 41%) — 공구 수명 알림 무시로 인한 비계획 정지 8회\n2. **냉각수 유량 부족** (28%) — 필터 교체 주기 초과\n3. **프로그램 오류 수정** (21%) — NC 코드 수정에 따른 재셋업\n\n유지보수 이력(MNT_0034)에 따르면 2월 예방정비가 1주일 지연 시행됐습니다.",
    confidence: 89,
    domains: ["Machine", "Process", "Maintenance"],
    path: "MCH_0001 → MNT_0034 → PROC_CNC01",
    nodes: [
      { id: "MCH_0001", domain: "Machine", label: "CNC-01", props: [{ key: "가동률", value: "74.3%" }, { key: "목표", value: "85%" }], color: "rose" },
      { id: "MNT_0034", domain: "Maintenance", label: "2월 예방정비", props: [{ key: "지연", value: "7일" }, { key: "원인", value: "작업자 부재" }], color: "teal" },
      { id: "TOOL_0021", domain: "Process", label: "절삭공구 교체 이력", props: [{ key: "비계획 정지", value: "8회" }, { key: "손실시간", value: "14.2h" }], color: "amber" },
    ],
  },
  {
    q: "B업체 SAP에서 BOM 변경이 가장 잦은 품목 TOP 3는?",
    answer: "B업체 SAP 데이터 분석 결과, 최근 12개월 BOM 변경 빈도 상위 3개 품목입니다:\n\n1. **어셈블리 A-2201** (BOM_0021) — 변경 11회. 핵심 부품 사양 변경이 반복됨\n2. **샤프트 컴플리트** (BOM_0034) — 변경 8회. 공차 기준 개정\n3. **커버 플레이트 B형** (BOM_0047) — 변경 6회. 협력사 소재 변경 반영\n\nBOM 변경이 잦은 품목은 Graph 상에서 **Product → Material 엣지가 동적**으로 바뀌어 추적이 어렵습니다. Canonical 고정 매핑 후 변경 이력 관리 권장.",
    confidence: 83,
    domains: ["BOM", "Product", "Material"],
    path: "BOM_0021 → PRD_0021 → MAT_변경이력",
    nodes: [
      { id: "BOM_0021", domain: "BOM", label: "어셈블리 A-2201 BOM", props: [{ key: "변경 횟수", value: "11회/년" }, { key: "최근 변경", value: "2024-03-01" }], color: "indigo" },
      { id: "BOM_0034", domain: "BOM", label: "샤프트 컴플리트 BOM", props: [{ key: "변경 횟수", value: "8회/년" }, { key: "사유", value: "공차 개정" }], color: "indigo" },
      { id: "PRD_0021", domain: "Product", label: "어셈블리 A-2201", props: [{ key: "업체", value: "B업체" }, { key: "고객", value: "현대모비스" }], color: "violet" },
    ],
  },
  {
    q: "C업체 수주 데이터에서 이상값 패턴이 있는 거래처는?",
    answer: "C업체 수기 Excel 수주 데이터 분석 결과 이상값 패턴이 감지된 거래처 **3곳**입니다:\n\n• **CUST_0031 (미확인 거래처)** — 동일 품목 단가가 월별로 최대 340% 차이. 수기 입력 오류 가능성 높음\n• **CUST_0045 (가산전자)** — 수량 컬럼에 소수점 값 존재 (BOM 수량과 혼용 의심)\n• **CUST_0052 (미확인 코드)** — 사업자번호 형식 불일치, Entity Resolution에서 미매핑 상태\n\n3건 모두 Human Review 큐에 등록 권장합니다.",
    confidence: 78,
    domains: ["Customer", "Order", "Measurement"],
    path: "CUST_0031 → ORD_이상값 → MEAS_검증",
    nodes: [
      { id: "CUST_0031", domain: "Customer", label: "미확인 거래처", props: [{ key: "이상 유형", value: "단가 변동 340%" }, { key: "상태", value: "Human Review 대기" }], color: "blue" },
      { id: "CUST_0045", domain: "Customer", label: "가산전자", props: [{ key: "이상 유형", value: "수량 소수점 혼용" }, { key: "건수", value: "14건" }], color: "blue" },
      { id: "CUST_0052", domain: "Customer", label: "미확인 코드", props: [{ key: "이상 유형", value: "사업자번호 불일치" }, { key: "ER 상태", value: "미매핑" }], color: "blue" },
    ],
  },
  {
    q: "전체 공급망에서 단일 공급사 의존도가 높은 자재는?",
    answer: "4개 업체 공급망 통합 분석 결과, **단일 공급사 의존도 80% 이상** 자재는 **5개**입니다:\n\n| 자재 | 공급사 | 의존도 | 위험도 |\n|------|--------|--------|--------|\n| AL6061-T6 | 포스코INX | 94% | 🔴 고위험 |\n| 스테인리스 SUS304 | 현대제철 | 88% | 🔴 고위험 |\n| PCB 기판 | 삼성전기 | 82% | 🟠 중위험 |\n\nAL6061-T6의 경우 4개 업체 전체에서 포스코INX 단일 소싱 구조입니다. 공급 차질 시 파급 범위가 매우 넓습니다.",
    confidence: 94,
    domains: ["Supplier", "Material", "Money"],
    path: "SUP_포스코INX → MAT_0042 → PRD_0041 · PRD_0042",
    nodes: [
      { id: "SUP_0031", domain: "Supplier", label: "포스코INX", props: [{ key: "공급 자재수", value: "3종" }, { key: "최대 의존도", value: "94%" }], color: "cyan" },
      { id: "MAT_0042", domain: "Material", label: "AL6061-T6", props: [{ key: "단일 공급", value: "포스코INX 94%" }, { key: "사용 업체", value: "전체 4개" }], color: "emerald" },
      { id: "MAT_0061", domain: "Material", label: "SUS304", props: [{ key: "단일 공급", value: "현대제철 88%" }, { key: "위험 등급", value: "고위험" }], color: "emerald" },
    ],
  },
];

export default function GraphRAG() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "10M 지식 그래프에 연결됐습니다. 온보딩된 4개 업체 데이터 기반으로 자연어로 질문하세요.\n\n아래 예시 질문을 클릭하거나 직접 입력할 수 있습니다.",
      confidence: 100,
      domains: ["Customer", "Material", "Product", "Process", "Machine", "Supplier"],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeNodes, setActiveNodes] = useState<NodeCard[]>([]);
  const [activePath, setActivePath] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function ask(question: string) {
    if (!question.trim() || loading) return;
    setLoading(true);
    setInput("");

    const userMsg: Message = { role: "user", text: question };
    setMessages(prev => [...prev, userMsg]);

    const qa = EXAMPLE_QA.find(q => q.q === question) ?? {
      answer: "해당 질문에 대한 데이터를 그래프에서 탐색 중입니다. 현재 온보딩된 4개 업체 데이터 기반으로 관련 노드를 검색했으나, 명확한 경로를 찾지 못했습니다. 질문을 더 구체적으로 입력하거나 예시 질문을 사용해보세요.",
      confidence: 62,
      domains: ["Customer", "Material"],
      path: "탐색 중...",
      nodes: [],
    };

    const streamingMsg: Message = { role: "assistant", text: "", streaming: true, confidence: qa.confidence, domains: qa.domains, nodes: qa.nodes, path: qa.path };
    setMessages(prev => [...prev, streamingMsg]);
    setActiveNodes(qa.nodes);
    setActivePath(qa.path);

    const chars = qa.answer.split("");
    let idx = 0;
    const interval = setInterval(() => {
      idx += 3;
      const partial = chars.slice(0, idx).join("");
      setMessages(prev => {
        const n = [...prev];
        n[n.length - 1] = { ...streamingMsg, text: partial, streaming: idx < chars.length };
        return n;
      });
      if (idx >= chars.length) {
        clearInterval(interval);
        setLoading(false);
      }
    }, 18);
  }

  function selectMsg(msg: Message) {
    if (msg.nodes?.length) { setActiveNodes(msg.nodes); setActivePath(msg.path ?? ""); }
  }

  return (
    <div className="p-6 h-[calc(100vh-2rem)] flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">GraphRAG Demo</h1>
        <p className="text-slate-500 mt-1">온보딩된 지식 그래프에 자연어로 질문하세요 — AI가 근거 노드와 함께 답변합니다</p>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* 채팅 패널 */}
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* 예시 질문 */}
          <div className="p-3 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-semibold text-slate-400 mb-2">예시 질문</p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_QA.map(qa => (
                <button
                  key={qa.q}
                  onClick={() => ask(qa.q)}
                  disabled={loading}
                  className="text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50 text-left"
                >
                  {qa.q.length > 28 ? qa.q.slice(0, 28) + "…" : qa.q}
                </button>
              ))}
            </div>
          </div>

          {/* 메시지 목록 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                onClick={() => selectMsg(msg)}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} ${msg.nodes?.length ? "cursor-pointer" : ""}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mr-2 mt-1">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${msg.role === "user" ? "bg-blue-600 text-white rounded-br-sm" : "bg-slate-100 text-slate-800 rounded-bl-sm"}`}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}{msg.streaming && <span className="inline-block w-1.5 h-4 bg-slate-400 ml-0.5 animate-pulse rounded-sm" />}</p>
                  {msg.role === "assistant" && msg.confidence && !msg.streaming && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-xs font-medium ${msg.confidence >= 85 ? "text-emerald-600" : "text-amber-600"}`}>
                        신뢰도 {msg.confidence}%
                      </span>
                      {msg.domains?.map(d => (
                        <span key={d} className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${DOMAIN_COLOR[d] ?? "bg-slate-100 text-slate-600"}`}>
                          {d}
                        </span>
                      ))}
                      {msg.nodes && msg.nodes.length > 0 && (
                        <span className="text-xs text-blue-500 flex items-center gap-0.5">
                          근거 {msg.nodes.length}개 <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* 입력창 */}
          <div className="p-3 border-t border-slate-100">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && ask(input)}
                placeholder="공급망, 품질, 설비, BOM에 대해 자유롭게 질문하세요..."
                disabled={loading}
                className="flex-1 text-sm px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 disabled:opacity-50"
              />
              <button
                onClick={() => ask(input)}
                disabled={loading || !input.trim()}
                className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 근거 노드 패널 */}
        <div className="w-72 shrink-0 flex flex-col gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex-1 overflow-y-auto">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">참조 노드</p>
            {activeNodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-300 text-xs text-center">
                <Network className="w-8 h-8 mb-2 opacity-40" />
                답변을 클릭하면<br />근거 노드가 표시됩니다
              </div>
            ) : (
              <div className="space-y-3">
                {activePath && (
                  <div className="bg-slate-50 rounded-lg p-2.5">
                    <p className="text-xs font-semibold text-slate-400 mb-1">탐색 경로</p>
                    <p className="text-xs text-slate-600 font-mono leading-relaxed">{activePath}</p>
                  </div>
                )}
                {activeNodes.map(node => (
                  <div key={node.id} className="bg-white rounded-xl border border-slate-200 p-3 hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${DOMAIN_COLOR[node.domain] ?? "bg-slate-100 text-slate-600"}`}>
                        {DOMAIN_ICON[node.domain]}
                        {node.domain}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800">{node.label}</div>
                    <div className="text-xs text-slate-400 mb-2">{node.id}</div>
                    <div className="space-y-1">
                      {node.props.map(p => (
                        <div key={p.key} className="flex justify-between text-xs">
                          <span className="text-slate-400">{p.key}</span>
                          <span className="font-medium text-slate-700">{p.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 그래프 통계 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">연결된 그래프</p>
            <div className="space-y-2 text-xs">
              {[
                { label: "총 노드", value: "1,240" },
                { label: "총 엣지", value: "3,871" },
                { label: "도메인", value: "12개" },
                { label: "업체", value: "A·B·C·D" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-slate-400">{label}</span>
                  <span className="font-semibold text-slate-700">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
