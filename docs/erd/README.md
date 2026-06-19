# DeepSeeHub 데이터 스키마 — ERD 문서

> 기반: LS Electric PLMDX 2026 발표 (이기호, 천안생산기술팀)  
> "PLM 설계변경(ECO) 이력과 제조 E2E 데이터를 잇는 온톨로지 기반 제조 챗봇 구축 사례"

---

## 전체 구조

```
PLM (설계 SSOT)  ──→  ERP (단가·BOM)
      │                     │
      └──→  MES (워크오더·실적·검사·자재)
                            │
                    QMS (시장 클레임)
                            │
                  ←── 6단계 Quality Escape 추적
```

연결 고리: **Dict 6종** (도메인 지식의 구조화 자산)

---

## 엔티티 목록

### PLM 도메인

| 테이블 | 설명 | 핵심 컬럼 |
|--------|------|----------|
| `ECO_HEADER` | 설계변경 헤더 | `ECO_NO` (끝 3자리=revision, D3), `ECO_EFF_DT` (D6) |
| `PLM_ITEM_MASTER` | 품목 마스터 | `SPG_CD` (D2), `SERIES_CD` |
| `ECO_BOM_ITEM` | ECO 영향 BOM | `ECO_NO`↔`ITEM_CD` N:1 |

### ERP 도메인

| 테이블 | 설명 | 핵심 컬럼 |
|--------|------|----------|
| `ERP_BOM` | 생산 BOM | `BOM_CHNG_DT` (D6 기준②, PLM+1~3일 지연) |
| `ERP_COST_RECORD` | 원가 기록 | `UNIT_COST`, `COST_YM` |

### MES 도메인

| 테이블 | 설명 | 핵심 컬럼 |
|--------|------|----------|
| `MES_WORKORDER` | 작업지시 | `SN` (D1), `LINE_CD` (D1), `WO_START_DT` (D6 기준③) |
| `TBL_MES_RESULT_INV` | INV 검사 결과 | `EQP_ID`→결과컬럼 (D4), `INRS_3`/`INRS_7` |
| `MATERIAL_TRAN` | 자재 불출 | **LOT_ID 없음** → D5 FIFO 역추적 필수 |

### QMS 도메인

| 테이블 | 설명 | 핵심 컬럼 |
|--------|------|----------|
| `QMS_CLAIM` | 시장 클레임 | `SN` (D1), `RPAR_YN`, `SPG_CD` (D2) |
| `QMS_8D_ACTION` | 8D 대응 이력 | `CLAIM_NO`↔`ECO_NO` (원인 ECO 연결) |

---

## Dict 6종 — 온톨로지 구조화 자산

> "이 Dict가 없으면 AI/챗봇이 추측·누락·환각으로 답한다"

| Dict | 테이블 | 내용 | 없으면 |
|------|--------|------|--------|
| **D1** | `DICT_D1_SN_STRUCTURE` | SN 30~32자리 파싱 규칙, EQP_ID 분해, 라인 코드 | 라인·설비 ID 잘못 매핑 |
| **D2** | `DICT_D2_PRODUCT_SPG` | SPG 550=INV, 500=PLC, 시리즈 계층 | 제품군 질의 오답 또는 합산 오류 |
| **D3** | `DICT_D3_ECO_REVISION` | ECO_NO 끝 3자리 = revision 식별자 | 같은 ECO를 N건으로 셈 → 영향 SN 1/N 토막 |
| **D4** | `DICT_D4_INV_COLUMN_MAP` | INVD08→INRS_3, INVD10→INRS_7 | D10 결과 누락 |
| **D5** | `DICT_D5_LOT_FIFO_ALGO` | MATERIAL_TRAN LOT_ID 없어 8단계 FIFO 역추적 | 자재 역추적 자체 불가 |
| **D6** | `DICT_D6_EFFECTIVE_DATE` | PLM·ERP·MES·FIFO 발효일 우선순위 (FIFO 실투입일=1순위) | 원가절감 실적 잘못 추정 |

---

## Quality Escape 6단계 추적 경로

```
QMS_CLAIM
    │ SN → MES_WORKORDER (D1: SN 구조)
    ↓
TBL_MES_RESULT_INV (D4: EQP_ID → 결과컬럼)
    │
    ↓ BOM revision 역추적
ECO_BOM_ITEM → ECO_HEADER (D3: ECO_NO revision)
    │
    ↓ 자재 투입 역추적
MATERIAL_TRAN (D5: 8단계 FIFO) + 발효일 기준 (D6)
```

---

## 파일

- [`schema.sql`](./schema.sql) — DDL + 기본 Dict 데이터 INSERT
