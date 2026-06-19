"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, AlertCircle, XCircle, RefreshCw, X, Wrench, AlertTriangle, Info, Clock } from "lucide-react";

type IssueLevel = "error" | "warning" | "info";

interface QualityIssue {
  id: number; level: IssueLevel; category: string; message: string;
  entity?: string; source?: string; count?: number; resolved: boolean;
  resolvedAt?: string;
  cause: string; action: string; affected: string; autoFixable: boolean;
}

const BASE_ISSUES: QualityIssue[] = [
  { id:1,  level:"error",   category:"필수 필드 누락",    message:"Customer.tax_id가 비어 있습니다",                              entity:"CUST_0001 (삼성전자)",    source:"A업체 ERP",        resolved:false, cause:"ERP 마이그레이션 시 세금 ID 컬럼이 누락됨", action:"원천 DB CUST 테이블의 TAX_REG_NO 컬럼을 재매핑하고 데이터를 재적재하세요", affected:"Order 12건, Invoice 3건", autoFixable:false },
  { id:2,  level:"error",   category:"필수 필드 누락",    message:"Material.unit이 정의되지 않았습니다",                          entity:"MAT_0003 (AL7075)",       source:"A업체 BOM",        resolved:false, cause:"BOM Excel 자재 시트에 단위 컬럼이 없음", action:"BOM 담당자에게 단위 정보 확인 후 수기 입력 또는 파일 재수신 필요", affected:"BOM 8건, OrderLine 21건", autoFixable:false },
  { id:3,  level:"error",   category:"관계 오류",         message:"BOM 부모 제품이 존재하지 않는 Product를 참조합니다",           entity:"BOM_0024",                source:"A업체 BOM",        resolved:false, cause:"Product 레코드 삭제 후 BOM 참조가 dangling 상태로 남음", action:"BOM_0024의 parent_prod_id를 현재 유효한 Product ID로 업데이트", affected:"BOM 1건, 하위 BOMLine 14건", autoFixable:false },
  { id:4,  level:"warning", category:"동일 엔티티 중복",  message:"Customer 이름이 동일한 레코드 2건 — Entity Resolution 확인 필요", entity:"CUST_0091, CUST_0092",  source:"C업체 ERP",   count:2, resolved:false, cause:"업체 합병 후 양쪽 시스템 데이터 중복 유입", action:"Entity Resolution 페이지에서 두 레코드 병합 처리", affected:"Order 7건", autoFixable:true },
  { id:5,  level:"warning", category:"단위 불일치",       message:"BOM 소요량 단위가 상위 Material 단위와 다름 (EA vs KG)",      entity:"BOM_0012",                source:"A업체 BOM",        resolved:false, cause:"자재 단위 마스터 변경 후 BOM 미동기화", action:"BOM_0012.unit을 Material.unit(KG)으로 변환 후 소요량 재계산", affected:"BOM 1건", autoFixable:true },
  { id:6,  level:"warning", category:"신뢰도 낮은 매핑",  message:"Schema Mapping 신뢰도 60% 미만 항목 3건",                    source:"C업체 수기 Excel",   count:3, resolved:false, cause:"수기 작성 Excel 컬럼명이 비표준으로 AI 매핑 신뢰도 저하", action:"Schema Mapping 페이지에서 해당 3건을 수동 검토·승인", affected:"매핑 3건", autoFixable:false },
  { id:7,  level:"warning", category:"출처 누락",         message:"InspectionResult.inspector_id 출처 정보 없음",                entity:"QC-2406 ~ QC-2412",      source:"D업체 PDF",   count:7, resolved:false, cause:"PDF 파싱 시 서명란 OCR 인식 실패", action:"Document Parser에서 해당 PDF 재파싱 또는 Human Review 큐 등록", affected:"QC 레코드 7건", autoFixable:false },
  { id:8,  level:"info",    category:"데이터 품질",       message:"Customer.phone Null 비율 42% — 입력 권고",                    source:"C업체 ERP",              resolved:false, cause:"CRM 전환 시 전화번호 필드 미이관", action:"C업체 담당자에게 연락처 데이터 제공 요청", affected:"Customer 38건", autoFixable:false },
  { id:9,  level:"info",    category:"데이터 품질",       message:"Order.due_date 날짜 형식 표준화 완료 (127건)",                source:"A업체 ERP",              resolved:true,  resolvedAt:"09:12", cause:"다양한 날짜 형식 혼재", action:"DATE_PARSE 변환 규칙 적용", affected:"Order 127건", autoFixable:true },
  { id:10, level:"info",    category:"데이터 품질",       message:"중복 Product 레코드 18건 제거 완료",                          source:"B업체 MES",              resolved:true,  resolvedAt:"08:55", cause:"MES 배치 중복 적재", action:"중복 제거 스크립트 실행", affected:"Product 18건", autoFixable:true },
];

const SCORE_DATA = [
  { label:"A업체", score:72, errors:3, warnings:2 },
  { label:"B업체", score:88, errors:0, warnings:1 },
  { label:"C업체", score:41, errors:1, warnings:3 },
  { label:"D업체", score:65, errors:0, warnings:2 },
];

const FEED_POOL = [
  "Customer.email 형식 검증 완료 — 322건 정상",
  "Material.density Null 비율 재측정 — 8% (이전 대비 -3%)",
  "BOM 순환 참조 검사 완료 — 이상 없음",
  "Order.amount 음수 값 탐지 — 2건 발견",
  "Supplier.registration_no 중복 검사 완료",
  "Product.category 표준코드 매핑률 96.4%",
];

const CATEGORIES = Array.from(new Set(BASE_ISSUES.map(i=>i.category)));
const SOURCES = Array.from(new Set(BASE_ISSUES.map(i=>i.source).filter(Boolean) as string[]));

function ArcGauge({ score, size=72 }: { score:number; size?:number }) {
  const color = score>=80?"#10b981":score>=60?"#3b82f6":score>=40?"#f59e0b":"#ef4444";
  const r = size*0.38; const cx = size/2; const cy = size/2;
  const circ = 2*Math.PI*r;
  const dash = (score/100)*circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={size*0.1}/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={size*0.1}
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ*0.25}
        strokeLinecap="round" style={{transition:"stroke-dasharray 0.6s"}}/>
      <text x={cx} y={cy+5} textAnchor="middle" fontSize={size*0.22} fontWeight={700} fill={color}>{score}</text>
    </svg>
  );
}

function DonutChart({ issues }: { issues: QualityIssue[] }) {
  const cats = CATEGORIES.map(c=>({ label:c, count:issues.filter(i=>i.category===c&&!i.resolved).length })).filter(c=>c.count>0);
  const total = cats.reduce((a,c)=>a+c.count,0)||1;
  const COLORS = ["#3b82f6","#f59e0b","#ef4444","#10b981","#8b5cf6","#ec4899","#06b6d4"];
  let cumPct = 0;
  const r=36; const cx=50; const cy=50; const circ=2*Math.PI*r;
  return (
    <svg width={100} height={100} viewBox="0 0 100 100">
      {cats.map((c,i)=>{
        const pct = c.count/total;
        const dash = pct*circ;
        const offset = circ*(0.25-cumPct);
        cumPct += pct;
        return <circle key={c.label} cx={cx} cy={cy} r={r} fill="none"
          stroke={COLORS[i%COLORS.length]} strokeWidth={14}
          strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={offset}/>;
      })}
      <text x={cx} y={cy+4} textAnchor="middle" fontSize={10} fontWeight={700} fill="#1e293b">{total}</text>
    </svg>
  );
}

function DetailPanel({ issue, onClose, onResolve, onAutoFix }:
  { issue:QualityIssue; onClose:()=>void; onResolve:(id:number)=>void; onAutoFix:(id:number)=>void }) {
  const [tab, setTab] = useState<"cause"|"action"|"scope">("cause");
  const [fixing, setFixing] = useState(false);
  const [fixed, setFixed] = useState(false);

  const handleAutoFix = () => {
    setFixing(true);
    setTimeout(()=>{ setFixing(false); setFixed(true); onAutoFix(issue.id); }, 1800);
  };

  const Icon = issue.level==="error"?XCircle:issue.level==="warning"?AlertCircle:CheckCircle2;
  const iconCls = issue.level==="error"?"text-rose-500":issue.level==="warning"?"text-amber-500":"text-blue-400";

  return (
    <div className="fixed inset-y-0 right-0 w-[460px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50">
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconCls}`}/>
          <div>
            <div className="text-xs font-semibold text-slate-500">{issue.category}</div>
            <div className="font-semibold text-slate-900 text-sm mt-0.5 leading-snug">{issue.message}</div>
            {issue.source && <div className="text-xs text-slate-400 mt-0.5">{issue.source}{issue.entity&&` · ${issue.entity}`}</div>}
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 shrink-0"><X className="w-4 h-4"/></button>
      </div>

      <div className="flex border-b border-slate-100">
        {(["cause","action","scope"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={"flex-1 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors "+(tab===t?"border-rose-500 text-rose-600":"border-transparent text-slate-500 hover:text-slate-700")}>
            {t==="cause"?"원인 분석":t==="action"?"조치 방법":"영향 범위"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab==="cause"&&(
          <>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-rose-700 mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5"/>원인 분석</div>
              <p className="text-xs text-rose-800 leading-relaxed">{issue.cause}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 space-y-2 text-xs">
              {[["분류",issue.category],["심각도",issue.level==="error"?"오류":issue.level==="warning"?"경고":"정보"],["출처",issue.source||"-"],["엔티티",issue.entity||"-"]].map(([k,v])=>(
                <div key={k} className="flex justify-between"><span className="text-slate-400">{k}</span><span className="font-medium text-slate-700">{v}</span></div>
              ))}
            </div>
          </>
        )}
        {tab==="action"&&(
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5"/>권장 조치</div>
              <p className="text-xs text-blue-800 leading-relaxed">{issue.action}</p>
            </div>
            {issue.autoFixable && (
              <div className={`rounded-xl p-4 border ${fixed?"bg-emerald-50 border-emerald-200":"bg-violet-50 border-violet-200"}`}>
                <div className={`text-xs font-semibold mb-2 ${fixed?"text-emerald-700":"text-violet-700"}`}>자동 수정 가능</div>
                {fixed ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-700"><CheckCircle2 className="w-4 h-4"/>자동 수정 완료</div>
                ) : fixing ? (
                  <div className="flex items-center gap-2 text-xs text-violet-700"><RefreshCw className="w-3.5 h-3.5 animate-spin"/>수정 적용 중...</div>
                ) : (
                  <button onClick={handleAutoFix} className="text-xs px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium">
                    자동 수정 실행
                  </button>
                )}
              </div>
            )}
          </>
        )}
        {tab==="scope"&&(
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5"><Info className="w-3.5 h-3.5"/>영향 범위</div>
              <p className="text-xs text-amber-800">{issue.affected}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-xs font-semibold text-slate-500 mb-2">예상 파급 영향</div>
              {["Schema Mapping","Ontology Mapper","GraphRAG Index"].map((s,i)=>(
                <div key={s} className="flex items-center gap-2 text-xs py-1">
                  <div className={"w-2 h-2 rounded-full "+(i===0?"bg-rose-400":i===1?"bg-amber-400":"bg-slate-300")}/>
                  <span className="text-slate-600">{s}</span>
                  <span className={"ml-auto text-[10px] "+(i<2?"text-amber-600":"text-slate-400")}>{i<2?"영향":"영향 없음"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!issue.resolved && (
        <div className="p-4 border-t border-slate-200 flex gap-2">
          <button onClick={()=>onResolve(issue.id)}
            className="flex-1 text-xs py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition-colors">
            해결 완료 표시
          </button>
          <button className="flex-1 text-xs py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
            Human Review 등록
          </button>
        </div>
      )}
    </div>
  );
}

export default function QualityValidator() {
  const [items, setItems] = useState<QualityIssue[]>(BASE_ISSUES);
  const [levelFilter, setLevelFilter] = useState<IssueLevel|"all">("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [mainTab, setMainTab] = useState<"open"|"resolved">("open");
  const [selected, setSelected] = useState<number|null>(null);
  const [feedLog, setFeedLog] = useState<{ts:string;msg:string}[]>([]);
  const tickRef = useRef(0);

  useEffect(()=>{
    const id = setInterval(()=>{
      tickRef.current++;
      if(tickRef.current%6===0){
        const msg = FEED_POOL[Math.floor(Math.random()*FEED_POOL.length)];
        const now = new Date();
        const ts = `${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}:${now.getSeconds().toString().padStart(2,"0")}`;
        setFeedLog(prev=>[{ts,msg},...prev].slice(0,20));
      }
    },1200);
    return ()=>clearInterval(id);
  },[]);

  const resolve = (id:number) => {
    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}`;
    setItems(prev=>prev.map(i=>i.id===id?{...i,resolved:true,resolvedAt:ts}:i));
    setSelected(null);
  };
  const autoFix = (id:number) => resolve(id);

  const open = items.filter(i=>!i.resolved);
  const resolved = items.filter(i=>i.resolved);
  const errors = open.filter(i=>i.level==="error").length;
  const warnings = open.filter(i=>i.level==="warning").length;
  const infos = open.filter(i=>i.level==="info").length;

  const filtered = open
    .filter(i=>levelFilter==="all"||i.level===levelFilter)
    .filter(i=>sourceFilter==="all"||i.source===sourceFilter)
    .filter(i=>catFilter==="all"||i.category===catFilter);

  const selectedItem = items.find(i=>i.id===selected);

  const catCounts = CATEGORIES.map(c=>({
    cat:c,
    count:open.filter(i=>i.category===c).length,
  })).filter(c=>c.count>0);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quality Validator</h1>
          <p className="text-slate-500 mt-1 text-sm">AI 매핑 및 온보딩 결과의 품질 검증</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-blue-300 transition-colors">
          <RefreshCw className="w-4 h-4"/>재검증 실행
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {label:"오류",value:errors,sub:"즉시 조치",cls:"bg-rose-50 border-rose-200 text-rose-700",sub2:"text-rose-500"},
          {label:"경고",value:warnings,sub:"검토 권고",cls:"bg-amber-50 border-amber-200 text-amber-700",sub2:"text-amber-500"},
          {label:"정보",value:infos,sub:"참고",cls:"bg-blue-50 border-blue-200 text-blue-700",sub2:"text-blue-500"},
          {label:"해결됨",value:resolved.length,sub:"처리 완료",cls:"bg-emerald-50 border-emerald-200 text-emerald-700",sub2:"text-emerald-500"},
        ].map(({label,value,sub,cls,sub2})=>(
          <div key={label} className={`rounded-xl border p-4 ${cls}`}>
            <div className="text-sm font-medium mb-1">{label}</div>
            <div className="text-3xl font-bold">{value}</div>
            <div className={`text-xs mt-1 ${sub2}`}>{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* 업체별 품질 게이지 */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-700 mb-3">업체별 품질 점수</div>
          <div className="grid grid-cols-4 gap-3">
            {SCORE_DATA.map(({label,score,errors:e,warnings:w})=>(
              <div key={label} className="text-center">
                <ArcGauge score={score}/>
                <div className="text-xs font-semibold text-slate-800 mt-1">{label}</div>
                <div className="flex justify-center gap-2 mt-0.5 text-[10px]">
                  {e>0&&<span className="text-rose-600">오류 {e}</span>}
                  {w>0&&<span className="text-amber-600">경고 {w}</span>}
                  {e===0&&w<=1&&<span className="text-emerald-600">양호</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 카테고리 도넛 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-700 mb-3">카테고리별 이슈</div>
          <div className="flex items-center gap-3">
            <DonutChart issues={open}/>
            <div className="space-y-1 flex-1">
              {catCounts.map(({cat,count})=>(
                <div key={cat} className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-600 truncate max-w-[100px]">{cat}</span>
                  <span className="font-bold text-slate-800 ml-1">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1.5">
          {([["all","전체"],["error","오류"],["warning","경고"],["info","정보"]] as const).map(([s,l])=>(
            <button key={s} onClick={()=>setLevelFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${levelFilter===s?"bg-slate-800 text-white border-slate-800":"bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="h-4 border-l border-slate-200"/>
        <select value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none">
          <option value="all">원천 전체</option>
          {SOURCES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none">
          <option value="all">카테고리 전체</option>
          {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-slate-200">
        {([["open",`미해결 (${open.length})`],["resolved",`해결됨 (${resolved.length})`]] as const).map(([key,label])=>(
          <button key={key} onClick={()=>setMainTab(key)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${mainTab===key?"border-blue-600 text-blue-600":"border-transparent text-slate-500 hover:text-slate-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* 이슈 목록 */}
      {mainTab==="open" && (
        <div className="space-y-2">
          {filtered.map(issue=>{
            const Icon = issue.level==="error"?XCircle:issue.level==="warning"?AlertCircle:CheckCircle2;
            const iconCls = issue.level==="error"?"text-rose-500":issue.level==="warning"?"text-amber-500":"text-blue-400";
            const bgCls = issue.level==="error"?"border-rose-200 bg-rose-50":issue.level==="warning"?"border-amber-200 bg-amber-50":"border-blue-100 bg-blue-50";
            return (
              <div key={issue.id} onClick={()=>setSelected(s=>s===issue.id?null:issue.id)}
                className={`rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm ${bgCls} ${selected===issue.id?"ring-2 ring-blue-300":""}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconCls}`}/>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-slate-500">{issue.category}</span>
                        {issue.source&&<span className="text-xs text-slate-400">· {issue.source}</span>}
                        {issue.count&&<span className="text-xs font-medium text-slate-600">{issue.count}건</span>}
                        {issue.autoFixable&&<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">자동수정 가능</span>}
                      </div>
                      <p className="text-sm font-medium text-slate-800">{issue.message}</p>
                      {issue.entity&&<p className="text-xs text-slate-500 mt-0.5">대상: {issue.entity}</p>}
                    </div>
                  </div>
                  <button onClick={e=>{e.stopPropagation();resolve(issue.id);}}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-600 transition-colors">
                    해결 표시
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length===0&&(
            <div className="text-center py-10 text-slate-400 text-sm">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400"/>
              이 카테고리의 이슈가 모두 해결됐습니다.
            </div>
          )}
        </div>
      )}

      {mainTab==="resolved" && (
        <div className="space-y-2">
          {resolved.map(issue=>(
            <div key={issue.id} className="bg-white border border-slate-100 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0"/>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-slate-500">{issue.category}</span>
                  {issue.source&&<span className="text-xs text-slate-400">· {issue.source}</span>}
                </div>
                <p className="text-sm text-slate-700">{issue.message}</p>
              </div>
              {issue.resolvedAt&&(
                <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                  <Clock className="w-3 h-3"/>{issue.resolvedAt}
                </div>
              )}
            </div>
          ))}
          {resolved.length===0&&<div className="text-center py-8 text-slate-400 text-sm">아직 해결된 이슈가 없습니다.</div>}
        </div>
      )}

      {/* 실시간 재검증 피드 */}
      {feedLog.length>0&&(
        <div className="bg-slate-900 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
            <span className="text-xs font-semibold text-slate-300">실시간 검증 이벤트</span>
          </div>
          <div className="space-y-1.5 max-h-28 overflow-y-auto">
            {feedLog.slice(0,6).map((f,i)=>(
              <div key={i} className="flex items-center gap-3 text-xs font-mono">
                <span className="text-slate-500 whitespace-nowrap">{f.ts}</span>
                <span className="text-emerald-400">{f.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 상세 패널 */}
      {selectedItem&&(
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={()=>setSelected(null)}/>
          <DetailPanel issue={selectedItem} onClose={()=>setSelected(null)} onResolve={resolve} onAutoFix={autoFix}/>
        </>
      )}
    </div>
  );
}
