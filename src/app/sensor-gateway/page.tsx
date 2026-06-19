"use client";

import { useState, useEffect, useRef } from "react";
import {
  Activity, Wifi, WifiOff, AlertTriangle, CheckCircle2, RefreshCw,
  ChevronDown, ChevronRight, Cpu, Zap, Thermometer, Gauge, Eye,
  Radio, BarChart2, Clock, Server, GitBranch, Bell, Wrench,
  TrendingUp, TrendingDown, Minus, Wind as WindIcon, Droplets,
} from "lucide-react";

// ── Environment 도메인 — 온습도·작업환경 ─────────────────────────────
interface EnvZone {
  id: string; name: string; area: string;
  temp: number; humidity: number; co2: number; dust: number;
  tempTarget: [number, number]; humTarget: [number, number];
  status: "ok" | "warn" | "alert";
}

const INIT_ENV_ZONES: EnvZone[] = [
  { id:"Z1", name:"가공1라인", area:"1동", temp:22.4, humidity:48, co2:820, dust:35, tempTarget:[20,26], humTarget:[40,60], status:"ok" },
  { id:"Z2", name:"용접라인", area:"1동", temp:28.9, humidity:62, co2:1240, dust:88, tempTarget:[18,28], humTarget:[30,65], status:"warn" },
  { id:"Z3", name:"열처리동", area:"2동", temp:34.2, humidity:31, co2:980, dust:52, tempTarget:[20,35], humTarget:[30,70], status:"warn" },
  { id:"Z4", name:"조립라인", area:"2동", temp:23.1, humidity:52, co2:710, dust:28, tempTarget:[20,26], humTarget:[40,60], status:"ok" },
  { id:"Z5", name:"도금라인", area:"3동", temp:26.8, humidity:74, co2:1580, dust:41, tempTarget:[20,30], humTarget:[40,70], status:"alert" },
  { id:"Z6", name:"창고", area:"3동", temp:19.2, humidity:55, co2:620, dust:18, tempTarget:[15,25], humTarget:[40,65], status:"ok" },
];

function EnvironmentSection() {
  const [zones, setZones] = useState<EnvZone[]>(INIT_ENV_ZONES);

  useEffect(()=>{
    const id = setInterval(()=>{
      setZones(prev=>prev.map(z=>({
        ...z,
        temp: +(z.temp+(Math.random()-.48)*.3).toFixed(1),
        humidity: Math.round(Math.max(20,Math.min(95,z.humidity+(Math.random()-.5)*2))),
        co2: Math.round(Math.max(400,z.co2+(Math.random()-.5)*40)),
      })));
    },1200);
    return ()=>clearInterval(id);
  },[]);

  const statusColor = { ok:"bg-emerald-100 text-emerald-700", warn:"bg-amber-100 text-amber-700", alert:"bg-rose-100 text-rose-700" };
  const statusLabel = { ok:"정상", warn:"주의", alert:"경보" };

  return (
    <div className="mt-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
        <WindIcon className="w-4 h-4 text-teal-500"/>
        <span className="text-xs font-bold text-slate-700">Environment 도메인 — 구역별 온·습도·공기질</span>
        <span className="ml-auto text-[10px] text-teal-600 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">실시간</span>
      </div>
      <div className="grid grid-cols-3 gap-0 divide-x divide-y divide-slate-100">
        {zones.map(z=>{
          const tempOk = z.temp>=z.tempTarget[0] && z.temp<=z.tempTarget[1];
          const humOk  = z.humidity>=z.humTarget[0] && z.humidity<=z.humTarget[1];
          return (
            <div key={z.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-semibold text-slate-800">{z.name}</div>
                  <div className="text-xs text-slate-400">{z.area}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColor[z.status]}`}>{statusLabel[z.status]}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className={`rounded-lg p-2 ${tempOk?"bg-slate-50":"bg-rose-50"}`}>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
                    <Thermometer className="w-3 h-3"/>온도
                  </div>
                  <div className={`text-base font-bold ${tempOk?"text-slate-800":"text-rose-600"}`}>{z.temp}°C</div>
                  <div className="text-[10px] text-slate-400">목표 {z.tempTarget[0]}~{z.tempTarget[1]}°C</div>
                </div>
                <div className={`rounded-lg p-2 ${humOk?"bg-slate-50":"bg-amber-50"}`}>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
                    <Droplets className="w-3 h-3"/>습도
                  </div>
                  <div className={`text-base font-bold ${humOk?"text-slate-800":"text-amber-600"}`}>{z.humidity}%</div>
                  <div className="text-[10px] text-slate-400">목표 {z.humTarget[0]}~{z.humTarget[1]}%</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <div className="text-[10px] text-slate-400 mb-0.5">CO₂ (ppm)</div>
                  <div className={`text-sm font-bold ${z.co2>1200?"text-rose-600":z.co2>1000?"text-amber-600":"text-slate-700"}`}>{z.co2}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <div className="text-[10px] text-slate-400 mb-0.5">미세먼지 (μg/m³)</div>
                  <div className={`text-sm font-bold ${z.dust>75?"text-rose-600":z.dust>50?"text-amber-600":"text-slate-700"}`}>{z.dust}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type ProtocolId = "opcua" | "modbus" | "s7" | "eip" | "mc" | "fins" | "ads";
type ConnStatus  = "online" | "error" | "offline" | "polling";
type SensorType  = "vibration" | "temperature" | "pressure" | "power" | "vision" | "position" | "gas";
type Quality     = "GOOD" | "UNCERTAIN" | "BAD";
type AlarmSeverity = "CRITICAL" | "WARNING" | "INFO";

interface Tag {
  id: string;
  name: string;
  value: number | string;
  unit: string;
  quality: Quality;
  ts: string;
  sensorType: SensorType;
  nodeId?: string;
  limitHi?: number;  // 상한 임계값
  limitLo?: number;  // 하한 임계값
  history: number[]; // 최대 30포인트 버퍼
}

interface Device {
  id: string;
  name: string;
  protocol: ProtocolId;
  host: string;
  port: number;
  status: ConnStatus;
  model: string;
  tags: Tag[];
  scanRate: number;
  lastScan: string;
  // 진단 데이터
  uptimePct: number;
  avgRespMs: number;
  reconnectCount: number;
  packetLoss: number;
  // 프로토콜 파라미터
  protoParams: Record<string, string>;
}

interface AlarmEvent {
  id: string;
  ts: string;
  deviceName: string;
  tagName: string;
  severity: AlarmSeverity;
  message: string;
  ack: boolean;
}

interface NodeRedFlow {
  id: string;
  name: string;
  status: "running" | "stopped" | "error";
  nodes: number;
  msgsPerSec: number;
  errCount: number;
  desc: string;
}

// ─── 상수 ────────────────────────────────────────────────────────────
const PROTO_META: Record<ProtocolId, { label: string; color: string; bg: string; badge: string }> = {
  opcua:  { label: "OPC-UA",       color: "text-blue-700",   bg: "bg-blue-50",   badge: "bg-blue-600" },
  modbus: { label: "Modbus TCP",   color: "text-amber-700",  bg: "bg-amber-50",  badge: "bg-amber-500" },
  s7:     { label: "S7comm",       color: "text-red-700",    bg: "bg-red-50",    badge: "bg-red-600" },
  eip:    { label: "EtherNet/IP",  color: "text-orange-700", bg: "bg-orange-50", badge: "bg-orange-500" },
  mc:     { label: "MC Protocol",  color: "text-purple-700", bg: "bg-purple-50", badge: "bg-purple-600" },
  fins:   { label: "FINS/TCP",     color: "text-teal-700",   bg: "bg-teal-50",   badge: "bg-teal-600" },
  ads:    { label: "ADS/AMS",      color: "text-indigo-700", bg: "bg-indigo-50", badge: "bg-indigo-600" },
};

const QUALITY_CFG: Record<Quality, { color: string; dot: string }> = {
  GOOD:      { color: "text-emerald-600", dot: "bg-emerald-500" },
  UNCERTAIN: { color: "text-amber-600",   dot: "bg-amber-400" },
  BAD:       { color: "text-rose-600",    dot: "bg-rose-500" },
};

const ALARM_CFG: Record<AlarmSeverity, { bg: string; text: string; border: string; dot: string; label: string }> = {
  CRITICAL: { bg: "bg-rose-50",   text: "text-rose-700",   border: "border-rose-200",   dot: "bg-rose-500",   label: "긴급" },
  WARNING:  { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  dot: "bg-amber-400",  label: "경고" },
  INFO:     { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   dot: "bg-blue-400",   label: "정보" },
};

function Wind({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
    </svg>
  );
}

const SENSOR_ICON: Record<SensorType, React.ReactNode> = {
  vibration:   <Activity className="w-3.5 h-3.5" />,
  temperature: <Thermometer className="w-3.5 h-3.5" />,
  pressure:    <Gauge className="w-3.5 h-3.5" />,
  power:       <Zap className="w-3.5 h-3.5" />,
  vision:      <Eye className="w-3.5 h-3.5" />,
  position:    <Radio className="w-3.5 h-3.5" />,
  gas:         <Wind className="w-3.5 h-3.5" />,
};

// 히스토리 초기값 생성
function initHistory(base: number, count = 20): number[] {
  return Array.from({ length: count }, () => base * (1 + (Math.random() - 0.5) * 0.04));
}

const INIT_DEVICES: Device[] = [
  {
    id: "d1", name: "CNC-01 (Siemens S7-1500)", protocol: "s7",
    host: "192.168.10.101", port: 102, status: "online",
    model: "Siemens S7-1516-3 PN/DP", scanRate: 500, lastScan: "09:14:32.441",
    uptimePct: 99.2, avgRespMs: 4.8, reconnectCount: 1, packetLoss: 0.0,
    protoParams: { "Rack": "0", "Slot": "1", "PDU Size": "480 bytes", "DB 접근": "최적화 블록", "연결 타입": "PG" },
    tags: [
      { id:"t1",  name:"Spindle.Speed",   value:2850,   unit:"RPM",  quality:"GOOD",      ts:"09:14:32", sensorType:"vibration",   nodeId:"DB100.DBW0",      limitHi:4000, limitLo:0,    history:initHistory(2850) },
      { id:"t2",  name:"Spindle.Load",    value:42.3,   unit:"%",    quality:"GOOD",      ts:"09:14:32", sensorType:"power",       nodeId:"DB100.DBD8",      limitHi:90,   limitLo:0,    history:initHistory(42.3) },
      { id:"t3",  name:"Feed.Rate",       value:800,    unit:"mm/m", quality:"GOOD",      ts:"09:14:32", sensorType:"position",    nodeId:"DB100.DBW2",      limitHi:3000, limitLo:0,    history:initHistory(800) },
      { id:"t4",  name:"Spindle.Temp",    value:68.4,   unit:"°C",   quality:"GOOD",      ts:"09:14:32", sensorType:"temperature", nodeId:"DB100.REAL16",    limitHi:80,   limitLo:0,    history:initHistory(68.4) },
      { id:"t5",  name:"Coolant.Pressure",value:3.21,   unit:"bar",  quality:"UNCERTAIN", ts:"09:14:31", sensorType:"pressure",    nodeId:"DB101.REAL0",     limitHi:6,    limitLo:1,    history:initHistory(3.21) },
    ],
  },
  {
    id: "d2", name: "PRESS-01 (Allen-Bradley)", protocol: "eip",
    host: "192.168.10.102", port: 44818, status: "online",
    model: "AB ControlLogix 5580", scanRate: 200, lastScan: "09:14:32.397",
    uptimePct: 99.8, avgRespMs: 2.1, reconnectCount: 0, packetLoss: 0.0,
    protoParams: { "CIP 경로": "1,0", "세션 타임아웃": "30s", "패킷 크기": "4002 bytes", "슬롯": "0", "Major Rev": "33" },
    tags: [
      { id:"t6",  name:"Press.Force",     value:12450,  unit:"kN",   quality:"GOOD",      ts:"09:14:32", sensorType:"pressure",    nodeId:"Press_Force_kN",  limitHi:15000,limitLo:0,    history:initHistory(12450) },
      { id:"t7",  name:"Ram.Position",    value:245.8,  unit:"mm",   quality:"GOOD",      ts:"09:14:32", sensorType:"position",    nodeId:"Ram_Pos_mm",       limitHi:400,  limitLo:0,    history:initHistory(245.8) },
      { id:"t8",  name:"Cycle.Count",     value:184291, unit:"ea",   quality:"GOOD",      ts:"09:14:32", sensorType:"position",    nodeId:"Cycle_Counter",   limitHi:undefined,limitLo:undefined, history:initHistory(184291) },
      { id:"t9",  name:"Servo.Temp",      value:71.2,   unit:"°C",   quality:"GOOD",      ts:"09:14:32", sensorType:"temperature", nodeId:"Servo1_Temp",     limitHi:85,   limitLo:0,    history:initHistory(71.2) },
    ],
  },
  {
    id: "d3", name: "Compressor (Modbus TCP)", protocol: "modbus",
    host: "192.168.10.110", port: 502, status: "online",
    model: "Atlas Copco GA55 (Modbus 어댑터)", scanRate: 1000, lastScan: "09:14:32.011",
    uptimePct: 97.4, avgRespMs: 12.8, reconnectCount: 5, packetLoss: 0.3,
    protoParams: { "Unit ID": "1", "Function Code": "FC03 (Read Holding Regs)", "레지스터 시작": "40001", "수량": "10 words", "바이트 순서": "Big-Endian" },
    tags: [
      { id:"t10", name:"Outlet.Pressure",  value:7.82,  unit:"bar",  quality:"GOOD",      ts:"09:14:32", sensorType:"pressure",    nodeId:"40001~40002",     limitHi:10,   limitLo:5,    history:initHistory(7.82) },
      { id:"t11", name:"Inlet.Temp",       value:24.1,  unit:"°C",   quality:"GOOD",      ts:"09:14:32", sensorType:"temperature", nodeId:"40003",           limitHi:50,   limitLo:0,    history:initHistory(24.1) },
      { id:"t12", name:"Motor.Current",    value:38.6,  unit:"A",    quality:"GOOD",      ts:"09:14:32", sensorType:"power",       nodeId:"40005",           limitHi:55,   limitLo:0,    history:initHistory(38.6) },
      { id:"t13", name:"Run.Hours",        value:8821,  unit:"h",    quality:"GOOD",      ts:"09:14:31", sensorType:"position",    nodeId:"40007~40008",     limitHi:undefined,limitLo:undefined, history:initHistory(8821) },
    ],
  },
  {
    id: "d4", name: "Robot-01 (Mitsubishi iQ-R)", protocol: "mc",
    host: "192.168.10.120", port: 5007, status: "error",
    model: "Mitsubishi RV-7FRL (iQ-R 제어기)", scanRate: 500, lastScan: "09:13:58.201",
    uptimePct: 81.3, avgRespMs: 0, reconnectCount: 28, packetLoss: 100,
    protoParams: { "서브헤더": "0x5000 (SLMP 3E)", "네트워크 번호": "0", "PC 번호": "255", "요청 데이터 길이": "가변", "재시도": "3회 / 2s" },
    tags: [
      { id:"t14", name:"J1.Angle",         value:"N/A", unit:"deg",  quality:"BAD",       ts:"09:13:58", sensorType:"position",    nodeId:"D100",            limitHi:undefined,limitLo:undefined, history:[] },
      { id:"t15", name:"J2.Angle",         value:"N/A", unit:"deg",  quality:"BAD",       ts:"09:13:58", sensorType:"position",    nodeId:"D102",            limitHi:undefined,limitLo:undefined, history:[] },
      { id:"t16", name:"Program.Running",  value:"N/A", unit:"",     quality:"BAD",       ts:"09:13:58", sensorType:"vision",      nodeId:"M100",            limitHi:undefined,limitLo:undefined, history:[] },
    ],
  },
  {
    id: "d5", name: "Power Meter (OPC-UA)", protocol: "opcua",
    host: "192.168.10.130", port: 4840, status: "online",
    model: "Schneider PM8000 (내장 OPC-UA)", scanRate: 1000, lastScan: "09:14:32.550",
    uptimePct: 99.9, avgRespMs: 6.2, reconnectCount: 0, packetLoss: 0.0,
    protoParams: { "보안 정책": "None (개발용)", "인증 토큰": "Anonymous", "네임스페이스": "ns=2", "구독 간격": "500ms", "Publish 간격": "1000ms" },
    tags: [
      { id:"t17", name:"Active.Power",     value:184.2, unit:"kW",   quality:"GOOD",      ts:"09:14:32", sensorType:"power",       nodeId:"ns=2;s=PM8000.MMXU1.TotW.mag.f",         limitHi:250, limitLo:0,   history:initHistory(184.2) },
      { id:"t18", name:"Power.Factor",     value:0.94,  unit:"",     quality:"GOOD",      ts:"09:14:32", sensorType:"power",       nodeId:"ns=2;s=PM8000.MMXU1.TotPF.mag.f",        limitHi:1,   limitLo:0.8, history:initHistory(0.94) },
      { id:"t19", name:"THD.Current",      value:4.8,   unit:"%",    quality:"GOOD",      ts:"09:14:32", sensorType:"power",       nodeId:"ns=2;s=PM8000.MMXU1.ThdAv.mag.f",        limitHi:10,  limitLo:0,   history:initHistory(4.8) },
      { id:"t20", name:"L1.Voltage",       value:220.3, unit:"V",    quality:"GOOD",      ts:"09:14:32", sensorType:"power",       nodeId:"ns=2;s=PM8000.MMXU1.PhV.phsA.cVal.mag.f",limitHi:240, limitLo:200, history:initHistory(220.3) },
    ],
  },
  {
    id: "d6", name: "Vision QC (Modbus)", protocol: "modbus",
    host: "192.168.10.140", port: 502, status: "online",
    model: "Cognex In-Sight 9000 Series", scanRate: 200, lastScan: "09:14:32.298",
    uptimePct: 99.5, avgRespMs: 3.4, reconnectCount: 2, packetLoss: 0.0,
    protoParams: { "Unit ID": "1", "Function Code": "FC03", "레지스터 시작": "40001", "수량": "8 words", "타임아웃": "500ms" },
    tags: [
      { id:"t21", name:"Inspection.Result",value:1,     unit:"OK/NG",quality:"GOOD",      ts:"09:14:32", sensorType:"vision",      nodeId:"40001",           limitHi:undefined,limitLo:undefined, history:initHistory(1) },
      { id:"t22", name:"Defect.Code",      value:0,     unit:"",     quality:"GOOD",      ts:"09:14:32", sensorType:"vision",      nodeId:"40002",           limitHi:undefined,limitLo:undefined, history:initHistory(0) },
      { id:"t23", name:"Inspect.Time",     value:48,    unit:"ms",   quality:"GOOD",      ts:"09:14:32", sensorType:"vision",      nodeId:"40004",           limitHi:200,  limitLo:0,    history:initHistory(48) },
      { id:"t24", name:"NG.Count.Today",   value:3,     unit:"ea",   quality:"GOOD",      ts:"09:14:32", sensorType:"vision",      nodeId:"40005",           limitHi:10,   limitLo:undefined, history:initHistory(3) },
    ],
  },
];

const INIT_ALARMS: AlarmEvent[] = [
  { id:"a1", ts:"09:13:58", deviceName:"Robot-01",       tagName:"J1.Angle",        severity:"CRITICAL", message:"TCP 연결 끊김 — MC Protocol 타임아웃 (28회 재시도)", ack:false },
  { id:"a2", ts:"09:14:01", deviceName:"Robot-01",       tagName:"J2.Angle",        severity:"CRITICAL", message:"데이터 품질 BAD — 마지막 정상 수신 09:13:58", ack:false },
  { id:"a3", ts:"09:14:12", deviceName:"Compressor",     tagName:"Outlet.Pressure", severity:"WARNING",  message:"Modbus 응답 지연 12.8ms — 평균 대비 3× 초과", ack:false },
  { id:"a4", ts:"09:12:44", deviceName:"CNC-01",         tagName:"Coolant.Pressure",severity:"WARNING",  message:"품질 UNCERTAIN — 센서 불안정 감지됨", ack:true },
  { id:"a5", ts:"09:10:30", deviceName:"Compressor",     tagName:"Motor.Current",   severity:"INFO",     message:"재연결 감지 (5회 누적) — 네트워크 스위치 점검 권고", ack:true },
  { id:"a6", ts:"09:08:15", deviceName:"Vision QC",      tagName:"NG.Count.Today",  severity:"INFO",     message:"오늘 NG 발생 3건 — 전일 대비 +1건", ack:true },
];

const NODERED_FLOWS: NodeRedFlow[] = [
  { id:"f1", name:"S7 → Kafka Bridge",          status:"running", nodes:8,  msgsPerSec:12.4, errCount:0,  desc:"CNC-01 DB100 폴링 → 정규화 → Kafka raw.sensor.cnc01" },
  { id:"f2", name:"Modbus Multi-Poll",           status:"running", nodes:12, msgsPerSec:8.7,  errCount:3,  desc:"컴프레서·비전 Modbus 일괄 폴링 → Dead-band → MQTT" },
  { id:"f3", name:"EIP ControlLogix Subscriber", status:"running", nodes:6,  msgsPerSec:22.1, errCount:0,  desc:"PRESS-01 TagList 구독 → Kafka" },
  { id:"f4", name:"OPC-UA Subscription",         status:"running", nodes:5,  msgsPerSec:4.0,  errCount:0,  desc:"PM8000 OPC-UA 구독 (500ms) → Kafka raw.sensor.power" },
  { id:"f5", name:"MC Protocol Robot",           status:"error",   nodes:7,  msgsPerSec:0,    errCount:284,desc:"Robot-01 SLMP 읽기 — 연결 끊김 (TCP timeout)" },
  { id:"f6", name:"Alarm Escalation",            status:"running", nodes:10, msgsPerSec:0.3,  errCount:0,  desc:"고심각도 OPC-UA 이벤트 → Slack #factory-alerts" },
];

const KAFKA_TOPICS = [
  { topic:"raw.sensor.factory_a.cnc01",   msgs:744210,  rate:12, lag:0 },
  { topic:"raw.sensor.factory_a.press01", msgs:1102843, rate:22, lag:0 },
  { topic:"raw.sensor.factory_a.power",   msgs:288541,  rate:4,  lag:0 },
  { topic:"raw.sensor.factory_a.modbus",  msgs:521900,  rate:9,  lag:2 },
  { topic:"raw.vision.defect",            msgs:3,        rate:0,  lag:0 },
];

// ─── Sparkline SVG ─────────────────────────────────────────────────
function Sparkline({
  history, limitHi, limitLo, width = 80, height = 28,
}: { history: number[]; limitHi?: number; limitLo?: number; width?: number; height?: number }) {
  if (history.length < 2) return <span className="text-xs text-slate-200">—</span>;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;
  const toX = (i: number) => (i / (history.length - 1)) * width;
  const toY = (v: number) => height - ((v - min) / range) * (height - 4) - 2;
  const pts = history.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const last = history[history.length - 1];
  const prev = history[history.length - 2];
  const trending = last > prev * 1.002 ? "up" : last < prev * 0.998 ? "down" : "flat";
  const color = trending === "up" ? "#10b981" : trending === "down" ? "#ef4444" : "#94a3b8";

  // limitHi / limitLo 라인 Y 좌표
  const hiY = limitHi !== undefined ? toY(Math.min(limitHi, max + range * 0.2)) : null;
  const loY = limitLo !== undefined ? toY(Math.max(limitLo, min - range * 0.2)) : null;

  return (
    <div className="flex items-center gap-1.5">
      <svg width={width} height={height} className="overflow-visible">
        {hiY !== null && hiY > 0 && hiY < height && (
          <line x1={0} y1={hiY} x2={width} y2={hiY} stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.7" />
        )}
        {loY !== null && loY > 0 && loY < height && (
          <line x1={0} y1={loY} x2={width} y2={loY} stroke="#3b82f6" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.7" />
        )}
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={toX(history.length - 1)} cy={toY(last)} r="2.5" fill={color} />
      </svg>
      <span className="w-3">
        {trending === "up"   && <TrendingUp className="w-3 h-3 text-emerald-500" />}
        {trending === "down" && <TrendingDown className="w-3 h-3 text-rose-500" />}
        {trending === "flat" && <Minus className="w-3 h-3 text-slate-300" />}
      </span>
    </div>
  );
}

// ─── 응답시간 바 ─────────────────────────────────────────────────────
function RespBar({ ms, maxMs = 30 }: { ms: number; maxMs?: number }) {
  const pct = Math.min((ms / maxMs) * 100, 100);
  const color = ms > 20 ? "bg-rose-400" : ms > 10 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-600 w-14">{ms > 0 ? `${ms} ms` : "—"}</span>
    </div>
  );
}

// ─── msg/s 바 ────────────────────────────────────────────────────────
function MsgBar({ rate, maxRate = 25 }: { rate: number; maxRate?: number }) {
  const pct = Math.min((rate / maxRate) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-blue-400" style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-sm font-bold ${rate > 0 ? "text-blue-600" : "text-slate-300"}`}>{rate}</span>
    </div>
  );
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────
export default function SensorGateway() {
  const [selectedDevice, setSelectedDevice] = useState<string>("d1");
  const [expandedProto, setExpandedProto] = useState<Set<ProtocolId>>(new Set(["s7", "opcua", "eip", "modbus"]));
  const [devices, setDevices] = useState<Device[]>(INIT_DEVICES);
  const [alarms, setAlarms] = useState<AlarmEvent[]>(INIT_ALARMS);
  const [activeTab, setActiveTab] = useState<"tags" | "nodered" | "kafka" | "alarm" | "diag">("tags");
  const [alarmFilter, setAlarmFilter] = useState<"ALL" | AlarmSeverity>("ALL");

  // 히스토리 버퍼 ref (최대 30포인트)
  const historyRef = useRef<Record<string, number[]>>(
    Object.fromEntries(INIT_DEVICES.flatMap(d => d.tags.map(t => [t.id, [...t.history]])))
  );

  // 실시간 값 시뮬레이션
  useEffect(() => {
    const id = setInterval(() => {
      setDevices(prev => prev.map(dev => ({
        ...dev,
        avgRespMs: dev.status === "error" ? 0 : parseFloat((dev.avgRespMs * (1 + (Math.random() - 0.5) * 0.06)).toFixed(1)),
        tags: dev.tags.map(tag => {
          if (tag.quality === "BAD" || typeof tag.value !== "number") return tag;
          const base = tag.value as number;
          const jitter = (Math.random() - 0.5) * base * 0.012;
          const newVal = parseFloat((base + jitter).toFixed(2));
          // 히스토리 업데이트
          const buf = historyRef.current[tag.id] ?? [];
          buf.push(newVal);
          if (buf.length > 30) buf.shift();
          historyRef.current[tag.id] = buf;
          return { ...tag, value: newVal, history: [...buf], ts: new Date().toTimeString().slice(0, 8) };
        }),
      })));
    }, 1200);
    return () => clearInterval(id);
  }, []);

  const device = devices.find(d => d.id === selectedDevice)!;
  const groupedByProto = (Object.keys(PROTO_META) as ProtocolId[])
    .map(proto => ({ proto, devs: devices.filter(d => d.protocol === proto) }))
    .filter(g => g.devs.length > 0);

  const totalOnline   = devices.filter(d => d.status === "online").length;
  const totalError    = devices.filter(d => d.status === "error").length;
  const totalTags     = devices.reduce((s, d) => s + d.tags.length, 0);
  const totalGoodTags = devices.reduce((s, d) => s + d.tags.filter(t => t.quality === "GOOD").length, 0);
  const unackedAlarms = alarms.filter(a => !a.ack).length;

  const toggleProto = (p: ProtocolId) =>
    setExpandedProto(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; });

  const filteredAlarms = alarmFilter === "ALL" ? alarms : alarms.filter(a => a.severity === alarmFilter);

  return (
    <div className="p-6 space-y-5">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sensor Gateway</h1>
          <p className="text-slate-500 mt-1 text-sm">설비·PLC·센서 프로토콜 통합 모니터링 — OPC-UA · Modbus · S7 · EtherNet/IP · MC</p>
        </div>
        <div className="flex items-center gap-3">
          {unackedAlarms > 0 && (
            <button onClick={() => setActiveTab("alarm")}
              className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 animate-pulse">
              <Bell className="w-3.5 h-3.5" />
              미확인 알람 {unackedAlarms}건
            </button>
          )}
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            실시간 폴링 중
          </div>
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label:"연결 장치",    value:`${totalOnline} / ${devices.length}`, color:"text-slate-800",   icon:<Server className="w-4 h-4" /> },
          { label:"연결 오류",    value:`${totalError}개`,                    color:"text-rose-600",    icon:<WifiOff className="w-4 h-4" /> },
          { label:"수집 태그",    value:`${totalTags}개`,                     color:"text-slate-800",   icon:<BarChart2 className="w-4 h-4" /> },
          { label:"태그 품질",    value:`${Math.round(totalGoodTags/totalTags*100)}%`, color:"text-emerald-600", icon:<CheckCircle2 className="w-4 h-4" /> },
          { label:"미확인 알람",  value:`${unackedAlarms}건`,                 color:unackedAlarms > 0 ? "text-rose-600" : "text-slate-400", icon:<Bell className="w-4 h-4" /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">{label}</span>
              <div className={`${color} opacity-60`}>{icon}</div>
            </div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        {/* 좌측 장치 트리 */}
        <div className="w-72 shrink-0 space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 mb-2">장치 트리</div>
          {groupedByProto.map(({ proto, devs }) => {
            const pm = PROTO_META[proto];
            const isExpanded = expandedProto.has(proto);
            return (
              <div key={proto}>
                <button onClick={() => toggleProto(proto)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                  {isExpanded
                    ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${pm.badge}`}>{pm.label}</span>
                  <span className="text-xs text-slate-400">{devs.length}대</span>
                </button>
                {isExpanded && devs.map(dev => (
                  <button key={dev.id} onClick={() => setSelectedDevice(dev.id)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg transition-all ml-2 ${
                      selectedDevice === dev.id
                        ? "bg-blue-50 border border-blue-200 text-blue-700"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      dev.status === "online" ? "bg-emerald-500" :
                      dev.status === "error"  ? "bg-rose-500 animate-pulse" : "bg-slate-300"
                    }`} />
                    <div className="text-left min-w-0">
                      <div className="text-xs font-semibold truncate">{dev.name}</div>
                      <div className="text-xs text-slate-400">{dev.host}:{dev.port}</div>
                    </div>
                    {alarms.filter(a => !a.ack && a.deviceName.includes(dev.name.split(" ")[0])).length > 0 && (
                      <span className="ml-auto text-xs bg-rose-500 text-white w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                        {alarms.filter(a => !a.ack && a.deviceName.includes(dev.name.split(" ")[0])).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        {/* 우측 상세 패널 */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* 장치 헤더 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full shrink-0 ${
                  device.status === "online" ? "bg-emerald-500" :
                  device.status === "error"  ? "bg-rose-500 animate-pulse" : "bg-slate-300"
                }`} />
                <div>
                  <div className="font-semibold text-slate-900">{device.name}</div>
                  <div className="text-xs text-slate-500">{device.model}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <div className="text-xs text-slate-500">프로토콜</div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${PROTO_META[device.protocol].badge}`}>
                    {PROTO_META[device.protocol].label}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-slate-500">스캔 레이트</div>
                  <div className="text-sm font-bold text-slate-700">{device.scanRate} ms</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 justify-end"><Clock className="w-3 h-3" />마지막 스캔</div>
                  <div className="text-sm font-mono text-slate-700">{device.lastScan}</div>
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg ${
                  device.status === "online" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                  device.status === "error"  ? "bg-rose-50 text-rose-700 border border-rose-200" :
                  "bg-slate-50 text-slate-500 border border-slate-200"
                }`}>
                  {device.status === "online" ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                  {device.status === "online" ? "연결됨" : device.status === "error" ? "연결 오류" : "오프라인"}
                </div>
              </div>
            </div>
          </div>

          {/* 탭 */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
            {([
              ["tags",    "태그 데이터"],
              ["nodered", "Node-RED"],
              ["kafka",   "Kafka 토픽"],
              ["alarm",   `알람${unackedAlarms > 0 ? ` (${unackedAlarms})` : ""}`],
              ["diag",    "장치 진단"],
            ] as const).map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`text-xs px-4 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === id
                    ? "bg-white text-slate-900 shadow-sm"
                    : id === "alarm" && unackedAlarms > 0
                    ? "text-rose-600 hover:text-rose-700"
                    : "text-slate-500 hover:text-slate-700"
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* ── TAB 1: 태그 데이터 + Sparkline ── */}
          {activeTab === "tags" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">실시간 태그 값 ({device.tags.length}개)</h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-4 border-t border-dashed border-amber-400 inline-block" /> 상한</span>
                    <span className="flex items-center gap-1"><span className="w-4 border-t border-dashed border-blue-400 inline-block" /> 하한</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {device.status === "online" ? "라이브" : "중단됨"}
                  </div>
                </div>
              </div>
              {device.status === "error" ? (
                <div className="flex items-center gap-3 m-4 p-4 bg-rose-50 border border-rose-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-rose-700">TCP 연결 타임아웃</div>
                    <div className="text-xs text-rose-600 mt-0.5">{device.host}:{device.port} — 마지막 응답: {device.lastScan}. Node-RED 플로우 재시작 또는 PLC 네트워크를 확인하세요.</div>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {["유형","태그 이름","현재값","단위","트렌드","품질","NodeId / 주소","타임스탬프"].map(h => (
                          <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {device.tags.map(tag => {
                        const qc = QUALITY_CFG[tag.quality];
                        const isAlarm = typeof tag.value === "number" && tag.limitHi !== undefined && tag.value > tag.limitHi;
                        return (
                          <tr key={tag.id} className={`hover:bg-slate-50 ${isAlarm ? "bg-rose-50/40" : ""}`}>
                            <td className="px-3 py-3">
                              <div className={`flex items-center gap-1 text-xs font-medium ${
                                tag.sensorType === "temperature" ? "text-orange-600" :
                                tag.sensorType === "pressure"   ? "text-blue-600" :
                                tag.sensorType === "power"      ? "text-yellow-600" :
                                tag.sensorType === "vision"     ? "text-purple-600" :
                                tag.sensorType === "position"   ? "text-teal-600" :
                                "text-slate-600"
                              }`}>{SENSOR_ICON[tag.sensorType]}</div>
                            </td>
                            <td className="px-3 py-3">
                              <span className="text-xs font-semibold font-mono text-slate-800">{tag.name}</span>
                            </td>
                            <td className="px-3 py-3">
                              <span className={`text-sm font-bold tabular-nums ${
                                isAlarm ? "text-rose-600" : tag.quality === "GOOD" ? "text-slate-900" : "text-rose-500"
                              }`}>
                                {typeof tag.value === "number" ? tag.value.toLocaleString() : tag.value}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-xs text-slate-500">{tag.unit}</td>
                            <td className="px-3 py-3">
                              <Sparkline history={tag.history} limitHi={tag.limitHi} limitLo={tag.limitLo} />
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${qc.dot}`} />
                                <span className={`text-xs font-medium ${qc.color}`}>{tag.quality}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <span className="text-xs font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded truncate max-w-[160px] block">{tag.nodeId}</span>
                            </td>
                            <td className="px-3 py-3 text-xs font-mono text-slate-400">{tag.ts}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: Node-RED ── */}
          {activeTab === "nodered" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Node-RED 플로우 현황</h3>
                <p className="text-xs text-slate-400 mt-0.5">포트 1880 · Docker 컨테이너: nodered-line01</p>
              </div>
              <div className="divide-y divide-slate-50">
                {NODERED_FLOWS.map(flow => (
                  <div key={flow.id} className={`flex items-center gap-4 px-5 py-4 hover:bg-slate-50 ${flow.status === "error" ? "bg-rose-50/30" : ""}`}>
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      flow.status === "running" ? "bg-emerald-500" :
                      flow.status === "error"   ? "bg-rose-500 animate-pulse" : "bg-slate-300"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800">{flow.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate">{flow.desc}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-slate-400">노드</div>
                      <div className="text-sm font-bold text-slate-600">{flow.nodes}</div>
                    </div>
                    <div className="shrink-0">
                      <div className="text-xs text-slate-400 mb-1">msg/s</div>
                      <MsgBar rate={flow.msgsPerSec} />
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-slate-400">에러</div>
                      <div className={`text-sm font-bold ${flow.errCount > 0 ? "text-rose-600" : "text-slate-200"}`}>
                        {flow.errCount > 0 ? flow.errCount : "—"}
                      </div>
                    </div>
                    <div className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                      flow.status === "running" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                      flow.status === "error"   ? "bg-rose-50 text-rose-700 border border-rose-200" :
                      "bg-slate-100 text-slate-500"
                    }`}>
                      {flow.status === "running" ? "실행 중" : flow.status === "error" ? "오류" : "중단"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 3: Kafka ── */}
          {activeTab === "kafka" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Kafka 토픽 현황</h3>
                <p className="text-xs text-slate-400 mt-0.5">Broker: kafka.factory-a.local:9092 · Avro Schema Registry</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["토픽 이름","누적 메시지","수신 속도","Consumer Lag","상태"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {KAFKA_TOPICS.map(t => (
                    <tr key={t.topic} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{t.topic}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 tabular-nums">{t.msgs.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-700">{t.rate} msg/s</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold ${t.lag > 0 ? "text-rose-600" : "text-emerald-600"}`}>{t.lag}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          t.rate > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          {t.rate > 0 ? "Active" : "Idle"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── TAB 4: 알람 ── */}
          {activeTab === "alarm" && (
            <div className="space-y-3">
              {/* 필터 */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {(["ALL","CRITICAL","WARNING","INFO"] as const).map(f => (
                    <button key={f} onClick={() => setAlarmFilter(f)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        alarmFilter === f ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}>
                      {f === "ALL" ? `전체 (${alarms.length})` :
                       f === "CRITICAL" ? `긴급 (${alarms.filter(a=>a.severity==="CRITICAL").length})` :
                       f === "WARNING"  ? `경고 (${alarms.filter(a=>a.severity==="WARNING").length})` :
                       `정보 (${alarms.filter(a=>a.severity==="INFO").length})`}
                    </button>
                  ))}
                </div>
                <button onClick={() => setAlarms(prev => prev.map(a => ({ ...a, ack: true })))}
                  className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg bg-white">
                  전체 확인
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-50">
                  {filteredAlarms.map(alarm => {
                    const ac = ALARM_CFG[alarm.severity];
                    return (
                      <div key={alarm.id} className={`flex items-start gap-3 px-4 py-3.5 ${alarm.ack ? "opacity-50" : ""}`}>
                        <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${ac.dot} ${!alarm.ack && alarm.severity === "CRITICAL" ? "animate-pulse" : ""}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ac.bg} ${ac.text} border ${ac.border}`}>{ac.label}</span>
                            <span className="text-xs font-semibold text-slate-700">{alarm.deviceName}</span>
                            <span className="text-xs font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{alarm.tagName}</span>
                          </div>
                          <p className="text-xs text-slate-600">{alarm.message}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-mono text-slate-400">{alarm.ts}</div>
                          {!alarm.ack && (
                            <button onClick={() => setAlarms(prev => prev.map(a => a.id === alarm.id ? { ...a, ack: true } : a))}
                              className="text-xs text-blue-600 hover:text-blue-800 mt-1">확인</button>
                          )}
                          {alarm.ack && <div className="text-xs text-slate-300 mt-1">확인됨</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 5: 장치 진단 ── */}
          {activeTab === "diag" && (
            <div className="space-y-4">
              {/* 전체 장치 건강 요약 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900">장치별 통신 건강 요약</h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {["장치","프로토콜","업타임","응답시간","재연결","패킷손실","상태"].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {devices.map(dev => {
                      const pm = PROTO_META[dev.protocol];
                      const health = dev.uptimePct >= 99 ? "우수" : dev.uptimePct >= 95 ? "양호" : dev.uptimePct >= 80 ? "주의" : "위험";
                      const healthColor = dev.uptimePct >= 99 ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
                                          dev.uptimePct >= 95 ? "text-blue-600 bg-blue-50 border-blue-200" :
                                          dev.uptimePct >= 80 ? "text-amber-600 bg-amber-50 border-amber-200" :
                                          "text-rose-600 bg-rose-50 border-rose-200";
                      return (
                        <tr key={dev.id} className={`hover:bg-slate-50 ${selectedDevice === dev.id ? "bg-blue-50/30" : ""}`}
                          onClick={() => setSelectedDevice(dev.id)}>
                          <td className="px-4 py-3 text-xs font-semibold text-slate-800 cursor-pointer">{dev.name.split(" (")[0]}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded text-white ${pm.badge}`}>{pm.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${dev.uptimePct >= 99 ? "bg-emerald-400" : dev.uptimePct >= 95 ? "bg-blue-400" : dev.uptimePct >= 80 ? "bg-amber-400" : "bg-rose-400"}`}
                                  style={{ width: `${dev.uptimePct}%` }} />
                              </div>
                              <span className="text-xs font-mono text-slate-600">{dev.uptimePct}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3"><RespBar ms={dev.avgRespMs} /></td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold ${dev.reconnectCount > 10 ? "text-rose-600" : dev.reconnectCount > 3 ? "text-amber-600" : "text-slate-500"}`}>
                              {dev.reconnectCount}회
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold ${dev.packetLoss > 10 ? "text-rose-600" : dev.packetLoss > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                              {dev.packetLoss}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${healthColor}`}>{health}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 선택 장치 프로토콜 파라미터 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    프로토콜 파라미터 — {device.name}
                    <span className={`ml-2 text-xs font-bold px-1.5 py-0.5 rounded text-white ${PROTO_META[device.protocol].badge}`}>
                      {PROTO_META[device.protocol].label}
                    </span>
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-px bg-slate-100">
                  {Object.entries(device.protoParams).map(([k, v]) => (
                    <div key={k} className="bg-white px-5 py-3">
                      <div className="text-xs text-slate-400 mb-0.5">{k}</div>
                      <div className="text-sm font-mono font-semibold text-slate-800">{v}</div>
                    </div>
                  ))}
                  <div className="bg-white px-5 py-3">
                    <div className="text-xs text-slate-400 mb-0.5">호스트 / 포트</div>
                    <div className="text-sm font-mono font-semibold text-slate-800">{device.host} : {device.port}</div>
                  </div>
                  <div className="bg-white px-5 py-3">
                    <div className="text-xs text-slate-400 mb-0.5">스캔 레이트</div>
                    <div className="text-sm font-mono font-semibold text-slate-800">{device.scanRate} ms</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <EnvironmentSection/>
    </div>
  );
}
