"use client";

import { useState, useEffect, useRef } from "react";
import {
  GitBranch, Search, ShieldCheck, AlertTriangle, CheckCircle2,
  ChevronRight, X, Database, Activity, Clock, Package,
  TrendingUp, Layers, BarChart2,
} from "lucide-react";

// ─── 타입 ────────────────────────────────────────────────────────
type TrackStep = "claim" | "inv" | "bom" | "eco" | "lot" | "done";

interface ClaimRecord {
  id: string;
  claimNo: string;
  product: string;
  spg: string;
  claimDate: string;
  sn: string;
  symptom: string;
  rparY: boolean;
  mfgDate: string;
  ecoBefore15: boolean;
  confidence: number;
}

interface EcoRevision {
  ecoNo: string;
  rev: string;
  effDate: string;
  itemCode: string;
  snCount: number;
}

interface LotResult {
  lotKey: string;
  confidence: number;
  matchedEco: string;
  fifoStep: number;
}

interface TrackResult {
  claimId: string;
  invPassed: boolean;
  invDetails: { ts: string; eqp: string; col: string; judge: string; note: string }[];
  ecoRevisions: EcoRevision[];
  unionSn: number;
  lots: LotResult[];
  dictUsed: string[];
  totalSec: number;
}

// ─── 데이터 ───────────────────────────────────────────────────────
const CLAIMS: ClaimRecord[] = [
  { id:"C1", claimNo:"CLM-2026-0412", product:"G100-0.75kW", spg:"SPG550", claimDate:"2026-04-12", sn:"550AB******", symptom:"출력단 안정성 불량 — 현장 돌발 정지", rparY:true,  mfgDate:"2026-04-06", ecoBefore15:true,  confidence:91 },
  { id:"C2", claimNo:"CLM-2026-0389", product:"G100-1.5kW",  spg:"SPG550", claimDate:"2026-04-08", sn:"550CD******", symptom:"보호회로 오동작 — 비정상 차단",        rparY:true,  mfgDate:"2026-03-31", ecoBefore15:true,  confidence:88 },
  { id:"C3", claimNo:"CLM-2026-0401", product:"G100-2.2kW",  spg:"SPG550", claimDate:"2026-04-10", sn:"550EF******", symptom:"냉각팬 소음 — 불량 없음 확인",          rparY:false, mfgDate:"2026-04-03", ecoBefore15:false, confidence:72 },
  { id:"C4", claimNo:"CLM-2026-0455", product:"XGB-PLC",     spg:"SPG500", claimDate:"2026-04-15", sn:"500AB******", symptom:"통신 모듈 응답 지연",                  rparY:true,  mfgDate:"2026-04-09", ecoBefore15:true,  confidence:85 },
  { id:"C5", claimNo:"CLM-2026-0467", product:"G100-0.4kW",  spg:"SPG550", claimDate:"2026-04-17", sn:"550GH******", symptom:"파라미터 초기화 불가",                 rparY:false, mfgDate:"2026-04-15", ecoBefore15:false, confidence:65 },
];

const TRACK_RESULTS: Record<string, TrackResult> = {
  "C1": {
    claimId:"C1",
    invPassed: false,
    invDetails: [
      { ts:"2026-04-12 09:14", eqp:"INVD08", col:"INRS_3", judge:"NG", note:"출력단 안정성 — 오류 발생, 재투입" },
      { ts:"2026-04-12 10:02", eqp:"INVD08", col:"INRS_3", judge:"NG", note:"재검사 Fail" },
      { ts:"2026-04-12 14:38", eqp:"INVD10", col:"INRS_7", judge:"NG", note:"보호회로 동작 (D10 단독 NG — dict #4 없으면 누락)" },
      { ts:"2026-04-12 15:21", eqp:"INVD10", col:"INRS_7", judge:"OK", note:"재검사 → 출하 → 시장 클레임" },
    ],
    ecoRevisions: [
      { ecoNo:"ECO-2026-***", rev:"①", effDate:"2026-03-22", itemCode:"60400004**", snCount:48 },
      { ecoNo:"ECO-2026-***", rev:"②", effDate:"2026-03-29", itemCode:"60400004**", snCount:37 },
      { ecoNo:"ECO-2026-***", rev:"③", effDate:"2026-04-05", itemCode:"60400004**", snCount:22 },
    ],
    unionSn: 92,
    lots: [
      { lotKey:"20H85****", confidence:0.91, matchedEco:"ECO#1·rev①", fifoStep:8 },
      { lotKey:"20K42****", confidence:0.83, matchedEco:"ECO#1·rev②", fifoStep:8 },
      { lotKey:"20K42****", confidence:0.71, matchedEco:"ECO#1·rev③", fifoStep:8 },
    ],
    dictUsed:["D1","D3","D4","D5","D6"],
    totalSec: 26.0,
  },
  "C2": {
    claimId:"C2",
    invPassed: false,
    invDetails: [
      { ts:"2026-04-08 10:30", eqp:"INVD08", col:"INRS_3", judge:"NG", note:"보호회로 오동작" },
      { ts:"2026-04-08 11:45", eqp:"INVD08", col:"INRS_3", judge:"OK", note:"재검사 통과 → 출하" },
    ],
    ecoRevisions: [
      { ecoNo:"ECO-2026-***", rev:"①", effDate:"2026-03-18", itemCode:"20K42****", snCount:37 },
      { ecoNo:"ECO-2026-***", rev:"②", effDate:"2026-03-25", itemCode:"20K42****", snCount:29 },
    ],
    unionSn: 55,
    lots: [
      { lotKey:"20K42****", confidence:0.87, matchedEco:"ECO#2·rev①", fifoStep:8 },
    ],
    dictUsed:["D1","D3","D4","D5"],
    totalSec: 19.4,
  },
  "C4": {
    claimId:"C4",
    invPassed: true,
    invDetails: [
      { ts:"2026-04-09 14:10", eqp:"INVD10", col:"INRS_7", judge:"OK", note:"출하 검사 통과" },
    ],
    ecoRevisions: [
      { ecoNo:"ECO-2026-***", rev:"①", effDate:"2026-04-02", itemCode:"XGB-COMM-**", snCount:22 },
    ],
    unionSn: 22,
    lots: [
      { lotKey:"XGB-****", confidence:0.78, matchedEco:"ECO#4·rev①", fifoStep:8 },
    ],
    dictUsed:["D1","D2","D3","D5"],
    totalSec: 14.2,
  },
};

// ─── 컴포넌트 ─────────────────────────────────────────────────────
function StepIndicator({ current }: { current: TrackStep }) {
  const steps: { key: TrackStep; label: string }[] = [
    { key:"claim", label:"클레임" },
    { key:"inv",   label:"INV 검사" },
    { key:"bom",   label:"BOM rev" },
    { key:"eco",   label:"ECO" },
    { key:"lot",   label:"LOT 역추적" },
    { key:"done",  label:"완료" },
  ];
  const idx = steps.findIndex(s => s.key === current);
  return (
    <div className="flex items-center gap-0 bg-white rounded-xl border border-slate-200 px-4 py-2 shadow-sm">
      {steps.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s.key} className="flex items-center">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${active?"bg-blue-600 text-white":done?"text-emerald-600":"text-slate-400"}`}>
              {done && <CheckCircle2 className="w-3 h-3"/>}
              {s.label}
            </div>
            {i < steps.length-1 && (
              <ChevronRight className={`w-3.5 h-3.5 mx-0.5 ${i < idx?"text-emerald-400":"text-slate-200"}`}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ResultPanel({ result, claimSn, onClose }: { result: TrackResult; claimSn: string; onClose: () => void }) {
  const [tab, setTab] = useState<"inv"|"eco"|"lot">("inv");
  const judgeColor = (j: string) => j==="NG"?"text-red-600 bg-red-50":"text-emerald-600 bg-emerald-50";

  return (
    <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50">
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
        <div>
          <div className="font-bold text-slate-900">Quality Escape 추적 결과</div>
          <div className="text-xs text-slate-500 mt-0.5">SN: {claimSn}</div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3 h-3"/> 안전막 통과
            </span>
            <span className="text-[11px] text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
              총 {result.totalSec}초 · {result.dictUsed.join("·")} 적용
            </span>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4"/></button>
      </div>

      <div className="flex border-b border-slate-200 px-4">
        {([["inv","INV 검사"],["eco","ECO revision"],["lot","LOT 역추적"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${tab===key?"border-blue-600 text-blue-600":"border-transparent text-slate-500 hover:text-slate-700"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tab==="inv" && (
          <>
            <div className={`rounded-xl p-3 border text-xs flex items-start gap-2 ${result.invPassed?"bg-emerald-50 border-emerald-200":"bg-red-50 border-red-200"}`}>
              {result.invPassed
                ? <><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"/><span className="text-emerald-700">출하 검사 통과 후 클레임 발생 — 검사 로직 재검토 필요</span></>
                : <><AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5"/><span className="text-red-700">NG 판정 후 재검사 통과 → 출하 → 시장 클레임 경로 확인</span></>
              }
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-700 flex items-start gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5"/>
              dict #4 적용: INVD08→INRS_3, INVD10→INRS_7 (없으면 D10 결과 누락)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["검사일시","설비","결과컬럼","판정","비고"].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.invDetails.map((d, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-slate-600">{d.ts}</td>
                      <td className="px-3 py-2 font-mono text-blue-700">{d.eqp}</td>
                      <td className="px-3 py-2 font-mono text-violet-700">{d.col}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded font-bold ${judgeColor(d.judge)}`}>{d.judge}</span>
                      </td>
                      <td className="px-3 py-2 text-slate-500 max-w-[180px]">{d.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab==="eco" && (
          <>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 text-xs text-orange-700 flex items-start gap-1.5">
              <GitBranch className="w-3.5 h-3.5 shrink-0 mt-0.5"/>
              dict #3: ECO_NO 끝 3자리 = revision 식별. 미적용 시 각 rev를 별개 ECO로 계산 → 영향 SN 1/N 토막
            </div>
            <div className="bg-slate-900 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-400 mb-3">ECO 1건 → revision {result.ecoRevisions.length}건 분기</div>
              <div className="flex gap-3 justify-center mb-4">
                <div className="bg-blue-600 text-white rounded-lg px-4 py-2 text-xs font-bold text-center">ECO_NO ******</div>
              </div>
              <div className="flex justify-center gap-3">
                {result.ecoRevisions.map(r => (
                  <div key={r.rev} className="bg-slate-700 rounded-lg p-2.5 text-center text-xs">
                    <div className="text-blue-300 font-bold mb-1">rev{r.rev}</div>
                    <div className="text-slate-400">{r.effDate}</div>
                    <div className="text-slate-300 mt-1">{r.snCount}건</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["ECO_NO","발효일","rev","영향 ItemCode","영향 SN"].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.ecoRevisions.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-slate-600">{r.ecoNo}</td>
                      <td className="px-3 py-2 text-slate-600">{r.effDate}</td>
                      <td className="px-3 py-2"><span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">{r.rev}</span></td>
                      <td className="px-3 py-2 font-mono text-slate-700">{r.itemCode}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{r.snCount}건</td>
                    </tr>
                  ))}
                  <tr className="bg-orange-50 font-bold">
                    <td className="px-3 py-2 text-orange-700" colSpan={3}>합집합</td>
                    <td className="px-3 py-2 font-mono text-orange-700">동일 자재</td>
                    <td className="px-3 py-2 text-orange-700">{result.unionSn}건</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab==="lot" && (
          <>
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-700 flex items-start gap-1.5">
              <Activity className="w-3.5 h-3.5 shrink-0 mt-0.5"/>
              dict #5: MATERIAL_TRAN LOT_ID 없음 → 8단계 FIFO 역추적 알고리즘 적용
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {["WO 조회","자재 Issue","Job결합","LOT후보"].map((s, i) => (
                <div key={i} className="bg-slate-900 rounded-lg p-2 text-center">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center mx-auto mb-1">{i+1}</div>
                  <div className="text-slate-300 text-[11px]">{s}</div>
                </div>
              ))}
              {["FIFO정렬","LOT매핑","ECO매칭","confidence"].map((s, i) => (
                <div key={i} className="bg-slate-900 rounded-lg p-2 text-center">
                  <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center mx-auto mb-1">{i+5}</div>
                  <div className="text-slate-300 text-[11px]">{s}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2 mt-2">
              {result.lots.map((l, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-center gap-4">
                  <Package className="w-4 h-4 text-rose-500 shrink-0"/>
                  <div>
                    <div className="font-mono text-sm font-bold text-slate-800">{l.lotKey}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{l.matchedEco} · FIFO {l.fifoStep}단계</div>
                  </div>
                  <div className="ml-auto">
                    <div className="text-xs font-semibold text-slate-700">confidence</div>
                    <div className={`text-lg font-bold ${l.confidence>=0.9?"text-emerald-600":l.confidence>=0.8?"text-blue-600":"text-amber-600"}`}>
                      {(l.confidence*100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────────
export default function EcoTrackerPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [tracking, setTracking] = useState<string | null>(null);
  const [trackStep, setTrackStep] = useState<TrackStep>("claim");
  const [result, setResult] = useState<TrackResult | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const tickRef = useRef(0);
  const [feed, setFeed] = useState<string[]>([]);

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current++;
      if (tickRef.current % 5 === 0) {
        const pool = [
          "slot_check — SN prefix G100 검증 통과",
          "D4 dict — INVD08→INRS_3 컬럼 로드",
          "D5 FIFO 8단계 — LOT 역추적 완료",
          "D3 dict — ECO revision 인스턴스 분기",
          "verify — 실제 행 인용 검증 통과",
        ];
        setFeed(prev => [pool[Math.floor(Math.random()*pool.length)], ...prev].slice(0,4));
      }
    }, 1200);
    return () => clearInterval(id);
  }, []);

  async function runTrack(claimId: string) {
    setTracking(claimId);
    setTrackStep("claim");
    const steps: TrackStep[] = ["claim","inv","bom","eco","lot","done"];
    for (const step of steps) {
      await new Promise(r => setTimeout(r, 600));
      setTrackStep(step);
    }
    const r = TRACK_RESULTS[claimId];
    if (r) {
      setResult(r);
      setShowPanel(true);
    }
    setTracking(null);
  }

  const filteredClaims = CLAIMS.filter(c =>
    !searchQ || c.claimNo.toLowerCase().includes(searchQ.toLowerCase()) ||
    c.product.toLowerCase().includes(searchQ.toLowerCase()) ||
    c.sn.toLowerCase().includes(searchQ.toLowerCase())
  );

  const rparCount = CLAIMS.filter(c => c.rparY).length;
  const ecoCount = CLAIMS.filter(c => c.ecoBefore15).length;
  const avgConf = Math.round(CLAIMS.reduce((a,c) => a+c.confidence, 0) / CLAIMS.length);
  const selectedClaim = CLAIMS.find(c => c.id === selected);

  return (
    <div className="p-6 space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-orange-600"/> ECO Impact Tracker
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Quality Escape 추적 — QMS 클레임 → INV 검사 → BOM revision → ECO → 자재 LOT FIFO</p>
        </div>
        <div className="flex items-center gap-2">
          {(["D1","D3","D4","D5","D6"] as const).map(k => (
            <span key={k} className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              k==="D1"?"bg-blue-100 text-blue-700":k==="D3"?"bg-orange-100 text-orange-700":
              k==="D4"?"bg-teal-100 text-teal-700":k==="D5"?"bg-rose-100 text-rose-700":"bg-amber-100 text-amber-700"
            }`}>{k}</span>
          ))}
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-lg flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5"/> 안전막 활성
          </span>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label:"총 클레임",       value: CLAIMS.length, cls:"text-slate-800",   sub:"조회 기간" },
          { label:"RPAR=Y",          value: rparCount,     cls:"text-red-600",     sub:"재출현 이력" },
          { label:"ECO 15일 이내",   value: ecoCount,      cls:"text-orange-600",  sub:"제조일 직전" },
          { label:"평균 confidence", value: avgConf+"%",   cls:"text-emerald-600", sub:"LOT 역추적" },
        ].map(({ label, value, cls, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="text-xs text-slate-500 mb-0.5">{label}</div>
            <div className={`text-2xl font-bold ${cls}`}>{value}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* 단계 표시 */}
      {tracking && <StepIndicator current={trackStep}/>}

      {/* 검색 */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus-within:border-orange-400 transition-colors">
          <Search className="w-4 h-4 text-slate-300 shrink-0"/>
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="클레임 번호, 제품명, SN으로 검색..."
            className="flex-1 text-sm outline-none text-slate-700 placeholder:text-slate-300"/>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* 클레임 목록 */}
        <div className="col-span-2 space-y-2">
          {filteredClaims.map(c => (
            <div key={c.id}
              onClick={() => setSelected(s => s===c.id ? null : c.id)}
              className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${selected===c.id?"border-orange-400 ring-2 ring-orange-100":"border-slate-200"}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">{c.claimNo}</span>
                    {c.rparY && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">RPAR=Y</span>}
                    {c.ecoBefore15 && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold">ECO 15일</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{c.product} · {c.spg} · SN: {c.sn}</div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${c.confidence>=85?"text-emerald-600":c.confidence>=70?"text-amber-600":"text-slate-500"}`}>
                    {c.confidence}%
                  </div>
                  <div className="text-[10px] text-slate-400">confidence</div>
                </div>
              </div>
              <div className="text-xs text-slate-600 mb-3 line-clamp-1">{c.symptom}</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span><Clock className="w-3 h-3 inline mr-0.5"/>{c.claimDate}</span>
                  <span>제조일: {c.mfgDate}</span>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); runTrack(c.id); }}
                  disabled={!!tracking}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    tracking===c.id
                      ? "bg-orange-600 text-white animate-pulse"
                      : TRACK_RESULTS[c.id]
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100"
                  } disabled:opacity-50`}>
                  {tracking===c.id ? "추적 중..." : TRACK_RESULTS[c.id] ? "결과 보기" : "추적 불가"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 사이드 패널 */}
        <div className="space-y-4">
          {/* 선택된 클레임 상세 */}
          {selectedClaim && (
            <div className="bg-white rounded-xl border border-orange-200 p-4 shadow-sm">
              <div className="text-xs font-semibold text-slate-700 mb-3">클레임 상세</div>
              {[
                ["클레임 번호", selectedClaim.claimNo],
                ["제품", selectedClaim.product],
                ["SPG", selectedClaim.spg],
                ["SN", selectedClaim.sn],
                ["클레임일", selectedClaim.claimDate],
                ["제조일", selectedClaim.mfgDate],
                ["RPAR=Y", selectedClaim.rparY?"✓ 재출현 이력":"—"],
                ["ECO 15일 이내", selectedClaim.ecoBefore15?"✓ 변경 있음":"—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs py-1 border-b border-slate-50">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-800 font-medium">{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* 6단계 추적 경로 설명 */}
          <div className="bg-slate-900 rounded-xl p-4">
            <div className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5"/> Quality Escape 6단계 추적
            </div>
            {[
              { step:"①", label:"QMS 클레임",     dict:"—",  desc:"시장 클레임 접수" },
              { step:"②", label:"INV 검사 이력",   dict:"D4", desc:"설비별 결과 컬럼 매핑" },
              { step:"③", label:"BOM revision",    dict:"—",  desc:"클레임 SN의 BOM 버전" },
              { step:"④", label:"ECO 연결",        dict:"D3", desc:"revision → ECO_NO 역추적" },
              { step:"⑤", label:"MATERIAL_TRAN",  dict:"D5", desc:"8단계 FIFO 자재 역추적" },
              { step:"⑥", label:"발효일 기준",     dict:"D6", desc:"4시스템 발효일 정렬" },
            ].map(({ step, label, dict, desc }) => (
              <div key={step} className="flex items-start gap-2.5 mb-2">
                <span className="text-slate-500 text-[11px] font-mono w-5 shrink-0">{step}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-300 text-[11px] font-medium">{label}</span>
                    {dict !== "—" && <span className="text-[9px] bg-slate-700 text-slate-400 px-1 py-0.5 rounded font-mono">{dict}</span>}
                  </div>
                  <div className="text-[10px] text-slate-600">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 실시간 피드 */}
          {feed.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"/>
                <span className="text-[11px] font-semibold text-slate-500">추적 활동 피드</span>
              </div>
              {feed.map((f, i) => (
                <div key={i} className="text-[11px] text-slate-500 py-0.5 truncate">{f}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 결과 패널 */}
      {showPanel && result && selectedClaim && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowPanel(false)}/>
          <ResultPanel result={result} claimSn={selectedClaim.sn} onClose={() => setShowPanel(false)}/>
        </>
      )}
    </div>
  );
}
