"use client";

import { useState } from "react";

type NodeType = "customer" | "supplier" | "product" | "material" | "process" | "machine" | "order" | "measurement";

interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  x: number;
  y: number;
  count?: number;
}

interface GraphEdge {
  from: string;
  to: string;
  label: string;
}

const nodes: GraphNode[] = [
  { id: "cust1", label: "삼성전자\n(CUST_0001)", type: "customer", x: 80, y: 120, count: 3 },
  { id: "cust2", label: "현대자동차\n(CUST_0002)", type: "customer", x: 80, y: 260, count: 2 },
  { id: "order1", label: "수주 #ORD-001", type: "order", x: 260, y: 150 },
  { id: "order2", label: "수주 #ORD-002", type: "order", x: 260, y: 300 },
  { id: "prod1", label: "완제품 A\n(PROD_0001)", type: "product", x: 440, y: 120 },
  { id: "prod2", label: "완제품 B\n(PROD_0002)", type: "product", x: 440, y: 280 },
  { id: "mat1", label: "AL6061\n(MAT_0001)", type: "material", x: 620, y: 80, count: 4 },
  { id: "mat2", label: "SUS304\n(MAT_0010)", type: "material", x: 620, y: 220 },
  { id: "mat3", label: "가스킷-001\n(PROD_0001)", type: "material", x: 620, y: 340 },
  { id: "proc1", label: "CNC 가공\n공정", type: "process", x: 800, y: 120 },
  { id: "proc2", label: "용접\n공정", type: "process", x: 800, y: 260 },
  { id: "mach1", label: "CNC-001\n설비", type: "machine", x: 960, y: 80 },
  { id: "mach2", label: "WLD-002\n설비", type: "machine", x: 960, y: 220 },
  { id: "meas1", label: "검사성적서\n#QC-2406", type: "measurement", x: 960, y: 350 },
  { id: "sup1", label: "포스코\n(SUP_0001)", type: "supplier", x: 620, y: 460, count: 2 },
];

const edges: GraphEdge[] = [
  { from: "cust1", to: "order1", label: "orders" },
  { from: "cust2", to: "order2", label: "orders" },
  { from: "order1", to: "prod1", label: "requests" },
  { from: "order2", to: "prod2", label: "requests" },
  { from: "prod1", to: "mat1", label: "uses" },
  { from: "prod1", to: "mat2", label: "uses" },
  { from: "prod2", to: "mat1", label: "uses" },
  { from: "prod2", to: "mat3", label: "uses" },
  { from: "mat1", to: "proc1", label: "input_to" },
  { from: "mat2", to: "proc2", label: "input_to" },
  { from: "proc1", to: "mach1", label: "uses" },
  { from: "proc2", to: "mach2", label: "uses" },
  { from: "proc1", to: "meas1", label: "produces" },
  { from: "sup1", to: "mat1", label: "supplies" },
  { from: "sup1", to: "mat2", label: "supplies" },
];

const nodeStyles: Record<NodeType, { bg: string; border: string; text: string; dot: string }> = {
  customer: { bg: "#eff6ff", border: "#3b82f6", text: "#1e40af", dot: "#3b82f6" },
  supplier: { bg: "#fdf4ff", border: "#a855f7", text: "#7e22ce", dot: "#a855f7" },
  product: { bg: "#f0fdf4", border: "#22c55e", text: "#15803d", dot: "#22c55e" },
  material: { bg: "#fff7ed", border: "#f97316", text: "#c2410c", dot: "#f97316" },
  process: { bg: "#f0f9ff", border: "#0ea5e9", text: "#0369a1", dot: "#0ea5e9" },
  machine: { bg: "#fafaf9", border: "#78716c", text: "#44403c", dot: "#78716c" },
  order: { bg: "#fefce8", border: "#eab308", text: "#854d0e", dot: "#eab308" },
  measurement: { bg: "#fff1f2", border: "#f43f5e", text: "#be123c", dot: "#f43f5e" },
};

const typeLegend: { type: NodeType; label: string }[] = [
  { type: "customer", label: "Customer" },
  { type: "supplier", label: "Supplier" },
  { type: "order", label: "Order" },
  { type: "product", label: "Product" },
  { type: "material", label: "Material" },
  { type: "process", label: "Process" },
  { type: "machine", label: "Machine" },
  { type: "measurement", label: "Measurement" },
];

const NODE_W = 110;
const NODE_H = 52;

function getCenter(node: GraphNode) {
  return { x: node.x + NODE_W / 2, y: node.y + NODE_H / 2 };
}

export default function GraphPreview() {
  const [selected, setSelected] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

  const selNode = nodes.find(n => n.id === selected);
  const connectedEdges = selected ? edges.filter(e => e.from === selected || e.to === selected) : [];
  const connectedIds = new Set(connectedEdges.flatMap(e => [e.from, e.to]));

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Graph Preview</h1>
        <p className="text-slate-500 mt-1">10M 지식 그래프 — 노드를 클릭해 연결 관계를 확인하세요</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "노드 (엔티티)", value: nodes.length },
          { label: "관계 (엣지)", value: edges.length },
          { label: "도메인", value: [...new Set(nodes.map(n => n.type))].length },
          { label: "병합 통합", value: nodes.filter(n => n.count).reduce((s, n) => s + (n.count || 0), 0) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-center">
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <div className="text-xs text-slate-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase">범례</span>
            <div className="flex flex-wrap gap-2">
              {typeLegend.map(({ type, label }) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: nodeStyles[type].dot }} />
                  <span className="text-xs text-slate-600">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative overflow-auto" style={{ height: 540 }}>
            <svg width={1100} height={520} className="absolute top-0 left-0">
              <defs>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#cbd5e1" />
                </marker>
                <marker id="arrow-active" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#3b82f6" />
                </marker>
              </defs>
              {edges.map((edge, i) => {
                const from = nodes.find(n => n.id === edge.from)!;
                const to = nodes.find(n => n.id === edge.to)!;
                const fc = getCenter(from);
                const tc = getCenter(to);
                const mx = (fc.x + tc.x) / 2;
                const my = (fc.y + tc.y) / 2;
                const isActive = selected && (edge.from === selected || edge.to === selected);
                const key = `${edge.from}-${edge.to}`;
                return (
                  <g key={i}>
                    <line
                      x1={fc.x} y1={fc.y} x2={tc.x} y2={tc.y}
                      stroke={isActive ? "#3b82f6" : "#e2e8f0"}
                      strokeWidth={isActive ? 2 : 1.5}
                      markerEnd={`url(#${isActive ? "arrow-active" : "arrow"})`}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredEdge(key)}
                      onMouseLeave={() => setHoveredEdge(null)}
                    />
                    {(hoveredEdge === key || isActive) && (
                      <text x={mx} y={my - 4} textAnchor="middle" fontSize="9" fill={isActive ? "#3b82f6" : "#94a3b8"} fontWeight="500">
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}
              {nodes.map(node => {
                const style = nodeStyles[node.type];
                const isSelected = selected === node.id;
                const isConnected = selected ? connectedIds.has(node.id) : true;
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer"
                    onClick={() => setSelected(selected === node.id ? null : node.id)}
                    opacity={selected && !isConnected ? 0.3 : 1}
                  >
                    <rect
                      width={NODE_W} height={NODE_H}
                      rx={8} ry={8}
                      fill={style.bg}
                      stroke={isSelected ? style.border : "#e2e8f0"}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />
                    {node.count && (
                      <circle cx={NODE_W - 8} cy={8} r={9} fill={style.dot} />
                    )}
                    {node.count && (
                      <text x={NODE_W - 8} y={12} textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">{node.count}</text>
                    )}
                    {node.label.split("\n").map((line, li) => (
                      <text key={li} x={NODE_W / 2} y={li === 0 ? 20 : 36} textAnchor="middle" fontSize={li === 0 ? "10" : "9"} fill={li === 0 ? style.text : "#94a3b8"} fontWeight={li === 0 ? "700" : "400"}>
                        {line}
                      </text>
                    ))}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="w-64 space-y-3 shrink-0">
          {selNode ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: nodeStyles[selNode.type].dot }} />
                <span className="font-semibold text-slate-900">{selNode.label.split("\n")[0]}</span>
              </div>
              <div className="text-xs text-slate-500 space-y-1 mb-3">
                <div><span className="font-medium">ID:</span> {selNode.label.split("\n")[1] || "-"}</div>
                <div><span className="font-medium">타입:</span> {selNode.type}</div>
                {selNode.count && <div><span className="font-medium">통합 원천:</span> {selNode.count}개</div>}
              </div>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-medium text-slate-600 mb-2">연결 관계 ({connectedEdges.length}건)</p>
                <div className="space-y-1.5">
                  {connectedEdges.map((e, i) => {
                    const isOut = e.from === selNode.id;
                    const otherNode = nodes.find(n => n.id === (isOut ? e.to : e.from))!;
                    return (
                      <div key={i} className="text-xs text-slate-600 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: nodeStyles[otherNode.type].dot }} />
                        <span className="text-slate-400">{isOut ? "→" : "←"}</span>
                        <span className="font-medium text-blue-600">{e.label}</span>
                        <span>{otherNode.label.split("\n")[0]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-center text-sm text-slate-400">
              노드를 클릭하면<br />상세 정보를 확인합니다
            </div>
          )}

          <div className="bg-slate-900 rounded-xl p-4 text-white text-xs space-y-2">
            <p className="font-semibold text-slate-300 mb-2">주요 관계 패턴</p>
            {[
              "Supplier → supplies → Material",
              "Material → used_in → Product",
              "Product → produced_by → Process",
              "Process → uses → Machine",
              "Process → produces → Measurement",
              "Customer → orders → Order",
              "Order → requests → Product",
            ].map(r => (
              <div key={r} className="text-slate-400 font-mono text-xs leading-relaxed">{r}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
