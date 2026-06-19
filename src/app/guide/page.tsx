"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Upload, Database, RadioTower, FileSearch, Plug, Mail,
  GitBranch, Sparkles, Users, Network, Play, Cpu, ClipboardCheck,
  GitMerge, CheckCircle, MessageSquareText, Share2, Bot,
  LayoutDashboard, Factory, CalendarClock, NetworkIcon, SearchCode,
  Wrench, Zap, Globe, Newspaper, FileBarChart2, ShieldCheck, Map,
  ChevronRight, BookOpen, User, Settings, BarChart3, AlertTriangle,
  Lightbulb, ArrowRight, CheckCircle2, Clock, Star,
} from "lucide-react";

// ─── 타입 ────────────────────────────────────────────────────────
type Role = "data" | "quality" | "it" | "ops" | "manager";
type StepColor = "blue" | "violet" | "emerald" | "slate";

interface MenuRef {
  href: string;
  label: string;
  color: StepColor;
}

interface ScenarioStep {
  no: number;
  action: string;
  menu: MenuRef;
  tip?: string;
}

interface Scenario {
  id: string;
  title: string;
  trigger: string;
  roles: Role[];
  freq: string;
  steps: ScenarioStep[];
}

interface MenuDoc {
  href: string;
  icon: React.ElementType;
  label: string;
  sub: string;
  color: StepColor;
  section: string;
  who: string;
  when: string;
  howto: string[];
  output: string;
}

// ─── 색상 맵 ─────────────────────────────────────────────────────
const COLOR: Record<StepColor, { badge: string; dot: string; border: string; text: string }> = {
  blue:    { badge:"bg-blue-100 text-blue-700",    dot:"bg-blue-500",    border:"border-blue-200",   text:"text-blue-700" },
  violet:  { badge:"bg-violet-100 text-violet-700",dot:"bg-violet-500",  border:"border-violet-200", text:"text-violet-700" },
  emerald: { badge:"bg-emerald-100 text-emerald-700",dot:"bg-emerald-500",border:"border-emerald-200",text:"text-emerald-700" },
  slate:   { badge:"bg-slate-100 text-slate-700",  dot:"bg-slate-500",   border:"border-slate-200",  text:"text-slate-700" },
};

const ROLE_META: Record<Role, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  data:    { label:"데이터 담당자", icon:Database,     color:"text-blue-600",   bg:"bg-blue-50 border-blue-200" },
  quality: { label:"품질팀",        icon:CheckCircle,  color:"text-violet-600", bg:"bg-violet-50 border-violet-200" },
  it:      { label:"IT/개발팀",     icon:Settings,     color:"text-teal-600",   bg:"bg-teal-50 border-teal-200" },
  ops:     { label:"생산/운영팀",   icon:Factory,      color:"text-orange-600", bg:"bg-orange-50 border-orange-200" },
  manager: { label:"관리자/경영진", icon:BarChart3,    color:"text-rose-600",   bg:"bg-rose-50 border-rose-200" },
};

// ─── 시나리오 데이터 ─────────────────────────────────────────────
const SCENARIOS: Scenario[] = [
  /* S01 */
  {
    id:"S01", title:"신규 ERP 소스 연결", trigger:"새 협력사 ERP 또는 내부 시스템 추가",
    roles:["data","it"], freq:"수시 (소스 추가 시)",
    steps:[
      { no:1, action:"원천 등록 — 연결 유형(DB/API/파일) 선택 후 호스트·인증 정보 입력",                  menu:{ href:"/sources",         label:"Source Registry",    color:"blue"   }, tip:"연결 테스트 꼭 실행해 응답시간·스키마 자동 탐지 확인" },
      { no:2, action:"컬럼 목록 자동 수집 후 Canonical 필드와 매핑 — 신뢰도 80% 미만 항목은 수동 검토", menu:{ href:"/schema-mapping",   label:"Schema Mapping",     color:"violet" }, tip:"OPT_HINTS 탭에서 품질 경고(이중 키·단위 불일치 등) 먼저 확인" },
      { no:3, action:"ETL→ODS→DW→MART 4레이어 데이터 흐름 확인 및 계보 등록",                           menu:{ href:"/data-lineage",     label:"Data Lineage",       color:"violet" } },
      { no:4, action:"온톨로지 단어/도메인 표준에 신규 소스 용어 등록",                                  menu:{ href:"/ontology-mapping", label:"Ontology Mapping",   color:"violet" }, tip:"YH ERP 경우 YH_AMOUNT·YH_YEAR 등 소스 전용 도메인 표준 참조" },
      { no:5, action:"초기 파이프라인 실행 — 수집→전처리→정형화 3단계 순차 실행",                        menu:{ href:"/pipeline-runner",  label:"Pipeline Runner",    color:"violet" } },
      { no:6, action:"AI-Ready 6단계 점수 확인 후 품질 80점 미만 항목 수정",                             menu:{ href:"/quality",          label:"Quality Validator",  color:"violet" } },
      { no:7, action:"온보딩 완료 보고서 출력",                                                          menu:{ href:"/onboarding-report",label:"Onboarding Report",  color:"slate"  } },
    ],
  },
  /* S02 */
  {
    id:"S02", title:"YH ERP 월별 원가 데이터 적재", trigger:"월말 원가계산 완료 후 DW 적재",
    roles:["data"], freq:"월 1회 (매월 말)",
    steps:[
      { no:1, action:"YH COS 원가관리 소스 연결 상태 확인 (id:13)",                                     menu:{ href:"/sources",         label:"Source Registry",    color:"blue"   }, tip:"lastSync가 '연결 오류' 상태면 DB 방화벽·계정 확인" },
      { no:2, action:"COS200_YH 파이프라인 실행 — cost_mon 필터로 해당 월만 선택 적재",                  menu:{ href:"/pipeline-runner",  label:"Pipeline Runner",    color:"violet" }, tip:"ML 탭에서 원가 이상치 탐지 알고리즘(Random Forest) 함께 실행" },
      { no:3, action:"itm_cd→Product.product_id, end_up→Product.unit_cost 매핑 상태 재확인",            menu:{ href:"/schema-mapping",   label:"Schema Mapping",     color:"violet" }, tip:"id:25~30 행 필터로 YH COS 매핑만 보기" },
      { no:4, action:"end_up 단가 이상값(0원·음수) Human Review 큐 처리",                               menu:{ href:"/human-review",     label:"Human Review",       color:"violet" } },
      { no:5, action:"DW FACT_ORDER → DIM_PRODUCT 단가 업데이트 계보 확인",                             menu:{ href:"/data-lineage",     label:"Data Lineage",       color:"violet" } },
    ],
  },
  /* S03 */
  {
    id:"S03", title:"수입검사(IQC) 불량 급증 원인 추적", trigger:"QMM100 불량수량 이상 증가 알림",
    roles:["quality","data"], freq:"수시 (이상 발생 시)",
    steps:[
      { no:1, action:"QMM 품질관리 소스 최신 동기화 상태 확인",                                         menu:{ href:"/sources",         label:"Source Registry",    color:"blue"   } },
      { no:2, action:"GraphRAG에서 '불량 급증 협력사' 자연어 질의 → 관련 IQC 레코드·협력사 그래프 탐색", menu:{ href:"/graphrag",         label:"GraphRAG Demo",      color:"emerald"} , tip:"Quality Escape 탭: QMS_CLAIM → MES_WORKORDER 6단계 역추적 활용" },
      { no:3, action:"Supply Chain Twin에서 해당 협력사 납품 이력·재고 위치 확인",                       menu:{ href:"/supply-chain-twin",label:"Supply Chain Twin",  color:"slate"  } },
      { no:4, action:"ECO 영향 추적 — 불량 자재 투입된 완제품 SN 범위 확인",                            menu:{ href:"/eco-tracker",      label:"ECO Tracker",        color:"slate"  } },
      { no:5, action:"품질 클리닉 — AI 추천 개선 조치 적용 및 재검사 스케줄 등록",                       menu:{ href:"/quality",          label:"Quality Validator",  color:"violet" } },
      { no:6, action:"거버넌스 — 불량 보고서 승인 및 SLA 위반 기록",                                    menu:{ href:"/governance",       label:"Governance",         color:"slate"  } },
    ],
  },
  /* S04 */
  {
    id:"S04", title:"AI 자연어 데이터 질의", trigger:"'이번 달 불량 Top 5 협력사는?' 등 즉시 답변 필요",
    roles:["quality","ops","manager"], freq:"수시 (필요할 때마다)",
    steps:[
      { no:1, action:"AX Chat에서 한국어로 질문 입력 — ERP 용어·모델 번호 그대로 사용 가능",             menu:{ href:"/ax-chat",          label:"AX Chat",            color:"emerald"} , tip:"'YH IQC 불량 top5 이번달' 처럼 시스템 코드 포함해도 인식" },
      { no:2, action:"답변 불충분 시 GraphRAG로 전환 — 지식 그래프 기반 E2E 연계 추적",                  menu:{ href:"/graphrag",         label:"GraphRAG Demo",      color:"emerald"} },
      { no:3, action:"그래프 Preview에서 엔티티 관계 시각화 확인",                                       menu:{ href:"/graph",            label:"Graph Preview",      color:"emerald"} },
      { no:4, action:"AI 결정 로그에서 답변 근거·신뢰도 확인",                                           menu:{ href:"/agent-monitor",    label:"Agent Monitor",      color:"emerald"} },
    ],
  },
  /* S05 */
  {
    id:"S05", title:"파이프라인 장애 대응", trigger:"동기화 실패 알림 또는 데이터 지연 감지",
    roles:["it","data"], freq:"수시 (장애 발생 시)",
    steps:[
      { no:1, action:"소스별 연결 상태 확인 — error 상태 소스 클릭해 오류 메시지 확인",                  menu:{ href:"/sources",         label:"Source Registry",    color:"blue"   }, tip:"OAuth 만료·SMB 권한·DB 타임아웃 등 오류 유형별 대응 참고" },
      { no:2, action:"파이프라인 실행 이력 확인 — 실패 스텝·에러 로그 조회",                             menu:{ href:"/pipeline-runner",  label:"Pipeline Runner",    color:"violet" } },
      { no:3, action:"데이터 계보에서 영향받은 다운스트림 파이프라인 범위 파악",                          menu:{ href:"/data-lineage",     label:"Data Lineage",       color:"violet" } },
      { no:4, action:"복구 후 품질 점수 재검증 — 장애 전/후 품질 히스토리 비교",                         menu:{ href:"/quality",          label:"Quality Validator",  color:"violet" } },
      { no:5, action:"거버넌스 — 장애 내역 기록·담당자 알림·SLA 보고",                                   menu:{ href:"/governance",       label:"Governance",         color:"slate"  } },
    ],
  },
  /* S06 */
  {
    id:"S06", title:"생산 현황 모니터링", trigger:"일별 생산 KPI 확인 / 이상 공정 조기 발견",
    roles:["ops","manager"], freq:"매일 (교대 시작 시)",
    steps:[
      { no:1, action:"대시보드에서 AI-Ready 점수·소스 연결 현황 전체 조망",                              menu:{ href:"/",                 label:"대시보드",            color:"slate"  } },
      { no:2, action:"MES Viewer에서 공정별 실적·불량·가동률 확인",                                      menu:{ href:"/mes-viewer",       label:"MES Viewer",         color:"slate"  } },
      { no:3, action:"설비 이상 알림 확인 — 예지정비 AI 권고 항목 검토",                                 menu:{ href:"/maintenance",      label:"Maintenance",        color:"slate"  } },
      { no:4, action:"에너지 소비 이상 확인 — 전력 Peak 구간·원단위 이탈 체크",                          menu:{ href:"/energy",           label:"Energy Monitor",     color:"slate"  } },
      { no:5, action:"APS Planner에서 납기 위험 주문 확인 및 생산 우선순위 조정",                        menu:{ href:"/aps-planner",      label:"APS Planner",        color:"slate"  } },
    ],
  },
  /* S07 */
  {
    id:"S07", title:"Human Review — AI 저신뢰 항목 처리", trigger:"신뢰도 80% 미만 매핑 또는 품질 경고 항목",
    roles:["data","quality"], freq:"주 1~2회 (배치 처리)",
    steps:[
      { no:1, action:"Human Review 큐에서 미처리 항목 목록 확인 — 우선순위(HIGH→MID) 순으로 처리",       menu:{ href:"/human-review",     label:"Human Review",       color:"violet" }, tip:"YH itm_id INT 조인 문제·emp_no 길이 불일치 등 HIGH 항목 먼저" },
      { no:2, action:"의심 항목 원본 소스 컨텍스트 확인 후 승인/거부/수정 결정",                          menu:{ href:"/human-review",     label:"Human Review",       color:"violet" } },
      { no:3, action:"승인된 매핑은 Schema Mapping에 자동 반영 확인",                                    menu:{ href:"/schema-mapping",   label:"Schema Mapping",     color:"violet" } },
      { no:4, action:"거버넌스 — 검토 이력 기록 및 담당자 서명",                                         menu:{ href:"/governance",       label:"Governance",         color:"slate"  } },
    ],
  },
  /* S08 */
  {
    id:"S08", title:"공급망 리스크 조기 경보", trigger:"뉴스·기후 이상 또는 협력사 납기 지연 징후",
    roles:["ops","manager"], freq:"수시 (알림 발생 시)",
    steps:[
      { no:1, action:"News Monitor에서 협력사·원자재 관련 위험 뉴스 확인",                               menu:{ href:"/news-monitor",     label:"News Monitor",       color:"slate"  } },
      { no:2, action:"Milieu Monitor에서 기후·물류 이상 인덱스 확인",                                    menu:{ href:"/milieu",           label:"Milieu Monitor",     color:"slate"  } },
      { no:3, action:"Supply Chain Twin에서 영향받는 재고·납기 가시화",                                  menu:{ href:"/supply-chain-twin",label:"Supply Chain Twin",  color:"slate"  } },
      { no:4, action:"AX Chat으로 '해당 부품 대체 공급사 있나?' 즉시 질의",                              menu:{ href:"/ax-chat",          label:"AX Chat",            color:"emerald"} },
      { no:5, action:"APS Planner에서 리스크 시나리오 시뮬레이션 및 대응 계획 수립",                     menu:{ href:"/aps-planner",      label:"APS Planner",        color:"slate"  } },
    ],
  },
];

// ─── 메뉴 문서 ────────────────────────────────────────────────────
const MENU_DOCS: MenuDoc[] = [
  /* STEP 1 */
  {
    href:"/sources", icon:Database, label:"Source Registry", sub:"데이터 원천 관리", color:"blue", section:"STEP 1",
    who:"데이터 담당자 · IT팀",
    when:"새 소스 추가 / 연결 오류 발생 / 주기적 상태 점검",
    howto:["+ 원천 추가 클릭 → 유형(DB/API/파일/이메일) 선택","연결 정보 입력 후 연결 테스트 실행","원천 목록에서 상태(connected/error/pending) 확인","소스 카드 클릭 → 스키마·품질 이슈·동기화 이력 상세 확인"],
    output:"등록된 소스 목록·스키마 메타데이터·품질 점수",
  },
  {
    href:"/ingest", icon:Upload, label:"Data Ingestion Hub", sub:"3종 데이터 통합 적재", color:"blue", section:"STEP 1",
    who:"데이터 담당자 · IT팀",
    when:"초기 데이터 적재 / 재적재 필요 시",
    howto:["DB·파일·API 3가지 탭 중 해당 유형 선택","소스 선택 후 적재 범위(전체/증분) 설정","적재 실행 → 진행률 모니터링","완료 후 로그에서 적재 건수·오류 확인"],
    output:"원천 → ODS 레이어 데이터 적재",
  },
  {
    href:"/sensor-gateway", icon:RadioTower, label:"Sensor Gateway", sub:"설비·PLC·센서 프로토콜", color:"blue", section:"STEP 1",
    who:"IT팀 · 설비팀",
    when:"MES/PLC 센서 데이터 연동 시",
    howto:["프로토콜 선택(MQTT/OPC-UA/Modbus/HTTP)","디바이스 등록 → 태그 매핑","실시간 수신 상태 모니터링","알람 임계값 설정"],
    output:"IoT 센서 → 실시간 스트림 데이터 수신",
  },
  {
    href:"/document-parser", icon:FileSearch, label:"Document Parser", sub:"PDF·CSV 파싱", color:"blue", section:"STEP 1",
    who:"데이터 담당자",
    when:"PDF 성적서·Excel 업로드 시",
    howto:["파일 드래그앤드롭 업로드","파싱 규칙 선택(OCR/테이블/자유텍스트)","추출 결과 미리보기 확인 후 적재"],
    output:"비정형 문서 → 정형 데이터 변환",
  },
  {
    href:"/api-connector", icon:Plug, label:"API Connector", sub:"외부 API 연동", color:"blue", section:"STEP 1",
    who:"IT팀 · 데이터 담당자",
    when:"외부 REST API·ERP OpenAPI 연동 시",
    howto:["엔드포인트 URL·인증 방식(API Key/OAuth2/Bearer) 입력","요청 파라미터·응답 경로(JSONPath) 매핑","스케줄 설정(폴링 주기) 또는 웹훅 수신 URL 등록","테스트 호출 → 응답 데이터 미리보기 확인"],
    output:"외부 API 응답 → 정형 데이터 스트림",
  },
  {
    href:"/email-parser", icon:Mail, label:"Email Parser", sub:"이메일·메신저 파싱", color:"blue", section:"STEP 1",
    who:"구매팀 · 영업팀",
    when:"이메일·카카오톡 발주서를 시스템에 입력해야 할 때",
    howto:["연결 계정 등록(Gmail OAuth / Outlook / 카카오 채널)","수신 필터 설정 — 발신자·제목 키워드 조건","파싱 템플릿 선택 (발주서·검사성적서·거래명세서)","파싱 결과 검토 후 ERP 소스로 연계"],
    output:"비정형 메일 → 구조화 발주/문서 데이터",
  },
  /* STEP 2 */
  {
    href:"/schema-mapping", icon:GitBranch, label:"Schema Mapping", sub:"컬럼 표준화", color:"violet", section:"STEP 2",
    who:"데이터 담당자",
    when:"신규 소스 등록 후 / 매핑 재검토 시",
    howto:["매핑 목록 탭에서 소스별·상태별 필터","신뢰도 클릭 → 샘플값·변환 규칙 확인","pending 상태 클릭 → 승인/거부/수정","DW 모델 탭 → Star Schema Fact/Dim 구조 확인","최적화 탭 → OPT_HINTS 개선 항목 순차 처리"],
    output:"소스컬럼 → Canonical 필드 매핑 승인 목록",
  },
  {
    href:"/ontology-mapping", icon:Network, label:"Ontology Mapping", sub:"10M 온톨로지", color:"violet", section:"STEP 2",
    who:"데이터 담당자 · IT팀",
    when:"신규 용어 추가 / 코드표 관리 / 도메인 표준 갱신",
    howto:["Dict 목록 탭 → 6종 Dict 항목(코드약속·제품계층 등) 관리","매핑 목록 탭 → Canonical 온톨로지 관계 확인","모델링 표준 탭 → 단어표준·도메인표준·코드표준 3계층 관리","YH ERP: YH_AMOUNT·YH_YEAR·YH_EMP_NO 등 소스별 도메인 참조"],
    output:"용어사전·코드표·도메인표준 업데이트",
  },
  {
    href:"/pipeline-runner", icon:Play, label:"Pipeline Runner", sub:"파이프라인 실행", color:"violet", section:"STEP 2",
    who:"데이터 담당자 · IT팀",
    when:"정기 배치 실행 / 수동 재실행 / ML 파이프라인 실행",
    howto:["파이프라인 목록에서 실행할 항목 선택","실행 버튼 → 단계별 진행 현황 모니터링","ML 탭 → AI-Ready 7단계 진행률 및 알고리즘 선택 확인","실행 이력 탭 → 과거 실행 결과·소요시간 확인"],
    output:"ETL 파이프라인 실행 결과·로그",
  },
  {
    href:"/data-lineage", icon:GitMerge, label:"Data Lineage", sub:"필드 단위 계보 추적", color:"violet", section:"STEP 2",
    who:"데이터 담당자 · 품질팀",
    when:"데이터 출처 확인 / 영향도 분석 / 장애 원인 추적",
    howto:["DAG 뷰 → 소스에서 MART까지 흐름 시각화","노드 클릭 → 상위/하위 필드 연결 상세","DW 아키텍처 탭 → ETL→ODS→DW→MART 레이어별 품질 확인","검색창에 컬럼명 입력 → 계보 필터"],
    output:"데이터 출처·변환 이력·영향 범위",
  },
  {
    href:"/quality", icon:CheckCircle, label:"Quality Validator", sub:"품질 검증", color:"violet", section:"STEP 2",
    who:"데이터 담당자 · 품질팀",
    when:"적재 완료 후 / 이상 알림 발생 시 / 월간 점검",
    howto:["AI-Ready 6단계 비중 막대로 전체 현황 파악","소스별 품질 점수·이슈 유형(Null/형식/중복/이상치) 확인","품질 클리닉 탭 → AI 추천 개선 조치 적용","Human Review로 전달할 항목 큐잉"],
    output:"품질 점수·이슈 목록·개선 권고",
  },
  {
    href:"/human-review", icon:ClipboardCheck, label:"Human Review", sub:"AI 저신뢰 항목 검토", color:"violet", section:"STEP 2",
    who:"데이터 담당자 · 품질팀",
    when:"신뢰도 80% 미만 매핑 발생 시 / 주간 배치",
    howto:["HIGH 우선순위 항목부터 처리","원본 샘플값과 Canonical 후보 비교","승인·거부·대안 입력 후 저장","처리 완료 항목은 Schema Mapping에 자동 반영"],
    output:"검토 완료 매핑·거버넌스 이력",
  },
  {
    href:"/entity-resolution", icon:Users, label:"Entity Resolution", sub:"엔티티 통합", color:"violet", section:"STEP 2",
    who:"데이터 담당자",
    when:"거래처명·품목명 중복 엔티티 발견 시",
    howto:["후보 중복 쌍 목록 확인 (유사도 점수)","동일 엔티티 확인 → 통합 또는 분리","통합 결과 Schema Mapping에 반영"],
    output:"표준화된 단일 엔티티 키 목록",
  },
  {
    href:"/data-cleaner", icon:Sparkles, label:"Data Cleaner", sub:"날짜·단위·중복 정제", color:"violet", section:"STEP 2",
    who:"데이터 담당자",
    when:"적재 후 품질 이슈(날짜 형식 혼재·단위 불일치·중복 행) 발견 시",
    howto:["이슈 유형 선택 — 날짜/단위/중복/이상치/공백","대상 소스·컬럼 선택 후 정제 룰 미리보기","변환 전·후 샘플 비교 확인","적용 버튼 → 변환 결과를 ODS 레이어에 반영","이력 탭에서 적용된 정제 룰 관리"],
    output:"정제 완료 데이터 + 룰 이력 로그",
  },
  {
    href:"/auto-onboarding", icon:Cpu, label:"Auto Onboarding", sub:"AI 자율 파이프라인", color:"violet", section:"STEP 2",
    who:"데이터 담당자 · IT팀",
    when:"신규 소스 등록 후 반복 온보딩 자동화 원할 때",
    howto:["소스 선택 후 AI 자동 분석 시작","AI가 스키마 매핑·정제룰·파이프라인을 자동 제안","제안 결과 검토 후 일괄 승인 또는 개별 수정","스케줄 등록 → 이후 자동 실행","Auto Onboarding 이력에서 AI 결정 근거 확인"],
    output:"자동 생성된 파이프라인·매핑 초안",
  },
  /* STEP 3 */
  {
    href:"/ax-chat", icon:MessageSquareText, label:"AX Chat", sub:"LLM 자연어 질의", color:"emerald", section:"STEP 3",
    who:"전 직원",
    when:"데이터 관련 질문이 생길 때마다",
    howto:["한국어로 자연스럽게 질문 입력","ERP 용어·모델번호 그대로 사용 가능","답변의 근거 데이터 소스 링크 클릭해 확인","불만족 시 '자세히' 또는 '/graphrag' 전환"],
    output:"자연어 답변 + 데이터 근거",
  },
  {
    href:"/graphrag", icon:MessageSquareText, label:"GraphRAG Demo", sub:"지식 그래프 질의", color:"emerald", section:"STEP 3",
    who:"데이터 담당자 · 품질팀",
    when:"복잡한 크로스 시스템 연관 분석 시",
    howto:["E2E 탭 → PLM·ERP·MES·QMS 4시스템 연계도 확인","Quality Escape 탭 → 불량 발생 경로 6단계 역추적","자연어 질의 탭 → 그래프 기반 답변"],
    output:"시스템 간 연계 분석 결과",
  },
  {
    href:"/graph", icon:Share2, label:"Graph Preview", sub:"지식 그래프 시각화", color:"emerald", section:"STEP 3",
    who:"데이터 담당자 · IT팀",
    when:"엔티티 관계 구조 파악 / 온톨로지 검증 시",
    howto:["노드 유형(제품·거래처·설비·문서) 선택해 필터","노드 클릭 → 연결된 엔티티·관계 상세 확인","확대/축소·드래그로 서브그래프 탐색","관계 엣지 클릭 → 연결 근거 데이터 소스 확인"],
    output:"엔티티 관계 맵 시각화",
  },
  {
    href:"/agent-monitor", icon:Bot, label:"Agent Monitor", sub:"AI 결정 로그", color:"emerald", section:"STEP 3",
    who:"IT팀 · 데이터 담당자",
    when:"AI 답변 근거 확인 / 자동 처리 감사 시",
    howto:["에이전트별 실행 이력 타임라인 확인","각 결정 클릭 → 입력 컨텍스트·추론 과정·신뢰도 상세","이상 판단 또는 오류 결정 → Human Review로 에스컬레이션","정기적으로 AI 결정 정확도 리뷰 후 룰 조정"],
    output:"AI 결정 감사 로그 · 신뢰도 지표",
  },
  /* 운영 */
  {
    href:"/", icon:LayoutDashboard, label:"대시보드", sub:"AX 전환 현황", color:"slate", section:"운영 관리",
    who:"관리자 · 전 직원",
    when:"매일 업무 시작 시 / 경영진 브리핑 전",
    howto:["AI-Ready 전체 점수·소스별 연결 현황 한눈에 확인","알림 배지 클릭 → 에러 소스·품질 경고 즉시 이동","최근 적재 이벤트 피드로 변경사항 파악","KPI 카드에서 총 행수·매핑률·품질점수 추이 확인"],
    output:"플랫폼 전체 현황 요약",
  },
  {
    href:"/mes-viewer", icon:Factory, label:"MES Viewer", sub:"공정·설비 현황", color:"slate", section:"운영 관리",
    who:"생산팀 · 운영팀",
    when:"교대 시작 / 공정 이상 발생 시",
    howto:["공정별 실적·목표 대비 달성률 확인","설비 가동·정지 현황 실시간 조회","불량 발생 라인 클릭 → 상세 원인 드릴다운"],
    output:"공정 KPI · 설비 가동률",
  },
  {
    href:"/supply-chain-twin", icon:NetworkIcon, label:"Supply Chain Twin", sub:"공급망 디지털 트윈", color:"slate", section:"운영 관리",
    who:"구매팀 · 운영팀",
    when:"납기 위험 / 재고 부족 / 공급망 이슈 발생 시",
    howto:["공급망 지도에서 협력사·재고·운송 현황 확인","위험 노드 클릭 → 대체 공급사·재고 옵션 확인","시나리오 시뮬레이션으로 납기 영향 분석"],
    output:"공급망 가시성 · 리스크 분석",
  },
  {
    href:"/governance", icon:ShieldCheck, label:"Governance", sub:"오너십·SLA·컴플라이언스", color:"slate", section:"운영 관리",
    who:"관리자 · 데이터 담당자",
    when:"월간 컴플라이언스 점검 / SLA 위반 기록 / 감사 대응",
    howto:["데이터 오너십 현황 확인·변경","SLA 달성률 및 위반 이력 조회","컴플라이언스 체크리스트 처리","감사용 데이터 접근 로그 다운로드"],
    output:"컴플라이언스 보고서 · SLA 지표",
  },
  {
    href:"/onboarding-report", icon:FileBarChart2, label:"Onboarding Report", sub:"AI-Readiness 리포트", color:"slate", section:"운영 관리",
    who:"관리자 · 데이터 담당자",
    when:"경영 보고 / 소스 온보딩 완료 시",
    howto:["소스별 AI-Readiness 점수 확인","미완료 항목 로드맵 확인","PDF 보고서 내보내기"],
    output:"AI-Readiness 종합 점수 보고서",
  },
  {
    href:"/aps-planner", icon:CalendarClock, label:"APS Planner", sub:"수급 계획·납기 관리", color:"slate", section:"운영 관리",
    who:"생산팀 · 구매팀 · 운영팀",
    when:"납기 위험 주문 발생 / 생산 계획 수립 / 원자재 수급 조정 시",
    howto:["납기 위험 주문 목록 확인 — 긴급도 순 정렬","생산 자원(설비·인력·자재) 가용 현황 확인","드래그앤드롭으로 생산 순서 재배치","시뮬레이션 실행 → 납기 달성 가능 여부 예측","확정 후 MES에 작업지시 전달"],
    output:"생산 계획·납기 시뮬레이션 결과",
  },
  {
    href:"/eco-tracker", icon:SearchCode, label:"ECO Tracker", sub:"Quality Escape 추적", color:"slate", section:"운영 관리",
    who:"품질팀 · 생산기술팀",
    when:"불량 자재·설계 변경 영향 SN 추적 필요 시",
    howto:["ECO 번호 또는 불량 자재 코드 입력","영향 SN 범위 자동 계산 — LOT 역추적 6단계","영향받은 완제품 출고 이력 및 고객사 확인","시정조치 등록 후 재검사 스케줄 연동","Governance에 보고서 자동 생성"],
    output:"영향 SN 목록 · 추적 경로 보고서",
  },
  {
    href:"/maintenance", icon:Wrench, label:"Maintenance", sub:"설비 보전·예지정비", color:"slate", section:"운영 관리",
    who:"설비팀 · 생산팀",
    when:"설비 이상 알림 수신 / 정기 보전 계획 수립 시",
    howto:["설비별 이상 징후 AI 알림 확인 (진동·온도·전류)","예측 고장 시점 및 권고 정비 항목 검토","정비 작업지시 생성 → 담당자 배정","정비 이력 기록 후 KPI(MTBF·MTTR) 업데이트","스페어파츠 재고 연동 현황 확인"],
    output:"정비 작업지시 · MTBF/MTTR KPI",
  },
  {
    href:"/energy", icon:Zap, label:"Energy Monitor", sub:"전력·가스 소비 모니터링", color:"slate", section:"운영 관리",
    who:"설비팀 · 생산팀 · 관리자",
    when:"에너지 비용 이상 증가 / 환경 목표 관리 시",
    howto:["공정별·설비별 전력 소비 실시간 확인","원단위(kWh/EA) 목표 대비 실적 비교","Peak 구간 알림 설정 및 절감 권고 확인","월별 에너지 비용·탄소 배출 트렌드 리포트","이상 소비 설비 클릭 → Maintenance 연동"],
    output:"에너지 소비 리포트 · 절감 권고",
  },
  {
    href:"/milieu", icon:Globe, label:"Milieu Monitor", sub:"외부환경·공급망 기후", color:"slate", section:"운영 관리",
    who:"구매팀 · 운영팀",
    when:"기상 이상·지정학적 리스크·물류 지연 징후 발생 시",
    howto:["주요 협력사 위치 기준 기상·물류 리스크 인덱스 확인","리스크 레벨 HIGH 이벤트 클릭 → 영향 범위 분석","Supply Chain Twin 연동 → 재고·납기 영향 시뮬레이션","리스크 알림 구독 설정 (협력사·품목·지역 기준)"],
    output:"외부환경 리스크 지수 · 공급망 영향 분석",
  },
  {
    href:"/news-monitor", icon:Newspaper, label:"News Monitor", sub:"공급망 위험 탐지", color:"slate", section:"운영 관리",
    who:"구매팀 · 운영팀",
    when:"협력사·원자재 관련 위험 뉴스 모니터링 시",
    howto:["관심 키워드(협력사명·원자재·지역) 등록","AI 요약 카드로 관련 뉴스 빠르게 파악","위험도 HIGH 뉴스 클릭 → 상세 기사 및 영향 분석","AX Chat에 '이 뉴스 우리 재고에 영향 있나?' 즉시 질의","알림 구독 설정 → 이메일·메신저 수신"],
    output:"공급망 위험 뉴스 요약 · 영향 분석",
  },
  {
    href:"/roadmap", icon:Map, label:"Roadmap", sub:"개발 현황 · 내부용", color:"slate", section:"운영 관리",
    who:"IT팀 · 관리자",
    when:"기능 개발 현황 확인 / 우선순위 논의 시",
    howto:["완료·진행중·예정 기능 현황 확인","기능 요청 카드 등록 (담당팀·우선순위·일정)","마일스톤별 진행률 추적","릴리즈 노트 확인"],
    output:"개발 로드맵 현황 보고",
  },
];

// ─── 컴포넌트 ────────────────────────────────────────────────────
function MenuBadge({ menu }: { menu: MenuRef }) {
  return (
    <Link href={menu.href}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${COLOR[menu.color].badge} hover:opacity-80 transition-opacity`}>
      {menu.label}
      <ChevronRight className="w-3 h-3"/>
    </Link>
  );
}

function ScenarioCard({ sc, active, onToggle }: { sc: Scenario; active: boolean; onToggle: () => void }) {
  return (
    <div className={`rounded-xl border transition-all ${active?"border-slate-300 shadow-md":"border-slate-200 hover:border-slate-300"}`}>
      <button className="w-full text-left px-5 py-4 flex items-center gap-4" onClick={onToggle}>
        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-sm font-bold shrink-0">
          {sc.id}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 text-sm">{sc.title}</span>
            <span className="text-xs text-slate-400">{sc.trigger}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {sc.roles.map(r=>(
              <span key={r} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ROLE_META[r].bg} ${ROLE_META[r].color}`}>
                {ROLE_META[r].label}
              </span>
            ))}
            <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3"/>{sc.freq}</span>
          </div>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-transform ${active?"border-slate-400 rotate-90":"border-slate-300"}`}>
          <ChevronRight className="w-3 h-3 text-slate-400"/>
        </div>
      </button>

      {active && (
        <div className="px-5 pb-5 border-t border-slate-100 pt-4">
          <div className="space-y-3">
            {sc.steps.map(step=>(
              <div key={step.no} className="flex gap-3">
                <div className={`w-6 h-6 rounded-full ${COLOR[step.menu.color].dot} text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5`}>
                  {step.no}
                </div>
                <div className="flex-1">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className="text-sm text-slate-700 flex-1">{step.action}</span>
                    <MenuBadge menu={step.menu}/>
                  </div>
                  {step.tip && (
                    <div className="flex items-start gap-1.5 mt-1.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5"/>
                      <span className="text-xs text-amber-700">{step.tip}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuDocCard({ doc }: { doc: MenuDoc }) {
  const [open, setOpen] = useState(false);
  const Icon = doc.icon;
  return (
    <div className={`rounded-xl border ${COLOR[doc.color].border} bg-white`}>
      <button className="w-full text-left p-4 flex items-center gap-3" onClick={()=>setOpen(o=>!o)}>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${COLOR[doc.color].badge}`}>
          <Icon className="w-4 h-4"/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{doc.section}</span>
          </div>
          <div className="font-semibold text-slate-900 text-sm leading-tight">{doc.label}</div>
          <div className="text-xs text-slate-500">{doc.sub}</div>
        </div>
        <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${open?"rotate-90":""}`}/>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-slate-400 font-semibold mb-1 flex items-center gap-1"><User className="w-3 h-3"/>담당자</div>
              <div className="text-slate-700">{doc.who}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-slate-400 font-semibold mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/>사용 시점</div>
              <div className="text-slate-700">{doc.when}</div>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-2">사용 방법</div>
            <ol className="space-y-1.5">
              {doc.howto.map((h,i)=>(
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <span className={`w-4 h-4 rounded-full ${COLOR[doc.color].badge} flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5`}>{i+1}</span>
                  {h}
                </li>
              ))}
            </ol>
          </div>
          <div className={`flex items-center gap-2 text-xs ${COLOR[doc.color].text} bg-slate-50 rounded-lg px-3 py-2`}>
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0"/>
            <span><span className="font-semibold">산출물:</span> {doc.output}</span>
          </div>
          <Link href={doc.href}
            className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-semibold ${COLOR[doc.color].badge} hover:opacity-90 transition-opacity`}>
            {doc.label} 바로가기 <ArrowRight className="w-3.5 h-3.5"/>
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── 페이지 ──────────────────────────────────────────────────────
export default function GuidePage() {
  const [tab, setTab] = useState<"scenario"|"menu">("scenario");
  const [roleFilter, setRoleFilter] = useState<Role|"all">("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [activeScenario, setActiveScenario] = useState<string|null>("S01");

  const filteredScenarios = SCENARIOS.filter(s =>
    roleFilter === "all" || s.roles.includes(roleFilter as Role)
  );

  const sections = ["all","STEP 1","STEP 2","STEP 3","운영 관리"];
  const filteredMenus = MENU_DOCS.filter(m =>
    sectionFilter === "all" || m.section === sectionFilter
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white"/>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">DeepSeeHub 운영 가이드</h1>
            <p className="text-sm text-slate-500">사용자 시나리오 × 메뉴 매핑 — 실무 운영자를 위한 단계별 안내</p>
          </div>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label:"전체 메뉴", value:`${MENU_DOCS.length}개`, color:"bg-blue-50 text-blue-700 border-blue-200" },
            { label:"운영 시나리오", value:`${SCENARIOS.length}개`, color:"bg-violet-50 text-violet-700 border-violet-200" },
            { label:"담당 역할", value:"5종", color:"bg-emerald-50 text-emerald-700 border-emerald-200" },
            { label:"YH ERP 소스", value:"5개 · 52컬럼", color:"bg-rose-50 text-rose-700 border-rose-200" },
          ].map(c=>(
            <div key={c.label} className={`rounded-xl border px-4 py-3 ${c.color}`}>
              <div className="text-xs font-medium opacity-70">{c.label}</div>
              <div className="text-lg font-bold mt-0.5">{c.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        {([["scenario","시나리오별 워크플로우"],["menu","메뉴별 운영 가이드"]] as const).map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab===k?"bg-white text-slate-900 shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ─── 시나리오 탭 ─── */}
      {tab === "scenario" && (
        <div>
          {/* 역할 필터 */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs text-slate-500 font-semibold">역할 필터:</span>
            <button onClick={()=>setRoleFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${roleFilter==="all"?"bg-slate-900 text-white border-slate-900":"bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
              전체
            </button>
            {(Object.keys(ROLE_META) as Role[]).map(r=>{
              const m = ROLE_META[r];
              return (
                <button key={r} onClick={()=>setRoleFilter(roleFilter===r?"all":r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${roleFilter===r?`${m.bg} ${m.color} border-current`:"bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* 시나리오 플로우 요약 */}
          <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-xs font-semibold text-slate-500 mb-3">표준 운영 흐름 (3 STEP)</div>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label:"STEP 1 적재", items:["Source Registry","Ingest","Sensor Gateway"], color:"blue" as StepColor },
                { label:"STEP 2 표준화", items:["Schema Mapping","Ontology","Pipeline","Quality"], color:"violet" as StepColor },
                { label:"STEP 3 AI 분석", items:["AX Chat","GraphRAG","Graph"], color:"emerald" as StepColor },
                { label:"운영", items:["MES Viewer","Governance","Onboarding Report"], color:"slate" as StepColor },
              ].map((s,i)=>(
                <div key={s.label} className="flex items-center gap-2">
                  {i>0&&<ArrowRight className="w-4 h-4 text-slate-300 shrink-0"/>}
                  <div className={`rounded-lg border px-3 py-2 ${COLOR[s.color].border} bg-white`}>
                    <div className={`text-xs font-bold ${COLOR[s.color].text} mb-1`}>{s.label}</div>
                    <div className="flex flex-wrap gap-1">
                      {s.items.map(it=>(
                        <span key={it} className={`text-[10px] px-1.5 py-0.5 rounded ${COLOR[s.color].badge}`}>{it}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 시나리오 카드 목록 */}
          <div className="space-y-3">
            {filteredScenarios.map(sc=>(
              <ScenarioCard key={sc.id} sc={sc}
                active={activeScenario===sc.id}
                onToggle={()=>setActiveScenario(activeScenario===sc.id?null:sc.id)}/>
            ))}
            {filteredScenarios.length===0&&(
              <div className="text-center py-12 text-slate-400 text-sm">해당 역할의 시나리오가 없습니다.</div>
            )}
          </div>
        </div>
      )}

      {/* ─── 메뉴 탭 ─── */}
      {tab === "menu" && (
        <div>
          {/* 섹션 필터 */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs text-slate-500 font-semibold">섹션:</span>
            {sections.map(s=>(
              <button key={s} onClick={()=>setSectionFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${sectionFilter===s?"bg-slate-900 text-white border-slate-900":"bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
                {s==="all"?"전체":s}
              </button>
            ))}
          </div>

          {/* 역할별 담당 메뉴 요약 */}
          <div className="mb-5 rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 text-xs font-semibold text-slate-500">역할별 주요 메뉴</div>
            <div className="divide-y divide-slate-50">
              {(Object.keys(ROLE_META) as Role[]).map(r=>{
                const m = ROLE_META[r];
                const RIcon = m.icon;
                const myMenus = MENU_DOCS.filter(d=>
                  SCENARIOS.some(sc=>sc.roles.includes(r) && sc.steps.some(st=>st.menu.href===d.href))
                );
                return (
                  <div key={r} className="px-4 py-3 flex items-start gap-3">
                    <div className={`flex items-center gap-1.5 text-xs font-semibold w-28 shrink-0 ${m.color}`}>
                      <RIcon className="w-3.5 h-3.5"/>
                      {m.label}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {myMenus.map(d=>(
                        <Link key={d.href} href={d.href}
                          className={`text-xs px-2 py-0.5 rounded-full border ${COLOR[d.color].badge} ${COLOR[d.color].border} hover:opacity-80`}>
                          {d.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 메뉴 카드 그리드 */}
          <div className="grid grid-cols-2 gap-3">
            {filteredMenus.map(doc=>(
              <MenuDocCard key={doc.href} doc={doc}/>
            ))}
          </div>
        </div>
      )}

      {/* 하단 빠른 참조 */}
      <div className="mt-8 p-4 bg-slate-900 rounded-xl text-white">
        <div className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-400"/>
          YH ERP 담당자 빠른 참조
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs">
          {[
            { title:"원가 적재", desc:"Sources id:13 → Pipeline Runner COS → Schema Mapping id:25~30", href:"/sources" },
            { title:"품질 검사", desc:"Sources id:15 QMM → Quality Validator → Human Review (iqc_no·bad_qty)", href:"/quality" },
            { title:"인사/급여", desc:"Sources id:14 → Schema Mapping id:48~59 (emp_no·pay_amt·in_tax)", href:"/schema-mapping" },
            { title:"재고 확인", desc:"Sources id:17 CAM/LEB → GraphRAG '이번달 재고 현황'", href:"/graphrag" },
            { title:"생산 현황", desc:"Sources id:16 PPZ → MES Viewer → Pipeline Runner ML 탭", href:"/mes-viewer" },
            { title:"자산 관리", desc:"Sources id:13 FAT → Schema Mapping id:40~47 (mng_no·get_amt·biz_no)", href:"/schema-mapping" },
          ].map(q=>(
            <Link key={q.title} href={q.href}
              className="bg-white/10 hover:bg-white/15 rounded-lg p-3 transition-colors group">
              <div className="font-semibold text-white mb-1 group-hover:text-amber-300 transition-colors">{q.title}</div>
              <div className="text-slate-400 leading-relaxed">{q.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
