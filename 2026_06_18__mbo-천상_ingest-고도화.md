# MBO — /ingest 고도화 (데이터 프로파일링 + 파이프라인 모니터)
승인: 2026-06-18 / A+B 모두
## 산출물
- 탭 5: 데이터 프로파일링 (컬럼별 null율·분포·이상값) ✅
- 탭 6: 파이프라인 모니터 (RAW→STAGING→CANONICAL 실시간 추적) ✅

## 결과 보고 (2026-06-18)
| 산출물 | 인도 | 검증 |
|--------|:---:|:---:|
| ProfileTab — 3개 테이블, 컬럼별 null율·유일값·이상경고·TopValues | O | npm run build 통과 |
| PipelineMonitorTab — 19 Job, 4단계 플로우, 실시간 row 카운터 | O | npm run build 통과 |
| git push → main 배포 | O | push 성공 |

최상위 목표 달성 ✅ — 빌드 0오류, main 배포 완료
