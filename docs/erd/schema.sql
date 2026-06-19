-- ============================================================
-- DeepSeeHub — 제조 E2E 데이터 스키마
-- 기반: LS Electric PLMDX 2026 발표 (이기호, 천안생산기술팀)
-- 생성: 2026-06-19
-- ============================================================
-- 구조: PLM → ERP → MES → QMS + DICT 6종 (온톨로지 구조화 자산)
-- ============================================================


-- ============================================================
-- [1] PLM 도메인
-- ============================================================

CREATE TABLE ECO_HEADER (
    ECO_NO          VARCHAR(9)   NOT NULL,   -- 앞 6자리=기본번호, 끝 3자리=revision (DICT_D3)
    ECO_TITLE       VARCHAR(200) NOT NULL,
    ECO_EFF_DT      DATE         NOT NULL,   -- PLM 발효일 (DICT_D6 기준 ①)
    RPAR_YN         CHAR(1)      NOT NULL DEFAULT 'N',  -- 재출현 이력 여부
    STATUS          VARCHAR(20)  NOT NULL,   -- DRAFT / APPROVED / EFFECTIVE
    CREATED_BY      VARCHAR(50),
    CREATED_DT      DATETIME,
    CONSTRAINT PK_ECO_HEADER PRIMARY KEY (ECO_NO),
    CONSTRAINT CK_RPAR CHECK (RPAR_YN IN ('Y','N'))
);

-- ECO_NO 끝 3자리 = revision 인스턴스 식별자 (DICT_D3)
-- 같은 변경의 rev①②③을 묶으려면 ECO_NO[:-3] 으로 GROUP BY
CREATE INDEX IX_ECO_BASE ON ECO_HEADER (LEFT(ECO_NO, 6));
CREATE INDEX IX_ECO_EFF_DT ON ECO_HEADER (ECO_EFF_DT);


CREATE TABLE PLM_ITEM_MASTER (
    ITEM_CD         VARCHAR(20)  NOT NULL,
    ITEM_NM         VARCHAR(100) NOT NULL,
    SPG_CD          VARCHAR(6),             -- 제품군 코드 (DICT_D2: 550=INV, 500=PLC)
    SERIES_CD       VARCHAR(10),            -- G100, XGB 등 시리즈 (DICT_D2 하위)
    UNIT            VARCHAR(10),
    REV             VARCHAR(10),
    CREATED_DT      DATETIME,
    CONSTRAINT PK_PLM_ITEM PRIMARY KEY (ITEM_CD)
);

CREATE INDEX IX_PLM_ITEM_SPG ON PLM_ITEM_MASTER (SPG_CD);


CREATE TABLE ECO_BOM_ITEM (
    ECO_BOM_SEQ     BIGINT       NOT NULL AUTO_INCREMENT,
    ECO_NO          VARCHAR(9)   NOT NULL,
    ITEM_CD         VARCHAR(20)  NOT NULL,
    PARENT_ITEM_CD  VARCHAR(20),
    BOM_REV         VARCHAR(10),
    QTY             DECIMAL(12,4) NOT NULL DEFAULT 1,
    CHANGE_TYPE     CHAR(1),                -- A=추가, D=삭제, M=변경
    CONSTRAINT PK_ECO_BOM PRIMARY KEY (ECO_BOM_SEQ),
    CONSTRAINT FK_ECO_BOM_ECO  FOREIGN KEY (ECO_NO)   REFERENCES ECO_HEADER (ECO_NO),
    CONSTRAINT FK_ECO_BOM_ITEM FOREIGN KEY (ITEM_CD)  REFERENCES PLM_ITEM_MASTER (ITEM_CD)
);

CREATE INDEX IX_ECO_BOM_NO   ON ECO_BOM_ITEM (ECO_NO);
CREATE INDEX IX_ECO_BOM_ITEM ON ECO_BOM_ITEM (ITEM_CD);


-- ============================================================
-- [2] ERP 도메인
-- ============================================================

CREATE TABLE ERP_BOM (
    BOM_ID          BIGINT       NOT NULL AUTO_INCREMENT,
    ITEM_CD         VARCHAR(20)  NOT NULL,
    PARENT_ITEM_CD  VARCHAR(20),
    BOM_QTY         DECIMAL(12,4) NOT NULL DEFAULT 1,
    BOM_CHNG_DT     DATE,                   -- ERP BOM 변경일 (DICT_D6 기준 ②, PLM+1~3일 지연)
    EFF_FROM_DT     DATE,
    EFF_TO_DT       DATE,
    PLANT_CD        VARCHAR(10),
    CONSTRAINT PK_ERP_BOM PRIMARY KEY (BOM_ID),
    CONSTRAINT FK_ERP_BOM_ITEM FOREIGN KEY (ITEM_CD) REFERENCES PLM_ITEM_MASTER (ITEM_CD)
);

CREATE INDEX IX_ERP_BOM_ITEM ON ERP_BOM (ITEM_CD);
CREATE INDEX IX_ERP_BOM_CHNG ON ERP_BOM (BOM_CHNG_DT);


CREATE TABLE ERP_COST_RECORD (
    COST_SEQ        BIGINT       NOT NULL AUTO_INCREMENT,
    ITEM_CD         VARCHAR(20)  NOT NULL,
    UNIT_COST       DECIMAL(15,4) NOT NULL,
    COST_YM         CHAR(6)      NOT NULL,  -- YYYYMM
    PLANT_CD        VARCHAR(10),
    CURRENCY        CHAR(3)      DEFAULT 'KRW',
    CREATED_DT      DATETIME,
    CONSTRAINT PK_ERP_COST PRIMARY KEY (COST_SEQ)
);

CREATE INDEX IX_ERP_COST_ITEM ON ERP_COST_RECORD (ITEM_CD, COST_YM);


-- ============================================================
-- [3] MES 도메인
-- ============================================================

CREATE TABLE MES_WORKORDER (
    WO_NO           VARCHAR(20)  NOT NULL,
    ITEM_CD         VARCHAR(20)  NOT NULL,
    SN              VARCHAR(32),            -- 30~32자리 구조 (DICT_D1)
    LINE_CD         VARCHAR(10),            -- 라인 코드 (DICT_D1: M01=1라인 등)
    EQP_ID          VARCHAR(20),            -- 설비 ID (DICT_D1: INVD1001_M01_T01 구조)
    WO_START_DT     DATETIME,               -- MES 워크오더 발효일 (DICT_D6 기준 ③)
    WO_END_DT       DATETIME,
    PLAN_QTY        DECIMAL(12,4),
    ACTUAL_QTY      DECIMAL(12,4),
    STATUS          VARCHAR(10),
    CONSTRAINT PK_MES_WO PRIMARY KEY (WO_NO),
    CONSTRAINT FK_MES_WO_ITEM FOREIGN KEY (ITEM_CD) REFERENCES PLM_ITEM_MASTER (ITEM_CD)
);

CREATE INDEX IX_MES_WO_SN      ON MES_WORKORDER (SN);
CREATE INDEX IX_MES_WO_LINE    ON MES_WORKORDER (LINE_CD);
CREATE INDEX IX_MES_WO_START   ON MES_WORKORDER (WO_START_DT);


-- INV 검사 결과 테이블
-- ⚠ 설비(EQP_ID)마다 결과 컬럼이 다름 → DICT_D4 필수
--   INVD08 → INRS_3 컬럼 사용
--   INVD10 → INRS_7 컬럼 사용
--   이 Dict 없이 조회하면 D10 결과가 누락됨
CREATE TABLE TBL_MES_RESULT_INV (
    INV_SEQ         BIGINT       NOT NULL AUTO_INCREMENT,
    WO_NO           VARCHAR(20)  NOT NULL,
    SN              VARCHAR(32),
    EQP_ID          VARCHAR(20)  NOT NULL,  -- DICT_D4 키
    INSP_DT         DATETIME     NOT NULL,
    INSP_ITEM       VARCHAR(100),
    -- 설비별 결과 컬럼 (DICT_D4로 어떤 컬럼을 읽을지 결정)
    INRS_1          DECIMAL(10,4),          -- 설비 그룹 A용
    INRS_2          DECIMAL(10,4),
    INRS_3          DECIMAL(10,4),          -- INVD08 결과 컬럼 (DICT_D4)
    INRS_4          DECIMAL(10,4),
    INRS_5          DECIMAL(10,4),
    INRS_6          DECIMAL(10,4),
    INRS_7          DECIMAL(10,4),          -- INVD10 결과 컬럼 (DICT_D4)
    JUDGE           CHAR(2)      NOT NULL,  -- OK / NG
    NOTE            VARCHAR(500),
    CONSTRAINT PK_MES_INV PRIMARY KEY (INV_SEQ),
    CONSTRAINT FK_MES_INV_WO FOREIGN KEY (WO_NO) REFERENCES MES_WORKORDER (WO_NO)
);

CREATE INDEX IX_MES_INV_SN    ON TBL_MES_RESULT_INV (SN);
CREATE INDEX IX_MES_INV_EQP   ON TBL_MES_RESULT_INV (EQP_ID);
CREATE INDEX IX_MES_INV_DT    ON TBL_MES_RESULT_INV (INSP_DT);


-- 자재 불출 이력
-- ⚠ LOT_ID 컬럼 없음 → DICT_D5 (8단계 FIFO 역추적)으로 LOT 추정
--   LLM 단독 추론 시도 = 환각의 입구
CREATE TABLE MATERIAL_TRAN (
    TRAN_SEQ        BIGINT       NOT NULL AUTO_INCREMENT,
    WO_NO           VARCHAR(20)  NOT NULL,
    ITEM_CD         VARCHAR(20)  NOT NULL,
    ISSUE_DT        DATETIME     NOT NULL,  -- DICT_D6 기준 ④ (FIFO 현장 실제 투입일)
    QTY             DECIMAL(12,4) NOT NULL,
    TRAN_TYPE       VARCHAR(10),            -- ISSUE / RETURN
    -- LOT_ID 없음 — DICT_D5 8단계 FIFO로 역추적
    CONSTRAINT PK_MAT_TRAN PRIMARY KEY (TRAN_SEQ),
    CONSTRAINT FK_MAT_TRAN_WO FOREIGN KEY (WO_NO) REFERENCES MES_WORKORDER (WO_NO)
);

CREATE INDEX IX_MAT_TRAN_WO   ON MATERIAL_TRAN (WO_NO);
CREATE INDEX IX_MAT_TRAN_ITEM ON MATERIAL_TRAN (ITEM_CD);
CREATE INDEX IX_MAT_TRAN_DT   ON MATERIAL_TRAN (ISSUE_DT);


-- ============================================================
-- [4] QMS 도메인
-- ============================================================

CREATE TABLE QMS_CLAIM (
    CLAIM_NO        VARCHAR(20)  NOT NULL,
    SN              VARCHAR(32),            -- DICT_D1: SN 구조로 파싱
    CLAIM_DT        DATE         NOT NULL,
    SYMPTOM         VARCHAR(500),
    RPAR_YN         CHAR(1)      DEFAULT 'N',
    PROD_CD         VARCHAR(20),
    SPG_CD          VARCHAR(6),             -- DICT_D2: 제품군 분류
    MFG_DT          DATE,                   -- 제조일 (SN에서 파싱 가능, DICT_D1)
    STATUS          VARCHAR(20),
    CONSTRAINT PK_QMS_CLAIM PRIMARY KEY (CLAIM_NO),
    CONSTRAINT CK_QMS_RPAR CHECK (RPAR_YN IN ('Y','N'))
);

CREATE INDEX IX_QMS_CLAIM_SN   ON QMS_CLAIM (SN);
CREATE INDEX IX_QMS_CLAIM_DT   ON QMS_CLAIM (CLAIM_DT);
CREATE INDEX IX_QMS_CLAIM_SPG  ON QMS_CLAIM (SPG_CD);


CREATE TABLE QMS_8D_ACTION (
    ACTION_SEQ      BIGINT       NOT NULL AUTO_INCREMENT,
    CLAIM_NO        VARCHAR(20)  NOT NULL,
    ECO_NO          VARCHAR(9),             -- 원인이 된 ECO (DICT_D3: revision 포함)
    ROOT_CAUSE      TEXT,
    ACTION_TYPE     VARCHAR(50),
    ACTION_DT       DATE,
    ASSIGNEE        VARCHAR(50),
    STATUS          VARCHAR(20),
    CONSTRAINT PK_8D PRIMARY KEY (ACTION_SEQ),
    CONSTRAINT FK_8D_CLAIM FOREIGN KEY (CLAIM_NO) REFERENCES QMS_CLAIM (CLAIM_NO),
    CONSTRAINT FK_8D_ECO   FOREIGN KEY (ECO_NO)   REFERENCES ECO_HEADER (ECO_NO)
);

CREATE INDEX IX_8D_CLAIM ON QMS_8D_ACTION (CLAIM_NO);
CREATE INDEX IX_8D_ECO   ON QMS_8D_ACTION (ECO_NO);


-- ============================================================
-- [5] DICT 6종 — 온톨로지 구조화 자산
-- 이 Dict 없이 AI/챗봇이 답하면: 추측·누락·환각
-- ============================================================

-- D1: SN 30~32자리 구조, EQP_ID 분해, 라인 코드
CREATE TABLE DICT_D1_SN_STRUCTURE (
    DICT_KEY        VARCHAR(50)  NOT NULL,  -- SN_PREFIX_LEN, EQP_ID_SEP, LINE_M01 ...
    DICT_VALUE      VARCHAR(100) NOT NULL,
    DESC_KO         VARCHAR(200),
    VERIFIED_YN     CHAR(1)      DEFAULT 'N',
    UPDATED_DT      DATETIME,
    CONSTRAINT PK_D1 PRIMARY KEY (DICT_KEY)
);

-- D2: SPG 제품군 코드 계층 (550=INV, 500=PLC, 시리즈=SPG 하위)
CREATE TABLE DICT_D2_PRODUCT_SPG (
    DICT_KEY        VARCHAR(50)  NOT NULL,  -- SPG_550, SERIES_G100 ...
    DICT_VALUE      VARCHAR(100) NOT NULL,  -- INV, SPG_550 ...
    PARENT_SPG      VARCHAR(10),
    DESC_KO         VARCHAR(200),
    VERIFIED_YN     CHAR(1)      DEFAULT 'N',
    UPDATED_DT      DATETIME,
    CONSTRAINT PK_D2 PRIMARY KEY (DICT_KEY)
);

-- D3: ECO_NO 끝 3자리 = revision 인스턴스 식별자
-- 이 Dict 없으면 같은 ECO를 N건으로 셈 → 영향 SN 집계가 1/N 토막
CREATE TABLE DICT_D3_ECO_REVISION (
    DICT_KEY        VARCHAR(50)  NOT NULL,  -- ECO_REV_SUFFIX_LEN, ECO_BASE_LEN ...
    DICT_VALUE      VARCHAR(100) NOT NULL,  -- 3, 6 ...
    DESC_KO         VARCHAR(200),
    VERIFIED_YN     CHAR(1)      DEFAULT 'Y',
    VERIFIED_DT     DATE,
    UPDATED_DT      DATETIME,
    CONSTRAINT PK_D3 PRIMARY KEY (DICT_KEY)
);

-- D4: INV 설비별 결과 컬럼 매핑
-- INVD08 → INRS_3, INVD10 → INRS_7
-- 이 Dict 없으면 D10 결과 누락
CREATE TABLE DICT_D4_INV_COLUMN_MAP (
    EQP_ID          VARCHAR(20)  NOT NULL,  -- INVD08, INVD10 ...
    RESULT_COL      VARCHAR(20)  NOT NULL,  -- INRS_3, INRS_7 ...
    DESC_KO         VARCHAR(200),
    VERIFIED_YN     CHAR(1)      DEFAULT 'N',
    UPDATED_DT      DATETIME,
    CONSTRAINT PK_D4 PRIMARY KEY (EQP_ID)
);

-- D5: MATERIAL_TRAN LOT_ID 없음 → 8단계 FIFO 역추적 알고리즘
-- 단계별 SQL 템플릿을 dict로 관리
CREATE TABLE DICT_D5_LOT_FIFO_ALGO (
    STEP_NO         INT          NOT NULL,  -- 1~8
    STEP_NM         VARCHAR(50)  NOT NULL,  -- WO조회, 자재Issue시점 ...
    STEP_DESC       VARCHAR(200),
    SQL_TEMPLATE    TEXT,                   -- 단계별 SQL (파라미터 플레이스홀더 포함)
    VERIFIED_YN     CHAR(1)      DEFAULT 'Y',
    VERIFIED_DT     DATE,
    UPDATED_DT      DATETIME,
    CONSTRAINT PK_D5 PRIMARY KEY (STEP_NO)
);

-- D6: PLM·ERP·MES·FIFO 발효일 매핑 규칙
-- 4개 시스템 발효일이 모두 다름 — 원가절감 실적 기준은 FIFO 실제 투입일
CREATE TABLE DICT_D6_EFFECTIVE_DATE (
    DICT_KEY        VARCHAR(50)  NOT NULL,  -- PLM_ECO_EFF_DATE, ERP_BOM_EFF_DATE ...
    SYSTEM_NM       VARCHAR(20)  NOT NULL,  -- PLM, ERP, MES, FIFO
    DATE_COL        VARCHAR(50)  NOT NULL,  -- 실제 컬럼명
    PRIORITY        INT,                    -- 1=최우선 (FIFO_ACTUAL=1)
    LAG_DAYS_MIN    INT          DEFAULT 0, -- 이전 시스템 대비 지연 최소일
    LAG_DAYS_MAX    INT          DEFAULT 0,
    DESC_KO         VARCHAR(200),
    VERIFIED_YN     CHAR(1)      DEFAULT 'Y',
    VERIFIED_DT     DATE,
    UPDATED_DT      DATETIME,
    CONSTRAINT PK_D6 PRIMARY KEY (DICT_KEY)
);


-- ============================================================
-- [6] 기본 Dict 데이터 삽입
-- ============================================================

INSERT INTO DICT_D1_SN_STRUCTURE VALUES
('SN_PREFIX_LEN',  '4',   'SN 앞 4자리 = 제품 시리즈 코드',              'Y', NOW()),
('SN_DATE_START',  '5',   'SN 5~10번째 = YYMMDD 제조일자',               'Y', NOW()),
('SN_SEQ_END',     '32',  'SN 마지막 6자리 = 일련번호',                   'Y', NOW()),
('EQP_ID_SEP',     '_',   'EQP_ID 구분자: 설비코드_라인_툴',               'Y', NOW()),
('LINE_M01',       '1라인 조립', 'M01 = 1라인 조립',                      'Y', NOW()),
('LINE_M02',       '2라인 조립', 'M02 = 2라인 조립',                      'Y', NOW());

INSERT INTO DICT_D2_PRODUCT_SPG VALUES
('SPG_550',    'INV',     NULL,      '인버터 제품군',                      'Y', NOW()),
('SPG_500',    'PLC',     NULL,      'PLC 제품군',                         'Y', NOW()),
('SPG_400',    'HMI',     NULL,      'HMI 제품군',                         'Y', NOW()),
('SERIES_G100','SPG_550', 'SPG_550', 'G100 시리즈 → 인버터 하위',          'Y', NOW()),
('SERIES_XGB', 'SPG_500', 'SPG_500', 'XGB 시리즈 → PLC 하위',             'Y', NOW());

INSERT INTO DICT_D3_ECO_REVISION VALUES
('ECO_REV_SUFFIX_LEN', '3',   'ECO_NO 끝 3자리 = revision 식별자', 'Y', '2026-05-20', NOW()),
('ECO_REV_FIRST',      '001', '최초 revision 코드',                'Y', '2026-05-20', NOW()),
('ECO_BASE_LEN',       '6',   'ECO_NO 앞 6자리 = 기본 변경 번호',  'Y', '2026-05-20', NOW());

INSERT INTO DICT_D4_INV_COLUMN_MAP VALUES
('INVD08', 'INRS_3', 'INVD08 설비 결과 컬럼', 'Y', NOW()),
('INVD09', 'INRS_5', 'INVD09 설비 결과 컬럼', 'Y', NOW()),
('INVD10', 'INRS_7', 'INVD10 설비 결과 컬럼', 'Y', NOW()),
('INVD11', 'INRS_7', 'INVD11 설비 결과 컬럼 (D10과 동일)', 'Y', NOW());

INSERT INTO DICT_D5_LOT_FIFO_ALGO VALUES
(1, 'WO 조회',         'SN → 워크오더 매핑',            'SELECT WO_NO FROM MES_WORKORDER WHERE SN = :sn', 'Y', '2026-05-28', NOW()),
(2, '자재 Issue 시점', 'WIP Issue / Job Schedule 조회',  'SELECT ISSUE_DT FROM MATERIAL_TRAN WHERE WO_NO = :wo_no', 'Y', '2026-05-28', NOW()),
(3, 'Job/Schedule 결합','시점 단일화',                   '-- COALESCE(JOB_DT, SCHEDULE_DT)',               'Y', '2026-05-28', NOW()),
(4, 'LOT 후보 집합',   '시간창 ±N일로 후보 추출',        '-- ISSUE_DT BETWEEN :dt - INTERVAL :n DAY AND :dt + INTERVAL :n DAY', 'Y', '2026-05-28', NOW()),
(5, 'FIFO 출고순 정렬','오래된 LOT 우선',                '-- ORDER BY RECEIPT_DT ASC',                    'Y', '2026-05-28', NOW()),
(6, 'LOT_ID 매핑 추정','WO ↔ LOT 대응',                 '-- RANK() OVER FIFO ORDER',                     'Y', '2026-05-28', NOW()),
(7, 'ECO 영향 자재 매칭','같은 ITEM_CD로 ECO 연결',      '-- JOIN ECO_BOM_ITEM ON ITEM_CD',               'Y', '2026-05-28', NOW()),
(8, 'confidence 산출', '0.0 ~ 1.0 스코어',              '-- FIFO_RANK / LOT_CANDIDATE_COUNT',            'Y', '2026-05-28', NOW());

INSERT INTO DICT_D6_EFFECTIVE_DATE VALUES
('PLM_ECO_EFF_DATE',  'PLM',  'ECO_EFF_DT',    4, 0, 0, 'PLM ECO 발효일 컬럼',                        'Y', '2026-06-01', NOW()),
('ERP_BOM_EFF_DATE',  'ERP',  'BOM_CHNG_DT',   3, 1, 3, 'ERP BOM 변경일 (PLM+1~3일 지연)',            'Y', '2026-06-01', NOW()),
('MES_WO_EFF_DATE',   'MES',  'WO_START_DT',   2, 0, 2, 'MES 워크오더 발효일 (ERP 이후)',             'Y', '2026-06-01', NOW()),
('FIFO_ACTUAL_DATE',  'FIFO', 'FIRST_ISSUE_DT',1, 0, 5, '현장 실제 자재 투입일 — 원가절감 기준',      'Y', '2026-06-01', NOW());
