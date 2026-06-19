"use client";

import { useState, useEffect, useRef } from "react";
import { Check, X, Search, ChevronRight, ChevronDown, ArrowRight, FileText, Shuffle, Zap, Clock, Database, GitBranch as DWIcon, Lightbulb } from "lucide-react";

/* ── Star Schema 데이터 ── */
interface DWTable { id:string; label:string; type:"fact"|"dim"; keys:string[]; measures?:string[]; x:number; y:number; color:string; stroke:string }

const DW_TABLES: DWTable[] = [
  { id:"fact", label:"FACT_ORDER",   type:"fact", keys:["date_key","customer_key","product_key","plant_key","material_key"], measures:["quantity","amount_krw","unit_cost"], x:270, y:155, color:"#eff6ff", stroke:"#2563eb" },
  { id:"d_date",     label:"DIM_DATE",     type:"dim",  keys:["date_key","year","quarter","month","day"],           x:50,  y:10,  color:"#f0fdf4", stroke:"#16a34a" },
  { id:"d_customer", label:"DIM_CUSTOMER", type:"dim",  keys:["customer_key","customer_id","name","region"],       x:530, y:10,  color:"#f0fdf4", stroke:"#16a34a" },
  { id:"d_product",  label:"DIM_PRODUCT",  type:"dim",  keys:["product_key","product_id","name","series"],         x:530, y:250, color:"#f0fdf4", stroke:"#16a34a" },
  { id:"d_plant",    label:"DIM_PLANT",    type:"dim",  keys:["plant_key","plant_id","plant_name"],                x:50,  y:250, color:"#f0fdf4", stroke:"#16a34a" },
  { id:"d_material", label:"DIM_MATERIAL", type:"dim",  keys:["material_key","material_id","name","type"],         x:270, y:370, color:"#f0fdf4", stroke:"#16a34a" },
];

const DW_EDGES = [
  { from:"fact", to:"d_date",     label:"date_key" },
  { from:"fact", to:"d_customer", label:"customer_key" },
  { from:"fact", to:"d_product",  label:"product_key" },
  { from:"fact", to:"d_plant",    label:"plant_key" },
  { from:"fact", to:"d_material", label:"material_key" },
];

const OPT_HINTS = [
  { id:1, level:"high",   title:"CUST_NM 표기 불일치", desc:"C업체 수기 Excel 거래처 컬럼 — Entity Resolution 선행 후 매핑 권장. 현재 신뢰도 61%.", action:"Entity Resolution 연동" },
  { id:2, level:"high",   title:"납기일 다형 날짜 파싱", desc:"C업체 수기 Excel 납기일 — DATE_PARSE 룰 미적용, 3가지 포맷 혼재. 신뢰도 58%.", action:"날짜 표준화 룰 등록" },
  { id:3, level:"medium", title:"QTY 단위 불명확", desc:"A업체 ERP QTY 컬럼 — EA vs KG 단위 미확인. OrderLine.quantity 적재 전 단위 코드 검증 필요.", action:"단위 코드 검증 추가" },
  { id:4, level:"medium", title:"AMT 통화 코드 누락", desc:"A업체 ERP AMT — KRW 확인 필요. OrderLine.amount_krw 매핑 시 통화 메타 추가 권장.", action:"통화 메타 컬럼 추가" },
  { id:5, level:"low",    title:"ITEM_CD vs 품번 중복 엔티티", desc:"A업체 ERP ITEM_CD와 Excel BOM 품번이 동일 엔티티일 가능성 있음. 중복 canonical 키 확인 필요.", action:"엔티티 병합 검토" },
  { id:6, level:"high",   title:"YH itm_id INT ↔ itm_cd VARCHAR 이중 키", desc:"DMA100.itm_id(INT PK)와 DMA100.itm_cd(NVARCHAR)가 동시에 사용됨. COS/CAM/LEB는 itm_id 참조, 외부 시스템은 itm_cd 참조 — Product canonical 키 통일 필요.", action:"Product.product_id 키 통일 설계" },
  { id:7, level:"high",   title:"PAY emp_no VARCHAR 길이 불일치", desc:"PAY100.emp_no=VARCHAR(20), HRK100.emp_no=VARCHAR(20)이나 PAY300.emp_no=VARCHAR(10) — 동일 키 길이 상이, JOIN 시 절사 위험.", action:"emp_no 길이 표준화 (VARCHAR(20) 통일)" },
  { id:8, level:"medium", title:"FAT get_dt DATETIME → DATE 변환", desc:"FAT100.get_dt 취득일자가 DATETIME으로 저장되나 시간부 항상 00:00:00 — DATE로 형변환 후 FixedAsset.acquisition_date에 적재 권장.", action:"DATE_TRUNC 변환 적용" },
  { id:9, level:"medium", title:"DMA itm_bnm 영문명 공백·미입력", desc:"DMA100.itm_bnm 영문품목명 null 비율 28%, 공백 문자만 있는 행 12% — Product.name_en 적재 전 TRIM+NULL 처리 필요.", action:"TRIM + NULLIF 변환 추가" },
  { id:10,level:"low",    title:"PAZ ty_bc 지급/공제 코드표 미확정", desc:"PAZ300.ty_bc 급여유형코드가 'PAY'/'DED' 외 'ADJ'(조정) 확인됨 — PayCode.type_code Canonical 코드표 확정 필요.", action:"코드표준 ADJ 항목 추가" },
];

function StarSchemaView() {
  const [selTable, setSelTable] = useState<string|null>(null);
  const sel = DW_TABLES.find(t=>t.id===selTable)||null;

  const getCx = (t:DWTable) => t.x + 90;
  const getCy = (t:DWTable) => t.y + 30;

  return (
    <div className="flex gap-5">
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <DWIcon className="w-4 h-4 text-blue-500"/>
          <span className="text-sm font-semibold text-slate-900">Star Schema — DW 다차원 모델</span>
          <span className="text-xs text-slate-400 ml-2">강의 p.276 기반 · Fact Table 중심 방사형</span>
        </div>
        <div className="p-4">
          <svg viewBox="0 0 720 470" className="w-full" style={{minHeight:320}}>
            <defs>
              <marker id="dw-arr" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
                <path d="M0,0 L0,7 L7,3.5 z" fill="#94a3b8"/>
              </marker>
            </defs>
            {/* 엣지 */}
            {DW_EDGES.map((e,i)=>{
              const from = DW_TABLES.find(t=>t.id===e.from)!;
              const to   = DW_TABLES.find(t=>t.id===e.to)!;
              const fx=getCx(from); const fy=getCy(from);
              const tx=getCx(to);   const ty=getCy(to);
              const mx=(fx+tx)/2; const my=(fy+ty)/2;
              return (
                <g key={i}>
                  <line x1={fx} y1={fy} x2={tx} y2={ty} stroke="#cbd5e1" strokeWidth="1.5" markerEnd="url(#dw-arr)" strokeDasharray="5,3"/>
                  <text x={mx} y={my-4} fontSize="8" fill="#94a3b8" textAnchor="middle">{e.label}</text>
                </g>
              );
            })}
            {/* 테이블 노드 */}
            {DW_TABLES.map(t=>{
              const isSel = selTable===t.id;
              const rowH = 13; const hdr = 22;
              const allCols = [...(t.type==="fact"?t.measures||[]:t.keys)];
              const h = hdr + t.keys.length*rowH + (t.measures?t.measures.length*rowH+4:0) + 6;
              return (
                <g key={t.id} style={{cursor:"pointer"}} onClick={()=>setSelTable(selTable===t.id?null:t.id)}>
                  <rect x={t.x} y={t.y} width={180} height={h} rx={6}
                    fill={t.color} stroke={isSel?"#2563eb":t.stroke} strokeWidth={isSel?2.5:1.5}
                    filter={isSel?"drop-shadow(0 2px 6px #2563eb44)":"none"}/>
                  {/* 헤더 */}
                  <rect x={t.x} y={t.y} width={180} height={hdr} rx={6} fill={t.stroke}/>
                  <rect x={t.x} y={t.y+10} width={180} height={12} fill={t.stroke}/>
                  <text x={t.x+90} y={t.y+14} fontSize="10" fontWeight="700" fill="#fff" textAnchor="middle">{t.label}</text>
                  <text x={t.x+3} y={t.y+14} fontSize="7" fill={t.type==="fact"?"#bfdbfe":"#dcfce7"} textAnchor="start">{t.type==="fact"?"FACT":"DIM"}</text>
                  {/* 키 컬럼 */}
                  {t.keys.map((k,ki)=>(
                    <g key={k}>
                      <text x={t.x+8}  y={t.y+hdr+ki*rowH+10} fontSize="8" fill="#1e3a5f">🔑</text>
                      <text x={t.x+20} y={t.y+hdr+ki*rowH+10} fontSize="8" fill="#334155" fontFamily="monospace">{k}</text>
                    </g>
                  ))}
                  {/* 측정값 (Fact만) */}
                  {t.measures&&(
                    <>
                      <line x1={t.x+4} y1={t.y+hdr+t.keys.length*rowH+2} x2={t.x+176} y2={t.y+hdr+t.keys.length*rowH+2} stroke="#cbd5e1" strokeWidth="0.7"/>
                      {t.measures.map((m,mi)=>(
                        <g key={m}>
                          <text x={t.x+8}  y={t.y+hdr+(t.keys.length+mi)*rowH+rowH+8} fontSize="8" fill="#7c3aed">Σ</text>
                          <text x={t.x+18} y={t.y+hdr+(t.keys.length+mi)*rowH+rowH+8} fontSize="8" fill="#5b21b6" fontFamily="monospace" fontWeight="600">{m}</text>
                        </g>
                      ))}
                    </>
                  )}
                </g>
              );
            })}
            <text x="360" y="456" fontSize="9" fill="#cbd5e1" textAnchor="middle">점선 = FK 참조 · 🔑 = 키 · Σ = 측정값 (Measure)</text>
          </svg>
        </div>
      </div>

      {/* 상세 패널 */}
      <div className="w-56 shrink-0 space-y-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 mb-2">DW 모델 현황</div>
          {[
            {label:"Fact 테이블",value:"1개",cls:"text-blue-600"},
            {label:"Dimension 테이블",value:"5개",cls:"text-emerald-600"},
            {label:"FK 관계",value:"5개",cls:"text-slate-600"},
            {label:"매핑 완료 컬럼",value:"22개",cls:"text-indigo-600"},
          ].map(({label,value,cls})=>(
            <div key={label} className="flex justify-between text-xs py-1 border-b border-slate-50">
              <span className="text-slate-500">{label}</span><span className={`font-bold ${cls}`}>{value}</span>
            </div>
          ))}
        </div>

        {sel ? (
          <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-3">
              <Database className="w-3.5 h-3.5 text-blue-500"/>
              <span className="text-xs font-bold text-slate-800">{sel.label}</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="font-semibold text-slate-500 mb-1">키 컬럼</div>
              {sel.keys.map(k=>(
                <div key={k} className="flex items-center gap-1 font-mono text-slate-700"><span className="text-blue-400">🔑</span>{k}</div>
              ))}
              {sel.measures&&(
                <>
                  <div className="font-semibold text-slate-500 mt-2 mb-1">측정값</div>
                  {sel.measures.map(m=>(
                    <div key={m} className="flex items-center gap-1 font-mono text-violet-700"><span>Σ</span>{m}</div>
                  ))}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-400 text-center">테이블 클릭 시 상세 표시</div>
        )}

        <div className="bg-blue-50 rounded-xl border border-blue-100 p-3 text-xs text-blue-700">
          <div className="font-semibold mb-1">Star Schema 구조</div>
          <ul className="space-y-1 text-blue-600">
            <li>• Fact Table이 중앙에 위치</li>
            <li>• Dimension Table이 방사형 배치</li>
            <li>• FK로 Fact ↔ Dim 연결</li>
            <li>• 집계는 Fact 측정값 기준</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function OptimizeView() {
  const levelColors = { high:"bg-rose-100 text-rose-700", medium:"bg-amber-100 text-amber-700", low:"bg-blue-100 text-blue-700" };
  const levelLabel  = { high:"High", medium:"Medium", low:"Low" };
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-amber-500"/>
          <span className="text-sm font-semibold text-slate-900">매핑 최적화 제안</span>
          <span className="text-xs text-slate-400 ml-1">AI 분석 기반 · 신뢰도 저하 원인 및 개선 방안</span>
        </div>
        <div className="space-y-3">
          {OPT_HINTS.map(h=>(
            <div key={h.id} className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="shrink-0 pt-0.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${levelColors[h.level as keyof typeof levelColors]}`}>
                  {levelLabel[h.level as keyof typeof levelLabel]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800">{h.title}</div>
                <div className="text-xs text-slate-500 mt-1 leading-relaxed">{h.desc}</div>
              </div>
              <div className="shrink-0">
                <button className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-slate-600 font-medium transition-colors whitespace-nowrap">
                  {h.action}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:"미해결 High", value:"2건", cls:"text-rose-600", bg:"bg-rose-50 border-rose-100" },
          { label:"미해결 Medium", value:"2건", cls:"text-amber-600", bg:"bg-amber-50 border-amber-100" },
          { label:"예상 신뢰도 향상", value:"+12%p", cls:"text-emerald-600", bg:"bg-emerald-50 border-emerald-100" },
        ].map(({label,value,cls,bg})=>(
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <div className={`text-2xl font-bold ${cls}`}>{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  /* ── E업체 YH ERP — QMM 품질관리 ── */
  { id:19, source:"YH QMM 품질",     srcCol:"iqc_no",         srcType:"VARCHAR(20)",   canonical:"Inspection.inspection_id", confidence:97, status:"approved", note:"IQC 수입검사 번호 — PK",               sampleValues:["IQC2026001","IQC2026002"], transform:"DIRECT" },
  { id:20, source:"YH QMM 품질",     srcCol:"cust_cd",        srcType:"VARCHAR(20)",   canonical:"Customer.customer_id",     confidence:93, status:"approved", note:"QMM100.cust_cd → 거래처 코드",        sampleValues:["C0021","C0045","C-HDM"], transform:"DIRECT" },
  { id:21, source:"YH QMM 품질",     srcCol:"itm_id",         srcType:"INT(10)",       canonical:"Product.product_id",       confidence:89, status:"pending",  note:"INT 키 → 품목코드 조인 필요 (itm_bc)", sampleValues:["1024","3821","5012"], transform:"INT_TO_STR" },
  { id:22, source:"YH QMM 품질",     srcCol:"dlv_qty",        srcType:"DECIMAL(18,5)", canonical:"Inspection.qty_received",  confidence:95, status:"approved", note:"",                                    sampleValues:["500.00000","1200.00000"], transform:"CAST_DECIMAL" },
  { id:23, source:"YH QMM 품질",     srcCol:"ok_qty",         srcType:"DECIMAL(18,5)", canonical:"Inspection.qty_ok",        confidence:95, status:"approved", note:"",                                    sampleValues:["498.00000","1195.00000"], transform:"CAST_DECIMAL" },
  { id:24, source:"YH QMM 품질",     srcCol:"bad_qty",        srcType:"DECIMAL(18,5)", canonical:"Inspection.qty_defect",    confidence:95, status:"approved", note:"불량수량 — QC defect count",          sampleValues:["2.00000","5.00000"], transform:"CAST_DECIMAL" },
  /* ── E업체 YH ERP — COS 원가관리 ── */
  { id:25, source:"YH COS 원가",     srcCol:"itm_cd",         srcType:"VARCHAR(40)",   canonical:"Product.product_id",       confidence:91, status:"approved", note:"COS200_YH 품목코드",                  sampleValues:["P-AL6061-01","P-PCB-M02"], transform:"DIRECT" },
  { id:26, source:"YH COS 원가",     srcCol:"itm_nm",         srcType:"VARCHAR(100)",  canonical:"Product.name",             confidence:88, status:"approved", note:"",                                    sampleValues:["AL6061 판재 3T","PCB 메인보드"], transform:"TRIM" },
  { id:27, source:"YH COS 원가",     srcCol:"in_qty",         srcType:"DECIMAL(18,5)", canonical:"OrderLine.quantity",       confidence:86, status:"pending",  note:"입고수량 — 단위 EA 확인 필요",        sampleValues:["1000.00000","500.00000"], transform:"CAST_DECIMAL" },
  { id:28, source:"YH COS 원가",     srcCol:"in_amt",         srcType:"DECIMAL(18,5)", canonical:"OrderLine.amount_krw",     confidence:84, status:"pending",  note:"입고금액 KRW",                        sampleValues:["3500000.00000","1250000.00000"], transform:"CAST_DECIMAL" },
  { id:29, source:"YH COS 원가",     srcCol:"end_up",         srcType:"DECIMAL(18,10)","canonical":"Product.unit_cost",      confidence:90, status:"approved", note:"기말 단가 — 원가 단가 기준",          sampleValues:["3500.0000000000","2500.0000000000"], transform:"CAST_DECIMAL" },
  { id:30, source:"YH COS 원가",     srcCol:"cost_mon",       srcType:"CHAR(7)",       canonical:"CostPeriod.period_ym",     confidence:82, status:"pending",  note:"원가계산 월 YYYYMM 형식",             sampleValues:["202601","202602"], transform:"DATE_FORMAT" },
  /* ── E업체 YH ERP — CAM 재고관리 ── */
  { id:31, source:"YH CAM 재고",     srcCol:"itm_cd",         srcType:"VARCHAR(40)",   canonical:"Material.material_id",     confidence:90, status:"approved", note:"CAM100_YH 자재코드",                  sampleValues:["M-SUS304-2T","M-AL6061"], transform:"DIRECT" },
  { id:32, source:"YH CAM 재고",     srcCol:"end_qty",        srcType:"DECIMAL(18,5)", canonical:"Inventory.end_qty",        confidence:92, status:"approved", note:"기말재고수량",                        sampleValues:["2400.00000","850.00000"], transform:"CAST_DECIMAL" },
  { id:33, source:"YH CAM 재고",     srcCol:"end_amt",        srcType:"DECIMAL(18,5)", canonical:"Inventory.end_amt",        confidence:91, status:"approved", note:"기말재고금액 KRW",                   sampleValues:["8400000.00000","2125000.00000"], transform:"CAST_DECIMAL" },
  /* ── E업체 YH ERP — PPZ 생산설비 ── */
  { id:34, source:"YH PPZ 생산",     srcCol:"wc_cd",          srcType:"VARCHAR(10)",   canonical:"WorkCenter.wc_id",         confidence:96, status:"approved", note:"PPZ100 작업센터 코드 — PK",           sampleValues:["WC-INJ-01","WC-ASM-03"], transform:"DIRECT" },
  { id:35, source:"YH PPZ 생산",     srcCol:"wc_nm",          srcType:"NVARCHAR(50)",  canonical:"WorkCenter.name",          confidence:94, status:"approved", note:"",                                    sampleValues:["사출 1호기 라인","조립 3라인"], transform:"TRIM" },
  { id:36, source:"YH PPZ 생산",     srcCol:"fac_cd",         srcType:"VARCHAR(10)",   canonical:"Plant.plant_id",           confidence:96, status:"approved", note:"공장코드 — co_cd와 함께 복합키",      sampleValues:["FAC01","FAC02"], transform:"DIRECT" },
  /* ── E업체 YH ERP — LEB 출고/창고 ── */
  { id:37, source:"YH LEB 출고",     srcCol:"out_no",         srcType:"VARCHAR(20)",   canonical:"Delivery.delivery_id",     confidence:97, status:"approved", note:"LEB100 출고번호 — PK",               sampleValues:["OUT202601001","OUT202601002"], transform:"DIRECT" },
  { id:38, source:"YH LEB 출고",     srcCol:"out_qty",        srcType:"DECIMAL(18,5)", canonical:"Delivery.qty",             confidence:93, status:"approved", note:"출고수량",                           sampleValues:["100.00000","50.00000"], transform:"CAST_DECIMAL" },
  { id:39, source:"YH LEB 출고",     srcCol:"out_amt",        srcType:"DECIMAL(18,5)", canonical:"Delivery.amount_krw",      confidence:91, status:"approved", note:"출고금액 KRW",                       sampleValues:["350000.00000","175000.00000"], transform:"CAST_DECIMAL" },
  /* ── E업체 YH ERP — FAT 고정자산/세무 ── */
  { id:40, source:"YH FAT 자산",     srcCol:"mng_no",         srcType:"VARCHAR(50)",   canonical:"FixedAsset.asset_id",       confidence:96, status:"approved", note:"FAT100 자산 관리번호 — PK",            sampleValues:["FA2026-0001","FA2026-0002"], transform:"DIRECT" },
  { id:41, source:"YH FAT 자산",     srcCol:"mng_nm",         srcType:"NVARCHAR(100)", canonical:"FixedAsset.name",           confidence:94, status:"approved", note:"자산명",                              sampleValues:["CNC 선반 5호기","사무용 PC"], transform:"TRIM" },
  { id:42, source:"YH FAT 자산",     srcCol:"get_dt",         srcType:"DATETIME",      canonical:"FixedAsset.acquisition_date",confidence:92,status:"approved", note:"취득일자",                            sampleValues:["2023-03-15 00:00:00","2022-07-01 00:00:00"], transform:"DATE_TRUNC" },
  { id:43, source:"YH FAT 자산",     srcCol:"get_amt",        srcType:"DECIMAL(18,5)", canonical:"FixedAsset.acquisition_amt",confidence:93, status:"approved", note:"취득금액 KRW",                       sampleValues:["45000000.00000","1200000.00000"], transform:"CAST_DECIMAL" },
  { id:44, source:"YH FAT 자산",     srcCol:"cust_cd",        srcType:"VARCHAR(20)",   canonical:"Customer.customer_id",      confidence:87, status:"pending",  note:"FAT100 거래처코드 — 납품업체 참조",   sampleValues:["V0012","V0045"], transform:"DIRECT" },
  { id:45, source:"YH FAT 세무",     srcCol:"biz_no",         srcType:"VARCHAR(20)",   canonical:"Customer.biz_no",           confidence:91, status:"approved", note:"FAT300 사업자번호",                   sampleValues:["123-45-67890","987-65-43210"], transform:"DIRECT" },
  { id:46, source:"YH FAT 세무",     srcCol:"sum_amt",        srcType:"DECIMAL(20,0)", canonical:"TaxDoc.supply_amt",         confidence:93, status:"approved", note:"FAT300 공급가액 합계 KRW",            sampleValues:["50000000","12000000"], transform:"CAST_DECIMAL" },
  { id:47, source:"YH FAT 세무",     srcCol:"sum_vat",        srcType:"DECIMAL(20,0)", canonical:"TaxDoc.vat_amt",            confidence:93, status:"approved", note:"FAT300 부가세 합계 KRW",              sampleValues:["5000000","1200000"], transform:"CAST_DECIMAL" },
  /* ── E업체 YH ERP — PAY 급여/연말정산 ── */
  { id:48, source:"YH PAY 급여",     srcCol:"app_year",       srcType:"CHAR(4)",       canonical:"PayPeriod.fiscal_year",     confidence:91, status:"approved", note:"PAY100 귀속연도 YYYY",                sampleValues:["2025","2026"], transform:"DATE_FORMAT" },
  { id:49, source:"YH PAY 급여",     srcCol:"emp_no",         srcType:"VARCHAR(20)",   canonical:"Employee.emp_no",           confidence:97, status:"approved", note:"사원번호 — HR 공통 PK",               sampleValues:["E001","E012","E099"], transform:"DIRECT" },
  { id:50, source:"YH PAY 급여",     srcCol:"pay_amt",        srcType:"DECIMAL(18,0)", canonical:"Payroll.total_pay",         confidence:92, status:"approved", note:"PAY110/PAY300 급여합계 KRW",          sampleValues:["3200000","2800000"], transform:"CAST_DECIMAL" },
  { id:51, source:"YH PAY 급여",     srcCol:"in_tax",         srcType:"DECIMAL(15,0)", canonical:"Payroll.income_tax",        confidence:90, status:"approved", note:"PAY110 소득세 KRW",                   sampleValues:["85000","42000"], transform:"CAST_DECIMAL" },
  { id:52, source:"YH PAY 급여",     srcCol:"local_tax",      srcType:"DECIMAL(15,0)", canonical:"Payroll.local_tax",         confidence:90, status:"approved", note:"PAY110 지방소득세 KRW",               sampleValues:["8500","4200"], transform:"CAST_DECIMAL" },
  { id:53, source:"YH PAY 급여",     srcCol:"medi_amt",       srcType:"DECIMAL(15,0)", canonical:"Payroll.medical_ins",       confidence:89, status:"approved", note:"PAY110 건강보험료 KRW",               sampleValues:["112000","98000"], transform:"CAST_DECIMAL" },
  { id:54, source:"YH PAY 급여",     srcCol:"pens_amt",       srcType:"DECIMAL(15,0)", canonical:"Payroll.pension",           confidence:89, status:"approved", note:"PAY110 국민연금 KRW",                 sampleValues:["144000","126000"], transform:"CAST_DECIMAL" },
  /* ── E업체 YH ERP — HRK 인사 ── */
  { id:55, source:"YH HRK 인사",     srcCol:"emp_no",         srcType:"VARCHAR(20)",   canonical:"Employee.emp_no",           confidence:97, status:"approved", note:"HRK100 사원번호 — PAY emp_no 동일 키", sampleValues:["E001","E012"], transform:"DIRECT" },
  { id:56, source:"YH HRK 인사",     srcCol:"name",           srcType:"NVARCHAR(50)",  canonical:"Employee.name",             confidence:94, status:"approved", note:"HRK100 부양가족명 (본인 포함)",        sampleValues:["홍길동","김철수"], transform:"TRIM" },
  { id:57, source:"YH HRK 인사",     srcCol:"bir_dt",         srcType:"DATETIME",      canonical:"Employee.birth_date",       confidence:92, status:"approved", note:"HRK100 생년월일",                     sampleValues:["1985-03-22 00:00:00","1991-11-05 00:00:00"], transform:"DATE_TRUNC" },
  { id:58, source:"YH HRK 인사",     srcCol:"duty_bc",        srcType:"VARCHAR(10)",   canonical:"Employee.position_code",    confidence:88, status:"pending",  note:"HRK220 직위코드 — 코드표준 매핑 필요", sampleValues:["D01","M03","S05"], transform:"DIRECT" },
  { id:59, source:"YH HRK 인사",     srcCol:"stat_bc",        srcType:"VARCHAR(10)",   canonical:"Employee.status_code",      confidence:85, status:"pending",  note:"HRK100 재직상태코드 — 재직/휴직/퇴직", sampleValues:["ACT","LOA","RET"], transform:"DIRECT" },
  /* ── E업체 YH ERP — DMA 품목마스터 ── */
  { id:60, source:"YH DMA 품목",     srcCol:"itm_id",         srcType:"INT(10)",       canonical:"Product.product_id",        confidence:92, status:"approved", note:"DMA100 품목 INT PK — COS/CAM/LEB itm_id와 동일 엔티티", sampleValues:["1024","3821","5012"], transform:"INT_TO_STR" },
  { id:61, source:"YH DMA 품목",     srcCol:"itm_cd",         srcType:"NVARCHAR(50)",  canonical:"Product.product_code",      confidence:95, status:"approved", note:"DMA100 품목코드 (human-readable)",     sampleValues:["P-AL6061-01","P-PCB-M02"], transform:"TRIM" },
  { id:62, source:"YH DMA 품목",     srcCol:"itm_nm",         srcType:"NVARCHAR(100)", canonical:"Product.name",              confidence:95, status:"approved", note:"DMA100 품목명",                       sampleValues:["AL6061 판재 3T","PCB 메인보드"], transform:"TRIM" },
  { id:63, source:"YH DMA 품목",     srcCol:"itm_bnm",        srcType:"NVARCHAR(100)", canonical:"Product.name_en",           confidence:82, status:"pending",  note:"DMA100 영문 품목명 — 공백 다수 존재",  sampleValues:["AL6061 Plate 3T","PCB Mainboard"], transform:"TRIM" },
  { id:64, source:"YH DMA 품목",     srcCol:"spec",           srcType:"NVARCHAR(100)", canonical:"Product.spec",              confidence:88, status:"approved", note:"DMA100 규격",                         sampleValues:["3T×200×500","FR4 1.6T"], transform:"TRIM" },
  { id:65, source:"YH DMA 품목",     srcCol:"um_bc",          srcType:"VARCHAR(10)",   canonical:"Product.unit_code",         confidence:91, status:"approved", note:"DMA100 단위코드 (업무코드)",           sampleValues:["EA","KG","M"], transform:"DIRECT" },
  { id:66, source:"YH DMA 품목",     srcCol:"grp1_cd",        srcType:"NVARCHAR(20)",  canonical:"Product.category1",         confidence:87, status:"pending",  note:"DMA100 품목 대분류",                  sampleValues:["원자재","반제품","완제품"], transform:"DIRECT" },
  { id:67, source:"YH DMA 품목",     srcCol:"grp2_cd",        srcType:"NVARCHAR(20)",  canonical:"Product.category2",         confidence:83, status:"pending",  note:"DMA100 품목 중분류",                  sampleValues:["알루미늄","PCB","포장재"], transform:"DIRECT" },
  /* ── E업체 YH ERP — PAZ 급여기준 ── */
  { id:68, source:"YH PAZ 기준",     srcCol:"pay_cd",         srcType:"VARCHAR(10)",   canonical:"PayCode.pay_cd",            confidence:95, status:"approved", note:"PAZ300 급여코드 — PK",               sampleValues:["P001","P010","D001"], transform:"DIRECT" },
  { id:69, source:"YH PAZ 기준",     srcCol:"pay_nm",         srcType:"NVARCHAR(50)",  canonical:"PayCode.name",              confidence:93, status:"approved", note:"PAZ300 급여항목명",                   sampleValues:["기본급","직책수당","식대"], transform:"TRIM" },
  { id:70, source:"YH PAZ 기준",     srcCol:"ty_bc",          srcType:"VARCHAR(10)",   canonical:"PayCode.type_code",         confidence:88, status:"pending",  note:"PAZ300 급여유형코드 (지급/공제)",      sampleValues:["PAY","DED"], transform:"DIRECT" },
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
  "E업체 YH QMM — iqc_no·ok_qty·bad_qty 적재 완료",
  "E업체 YH FAT — mng_no·get_amt·biz_no 자산/세무 매핑 승인",
  "E업체 YH PAY — emp_no·pay_amt·in_tax 급여 7개 컬럼 완료",
  "E업체 YH HRK — emp_no·name·bir_dt 인사 매핑 승인",
  "E업체 YH DMA — itm_id·itm_cd·grp1_cd 품목마스터 8개 완료",
  "E업체 YH PAZ — pay_cd·pay_nm 급여기준 매핑 완료",
  "스키마 검증 — YH ERP 52개 컬럼 포함 총 783개 중 731개 매핑",
  "Human Review — 미매핑 52건 큐 등록 (itm_id INT 조인·emp_no 길이 불일치 포함)",
  "자동 승인 — 신뢰도 90%+ 컬럼 31건 일괄 처리",
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

type PageView = "mapping" | "dw-model" | "optimize";

export default function SchemaMapping() {
  const [pageView, setPageView] = useState<PageView>("mapping");
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
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {([["mapping","매핑 목록",Shuffle],["dw-model","DW 모델",DWIcon],["optimize","최적화 제안",Lightbulb]] as const).map(([v,label,Icon])=>(
            <button key={v} onClick={()=>setPageView(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${pageView===v?"bg-white text-blue-700 shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
              <Icon className="w-3.5 h-3.5"/>{label}
            </button>
          ))}
        </div>
      </div>

      {/* DW 모델 / 최적화 뷰 */}
      {pageView==="dw-model" && <StarSchemaView/>}
      {pageView==="optimize" && <OptimizeView/>}

      {/* 매핑 목록 뷰 */}
      {pageView==="mapping" && <>

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

      </> /* end pageView==="mapping" */}
    </div>
  );
}
