"use client";

import { useState, useEffect, useRef } from "react";
import {
  CheckCircle2, AlertCircle, Clock, Wifi, WifiOff, Plus, RefreshCw,
  X, Database, Activity, ChevronRight,
  Shield, Table2, History, Filter, Loader2,
  Search, LayoutGrid, List, GitBranch, Zap,
} from "lucide-react";

// ─── 데이터 원천 추가 모달 ───────────────────────────────────────
type AddStep = "type" | "conn" | "test" | "done";

const SOURCE_TYPES = [
  { id:"DB",       label:"데이터베이스",  sub:"Oracle · MySQL · PostgreSQL · MSSQL", icon:"🗄️" },
  { id:"API",      label:"REST API",       sub:"OpenAPI · GraphQL · OData",           icon:"🔌" },
  { id:"파일서버", label:"파일 서버",      sub:"SMB · NFS · Excel · CSV · PDF",       icon:"📁" },
  { id:"Google Drive", label:"Google Drive", sub:"Google Sheets · Drive 파일",        icon:"📊" },
  { id:"이메일",   label:"이메일 / 메시지", sub:"Gmail · Outlook · 카카오톡 · Slack", icon:"📧" },
];

const DB_DRIVERS = ["Oracle","MySQL","PostgreSQL","MSSQL","MariaDB","SQLite"];
const CYCLES     = ["실시간","10분","30분","1시간","6시간","일 1회","주 1회","수시"];
const DEPTS      = ["경영지원팀","생산팀","생산기술팀","품질팀","설비팀","영업팀","구매팀","IT팀"];
const SECS       = ["기밀","내부","일반"];

interface AddForm {
  name: string; type: string; dept: string; cycle: string; security: string;
  host: string; port: string; dbName: string; dbDriver: string;
  user: string; password: string; notes: string;
}

const EMPTY_FORM: AddForm = {
  name:"", type:"", dept:DEPTS[0], cycle:"실시간", security:"내부",
  host:"", port:"", dbName:"", dbDriver:DB_DRIVERS[0],
  user:"", password:"", notes:"",
};

function AddSourceModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (src: Source) => void;
}) {
  const [step, setStep]   = useState<AddStep>("type");
  const [form, setForm]   = useState<AddForm>(EMPTY_FORM);
  const [testing, setTesting]   = useState(false);
  const [testResult, setTestResult] = useState<"ok"|"fail"|null>(null);

  const set = (k: keyof AddForm, v: string) => setForm(f=>({...f,[k]:v}));

  const runTest = () => {
    setTesting(true); setTestResult(null);
    setTimeout(()=>{ setTesting(false); setTestResult("ok"); }, 1800);
  };

  const finish = () => {
    const newSrc: Source = {
      id: Date.now(),
      name: form.name || `${form.type} 신규 원천`,
      type: form.type,
      dept: form.dept,
      cycle: form.cycle,
      security: form.security,
      status: testResult==="ok" ? "connected" : "pending",
      lastSync: testResult==="ok" ? "방금 전" : "설정 필요",
      rows: null, files: null,
      qualityScore: testResult==="ok" ? 85 : 0,
      totalRows: 0,
      host: form.host || "-",
      port: form.port ? parseInt(form.port) : null,
      dbName: form.dbName || null,
      schema: [],
      issues: [],
      history: mkHistory(testResult==="ok"),
      errorMsg: null,
      vendor: "기타",
      system: "ERP",
    };
    onAdd(newSrc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">데이터 원천 추가</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {step==="type"?"원천 유형 선택":step==="conn"?"연결 정보 입력":step==="test"?"연결 테스트":"등록 완료"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4"/></button>
        </div>

        <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2 shrink-0">
          {(["type","conn","test","done"] as AddStep[]).map((s,i)=>{
            const idx=["type","conn","test","done"].indexOf(step);
            const done=i<idx; const active=i===idx;
            return (
              <div key={s} className="flex items-center gap-2">
                {i>0&&<div className={"h-px w-8 "+(done||active?"bg-blue-400":"bg-slate-200")}/>}
                <div className={"w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold "+(done?"bg-blue-600 text-white":active?"bg-blue-600 text-white":"bg-slate-100 text-slate-400")}>
                  {done?"✓":i+1}
                </div>
                <span className={"text-xs "+(active?"text-blue-700 font-semibold":"text-slate-400")}>
                  {s==="type"?"유형":s==="conn"?"연결정보":s==="test"?"테스트":"완료"}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step==="type"&&(
            <div className="space-y-2">
              <p className="text-xs text-slate-500 mb-4">연결할 데이터 원천 유형을 선택하세요.</p>
              {SOURCE_TYPES.map(t=>(
                <button key={t.id} onClick={()=>{ set("type",t.id); setStep("conn"); }}
                  className={"w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all hover:shadow-sm "+(form.type===t.id?"border-blue-400 bg-blue-50":"border-slate-200 hover:border-slate-300")}>
                  <span className="text-2xl">{t.icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{t.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{t.sub}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 ml-auto"/>
                </button>
              ))}
            </div>
          )}

          {step==="conn"&&(
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">원천 이름 <span className="text-rose-500">*</span></label>
                <input value={form.name} onChange={e=>set("name",e.target.value)}
                  placeholder="예: 더존 ERP (A업체)"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
              </div>
              {form.type==="DB"&&(
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">DB 드라이버</label>
                    <select value={form.dbDriver} onChange={e=>set("dbDriver",e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white">
                      {DB_DRIVERS.map(d=><option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-slate-600 block mb-1.5">호스트 <span className="text-rose-500">*</span></label>
                      <input value={form.host} onChange={e=>set("host",e.target.value)}
                        placeholder="erp.internal" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1.5">포트</label>
                      <input value={form.port} onChange={e=>set("port",e.target.value)}
                        placeholder="1433" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">데이터베이스명</label>
                    <input value={form.dbName} onChange={e=>set("dbName",e.target.value)}
                      placeholder="PROD_DB" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1.5">사용자명</label>
                      <input value={form.user} onChange={e=>set("user",e.target.value)}
                        placeholder="db_user" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1.5">비밀번호</label>
                      <input type="password" value={form.password} onChange={e=>set("password",e.target.value)}
                        placeholder="••••••••" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
                    </div>
                  </div>
                </>
              )}
              {form.type==="API"&&(
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">API 엔드포인트 URL <span className="text-rose-500">*</span></label>
                    <input value={form.host} onChange={e=>set("host",e.target.value)}
                      placeholder="https://api.example.com/v1" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">API Key / 토큰</label>
                    <input type="password" value={form.password} onChange={e=>set("password",e.target.value)}
                      placeholder="sk-••••••••" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
                  </div>
                </>
              )}
              {(form.type==="파일서버"||form.type==="Google Drive")&&(
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">경로 / URL <span className="text-rose-500">*</span></label>
                  <input value={form.host} onChange={e=>set("host",e.target.value)}
                    placeholder={form.type==="파일서버"?"\\\\nas\\share":"https://drive.google.com/..."}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
                </div>
              )}
              {form.type==="이메일"&&(
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">이메일 주소 / 채널 ID</label>
                  <input value={form.host} onChange={e=>set("host",e.target.value)}
                    placeholder="orders@company.com" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">소유 부서</label>
                  <select value={form.dept} onChange={e=>set("dept",e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white">
                    {DEPTS.map(d=><option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">갱신 주기</label>
                  <select value={form.cycle} onChange={e=>set("cycle",e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white">
                    {CYCLES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">보안 등급</label>
                  <select value={form.security} onChange={e=>set("security",e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white">
                    {SECS.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">메모 (선택)</label>
                <textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={2}
                  placeholder="특이사항, 담당자 연락처 등"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"/>
              </div>
            </div>
          )}

          {step==="test"&&(
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 text-xs space-y-1.5">
                <div className="font-semibold text-slate-700 mb-2">등록 정보 확인</div>
                {[["원천명",form.name||"(미입력)"],["유형",form.type],["호스트",form.host||"-"],["부서",form.dept],["주기",form.cycle],["보안",form.security]].map(([k,v])=>(
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-400">{k}</span>
                    <span className="font-medium text-slate-700">{v}</span>
                  </div>
                ))}
              </div>
              {!testResult&&!testing&&(
                <button onClick={runTest} className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">연결 테스트 실행</button>
              )}
              {testing&&(
                <div className="flex items-center justify-center gap-3 py-6 text-blue-600">
                  <Loader2 className="w-5 h-5 animate-spin"/>
                  <span className="text-sm font-medium">연결 확인 중...</span>
                </div>
              )}
              {testResult==="ok"&&(
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0"/>
                  <div>
                    <div className="text-sm font-semibold text-emerald-700">연결 성공</div>
                    <div className="text-xs text-emerald-600 mt-0.5">응답 시간 182ms · 스키마 자동 탐지 완료</div>
                  </div>
                </div>
              )}
              {testResult&&(
                <button onClick={()=>setStep("done")} className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors">
                  {testResult==="ok"?"등록 완료하기":"테스트 건너뛰고 등록"}
                </button>
              )}
            </div>
          )}

          {step==="done"&&(
            <div className="flex flex-col items-center text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500"/>
              </div>
              <div>
                <div className="text-base font-bold text-slate-900">등록 완료!</div>
                <div className="text-sm text-slate-500 mt-1">
                  <span className="font-semibold text-slate-700">{form.name||form.type+" 원천"}</span>이 Source Registry에 추가되었습니다.
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 w-full text-xs space-y-1">
                <div className="flex justify-between"><span className="text-slate-400">상태</span><span className={testResult==="ok"?"font-semibold text-emerald-600":"font-semibold text-amber-600"}>{testResult==="ok"?"연결됨":"설정 필요"}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">다음 단계</span><span className="text-slate-600">Schema Mapping 이동 권장</span></div>
              </div>
              <button onClick={finish} className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">목록으로 돌아가기</button>
            </div>
          )}
        </div>

        {step!=="done"&&(
          <div className="px-6 py-4 border-t border-slate-100 flex justify-between shrink-0">
            <button onClick={()=>{
              if(step==="type") onClose();
              else if(step==="conn") setStep("type");
              else if(step==="test") setStep("conn");
            }} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
              {step==="type"?"취소":"이전"}
            </button>
            {step==="conn"&&(
              <button onClick={()=>setStep("test")} disabled={!form.type}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40">
                다음 — 연결 테스트
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 타입 정의 ───────────────────────────────────────────────────
type SourceStatus = "connected" | "error" | "pending";
type ViewMode = "table" | "cards" | "topology";

interface SchemaColumn { name: string; type: string; nullable: boolean; pk: boolean }
interface SchemaTable { name: string; rows: number; columns: SchemaColumn[] }
interface SyncDay { date: string; success: number; failed: number }
interface SyncEvent { ts: string; msg: string; ok: boolean }
interface QualityIssue { field: string; issue: string; severity: "high" | "mid" | "low" }

interface Source {
  id: number; name: string; type: string; dept: string; cycle: string;
  security: string; status: SourceStatus; lastSync: string;
  rows: string | null; files: string | null; qualityScore: number;
  totalRows: number; host: string; port: number | null; dbName: string | null;
  schema: SchemaTable[]; issues: QualityIssue[]; history: SyncDay[]; errorMsg: string | null;
  vendor: string; system: string;
}

// ─── 헬퍼 ────────────────────────────────────────────────────────
const mkHistory = (ok: boolean): SyncDay[] =>
  ["06/12","06/13","06/14","06/15","06/16","06/17","06/18"].map(date => ({
    date,
    success: ok ? Math.floor(Math.random() * 800 + 200) : Math.floor(Math.random() * 400 + 100),
    failed:  ok ? Math.floor(Math.random() * 20) : Math.floor(Math.random() * 150 + 50),
  }));

const mkSchema = (tables: string[]): SchemaTable[] =>
  tables.map(t => ({
    name: t,
    rows: Math.floor(Math.random() * 500000 + 1000),
    columns: [
      { name: "id", type: "bigint", nullable: false, pk: true },
      { name: "created_at", type: "timestamp", nullable: false, pk: false },
      { name: "updated_at", type: "timestamp", nullable: true, pk: false },
      { name: "code", type: "varchar(50)", nullable: false, pk: false },
      { name: "name", type: "varchar(200)", nullable: true, pk: false },
      { name: "status", type: "char(1)", nullable: false, pk: false },
    ],
  }));

// ─── 소스 데이터 ─────────────────────────────────────────────────
const SOURCES: Source[] = [
  { id:1,  name:"더존 ERP (A업체)",       type:"DB",          dept:"경영지원팀", cycle:"실시간", security:"기밀", status:"connected", lastSync:"2분 전",    rows:"124,382",    files:null,    qualityScore:91, totalRows:124382,   host:"erp-a.internal",       port:1433, dbName:"DUZON_PROD",   schema:mkSchema(["TB_ORDER","TB_ITEM","TB_VENDOR","TB_ACCOUNT"]),           issues:[{field:"TB_ITEM.description",issue:"null 비율 34%",severity:"mid"},{field:"TB_VENDOR.email",issue:"형식 오류 12건",severity:"low"}],        history:mkHistory(true),  errorMsg:null, vendor:"A업체", system:"ERP" },
  { id:2,  name:"Excel BOM 폴더 (A업체)", type:"파일서버",    dept:"생산기술팀", cycle:"주 1회", security:"내부", status:"connected", lastSync:"3일 전",    rows:null,         files:"247개", qualityScore:78, totalRows:18340,    host:"\\\\nas-a\\bom",       port:null, dbName:null,           schema:mkSchema(["BOM_MASTER","BOM_DETAIL"]),                              issues:[{field:"BOM_MASTER.rev",issue:"버전 누락 67건",severity:"high"},{field:"BOM_DETAIL.unit",issue:"단위 불일치 23건",severity:"mid"}],          history:mkHistory(true),  errorMsg:null, vendor:"A업체", system:"PLM" },
  { id:3,  name:"PDF 작업표준서 (A업체)", type:"파일서버",    dept:"품질팀",     cycle:"수시",   security:"내부", status:"error",     lastSync:"실패",      rows:null,         files:"89개",  qualityScore:42, totalRows:0,        host:"\\\\nas-a\\std",       port:null, dbName:null,           schema:[],                                                                 issues:[{field:"OCR 엔진",issue:"PDF 스캔본 인식 실패",severity:"high"},{field:"파일 접근",issue:"SMB 권한 거부",severity:"high"}],                    history:mkHistory(false), errorMsg:"SMB 마운트 실패: Access denied (0x0000005)", vendor:"A업체", system:"QMS" },
  { id:4,  name:"SAP ERP (B업체)",        type:"API",         dept:"경영지원팀", cycle:"실시간", security:"기밀", status:"connected", lastSync:"1분 전",    rows:"892,441",    files:null,    qualityScore:96, totalRows:892441,   host:"sap-b.api.internal",   port:443,  dbName:null,           schema:mkSchema(["MARA","MARC","EKKO","EKPO","VBAK"]),                     issues:[{field:"MARC.MMSTA",issue:"코드표 미매핑 8건",severity:"low"}],                                                                               history:mkHistory(true),  errorMsg:null, vendor:"B업체", system:"ERP" },
  { id:5,  name:"MES 시스템 (B업체)",     type:"DB",          dept:"생산팀",     cycle:"10분",   security:"내부", status:"connected", lastSync:"9분 전",    rows:"3,201,882",  files:null,    qualityScore:88, totalRows:3201882,  host:"mes-b.internal",       port:5432, dbName:"mes_prod",     schema:mkSchema(["WO_HEADER","WO_OPERATION","DEFECT_LOG","INSPECTION"]),   issues:[{field:"DEFECT_LOG.cause",issue:"분류코드 미입력 312건",severity:"mid"}],                                                                      history:mkHistory(true),  errorMsg:null, vendor:"B업체", system:"MES" },
  { id:6,  name:"설비 CSV 로그 (B업체)",  type:"파일서버",    dept:"설비팀",     cycle:"일 1회", security:"일반", status:"connected", lastSync:"6시간 전",  rows:null,         files:"1,204개",qualityScore:82, totalRows:2100000,  host:"\\\\nas-b\\equipment", port:null, dbName:null,           schema:mkSchema(["EQUIP_MASTER","LOG_RAW"]),                               issues:[{field:"LOG_RAW.timestamp",issue:"시간대 혼재 (KST/UTC)",severity:"high"}],                                                                    history:mkHistory(true),  errorMsg:null, vendor:"B업체", system:"MES" },
  { id:7,  name:"자체 ERP (C업체)",       type:"DB",          dept:"경영지원팀", cycle:"일 1회", security:"기밀", status:"connected", lastSync:"18시간 전", rows:"45,221",     files:null,    qualityScore:74, totalRows:45221,    host:"erp-c.internal",       port:3306, dbName:"erp_live",     schema:mkSchema(["SALES_ORDER","PURCHASE","INVENTORY"]),                   issues:[{field:"SALES_ORDER.cust_code",issue:"중복 키 14건",severity:"high"},{field:"INVENTORY.qty",issue:"음수값 존재 3건",severity:"mid"}],          history:mkHistory(true),  errorMsg:null, vendor:"C업체", system:"ERP" },
  { id:8,  name:"수기 Excel (C업체)",     type:"Google Drive",dept:"영업팀",     cycle:"수시",   security:"일반", status:"error",     lastSync:"실패",      rows:null,         files:"132개", qualityScore:31, totalRows:0,        host:"drive.google.com",     port:null, dbName:null,           schema:[],                                                                 issues:[{field:"OAuth 토큰",issue:"만료됨 — 재인증 필요",severity:"high"},{field:"파일 형식",issue:".xls (구형 포맷) 37건",severity:"mid"}],           history:mkHistory(false), errorMsg:"OAuth 2.0 토큰 만료: invalid_grant", vendor:"C업체", system:"PLM" },
  { id:9,  name:"카카오톡/메일 발주 (C업체)",type:"이메일",   dept:"구매팀",     cycle:"실시간", security:"내부", status:"pending",   lastSync:"설정 필요", rows:null,         files:null,    qualityScore:0,  totalRows:0,        host:"-",                    port:null, dbName:null,           schema:[],                                                                 issues:[],                                                                                                                                             history:mkHistory(false), errorMsg:null, vendor:"C업체", system:"기타" },
  { id:10, name:"Odoo ERP (D업체)",       type:"API",         dept:"경영지원팀", cycle:"30분",   security:"기밀", status:"connected", lastSync:"28분 전",  rows:"78,331",     files:null,    qualityScore:89, totalRows:78331,    host:"odoo-d.example.com",   port:8069, dbName:null,           schema:mkSchema(["sale_order","purchase_order","stock_move","mrp_production"]),issues:[{field:"stock_move.origin",issue:"공백값 88건",severity:"low"}],                                                                                history:mkHistory(true),  errorMsg:null, vendor:"D업체", system:"ERP" },
  { id:11, name:"Google Sheets (D업체)", type:"Google Drive",dept:"품질팀",     cycle:"수시",   security:"내부", status:"pending",   lastSync:"권한 필요", rows:null,         files:null,    qualityScore:0,  totalRows:0,        host:"sheets.googleapis.com",port:null, dbName:null,           schema:[],                                                                 issues:[],                                                                                                                                             history:mkHistory(false), errorMsg:null, vendor:"D업체", system:"QMS" },
  { id:12, name:"PDF 검사성적서 (D업체)", type:"파일서버",    dept:"품질팀",     cycle:"수시",   security:"내부", status:"connected", lastSync:"2일 전",    rows:null,         files:"521개", qualityScore:85, totalRows:94200,    host:"\\\\nas-d\\quality",   port:null, dbName:null,           schema:mkSchema(["INSP_REPORT","INSP_ITEM"]),                              issues:[{field:"INSP_REPORT.std_ref",issue:"표준 번호 누락 45건",severity:"mid"}],                                                                    history:mkHistory(true),  errorMsg:null, vendor:"D업체", system:"QMS" },
];

const EVENT_POOL = [
  (n: string) => ({ msg: `${n} 동기화 완료 — 1,284행 적재`, ok: true }),
  (n: string) => ({ msg: `${n} 스키마 변경 감지 — 새 컬럼 추가됨`, ok: true }),
  (n: string) => ({ msg: `${n} 품질 경고 — null 비율 급증 (12→38%)`, ok: false }),
  (n: string) => ({ msg: `${n} 연결 재시도 성공`, ok: true }),
  (n: string) => ({ msg: `${n} 타임아웃 오류 — retry 1/3`, ok: false }),
];

// ─── 색상 맵 ─────────────────────────────────────────────────────
const typeColor: Record<string, string> = {
  "DB": "bg-blue-100 text-blue-700",
  "API": "bg-violet-100 text-violet-700",
  "파일서버": "bg-slate-100 text-slate-700",
  "Google Drive": "bg-green-100 text-green-700",
  "이메일": "bg-orange-100 text-orange-700",
};
const secColor: Record<string, string> = {
  "기밀": "bg-rose-100 text-rose-700",
  "내부": "bg-amber-100 text-amber-700",
  "일반": "bg-slate-100 text-slate-600",
};
const sevColor: Record<string, string> = {
  high: "text-rose-600 bg-rose-50",
  mid: "text-amber-600 bg-amber-50",
  low: "text-slate-500 bg-slate-50",
};
const vendorColor: Record<string, string> = {
  "A업체": "bg-blue-500",
  "B업체": "bg-violet-500",
  "C업체": "bg-emerald-500",
  "D업체": "bg-amber-500",
};
const vendorBg: Record<string, string> = {
  "A업체": "bg-blue-50 border-blue-200",
  "B업체": "bg-violet-50 border-violet-200",
  "C업체": "bg-emerald-50 border-emerald-200",
  "D업체": "bg-amber-50 border-amber-200",
};

// ─── 서브 컴포넌트 ───────────────────────────────────────────────
function QualityGauge({ score }: { score: number }) {
  const color = score >= 85 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  const r = 28; const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={72} height={72} viewBox="0 0 72 72">
      <circle cx={36} cy={36} r={r} fill="none" stroke="#e2e8f0" strokeWidth={7} />
      <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25}
        strokeLinecap="round" style={{ transition: "stroke-dasharray 0.6s" }} />
      <text x={36} y={40} textAnchor="middle" fontSize={14} fontWeight={700} fill={color}>{score}</text>
    </svg>
  );
}

function HistoryChart({ days }: { days: SyncDay[] }) {
  const maxVal = Math.max(...days.map(d => d.success + d.failed), 1);
  const W = 280; const H = 80; const BAR_W = 28; const GAP = 12;
  return (
    <svg width={W} height={H + 20} viewBox={`0 0 ${W} ${H + 20}`} className="w-full">
      {days.map((d, i) => {
        const x = i * (BAR_W + GAP) + 6;
        const sh = (d.success / maxVal) * H;
        const fh = (d.failed / maxVal) * H;
        return (
          <g key={d.date}>
            <rect x={x} y={H - sh} width={BAR_W} height={sh} fill="#10b981" rx={3} opacity={0.85} />
            <rect x={x} y={H - sh - fh} width={BAR_W} height={fh} fill="#ef4444" rx={3} opacity={0.85} />
            <text x={x + BAR_W / 2} y={H + 14} textAnchor="middle" fontSize={9} fill="#94a3b8">{d.date}</text>
          </g>
        );
      })}
    </svg>
  );
}

function StatusDot({ status }: { status: SourceStatus }) {
  if (status === "connected") return <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"/>;
  if (status === "error")     return <span className="inline-block w-2 h-2 rounded-full bg-rose-500"/>;
  return <span className="inline-block w-2 h-2 rounded-full bg-amber-400"/>;
}

// ─── 토폴로지 뷰 ─────────────────────────────────────────────────
const VENDORS = ["A업체","B업체","C업체","D업체"];
const SYSTEMS = ["ERP","PLM","MES","QMS","기타"];
const sysColor: Record<string, string> = {
  ERP: "#818cf8", PLM: "#60a5fa", MES: "#34d399", QMS: "#f472b6", 기타: "#94a3b8",
};

function TopologyView({ sources, onSelect }: { sources: Source[]; onSelect: (s: Source) => void }) {
  const CELL_W = 180; const CELL_H = 88; const COL_GAP = 20; const ROW_GAP = 16;
  const HEADER_H = 36; const LABEL_W = 70;
  const totalW = LABEL_W + SYSTEMS.length * (CELL_W + COL_GAP);
  const totalH = HEADER_H + VENDORS.length * (CELL_H + ROW_GAP) + 20;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 overflow-x-auto">
      <div className="flex items-center gap-2 mb-4">
        <GitBranch className="w-4 h-4 text-blue-500"/>
        <span className="text-sm font-semibold text-slate-800">시스템 연결 토폴로지</span>
        <span className="text-xs text-slate-400 ml-1">업체 × 시스템 연결 현황</span>
      </div>
      <svg width={totalW} height={totalH} viewBox={`0 0 ${totalW} ${totalH}`} className="overflow-visible">
        {/* 시스템 헤더 */}
        {SYSTEMS.map((sys, si) => {
          const x = LABEL_W + si * (CELL_W + COL_GAP) + CELL_W / 2;
          return (
            <g key={sys}>
              <rect x={LABEL_W + si * (CELL_W + COL_GAP)} y={4} width={CELL_W} height={HEADER_H - 8}
                rx={8} fill={sysColor[sys]} fillOpacity={0.15}/>
              <text x={x} y={24} textAnchor="middle" fontSize={12} fontWeight={700} fill={sysColor[sys]}>{sys}</text>
            </g>
          );
        })}
        {/* 업체 레이블 */}
        {VENDORS.map((v, vi) => {
          const y = HEADER_H + vi * (CELL_H + ROW_GAP) + CELL_H / 2;
          return (
            <g key={v}>
              <rect x={0} y={HEADER_H + vi * (CELL_H + ROW_GAP)} width={LABEL_W - 8} height={CELL_H}
                rx={8} fill={vendorColor[v]} fillOpacity={0.12}/>
              <text x={(LABEL_W - 8) / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={700}
                fill={vendorColor[v].replace("bg-","").replace("-500","")}>{v}</text>
              <text x={(LABEL_W - 8) / 2} y={y + 8} textAnchor="middle" fontSize={9} fill="#94a3b8">
                {sources.filter(s => s.vendor === v && s.status === "connected").length}/
                {sources.filter(s => s.vendor === v).length} 연결
              </text>
            </g>
          );
        })}
        {/* 셀 */}
        {VENDORS.map((v, vi) =>
          SYSTEMS.map((sys, si) => {
            const cellSources = sources.filter(s => s.vendor === v && s.system === sys);
            if (cellSources.length === 0) return (
              <rect key={`${v}-${sys}`}
                x={LABEL_W + si * (CELL_W + COL_GAP)} y={HEADER_H + vi * (CELL_H + ROW_GAP)}
                width={CELL_W} height={CELL_H} rx={8} fill="#f8fafc" stroke="#e2e8f0" strokeWidth={1}/>
            );
            const hasError = cellSources.some(s => s.status === "error");
            const hasPending = cellSources.some(s => s.status === "pending");
            const borderColor = hasError ? "#fca5a5" : hasPending ? "#fcd34d" : "#86efac";
            const bgColor = hasError ? "#fff1f2" : hasPending ? "#fffbeb" : "#f0fdf4";
            return (
              <g key={`${v}-${sys}`} style={{ cursor: "pointer" }}
                onClick={() => onSelect(cellSources[0])}>
                <rect x={LABEL_W + si * (CELL_W + COL_GAP)} y={HEADER_H + vi * (CELL_H + ROW_GAP)}
                  width={CELL_W} height={CELL_H} rx={8} fill={bgColor} stroke={borderColor} strokeWidth={1.5}/>
                {cellSources.map((src, idx) => {
                  const y0 = HEADER_H + vi * (CELL_H + ROW_GAP) + 10 + idx * 24;
                  const stColor = src.status==="connected"?"#10b981":src.status==="error"?"#ef4444":"#f59e0b";
                  return (
                    <g key={src.id}>
                      <circle cx={LABEL_W + si * (CELL_W + COL_GAP) + 14} cy={y0 + 5} r={4} fill={stColor}/>
                      <text x={LABEL_W + si * (CELL_W + COL_GAP) + 24} y={y0 + 9} fontSize={10} fill="#334155"
                        className="font-medium">
                        {src.name.replace(/\s*\([^)]+\)/, "").slice(0, 14)}
                      </text>
                      {src.qualityScore > 0 && (
                        <text x={LABEL_W + si * (CELL_W + COL_GAP) + CELL_W - 6} y={y0 + 9}
                          textAnchor="end" fontSize={9} fill={src.qualityScore>=85?"#10b981":src.qualityScore>=60?"#f59e0b":"#ef4444"}>
                          Q{src.qualityScore}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })
        )}
      </svg>
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
        {[["연결됨","#10b981"],["오류","#ef4444"],["미설정","#f59e0b"]].map(([l,c])=>(
          <div key={l} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{background:c}}/>
            {l}
          </div>
        ))}
        <span className="text-xs text-slate-400 ml-auto">셀 클릭 시 상세 보기</span>
      </div>
    </div>
  );
}

// ─── 카드 뷰 (업체별 그룹) ───────────────────────────────────────
function CardsView({ sources, onSelect, selected }: {
  sources: Source[]; onSelect: (s: Source) => void; selected: Source | null;
}) {
  return (
    <div className="space-y-5">
      {VENDORS.map(vendor => {
        const vendorSources = sources.filter(s => s.vendor === vendor);
        if (vendorSources.length === 0) return null;
        const connCount = vendorSources.filter(s => s.status === "connected").length;
        const errCount  = vendorSources.filter(s => s.status === "error").length;
        return (
          <div key={vendor}>
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border mb-3 ${vendorBg[vendor]}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${vendorColor[vendor]}`}/>
              <span className="text-sm font-bold text-slate-800">{vendor}</span>
              <span className="text-xs text-slate-500">{vendorSources.length}개 원천</span>
              <div className="ml-auto flex items-center gap-3 text-xs">
                <span className="text-emerald-600 font-semibold">{connCount} 연결됨</span>
                {errCount > 0 && <span className="text-rose-600 font-semibold">{errCount} 오류</span>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {vendorSources.map(src => (
                <button key={src.id} onClick={() => onSelect(src)}
                  className={`text-left p-4 rounded-xl border transition-all hover:shadow-md ${selected?.id===src.id?"border-blue-400 bg-blue-50 shadow-md":"bg-white border-slate-200 hover:border-slate-300"}`}>
                  <div className="flex items-start justify-between mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${typeColor[src.type]||"bg-slate-100 text-slate-600"}`}>{src.type}</span>
                    <StatusDot status={src.status}/>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 leading-snug mb-1">
                    {src.name.replace(/\s*\([^)]+\)/, "")}
                  </div>
                  <div className="text-xs text-slate-500 mb-3">{src.dept} · {src.cycle}</div>
                  {src.qualityScore > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${src.qualityScore>=85?"bg-emerald-500":src.qualityScore>=60?"bg-amber-400":"bg-rose-500"}`}
                          style={{width:`${src.qualityScore}%`}}/>
                      </div>
                      <span className={`text-xs font-medium ${src.qualityScore>=85?"text-emerald-600":src.qualityScore>=60?"text-amber-600":"text-rose-600"}`}>{src.qualityScore}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">
                      {src.status==="error"?"⚠ 즉시 조치 필요":src.status==="pending"?"설정 대기 중":"-"}
                    </span>
                  )}
                  {src.lastSync !== "실패" && src.lastSync !== "설정 필요" && src.lastSync !== "권한 필요" && (
                    <div className="text-[10px] text-slate-400 mt-2">마지막 동기화: {src.lastSync}</div>
                  )}
                  {(src.lastSync === "실패" || src.lastSync === "설정 필요" || src.lastSync === "권한 필요") && (
                    <div className="text-[10px] text-rose-500 mt-2">{src.lastSync}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 상세 패널 ────────────────────────────────────────────────────
function DetailPanel({ src, onClose, liveEvents }: { src: Source; onClose: () => void; liveEvents: SyncEvent[] }) {
  const [tab, setTab] = useState<"status" | "schema" | "history" | "pipeline">("status");
  const [expandedTable, setExpandedTable] = useState<string | null>(null);

  const PIPELINE_STAGES = [
    { stage: "수집", detail: `${src.name} → Data Ingestion Hub`, status: src.status === "connected" ? "ok" : "err" },
    { stage: "스키마 매핑", detail: "컬럼 표준화 (Schema Mapping)", status: src.schema.length > 0 ? "ok" : "skip" },
    { stage: "품질 검증", detail: `Quality Validator — ${src.qualityScore}/100`, status: src.qualityScore >= 60 ? "ok" : "warn" },
    { stage: "온톨로지 매핑", detail: "Dict D1~D6 연결 (Ontology Mapping)", status: src.system !== "기타" ? "ok" : "skip" },
    { stage: "AX Chat", detail: "자연어 질의 활성화", status: src.status === "connected" && src.qualityScore >= 60 ? "ok" : "pending" },
  ];

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50">
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
        <div>
          <div className="font-semibold text-slate-900 text-sm leading-tight">{src.name}</div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full ${typeColor[src.type]||"bg-slate-100 text-slate-600"}`}>{src.type}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${secColor[src.security]}`}>{src.security}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${vendorColor[src.vendor]} text-white`}>{src.vendor}</span>
            {src.status === "connected" && <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3 h-3"/>연결됨</span>}
            {src.status === "error" && <span className="flex items-center gap-1 text-xs text-rose-600"><AlertCircle className="w-3 h-3"/>오류</span>}
            {src.status === "pending" && <span className="flex items-center gap-1 text-xs text-amber-600"><Clock className="w-3 h-3"/>미설정</span>}
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><X className="w-4 h-4"/></button>
      </div>

      <div className="flex border-b border-slate-200 px-4">
        {(["status","schema","history","pipeline"] as const).map(key => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-2.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${tab===key?"border-blue-600 text-blue-600":"border-transparent text-slate-500 hover:text-slate-700"}`}>
            {key==="status"&&<Activity className="w-3.5 h-3.5"/>}
            {key==="schema"&&<Table2 className="w-3.5 h-3.5"/>}
            {key==="history"&&<History className="w-3.5 h-3.5"/>}
            {key==="pipeline"&&<Zap className="w-3.5 h-3.5"/>}
            {key==="status"?"상태":key==="schema"?"스키마":key==="history"?"수집이력":"파이프라인"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab==="status"&&(
          <>
            <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs">
              <div className="font-semibold text-slate-700 mb-2">연결 정보</div>
              {([["호스트",src.host],["포트",src.port??"-"],["데이터베이스",src.dbName??"-"],["갱신주기",src.cycle],["소유부서",src.dept],["시스템",src.system]] as [string,string|number][]).map(([k,v])=>(
                <div key={String(k)} className="flex justify-between">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-800 font-medium">{String(v)}</span>
                </div>
              ))}
            </div>

            {src.status !== "pending" && (
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs font-semibold text-slate-700 mb-3">데이터 품질</div>
                <div className="flex items-center gap-4">
                  <QualityGauge score={src.qualityScore} />
                  <div className="text-xs text-slate-500">
                    <div className="text-2xl font-bold text-slate-900">{src.qualityScore}<span className="text-sm font-normal">/100</span></div>
                    <div className="mt-0.5">{src.qualityScore>=85?"양호":src.qualityScore>=60?"주의 필요":"즉시 조치 필요"}</div>
                    <div className="mt-1 text-slate-400">이슈 {src.issues.length}건 발견</div>
                  </div>
                </div>
              </div>
            )}

            {src.errorMsg&&(
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                <div className="text-xs font-semibold text-rose-700 mb-1">오류 메시지</div>
                <code className="text-xs text-rose-600 break-all">{src.errorMsg}</code>
              </div>
            )}

            {src.issues.length>0&&(
              <div>
                <div className="text-xs font-semibold text-slate-700 mb-2">품질 이슈</div>
                <div className="space-y-1.5">
                  {src.issues.map((iss,i)=>(
                    <div key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${sevColor[iss.severity]}`}>
                      <span className="font-semibold uppercase text-[10px] mt-0.5">{iss.severity}</span>
                      <div>
                        <div className="font-medium">{iss.field}</div>
                        <div className="opacity-80">{iss.issue}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {src.status==="pending"&&(
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700">
                연결 설정이 완료되지 않았습니다. 담당자에게 접근 권한 요청 후 재시도하십시오.
              </div>
            )}
          </>
        )}

        {tab==="schema"&&(
          src.schema.length===0?(
            <div className="text-xs text-slate-400 text-center py-8">스키마 정보를 불러올 수 없습니다</div>
          ):(
            <div className="space-y-2">
              <div className="text-xs text-slate-500">{src.schema.length}개 테이블</div>
              {src.schema.map(tbl=>(
                <div key={tbl.name} className="border border-slate-200 rounded-xl overflow-hidden">
                  <button onClick={()=>setExpandedTable(expandedTable===tbl.name?null:tbl.name)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-blue-500"/>
                      <span className="text-xs font-semibold text-slate-800">{tbl.name}</span>
                      <span className="text-[10px] text-slate-400">{tbl.rows.toLocaleString()} 행</span>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expandedTable===tbl.name?"rotate-90":""}`}/>
                  </button>
                  {expandedTable===tbl.name&&(
                    <table className="w-full text-xs">
                      <thead><tr className="bg-slate-50 border-t border-slate-200">
                        <th className="px-3 py-1.5 text-left text-[10px] text-slate-500 font-semibold">컬럼</th>
                        <th className="px-3 py-1.5 text-left text-[10px] text-slate-500 font-semibold">타입</th>
                        <th className="px-3 py-1.5 text-center text-[10px] text-slate-500 font-semibold">PK</th>
                        <th className="px-3 py-1.5 text-center text-[10px] text-slate-500 font-semibold">NULL</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {tbl.columns.map(col=>(
                          <tr key={col.name} className="hover:bg-slate-50">
                            <td className="px-3 py-1.5 font-medium text-slate-800">{col.name}</td>
                            <td className="px-3 py-1.5 text-slate-500 font-mono">{col.type}</td>
                            <td className="px-3 py-1.5 text-center">{col.pk?<span className="text-blue-600 font-bold">PK</span>:""}</td>
                            <td className="px-3 py-1.5 text-center">{col.nullable?<span className="text-amber-500">Y</span>:<span className="text-slate-300">N</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {tab==="history"&&(
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-700 mb-3">7일 수집 이력</div>
              <div className="flex gap-4 text-xs mb-3">
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-emerald-500"/>성공</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-rose-500"/>실패</span>
              </div>
              <HistoryChart days={src.history}/>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="bg-emerald-50 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-emerald-700">{src.history.reduce((a,d)=>a+d.success,0).toLocaleString()}</div>
                  <div className="text-emerald-600">총 성공</div>
                </div>
                <div className="bg-rose-50 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-rose-700">{src.history.reduce((a,d)=>a+d.failed,0).toLocaleString()}</div>
                  <div className="text-rose-600">총 실패</div>
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-700 mb-2">실시간 이벤트</div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {liveEvents.length===0?(
                  <div className="text-xs text-slate-400 text-center py-4">이벤트 없음</div>
                ):liveEvents.map((ev,i)=>(
                  <div key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${ev.ok?"bg-emerald-50 text-emerald-700":"bg-rose-50 text-rose-700"}`}>
                    <span className="font-mono text-[10px] opacity-60 mt-0.5 whitespace-nowrap">{ev.ts}</span>
                    <span>{ev.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab==="pipeline"&&(
          <div className="space-y-3">
            <div className="text-xs text-slate-500">이 원천이 DeepSeeHub 파이프라인에서 거치는 단계</div>
            {PIPELINE_STAGES.map((s, i) => {
              const icon = s.status==="ok"?"✓":s.status==="err"?"✕":s.status==="warn"?"⚠":"⏸";
              const color = s.status==="ok"?"border-emerald-200 bg-emerald-50":s.status==="err"?"border-rose-200 bg-rose-50":s.status==="warn"?"border-amber-200 bg-amber-50":"border-slate-200 bg-slate-50";
              const iconColor = s.status==="ok"?"text-emerald-600":s.status==="err"?"text-rose-600":s.status==="warn"?"text-amber-600":"text-slate-400";
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${color}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${iconColor} border ${color}`}>{icon}</div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">{s.stage}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{s.detail}</div>
                  </div>
                  <span className={`ml-auto text-[10px] font-semibold ${iconColor} shrink-0`}>
                    {s.status==="ok"?"완료":s.status==="err"?"오류":s.status==="warn"?"주의":"대기"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────
export default function SourceRegistry() {
  const [statusFilter, setStatusFilter] = useState<SourceStatus | "all">("all");
  const [typeFilter,   setTypeFilter]   = useState<string>("all");
  const [secFilter,    setSecFilter]    = useState<string>("all");
  const [search,       setSearch]       = useState<string>("");
  const [viewMode,     setViewMode]     = useState<ViewMode>("table");
  const [selected,     setSelected]     = useState<Source | null>(null);
  const [liveEvents,   setLiveEvents]   = useState<SyncEvent[]>([]);
  const [sources,      setSources]      = useState<Source[]>(SOURCES);
  const [showAdd,      setShowAdd]      = useState(false);
  const tickRef = useRef(0);

  const handleAdd = (src: Source) => setSources(prev => [src, ...prev]);

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current++;
      const connSources = sources.filter(s => s.status === "connected");
      if (connSources.length === 0) return;
      const src = connSources[Math.floor(Math.random() * connSources.length)];
      const pool = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)];
      const ev = pool(src.name.split(" ")[0]);
      const now = new Date();
      const ts = `${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}:${now.getSeconds().toString().padStart(2,"0")}`;
      setLiveEvents(prev => [{ ...ev, ts }, ...prev].slice(0, 30));
    }, 1200);
    return () => clearInterval(id);
  }, [sources]);

  const counts = {
    all:       sources.length,
    connected: sources.filter(s => s.status === "connected").length,
    error:     sources.filter(s => s.status === "error").length,
    pending:   sources.filter(s => s.status === "pending").length,
  };

  const totalRows  = sources.filter(s => s.totalRows > 0).reduce((a,s) => a + s.totalRows, 0);
  const connSrcs   = sources.filter(s => s.status === "connected");
  const avgQuality = connSrcs.length > 0 ? Math.round(connSrcs.reduce((a,s) => a + s.qualityScore, 0) / connSrcs.length) : 0;

  const types = ["all", ...Array.from(new Set(sources.map(s => s.type)))];
  const secs  = ["all", ...Array.from(new Set(sources.map(s => s.security)))];

  const filtered = sources.filter(s =>
    (statusFilter === "all" || s.status === statusFilter) &&
    (typeFilter   === "all" || s.type === typeFilter) &&
    (secFilter    === "all" || s.security === secFilter) &&
    (search === "" || s.name.toLowerCase().includes(search.toLowerCase()) || s.dept.includes(search) || s.type.includes(search))
  );

  return (
    <div className="p-6 space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Source Registry</h1>
          <p className="text-slate-500 mt-1 text-sm">데이터 원천 등록 및 연결 상태 관리 — {sources.length}개 원천 · 4개 업체</p>
        </div>
        <button onClick={()=>setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4"/>데이터 원천 추가
        </button>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-5 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-emerald-600 font-medium">정상 연결</span>
            <Wifi className="w-4 h-4 text-emerald-500"/>
          </div>
          <div className="text-2xl font-bold text-emerald-700">{counts.connected}</div>
          <div className="text-[11px] text-emerald-500 mt-0.5">of {counts.all} sources</div>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-rose-600 font-medium">연결 오류</span>
            <WifiOff className="w-4 h-4 text-rose-500"/>
          </div>
          <div className="text-2xl font-bold text-rose-700">{counts.error}</div>
          <div className="text-[11px] text-rose-500 mt-0.5">즉시 조치 필요</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-amber-600 font-medium">설정 대기</span>
            <Clock className="w-4 h-4 text-amber-500"/>
          </div>
          <div className="text-2xl font-bold text-amber-700">{counts.pending}</div>
          <div className="text-[11px] text-amber-500 mt-0.5">설정 미완료</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-blue-600 font-medium">총 적재 행</span>
            <Database className="w-4 h-4 text-blue-500"/>
          </div>
          <div className="text-2xl font-bold text-blue-700">{(totalRows / 1000000).toFixed(1)}M</div>
          <div className="text-[11px] text-blue-500 mt-0.5">{totalRows.toLocaleString()} rows</div>
        </div>
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-violet-600 font-medium">평균 품질</span>
            <Shield className="w-4 h-4 text-violet-500"/>
          </div>
          <div className="text-2xl font-bold text-violet-700">{avgQuality}</div>
          <div className="text-[11px] text-violet-500 mt-0.5">/100 score</div>
        </div>
      </div>

      {/* 필터 + 검색 + 뷰 토글 */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="원천명·부서·유형 검색..."
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-400 w-52"/>
        </div>

        <div className="h-4 border-l border-slate-200"/>

        {/* 상태 필터 */}
        <Filter className="w-4 h-4 text-slate-400"/>
        {(["all","connected","error","pending"] as const).map(s=>(
          <button key={s} onClick={()=>setStatusFilter(s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${statusFilter===s?"bg-blue-600 text-white border-blue-600":"bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}>
            {s==="connected"&&<Wifi className="w-3 h-3"/>}
            {s==="error"&&<WifiOff className="w-3 h-3"/>}
            {s==="pending"&&<Clock className="w-3 h-3"/>}
            {s==="all"?"전체":s==="connected"?"연결됨":s==="error"?"오류":"미설정"}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter===s?"bg-white/20":"bg-slate-100"}`}>{counts[s]}</span>
          </button>
        ))}
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-blue-400">
          {types.map(t=><option key={t} value={t}>{t==="all"?"유형 전체":t}</option>)}
        </select>
        <select value={secFilter} onChange={e=>setSecFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-blue-400">
          {secs.map(s=><option key={s} value={s}>{s==="all"?"보안등급 전체":s}</option>)}
        </select>

        <div className="h-4 border-l border-slate-200"/>

        {/* 뷰 토글 */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          {([["table","테이블",List],["cards","카드",LayoutGrid],["topology","토폴로지",GitBranch]] as [ViewMode,string,React.ElementType][]).map(([mode,label,Icon])=>(
            <button key={mode} onClick={()=>setViewMode(mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${viewMode===mode?"bg-blue-600 text-white":"bg-white text-slate-600 hover:bg-slate-50"}`}>
              <Icon className="w-3.5 h-3.5"/>{label}
            </button>
          ))}
        </div>

        {search && (
          <span className="text-xs text-slate-500">{filtered.length}개 결과</span>
        )}
      </div>

      {/* 뷰 콘텐츠 */}
      {viewMode === "table" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["원천명","유형","소유부서","갱신주기","보안등급","데이터량","품질","연결상태","최근 동기화",""].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(src=>(
                <tr key={src.id}
                  onClick={()=>setSelected(s=>s?.id===src.id?null:src)}
                  className={`hover:bg-slate-50 transition-colors cursor-pointer ${selected?.id===src.id?"bg-blue-50":""}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{src.name}</div>
                    <div className="text-[10px] text-slate-400">{src.vendor} · {src.system}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${typeColor[src.type]||"bg-slate-100 text-slate-600"}`}>{src.type}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{src.dept}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{src.cycle}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${secColor[src.security]}`}>{src.security}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {src.rows?`${src.rows} 행`:src.files?src.files:"-"}
                  </td>
                  <td className="px-4 py-3">
                    {src.status==="pending"?(
                      <span className="text-xs text-slate-400">-</span>
                    ):(
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full rounded-full ${src.qualityScore>=85?"bg-emerald-500":src.qualityScore>=60?"bg-amber-400":"bg-rose-500"}`}
                            style={{width:`${src.qualityScore}%`}}/>
                        </div>
                        <span className={`text-xs font-medium ${src.qualityScore>=85?"text-emerald-600":src.qualityScore>=60?"text-amber-600":"text-rose-600"}`}>{src.qualityScore}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {src.status==="connected"&&<div className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="w-4 h-4"/><span className="text-xs font-medium">연결됨</span></div>}
                    {src.status==="error"&&<div className="flex items-center gap-1.5 text-rose-600"><AlertCircle className="w-4 h-4"/><span className="text-xs font-medium">오류</span></div>}
                    {src.status==="pending"&&<div className="flex items-center gap-1.5 text-amber-600"><Clock className="w-4 h-4"/><span className="text-xs font-medium">미설정</span></div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{src.lastSync}</td>
                  <td className="px-4 py-3">
                    <button onClick={e=>e.stopPropagation()}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                      <RefreshCw className="w-3.5 h-3.5"/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === "cards" && (
        <CardsView sources={filtered} onSelect={src=>setSelected(s=>s?.id===src.id?null:src)} selected={selected}/>
      )}

      {viewMode === "topology" && (
        <TopologyView sources={filtered} onSelect={src=>setSelected(s=>s?.id===src.id?null:src)}/>
      )}

      {/* 실시간 이벤트 로그 */}
      {liveEvents.length>0&&viewMode!=="topology"&&(
        <div className="bg-slate-900 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
            <span className="text-xs font-semibold text-slate-300">실시간 수집 이벤트</span>
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {liveEvents.slice(0,8).map((ev,i)=>(
              <div key={i} className="flex items-center gap-3 text-xs font-mono">
                <span className="text-slate-500 whitespace-nowrap">{ev.ts}</span>
                <span className={ev.ok?"text-emerald-400":"text-rose-400"}>{ev.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 디테일 패널 */}
      {selected&&(
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={()=>setSelected(null)}/>
          <DetailPanel
            src={selected}
            onClose={()=>setSelected(null)}
            liveEvents={liveEvents.filter(e=>e.msg.startsWith(selected.name.split(" ")[0]))}
          />
        </>
      )}

      {/* 원천 추가 모달 */}
      {showAdd&&(
        <AddSourceModal
          onClose={()=>setShowAdd(false)}
          onAdd={handleAdd}
        />
      )}
    </div>
  );
}
