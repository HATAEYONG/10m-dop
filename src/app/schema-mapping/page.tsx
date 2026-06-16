"use client";

import { useState } from "react";
import { Check, X, ChevronDown, Search } from "lucide-react";

type MappingStatus = "approved" | "pending" | "rejected";

const mappings = [
  { id: 1, source: "A업체 더존 ERP", srcCol: "CUST_CD", srcType: "VARCHAR(20)", canonical: "Customer.customer_id", confidence: 96, status: "approved" as MappingStatus, note: "" },
  { id: 2, source: "A업체 더존 ERP", srcCol: "CUST_NM", srcType: "NVARCHAR(100)", canonical: "Customer.name", confidence: 94, status: "approved" as MappingStatus, note: "" },
  { id: 3, source: "A업체 더존 ERP", srcCol: "ITEM_CD", srcType: "VARCHAR(30)", canonical: "Product.product_id", confidence: 91, status: "approved" as MappingStatus, note: "" },
  { id: 4, source: "A업체 더존 ERP", srcCol: "ITEM_NM", srcType: "NVARCHAR(200)", canonical: "Product.name", confidence: 89, status: "approved" as MappingStatus, note: "" },
  { id: 5, source: "A업체 더존 ERP", srcCol: "QTY", srcType: "DECIMAL(18,4)", canonical: "OrderLine.quantity", confidence: 87, status: "pending" as MappingStatus, note: "단위 불명확 (EA vs KG)" },
  { id: 6, source: "A업체 더존 ERP", srcCol: "AMT", srcType: "DECIMAL(18,2)", canonical: "OrderLine.amount_krw", confidence: 82, status: "pending" as MappingStatus, note: "통화 KRW 확인 필요" },
  { id: 7, source: "A업체 더존 ERP", srcCol: "ORD_DT", srcType: "VARCHAR(8)", canonical: "Order.order_date", confidence: 78, status: "pending" as MappingStatus, note: "YYYYMMDD 형식 → ISO 8601 변환 필요" },
  { id: 8, source: "A업체 Excel BOM", srcCol: "품번", srcType: "TEXT", canonical: "Product.product_id", confidence: 72, status: "pending" as MappingStatus, note: "ITEM_CD와 동일 엔티티 여부 확인" },
  { id: 9, source: "A업체 Excel BOM", srcCol: "자재코드", srcType: "TEXT", canonical: "Material.material_id", confidence: 85, status: "pending" as MappingStatus, note: "" },
  { id: 10, source: "A업체 Excel BOM", srcCol: "소요량", srcType: "TEXT", canonical: "BOM.quantity_per", confidence: 88, status: "pending" as MappingStatus, note: "" },
  { id: 11, source: "B업체 SAP ERP", srcCol: "MATNR", srcType: "CHAR(18)", canonical: "Material.material_id", confidence: 97, status: "approved" as MappingStatus, note: "" },
  { id: 12, source: "B업체 SAP ERP", srcCol: "MAKTX", srcType: "CHAR(40)", canonical: "Material.name", confidence: 95, status: "approved" as MappingStatus, note: "" },
  { id: 13, source: "B업체 SAP ERP", srcCol: "WERKS", srcType: "CHAR(4)", canonical: "Plant.plant_id", confidence: 91, status: "approved" as MappingStatus, note: "" },
  { id: 14, source: "C업체 수기 Excel", srcCol: "거래처", srcType: "TEXT", canonical: "Customer.name", confidence: 61, status: "pending" as MappingStatus, note: "표기 불일치 다수 — Entity Resolution 선행 필요" },
  { id: 15, source: "C업체 수기 Excel", srcCol: "납기일", srcType: "TEXT", canonical: "Order.due_date", confidence: 58, status: "pending" as MappingStatus, note: "다양한 날짜 형식 혼재" },
  { id: 16, source: "D업체 Odoo", srcCol: "partner_id", srcType: "INTEGER", canonical: "Customer.customer_id", confidence: 93, status: "approved" as MappingStatus, note: "" },
  { id: 17, source: "D업체 Odoo", srcCol: "product_tmpl_id", srcType: "INTEGER", canonical: "Product.product_id", confidence: 90, status: "approved" as MappingStatus, note: "" },
];

const confColor = (c: number) => c >= 90 ? "text-emerald-600" : c >= 75 ? "text-blue-600" : "text-amber-600";
const confBg = (c: number) => c >= 90 ? "bg-emerald-50" : c >= 75 ? "bg-blue-50" : "bg-amber-50";

export default function SchemaMapping() {
  const [items, setItems] = useState(mappings);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<MappingStatus | "all">("all");

  function approve(id: number) {
    setItems(prev => prev.map(m => m.id === id ? { ...m, status: "approved" as MappingStatus } : m));
  }
  function reject(id: number) {
    setItems(prev => prev.map(m => m.id === id ? { ...m, status: "rejected" as MappingStatus } : m));
  }

  const filtered = items
    .filter(m => filterStatus === "all" || m.status === filterStatus)
    .filter(m => !search || m.srcCol.toLowerCase().includes(search.toLowerCase()) || m.canonical.toLowerCase().includes(search.toLowerCase()) || m.source.toLowerCase().includes(search.toLowerCase()));

  const pending = items.filter(m => m.status === "pending").length;
  const approved = items.filter(m => m.status === "approved").length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Schema Mapping</h1>
        <p className="text-slate-500 mt-1">업체별 컬럼을 Canonical 표준 필드에 매핑</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-2xl font-bold text-slate-900">{items.length}</div>
          <div className="text-sm text-slate-500">전체 매핑</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-emerald-700">{approved}</div>
          <div className="text-sm text-emerald-600">승인 완료</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-amber-700">{pending}</div>
          <div className="text-sm text-amber-600">승인 대기</div>
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="컬럼명, 원천 검색..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-400"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "pending", "approved", "rejected"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filterStatus === s ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}
            >
              {s === "all" ? "전체" : s === "pending" ? "대기" : s === "approved" ? "승인" : "거절"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["원천", "원천 컬럼", "타입", "Canonical Field", "신뢰도", "상태", "비고", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(m => (
              <tr key={m.id} className={`transition-colors ${m.status === "rejected" ? "opacity-50 bg-slate-50" : "hover:bg-slate-50"}`}>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{m.source}</td>
                <td className="px-4 py-3 font-mono font-medium text-slate-900 text-xs">{m.srcCol}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">{m.srcType}</td>
                <td className="px-4 py-3 font-mono text-xs text-blue-700 font-medium">{m.canonical}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${confBg(m.confidence)} ${confColor(m.confidence)}`}>
                    {m.confidence}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  {m.status === "approved" && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">승인</span>}
                  {m.status === "pending" && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">대기</span>}
                  {m.status === "rejected" && <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-medium">거절</span>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-xs">{m.note || "-"}</td>
                <td className="px-4 py-3">
                  {m.status === "pending" && (
                    <div className="flex gap-1">
                      <button onClick={() => approve(m.id)} className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => reject(m.id)} className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
