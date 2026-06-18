"use client";

import { useState, useEffect, useRef } from "react";
import { Users, GitBranch, Network, Check, X, Clock, MessageSquare, Zap, ChevronRight } from "lucide-react";

type ReviewType = "entity"|"mapping"|"ontology";
type ReviewStatus = "pending"|"approved"|"rejected"|"deferred";

interface ReviewItem {
  id:number; type:ReviewType; confidence:number; status:ReviewStatus;
  title:string; question:string; reason:string; recommendation:string;
  evidence:string[]; source:string; priority:"high"|"medium"|"low";
  comment:string; decidedAt:string;
}

const INIT_ITEMS: ReviewItem[] = [
  { id:1, type:"entity",   confidence:67, status:"pending", priority:"high",
    title:"CUST_0021 vs CUST_0022 — 동일 고객 여부",
    question:"'엘지전자 BS사업부'와 'LG Electronics B2B'를 동일 거래처로 병합할까요?",
    recommendation:"병합", reason:"상호명 패턴 일치 + 사업자번호 앞 6자리 동일. 단, 사업부 단위 분리 가능성 있어 신뢰도 67%",
    evidence:["사업자번호 앞 6자리: 107-86","청구지 주소 동일: 서울 영등포구 여의대로","담당자 이메일 도메인 동일: @lge.com"],
    source:"A업체 ERP / C업체 Excel", comment:"", decidedAt:"" },
  { id:2, type:"mapping",  confidence:58, status:"pending", priority:"high",
    title:"C업체 Excel 컬럼 '수량' → Canonical 필드",
    question:"'수량' 컬럼을 OrderLine.quantity로 매핑할까요, BOM.quantity_per로 매핑할까요?",
    recommendation:"OrderLine.quantity", reason:"시트명이 '수주현황'이나 인접에 'BOM번호' 존재. 소수점 값 일부 포함.",
    evidence:["시트명: 수주현황","인접 컬럼: 거래처, 품목, 수량, 단가, BOM번호","일부 행에 소수점 값 존재 (BOM 가능성)"],
    source:"C업체 수기 Excel", comment:"", decidedAt:"" },
  { id:3, type:"entity",   confidence:72, status:"pending", priority:"medium",
    title:"MAT_0041 — AL6061-T4 vs AL6061-T6 통합 여부",
    question:"AL6061-T4와 AL6061-T6을 같은 자재로 볼까요, 별개로 관리할까요?",
    recommendation:"분리", reason:"열처리 상태(T4/T6)에 따라 인장강도 69MPa 차이. 생산 현장에서 혼용 시 불량 발생",
    evidence:["AL6061-T4: 인장강도 241MPa","AL6061-T6: 인장강도 310MPa","BOM에서 교체 불가 처리됨"],
    source:"A업체 BOM / B업체 SAP", comment:"", decidedAt:"" },
  { id:4, type:"ontology", confidence:61, status:"pending", priority:"medium",
    title:"Plant(공장/사업장) 도메인 배치",
    question:"Plant 객체를 Process 도메인에 포함할까요, 별도 Location 도메인을 신설할까요?",
    recommendation:"Location 도메인 신설", reason:"Plant는 물리적 위치 개념. 향후 다공장 확장 시 Location 분리가 유리",
    evidence:["B업체 SAP WERKS 필드: 공장 코드 4자리","다공장 데이터 포함 (1100, 1200, 1300)","향후 MES 연동 시 Plant 기준 집계 필요"],
    source:"B업체 SAP / Ontology Mapper", comment:"", decidedAt:"" },
  { id:5, type:"entity",   confidence:55, status:"pending", priority:"low",
    title:"SUP_0031 — 포스코 vs POSCO INX 분리 여부",
    question:"'포스코'와 'POSCO INX'를 같은 공급사로 병합할까요?",
    recommendation:"분리", reason:"POSCO INX는 포스코 계열사이나 별도 법인. 구매 계약·가격 조건이 다를 수 있음",
    evidence:["사업자번호 완전히 다름","결제 계좌 다름","공급 품목 구분됨"],
    source:"D업체 Odoo", comment:"", decidedAt:"" },
  { id:6, type:"mapping",  confidence:79, status:"approved", priority:"medium",
    title:"B업체 SAP MATKL → Material.category 매핑",
    question:"MATKL(자재 그룹 코드)을 Material.category로 매핑할까요?",
    recommendation:"승인", reason:"SAP 자재 그룹은 표준 분류 코드로 category 매핑이 적합",
    evidence:["MATKL 00001=원자재, 00002=반제품","10M Material.category와 1:1 대응"],
    source:"B업체 SAP", comment:"표준 매핑 확인", decidedAt:"08:44:12" },
];

const FEED_POOL = [
  "에스컬레이션 — CUST_0048 신뢰도 62% (엔티티 병합 여부)",
  "에스컬레이션 — 컬럼 'unit_price' 매핑 불명확 (신뢰도 54%)",
  "에스컬레이션 — Measurement 도메인 신규 필드 검토 요청",
  "에스컬레이션 — SUP_0055 / SUP_0056 동일 공급사 여부",
  "에스컬레이션 — BOM 수량 단위 혼재 감지 — 검토 필요",
  "자동 처리 — CUST_0034 신뢰도 93% → 자동 병합 완료",
];

const TYPE_ICON: Record<ReviewType, React.ReactNode> = {
  entity:   <Users className="w-4 h-4"/>,
  mapping:  <GitBranch className="w-4 h-4"/>,
  ontology: <Network className="w-4 h-4"/>,
};
const TYPE_BG: Record<ReviewType,string> = {
  entity:"bg-blue-50 text-blue-600", mapping:"bg-violet-50 text-violet-600", ontology:"bg-emerald-50 text-emerald-600",
};
const TYPE_LABEL: Record<ReviewType,string> = { entity:"Entity Resolution", mapping:"Schema Mapping", ontology:"Ontology" };
const PRI_COLOR = { high:"bg-rose-100 text-rose-700", medium:"bg-amber-100 text-amber-700", low:"bg-slate-100 text-slate-600" };
const PRI_LABEL = { high:"긴급", medium:"보통", low:"낮음" };
const ST_COLOR: Record<ReviewStatus,string> = {
  pending:"bg-amber-100 text-amber-700", approved:"bg-emerald-100 text-emerald-700",
  rejected:"bg-rose-100 text-rose-700", deferred:"bg-slate-100 text-slate-600",
};
const ST_LABEL: Record<ReviewStatus,string> = { pending:"대기", approved:"승인", rejected:"거절", deferred:"보류" };

function ConfBar({ value, threshold=80 }: { value:number; threshold?:number }) {
  const cls = value>=threshold?"bg-emerald-500":value>=60?"bg-amber-400":"bg-rose-400";
  return (
    <div className="relative flex-1 h-2 bg-slate-100 rounded-full overflow-visible">
      <div className={`absolute inset-y-0 left-0 rounded-full ${cls}`} style={{width:`${value}%`}}/>
      <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400 opacity-50" style={{left:`${threshold}%`}}/>
    </div>
  );
}

function ReviewPanel({ item, onClose, onDecide }: {
  item:ReviewItem; onClose:()=>void;
  onDecide:(id:number, st:ReviewStatus, comment:string)=>void;
}) {
  const [tab, setTab] = useState<"review"|"evidence"|"history">("review");
  const [comment, setComment] = useState(item.comment);

  return (
    <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50">
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${TYPE_BG[item.type]}`}>{TYPE_ICON[item.type]}</div>
            <span className="text-xs text-slate-500">{TYPE_LABEL[item.type]}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PRI_COLOR[item.priority]}`}>{PRI_LABEL[item.priority]}</span>
          </div>
          <p className="text-sm font-bold text-slate-900 mt-1 leading-snug">{item.title}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <ConfBar value={item.confidence}/>
            <span className={`text-xs font-bold shrink-0 ${item.confidence>=80?"text-emerald-600":item.confidence>=60?"text-amber-600":"text-rose-600"}`}>{item.confidence}%</span>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 shrink-0 ml-3">
          <X className="w-4 h-4"/>
        </button>
      </div>
      <div className="flex border-b border-slate-100">
        {(["review","evidence","history"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`flex-1 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${tab===t?"border-blue-600 text-blue-700":"border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t==="review"?"검토 요청":t==="evidence"?"AI 근거":"처리 이력"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab==="review"&&(
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-800 mb-1">검토 요청</p>
              <p className="text-sm text-blue-900 leading-relaxed">{item.question}</p>
            </div>
            <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-3 text-sm">
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-0.5"/>
              <div>
                <span className="text-xs text-slate-500">AI 추천: </span>
                <span className="font-semibold text-slate-900">{item.recommendation}</span>
                <p className="text-xs text-slate-500 mt-1">{item.reason}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">출처</p>
              <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">{item.source}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5"/>검토자 코멘트</p>
              <textarea value={comment} onChange={e=>setComment(e.target.value)} rows={3}
                placeholder="결정 사유나 추가 맥락을 입력하세요..."
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 resize-none"/>
            </div>
            {item.status==="pending"&&(
              <div className="flex gap-2 pt-1">
                <button onClick={()=>onDecide(item.id,"approved",comment)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700">
                  <Check className="w-3.5 h-3.5"/>AI 추천 승인
                </button>
                <button onClick={()=>onDecide(item.id,"rejected",comment)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-rose-300 text-rose-600 rounded-xl text-xs font-semibold hover:bg-rose-50">
                  <X className="w-3.5 h-3.5"/>거절
                </button>
                <button onClick={()=>onDecide(item.id,"deferred",comment)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50">
                  <Clock className="w-3.5 h-3.5"/>보류
                </button>
              </div>
            )}
            {item.status!=="pending"&&(
              <div className={`rounded-xl p-3 text-sm font-medium ${ST_COLOR[item.status]}`}>
                {item.status==="approved"?"✓ 승인됨":item.status==="rejected"?"✗ 거절됨":"⏸ 보류됨"}
                {item.decidedAt&&<span className="text-xs font-normal ml-2 opacity-70">{item.decidedAt}</span>}
              </div>
            )}
          </>
        )}
        {tab==="evidence"&&(
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 mb-2">AI 판단 근거 ({item.evidence.length}건)</p>
            {item.evidence.map((ev,i)=>(
              <div key={i} className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0"/>
                {ev}
              </div>
            ))}
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <ConfBar value={item.confidence}/>
                <span className={`text-xs font-bold ${item.confidence>=80?"text-emerald-600":item.confidence>=60?"text-amber-600":"text-rose-600"}`}>{item.confidence}%</span>
              </div>
              <p className="text-[10px] text-slate-400">임계치 80% {item.confidence>=80?"초과 → 자동 처리 가능":"미달 → Human Review 필요"}</p>
            </div>
          </div>
        )}
        {tab==="history"&&(
          <div className="space-y-2">
            {item.decidedAt ? (
              <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">결정 시각</span>
                  <span className="font-medium text-slate-700">{item.decidedAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">결정</span>
                  <span className={`font-medium px-1.5 py-0.5 rounded-full ${ST_COLOR[item.status]}`}>{ST_LABEL[item.status]}</span>
                </div>
                {item.comment&&(
                  <div className="pt-1 border-t border-slate-200">
                    <span className="text-slate-500 block mb-1">코멘트</span>
                    <span className="text-slate-700">{item.comment}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-400 text-center pt-4">아직 처리되지 않았습니다</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HumanReview() {
  const [reviews, setReviews]     = useState(INIT_ITEMS);
  const [selected, setSelected]   = useState<number|null>(1);
  const [filterType, setFilterType] = useState<ReviewType|"all">("all");
  const [filterPri, setFilterPri] = useState<"all"|"high"|"medium"|"low">("all");
  const [feed, setFeed]           = useState<{msg:string;ts:string}[]>([]);
  const [totalEsc, setTotalEsc]   = useState(23);
  const tickRef = useRef(0);

  useEffect(()=>{
    const id=setInterval(()=>{
      tickRef.current++;
      if(tickRef.current%4===0){
        const msg=FEED_POOL[Math.floor(Math.random()*FEED_POOL.length)];
        const ts=new Date().toLocaleTimeString("ko-KR",{hour12:false});
        setFeed(prev=>[{msg,ts},...prev].slice(0,8));
        if(!msg.includes("자동")) setTotalEsc(p=>p+1);
      }
    },1200);
    return ()=>clearInterval(id);
  },[]);

  const decide = (id:number, st:ReviewStatus, comment:string) => {
    const ts=new Date().toLocaleTimeString("ko-KR",{hour12:false});
    setReviews(prev=>prev.map(r=>r.id===id?{...r,status:st,comment,decidedAt:ts}:r));
  };

  const bulkApproveHigh = () => {
    const ts=new Date().toLocaleTimeString("ko-KR",{hour12:false});
    setReviews(prev=>prev.map(r=>
      r.priority==="high"&&r.status==="pending"?{...r,status:"approved",comment:"일괄 승인",decidedAt:ts}:r
    ));
  };

  const pending  = reviews.filter(r=>r.status==="pending");
  const resolved = reviews.filter(r=>r.status!=="pending");
  const highPending = pending.filter(r=>r.priority==="high").length;

  const filteredPending = pending.filter(r=>
    (filterType==="all"||r.type===filterType)&&
    (filterPri==="all"||r.priority===filterPri)
  );

  const selItem = reviews.find(r=>r.id===selected);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Human Review Console</h1>
          <p className="text-slate-500 mt-1 text-sm">AI가 판단하기 어려운 항목을 사람이 직접 검토·승인합니다</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"/>
          <span className="text-amber-700 font-medium">에스컬레이션 {totalEsc}건 누적</span>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-5 gap-3">
        {[
          {label:"검토 대기",  value:pending.length,                                    cls:"text-amber-700 bg-amber-50 border-amber-200"},
          {label:"승인 완료",  value:resolved.filter(r=>r.status==="approved").length,  cls:"text-emerald-700 bg-emerald-50 border-emerald-200"},
          {label:"거절",       value:resolved.filter(r=>r.status==="rejected").length,  cls:"text-rose-700 bg-rose-50 border-rose-200"},
          {label:"보류",       value:resolved.filter(r=>r.status==="deferred").length,  cls:"text-slate-600 bg-slate-50 border-slate-200"},
          {label:"긴급 대기",  value:highPending,                                       cls:highPending>0?"text-rose-700 bg-rose-50 border-rose-200":"text-slate-600 bg-white border-slate-200"},
        ].map(({label,value,cls})=>(
          <div key={label} className={`rounded-xl border p-4 ${cls}`}>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs font-medium mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        {/* 목록 */}
        <div className="w-72 shrink-0 space-y-3">
          {/* 필터 */}
          <div className="flex gap-1 flex-wrap">
            {(["all","entity","mapping","ontology"] as const).map(t=>(
              <button key={t} onClick={()=>setFilterType(t as ReviewType|"all")}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${filterType===t?"bg-blue-600 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {t==="all"?"전체":TYPE_LABEL[t as ReviewType].split(" ")[0]}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {(["all","high","medium","low"] as const).map(p=>(
              <button key={p} onClick={()=>setFilterPri(p)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${filterPri===p?"bg-violet-600 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {p==="all"?"전체":PRI_LABEL[p as "high"|"medium"|"low"]}
              </button>
            ))}
            {highPending>0&&(
              <button onClick={bulkApproveHigh}
                className="ml-auto text-xs px-2.5 py-1 bg-emerald-600 text-white rounded-full font-medium hover:bg-emerald-700 whitespace-nowrap">
                긴급 일괄승인
              </button>
            )}
          </div>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">대기 ({filteredPending.length})</p>
          {filteredPending.map(item=>(
            <div key={item.id} onClick={()=>setSelected(item.id)}
              className={`bg-white rounded-xl border p-3 cursor-pointer transition-all hover:shadow-sm ${selected===item.id?"border-blue-400 ring-2 ring-blue-100":"border-slate-200"}`}>
              <div className="flex items-start gap-2">
                <div className={`p-1.5 rounded-lg shrink-0 ${TYPE_BG[item.type]}`}>{TYPE_ICON[item.type]}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-900 leading-tight truncate">{item.title}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PRI_COLOR[item.priority]}`}>{PRI_LABEL[item.priority]}</span>
                    <div className="flex items-center gap-1.5 flex-1">
                      <ConfBar value={item.confidence}/>
                      <span className={`text-xs font-semibold shrink-0 ${item.confidence>=80?"text-emerald-600":item.confidence>=60?"text-amber-600":"text-rose-600"}`}>{item.confidence}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {resolved.length>0&&(
            <>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 mt-3">처리 완료 ({resolved.length})</p>
              {resolved.map(item=>(
                <div key={item.id} onClick={()=>setSelected(item.id)}
                  className={`bg-white rounded-xl border border-slate-100 p-3 opacity-60 cursor-pointer hover:opacity-80`}>
                  <div className="text-xs text-slate-600 truncate">{item.title}</div>
                  <span className={`text-xs mt-1 inline-block px-1.5 py-0.5 rounded-full ${ST_COLOR[item.status]}`}>{ST_LABEL[item.status]}</span>
                </div>
              ))}
            </>
          )}

          {/* 실시간 피드 */}
          <div className="bg-slate-900 rounded-xl overflow-hidden">
            <div className="px-3 py-2 flex items-center gap-2">
              <Zap className="w-3 h-3 text-amber-400"/>
              <span className="text-xs text-slate-300 font-medium">AI 에스컬레이션 피드</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-auto"/>
            </div>
            <div className="divide-y divide-slate-800 max-h-40 overflow-y-auto">
              {feed.length===0&&<div className="px-3 py-2 text-xs text-slate-500">대기 중...</div>}
              {feed.map((f,i)=>(
                <div key={i} className="px-3 py-2">
                  <div className="text-[10px] text-slate-500 font-mono">{f.ts}</div>
                  <div className="text-xs text-slate-300 mt-0.5">{f.msg}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 상세 */}
        {!selItem&&(
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
            {pending.length===0?"모든 항목이 처리됐습니다":"항목을 선택하세요"}
          </div>
        )}
        {selItem&&(
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl ${TYPE_BG[selItem.type]}`}>{TYPE_ICON[selItem.type]}</div>
                <div className="flex-1">
                  <div className="text-xs text-slate-500">{TYPE_LABEL[selItem.type]}</div>
                  <h2 className="font-semibold text-slate-900 mt-0.5">{selItem.title}</h2>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-2 flex-1 max-w-xs">
                      <ConfBar value={selItem.confidence}/>
                      <span className={`text-xs font-bold shrink-0 ${selItem.confidence>=80?"text-emerald-600":selItem.confidence>=60?"text-amber-600":"text-rose-600"}`}>{selItem.confidence}%</span>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PRI_COLOR[selItem.priority]}`}>{PRI_LABEL[selItem.priority]}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${ST_COLOR[selItem.status]}`}>{ST_LABEL[selItem.status]}</span>
                  </div>
                </div>
                <button onClick={()=>setSelected(selItem.id)}
                  className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 shrink-0">
                  전체 패널 →
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-800 mb-1">검토 요청</p>
                <p className="text-sm text-blue-900 leading-relaxed">{selItem.question}</p>
              </div>
              <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-3 text-sm">
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-0.5"/>
                <div>
                  <span className="text-xs text-slate-500">AI 추천: </span>
                  <span className="font-semibold text-slate-900">{selItem.recommendation}</span>
                  <p className="text-xs text-slate-500 mt-1">{selItem.reason}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                {selItem.evidence.map((ev,i)=>(
                  <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0"/>
                    {ev}
                  </div>
                ))}
              </div>
              {selItem.status==="pending"&&(
                <div className="flex gap-2 pt-2">
                  <button onClick={()=>decide(selItem.id,"approved","")}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700">
                    <Check className="w-4 h-4"/>AI 추천 승인
                  </button>
                  <button onClick={()=>decide(selItem.id,"rejected","")}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-rose-300 text-rose-600 rounded-xl text-sm font-semibold hover:bg-rose-50">
                    <X className="w-4 h-4"/>거절
                  </button>
                  <button onClick={()=>decide(selItem.id,"deferred","")}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50">
                    <Clock className="w-4 h-4"/>보류
                  </button>
                </div>
              )}
              {selItem.status!=="pending"&&(
                <div className={`rounded-xl p-3 text-sm font-medium ${ST_COLOR[selItem.status]}`}>
                  {selItem.status==="approved"?"✓ 승인됨":selItem.status==="rejected"?"✗ 거절됨":"⏸ 보류됨"}
                  {selItem.decidedAt&&<span className="text-xs font-normal ml-2 opacity-70">{selItem.decidedAt}</span>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {selected&&selItem&&(
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={()=>setSelected(null)}/>
          <ReviewPanel item={selItem} onClose={()=>setSelected(null)} onDecide={decide}/>
        </>
      )}
    </div>
  );
}
