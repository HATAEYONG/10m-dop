"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity, Wifi, WifiOff, AlertTriangle, CheckCircle2, RefreshCw,
  ChevronDown, ChevronRight, Cpu, Zap, Thermometer, Gauge, Eye,
  Radio, BarChart2, Clock, Server, GitBranch
} from "lucide-react";

type ProtocolId = "opcua" | "modbus" | "s7" | "eip" | "mc" | "fins" | "ads";
type ConnStatus = "online" | "error" | "offline" | "polling";
type SensorType = "vibration" | "temperature" | "pressure" | "power" | "vision" | "position" | "gas";
type Quality = "GOOD" | "UNCERTAIN" | "BAD";

interface Tag {
  id: string;
  name: string;
  value: number | string;
  unit: string;
  quality: Quality;
  ts: string;
  sensorType: SensorType;
  nodeId?: string;
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
}

interface NodeRedFlow {
  id: string;
  name: string;
  status: "running" | "stopped" | "error";
  nodes: number;
  msgsPerSec: number;
  desc: string;
}

const PROTO_META: Record<ProtocolId, { label: string; color: string; bg: string; badge: string }> = {
  opcua:  { label: "OPC-UA",        color: "text-blue-700",    bg: "bg-blue-50",    badge: "bg-blue-600" },
  modbus: { label: "Modbus TCP",     color: "text-amber-700",   bg: "bg-amber-50",   badge: "bg-amber-500" },
  s7:     { label: "S7comm",         color: "text-red-700",     bg: "bg-red-50",     badge: "bg-red-600" },
  eip:    { label: "EtherNet/IP",    color: "text-orange-700",  bg: "bg-orange-50",  badge: "bg-orange-500" },
  mc:     { label: "MC Protocol",    color: "text-purple-700",  bg: "bg-purple-50",  badge: "bg-purple-600" },
  fins:   { label: "FINS/TCP",       color: "text-teal-700",    bg: "bg-teal-50",    badge: "bg-teal-600" },
  ads:    { label: "ADS/AMS",        color: "text-indigo-700",  bg: "bg-indigo-50",  badge: "bg-indigo-600" },
};

const SENSOR_ICON: Record<SensorType, React.ReactNode> = {
  vibration:   <Activity className="w-3.5 h-3.5" />,
  temperature: <Thermometer className="w-3.5 h-3.5" />,
  pressure:    <Gauge className="w-3.5 h-3.5" />,
  power:       <Zap className="w-3.5 h-3.5" />,
  vision:      <Eye className="w-3.5 h-3.5" />,
  position:    <Radio className="w-3.5 h-3.5" />,
  gas:         <Wind className="w-3.5 h-3.5" />,
};

function Wind({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
    </svg>
  );
}

const QUALITY_CFG: Record<Quality, { color: string; dot: string }> = {
  GOOD:      { color: "text-emerald-600", dot: "bg-emerald-500" },
  UNCERTAIN: { color: "text-amber-600",   dot: "bg-amber-400" },
  BAD:       { color: "text-rose-600",    dot: "bg-rose-500" },
};

const INIT_DEVICES: Device[] = [
  {
    id: "d1", name: "CNC-01 (Siemens S7-1500)", protocol: "s7",
    host: "192.168.10.101", port: 102, status: "online",
    model: "Siemens S7-1516-3 PN/DP", scanRate: 500, lastScan: "09:14:32.441",
    tags: [
      { id: "t1",  name: "Spindle.Speed",       value: 2850,   unit: "RPM",  quality: "GOOD",      ts: "09:14:32", sensorType: "vibration", nodeId: "DB100.DBW0" },
      { id: "t2",  name: "Spindle.Load",         value: 42.3,   unit: "%",    quality: "GOOD",      ts: "09:14:32", sensorType: "power",     nodeId: "DB100.DBD8" },
      { id: "t3",  name: "Feed.Rate",            value: 800,    unit: "mm/m", quality: "GOOD",      ts: "09:14:32", sensorType: "position",  nodeId: "DB100.DBW2" },
      { id: "t4",  name: "Spindle.Temp",         value: 68.4,   unit: "°C",   quality: "GOOD",      ts: "09:14:32", sensorType: "temperature",nodeId: "DB100.REAL16" },
      { id: "t5",  name: "Coolant.Pressure",     value: 3.21,   unit: "bar",  quality: "UNCERTAIN", ts: "09:14:31", sensorType: "pressure",  nodeId: "DB101.REAL0" },
    ],
  },
  {
    id: "d2", name: "PRESS-01 (Allen-Bradley)", protocol: "eip",
    host: "192.168.10.102", port: 44818, status: "online",
    model: "AB ControlLogix 5580", scanRate: 200, lastScan: "09:14:32.397",
    tags: [
      { id: "t6",  name: "Press.Force",          value: 12450,  unit: "kN",   quality: "GOOD",      ts: "09:14:32", sensorType: "pressure",  nodeId: "Press_Force_kN" },
      { id: "t7",  name: "Ram.Position",         value: 245.8,  unit: "mm",   quality: "GOOD",      ts: "09:14:32", sensorType: "position",  nodeId: "Ram_Pos_mm" },
      { id: "t8",  name: "Cycle.Count",          value: 184291, unit: "ea",   quality: "GOOD",      ts: "09:14:32", sensorType: "position",  nodeId: "Cycle_Counter" },
      { id: "t9",  name: "Servo.Temp",           value: 71.2,   unit: "°C",   quality: "GOOD",      ts: "09:14:32", sensorType: "temperature",nodeId: "Servo1_Temp" },
    ],
  },
  {
    id: "d3", name: "Compressor (Modbus TCP)", protocol: "modbus",
    host: "192.168.10.110", port: 502, status: "online",
    model: "Atlas Copco GA55 (Modbus 어댑터)", scanRate: 1000, lastScan: "09:14:32.011",
    tags: [
      { id: "t10", name: "Outlet.Pressure",      value: 7.82,   unit: "bar",  quality: "GOOD",      ts: "09:14:32", sensorType: "pressure",  nodeId: "40001~40002" },
      { id: "t11", name: "Inlet.Temp",           value: 24.1,   unit: "°C",   quality: "GOOD",      ts: "09:14:32", sensorType: "temperature",nodeId: "40003" },
      { id: "t12", name: "Motor.Current",        value: 38.6,   unit: "A",    quality: "GOOD",      ts: "09:14:32", sensorType: "power",     nodeId: "40005" },
      { id: "t13", name: "Run.Hours",            value: 8821,   unit: "h",    quality: "GOOD",      ts: "09:14:31", sensorType: "position",  nodeId: "40007~40008" },
    ],
  },
  {
    id: "d4", name: "Robot-01 (Mitsubishi iQ-R)", protocol: "mc",
    host: "192.168.10.120", port: 5007, status: "error",
    model: "Mitsubishi RV-7FRL (iQ-R 제어기)", scanRate: 500, lastScan: "09:13:58.201",
    tags: [
      { id: "t14", name: "J1.Angle",             value: "N/A",  unit: "deg",  quality: "BAD",       ts: "09:13:58", sensorType: "position",  nodeId: "D100" },
      { id: "t15", name: "J2.Angle",             value: "N/A",  unit: "deg",  quality: "BAD",       ts: "09:13:58", sensorType: "position",  nodeId: "D102" },
      { id: "t16", name: "Program.Running",      value: "N/A",  unit: "",     quality: "BAD",       ts: "09:13:58", sensorType: "vision",    nodeId: "M100" },
    ],
  },
  {
    id: "d5", name: "Power Meter (OPC-UA)", protocol: "opcua",
    host: "192.168.10.130", port: 4840, status: "online",
    model: "Schneider PM8000 (내장 OPC-UA)", scanRate: 1000, lastScan: "09:14:32.550",
    tags: [
      { id: "t17", name: "Active.Power",         value: 184.2,  unit: "kW",   quality: "GOOD",      ts: "09:14:32", sensorType: "power",     nodeId: "ns=2;s=PM8000.MMXU1.TotW.mag.f" },
      { id: "t18", name: "Power.Factor",         value: 0.94,   unit: "",     quality: "GOOD",      ts: "09:14:32", sensorType: "power",     nodeId: "ns=2;s=PM8000.MMXU1.TotPF.mag.f" },
      { id: "t19", name: "THD.Current",          value: 4.8,    unit: "%",    quality: "GOOD",      ts: "09:14:32", sensorType: "power",     nodeId: "ns=2;s=PM8000.MMXU1.ThdAv.mag.f" },
      { id: "t20", name: "L1.Voltage",           value: 220.3,  unit: "V",    quality: "GOOD",      ts: "09:14:32", sensorType: "power",     nodeId: "ns=2;s=PM8000.MMXU1.PhV.phsA.cVal.mag.f" },
    ],
  },
  {
    id: "d6", name: "Vision QC (Modbus)", protocol: "modbus",
    host: "192.168.10.140", port: 502, status: "online",
    model: "Cognex In-Sight 9000 Series", scanRate: 200, lastScan: "09:14:32.298",
    tags: [
      { id: "t21", name: "Inspection.Result",    value: 1,      unit: "OK/NG",quality: "GOOD",      ts: "09:14:32", sensorType: "vision",    nodeId: "40001" },
      { id: "t22", name: "Defect.Code",          value: 0,      unit: "",     quality: "GOOD",      ts: "09:14:32", sensorType: "vision",    nodeId: "40002" },
      { id: "t23", name: "Inspect.Time",         value: 48,     unit: "ms",   quality: "GOOD",      ts: "09:14:32", sensorType: "vision",    nodeId: "40004" },
      { id: "t24", name: "NG.Count.Today",       value: 3,      unit: "ea",   quality: "GOOD",      ts: "09:14:32", sensorType: "vision",    nodeId: "40005" },
    ],
  },
];

const NODERED_FLOWS: NodeRedFlow[] = [
  { id: "f1", name: "S7 → Kafka Bridge",         status: "running", nodes: 8,  msgsPerSec: 12.4, desc: "CNC-01 DB100 폴링 → 정규화 → Kafka raw.sensor.cnc01" },
  { id: "f2", name: "Modbus Multi-Poll",          status: "running", nodes: 12, msgsPerSec: 8.7,  desc: "컴프레서·비전 Modbus 일괄 폴링 → Dead-band → MQTT" },
  { id: "f3", name: "EIP ControlLogix Subscriber",status: "running", nodes: 6,  msgsPerSec: 22.1, desc: "PRESS-01 TagList 구독 → Kafka" },
  { id: "f4", name: "OPC-UA Subscription",        status: "running", nodes: 5,  msgsPerSec: 4.0,  desc: "PM8000 OPC-UA 구독 (500ms) → Kafka raw.sensor.power" },
  { id: "f5", name: "MC Protocol Robot",          status: "error",   nodes: 7,  msgsPerSec: 0,    desc: "Robot-01 SLMP 읽기 — 연결 끊김 (TCP timeout)" },
  { id: "f6", name: "Alarm Escalation",           status: "running", nodes: 10, msgsPerSec: 0.3,  desc: "고심각도 OPC-UA 이벤트 → Slack #factory-alerts" },
];

const KAFKA_TOPICS = [
  { topic: "raw.sensor.factory_a.cnc01",    msgs: 744210, rate: 12, lag: 0 },
  { topic: "raw.sensor.factory_a.press01",  msgs: 1102843, rate: 22, lag: 0 },
  { topic: "raw.sensor.factory_a.power",    msgs: 288541,  rate: 4,  lag: 0 },
  { topic: "raw.sensor.factory_a.modbus",   msgs: 521900,  rate: 9,  lag: 2 },
  { topic: "raw.vision.defect",             msgs: 3,        rate: 0,  lag: 0 },
];

export default function SensorGateway() {
  const [selectedDevice, setSelectedDevice] = useState<string>("d1");
  const [expandedProto, setExpandedProto] = useState<Set<ProtocolId>>(new Set(["s7", "opcua", "eip", "modbus"]));
  const [devices, setDevices] = useState<Device[]>(INIT_DEVICES);
  const [tick, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState<"tags" | "nodered" | "kafka">("tags");

  // 실시간 값 시뮬레이션
  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
      setDevices(prev => prev.map(dev => ({
        ...dev,
        tags: dev.tags.map(tag => {
          if (tag.quality === "BAD") return tag;
          const base = typeof tag.value === "number" ? tag.value : 0;
          const jitter = (Math.random() - 0.5) * base * 0.008;
          return {
            ...tag,
            value: typeof tag.value === "number"
              ? parseFloat((base + jitter).toFixed(2))
              : tag.value,
            ts: new Date().toTimeString().slice(0, 8),
          };
        }),
      })));
    }, 1200);
    return () => clearInterval(id);
  }, []);

  const device = devices.find(d => d.id === selectedDevice)!;

  const groupedByProto = (Object.keys(PROTO_META) as ProtocolId[]).map(proto => ({
    proto,
    devs: devices.filter(d => d.protocol === proto),
  })).filter(g => g.devs.length > 0);

  const totalOnline  = devices.filter(d => d.status === "online").length;
  const totalError   = devices.filter(d => d.status === "error").length;
  const totalTags    = devices.reduce((s, d) => s + d.tags.length, 0);
  const totalGoodTags = devices.reduce((s, d) => s + d.tags.filter(t => t.quality === "GOOD").length, 0);

  const toggleProto = (p: ProtocolId) =>
    setExpandedProto(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sensor Gateway</h1>
          <p className="text-slate-500 mt-1">설비·PLC·센서 프로토콜 통합 모니터링 — OPC-UA · Modbus · S7 · EtherNet/IP · MC · FINS · ADS</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          실시간 폴링 중
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "연결 장치",    value: totalOnline,   total: devices.length, unit: `/ ${devices.length}`, color: "text-slate-800",   icon: <Server className="w-4 h-4" /> },
          { label: "연결 오류",    value: totalError,    total: null,            unit: "개",                  color: "text-rose-600",    icon: <WifiOff className="w-4 h-4" /> },
          { label: "수집 태그",    value: totalTags,     total: null,            unit: "개",                  color: "text-slate-800",   icon: <BarChart2 className="w-4 h-4" /> },
          { label: "태그 품질",    value: `${Math.round(totalGoodTags/totalTags*100)}`, total: null, unit: "%", color: "text-emerald-600", icon: <CheckCircle2 className="w-4 h-4" /> },
          { label: "Node-RED 플로우",value: NODERED_FLOWS.filter(f=>f.status==="running").length, total: null, unit: `/ ${NODERED_FLOWS.length} 실행중`, color: "text-blue-700", icon: <GitBranch className="w-4 h-4" /> },
        ].map(({ label, value, unit, color, icon }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">{label}</span>
              <div className={`${color} opacity-60`}>{icon}</div>
            </div>
            <div className={`text-2xl font-bold ${color}`}>
              {value}<span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        {/* 좌측: 프로토콜 · 장치 트리 */}
        <div className="w-72 shrink-0 space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 mb-2">장치 트리</div>
          {groupedByProto.map(({ proto, devs }) => {
            const pm = PROTO_META[proto];
            const isExpanded = expandedProto.has(proto);
            return (
              <div key={proto}>
                <button
                  onClick={() => toggleProto(proto)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  {isExpanded
                    ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${pm.badge}`}>
                    {pm.label}
                  </span>
                  <span className="text-xs text-slate-400">{devs.length}대</span>
                </button>
                {isExpanded && devs.map(dev => (
                  <button
                    key={dev.id}
                    onClick={() => setSelectedDevice(dev.id)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg transition-all ml-2 ${
                      selectedDevice === dev.id
                        ? "bg-blue-50 border border-blue-200 text-blue-700"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      dev.status === "online"  ? "bg-emerald-500" :
                      dev.status === "error"   ? "bg-rose-500 animate-pulse" : "bg-slate-300"
                    }`} />
                    <div className="text-left min-w-0">
                      <div className="text-xs font-semibold truncate">{dev.name}</div>
                      <div className="text-xs text-slate-400">{dev.host}:{dev.port}</div>
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        {/* 우측: 선택 장치 상세 */}
        <div className="flex-1 space-y-4">
          {/* 장치 헤더 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  device.status === "online" ? "bg-emerald-500" :
                  device.status === "error"  ? "bg-rose-500 animate-pulse" : "bg-slate-300"
                }`} />
                <div>
                  <div className="font-semibold text-slate-900">{device.name}</div>
                  <div className="text-xs text-slate-500">{device.model}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs text-slate-500">프로토콜</div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${PROTO_META[device.protocol].badge}`}>
                    {PROTO_META[device.protocol].label}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">스캔 레이트</div>
                  <div className="text-sm font-bold text-slate-700">{device.scanRate} ms</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> 마지막 스캔</div>
                  <div className="text-sm font-mono text-slate-700">{device.lastScan}</div>
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg ${
                  device.status === "online" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                  device.status === "error"  ? "bg-rose-50 text-rose-700 border border-rose-200" :
                  "bg-slate-50 text-slate-500 border border-slate-200"
                }`}>
                  {device.status === "online"  ? <Wifi className="w-3.5 h-3.5" /> :
                   device.status === "error"   ? <WifiOff className="w-3.5 h-3.5" /> :
                   <RefreshCw className="w-3.5 h-3.5" />}
                  {device.status === "online" ? "연결됨" : device.status === "error" ? "연결 오류" : "오프라인"}
                </div>
              </div>
            </div>
          </div>

          {/* 탭 */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
            {([["tags","태그 데이터"], ["nodered","Node-RED 플로우"], ["kafka","Kafka 토픽"]] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`text-xs px-4 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 태그 데이터 탭 */}
          {activeTab === "tags" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">실시간 태그 값 ({device.tags.length}개)</h3>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {device.status === "online" ? "라이브" : "중단됨"}
                </div>
              </div>
              {device.status === "error" ? (
                <div className="flex items-center gap-3 m-4 p-4 bg-rose-50 border border-rose-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-rose-700">TCP 연결 타임아웃</div>
                    <div className="text-xs text-rose-600 mt-0.5">
                      {device.host}:{device.port} — 마지막 응답: {device.lastScan}. Node-RED 플로우 재시작 또는 PLC 네트워크를 확인하세요.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {["유형","태그 이름","현재값","단위","품질","NodeId / 주소","타임스탬프"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {device.tags.map(tag => {
                        const qc = QUALITY_CFG[tag.quality];
                        return (
                          <tr key={tag.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className={`flex items-center gap-1 text-xs font-medium ${
                                tag.sensorType === "temperature" ? "text-orange-600" :
                                tag.sensorType === "pressure"   ? "text-blue-600" :
                                tag.sensorType === "power"      ? "text-yellow-600" :
                                tag.sensorType === "vision"     ? "text-purple-600" :
                                tag.sensorType === "position"   ? "text-teal-600" :
                                tag.sensorType === "gas"        ? "text-green-600" :
                                "text-slate-600"
                              }`}>
                                {SENSOR_ICON[tag.sensorType]}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-semibold font-mono text-slate-800">{tag.name}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-sm font-bold tabular-nums ${
                                tag.quality === "GOOD" ? "text-slate-900" : "text-rose-500"
                              }`}>
                                {typeof tag.value === "number" ? tag.value.toLocaleString() : tag.value}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500">{tag.unit}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${qc.dot}`} />
                                <span className={`text-xs font-medium ${qc.color}`}>{tag.quality}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{tag.nodeId}</span>
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-slate-400">{tag.ts}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Node-RED 플로우 탭 */}
          {activeTab === "nodered" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Node-RED 플로우 현황</h3>
                <p className="text-xs text-slate-400 mt-0.5">포트 1880 · Docker 컨테이너: nodered-line01</p>
              </div>
              <div className="divide-y divide-slate-50">
                {NODERED_FLOWS.map(flow => (
                  <div key={flow.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      flow.status === "running" ? "bg-emerald-500" :
                      flow.status === "error"   ? "bg-rose-500 animate-pulse" : "bg-slate-300"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800">{flow.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate">{flow.desc}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-slate-400">노드 수</div>
                      <div className="text-sm font-bold text-slate-700">{flow.nodes}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-slate-400">msg/s</div>
                      <div className={`text-sm font-bold ${flow.msgsPerSec > 0 ? "text-blue-600" : "text-slate-300"}`}>
                        {flow.msgsPerSec}
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

          {/* Kafka 토픽 탭 */}
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
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold ${t.rate > 0 ? "text-slate-800" : "text-slate-300"}`}>
                          {t.rate} msg/s
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold ${t.lag > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                          {t.lag}
                        </span>
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
        </div>
      </div>
    </div>
  );
}
