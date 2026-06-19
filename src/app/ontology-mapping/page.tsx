"use client";

import { useState, useEffect, useRef } from "react";
import {
  Check, X, Network, Lightbulb, Database, ChevronRight, Activity,
  BookOpen, Code2, Layers, Settings2, GitBranch, Clock, Plus,
  ShieldCheck, AlertTriangle, Eye, Edit3, Trash2, Copy, CheckCircle2,
} from "lucide-react";

// ─── Dict 6종 타입 ───────────────────────────────────────────────
type DictCategory = "code" | "product" | "eco" | "equipment" | "algorithm" | "effective_date";
type DictStatus = "verified" | "active" | "draft" | "deprecated";

interface DictEntry {
  key: string;
  value: string;
  desc?: string;
}

interface DictItem {
  id: string;
  category: DictCategory;
  name: string;
  desc: string;
  status: DictStatus;
  source: string;
  entries: DictEntry[];
  verifiedAt?: string;
  usedIn: string[];
  errorIfMissing: string;
  tags: string[];
}

// ─── 온톨로지 매핑 타입 ─────────────────────────────────────────
type MapStatus = "approved" | "pending" | "review";
interface Mapping {
  id: number; canonical: string; domain: string; relation: string;
  confidence: number; status: MapStatus; desc: string;
  examples: string[]; altDomains: string[]; reviewReason?: string;
}

// ─── 상수 ────────────────────────────────────────────────────────
const DICT_CATEGORIES: { key: DictCategory; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { key:"code",           label:"코드 약속",       icon:Code2,      color:"text-blue-600",   bg:"bg-blue-50 border-blue-200" },
  { key:"product",        label:"제품 계층",       icon:Layers,     color:"text-violet-600",  bg:"bg-violet-50 border-violet-200" },
  { key:"eco",            label:"ECO 규칙",        icon:GitBranch,  color:"text-orange-600",  bg:"bg-orange-50 border-orange-200" },
  { key:"equipment",      label:"설비별 노하우",    icon:Settings2,  color:"text-teal-600",    bg:"bg-teal-50 border-teal-200" },
  { key:"algorithm",      label:"도메인 알고리즘",  icon:Activity,   color:"text-rose-600",    bg:"bg-rose-50 border-rose-200" },
  { key:"effective_date", label:"발효일 매핑",     icon:Clock,      color:"text-amber-600",   bg:"bg-amber-50 border-amber-200" },
];

const STATUS_META: Record<DictStatus, { label: string; cls: string }> = {
  verified:   { label:"검증 완료", cls:"bg-emerald-100 text-emerald-700" },
  active:     { label:"운영 중",   cls:"bg-blue-100 text-blue-700" },
  draft:      { label:"작성 중",   cls:"bg-slate-100 text-slate-600" },
  deprecated: { label:"폐기",      cls:"bg-red-100 text-red-600" },
};

const INIT_DICTS: DictItem[] = [
  {
    id:"D1", category:"code", name:"SN / EQP_ID 구조 규약",
    desc:"SN 30~32자리 파싱 규칙, EQP_ID(INVD1001_M01_T01) 분해 로직, 라인 코드 테이블",
    status:"verified", source:"생산기술팀", verifiedAt:"2026-05-14",
    entries:[
      { key:"SN_PREFIX_LEN", value:"4", desc:"SN 앞 4자리 = 제품 시리즈 코드" },
      { key:"SN_DATE_START", value:"5", desc:"SN 5~10번째 = YYMMDD 제조일자" },
      { key:"SN_SEQ_END",    value:"32", desc:"SN 마지막 6자리 = 일련번호" },
      { key:"EQP_ID_SEP",   value:"_", desc:"EQP_ID 구분자: 설비코드_라인_툴" },
      { key:"LINE_A",       value:"M01", desc:"M01 = 1라인 조립" },
      { key:"LINE_B",       value:"M02", desc:"M02 = 2라인 조립" },
    ],
    usedIn:["INV 검사 이력 조회","SN drilldown 워커","LOT 역추적"],
    errorIfMissing:"챗봇이 라인 코드·설비 ID를 잘못 매핑",
    tags:["SN","EQP_ID","line_codes"],
  },
  {
    id:"D2", category:"product", name:"SPG / 제품군 코드 계층",
    desc:"SPG 앞 3자리로 제품군 분류. 550=INV, 500=PLC. 시리즈(G100 등)가 SPG 하위 계층",
    status:"active", source:"개발팀",
    entries:[
      { key:"SPG_550", value:"INV",  desc:"인버터 제품군" },
      { key:"SPG_500", value:"PLC",  desc:"PLC 제품군" },
      { key:"SPG_400", value:"HMI",  desc:"HMI 제품군" },
      { key:"SERIES_G100", value:"SPG_550", desc:"G100 시리즈 → 인버터 하위" },
      { key:"SERIES_XGB",  value:"SPG_500", desc:"XGB 시리즈 → PLC 하위" },
    ],
    usedIn:["제품군 질의 워커","클레임 집계","ECO 영향 범위"],
    errorIfMissing:"제품군 질의 빈 결과 또는 잘못된 합산",
    tags:["SPG","제품군","G100"],
  },
  {
    id:"D3", category:"eco", name:"ECO_NO revision 인스턴스 규칙",
    desc:"PLM ECO_NO는 하나지만 끝 3자리로 revision 인스턴스를 구분함. 이를 모르면 같은 ECO를 N건으로 셈",
    status:"verified", source:"생산기술팀", verifiedAt:"2026-05-20",
    entries:[
      { key:"ECO_REV_SUFFIX_LEN", value:"3",   desc:"ECO_NO 끝 3자리 = revision 식별자" },
      { key:"ECO_REV_FIRST",      value:"001",  desc:"최초 revision 코드" },
      { key:"ECO_REV_MAX",        value:"999",  desc:"revision 최대값" },
      { key:"ECO_BASE_LEN",       value:"6",    desc:"ECO_NO 앞 6자리 = 기본 변경 번호" },
    ],
    usedIn:["ECO 영향 SN 군집","revision 분기 시각화","ECO Impact Tracker"],
    errorIfMissing:"같은 ECO를 N건으로 셈 → 영향 SN 집계가 1/N으로 축소",
    tags:["ECO_NO","revision","BOM"],
  },
  {
    id:"D4", category:"equipment", name:"INV 설비별 검사결과 컬럼 매핑",
    desc:"tbl_MES_RESULT_INV는 설비마다 결과 컬럼이 다름. INVD08→INRS_3, INVD10→INRS_7 등",
    status:"active", source:"품질팀",
    entries:[
      { key:"INVD08", value:"INRS_3", desc:"INVD08 설비 결과 컬럼" },
      { key:"INVD09", value:"INRS_5", desc:"INVD09 설비 결과 컬럼" },
      { key:"INVD10", value:"INRS_7", desc:"INVD10 설비 결과 컬럼" },
      { key:"INVD11", value:"INRS_7", desc:"INVD11 설비 결과 컬럼 (D10과 동일)" },
    ],
    usedIn:["INV 검사 이력 조회","SN drilldown 워커"],
    errorIfMissing:"한 설비 결과만 보여주고 다른 설비는 빈 칸",
    tags:["INV","INRS","설비컬럼"],
  },
  {
    id:"D5", category:"algorithm", name:"MATERIAL_TRAN 자재 LOT 역추적 (8단계 FIFO)",
    desc:"MATERIAL_TRAN에 LOT_ID 컬럼이 없어 WO→Issue→Job→LOT후보→FIFO→LOT_ID→ECO매칭→confidence 8단계로 역추적",
    status:"verified", source:"생산기술팀", verifiedAt:"2026-05-28",
    entries:[
      { key:"STEP1", value:"WO 조회",         desc:"SN → 워크오더 매핑" },
      { key:"STEP2", value:"자재 Issue 시점", desc:"WIP Issue / Job Schedule" },
      { key:"STEP3", value:"Job/Schedule 결합", desc:"시점 단일화" },
      { key:"STEP4", value:"LOT 후보 집합",   desc:"시간창 ±N일" },
      { key:"STEP5", value:"FIFO 출고순 정렬", desc:"오래된 LOT 우선" },
      { key:"STEP6", value:"LOT_ID 매핑 추정", desc:"WO ↔ LOT 대응" },
      { key:"STEP7", value:"ECO 영향 자재 매칭", desc:"같은 자재 ITEM_CD" },
      { key:"STEP8", value:"confidence 산출", desc:"0.0 ~ 1.0" },
    ],
    usedIn:["자재 LOT 역추적 워커","Quality Escape 추적","ECO Impact Tracker"],
    errorIfMissing:"자재 역추적 자체가 불가능. LLM 단독 추론 시도 = 환각의 입구",
    tags:["MATERIAL_TRAN","LOT","FIFO","역추적"],
  },
  {
    id:"D6", category:"effective_date", name:"PLM·ERP·MES 발효일 매핑 규칙",
    desc:"PLM ECO 발효일, ERP BOM 발효일, MES 워크오더 발효일이 모두 다름. FIFO 현장 실제 적용 시점이 또 다름",
    status:"verified", source:"생산기술팀", verifiedAt:"2026-06-01",
    entries:[
      { key:"PLM_ECO_EFF_DATE",  value:"ECO_EFF_DT",   desc:"PLM ECO 발효일 컬럼" },
      { key:"ERP_BOM_EFF_DATE",  value:"BOM_CHNG_DT",  desc:"ERP BOM 변경일 컬럼 (PLM+1~3일 지연)" },
      { key:"MES_WO_EFF_DATE",   value:"WO_START_DT",  desc:"MES 워크오더 발효일 (ERP+0~2일)" },
      { key:"FIFO_ACTUAL_DATE",  value:"FIRST_ISSUE_DT",desc:"FIFO 현장 실제 자재 투입일 (MES WO 이후)" },
      { key:"DATE_PRIORITY",     value:"FIFO_ACTUAL",   desc:"원가절감 실적 산정 기준 = FIFO 실제 투입일" },
    ],
    usedIn:["ECO 원가절감 실적 산정","LOT 역추적 시점 기준","발효일 충돌 검증"],
    errorIfMissing:"원가절감 실적·ECO 영향이 잘못 추정됨",
    tags:["발효일","ECO","ERP","MES","FIFO"],
  },
];

const DOMAINS = ["Material","Product","Customer","Supplier","Order","BOM","Process","Machine","Measurement","Maintenance","Money","Method"];
const RELATION_COLORS: Record<string,string> = {
  "is_a":"bg-blue-100 text-blue-700","part_of":"bg-violet-100 text-violet-700",
  "defines_structure_of":"bg-indigo-100 text-indigo-700","produces":"bg-green-100 text-green-700",
  "triggers":"bg-orange-100 text-orange-700","located_at":"bg-slate-100 text-slate-700",
  "documents":"bg-teal-100 text-teal-700","references":"bg-pink-100 text-pink-700",
};
const BASE_MAPPINGS: Mapping[] = [
  { id:1, canonical:"Customer",domain:"Customer",relation:"is_a",confidence:98,status:"approved",desc:"구매 거래처 → Customer 도메인",examples:["삼성전자","현대모비스"],altDomains:["Supplier"] },
  { id:2, canonical:"Product",domain:"Product",relation:"is_a",confidence:95,status:"approved",desc:"완제품/반제품 → Product 도메인",examples:["PCB 기판 A타입"],altDomains:["Material"] },
  { id:3, canonical:"Material",domain:"Material",relation:"is_a",confidence:97,status:"approved",desc:"원자재/부자재 → Material 도메인",examples:["고무 오링","SUS304 파이프"],altDomains:["Product"] },
  { id:4, canonical:"BOM",domain:"BOM",relation:"defines_structure_of",confidence:93,status:"approved",desc:"자재명세서 → BOM 도메인",examples:["BOM-2026-001"],altDomains:["Process"] },
  { id:5, canonical:"Order",domain:"Order",relation:"is_a",confidence:91,status:"approved",desc:"판매/구매 주문 → Order 도메인",examples:["PO-2026-0847"],altDomains:[] },
  { id:6, canonical:"WorkOrder",domain:"Process",relation:"is_a",confidence:87,status:"pending",desc:"작업지시 → Process 도메인",examples:["WO-2026-3812"],altDomains:["Maintenance"] },
  { id:7, canonical:"Equipment",domain:"Machine",relation:"is_a",confidence:90,status:"pending",desc:"설비/기계 → Machine 도메인",examples:["CNC-001","프레스-A3"],altDomains:["Maintenance"] },
  { id:8, canonical:"InspectionResult",domain:"Measurement",relation:"produces",confidence:85,status:"pending",desc:"검사성적서 결과 → Measurement 도메인",examples:["INSP-2026-0512"],altDomains:["Process"] },
  { id:9, canonical:"FailureLog",domain:"Maintenance",relation:"triggers",confidence:78,status:"pending",desc:"설비 고장 로그 → Maintenance 도메인",examples:["FAIL-2026-0331"],altDomains:["Machine"] },
  { id:10, canonical:"SOP",domain:"Method",relation:"documents",confidence:88,status:"pending",desc:"표준작업절차 → Method 도메인",examples:["SOP-WELD-001"],altDomains:["Process"] },
];

/* ── 모델링 표준화 데이터 ── */
const WORD_STANDARDS = [
  { eng:"CUSTOMER",  kor:"고객사",    abbr:"CUST", rule:"법인명 기준 · ㈜/주식회사 제거",          example:"삼성전자 → CUST_NM" },
  { eng:"MATERIAL",  kor:"자재",      abbr:"MAT",  rule:"품목코드 앞자리로 자재/제품 구분",         example:"MAT_CD, MAT_NM" },
  { eng:"PRODUCT",   kor:"제품",      abbr:"PROD", rule:"SPG 코드 앞 3자리 기준 분류",             example:"PROD_CD, PROD_NM" },
  { eng:"ORDER",     kor:"주문",      abbr:"ORD",  rule:"판매주문/구매주문 접두어로 구분",          example:"SALE_ORD_NO, PUR_ORD_NO" },
  { eng:"DATE",      kor:"일자",      abbr:"DT",   rule:"YYYYMMDD 또는 ISO 8601 · 접미어 _DT",    example:"ORD_DT, EFF_DT" },
  { eng:"QUANTITY",  kor:"수량",      abbr:"QTY",  rule:"단위코드(_UOM) 반드시 병기",              example:"QTY, QTY_UOM" },
  { eng:"AMOUNT",    kor:"금액",      abbr:"AMT",  rule:"통화코드(_CCY) 병기 · 소수점 2자리",      example:"AMT, AMT_CCY" },
  { eng:"STATUS",    kor:"상태",      abbr:"STS",  rule:"코드표준(CODE_STANDARD) 참조",            example:"ORD_STS, WO_STS" },
  { eng:"WORK_ORDER",kor:"작업지시",  abbr:"WO",   rule:"WO_NO 형식 · MES 시스템 기준",            example:"WO_NO, WO_START_DT" },
  { eng:"EQUIPMENT", kor:"설비",      abbr:"EQP",  rule:"D1 Dict 기준 EQP_ID 파싱 규칙 준수",      example:"EQP_ID, EQP_NM" },
];

const DOMAIN_STANDARDS = [
  { domain:"TEXT",      type:"VARCHAR(N)",    len:"N=실측+여유",  nullable:false, example:"CUST_NM VARCHAR(200)",     rule:"한글은 N×3 바이트 산정" },
  { domain:"CODE",      type:"VARCHAR(20)",   len:"고정 20",      nullable:false, example:"STS_CD VARCHAR(20)",       rule:"코드표준 참조 · NULL 불가" },
  { domain:"AMOUNT",    type:"DECIMAL(18,2)", len:"18자리 소수2", nullable:true,  example:"AMT DECIMAL(18,2)",        rule:"통화 컬럼(_CCY) 병기" },
  { domain:"QUANTITY",  type:"DECIMAL(18,4)", len:"18자리 소수4", nullable:true,  example:"QTY DECIMAL(18,4)",        rule:"단위 컬럼(_UOM) 병기" },
  { domain:"DATE",      type:"DATE",          len:"10 (ISO)",     nullable:true,  example:"ORD_DT DATE",              rule:"TIMESTAMP는 DATETIME 사용" },
  { domain:"DATETIME",  type:"DATETIME",      len:"19 (ISO)",     nullable:true,  example:"CREATED_AT DATETIME",     rule:"UTC 기준 저장 권장" },
  { domain:"FLAG",      type:"CHAR(1)",       len:"고정 1",       nullable:false, example:"USE_YN CHAR(1)",           rule:"Y/N만 허용 · DEFAULT 'N'" },
  { domain:"INTEGER_ID",type:"BIGINT",        len:"8 바이트",     nullable:false, example:"CUST_ID BIGINT",           rule:"AUTO_INCREMENT · PK 전용" },
  { domain:"SERIAL",    type:"VARCHAR(40)",   len:"최대 40",      nullable:false, example:"SN VARCHAR(40)",           rule:"D1 Dict 파싱 규칙 준수" },
  { domain:"JSON",      type:"JSON / TEXT",   len:"제한없음",     nullable:true,  example:"META_JSON JSON",           rule:"검색 불필요 필드만 JSON" },
];

const CODE_STANDARDS = [
  { group:"주문 상태",  code:"ORD_STS", values:[{v:"10",l:"접수"},{v:"20",l:"확인"},{v:"30",l:"생산중"},{v:"40",l:"완료"},{v:"99",l:"취소"}], tables:["TB_ORDER"] },
  { group:"자재 유형",  code:"MAT_TYPE",values:[{v:"RM",l:"원자재"},{v:"SM",l:"부자재"},{v:"WIP",l:"반제품"},{v:"FG",l:"완제품"}], tables:["TB_MATERIAL"] },
  { group:"작업지시 상태",code:"WO_STS",values:[{v:"10",l:"발행"},{v:"20",l:"실행중"},{v:"30",l:"완료"},{v:"90",l:"취소"}], tables:["TB_WORKORDER"] },
  { group:"품질 판정",  code:"QC_RESULT",values:[{v:"OK",l:"합격"},{v:"NG",l:"불합격"},{v:"RW",l:"재작업"},{v:"SC",l:"스크랩"}], tables:["TB_QC_RESULT","TB_CLAIM"] },
  { group:"사용여부",   code:"USE_YN",  values:[{v:"Y",l:"사용"},{v:"N",l:"미사용"}], tables:["공통 적용"] },
  { group:"통화코드",   code:"CCY_CD",  values:[{v:"KRW",l:"원화"},{v:"USD",l:"달러"},{v:"EUR",l:"유로"},{v:"CNY",l:"위안"}], tables:["TB_ORDER","TB_COST"] },
];

type StdTab = "word"|"domain"|"code";

function ModelingStandardView() {
  const [stdTab, setStdTab] = useState<StdTab>("word");
  const [search, setSearch] = useState("");

  const filteredWords = WORD_STANDARDS.filter(w=>!search||[w.eng,w.kor,w.abbr].some(s=>s.toLowerCase().includes(search.toLowerCase())));
  const filteredDomains = DOMAIN_STANDARDS.filter(d=>!search||d.domain.toLowerCase().includes(search.toLowerCase()));
  const filteredCodes = CODE_STANDARDS.filter(c=>!search||[c.group,c.code].some(s=>s.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="space-y-4">
      {/* 서브탭 + 검색 */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {([["word","단어 표준"],["domain","도메인 표준"],["code","코드 표준"]] as const).map(([k,l])=>(
            <button key={k} onClick={()=>{setStdTab(k);setSearch("");}}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${stdTab===k?"bg-white text-slate-900 shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="relative">
          <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="검색..."
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white w-44"/>
        </div>
      </div>

      {stdTab==="word" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">단어 표준 (Word Standard)</span>
            <span className="text-xs text-slate-400">— 논리명↔물리명 명명 규칙</span>
            <span className="ml-auto text-xs text-blue-600 font-semibold">{filteredWords.length}개</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["영문명","한글명","약어","적용 규칙","예시"].map(h=>(
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredWords.map(w=>(
                <tr key={w.eng} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5 font-mono font-bold text-blue-700 text-xs">{w.eng}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-700 font-medium">{w.kor}</td>
                  <td className="px-4 py-2.5"><span className="font-mono text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">{w.abbr}</span></td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[200px]">{w.rule}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{w.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stdTab==="domain" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">도메인 표준 (Domain Standard)</span>
            <span className="text-xs text-slate-400">— 데이터 타입·길이·NULL 여부 규칙</span>
            <span className="ml-auto text-xs text-violet-600 font-semibold">{filteredDomains.length}개</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["도메인명","데이터 타입","길이","NULL","예시","규칙"].map(h=>(
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredDomains.map(d=>(
                <tr key={d.domain} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5"><span className="font-mono text-xs font-bold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">{d.domain}</span></td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{d.type}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{d.len}</td>
                  <td className="px-4 py-2.5 text-xs">
                    <span className={`px-1.5 py-0.5 rounded font-medium ${d.nullable?"bg-slate-100 text-slate-500":"bg-rose-100 text-rose-700"}`}>
                      {d.nullable?"NULL 가능":"NOT NULL"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">{d.example}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[180px]">{d.rule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stdTab==="code" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="text-sm font-bold text-slate-900">코드 표준 (Code Standard)</span>
            <span className="text-xs text-slate-400">— 상태·분류 코드값 표준화</span>
            <span className="ml-auto text-xs text-amber-600 font-semibold">{filteredCodes.length}개 그룹</span>
          </div>
          {filteredCodes.map(g=>(
            <div key={g.code} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                <span className="text-sm font-bold text-slate-800">{g.group}</span>
                <span className="font-mono text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{g.code}</span>
                <div className="ml-auto flex gap-1 flex-wrap">
                  {g.tables.map(t=>(
                    <span key={t} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-mono">{t}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 p-3">
                {g.values.map(v=>(
                  <div key={v.v} className="flex items-center gap-1.5 bg-slate-50 rounded-lg border border-slate-100 px-3 py-1.5">
                    <span className="font-mono text-xs font-bold text-slate-700">{v.v}</span>
                    <span className="text-slate-300 text-xs">→</span>
                    <span className="text-xs text-slate-600">{v.l}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 유틸 ────────────────────────────────────────────────────────
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

// ─── Dict 상세 패널 ──────────────────────────────────────────────
function DictPanel({ item, onClose }: { item: DictItem; onClose: () => void }) {
  const [tab, setTab] = useState<"entries"|"usage"|"error">("entries");
  const cat = DICT_CATEGORIES.find(c => c.key === item.category)!;
  const Icon = cat.icon;
  const sm = STATUS_META[item.status];

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50">
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`p-1.5 rounded-lg border ${cat.bg}`}><Icon className={`w-4 h-4 ${cat.color}`}/></span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${cat.bg} ${cat.color} font-semibold border`}>{cat.label}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${sm.cls}`}>{sm.label}</span>
          </div>
          <div className="font-bold text-slate-900 mt-1">{item.name}</div>
          <div className="text-xs text-slate-500 mt-0.5">출처: {item.source}{item.verifiedAt && ` · 검증: ${item.verifiedAt}`}</div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4"/></button>
      </div>

      <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
        <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
      </div>

      <div className="flex border-b border-slate-200 px-4">
        {([["entries","Dict 항목"],["usage","사용 위치"],["error","없으면?"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${tab===key?"border-blue-600 text-blue-600":"border-transparent text-slate-500 hover:text-slate-700"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {tab === "entries" && (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-700">총 {item.entries.length}개 항목</span>
              <div className="flex items-center gap-1.5">
                {item.status === "verified" && (
                  <span className="text-xs flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3 h-3"/> 웹 폼 검증 완료
                  </span>
                )}
              </div>
            </div>
            {item.entries.map((e, i) => (
              <div key={i} className="bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{e.key}</span>
                  <span className="text-slate-400 text-xs">=</span>
                  <span className="font-mono text-xs font-semibold text-emerald-700">{e.value}</span>
                  <button className="ml-auto text-slate-300 hover:text-slate-500"><Copy className="w-3 h-3"/></button>
                </div>
                {e.desc && <div className="text-[11px] text-slate-500 mt-1 pl-0.5">{e.desc}</div>}
              </div>
            ))}
          </>
        )}
        {tab === "usage" && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700 mb-3">이 Dict를 참조하는 워커 / 기능</div>
            {item.usedIn.map((u, i) => (
              <div key={i} className="flex items-center gap-2.5 bg-white rounded-lg border border-slate-200 px-3 py-2.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0"/>
                <span className="text-xs text-slate-700">{u}</span>
              </div>
            ))}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {item.tags.map(t => (
                <span key={t} className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">#{t}</span>
              ))}
            </div>
          </div>
        )}
        {tab === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5"/>
              <div>
                <div className="text-xs font-bold text-red-700 mb-1">이 Dict가 없으면</div>
                <p className="text-xs text-red-600 leading-relaxed">{item.errorIfMissing}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-red-200 text-[11px] text-red-500">
              IT 단독으로 시도하면 → 추측·누락·환각
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 flex gap-2">
        <button className="flex-1 text-xs py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-1.5">
          <Edit3 className="w-3.5 h-3.5"/> 편집
        </button>
        <button className="px-3 py-2 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-1.5">
          <Copy className="w-3.5 h-3.5"/> 복사
        </button>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────
export default function OntologyMapping() {
  const [mainTab, setMainTab] = useState<"dict"|"mapping"|"standard">("dict");
  const [dicts] = useState<DictItem[]>(INIT_DICTS);
  const [selectedDict, setSelectedDict] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState<DictCategory | "all">("all");

  // 온톨로지 매핑 상태
  const [items, setItems] = useState<Mapping[]>(BASE_MAPPINGS);
  const [selectedMap, setSelectedMap] = useState<number|null>(null);
  const [statusFilter, setStatusFilter] = useState<MapStatus|"all">("all");
  const [aiSuggests, setAiSuggests] = useState<{canonical:string;domain:string;confidence:number;ts:string}[]>([]);
  const tickRef = useRef(0);

  useEffect(()=>{
    const id = setInterval(()=>{
      tickRef.current++;
      if(tickRef.current % 7 === 0){
        const pool = [
          {canonical:"Routing",domain:"Process",confidence:84},
          {canonical:"QualityPlan",domain:"Measurement",confidence:79},
          {canonical:"StockLot",domain:"Material",confidence:91},
        ];
        const tmpl = pool[Math.floor(Math.random()*pool.length)];
        const now = new Date();
        const ts = `${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}:${now.getSeconds().toString().padStart(2,"0")}`;
        setAiSuggests(prev=>[{...tmpl,ts},...prev].slice(0,8));
      }
    },1200);
    return ()=>clearInterval(id);
  },[]);

  const approve = (id:number) => setItems(prev=>prev.map(m=>m.id===id?{...m,status:"approved" as MapStatus}:m));

  const filteredDicts = catFilter === "all" ? dicts : dicts.filter(d => d.category === catFilter);
  const selectedDictItem = dicts.find(d => d.id === selectedDict);
  const selectedMapItem = items.find(m => m.id === selectedMap);

  const verifiedCount = dicts.filter(d => d.status === "verified").length;
  const activeCount = dicts.filter(d => d.status === "active").length;
  const totalEntries = dicts.reduce((a, d) => a + d.entries.length, 0);

  return (
    <div className="p-6 space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ontology Mapping</h1>
          <p className="text-slate-500 mt-1 text-sm">도메인 지식 Dict 관리 · Canonical 객체 온톨로지 매핑</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5"/> dict {verifiedCount}종 검증 완료
          </span>
          <button className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5"/> Dict 추가
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([["dict","Dict 관리"],["mapping","온톨로지 매핑"],["standard","모델링 표준"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setMainTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mainTab===key?"bg-white text-slate-900 shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── 모델링 표준화 탭 ── */}
      {mainTab === "standard" && <ModelingStandardView/>}

      {/* ── Dict 관리 탭 ── */}
      {mainTab === "dict" && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label:"Dict 총 종류", value: dicts.length,    cls:"text-slate-800" },
              { label:"검증 완료",    value: verifiedCount,   cls:"text-emerald-600" },
              { label:"운영 중",      value: activeCount,     cls:"text-blue-600" },
              { label:"총 항목 수",   value: totalEntries,    cls:"text-violet-600" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs text-slate-500 mb-1">{label}</div>
                <div className={`text-2xl font-bold ${cls}`}>{value}</div>
              </div>
            ))}
          </div>

          {/* 카테고리 필터 */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setCatFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${catFilter==="all"?"bg-slate-800 text-white border-slate-800":"bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
              전체 {dicts.length}
            </button>
            {DICT_CATEGORIES.map(c => {
              const cnt = dicts.filter(d => d.category === c.key).length;
              return (
                <button key={c.key} onClick={() => setCatFilter(c.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${catFilter===c.key?`${c.bg} ${c.color} border-current`:"bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
                  {c.label} {cnt}
                </button>
              );
            })}
          </div>

          {/* Dict 카드 그리드 */}
          <div className="grid grid-cols-2 gap-4">
            {filteredDicts.map(d => {
              const cat = DICT_CATEGORIES.find(c => c.key === d.category)!;
              const Icon = cat.icon;
              const sm = STATUS_META[d.status];
              return (
                <div key={d.id}
                  onClick={() => setSelectedDict(s => s === d.id ? null : d.id)}
                  className={`bg-white rounded-xl border shadow-sm p-5 cursor-pointer transition-all hover:shadow-md ${selectedDict===d.id?"border-blue-400 ring-2 ring-blue-100":"border-slate-200"}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`p-2 rounded-lg border ${cat.bg}`}><Icon className={`w-4 h-4 ${cat.color}`}/></span>
                      <div>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${cat.bg} ${cat.color}`}>{cat.label}</span>
                      </div>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${sm.cls}`}>
                      {d.status === "verified" && <ShieldCheck className="w-2.5 h-2.5 inline mr-0.5"/>}
                      {sm.label}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-slate-900 mb-1.5 leading-snug">{d.name}</div>
                  <div className="text-xs text-slate-500 line-clamp-2 mb-3">{d.desc}</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Database className="w-3 h-3"/>{d.entries.length}개 항목</span>
                      <span className="text-slate-400">·</span>
                      <span>{d.source}</span>
                    </div>
                    <div className="flex gap-1">
                      {d.tags.slice(0,2).map(t => (
                        <span key={t} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">#{t}</span>
                      ))}
                    </div>
                  </div>
                  {/* 없으면 경고 미리보기 */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5"/>
                    <span className="text-[11px] text-slate-500 line-clamp-1">{d.errorIfMissing}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dict 연결 맵 (간략 시각화) */}
          <div className="bg-slate-900 rounded-xl p-5">
            <div className="text-xs font-semibold text-slate-300 mb-4">Dict → 워커 연결 맵</div>
            <div className="grid grid-cols-3 gap-3">
              {dicts.map(d => {
                const cat = DICT_CATEGORIES.find(c => c.key === d.category)!;
                return (
                  <div key={d.id} className="bg-slate-800 rounded-lg p-3">
                    <div className={`text-xs font-bold mb-2 ${cat.color}`}>{d.name.slice(0, 18)}...</div>
                    <div className="space-y-1">
                      {d.usedIn.slice(0,2).map((u, i) => (
                        <div key={i} className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-slate-500"/>
                          {u}
                        </div>
                      ))}
                      {d.usedIn.length > 2 && (
                        <div className="text-[10px] text-slate-600">+{d.usedIn.length-2}개 더</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-600 mt-3 text-center">
              확장의 추진력은 LLM 업그레이드가 아니라 공유 dict의 성장
            </p>
          </div>
        </>
      )}

      {/* ── 온톨로지 매핑 탭 ── */}
      {mainTab === "mapping" && (
        <>
          <div className="grid grid-cols-4 gap-3">
            {[
              {label:"전체 매핑",value:items.length,cls:"text-slate-800"},
              {label:"승인 완료",value:items.filter(m=>m.status==="approved").length,cls:"text-emerald-600"},
              {label:"승인 대기",value:items.filter(m=>m.status==="pending").length,cls:"text-amber-600"},
              {label:"재검토",value:items.filter(m=>m.status==="review").length,cls:"text-violet-600"},
            ].map(({label,value,cls})=>(
              <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs text-slate-500 mb-1">{label}</div>
                <div className={`text-2xl font-bold ${cls}`}>{value}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {([["all","전체"],["approved","승인"],["pending","대기"],["review","재검토"]] as const).map(([s,label])=>(
              <button key={s} onClick={()=>setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${statusFilter===s?"bg-blue-600 text-white border-blue-600":"bg-white text-slate-600 border-slate-200"}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Canonical 객체","10M 도메인","관계 유형","신뢰도","설명","상태",""].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.filter(m=>statusFilter==="all"||m.status===statusFilter).map(m=>(
                  <tr key={m.id} onClick={()=>setSelectedMap(s=>s===m.id?null:m.id)}
                    className={`hover:bg-slate-50 cursor-pointer ${selectedMap===m.id?"bg-blue-50":""}`}>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">{m.canonical}</td>
                    <td className="px-4 py-3"><span className="text-sm font-semibold text-blue-700">{m.domain}</span></td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RELATION_COLORS[m.relation]||"bg-slate-100 text-slate-700"}`}>{m.relation}</span>
                    </td>
                    <td className="px-4 py-3"><ConfBar v={m.confidence}/></td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{m.desc}</td>
                    <td className="px-4 py-3">
                      {m.status==="approved"&&<span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">승인</span>}
                      {m.status==="pending"&&<span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">대기</span>}
                      {m.status==="review"&&<span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">재검토</span>}
                    </td>
                    <td className="px-4 py-3">
                      {m.status!=="approved" && (
                        <button onClick={e=>{e.stopPropagation();approve(m.id);}}
                          className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded hover:bg-emerald-100">승인</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {aiSuggests.length > 0 && (
            <div className="bg-slate-900 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse"/>
                <span className="text-xs font-semibold text-slate-300">AI 매핑 제안 피드</span>
              </div>
              <div className="space-y-1.5">
                {aiSuggests.slice(0,5).map((s,i)=>(
                  <div key={i} className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-slate-500">{s.ts}</span>
                    <span className="text-blue-300 font-medium">{s.canonical}</span>
                    <span className="text-slate-400">→</span>
                    <span className="text-emerald-400">{s.domain}</span>
                    <span className="text-slate-500">({s.confidence}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Dict 상세 패널 */}
      {selectedDictItem && mainTab === "dict" && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={()=>setSelectedDict(null)}/>
          <DictPanel item={selectedDictItem} onClose={()=>setSelectedDict(null)}/>
        </>
      )}
    </div>
  );
}
