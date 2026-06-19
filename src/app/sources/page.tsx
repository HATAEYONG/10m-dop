"use client";

import { useState, useEffect, useRef } from "react";
import {
  CheckCircle2, AlertCircle, Clock, Wifi, WifiOff, Plus, RefreshCw,
  X, Database, Activity, ChevronRight,
  Shield, Table2, History, Filter, Loader2,
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
    const now = new Date().toLocaleTimeString("ko-KR",{hour12:false});
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
    };
    onAdd(newSrc);
    onClose();
  };

  const connValid = form.host.trim() !== "" || form.type === "이메일";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">데이터 원천 추가</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {step==="type"?"원천 유형 선택":step==="conn"?"연결 정보 입력":step==="test"?"연결 테스트":"등록 완료"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4"/></button>
        </div>

        {/* 스텝 인디케이터 */}
        <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2 shrink-0">
          {(["type","conn","test","done"] as AddStep[]).map((s,i)=>{
            const idx=["type","conn","test","done"].indexOf(step);
            const si=i;
            const done=si<idx; const active=si===idx;
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

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: 유형 선택 */}
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

          {/* STEP 2: 연결 정보 */}
          {step==="conn"&&(
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">원천 이름 <span className="text-rose-500">*</span></label>
                <input value={form.name} onChange={e=>set("name",e.target.value)}
                  placeholder={`예: 더존 ERP (A업체)`}
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
                    placeholder={form.type==="파일서버"?"\\\\nas\\share 또는 /mnt/nas":"https://drive.google.com/..."}
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

          {/* STEP 3: 연결 테스트 */}
          {step==="test"&&(
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 text-xs space-y-1.5">
                <div className="font-semibold text-slate-700 mb-2">등록 정보 확인</div>
                {[
                  ["원천명", form.name||"(미입력)"],
                  ["유형",   form.type],
                  ["호스트", form.host||"-"],
                  ["부서",   form.dept],
                  ["주기",   form.cycle],
                  ["보안",   form.security],
                ].map(([k,v])=>(
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-400">{k}</span>
                    <span className="font-medium text-slate-700">{v}</span>
                  </div>
                ))}
              </div>

              {!testResult&&!testing&&(
                <button onClick={runTest}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                  연결 테스트 실행
                </button>
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
              {testResult==="fail"&&(
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0"/>
                  <div>
                    <div className="text-sm font-semibold text-rose-700">연결 실패</div>
                    <div className="text-xs text-rose-600 mt-0.5">호스트에 도달할 수 없습니다. 연결 정보를 확인하세요.</div>
                  </div>
                </div>
              )}
              {testResult&&(
                <button onClick={()=>setStep("done")}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors">
                  {testResult==="ok"?"등록 완료하기":"테스트 건너뛰고 등록"}
                </button>
              )}
            </div>
          )}

          {/* STEP 4: 완료 */}
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
              <button onClick={finish}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                목록으로 돌아가기
              </button>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
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
            {step==="test"&&!testResult&&(
              <span className="text-xs text-slate-400 self-center">테스트 후 계속 진행 가능</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type SourceStatus = "connected" | "error" | "pending";

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
}

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

const SOURCES: Source[] = [
  { id:1, name:"더존 ERP (A업체)", type:"DB", dept:"경영지원팀", cycle:"실시간", security:"기밀", status:"connected", lastSync:"2분 전", rows:"124,382", files:null, qualityScore:91, totalRows:124382, host:"erp-a.internal", port:1433, dbName:"DUZON_PROD", schema:mkSchema(["TB_ORDER","TB_ITEM","TB_VENDOR","TB_ACCOUNT"]), issues:[{field:"TB_ITEM.description",issue:"null 비율 34%",severity:"mid"},{field:"TB_VENDOR.email",issue:"형식 오류 12건",severity:"low"}], history:mkHistory(true), errorMsg:null },
  { id:2, name:"Excel BOM 폴더 (A업체)", type:"파일서버", dept:"생산기술팀", cycle:"주 1회", security:"내부", status:"connected", lastSync:"3일 전", rows:null, files:"247개", qualityScore:78, totalRows:18340, host:"\\\\nas-a\\bom", port:null, dbName:null, schema:mkSchema(["BOM_MASTER","BOM_DETAIL"]), issues:[{field:"BOM_MASTER.rev",issue:"버전 누락 67건",severity:"high"},{field:"BOM_DETAIL.unit",issue:"단위 불일치 23건",severity:"mid"}], history:mkHistory(true), errorMsg:null },
  { id:3, name:"PDF 작업표준서 (A업체)", type:"파일서버", dept:"품질팀", cycle:"수시", security:"내부", status:"error", lastSync:"실패", rows:null, files:"89개", qualityScore:42, totalRows:0, host:"\\\\nas-a\\std", port:null, dbName:null, schema:[], issues:[{field:"OCR 엔진",issue:"PDF 스캔본 인식 실패",severity:"high"},{field:"파일 접근",issue:"SMB 권한 거부",severity:"high"}], history:mkHistory(false), errorMsg:"SMB 마운트 실패: Access denied (0x0000005)" },
  { id:4, name:"SAP ERP (B업체)", type:"API", dept:"경영지원팀", cycle:"실시간", security:"기밀", status:"connected", lastSync:"1분 전", rows:"892,441", files:null, qualityScore:96, totalRows:892441, host:"sap-b.api.internal", port:443, dbName:null, schema:mkSchema(["MARA","MARC","EKKO","EKPO","VBAK"]), issues:[{field:"MARC.MMSTA",issue:"코드표 미매핑 8건",severity:"low"}], history:mkHistory(true), errorMsg:null },
  { id:5, name:"MES 시스템 (B업체)", type:"DB", dept:"생산팀", cycle:"10분", security:"내부", status:"connected", lastSync:"9분 전", rows:"3,201,882", files:null, qualityScore:88, totalRows:3201882, host:"mes-b.internal", port:5432, dbName:"mes_prod", schema:mkSchema(["WO_HEADER","WO_OPERATION","DEFECT_LOG","INSPECTION"]), issues:[{field:"DEFECT_LOG.cause",issue:"분류코드 미입력 312건",severity:"mid"}], history:mkHistory(true), errorMsg:null },
  { id:6, name:"설비 CSV 로그 (B업체)", type:"파일서버", dept:"설비팀", cycle:"일 1회", security:"일반", status:"connected", lastSync:"6시간 전", rows:null, files:"1,204개", qualityScore:82, totalRows:2100000, host:"\\\\nas-b\\equipment", port:null, dbName:null, schema:mkSchema(["EQUIP_MASTER","LOG_RAW"]), issues:[{field:"LOG_RAW.timestamp",issue:"시간대 혼재 (KST/UTC)",severity:"high"}], history:mkHistory(true), errorMsg:null },
  { id:7, name:"자체 ERP (C업체)", type:"DB", dept:"경영지원팀", cycle:"일 1회", security:"기밀", status:"connected", lastSync:"18시간 전", rows:"45,221", files:null, qualityScore:74, totalRows:45221, host:"erp-c.internal", port:3306, dbName:"erp_live", schema:mkSchema(["SALES_ORDER","PURCHASE","INVENTORY"]), issues:[{field:"SALES_ORDER.cust_code",issue:"중복 키 14건",severity:"high"},{field:"INVENTORY.qty",issue:"음수값 존재 3건",severity:"mid"}], history:mkHistory(true), errorMsg:null },
  { id:8, name:"수기 Excel (C업체)", type:"Google Drive", dept:"영업팀", cycle:"수시", security:"일반", status:"error", lastSync:"실패", rows:null, files:"132개", qualityScore:31, totalRows:0, host:"drive.google.com", port:null, dbName:null, schema:[], issues:[{field:"OAuth 토큰",issue:"만료됨 — 재인증 필요",severity:"high"},{field:"파일 형식",issue:".xls (구형 포맷) 37건",severity:"mid"}], history:mkHistory(false), errorMsg:"OAuth 2.0 토큰 만료: invalid_grant" },
  { id:9, name:"카카오톡/메일 발주 (C업체)", type:"이메일", dept:"구매팀", cycle:"실시간", security:"내부", status:"pending", lastSync:"설정 필요", rows:null, files:null, qualityScore:0, totalRows:0, host:"-", port:null, dbName:null, schema:[], issues:[], history:mkHistory(false), errorMsg:null },
  { id:10, name:"Odoo ERP (D업체)", type:"API", dept:"경영지원팀", cycle:"30분", security:"기밀", status:"connected", lastSync:"28분 전", rows:"78,331", files:null, qualityScore:89, totalRows:78331, host:"odoo-d.example.com", port:8069, dbName:null, schema:mkSchema(["sale_order","purchase_order","stock_move","mrp_production"]), issues:[{field:"stock_move.origin",issue:"공백값 88건",severity:"low"}], history:mkHistory(true), errorMsg:null },
  { id:11, name:"Google Sheets (D업체)", type:"Google Drive", dept:"품질팀", cycle:"수시", security:"내부", status:"pending", lastSync:"권한 필요", rows:null, files:null, qualityScore:0, totalRows:0, host:"sheets.googleapis.com", port:null, dbName:null, schema:[], issues:[], history:mkHistory(false), errorMsg:null },
  { id:12, name:"PDF 검사성적서 (D업체)", type:"파일서버", dept:"품질팀", cycle:"수시", security:"내부", status:"connected", lastSync:"2일 전", rows:null, files:"521개", qualityScore:85, totalRows:94200, host:"\\\\nas-d\\quality", port:null, dbName:null, schema:mkSchema(["INSP_REPORT","INSP_ITEM"]), issues:[{field:"INSP_REPORT.std_ref",issue:"표준 번호 누락 45건",severity:"mid"}], history:mkHistory(true), errorMsg:null },
];

const EVENT_POOL = [
  (n: string) => ({ msg: `${n} 동기화 완료 — 1,284행 적재`, ok: true }),
  (n: string) => ({ msg: `${n} 스키마 변경 감지 — 새 컬럼 추가됨`, ok: true }),
  (n: string) => ({ msg: `${n} 품질 경고 — null 비율 급증 (12→38%)`, ok: false }),
  (n: string) => ({ msg: `${n} 연결 재시도 성공`, ok: true }),
  (n: string) => ({ msg: `${n} 타임아웃 오류 — retry 1/3`, ok: false }),
];

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

function DetailPanel({ src, onClose, liveEvents }: { src: Source; onClose: () => void; liveEvents: SyncEvent[] }) {
  const [tab, setTab] = useState<"status" | "schema" | "history">("status");
  const [expandedTable, setExpandedTable] = useState<string | null>(null);

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50">
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
        <div>
          <div className="font-semibold text-slate-900 text-sm leading-tight">{src.name}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${typeColor[src.type] || "bg-slate-100 text-slate-600"}`}>{src.type}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${secColor[src.security]}`}>{src.security}</span>
            {src.status === "connected" && <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3 h-3"/>연결됨</span>}
            {src.status === "error" && <span className="flex items-center gap-1 text-xs text-rose-600"><AlertCircle className="w-3 h-3"/>오류</span>}
            {src.status === "pending" && <span className="flex items-center gap-1 text-xs text-amber-600"><Clock className="w-3 h-3"/>미설정</span>}
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><X className="w-4 h-4"/></button>
      </div>

      <div className="flex border-b border-slate-200 px-4">
        {(["status", "schema", "history"] as const).map(key => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${tab === key ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {key === "status" && <Activity className="w-3.5 h-3.5"/>}
            {key === "schema" && <Table2 className="w-3.5 h-3.5"/>}
            {key === "history" && <History className="w-3.5 h-3.5"/>}
            {key === "status" ? "상태" : key === "schema" ? "스키마" : "수집이력"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab === "status" && (
          <>
            <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs">
              <div className="font-semibold text-slate-700 mb-2">연결 정보</div>
              {([["호스트", src.host], ["포트", src.port ?? "-"], ["데이터베이스", src.dbName ?? "-"], ["갱신주기", src.cycle], ["소유부서", src.dept]] as [string,string|number][]).map(([k,v]) => (
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
                    <div className="mt-0.5">{src.qualityScore >= 85 ? "양호" : src.qualityScore >= 60 ? "주의 필요" : "즉시 조치 필요"}</div>
                    <div className="mt-1 text-slate-400">이슈 {src.issues.length}건 발견</div>
                  </div>
                </div>
              </div>
            )}

            {src.errorMsg && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                <div className="text-xs font-semibold text-rose-700 mb-1">오류 메시지</div>
                <code className="text-xs text-rose-600 break-all">{src.errorMsg}</code>
              </div>
            )}

            {src.issues.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-700 mb-2">품질 이슈</div>
                <div className="space-y-1.5">
                  {src.issues.map((iss, i) => (
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

            {src.status === "pending" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700">
                연결 설정이 완료되지 않았습니다. 담당자에게 접근 권한 요청 후 재시도하십시오.
              </div>
            )}
          </>
        )}

        {tab === "schema" && (
          src.schema.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-8">스키마 정보를 불러올 수 없습니다</div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-slate-500">{src.schema.length}개 테이블</div>
              {src.schema.map(tbl => (
                <div key={tbl.name} className="border border-slate-200 rounded-xl overflow-hidden">
                  <button onClick={() => setExpandedTable(expandedTable === tbl.name ? null : tbl.name)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-blue-500"/>
                      <span className="text-xs font-semibold text-slate-800">{tbl.name}</span>
                      <span className="text-[10px] text-slate-400">{tbl.rows.toLocaleString()} 행</span>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expandedTable === tbl.name ? "rotate-90" : ""}`}/>
                  </button>
                  {expandedTable === tbl.name && (
                    <table className="w-full text-xs">
                      <thead><tr className="bg-slate-50 border-t border-slate-200">
                        <th className="px-3 py-1.5 text-left text-[10px] text-slate-500 font-semibold">컬럼</th>
                        <th className="px-3 py-1.5 text-left text-[10px] text-slate-500 font-semibold">타입</th>
                        <th className="px-3 py-1.5 text-center text-[10px] text-slate-500 font-semibold">PK</th>
                        <th className="px-3 py-1.5 text-center text-[10px] text-slate-500 font-semibold">NULL</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {tbl.columns.map(col => (
                          <tr key={col.name} className="hover:bg-slate-50">
                            <td className="px-3 py-1.5 font-medium text-slate-800">{col.name}</td>
                            <td className="px-3 py-1.5 text-slate-500 font-mono">{col.type}</td>
                            <td className="px-3 py-1.5 text-center">{col.pk ? <span className="text-blue-600 font-bold">PK</span> : ""}</td>
                            <td className="px-3 py-1.5 text-center">{col.nullable ? <span className="text-amber-500">Y</span> : <span className="text-slate-300">N</span>}</td>
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

        {tab === "history" && (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-700 mb-3">7일 수집 이력</div>
              <div className="flex gap-4 text-xs mb-3">
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-emerald-500"/>성공</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-rose-500"/>실패</span>
              </div>
              <HistoryChart days={src.history} />
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
                {liveEvents.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-4">이벤트 없음</div>
                ) : liveEvents.map((ev, i) => (
                  <div key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${ev.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    <span className="font-mono text-[10px] opacity-60 mt-0.5 whitespace-nowrap">{ev.ts}</span>
                    <span>{ev.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SourceRegistry() {
  const [statusFilter, setStatusFilter] = useState<SourceStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [secFilter, setSecFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Source | null>(null);
  const [liveEvents, setLiveEvents] = useState<SyncEvent[]>([]);
  const [sources, setSources] = useState<Source[]>(SOURCES);
  const [showAdd, setShowAdd] = useState(false);
  const tickRef = useRef(0);

  const handleAdd = (src: Source) => {
    setSources(prev => [src, ...prev]);
  };

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
    all: sources.length,
    connected: sources.filter(s => s.status === "connected").length,
    error: sources.filter(s => s.status === "error").length,
    pending: sources.filter(s => s.status === "pending").length,
  };

  const totalRows = sources.filter(s => s.totalRows > 0).reduce((a,s) => a + s.totalRows, 0);
  const connSources = sources.filter(s => s.status === "connected");
  const avgQuality = connSources.length > 0
    ? Math.round(connSources.reduce((a,s) => a + s.qualityScore, 0) / connSources.length)
    : 0;

  const types = ["all", ...Array.from(new Set(sources.map(s => s.type)))];
  const secs = ["all", ...Array.from(new Set(sources.map(s => s.security)))];

  const filtered = sources.filter(s =>
    (statusFilter === "all" || s.status === statusFilter) &&
    (typeFilter === "all" || s.type === typeFilter) &&
    (secFilter === "all" || s.security === secFilter)
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Source Registry</h1>
          <p className="text-slate-500 mt-1 text-sm">데이터 원천 등록 및 연결 상태 관리</p>
        </div>
        <button onClick={()=>setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4"/>데이터 원천 추가
        </button>
      </div>

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

      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-slate-400"/>
        <div className="flex gap-2">
          {(["all","connected","error","pending"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${statusFilter === s ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}>
              {s === "connected" && <Wifi className="w-3 h-3"/>}
              {s === "error" && <WifiOff className="w-3 h-3"/>}
              {s === "pending" && <Clock className="w-3 h-3"/>}
              {s === "all" ? "전체" : s === "connected" ? "연결됨" : s === "error" ? "오류" : "미설정"}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === s ? "bg-white/20" : "bg-slate-100"}`}>{counts[s]}</span>
            </button>
          ))}
        </div>
        <div className="h-4 border-l border-slate-200"/>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-blue-400">
          {types.map(t => <option key={t} value={t}>{t === "all" ? "유형 전체" : t}</option>)}
        </select>
        <select value={secFilter} onChange={e => setSecFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-blue-400">
          {secs.map(s => <option key={s} value={s}>{s === "all" ? "보안등급 전체" : s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["원천명","유형","소유부서","갱신주기","보안등급","데이터량","품질","연결상태","최근 동기화",""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(src => (
              <tr key={src.id}
                onClick={() => setSelected(s => s?.id === src.id ? null : src)}
                className={`hover:bg-slate-50 transition-colors cursor-pointer ${selected?.id === src.id ? "bg-blue-50" : ""}`}>
                <td className="px-4 py-3 font-medium text-slate-900">{src.name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${typeColor[src.type] || "bg-slate-100 text-slate-600"}`}>{src.type}</span>
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">{src.dept}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{src.cycle}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${secColor[src.security]}`}>{src.security}</span>
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">
                  {src.rows ? `${src.rows} 행` : src.files ? src.files : "-"}
                </td>
                <td className="px-4 py-3">
                  {src.status === "pending" ? (
                    <span className="text-xs text-slate-400">-</span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${src.qualityScore >= 85 ? "bg-emerald-500" : src.qualityScore >= 60 ? "bg-amber-400" : "bg-rose-500"}`}
                          style={{ width: `${src.qualityScore}%` }}/>
                      </div>
                      <span className={`text-xs font-medium ${src.qualityScore >= 85 ? "text-emerald-600" : src.qualityScore >= 60 ? "text-amber-600" : "text-rose-600"}`}>{src.qualityScore}</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {src.status === "connected" && <div className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="w-4 h-4"/><span className="text-xs font-medium">연결됨</span></div>}
                  {src.status === "error" && <div className="flex items-center gap-1.5 text-rose-600"><AlertCircle className="w-4 h-4"/><span className="text-xs font-medium">오류</span></div>}
                  {src.status === "pending" && <div className="flex items-center gap-1.5 text-amber-600"><Clock className="w-4 h-4"/><span className="text-xs font-medium">미설정</span></div>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{src.lastSync}</td>
                <td className="px-4 py-3">
                  <button onClick={e => e.stopPropagation()}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                    <RefreshCw className="w-3.5 h-3.5"/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {liveEvents.length > 0 && (
        <div className="bg-slate-900 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
            <span className="text-xs font-semibold text-slate-300">실시간 수집 이벤트</span>
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {liveEvents.slice(0,8).map((ev, i) => (
              <div key={i} className="flex items-center gap-3 text-xs font-mono">
                <span className="text-slate-500 whitespace-nowrap">{ev.ts}</span>
                <span className={ev.ok ? "text-emerald-400" : "text-rose-400"}>{ev.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setSelected(null)}/>
          <DetailPanel
            src={selected}
            onClose={() => setSelected(null)}
            liveEvents={liveEvents.filter(e => e.msg.startsWith(selected.name.split(" ")[0]))}
          />
        </>
      )}

      {showAdd && (
        <AddSourceModal
          onClose={() => setShowAdd(false)}
          onAdd={handleAdd}
        />
      )}
    </div>
  );
}
