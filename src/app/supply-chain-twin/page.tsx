"use client";

import { useState } from "react";
import { AlertTriangle, TrendingDown, RefreshCw, Zap, Package, Factory, Truck, Users, CheckCircle2, ChevronRight } from "lucide-react";

type NodeType = "supplier" | "warehouse" | "factory" | "customer";
type NodeStatus = "normal" | "warning" | "critical" | "affected";

interface SCNode {
  id: string;
  label: string;
  sub: string;
  type: NodeType;
  status: NodeStatus;
  stock?: number;
  leadTime?: number;
  risk?: number;
  x: number;
  y: number;
}

interface SCEdge {
  from: string;
  to: string;
  label: string;
  flow: number;
  affected: boolean;
}

const BASE_NODES: SCNode[] = [
  // Suppliers
  { id: "s1", label: "중국 AL6061 공급사", sub: "Chalco Shandong", type: "supplier",   status: "normal", stock: 5200, leadTime: 21, risk: 12, x: 60,  y: 80 },
  { id: "s2", label: "국내 SUS304 공급사", sub: "(주)영진스틸",    type: "supplier",   status: "normal", stock: 3800, leadTime: 5,  risk: 5,  x: 60,  y: 210 },
  { id: "s3", label: "PCB 원판 공급사",    sub: "KB세라텍",        type: "supplier",   status: "normal", stock: 1200, leadTime: 7,  risk: 8,  x: 60,  y: 340 },
  { id: "s4", label: "초경 인서트 공급사", sub: "Sandvik Coromant", type: "supplier",  status: "normal", stock: 800,  leadTime: 14, risk: 15, x: 60,  y: 470 },
  // Warehouses
  { id: "w1", label: "인천 물류창고",      sub: "재고 1,450kg",    type: "warehouse",  status: "normal", stock: 1450, leadTime: 1,  risk: 3,  x: 280, y: 140 },
  { id: "w2", label: "성남 부품창고",      sub: "재고 620EA",      type: "warehouse",  status: "normal", stock: 620,  leadTime: 1,  risk: 2,  x: 280, y: 340 },
  // Factories
  { id: "f1", label: "A업체 CNC 공장",    sub: "LINE-01~04",      type: "factory",    status: "normal", stock: 0,    leadTime: 3,  risk: 10, x: 500, y: 140 },
  { id: "f2", label: "B업체 프레스 공장", sub: "PRESS-01~06",     type: "factory",    status: "normal", stock: 0,    leadTime: 2,  risk: 8,  x: 500, y: 340 },
  // Customers
  { id: "c1", label: "삼성전자",          sub: "월 820ea 발주",    type: "customer",   status: "normal", stock: 0,    leadTime: 0,  risk: 0,  x: 720, y: 200 },
  { id: "c2", label: "LG이노텍",          sub: "월 350ea 발주",    type: "customer",   status: "normal", stock: 0,    leadTime: 0,  risk: 0,  x: 720, y: 370 },
];

const BASE_EDGES: SCEdge[] = [
  { from: "s1", to: "w1", label: "AL6061 5톤/월",  flow: 5000, affected: false },
  { from: "s2", to: "w1", label: "SUS304 2톤/월",  flow: 2000, affected: false },
  { from: "s3", to: "w2", label: "PCB 원판 400EA", flow: 400,  affected: false },
  { from: "s4", to: "w2", label: "인서트 200EA",   flow: 200,  affected: false },
  { from: "w1", to: "f1", label: "원자재 출고",    flow: 1200, affected: false },
  { from: "w1", to: "f2", label: "원자재 출고",    flow: 800,  affected: false },
  { from: "w2", to: "f1", label: "부품 출고",      flow: 300,  affected: false },
  { from: "w2", to: "f2", label: "부품 출고",      flow: 200,  affected: false },
  { from: "f1", to: "c1", label: "완제품 납품",    flow: 820,  affected: false },
  { from: "f2", to: "c2", label: "완제품 납품",    flow: 350,  affected: false },
];

const SHOCKS = [
  {
    id: "sh1",
    label: "AL6061 수출 규제 (3주)",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    color: "bg-rose-600",
    desc: "중국 AL6061 수출 쿼터 발동 — 3주간 공급 차단",
    affectedNodes: ["s1", "w1", "f1"],
    affectedEdges: ["s1→w1", "w1→f1"],
    alternative: "일본 UACJ사 대체 발주 (납기 +7일, 단가 +12%) 또는 국내 재고 조기 확보 권고",
  },
  {
    id: "sh2",
    label: "인천항 파업 (5일)",
    icon: <Truck className="w-3.5 h-3.5" />,
    color: "bg-amber-500",
    desc: "인천항 항만 노조 파업 — 수입 물류 5일 지연",
    affectedNodes: ["w1", "w2"],
    affectedEdges: ["s1→w1", "s2→w1", "s3→w2", "s4→w2"],
    alternative: "부산항 우회 물류 또는 항공 긴급 운송 (비용 +35%) 고려. 현재고로 3일 버퍼 확보 가능.",
  },
  {
    id: "sh3",
    label: "삼성전자 발주 +30%",
    icon: <Zap className="w-3.5 h-3.5" />,
    color: "bg-blue-600",
    desc: "삼성전자 하반기 발주 30% 증가 — 수요 급증",
    affectedNodes: ["f1", "w1", "s1"],
    affectedEdges: ["f1→c1", "w1→f1"],
    alternative: "A업체 생산 라인 증설 (LINE-05 추가 가동) 및 AL6061 발주량 즉시 30% 상향 요청 권고.",
  },
];

const NODE_COLORS: Record<NodeType, { fill: string; stroke: string; icon: React.ReactNode }> = {
  supplier:  { fill: "#eff6ff", stroke: "#3b82f6", icon: <Package className="w-3 h-3" /> },
  warehouse: { fill: "#f0fdf4", stroke: "#22c55e", icon: <Factory className="w-3 h-3" /> },
  factory:   { fill: "#faf5ff", stroke: "#8b5cf6", icon: <Factory className="w-3 h-3" /> },
  customer:  { fill: "#fff7ed", stroke: "#f97316", icon: <Users className="w-3 h-3" /> },
};

const STATUS_COLORS: Record<NodeStatus, string> = {
  normal:   "#22c55e",
  warning:  "#f59e0b",
  critical: "#ef4444",
  affected: "#f97316",
};

export default function SupplyChainTwin() {
  const [selectedShock, setSelectedShock] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const shock = SHOCKS.find(s => s.id === selectedShock);

  const nodes = BASE_NODES.map(n => ({
    ...n,
    status: shock?.affectedNodes.includes(n.id)
      ? (shock.id === "sh3" ? "warning" : "critical") as NodeStatus
      : "normal" as NodeStatus,
  }));

  const edges = BASE_EDGES.map(e => ({
    ...e,
    affected: shock
      ? shock.affectedEdges.includes(`${e.from}→${e.to}`)
      : false,
  }));

  const selNode = nodes.find(n => n.id === selectedNode);

  const affectedCount = shock ? shock.affectedNodes.length : 0;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Supply Chain Twin</h1>
          <p className="text-slate-500 mt-1">공급망 디지털 트윈 — 실시간 재고·납기·리스크 시각화 + 충격 시뮬레이션</p>
        </div>
        {shock && (
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5" />
            충격 시뮬레이션 활성
          </div>
        )}
      </div>

      {/* 충격 시나리오 버튼 */}
      <div className="flex gap-3 flex-wrap">
        <span className="text-xs font-semibold text-slate-500 self-center">충격 시뮬레이션:</span>
        {SHOCKS.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedShock(selectedShock === s.id ? null : s.id)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all border ${
              selectedShock === s.id
                ? `${s.color} text-white border-transparent shadow-md`
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            }`}
          >
            {s.icon} {s.label}
          </button>
        ))}
        {shock && (
          <button
            onClick={() => setSelectedShock(null)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> 초기화
          </button>
        )}
      </div>

      {/* 충격 설명 배너 */}
      {shock && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-rose-700">{shock.desc}</div>
            <div className="text-xs text-rose-600 mt-1">
              영향 노드 {affectedCount}개 — 빨간색/주황색 노드 및 점선 경로 확인
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        {/* SVG 네트워크 맵 */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">공급망 네트워크</h3>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              {(["supplier","warehouse","factory","customer"] as NodeType[]).map(t => (
                <div key={t} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm border" style={{ background: NODE_COLORS[t].fill, borderColor: NODE_COLORS[t].stroke }} />
                  <span>{{supplier:"공급사",warehouse:"창고",factory:"공장",customer:"고객"}[t]}</span>
                </div>
              ))}
            </div>
          </div>
          <svg viewBox="0 0 800 560" className="w-full" style={{ minHeight: 420 }}>
            {/* 엣지 */}
            {edges.map((e, i) => {
              const from = nodes.find(n => n.id === e.from)!;
              const to   = nodes.find(n => n.id === e.to)!;
              const mx   = (from.x + to.x) / 2;
              const my   = (from.y + to.y) / 2;
              return (
                <g key={i}>
                  <line
                    x1={from.x + 85} y1={from.y + 22}
                    x2={to.x}        y2={to.y + 22}
                    stroke={e.affected ? "#ef4444" : "#cbd5e1"}
                    strokeWidth={e.affected ? 2.5 : 1.5}
                    strokeDasharray={e.affected ? "6,3" : "none"}
                    markerEnd="url(#arrow)"
                  />
                  <text x={mx + 43} y={my + 18} fontSize="8" fill={e.affected ? "#ef4444" : "#94a3b8"} textAnchor="middle">
                    {e.label}
                  </text>
                </g>
              );
            })}

            <defs>
              <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#94a3b8" />
              </marker>
            </defs>

            {/* 노드 */}
            {nodes.map(n => {
              const nc = NODE_COLORS[n.type];
              const isSelected = selectedNode === n.id;
              const isAffected = n.status !== "normal";
              return (
                <g key={n.id} style={{ cursor: "pointer" }} onClick={() => setSelectedNode(selectedNode === n.id ? null : n.id)}>
                  <rect
                    x={n.x} y={n.y} width={85} height={44} rx={6}
                    fill={nc.fill}
                    stroke={isAffected ? STATUS_COLORS[n.status] : (isSelected ? "#3b82f6" : nc.stroke)}
                    strokeWidth={isSelected || isAffected ? 2.5 : 1.5}
                    filter={isSelected ? "drop-shadow(0 2px 4px rgba(59,130,246,0.3))" : undefined}
                  />
                  {/* 상태 표시 점 */}
                  <circle cx={n.x + 77} cy={n.y + 7} r={4} fill={STATUS_COLORS[n.status]} />
                  <text x={n.x + 8} y={n.y + 17} fontSize="9" fontWeight="600" fill="#1e293b">{n.label.slice(0, 9)}</text>
                  <text x={n.x + 8} y={n.y + 29} fontSize="8" fill="#64748b">{n.sub.slice(0, 11)}</text>
                  {n.risk !== undefined && (
                    <text x={n.x + 8} y={n.y + 40} fontSize="7.5" fill={n.risk > 10 ? "#ef4444" : "#94a3b8"}>위험 {n.risk}%</text>
                  )}
                </g>
              );
            })}

            {/* 레이어 레이블 */}
            {[["공급사",30],["창고",250],["공장",465],["고객",685]].map(([label, x]) => (
              <text key={String(label)} x={Number(x)} y={30} fontSize="10" fontWeight="700" fill="#94a3b8" textAnchor="middle">{label}</text>
            ))}
          </svg>
        </div>

        {/* 우측 패널 */}
        <div className="w-64 shrink-0 space-y-3">
          {/* KPI */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="text-xs font-semibold text-slate-500">공급망 현황</div>
            {[
              { label: "총 노드",    value: nodes.length,                     unit: "개", color: "text-slate-700" },
              { label: "정상",       value: nodes.filter(n=>n.status==="normal").length, unit: "개", color: "text-emerald-600" },
              { label: "영향받음",   value: affectedCount,                    unit: "개", color: affectedCount > 0 ? "text-rose-600" : "text-slate-400" },
            ].map(({ label, value, unit, color }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-slate-500">{label}</span>
                <span className={`font-bold ${color}`}>{value}{unit}</span>
              </div>
            ))}
          </div>

          {/* 노드 상세 */}
          {selNode && (
            <div className="bg-white rounded-xl border border-blue-200 ring-2 ring-blue-100 p-4 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 mb-2">노드 상세</div>
              <div className="text-sm font-bold text-slate-800">{selNode.label}</div>
              <div className="text-xs text-slate-400 mb-3">{selNode.sub}</div>
              <div className="space-y-1.5 text-xs">
                {selNode.stock !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">재고</span>
                    <span className="font-semibold text-slate-700">{selNode.stock.toLocaleString()}</span>
                  </div>
                )}
                {selNode.leadTime !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">리드타임</span>
                    <span className="font-semibold text-slate-700">{selNode.leadTime}일</span>
                  </div>
                )}
                {selNode.risk !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">리스크</span>
                    <span className={`font-semibold ${selNode.risk > 10 ? "text-rose-600" : "text-emerald-600"}`}>{selNode.risk}%</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">상태</span>
                  <span className={`font-semibold ${selNode.status === "normal" ? "text-emerald-600" : "text-rose-600"}`}>
                    {selNode.status === "normal" ? "정상" : selNode.status === "critical" ? "위험" : "주의"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* AI 대안 제안 */}
          {shock && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> AI 대안 제안
              </div>
              <p className="text-xs text-blue-800 leading-relaxed">{shock.alternative}</p>
            </div>
          )}

          {/* 공급사 리스크 순위 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 mb-2">공급사 리스크 순위</div>
            {BASE_NODES.filter(n => n.type === "supplier").sort((a,b) => (b.risk||0)-(a.risk||0)).map(n => (
              <div key={n.id} className="flex items-center gap-2 mb-1.5">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${(n.risk||0) > 10 ? "bg-rose-400" : "bg-emerald-400"}`}
                    style={{ width: `${n.risk}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 w-20 truncate">{n.label.slice(0,6)}</span>
                <span className={`text-xs font-bold w-8 text-right ${(n.risk||0) > 10 ? "text-rose-600" : "text-slate-500"}`}>{n.risk}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
