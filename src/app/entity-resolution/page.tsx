"use client";

import { useState, useEffect, useRef } from "react";
import { Check, X, Users, Package, Zap, GitMerge, ChevronRight } from "lucide-react";

type EntityType = "Customer" | "Product";
type EntityStatus = "pending" | "merged" | "separated";

interface Variant { source: string; value: string; extra: string; }
interface Similarity { label: string; score: number; }
interface HistoryEntry { time: string; action: string; user: string; }

interface Candidate {
  id: number; type: EntityType; canonicalId: string;
  recommendation: "merged"|"separated"; confidence: number; status: EntityStatus;
  reason: string; variants: Variant[];
  similarities: Similarity[];
  history: HistoryEntry[];
}

const CANDIDATES: Candidate[] = [
  {
    id:1, type:"Customer", canonicalId:"CUST_0001", recommendation:"merged", confidence:94, status:"pending",
    reason:"사업자번호 일부 일치, 거래처 주소 유사, 전화번호 동일",
    variants:[
      {source:"A업체 ERP",   value:"삼성전자(주)",      extra:"사업자: 129-81-00742"},
      {source:"B업체 SAP",   value:"Samsung Electronics",extra:"사업자: 129-81-00742"},
      {source:"C업체 Excel", value:"삼성전자",           extra:"전화: 031-200-1114"},
    ],
    similarities:[
      {label:"사업자번호", score:100}, {label:"법인명 유사도", score:88},
      {label:"주소", score:92}, {label:"전화번호", score:95}, {label:"이메일 도메인", score:100},
    ],
    history:[
      {time:"08:25:10", action:"AI 매칭 감지 — 신뢰도 94%", user:"Agent"},
      {time:"08:25:11", action:"Human Review 큐 등록", user:"System"},
    ],
  },
  {
    id:2, type:"Customer", canonicalId:"CUST_0002", recommendation:"merged", confidence:82, status:"pending",
    reason:"상호명 유사, 주소 동일 지역, 담당자 이름 일치",
    variants:[
      {source:"A업체 ERP",   value:"현대자동차",    extra:"서울 서초구"},
      {source:"D업체 Odoo",  value:"현대자동차(주)", extra:"서울 서초구"},
    ],
    similarities:[
      {label:"사업자번호", score:0}, {label:"법인명 유사도", score:91},
      {label:"주소", score:85}, {label:"담당자", score:88}, {label:"전화번호", score:60},
    ],
    history:[
      {time:"09:10:03", action:"AI 매칭 감지 — 신뢰도 82%", user:"Agent"},
    ],
  },
  {
    id:3, type:"Product", canonicalId:"MAT_0001", recommendation:"merged", confidence:91, status:"pending",
    reason:"규격 동일 (Al 6061-T6), 밀도/단위 일치",
    variants:[
      {source:"A업체 BOM",  value:"AL6061",      extra:"단위: KG"},
      {source:"B업체 SAP",  value:"AL-6061",     extra:"단위: KG"},
      {source:"B업체 MES",  value:"AL 6061",     extra:"단위: KG"},
      {source:"C업체 Excel",value:"6061 알루미늄", extra:"단위: KG"},
    ],
    similarities:[
      {label:"재질 코드", score:98}, {label:"규격", score:100},
      {label:"단위", score:100}, {label:"밀도", score:95}, {label:"제조사", score:70},
    ],
    history:[
      {time:"09:15:44", action:"AI 매칭 감지 — 신뢰도 91%", user:"Agent"},
      {time:"09:15:45", action:"4개 표기 통합 후보 생성", user:"System"},
    ],
  },
  {
    id:4, type:"Product", canonicalId:"MAT_0002", recommendation:"separated", confidence:71, status:"pending",
    reason:"유사하지만 재질 코드 다름 — T4 vs T6 처리 상태 차이",
    variants:[
      {source:"A업체 BOM", value:"AL6061-T4", extra:"인장강도: 241MPa"},
      {source:"B업체 SAP", value:"AL6061-T6", extra:"인장강도: 310MPa"},
    ],
    similarities:[
      {label:"재질 코드", score:85}, {label:"규격", score:70},
      {label:"단위", score:100}, {label:"인장강도", score:20}, {label:"처리 상태", score:0},
    ],
    history:[
      {time:"09:20:11", action:"AI 매칭 감지 — 신뢰도 71% (분리 권장)", user:"Agent"},
    ],
  },
  {
    id:5, type:"Customer", canonicalId:"CUST_0003", recommendation:"merged", confidence:88, status:"pending",
    reason:"법인등록번호 동일, 상호 변경 이력 있음",
    variants:[
      {source:"C업체 ERP",  value:"LG전자",       extra:"법인: 110111-0000190"},
      {source:"D업체 Odoo", value:"LG Electronics",extra:"법인: 110111-0000190"},
    ],
    similarities:[
      {label:"법인등록번호", score:100}, {label:"법인명 유사도", score:75},
      {label:"주소", score:80}, {label:"대표자", score:100}, {label:"이메일 도메인", score:90},
    ],
    history:[
      {time:"09:30:22", action:"AI 매칭 감지 — 신뢰도 88%", user:"Agent"},
    ],
  },
  {
    id:6, type:"Product", canonicalId:"PROD_0001", recommendation:"merged", confidence:79, status:"pending",
    reason:"도면번호 일치, 규격 동일",
    variants:[
      {source:"A업체 ERP", value:"가스킷-001",  extra:"도면: DWG-001-A"},
      {source:"A업체 BOM", value:"GASKET_001", extra:"도면: DWG-001-A"},
    ],
    similarities:[
      {label:"도면번호", score:100}, {label:"품명 유사도", score:72},
      {label:"규격", score:95}, {label:"단위", score:100}, {label:"재질", score:80},
    ],
    history:[
      {time:"09:45:08", action:"AI 매칭 감지 — 신뢰도 79%", user:"Agent"},
    ],
  },
];

const ALREADY = [
  {id:101, type:"Customer" as EntityType, canonicalId:"CUST_0010", status:"merged" as EntityStatus, variants:["포스코","POSCO","포스코(주)"], confidence:97, time:"08:10:00"},
  {id:102, type:"Product"  as EntityType, canonicalId:"MAT_0010",  status:"merged" as EntityStatus, variants:["SUS304","SS304","스텐304","SUS 304"], confidence:93, time:"08:22:15"},
  {id:103, type:"Product"  as EntityType, canonicalId:"MAT_0011",  status:"separated" as EntityStatus, variants:["SUS304","SUS316"], confidence:44, time:"08:35:42"},
];

const FEED_POOL = [
  "CUST_0047 — '하이닉스반도체' / 'SK하이닉스' 매칭 신뢰도 89%",
  "MAT_0088 — 'STS316L' / 'SUS316L' 규격 동일 확인 중...",
  "CUST_0031 — 사업자번호 일치, 자동 병합 처리",
  "PROD_0023 — 도면번호 불일치 — 분리 권장",
  "MAT_0045 — 4개 업체 표기 통합 후보 등록",
  "CUST_0012 — 담당자 이메일 도메인 일치 — 신뢰도 85%",
  "PROD_0067 — 재질 코드 T4/T6 차이 감지 — Human Review",
];

function SimilarityBar({ similarities }: { similarities: Similarity[] }) {
  const W = 300; const bh = 14; const gap = 6; const labelW = 90;
  const H = similarities.length * (bh + gap);
  return (
    <svg width={W+labelW+40} height={H} viewBox={`0 0 ${W+labelW+40} ${H}`} className="w-full max-w-md">
      {similarities.map((s,i)=>{
        const y = i*(bh+gap);
        const bw = (s.score/100)*W;
        const color = s.score>=90?"#10b981":s.score>=70?"#3b82f6":s.score>=40?"#f59e0b":"#ef4444";
        return (
          <g key={s.label}>
            <text x={labelW-4} y={y+bh-2} textAnchor="end" fontSize={9} fill="#64748b">{s.label}</text>
            <rect x={labelW} y={y} width={W} height={bh} rx={4} fill="#f1f5f9"/>
            <rect x={labelW} y={y} width={bw} height={bh} rx={4} fill={color} opacity={0.85}/>
            <text x={labelW+bw+4} y={y+bh-2} fontSize={9} fill={color} fontWeight="600">{s.score}%</text>
          </g>
        );
      })}
    </svg>
  );
}

function DetailPanel({ item, onClose }: { item: Candidate; onClose: ()=>void }) {
  const [tab, setTab] = useState<"reason"|"sim"|"history">("reason");
  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50">
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            {item.type==="Customer"
              ? <Users className="w-4 h-4 text-blue-500"/>
              : <Package className="w-4 h-4 text-violet-500"/>}
            <span className="font-bold text-slate-900">{item.canonicalId}</span>
            <span className="text-xs text-slate-400">{item.type}</span>
          </div>
          <div className={`mt-1 text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-medium ${item.recommendation==="merged"?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-600"}`}>
            AI 추천: {item.recommendation==="merged"?"동일 엔티티":"별개 엔티티"} ({item.confidence}%)
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
          <X className="w-4 h-4"/>
        </button>
      </div>
      <div className="flex border-b border-slate-100">
        {(["reason","sim","history"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`flex-1 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${tab===t?"border-blue-600 text-blue-700":"border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t==="reason"?"판단 근거":t==="sim"?"유사도 분석":"처리 이력"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab==="reason"&&(
          <>
            <div className="bg-slate-50 rounded-xl p-3 flex gap-2">
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-0.5"/>
              <p className="text-sm text-slate-700">{item.reason}</p>
            </div>
            <div className="grid gap-2" style={{gridTemplateColumns:`repeat(${Math.min(item.variants.length,2)}, 1fr)`}}>
              {item.variants.map((v,i)=>(
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 mb-1">{v.source}</div>
                  <div className="text-sm font-semibold text-slate-900">{v.value}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{v.extra}</div>
                </div>
              ))}
            </div>
          </>
        )}
        {tab==="sim"&&(
          <div>
            <div className="text-xs text-slate-500 mb-3">속성별 유사도 (0–100%)</div>
            <SimilarityBar similarities={item.similarities}/>
            <div className="mt-3 flex gap-3 text-xs">
              {[["≥90%","#10b981","높음"],["≥70%","#3b82f6","보통"],["≥40%","#f59e0b","낮음"],["<40%","#ef4444","불일치"]].map(([r,c,l])=>(
                <span key={r} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{background:c}}/>
                  <span className="text-slate-500">{l} ({r})</span>
                </span>
              ))}
            </div>
          </div>
        )}
        {tab==="history"&&(
          <div className="space-y-2">
            {item.history.map((h,i)=>(
              <div key={i} className="flex gap-3 text-xs bg-slate-50 rounded-lg px-3 py-2">
                <span className="font-mono text-slate-400 shrink-0">{h.time}</span>
                <span className="text-slate-700">{h.action}</span>
                <span className="text-slate-400 shrink-0">{h.user}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EntityResolution() {
  const [items, setItems] = useState(CANDIDATES);
  const [mainTab, setMainTab] = useState<"pending"|"done">("pending");
  const [filterType, setFilterType] = useState<EntityType|"all">("all");
  const [filterConf, setFilterConf] = useState<"all"|"high"|"mid"|"low">("all");
  const [selectedItem, setSelectedItem] = useState<Candidate|null>(null);
  const [feed, setFeed] = useState<{msg:string;ts:string}[]>([]);
  const [totalMatched, setTotalMatched] = useState(247);
  const tickRef = useRef(0);

  useEffect(()=>{
    const id = setInterval(()=>{
      tickRef.current++;
      if(tickRef.current%3===0){
        const msg = FEED_POOL[Math.floor(Math.random()*FEED_POOL.length)];
        const ts = new Date().toLocaleTimeString("ko-KR",{hour12:false});
        setFeed(prev=>[{msg,ts},...prev].slice(0,8));
        setTotalMatched(p=>p+1);
      }
    },1200);
    return ()=>clearInterval(id);
  },[]);

  const decide = (id:number, decision:EntityStatus) =>
    setItems(prev=>prev.map(it=>it.id===id?{...it,status:decision}:it));

  const bulkMerge = () =>
    setItems(prev=>prev.map(it=>it.confidence>=90&&it.status==="pending"?{...it,status:"merged"}:it));

  const pending  = items.filter(i=>i.status==="pending");
  const resolved = items.filter(i=>i.status!=="pending");

  const confFilter = (c:number) =>
    filterConf==="all"||
    (filterConf==="high"&&c>=90)||
    (filterConf==="mid"&&c>=75&&c<90)||
    (filterConf==="low"&&c<75);

  const filteredPending = pending.filter(i=>
    (filterType==="all"||i.type===filterType) && confFilter(i.confidence)
  );

  const highConf = pending.filter(i=>i.confidence>=90).length;
  const mergedCount = resolved.filter(r=>r.status==="merged").length + ALREADY.filter(a=>a.status==="merged").length;
  const sepCount    = resolved.filter(r=>r.status==="separated").length + ALREADY.filter(a=>a.status==="separated").length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Entity Resolution</h1>
          <p className="text-slate-500 mt-1 text-sm">동일 엔티티를 하나의 Canonical ID로 통합</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"/>
          <span className="text-blue-700 font-medium">AI 매칭 진행 중</span>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-5 gap-3">
        {[
          {label:"AI 매칭 감지",  value:totalMatched,    sub:"실시간 누적",      cls:"text-blue-700 bg-blue-50 border-blue-200"},
          {label:"검토 대기",     value:pending.length,  sub:"Human Review 필요", cls:"text-amber-700 bg-amber-50 border-amber-200"},
          {label:"병합 완료",     value:mergedCount,     sub:"Canonical 통합",   cls:"text-emerald-700 bg-emerald-50 border-emerald-200"},
          {label:"분리 결정",     value:sepCount,        sub:"별개 엔티티 유지", cls:"text-slate-600 bg-slate-50 border-slate-200"},
          {label:"고신뢰 대기",   value:highConf,        sub:"≥90% 일괄 처리 가능", cls:"text-violet-700 bg-violet-50 border-violet-200"},
        ].map(({label,value,sub,cls})=>(
          <div key={label} className={`rounded-xl border p-4 ${cls}`}>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs font-medium mt-0.5">{label}</div>
            <div className="text-[10px] opacity-70 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-slate-200">
        {([["pending",`검토 대기 (${pending.length})`],["done","처리 완료"]] as const).map(([k,l])=>(
          <button key={k} onClick={()=>setMainTab(k)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${mainTab===k?"border-blue-600 text-blue-700":"border-transparent text-slate-500 hover:text-slate-700"}`}>
            {l}
          </button>
        ))}
      </div>

      {mainTab==="pending"&&(
        <>
          {/* 필터 + 일괄 병합 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500">유형:</span>
            {(["all","Customer","Product"] as const).map(t=>(
              <button key={t} onClick={()=>setFilterType(t as EntityType|"all")}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${filterType===t?"bg-blue-600 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {t==="all"?"전체":t}
              </button>
            ))}
            <span className="text-slate-200">|</span>
            <span className="text-xs text-slate-500">신뢰도:</span>
            {([["all","전체"],["high","≥90%"],["mid","75–89%"],["low","<75%"]] as const).map(([k,l])=>(
              <button key={k} onClick={()=>setFilterConf(k)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${filterConf===k?"bg-violet-600 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {l}
              </button>
            ))}
            {highConf>0&&(
              <button onClick={bulkMerge}
                className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700">
                <GitMerge className="w-3.5 h-3.5"/>
                신뢰도 ≥90% 일괄 병합 ({highConf}건)
              </button>
            )}
          </div>

          <div className="space-y-4">
            {filteredPending.map(item=>(
              <div key={item.id} className="bg-white rounded-xl border border-amber-200 p-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={()=>setSelectedItem(item)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${item.type==="Customer"?"bg-blue-50":"bg-violet-50"}`}>
                      {item.type==="Customer"
                        ? <Users className="w-4 h-4 text-blue-600"/>
                        : <Package className="w-4 h-4 text-violet-600"/>}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">{item.canonicalId}</span>
                      <span className="ml-2 text-xs text-slate-400">{item.type} · {item.variants.length}개 표기</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.recommendation==="merged"?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-600"}`}>
                      AI: {item.recommendation==="merged"?"동일":"별개"}
                    </span>
                    <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${item.confidence>=90?"bg-emerald-50 text-emerald-700":item.confidence>=75?"bg-blue-50 text-blue-700":"bg-amber-50 text-amber-700"}`}>
                      {item.confidence}%
                    </span>
                  </div>
                </div>

                {/* 유사도 미니 바 */}
                <div className="flex gap-1 mb-3 h-1.5">
                  {item.similarities.map((s,i)=>(
                    <div key={i} className="flex-1 rounded-full"
                      style={{background:s.score>=90?"#10b981":s.score>=70?"#3b82f6":s.score>=40?"#f59e0b":"#ef4444"}}
                      title={`${s.label}: ${s.score}%`}/>
                  ))}
                </div>

                <div className="grid gap-2 mb-4" style={{gridTemplateColumns:`repeat(${Math.min(item.variants.length,4)}, 1fr)`}}>
                  {item.variants.map((v,i)=>(
                    <div key={i} className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                      <div className="text-[10px] text-slate-400">{v.source}</div>
                      <div className="text-xs font-semibold text-slate-900 mt-0.5 truncate">{v.value}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">{v.extra}</div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2" onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>decide(item.id,"merged")}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700">
                    <Check className="w-3.5 h-3.5"/>동일 엔티티 병합
                  </button>
                  <button onClick={()=>decide(item.id,"separated")}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:border-slate-400">
                    <X className="w-3.5 h-3.5"/>별개 유지
                  </button>
                  <button onClick={()=>setSelectedItem(item)}
                    className="ml-auto text-xs px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                    상세 보기 →
                  </button>
                </div>
              </div>
            ))}
            {filteredPending.length===0&&(
              <div className="text-center py-10 text-slate-400 text-sm">검토 대기 항목이 없습니다</div>
            )}
          </div>

          {resolved.length>0&&(
            <div>
              <div className="text-sm font-semibold text-slate-700 mb-2">이번 세션 처리 완료</div>
              <div className="space-y-2">
                {resolved.map(it=>(
                  <div key={it.id} className={`bg-white rounded-xl border p-3 flex items-center justify-between ${it.status==="merged"?"border-emerald-200":"border-slate-200"}`}>
                    <div className="flex items-center gap-2 text-xs">
                      {it.type==="Customer"?<Users className="w-3.5 h-3.5 text-blue-400"/>:<Package className="w-3.5 h-3.5 text-violet-400"/>}
                      <span className="font-medium text-slate-800">{it.canonicalId}</span>
                      <span className="text-slate-400">{it.variants.length}개 표기</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${it.status==="merged"?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-500"}`}>
                      {it.status==="merged"?"병합됨":"분리됨"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {mainTab==="done"&&(
        <div className="space-y-2">
          {ALREADY.map(it=>(
            <div key={it.id} className={`bg-white rounded-xl border p-4 ${it.status==="merged"?"border-emerald-200":"border-slate-200"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {it.type==="Customer"?<Users className="w-4 h-4 text-blue-400"/>:<Package className="w-4 h-4 text-violet-400"/>}
                  <span className="font-medium text-slate-900 text-sm">{it.canonicalId}</span>
                  {it.variants.map(v=>(
                    <span key={v} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{v}</span>
                  ))}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400 font-mono">{it.time}</span>
                  <span className="text-xs text-slate-400">{it.confidence}%</span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${it.status==="merged"?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-600"}`}>
                    {it.status==="merged"?"병합됨":"분리됨"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 실시간 AI 매칭 피드 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-blue-500"/>
          <span className="text-xs font-semibold text-slate-700">실시간 AI 매칭 피드</span>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse ml-auto"/>
        </div>
        <div className="divide-y divide-slate-50 max-h-44 overflow-y-auto">
          {feed.length===0&&<div className="px-4 py-3 text-xs text-slate-400">매칭 이벤트 대기 중...</div>}
          {feed.map((f,i)=>(
            <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-xs">
              <span className="text-slate-400 font-mono shrink-0">{f.ts}</span>
              <span className="text-slate-700">{f.msg}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedItem&&(
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={()=>setSelectedItem(null)}/>
          <DetailPanel item={selectedItem} onClose={()=>setSelectedItem(null)}/>
        </>
      )}
    </div>
  );
}
