"use client";

import { useState, useEffect, useRef } from "react";
import { Check, X, Search, ChevronRight, ChevronDown, ArrowRight, FileText, Shuffle, Zap, Clock } from "lucide-react";

type MappingStatus = "approved" | "pending" | "rejected";

interface Mapping {
  id: number; source: string; srcCol: string; srcType: string;
  canonical: string; confidence: number; status: MappingStatus;
  note: string; sampleValues: string[]; transform: string;
}

const BASE_MAPPINGS: Mapping[] = [
  { id:1,  source:"A업체 더존 ERP", srcCol:"CUST_CD",        srcType:"VARCHAR(20)",   canonical:"Customer.customer_id",  confidence:96, status:"approved", note:"",                                    sampleValues:["C001","C002","C-SAMS"], transform:"DIRECT" },
  { id:2,  source:"A업체 더존 ERP", srcCol:"CUST_NM",        srcType:"NVARCHAR(100)", canonical:"Customer.name",         confidence:94, status:"approved", note:"",                                    sampleValues:["삼성전자","현대모비스","LG화학"], transform:"DIRECT" },
  { id:3,  source:"A업체 더존 ERP", srcCol:"ITEM_CD",        srcType:"VARCHAR(30)",   canonical:"Product.product_id",    confidence:91, status:"approved", note:"",                                    sampleValues:["P-AL6061","P-PCB-A"], transform:"DIRECT" },
  { id:4,  source:"A업체 더존 ERP", srcCol:"ITEM_NM",        srcType:"NVARCHAR(200)", canonical:"Product.name",          confidence:89, status:"approved", note:"",                                    sampleValues:["AL6061-T6 판재","PCB 기판 A타입"], transform:"TRIM" },
  { id:5,  source:"A업체 더존 ERP", srcCol:"QTY",            srcType:"DECIMAL(18,4)", canonical:"OrderLine.quantity",    confidence:87, status:"pending",  note:"단위 불명확 (EA vs KG)",               sampleValues:["500.0000","200.0000","1.5000"], transform:"CAST_DECIMAL" },
  { id:6,  source:"A업체 더존 ERP", srcCol:"AMT",            srcType:"DECIMAL(18,2)", canonical:"OrderLine.amount_krw",  confidence:82, status:"pending",  note:"통화 KRW 확인 필요",                   sampleValues:["2100000.00","840000.00"], transform:"CAST_DECIMAL" },
  { id:7,  source:"A업체 더존 ERP", srcCol:"ORD_DT",         srcType:"VARCHAR(8)",    canonical:"Order.order_date",      confidence:78, status:"pending",  note:"YYYYMMDD → ISO 8601 변환 필요",        sampleValues:["20260618","20260601"], transform:"DATE_FORMAT" },
  { id:8,  source:"A업체 Excel BOM", srcCol:"품번",           srcType:"TEXT",          canonical:"Product.product_id",    confidence:72, status:"pending",  note:"ITEM_CD와 동일 엔티티 여부 확인",      sampleValues:["P-AL6061","P001-REV3"], transform:"NORMALIZE" },
  { id:9,  source:"A업체 Excel BOM", srcCol:"자재코드",       srcType:"TEXT",          canonical:"Material.material_id",  confidence:85, status:"pending",  note:"",                                    sampleValues:["M-SUS304","M-AL6061"], transform:"DIRECT" },
  { id:10, source:"A업체 Excel BOM", srcCol:"소요량",         srcType:"TEXT",          canonical:"BOM.quantity_per",      confidence:88, status:"pending",  note:"",                                    sampleValues:["1","2.5","0.5"], transform:"CAST_DECIMAL" },
  { id:11, source:"B업체 SAP ERP",   srcCol:"MATNR",          srcType:"CHAR(18)",      canonical:"Material.material_id",  confidence:97, status:"approved", note:"",                                    sampleValues:["000000000000001234","MAT-AL6061"], transform:"LTRIM_ZEROS" },
  { id:12, source:"B업체 SAP ERP",   srcCol:"MAKTX",          srcType:"CHAR(40)",      canonical:"Material.name",         confidence:95, status:"approved", note:"",                                    sampleValues:["AL6061-T6 판재           ","SUS304 파이프"], transform:"TRIM" },
  { id:13, source:"B업체 SAP ERP",   srcCol:"WERKS",          srcType:"CHAR(4)",       canonical:"Plant.plant_id",        confidence:91, status:"approved", note:"",                                    sampleValues:["1000","2000","K100"], transform:"DIRECT" },
  { id:14, source:"C업체 수기 Excel", srcCol:"거래처",         srcType:"TEXT",          canonical:"Customer.name",         confidence:61, status:"pending",  note:"표기 불일치 다수 — Entity Resolution 선행 필요", sampleValues:["삼성 전자","Samsung Electronics","삼성전자(주)"], transform:"ENTITY_RESOLVE" },
  { id:15, source:"C업체 수기 Excel", srcCol:"납기일",         srcType:"TEXT",          canonical:"Order.due_date",        confidence:58, status:"pending",  note:"다양한 날짜 형식 혼재",                sampleValues:["2026.06.30","26-07-05","7월5일"], transform:"DATE_PARSE" },
  { id:16, source:"D업체 Odoo",       srcCol:"partner_id",     srcType:"INTEGER",       canonical:"Customer.customer_id",  confidence:93, status:"approved", note:"",                                    sampleValues:["12","45","301"], transform:"INT_TO_STR" },
  { id:17, source:"D업체 Odoo",       srcCol:"product_tmpl_id",srcType:"INTEGER",       canonical:"Product.product_id",    confidence:90, status:"approved", note:"",                                    sampleValues:["8","22","157"], transform:"INT_TO_STR" },
  { id:18, source:"D업체 Odoo",       srcCol:"date_order",     srcType:"DATETIME",      canonical:"Order.order_date",      confidence:92, status:"approved", note:"",                                    sampleValues:["2026-06-18 09:14:32","2026-06-17 14:22:01"], transform:"DATE_TRUNC" },
];

const TRANSFORM_LABELS: Record<string,{label:string;color:string}> = {
  DIRECT:        { label:"직접 매핑",  color:"bg-slate-100 text-slate-600" },
  TRIM:          { label:"공백 제거",  color:"bg-blue-100 text-blue-700" },
  CAST_DECIMAL:  { label:"형변환",     color:"bg-violet-100 text-violet-700" },
  DATE_FORMAT:   { label:"날짜 변환",  color:"bg-orange-100 text-orange-700" },
  NORMALIZE:     { label:"표준화",     color:"bg-teal-100 text-teal-700" },
  LTRIM_ZEROS:   { label:"선행0 제거", color:"bg-indigo-100 text-indigo-700" },
  ENTITY_RESOLVE:{ label:"Entity해소", color:"bg-rose-100 text-rose-700" },
  DATE_PARSE:    { label:"날짜 파싱",  color:"bg-amber-100 text-amber-700" },
  INT_TO_STR:    { label:"정수→문자",  color:"bg-pink-100 text-pink-700" },
};

function ConfBar({ v }: { v: number }) {
  const color = v >= 90 ? "bg-emerald-500" : v >= 75 ? "bg-blue-400" : "bg-amber-400";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${v}%` }}/>
      </div>
      <span className={`text-xs font-bold ${v>=90?"text-emerald-600":v>=75?"text-blue-600":"text-amber-600"}`}>{v}%</span>
    </div>
  );
}

const MAPPING_FEED = [
  "A업체 ERP — CUST_CD 신뢰도 96% 자동 승인",
  "B업체 SAP — MATNR 선행0 제거 변환 적용",
  "C업체 Excel — 거래처 Entity Resolution 진행 중",
  "D업체 Odoo — partner_id INT→STR 변환 완료",
  "스키마 검증 — 312개 컬럼 중 287개 매핑 완료",
  "Human Review — 미매핑 25건 큐 등록",
  "자동 승인 — 신뢰도 90%+ 컬럼 7건 일괄 처리",
];

function SparkLine({ vals }: { vals: number[] }) {
  const max = Math.max(...vals); const min = Math.min(...vals);
  const W = 80; const H = 24;
  const pts = vals.map((v,i)=>({x:i*(W/(vals.length-1)), y:H-(((v-min)/(max-min||1))*H)}));
  const d = pts.map((p,i)=>(i===0?"M":"L")+p.x.toFixed(1)+","+p.y.toFixed(1)).join(" ");
  return (
    <svg width={W} height={H} viewBox={"0 0 "+W+" "+H}>
      <path d={d} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round"/>
      {pts.map((p,i)=>i===pts.length-1&&<circle key={i} cx={p.x} cy={p.y} r={2.5} fill="#6366f1"/>)}
    </svg>
  );
}

function DetailPanel({ item, onClose }: { item: Mapping; onClose: () => void }) {
  const [tab, setTab] = useState<"transform"|"sample"|"history">("transform");
  const tf = TRANSFORM_LABELS[item.transform] ?? { label: item.transform, color: "bg-slate-100 text-slate-600" };

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50">
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
        <div>
          <div className="font-mono font-bold text-slate-900 text-sm">{item.srcCol}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-mono text-slate-400">{item.source}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4"/></button>
      </div>

      <div className="flex border-b border-slate-200 px-4">
        {([["transform","변환 규칙"],["sample","샘플 데이터"],["history","매핑 이력"]] as const).map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key as "transform"|"sample"|"history")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${tab===key?"border-blue-600 text-blue-600":"border-transparent text-slate-500"}`}>
            {key==="transform"&&<Shuffle className="w-3.5 h-3.5"/>}
            {key==="sample"&&<FileText className="w-3.5 h-3.5"/>}
            {key==="history"&&<Clock className="w-3.5 h-3.5"/>}
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab==="transform" && (
          <>
            {/* 매핑 흐름 */}
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-3 text-xs">
                <div className="text-center">
                  <div className="font-mono font-bold text-slate-900">{item.srcCol}</div>
                  <div className="text-slate-400 mt-0.5">{item.srcType}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{item.source}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0"/>
                <div className={`px-2 py-1 rounded-lg text-xs font-medium ${tf.color}`}>{tf.label}</div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0"/>
                <div className="text-center">
                  <div className="font-mono font-medium text-blue-700">{item.canonical}</div>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              {[["원천 컬럼",item.srcCol],["원천 타입",item.srcType],["Canonical 필드",item.canonical],["변환 규칙",tf.label],["신뢰도",`${item.confidence}%`]].map(([k,v])=>(
                <div key={k} className="flex justify-between bg-white border border-slate-100 rounded-lg px-3 py-2">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-800 font-medium font-mono">{v}</span>
                </div>
              ))}
            </div>
            {item.note && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <span className="font-semibold">주의: </span>{item.note}
              </div>
            )}
          </>
        )}

        {tab==="sample" && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700 mb-2">원천 샘플 데이터 ({item.sampleValues.length}건)</div>
            {item.sampleValues.map((v,i)=>(
              <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2">
                <span className="text-[10px] text-slate-400 w-4">{i+1}</span>
                <span className="font-mono text-xs text-slate-800 flex-1">{v}</span>
                <ArrowRight className="w-3 h-3 text-slate-300 shrink-0"/>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${tf.color}`}>{tf.label}</span>
              </div>
            ))}
          </div>
        )}
        {tab==="history" && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-500 mb-2">매핑 이력</div>
            {[
              {date:"2026-06-18 08:03",actor:"AI 자동",action:"초안 매핑 생성",conf:item.confidence},
              {date:"2026-06-18 09:15",actor:"관리자",action:item.status==="approved"?"승인 완료":item.status==="rejected"?"거절 처리":"검토 대기"},
            ].map((h,i)=>(
              <div key={i} className="flex gap-3 text-xs">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0"/>
                  {i===0&&<div className="w-0.5 flex-1 bg-slate-200 mt-1"/>}
                </div>
                <div className="pb-2">
                  <span className="text-slate-400 font-mono">{h.date}</span>
                  <p className="text-slate-700 font-medium mt-0.5">{h.action}</p>
                  <p className="text-slate-400">{h.actor} {h.conf?"· 신뢰도 "+h.conf+"%":""}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SchemaMapping() {
  const [items, setItems] = useState<Mapping[]>(BASE_MAPPINGS);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<MappingStatus|"all">("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<number|null>(null);
  const [editingNote, setEditingNote] = useState<number|null>(null);
  const [noteVal, setNoteVal] = useState("");
  const [feed, setFeed] = useState<{msg:string;ts:string}[]>([]);
  const [confTick, setConfTick] = useState(0);
  const tickRef = useRef(0);

  useEffect(()=>{
    const id = setInterval(()=>{
      tickRef.current++;
      setConfTick(p=>p+(Math.random()>0.6?1:-1));
      if(tickRef.current%2===0){
        const msg = MAPPING_FEED[Math.floor(Math.random()*MAPPING_FEED.length)];
        const ts = new Date().toLocaleTimeString("ko-KR",{hour12:false});
        setFeed(prev=>[{msg,ts},...prev].slice(0,6));
      }
    },1200);
    return ()=>clearInterval(id);
  },[]);

  const approve = (id: number) => setItems(prev=>prev.map(m=>m.id===id?{...m,status:"approved" as MappingStatus}:m));
  const reject  = (id: number) => setItems(prev=>prev.map(m=>m.id===id?{...m,status:"rejected" as MappingStatus}:m));
  const approveAll = (source: string) => setItems(prev=>prev.map(m=>m.source===source&&m.status==="pending"?{...m,status:"approved" as MappingStatus}:m));
  const saveNote = (id: number) => { setItems(prev=>prev.map(m=>m.id===id?{...m,note:noteVal}:m)); setEditingNote(null); };

  const toggleCollapse = (src: string) =>
    setCollapsed(prev=>{ const n=new Set(prev); n.has(src)?n.delete(src):n.add(src); return n; });

  const sources = Array.from(new Set(BASE_MAPPINGS.map(m=>m.source)));

  const filtered = items
    .filter(m=>filterStatus==="all"||m.status===filterStatus)
    .filter(m=>!search||[m.srcCol,m.canonical,m.source].some(s=>s.toLowerCase().includes(search.toLowerCase())));

  const counts = {
    all: items.length,
    approved: items.filter(m=>m.status==="approved").length,
    pending: items.filter(m=>m.status==="pending").length,
    rejected: items.filter(m=>m.status==="rejected").length,
  };
  const avgConf = Math.round(items.reduce((a,m)=>a+m.confidence,0)/items.length);
  const approvalRate = Math.round((counts.approved/counts.all)*100);
  const selectedItem = items.find(m=>m.id===selected);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Schema Mapping</h1>
          <p className="text-slate-500 mt-1 text-sm">업체별 컬럼을 Canonical 표준 필드에 매핑</p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-5 gap-3">
        {[
          {label:"전체 매핑",value:counts.all,sub:"건",cls:"text-slate-800"},
          {label:"승인 완료",value:counts.approved,sub:"건",cls:"text-emerald-600"},
          {label:"승인 대기",value:counts.pending,sub:"건",cls:"text-amber-600"},
          {label:"거절",value:counts.rejected,sub:"건",cls:"text-rose-600"},
          {label:"평균 신뢰도",value:avgConf,sub:"%",cls:avgConf>=85?"text-emerald-600":"text-amber-600"},
        ].map(({label,value,sub,cls})=>(
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="text-xs text-slate-500 mb-1">{label}</div>
            <div className={`text-2xl font-bold ${cls}`}>{value}<span className="text-sm font-normal text-slate-400 ml-0.5">{sub}</span></div>
          </div>
        ))}
      </div>

      {/* 진행률 바 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-700">전체 승인 진행률</span>
          <span className="text-xs text-slate-500">{counts.approved} / {counts.all}</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{width:`${approvalRate}%`}}/>
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-slate-400">
          <span>0%</span><span className="font-semibold text-emerald-600">{approvalRate}%</span><span>100%</span>
        </div>
      </div>

      {/* 검색 + 필터 */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="컬럼명, 원천 검색..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-400"/>
        </div>
        <div className="flex gap-2">
          {([["all","전체"],["pending","대기"],["approved","승인"],["rejected","거절"]] as const).map(([s,label])=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterStatus===s?"bg-blue-600 text-white border-blue-600":"bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 원천별 그룹 테이블 */}
      <div className="space-y-3">
        {sources.map(src=>{
          const srcItems = filtered.filter(m=>m.source===src);
          if(srcItems.length===0) return null;
          const srcAll = items.filter(m=>m.source===src);
          const srcApproved = srcAll.filter(m=>m.status==="approved").length;
          const srcPending = srcAll.filter(m=>m.status==="pending").length;
          const isCollapsed = collapsed.has(src);
          return (
            <div key={src} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 cursor-pointer"
                onClick={()=>toggleCollapse(src)}>
                <div className="flex items-center gap-3">
                  {isCollapsed?<ChevronRight className="w-4 h-4 text-slate-400"/>:<ChevronDown className="w-4 h-4 text-slate-400"/>}
                  <span className="text-sm font-semibold text-slate-800">{src}</span>
                  <span className="text-xs text-slate-400">{srcApproved}/{srcAll.length} 승인</span>
                  {srcPending>0&&<span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{srcPending}건 대기</span>}
                </div>
                {srcPending>0&&!isCollapsed&&(
                  <button onClick={e=>{e.stopPropagation();approveAll(src);}}
                    className="text-xs px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium">
                    일괄 승인
                  </button>
                )}
              </div>
              {!isCollapsed && (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      {["원천 컬럼","타입","Canonical Field","변환","신뢰도","상태","비고",""].map(h=>(
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {srcItems.map(m=>(
                      <tr key={m.id} onClick={()=>setSelected(s=>s===m.id?null:m.id)}
                        className={`transition-colors cursor-pointer ${m.status==="rejected"?"opacity-40 bg-slate-50":"hover:bg-slate-50"} ${selected===m.id?"bg-blue-50":""}`}>
                        <td className="px-4 py-2.5 font-mono font-medium text-slate-900 text-xs">{m.srcCol}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{m.srcType}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-blue-700 font-medium">{m.canonical}</td>
                        <td className="px-4 py-2.5">
                          {TRANSFORM_LABELS[m.transform]&&(
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TRANSFORM_LABELS[m.transform].color}`}>
                              {TRANSFORM_LABELS[m.transform].label}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5"><ConfBar v={m.confidence}/></td>
                        <td className="px-4 py-2.5">
                          {m.status==="approved"&&<span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">승인</span>}
                          {m.status==="pending"&&<span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">대기</span>}
                          {m.status==="rejected"&&<span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">거절</span>}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[160px]" onClick={e=>e.stopPropagation()}>
                          {editingNote===m.id?(
                            <input autoFocus value={noteVal} onChange={e=>setNoteVal(e.target.value)}
                              onBlur={()=>saveNote(m.id)} onKeyDown={e=>{if(e.key==="Enter")saveNote(m.id);if(e.key==="Escape")setEditingNote(null);}}
                              className="w-full border border-blue-400 rounded px-1.5 py-0.5 text-xs focus:outline-none"/>
                          ):(
                            <span onClick={()=>{setEditingNote(m.id);setNoteVal(m.note);}}
                              className="cursor-pointer hover:text-blue-600 truncate block max-w-[150px]" title={m.note||"클릭하여 비고 추가"}>
                              {m.note||<span className="text-slate-300 italic">비고 추가</span>}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {m.status==="pending"&&(
                            <div className="flex gap-1" onClick={e=>e.stopPropagation()}>
                              <button onClick={()=>approve(m.id)} className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors"><Check className="w-3.5 h-3.5"/></button>
                              <button onClick={()=>reject(m.id)} className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"><X className="w-3.5 h-3.5"/></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>

      {/* 실시간 피드 + 신뢰도 추세 */}
      <div className="flex gap-4">
        <div className="flex-1 bg-slate-900 rounded-xl overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400"/>
            <span className="text-xs text-slate-300 font-medium">매핑 이벤트 피드</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-auto"/>
          </div>
          <div className="divide-y divide-slate-800 max-h-36 overflow-y-auto">
            {feed.length===0&&<div className="px-4 py-2 text-xs text-slate-500">대기 중...</div>}
            {feed.map((f,i)=>(
              <div key={i} className="px-4 py-2">
                <div className="text-[10px] text-slate-500 font-mono">{f.ts}</div>
                <div className="text-xs text-slate-300 mt-0.5">{f.msg}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-56 bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-semibold text-slate-500 mb-3">신뢰도 추세</div>
          <SparkLine vals={[82,85,84,87,88,86,89,88+confTick%5]}/>
          <div className="text-xl font-bold text-indigo-600 mt-2">{avgConf}%</div>
          <div className="text-xs text-slate-400">전체 평균 신뢰도</div>
        </div>
      </div>

      {/* 상세 패널 */}
      {selectedItem && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={()=>setSelected(null)}/>
          <DetailPanel item={selectedItem} onClose={()=>setSelected(null)}/>
        </>
      )}
    </div>
  );
}
