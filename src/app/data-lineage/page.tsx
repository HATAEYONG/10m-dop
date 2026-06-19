"use client";

import { useState, useEffect, useRef } from "react";
import { GitBranch, Clock, X, Zap } from "lucide-react";

type LineageNodeType = "source"|"transform"|"destination"|"issue";
interface LineageNode {
  id:string; label:string; sub:string; type:LineageNodeType;
  system:string; col?:string; quality?:number; x:number; y:number;
  transformRule?: string;
}
interface LineageEdge { from:string; to:string; transform?:string; }
interface FieldDef {
  id:string; domain:string; field:string; desc:string;
  nodes:LineageNode[]; edges:LineageEdge[];
  history:{ts:string;event:string;actor:string;note:string}[];
}

const FIELDS: FieldDef[] = [
  {
    id:"f1", domain:"Order", field:"order_date", desc:"발주일 — 주문이 접수된 날짜",
    nodes:[
      {id:"n1",label:"ERP Oracle DB",sub:"TB_ORDER.ORDER_DT",type:"source",system:"SAP B1",col:"VARCHAR2(8) YYYYMMDD",quality:97,x:40,y:100,transformRule:"날짜 문자열 직접 추출"},
      {id:"n2",label:"Excel 발주서",sub:"Sheet1.F열 '발주일'",type:"source",system:"Excel",col:"텍스트 DD/MM/YYYY",quality:78,x:40,y:220,transformRule:"정규식: (\\d{2})/(\\d{2})/(\\d{4})"},
      {id:"n3",label:"날짜 정규화",sub:"ISO8601 변환",type:"transform",system:"Data Cleaner",col:"→ YYYY-MM-DD",quality:100,x:300,y:160,transformRule:"strptime 다중 포맷 → strftime('%Y-%m-%d')"},
      {id:"n4",label:"10M Order 도메인",sub:"Order.order_date",type:"destination",system:"10M DOP",col:"DATE NOT NULL",quality:96,x:560,y:160,transformRule:"Canonical 매핑 완료"},
    ],
    edges:[
      {from:"n1",to:"n3",transform:"YYYYMMDD→ISO"},
      {from:"n2",to:"n3",transform:"DD/MM/YYYY→ISO"},
      {from:"n3",to:"n4"},
    ],
    history:[
      {ts:"2026-06-18 09:14",event:"자동 매핑",actor:"AI Agent",note:"신뢰도 97%, 자동 승인"},
      {ts:"2026-06-17 15:22",event:"포맷 변환 룰 적용",actor:"Data Cleaner",note:"DD/MM/YYYY 6건 변환"},
      {ts:"2026-06-15 11:00",event:"소스 등록",actor:"사용자",note:"ERP TB_ORDER 신규 등록"},
    ],
  },
  {
    id:"f2", domain:"Material", field:"mat_nm", desc:"자재명 — 원자재·반제품의 공식 명칭",
    nodes:[
      {id:"m1",label:"ERP 자재 마스터",sub:"TB_MATERIAL.MAT_NM",type:"source",system:"SAP B1",col:"NVARCHAR2(200)",quality:91,x:40,y:60,transformRule:"직접 SELECT"},
      {id:"m2",label:"거래명세서 PDF",sub:"OCR 추출 품목명",type:"source",system:"Document Parser",col:"OCR 텍스트",quality:68,x:40,y:180,transformRule:"Tesseract OCR → 정규식 추출"},
      {id:"m3",label:"카카오톡 발주",sub:"파싱 필드 품목",type:"source",system:"Email Parser",col:"비정형 텍스트",quality:82,x:40,y:300,transformRule:"키워드 추출 룰 v2"},
      {id:"m4",label:"엔티티 통합",sub:"이름 변형 통합",type:"transform",system:"Entity Resolution",col:"표준명 매핑",quality:95,x:300,y:180,transformRule:"편집거리 + 사전 매핑"},
      {id:"m5",label:"10M Material",sub:"Material.mat_nm",type:"destination",system:"10M DOP",col:"NVARCHAR NOT NULL",quality:89,x:560,y:180,transformRule:"Canonical 매핑 완료"},
    ],
    edges:[
      {from:"m1",to:"m4",transform:"직접 매핑"},
      {from:"m2",to:"m4",transform:"OCR→정규화"},
      {from:"m3",to:"m4",transform:"비정형→추출"},
      {from:"m4",to:"m5"},
    ],
    history:[
      {ts:"2026-06-18 10:01",event:"엔티티 통합 실행",actor:"AI Agent",note:"12쌍 변형 통합 완료"},
      {ts:"2026-06-17 14:30",event:"OCR 파싱",actor:"Document Parser",note:"신뢰도 68% — Human Review 제출"},
      {ts:"2026-06-16 09:00",event:"Human Review 완료",actor:"김철수",note:"수기 보정 3건"},
    ],
  },
  {
    id:"f3", domain:"Machine", field:"spindle_rpm", desc:"스핀들 회전수 — CNC 주축 RPM 실시간 값",
    nodes:[
      {id:"e1",label:"CNC S7-1500 PLC",sub:"DB100.DBW0 (WORD)",type:"source",system:"Siemens S7",col:"UINT16 0~6000",quality:99,x:40,y:140,transformRule:"snap7 폴링 500ms"},
      {id:"e2",label:"Node-RED S7 플로우",sub:"s7-in 노드",type:"transform",system:"Node-RED",col:"Number (JS)",quality:100,x:300,y:80,transformRule:"raw → Number() 형변환"},
      {id:"e3",label:"Kafka Topic",sub:"raw.sensor.cnc01",type:"transform",system:"Kafka",col:"Avro Float32",quality:100,x:300,y:200,transformRule:"Avro 직렬화 v1.2"},
      {id:"e4",label:"TimescaleDB",sub:"sensor_readings",type:"destination",system:"TimescaleDB",col:"FLOAT NOT NULL",quality:99,x:560,y:140,transformRule:"Kafka Consumer 배치 5s"},
    ],
    edges:[
      {from:"e1",to:"e2",transform:"snap7 폴링"},
      {from:"e2",to:"e3",transform:"Avro 직렬화"},
      {from:"e3",to:"e4",transform:"Kafka Consumer"},
    ],
    history:[
      {ts:"2026-06-18 09:14:32",event:"실시간 수집",actor:"Sensor Gateway",note:"값: 2850 RPM, GOOD"},
      {ts:"2026-06-18 08:00:00",event:"스키마 등록",actor:"Schema Registry",note:"Avro v1.2 등록"},
      {ts:"2026-06-15 14:00",event:"Node-RED 플로우 배포",actor:"김개발",note:"S7→Kafka 브릿지 신규"},
    ],
  },
  {
    id:"f4", domain:"Customer", field:"cust_nm", desc:"고객사명 — 발주처 공식 법인명",
    nodes:[
      {id:"c1",label:"ERP 고객 마스터",sub:"TB_CUSTOMER.CUST_NM",type:"source",system:"SAP B1",col:"NVARCHAR2(100)",quality:94,x:40,y:100,transformRule:"직접 SELECT"},
      {id:"c2",label:"이메일 파싱",sub:"from 필드 추출",type:"source",system:"Email Parser",col:"텍스트 추출",quality:91,x:40,y:240,transformRule:"from 헤더 파싱 룰"},
      {id:"c3",label:"이름 표준화",sub:"(주)/㈜ 통일",type:"transform",system:"Data Cleaner",col:"정규식 치환",quality:100,x:300,y:170,transformRule:"re.sub(r'\\(주\\)|㈜','㈜',name)"},
      {id:"c4",label:"10M Customer",sub:"Customer.cust_nm",type:"destination",system:"10M DOP",col:"TEXT NOT NULL",quality:93,x:560,y:170,transformRule:"Canonical 매핑 완료"},
    ],
    edges:[
      {from:"c1",to:"c3",transform:"직접 매핑"},
      {from:"c2",to:"c3",transform:"신뢰도 91%"},
      {from:"c3",to:"c4"},
    ],
    history:[
      {ts:"2026-06-18 09:01",event:"표준화 적용",actor:"Data Cleaner",note:"(주)/㈜ 표기 통일 8건"},
      {ts:"2026-06-16 10:00",event:"이메일 파싱 연동",actor:"Email Parser",note:"from 필드 추출 룰 추가"},
    ],
  },
];

const NODE_COLORS: Record<LineageNodeType,{fill:string;stroke:string;label:string;textColor:string}> = {
  source:      {fill:"#eff6ff",stroke:"#3b82f6",label:"소스",textColor:"#1d4ed8"},
  transform:   {fill:"#fff7ed",stroke:"#f97316",label:"변환",textColor:"#c2410c"},
  destination: {fill:"#f0fdf4",stroke:"#22c55e",label:"목적지",textColor:"#15803d"},
  issue:       {fill:"#fff1f2",stroke:"#f43f5e",label:"이슈",textColor:"#be123c"},
};

const DOMAIN_COLORS: Record<string,string> = {
  Order:"bg-blue-100 text-blue-700", Material:"bg-amber-100 text-amber-700",
  Machine:"bg-purple-100 text-purple-700", Customer:"bg-emerald-100 text-emerald-700",
};

const FEED_POOL = [
  "계보 추적 — Order.order_date 소스 2개 재검증 완료",
  "품질 업데이트 — Material.mat_nm OCR 점수 68→71%",
  "계보 추적 — spindle_rpm TimescaleDB 적재 정상",
  "계보 추적 — cust_nm 이메일 파싱 15건 처리",
  "변환 룰 갱신 — 날짜 포맷 패턴 3개 추가",
  "계보 추적 — BOM.quantity 신규 필드 등록 감지",
];

function QualityBar({ value, threshold=90 }: { value:number; threshold?:number }) {
  const cls = value>=threshold?"bg-emerald-500":value>=70?"bg-amber-400":"bg-rose-400";
  const textCls = value>=threshold?"text-emerald-600":value>=70?"text-amber-600":"text-rose-600";
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 h-1.5 bg-slate-100 rounded-full overflow-visible">
        <div className={"absolute inset-y-0 left-0 rounded-full "+cls} style={{width:value+"%"}}/>
        <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400 opacity-40" style={{left:threshold+"%"}}/>
      </div>
      <span className={"text-xs font-bold shrink-0 "+textCls}>{value}%</span>
    </div>
  );
}

function NodeSlidePanel({ node, onClose }: { node: LineageNode; onClose: ()=>void }) {
  const [tab, setTab] = useState<"detail"|"transform"|"quality">("detail");
  const nc = NODE_COLORS[node.type];
  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50">
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{background:nc.fill,color:nc.textColor}}>{nc.label}</span>
            <span className="text-xs text-slate-400">{node.system}</span>
          </div>
          <h2 className="text-base font-bold text-slate-900 mt-1">{node.label}</h2>
          <p className="text-xs text-slate-400 font-mono">{node.sub}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4"/></button>
      </div>
      <div className="flex border-b border-slate-100">
        {(["detail","transform","quality"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={"flex-1 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors "+(tab===t?"border-blue-600 text-blue-700":"border-transparent text-slate-500 hover:text-slate-700")}>
            {t==="detail"?"노드 상세":t==="transform"?"변환 규칙":"품질 이력"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tab==="detail"&&(
          <>
            <div className="bg-slate-50 rounded-xl p-3 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">시스템</span><span className="font-semibold text-slate-700">{node.system}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">컬럼/필드</span><code className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-700">{node.col}</code></div>
              <div className="flex justify-between"><span className="text-slate-500">노드 유형</span><span className="font-semibold" style={{color:nc.textColor}}>{nc.label}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">노드 ID</span><code className="text-slate-500">{node.id}</code></div>
            </div>
            {node.quality!==undefined&&(
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-500">품질 점수</p>
                <QualityBar value={node.quality}/>
                <p className="text-[10px] text-slate-400">임계치 90% {node.quality>=90?"초과 — 정상":"미달 — 검토 필요"}</p>
              </div>
            )}
          </>
        )}
        {tab==="transform"&&(
          <div className="space-y-3">
            <div className="bg-slate-900 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-400 mb-2">변환 규칙</p>
              <code className="text-sm text-emerald-400 leading-relaxed block">{node.transformRule||"변환 없음 (직접 매핑)"}</code>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5">
              <p className="font-semibold text-slate-500 mb-2">변환 메타</p>
              <div className="flex justify-between"><span className="text-slate-400">입력 타입</span><span className="font-medium">{node.col?.split("→")[0]?.trim()||"-"}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">출력 타입</span><span className="font-medium">{node.col?.split("→")[1]?.trim()||node.col||"-"}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">시스템</span><span className="font-medium">{node.system}</span></div>
            </div>
          </div>
        )}
        {tab==="quality"&&(
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500">품질 추이 (최근 4주)</p>
            {[
              {w:"W1",v:node.quality?node.quality-8:80},
              {w:"W2",v:node.quality?node.quality-4:85},
              {w:"W3",v:node.quality?node.quality-2:88},
              {w:"W4",v:node.quality??90},
            ].map(({w,v})=>(
              <div key={w} className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-6 shrink-0">{w}</span>
                <QualityBar value={Math.max(0,v)}/>
              </div>
            ))}
            <div className="bg-slate-50 rounded-xl p-3 text-xs mt-2">
              <div className="flex justify-between"><span className="text-slate-400">현재 점수</span><span className="font-bold text-slate-700">{node.quality??"-"}%</span></div>
              <div className="flex justify-between mt-1"><span className="text-slate-400">추세</span><span className={"font-medium "+((node.quality??0)>=90?"text-emerald-600":"text-amber-600")}>{(node.quality??0)>=90?"개선 중":"주의 필요"}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DataLineage() {
  const [selectedField, setSelectedField] = useState("f1");
  const [selectedNode, setSelectedNode] = useState<string|null>(null);
  const [filterDomain, setFilterDomain] = useState<string|null>(null);
  const [feed, setFeed] = useState<{msg:string;ts:string}[]>([]);
  const tickRef = useRef(0);

  useEffect(()=>{
    const id=setInterval(()=>{
      tickRef.current++;
      if(tickRef.current%2===0){
        const msg=FEED_POOL[Math.floor(Math.random()*FEED_POOL.length)];
        const ts=new Date().toLocaleTimeString("ko-KR",{hour12:false});
        setFeed(prev=>[{msg,ts},...prev].slice(0,6));
      }
    },1200);
    return ()=>clearInterval(id);
  },[]);

  const filteredFields = filterDomain ? FIELDS.filter(f=>f.domain===filterDomain) : FIELDS;
  const field = FIELDS.find(f=>f.id===selectedField)!;
  const selNode = field.nodes.find(n=>n.id===selectedNode)||null;

  const totalSources = FIELDS.reduce((s,f)=>s+f.nodes.filter(n=>n.type==="source").length,0);
  const allQuality = FIELDS.flatMap(f=>f.nodes.map(n=>n.quality||0));
  const avgQuality = Math.round(allQuality.reduce((a,b)=>a+b,0)/allQuality.length);
  const issues = FIELDS.reduce((s,f)=>s+f.nodes.filter(n=>n.quality!==undefined&&n.quality<70).length,0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Lineage</h1>
          <p className="text-slate-500 mt-1 text-sm">필드 단위 데이터 계보 — 출처·변환·목적지를 DAG로 추적합니다</p>
        </div>
      </div>

      {/* KPI 4카드 */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {label:"총 필드",value:FIELDS.length+"개",cls:"text-blue-600"},
          {label:"소스 수",value:totalSources+"개",cls:"text-slate-700"},
          {label:"평균 품질",value:avgQuality+"%",cls:avgQuality>=90?"text-emerald-600":"text-amber-600"},
          {label:"품질 이슈",value:issues+"건",cls:issues>0?"text-rose-600":"text-emerald-600"},
        ].map(({label,value,cls})=>(
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className={"text-2xl font-bold "+cls}>{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        {/* 필드 목록 */}
        <div className="w-56 shrink-0 space-y-2">
          {/* 도메인 필터 */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">도메인 필터</p>
            {["Order","Material","Machine","Customer"].map(d=>(
              <button key={d} onClick={()=>setFilterDomain(filterDomain===d?null:d)}
                className={"text-xs px-2.5 py-1 rounded-full font-medium transition-colors "+(filterDomain===d?"bg-blue-600 text-white":"bg-white border border-slate-200 text-slate-600 hover:bg-slate-50")}>
                {d}
              </button>
            ))}
          </div>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 pt-2">필드</p>
          {filteredFields.map(f=>(
            <button key={f.id} onClick={()=>{setSelectedField(f.id);setSelectedNode(null);}}
              className={"w-full text-left p-3 rounded-xl border transition-all "+(selectedField===f.id?"border-blue-300 ring-2 ring-blue-100 bg-white shadow-sm":"border-slate-200 bg-white hover:border-slate-300")}>
              <div className="flex items-center gap-2 mb-1">
                <span className={"text-xs font-bold px-1.5 py-0.5 rounded "+(DOMAIN_COLORS[f.domain]||"bg-slate-100 text-slate-600")}>{f.domain}</span>
              </div>
              <div className="text-xs font-mono font-semibold text-slate-800">{f.field}</div>
              <div className="text-xs text-slate-400 mt-0.5 leading-tight">{f.desc}</div>
            </button>
          ))}
          {filteredFields.length===0&&<div className="text-xs text-slate-400 text-center py-4">해당 도메인 없음</div>}

          {/* 범례 */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 mt-2">
            <div className="text-xs font-semibold text-slate-500 mb-2">범례</div>
            {(Object.entries(NODE_COLORS) as [LineageNodeType,typeof NODE_COLORS[LineageNodeType]][]).map(([type,cfg])=>(
              <div key={type} className="flex items-center gap-2 mb-1.5">
                <div className="w-4 h-3 rounded border" style={{background:cfg.fill,borderColor:cfg.stroke}}/>
                <span className="text-xs text-slate-600">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 메인 패널 */}
        <div className="flex-1 space-y-4">
          {/* 필드 헤더 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
            <GitBranch className="w-5 h-5 text-blue-500 shrink-0"/>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={"text-xs font-bold px-2 py-0.5 rounded "+(DOMAIN_COLORS[field.domain]||"")}>{field.domain}</span>
                <code className="text-sm font-mono font-bold text-slate-800">{field.field}</code>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{field.desc}</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="text-right">
                <div className="text-slate-400">소스</div>
                <div className="font-bold text-slate-700">{field.nodes.filter(n=>n.type==="source").length}개</div>
              </div>
              <div className="text-right">
                <div className="text-slate-400">변환</div>
                <div className="font-bold text-slate-700">{field.nodes.filter(n=>n.type==="transform").length}개</div>
              </div>
              <div className="text-right">
                <div className="text-slate-400">평균 품질</div>
                <div className={"font-bold "+(avgQuality>=90?"text-emerald-600":"text-amber-600")}>
                  {Math.round(field.nodes.filter(n=>n.quality).reduce((s,n)=>s+(n.quality||0),0)/field.nodes.filter(n=>n.quality).length)}%
                </div>
              </div>
            </div>
          </div>

          {/* DAG SVG */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-900">
              데이터 계보 그래프 (DAG) — 노드 클릭 시 상세 패널
            </div>
            <div className="p-4">
              <svg viewBox="0 0 700 420" className="w-full" style={{minHeight:280}}>
                <defs>
                  <marker id="arr" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                    <path d="M0,0 L0,8 L8,4 z" fill="#94a3b8"/>
                  </marker>
                  <marker id="arr-orange" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                    <path d="M0,0 L0,8 L8,4 z" fill="#f97316"/>
                  </marker>
                </defs>
                {field.edges.map((e,i)=>{
                  const from=field.nodes.find(n=>n.id===e.from)!;
                  const to=field.nodes.find(n=>n.id===e.to)!;
                  const mx=(from.x+120+to.x)/2;
                  const my=(from.y+to.y)/2+18;
                  return (
                    <g key={i}>
                      <path
                        d={"M"+(from.x+120)+","+(from.y+20)+" C"+mx+","+(from.y+20)+" "+mx+","+(to.y+20)+" "+to.x+","+(to.y+20)}
                        fill="none"
                        stroke={to.type==="transform"?"#f97316":"#94a3b8"}
                        strokeWidth="1.5"
                        markerEnd={to.type==="transform"?"url(#arr-orange)":"url(#arr)"}/>
                      {e.transform&&<text x={mx} y={my-6} fontSize="8" fill="#94a3b8" textAnchor="middle">{e.transform}</text>}
                    </g>
                  );
                })}
                {field.nodes.map(n=>{
                  const nc=NODE_COLORS[n.type];
                  const isSel=selectedNode===n.id;
                  return (
                    <g key={n.id} style={{cursor:"pointer"}} onClick={()=>setSelectedNode(selectedNode===n.id?null:n.id)}>
                      <rect x={n.x} y={n.y} width={120} height={40} rx={6}
                        fill={nc.fill} stroke={isSel?"#3b82f6":nc.stroke} strokeWidth={isSel?2.5:1.5}/>
                      {n.quality!==undefined&&(
                        <rect x={n.x} y={n.y+36} width={(n.quality/100)*120} height={4} rx={2}
                          fill={n.quality>=90?"#22c55e":n.quality>=70?"#f59e0b":"#ef4444"}/>
                      )}
                      <text x={n.x+60} y={n.y+14} fontSize="9" fontWeight="700" fill="#1e293b" textAnchor="middle">{n.label.slice(0,14)}</text>
                      <text x={n.x+60} y={n.y+26} fontSize="8" fill="#64748b" textAnchor="middle">{n.sub.slice(0,18)}</text>
                      <rect x={n.x+2} y={n.y+2} width={28} height={11} rx={3} fill={nc.stroke+"33"}/>
                      <text x={n.x+16} y={n.y+10} fontSize="7" fill={nc.textColor} textAnchor="middle" fontWeight="600">{nc.label}</text>
                    </g>
                  );
                })}
                <text x="350" y="400" fontSize="9" fill="#cbd5e1" textAnchor="middle">소스 → 변환 → 목적지 (좌→우)</text>
              </svg>
            </div>
          </div>

          {/* 변경 이력 + 피드 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400"/>변경 이력
              </div>
              <div className="space-y-2">
                {field.history.map((h,i)=>(
                  <div key={i} className="flex gap-2 text-xs">
                    <div className={"w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 "+(i===0?"bg-blue-500":"bg-slate-300")}/>
                    <div>
                      <div className="font-semibold text-slate-700">{h.event}</div>
                      <div className="text-slate-400">{h.ts} · {h.actor}</div>
                      <div className="text-slate-500">{h.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 실시간 피드 */}
            <div className="bg-slate-900 rounded-xl overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400"/>
                <span className="text-xs text-slate-300 font-medium">계보 추적 피드</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-auto"/>
              </div>
              <div className="divide-y divide-slate-800 max-h-40 overflow-y-auto">
                {feed.length===0&&<div className="px-4 py-2 text-xs text-slate-500">대기 중...</div>}
                {feed.map((f,i)=>(
                  <div key={i} className="px-4 py-2">
                    <div className="text-[10px] text-slate-500 font-mono">{f.ts}</div>
                    <div className="text-xs text-slate-300 mt-0.5">{f.msg}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selNode&&(
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={()=>setSelectedNode(null)}/>
          <NodeSlidePanel node={selNode} onClose={()=>setSelectedNode(null)}/>
        </>
      )}
    </div>
  );
}
