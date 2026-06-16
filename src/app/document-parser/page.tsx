"use client";

import { useState } from "react";
import { FileText, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronRight, Table2, Tag, AlignLeft } from "lucide-react";

type ParseStatus = "done" | "processing" | "failed" | "queued";

interface ParsedTable {
  headers: string[];
  rows: string[][];
}

interface ParsedDoc {
  id: number;
  filename: string;
  type: "PDF" | "CSV" | "Word";
  source: string;
  size: string;
  status: ParseStatus;
  progress: number;
  pages?: number;
  tables: ParsedTable[];
  entities: { label: string; type: string; count: number }[];
  textSample: string;
  confidence: number;
}

const docs: ParsedDoc[] = [
  {
    id: 1,
    filename: "작업표준서_CNC가공_v3.2.pdf",
    type: "PDF",
    source: "A업체 / 생산기술팀",
    size: "2.4MB",
    status: "done",
    progress: 100,
    pages: 24,
    confidence: 91,
    tables: [
      {
        headers: ["공정번호", "공정명", "설비", "작업시간(min)", "불량기준"],
        rows: [
          ["P-001", "황삭가공", "CNC-001", "45", "치수편차 ±0.05mm"],
          ["P-002", "정삭가공", "CNC-002", "30", "표면조도 Ra1.6"],
          ["P-003", "드릴링", "MCT-001", "20", "직경공차 H7"],
          ["P-004", "탭가공", "MCT-001", "15", "나사게이지 합격"],
        ],
      },
      {
        headers: ["안전장비", "착용여부", "비고"],
        rows: [
          ["안전화", "필수", "KS 인증"],
          ["보안경", "필수", "비산칩 위험"],
          ["방진마스크", "권장", "절삭유 미스트"],
        ],
      },
    ],
    entities: [
      { label: "CNC-001, CNC-002, MCT-001", type: "Machine", count: 3 },
      { label: "P-001 ~ P-004", type: "Process", count: 4 },
      { label: "AL6061-T6", type: "Material", count: 1 },
    ],
    textSample: "본 작업표준서는 AL6061-T6 소재를 이용한 CNC 가공 공정의 표준 절차를 정의합니다. 작업자는 반드시 안전장비를 착용하고 작업 전 설비 점검을 완료해야 합니다...",
  },
  {
    id: 2,
    filename: "설비점검성적서_2406.pdf",
    type: "PDF",
    source: "B업체 / 설비팀",
    size: "1.1MB",
    status: "done",
    progress: 100,
    pages: 8,
    confidence: 88,
    tables: [
      {
        headers: ["설비ID", "점검항목", "기준값", "측정값", "판정"],
        rows: [
          ["CNC-001", "주축 진동", "≤0.003mm", "0.0025mm", "합격"],
          ["CNC-001", "백래시", "≤0.005mm", "0.004mm", "합격"],
          ["WLD-002", "전류값", "180±5A", "183A", "합격"],
          ["WLD-002", "가스압력", "0.15±0.01MPa", "0.17MPa", "주의"],
        ],
      },
    ],
    entities: [
      { label: "CNC-001, WLD-002", type: "Machine", count: 2 },
      { label: "주축진동, 백래시, 전류값, 가스압력", type: "Measurement", count: 4 },
    ],
    textSample: "2024년 6월 정기 설비 점검 성적서입니다. WLD-002 가스압력이 기준 상한에 근접하므로 다음 점검 시 조정 필요합니다...",
  },
  {
    id: 3,
    filename: "MES_공정실적_2406.csv",
    type: "CSV",
    source: "B업체 / MES",
    size: "8.7MB",
    status: "done",
    progress: 100,
    confidence: 97,
    tables: [
      {
        headers: ["작업지시번호", "품목코드", "공정", "설비", "시작시간", "종료시간", "수량", "불량수"],
        rows: [
          ["WO-2406-001", "PROD-001", "황삭", "CNC-001", "09:00", "09:45", "10", "0"],
          ["WO-2406-002", "PROD-001", "정삭", "CNC-002", "10:00", "10:30", "10", "1"],
          ["WO-2406-003", "PROD-002", "용접", "WLD-002", "11:00", "12:30", "5", "0"],
          ["WO-2406-004", "MAT-001", "검사", "QC-001", "13:00", "13:20", "15", "2"],
        ],
      },
    ],
    entities: [
      { label: "WO-2406-001 ~ 004", type: "WorkOrder", count: 4 },
      { label: "PROD-001, PROD-002", type: "Product", count: 2 },
      { label: "CNC-001, CNC-002, WLD-002, QC-001", type: "Machine", count: 4 },
    ],
    textSample: "CSV 헤더: 작업지시번호, 품목코드, 공정명, 설비ID, 시작시간, 종료시간, 생산수량, 불량수량, 작업자ID, 비고",
  },
  {
    id: 4,
    filename: "검사성적서_QC-2406-089.pdf",
    type: "PDF",
    source: "D업체 / 품질팀",
    size: "0.8MB",
    status: "processing",
    progress: 62,
    pages: 5,
    confidence: 0,
    tables: [],
    entities: [],
    textSample: "",
  },
  {
    id: 5,
    filename: "품질매뉴얼_ISO9001_2024.pdf",
    type: "PDF",
    source: "C업체 / 품질팀",
    size: "15.2MB",
    status: "failed",
    progress: 23,
    pages: 120,
    confidence: 0,
    tables: [],
    entities: [],
    textSample: "",
  },
  {
    id: 6,
    filename: "설비이력카드_MCT-001.pdf",
    type: "PDF",
    source: "A업체 / 설비팀",
    size: "3.1MB",
    status: "queued",
    progress: 0,
    pages: 32,
    confidence: 0,
    tables: [],
    entities: [],
    textSample: "",
  },
];

const statusConfig: Record<ParseStatus, { label: string; color: string; icon: React.ReactNode }> = {
  done: { label: "완료", color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  processing: { label: "파싱중", color: "text-blue-600 bg-blue-50 border-blue-200", icon: <Clock className="w-3.5 h-3.5 animate-spin" /> },
  failed: { label: "실패", color: "text-rose-600 bg-rose-50 border-rose-200", icon: <AlertCircle className="w-3.5 h-3.5" /> },
  queued: { label: "대기", color: "text-slate-500 bg-slate-50 border-slate-200", icon: <Clock className="w-3.5 h-3.5" /> },
};

const typeColor = { PDF: "bg-rose-100 text-rose-700", CSV: "bg-green-100 text-green-700", Word: "bg-blue-100 text-blue-700" };
const entityTypeColor: Record<string, string> = {
  Machine: "bg-slate-100 text-slate-700",
  Process: "bg-blue-100 text-blue-700",
  Material: "bg-orange-100 text-orange-700",
  Measurement: "bg-violet-100 text-violet-700",
  WorkOrder: "bg-yellow-100 text-yellow-700",
  Product: "bg-green-100 text-green-700",
};

export default function DocumentParser() {
  const [selected, setSelected] = useState<number | null>(1);
  const [activeTab, setActiveTab] = useState<"tables" | "entities" | "text">("tables");

  const sel = docs.find(d => d.id === selected);
  const done = docs.filter(d => d.status === "done").length;
  const totalTables = docs.filter(d => d.status === "done").reduce((s, d) => s + d.tables.length, 0);
  const totalEntities = docs.filter(d => d.status === "done").reduce((s, d) => s + d.entities.reduce((e, en) => e + en.count, 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Document Parser</h1>
        <p className="text-slate-500 mt-1">PDF·CSV·Word 문서에서 표·텍스트·엔티티를 자동 추출</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "전체 문서", value: docs.length, unit: "건" },
          { label: "파싱 완료", value: done, unit: "건" },
          { label: "추출된 표", value: totalTables, unit: "개" },
          { label: "추출된 엔티티", value: totalEntities, unit: "건" },
        ].map(({ label, value, unit }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="text-xs text-slate-500 mb-1">{label}</div>
            <div className="text-2xl font-bold text-slate-900">{value}<span className="text-sm font-normal text-slate-400 ml-1">{unit}</span></div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        {/* 문서 목록 */}
        <div className="w-72 shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">문서 목록</div>
          <div className="divide-y divide-slate-100">
            {docs.map(doc => {
              const sc = statusConfig[doc.status];
              const isSelected = selected === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => doc.status === "done" ? setSelected(doc.id) : null}
                  className={`p-3 transition-colors ${doc.status === "done" ? "cursor-pointer hover:bg-slate-50" : "opacity-60"} ${isSelected ? "bg-blue-50 border-l-2 border-blue-500" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-900 truncate">{doc.filename}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{doc.source}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${typeColor[doc.type]}`}>{doc.type}</span>
                        <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border ${sc.color}`}>
                          {sc.icon} {sc.label}
                        </span>
                      </div>
                      {doc.status === "processing" && (
                        <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${doc.progress}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 파싱 결과 패널 */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {sel && sel.status === "done" ? (
            <>
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-900">{sel.filename}</h2>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>{sel.source}</span>
                      <span>{sel.size}</span>
                      {sel.pages && <span>{sel.pages}페이지</span>}
                      <span className={`font-semibold ${sel.confidence >= 90 ? "text-emerald-600" : sel.confidence >= 75 ? "text-blue-600" : "text-amber-600"}`}>
                        신뢰도 {sel.confidence}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {(["tables", "entities", "text"] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${activeTab === tab ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}
                    >
                      {tab === "tables" && <><Table2 className="w-3.5 h-3.5" />표 ({sel.tables.length})</>}
                      {tab === "entities" && <><Tag className="w-3.5 h-3.5" />엔티티</>}
                      {tab === "text" && <><AlignLeft className="w-3.5 h-3.5" />원문</>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 overflow-auto max-h-[480px]">
                {activeTab === "tables" && (
                  <div className="space-y-6">
                    {sel.tables.map((tbl, ti) => (
                      <div key={ti}>
                        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">표 {ti + 1}</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50">
                                {tbl.headers.map(h => (
                                  <th key={h} className="px-3 py-2 text-left text-slate-600 font-semibold border border-slate-200">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {tbl.rows.map((row, ri) => (
                                <tr key={ri} className="hover:bg-slate-50">
                                  {row.map((cell, ci) => (
                                    <td key={ci} className="px-3 py-2 text-slate-700 border border-slate-200">{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "entities" && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">문서에서 추출된 엔티티 — Entity Resolution 대기열로 전송 가능</p>
                    {sel.entities.map((en, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${entityTypeColor[en.type] || "bg-slate-100 text-slate-600"}`}>{en.type}</span>
                        <span className="text-sm text-slate-700 flex-1">{en.label}</span>
                        <span className="text-xs text-slate-400">{en.count}건</span>
                        <button className="text-xs px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">→ ER 전송</button>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "text" && (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">추출 텍스트 샘플</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{sel.textSample}</p>
                    <p className="text-xs text-slate-400 mt-3">... (전체 텍스트 {sel.pages ? sel.pages * 400 : "N/A"}자)</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
              완료된 문서를 선택하면 파싱 결과를 확인할 수 있습니다
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
