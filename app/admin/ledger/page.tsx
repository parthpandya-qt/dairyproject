"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ITransaction, IExtraItem, ICustomer } from "@/types";

interface MonthCol {
  key: string; // YYYY-MM
  name: string; // e.g. "Jun 2026"
}

interface LedgerEntry {
  id: string; // e.g. "tx-12" or "ei-34"
  date: string;
  type: string;
  itemName: string;
  quantityText: string;
  quantity: number;
  rate: number;
  total: number;
  isDefault: boolean;
  morningQuantity: number;
  eveningQuantity: number;
  itemUnit: string;
  itemId: string | number;
}

function LedgerContent() {
  const searchParams = useSearchParams();
  const customerIdParam = searchParams.get("customerId");
  const monthParam = searchParams.get("month");

  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [extraItems, setExtraItems] = useState<IExtraItem[]>([]);
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [activeCustomer, setActiveCustomer] = useState<ICustomer | null>(null);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("all");
  const [editedValues, setEditedValues] = useState<
    Record<
      string,
      {
        morningQty: string;
        eveningQty: string;
        extraQty: string;
        allocatedPrice: string;
        extraPrice: string;
      }
    >
  >({});

  useEffect(() => {
    loadLedgerData();
  }, []);

  useEffect(() => {
    if (customers.length > 0 && customerIdParam) {
      const found = customers.find((c) => c._id === customerIdParam);
      if (found) {
        setActiveCustomer(found);
      }
    }
  }, [customerIdParam, customers]);

  useEffect(() => {
    if (monthParam) {
      setSelectedMonthFilter(monthParam);
    }
  }, [monthParam]);

  async function loadLedgerData() {
    setLoading(true);
    setError("");
    try {
      const [tRes, eRes, cRes] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/extra-items"),
        fetch("/api/customers"),
      ]);

      if (!tRes.ok || !eRes.ok || !cRes.ok) {
        throw new Error("Failed to load ledger data.");
      }

      const tData = await tRes.json();
      const eData = await eRes.json();
      const cData = await cRes.json();

      setTransactions(tData);
      setExtraItems(eData);
      setCustomers(cData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load ledger statements.");
    } finally {
      setLoading(false);
    }
  }

  // 1. Filter default transactions & extra items for selected customer
  const custTxs = activeCustomer
    ? transactions.filter((tx) => tx.customerId.toString() === activeCustomer._id)
    : [];
  const custExtras = activeCustomer
    ? extraItems.filter((ei) => ei.customerId.toString() === activeCustomer._id)
    : [];

  // 2. Map them to a unified format
  const rawLedgerEntries: LedgerEntry[] = [
    ...custTxs.map((tx) => ({
      id: `tx-${tx._id}`,
      date: tx.date,
      type: "Default Allocation",
      itemName: tx.itemName || "Dairy Item",
      quantityText: `${tx.morningQuantity > 0 ? `Morning: ${tx.morningQuantity}` : ""}${
        tx.morningQuantity > 0 && tx.eveningQuantity > 0 ? " | " : ""
      }${tx.eveningQuantity > 0 ? `Evening: ${tx.eveningQuantity}` : ""} ${tx.itemUnit || "L"}`,
      quantity: tx.morningQuantity + tx.eveningQuantity,
      rate: tx.pricePerUnit || tx.itemPrice || 0,
      total: tx.totalPrice,
      isDefault: true,
      morningQuantity: Number(tx.morningQuantity || 0),
      eveningQuantity: Number(tx.eveningQuantity || 0),
      itemUnit: tx.itemUnit || "L",
      itemId: tx.itemId,
    })),
    ...custExtras.map((ei) => ({
      id: `ei-${ei._id}`,
      date: ei.date,
      type: "Extra Item",
      itemName: ei.itemName || "Extra Product",
      quantityText: `${ei.quantity} ${ei.itemUnit || "L"}`,
      quantity: ei.quantity,
      rate: ei.pricePerUnit || ei.itemPrice || 0,
      total: ei.totalPrice,
      isDefault: false,
      morningQuantity: 0,
      eveningQuantity: 0,
      itemUnit: ei.itemUnit || "L",
      itemId: ei.itemId,
    })),
  ];

  // 3. Sort oldest to newest for editing flow consistency
  rawLedgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 4. Initialize edited values mapping when data is loaded or customer selection changes
  useEffect(() => {
    const initialValues: typeof editedValues = {};
    rawLedgerEntries.forEach((entry) => {
      initialValues[entry.id] = {
        morningQty: entry.morningQuantity.toString(),
        eveningQty: entry.eveningQuantity.toString(),
        extraQty: (!entry.isDefault ? entry.quantity : 0).toString(),
        allocatedPrice: (entry.isDefault ? entry.total : 0).toString(),
        extraPrice: (!entry.isDefault ? entry.total : 0).toString(),
      };
    });
    setEditedValues(initialValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, extraItems, activeCustomer]);

  // 5. Filter entries based on selected month filter
  const filteredEntries = rawLedgerEntries.filter((entry) => {
    if (selectedMonthFilter === "all") return true;
    return entry.date.substring(0, 7) === selectedMonthFilter;
  });

  const allocatedEntries = filteredEntries.filter((entry) => entry.isDefault);
  const extraEntries = filteredEntries.filter((entry) => !entry.isDefault);

  const getCustomerActiveMonths = (cust: ICustomer): MonthCol[] => {
    const monthsSet = new Set<string>();
    const custTx = transactions.filter((tx) => tx.customerId.toString() === cust._id);
    const custEi = extraItems.filter((ei) => ei.customerId.toString() === cust._id);

    custTx.forEach((tx) => monthsSet.add(tx.date.substring(0, 7)));
    custEi.forEach((ei) => monthsSet.add(ei.date.substring(0, 7)));

    const sortedMonths = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
    return sortedMonths.map((monthKey) => {
      const [year, month] = monthKey.split("-");
      const d = new Date(parseInt(year), parseInt(month) - 1, 1);
      const name = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      return { key: monthKey, name };
    });
  };

  const getSelectedMonthTotal = (): number => {
    if (!activeCustomer) return 0;
    let total = 0;
    filteredEntries.forEach((e) => {
      const edits = editedValues[e.id];
      if (edits) {
        total += e.isDefault ? Number(edits.allocatedPrice || 0) : Number(edits.extraPrice || 0);
      } else {
        total += e.total;
      }
    });
    return total;
  };

  const getSelectedMonthName = (monthKey: string): string => {
    if (monthKey === "all") return "All Months";
    const [year, month] = monthKey.split("-");
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  async function handleSaveLedgerChanges(targetType?: "default" | "extra") {
    if (!activeCustomer) return;
    setLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      const promises: Promise<Response>[] = [];

      filteredEntries.forEach((entry) => {
        if (targetType === "default" && !entry.isDefault) return;
        if (targetType === "extra" && entry.isDefault) return;

        const edits = editedValues[entry.id];
        if (!edits) return;

        if (entry.isDefault) {
          const morningQty = Number(edits.morningQty || 0);
          const eveningQty = Number(edits.eveningQty || 0);
          const totalPrice = Number(edits.allocatedPrice || 0);

          const isModified =
            morningQty !== entry.morningQuantity ||
            eveningQty !== entry.eveningQuantity ||
            totalPrice !== entry.total;

          if (!isModified) return;

          const realId = entry.id.replace("tx-", "");
          promises.push(
            fetch(`/api/transactions/${realId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                customerId: Number(activeCustomer._id),
                itemId: entry.itemId,
                date: entry.date,
                morningQuantity: morningQty,
                eveningQuantity: eveningQty,
                totalPrice: totalPrice,
                pricePerUnit: entry.rate,
              }),
            })
          );
        } else {
          const quantity = Number(edits.extraQty || 0);
          const totalPrice = Number(edits.extraPrice || 0);

          const isModified = quantity !== entry.quantity || totalPrice !== entry.total;

          if (!isModified) return;

          const realId = entry.id.replace("ei-", "");
          if (quantity === 0) {
            promises.push(
              fetch(`/api/extra-items/${realId}`, {
                method: "DELETE",
              })
            );
          } else {
            promises.push(
              fetch(`/api/extra-items/${realId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  customerId: Number(activeCustomer._id),
                  itemId: entry.itemId,
                  date: entry.date,
                  quantity: quantity,
                  totalPrice: totalPrice,
                  pricePerUnit: entry.rate,
                }),
              })
            );
          }
        }
      });

      if (promises.length === 0) {
        setSuccessMessage("No changes to save.");
        setLoading(false);
        return;
      }

      const responses = await Promise.all(promises);
      const allOk = responses.every((r) => r.ok);

      if (allOk) {
        setSuccessMessage("Ledger updates saved to database successfully!");
        loadLedgerData();
      } else {
        setError("Failed to update some ledger entries. Please check the inputs.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save ledger updates.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 text-black pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          Customer Ledger
        </h1>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          Select customer and month to view and edit daily allocation quantities and extra products.
        </p>
      </div>

      {/* Global Toast Alerts Feedback */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 animate-in fade-in duration-200">
          <span className="p-1 bg-emerald-100 text-emerald-700 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          {successMessage}
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-150 text-rose-800 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 animate-in fade-in duration-200">
          <span className="p-1 bg-rose-100 text-rose-700 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </span>
          {error}
        </div>
      )}

      {loading && customers.length === 0 ? (
        <div className="p-20 text-center text-slate-455 text-xs font-semibold flex flex-col items-center justify-center gap-2">
          <svg className="w-7 h-7 animate-spin text-slate-350" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Loading statement logs...
        </div>
      ) : (
        <>
          {/* Top Dropdown Selection Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-5 no-print">
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                Select Customer
              </label>
              <select
                value={activeCustomer?._id || ""}
                onChange={(e) => {
                  const custId = e.target.value;
                  const found = customers.find((c) => c._id === custId);
                  setActiveCustomer(found || null);
                  setSelectedMonthFilter("all");
                }}
                className="w-full bg-slate-50 border border-slate-200 text-slate-955 font-bold text-xs rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition cursor-pointer"
              >
                <option value="">-- Choose Customer --</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                Select Month
              </label>
              <select
                value={selectedMonthFilter}
                disabled={!activeCustomer}
                onChange={(e) => setSelectedMonthFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-955 font-bold text-xs rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <option value="all">All Months</option>
                {activeCustomer && getCustomerActiveMonths(activeCustomer).map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Detailed Ledger Section */}
          {activeCustomer ? (
            <div className="space-y-6">
              {/* Table 1: Default Allocations Ledger */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-5 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-2">
                    <span className="p-1 bg-amber-500/10 text-amber-600 rounded-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </span>
                    Default Allocations ({allocatedEntries.length} Records)
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/30">
                        <th className="table-header-cell border-b border-slate-100 py-3.5 px-5">Date</th>
                        <th className="table-header-cell border-b border-slate-100 py-3.5 px-5">Allocated Product</th>
                        <th className="table-header-cell border-b border-slate-100 py-3.5 px-5">Morning Qty</th>
                        <th className="table-header-cell border-b border-slate-100 py-3.5 px-5">Evening Qty</th>
                        <th className="table-header-cell border-b border-slate-100 py-3.5 px-5 text-right">Allocated Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allocatedEntries.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-10 text-center text-slate-400 text-xs font-semibold">
                            No default allocation deliveries logged for the selected filters.
                          </td>
                        </tr>
                      ) : (
                        allocatedEntries.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/20 transition duration-100">
                            <td className="py-3.5 px-5 text-xs font-bold text-slate-700 whitespace-nowrap">{row.date}</td>
                            <td className="py-3.5 px-5 text-xs font-bold text-slate-850">{row.itemName}</td>
                            <td className="py-3.5 px-5 text-xs text-slate-600 font-semibold">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editedValues[row.id]?.morningQty || "0"}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const rate = row.rate;
                                    const morn = Number(val || 0);
                                    const eve = Number(editedValues[row.id]?.eveningQty || 0);
                                    const newTotal = (morn + eve) * rate;
                                    setEditedValues({
                                      ...editedValues,
                                      [row.id]: {
                                        ...editedValues[row.id],
                                        morningQty: val,
                                        allocatedPrice: newTotal.toFixed(2),
                                      },
                                    });
                                  }}
                                  className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                />
                                <span className="text-[10px] text-slate-400 font-semibold">{row.itemUnit}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-5 text-xs text-slate-600 font-semibold">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editedValues[row.id]?.eveningQty || "0"}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const rate = row.rate;
                                    const morn = Number(editedValues[row.id]?.morningQty || 0);
                                    const eve = Number(val || 0);
                                    const newTotal = (morn + eve) * rate;
                                    setEditedValues({
                                      ...editedValues,
                                      [row.id]: {
                                        ...editedValues[row.id],
                                        eveningQty: val,
                                        allocatedPrice: newTotal.toFixed(2),
                                      },
                                    });
                                  }}
                                  className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                />
                                <span className="text-[10px] text-slate-400 font-semibold">{row.itemUnit}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-5 text-xs font-black text-slate-855 text-right">
                              <div className="flex justify-end items-center gap-1">
                                <span className="text-slate-400 text-xs">₹</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editedValues[row.id]?.allocatedPrice || "0.00"}
                                  onChange={(e) =>
                                    setEditedValues({
                                      ...editedValues,
                                      [row.id]: {
                                        ...editedValues[row.id],
                                        allocatedPrice: e.target.value,
                                      },
                                    })
                                  }
                                  className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-right"
                                />
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => handleSaveLedgerChanges("default")}
                    disabled={loading}
                    className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow active:scale-[0.98] cursor-pointer flex items-center gap-1.5 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Default Allocations changes
                  </button>
                </div>
              </div>

              {/* Table 2: Extra Products Added Ledger */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-5 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-2">
                    <span className="p-1 bg-blue-500/10 text-blue-600 rounded-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </span>
                    Extra Products ({extraEntries.length} Records)
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/30">
                        <th className="table-header-cell border-b border-slate-100 py-3.5 px-5">Date</th>
                        <th className="table-header-cell border-b border-slate-100 py-3.5 px-5">Extra Product Added</th>
                        <th className="table-header-cell border-b border-slate-100 py-3.5 px-5 text-center">Extra Qty</th>
                        <th className="table-header-cell border-b border-slate-100 py-3.5 px-5 text-right">Extra Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {extraEntries.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-10 text-center text-slate-400 text-xs font-semibold">
                            No extra product deliveries logged for the selected filters.
                          </td>
                        </tr>
                      ) : (
                        extraEntries.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/20 transition duration-100">
                            <td className="py-3.5 px-5 text-xs font-bold text-slate-700 whitespace-nowrap">{row.date}</td>
                            <td className="py-3.5 px-5 text-xs font-bold text-slate-850">{row.itemName}</td>
                            <td className="py-3.5 px-5 text-center text-xs text-slate-600 font-semibold">
                              <input
                                type="text"
                                value={editedValues[row.id]?.extraQty || "0"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const numVal = Number(val) || 0;
                                  const newTotal = numVal * row.rate;
                                  setEditedValues((prev) => ({
                                    ...prev,
                                    [row.id]: {
                                      ...prev[row.id],
                                      extraQty: val,
                                      extraPrice: newTotal.toFixed(2),
                                    },
                                  }));
                                }}
                                className="w-16 text-center border border-slate-200 text-slate-905 font-bold text-xs rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm bg-white"
                              />
                            </td>
                            <td className="py-3.5 px-5 text-right text-xs font-black text-slate-855">
                              <div className="flex justify-end items-center gap-1">
                                <span className="text-slate-400 text-xs">₹</span>
                                <input
                                  type="text"
                                  value={editedValues[row.id]?.extraPrice || "0.00"}
                                  onChange={(e) =>
                                    setEditedValues((prev) => ({
                                      ...prev,
                                      [row.id]: {
                                        ...prev[row.id],
                                        extraPrice: e.target.value,
                                      },
                                    }))
                                  }
                                  className="w-20 text-right border border-slate-200 text-slate-905 font-bold text-xs rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm bg-white"
                                />
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => handleSaveLedgerChanges("extra")}
                    disabled={loading}
                    className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow active:scale-[0.98] cursor-pointer flex items-center gap-1.5 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Extra Products changes
                  </button>
                </div>
              </div>

              {/* Total Balance Summary */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 mt-4 flex items-center justify-between shadow-lg">
                <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider font-bold">
                  Net Deliveries Total ({getSelectedMonthName(selectedMonthFilter)})
                </span>
                <span className="text-xl font-black text-emerald-400">
                  ₹{getSelectedMonthTotal().toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-16 text-center text-slate-400 text-xs font-bold">
              Please select a customer from the dropdown menu above to view and edit their detailed ledger statement.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function LedgerDirectoryPage() {
  return (
    <Suspense
      fallback={
        <div className="p-20 text-center text-slate-400 text-xs font-semibold">
          Loading Ledger...
        </div>
      }
    >
      <LedgerContent />
    </Suspense>
  );
}
