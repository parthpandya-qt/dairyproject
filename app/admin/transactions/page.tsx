"use client";
import { useState, useEffect } from "react";
import { ICustomer, IDairyItem, ITransaction } from "@/types";

export default function TransactionsAdminPage() {
  // Lists & Load States
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [items, setItems] = useState<IDairyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Sheet Date Selector State (default to today's date in local YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  // State to manage edit sheet view mode vs edit mode
  const [isEditingSheet, setIsEditingSheet] = useState<boolean>(false);

  // State for row inputs (keyed by customer._id)
  const [rowInputs, setRowInputs] = useState<{
    [custId: string]: {
      itemId: string;
      morningQuantity: string;
      eveningQuantity: string;
    };
  }>({});

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [cRes, iRes, tRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/auth/dairy-items"),
        fetch("/api/transactions"),
      ]);

      if (!cRes.ok || !iRes.ok || !tRes.ok) {
        throw new Error("Failed to synchronize admin directory datasets.");
      }

      const [cData, iData, tData] = await Promise.all([
        cRes.json(),
        iRes.json(),
        tRes.json(),
      ]);

      setCustomers(cData);
      setItems(iData);
      setTransactions(tData);

      // Initialize inputs and editing mode based on loaded transactions and selectedDate
      const dailyTx = tData.filter((tx: ITransaction) => tx.date === selectedDate);
      if (dailyTx.length > 0) {
        const initialInputs: typeof rowInputs = {};
        cData.forEach((cust: ICustomer) => {
          const tx = dailyTx.find((t: ITransaction) => t.customerId === Number(cust._id));
          if (tx) {
            initialInputs[cust._id] = {
              itemId: tx.itemId.toString(),
              morningQuantity: tx.morningQuantity.toString(),
              eveningQuantity: tx.eveningQuantity.toString(),
            };
          } else {
            initialInputs[cust._id] = {
              itemId: cust.itemId ? cust.itemId.toString() : (iData[0]?._id || ""),
              morningQuantity: cust.morningQuantity?.toString() || "0",
              eveningQuantity: cust.eveningQuantity?.toString() || "0",
            };
          }
        });
        setRowInputs(initialInputs);
        setIsEditingSheet(false);
      } else {
        const initialInputs: typeof rowInputs = {};
        cData.forEach((cust: ICustomer) => {
          initialInputs[cust._id] = {
            itemId: cust.itemId ? cust.itemId.toString() : (iData[0]?._id || ""),
            morningQuantity: cust.morningQuantity?.toString() || "0",
            eveningQuantity: cust.eveningQuantity?.toString() || "0",
          };
        });
        setRowInputs(initialInputs);
        setIsEditingSheet(true);
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  // Handle Date Selection changes
  function handleDateChange(newDate: string) {
    setSelectedDate(newDate);

    const dailyTx = transactions.filter((tx) => tx.date === newDate);
    if (dailyTx.length > 0) {
      const initialInputs: typeof rowInputs = {};
      customers.forEach((cust) => {
        const tx = dailyTx.find((t) => t.customerId === Number(cust._id));
        if (tx) {
          initialInputs[cust._id] = {
            itemId: tx.itemId.toString(),
            morningQuantity: tx.morningQuantity.toString(),
            eveningQuantity: tx.eveningQuantity.toString(),
          };
        } else {
          initialInputs[cust._id] = {
            itemId: cust.itemId ? cust.itemId.toString() : (items[0]?._id || ""),
            morningQuantity: cust.morningQuantity?.toString() || "0",
            eveningQuantity: cust.eveningQuantity?.toString() || "0",
          };
        }
      });
      setRowInputs(initialInputs);
      setIsEditingSheet(false);
    } else {
      const initialInputs: typeof rowInputs = {};
      customers.forEach((cust) => {
        initialInputs[cust._id] = {
          itemId: cust.itemId ? cust.itemId.toString() : (items[0]?._id || ""),
          morningQuantity: cust.morningQuantity?.toString() || "0",
          eveningQuantity: cust.eveningQuantity?.toString() || "0",
        };
      });
      setRowInputs(initialInputs);
      setIsEditingSheet(true);
    }
  }

  // Row Input State Management helpers
  const getRowInput = (custId: string, customer: ICustomer) => {
    if (rowInputs[custId]) {
      return rowInputs[custId];
    }
    return {
      itemId: items[0]?._id || "",
      morningQuantity: customer.morningQuantity?.toString() || "0",
      eveningQuantity: customer.eveningQuantity?.toString() || "0",
    };
  };

  const handleRowInputChange = (custId: string, field: string, value: string) => {
    setRowInputs((prev) => {
      const customer = customers.find((c) => c._id === custId);
      if (!customer) return prev;
      const current = prev[custId] || {
        itemId: items[0]?._id || "",
        morningQuantity: customer.morningQuantity?.toString() || "0",
        eveningQuantity: customer.eveningQuantity?.toString() || "0",
      };
      return {
        ...prev,
        [custId]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  // Bulk Save/Update Handler
  async function handleSaveAllTransactions() {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const promises = customers.map((cust) => {
        const input = getRowInput(cust._id, cust);
        const selectedItem = items.find((itm) => itm._id === input.itemId);
        const calculatedPrice = selectedItem
          ? (Number(input.morningQuantity || 0) + Number(input.eveningQuantity || 0)) * selectedItem.pricePerUnit
          : 0;

        const matchedTx = dailyTransactions.find((tx) => tx.customerId === Number(cust._id));

        if (matchedTx) {
          // Update existing transaction record
          return fetch(`/api/transactions/${matchedTx._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerId: Number(cust._id),
              itemId: Number(input.itemId),
              date: selectedDate,
              morningQuantity: Number(input.morningQuantity),
              eveningQuantity: Number(input.eveningQuantity),
              totalPrice: calculatedPrice,
            }),
          });
        } else {
          // Create new transaction record
          return fetch("/api/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerId: Number(cust._id),
              itemId: Number(input.itemId),
              date: selectedDate,
              morningQuantity: Number(input.morningQuantity),
              eveningQuantity: Number(input.eveningQuantity),
              totalPrice: calculatedPrice,
            }),
          });
        }
      });

      const responses = await Promise.all(promises);
      const allOk = responses.every((r) => r.ok);

      if (allOk) {
        setSuccessMessage("Daily sheet records successfully saved!");
        setIsEditingSheet(false);
        // Refresh list
        const res = await fetch("/api/transactions");
        if (res.ok) {
          const tData = await res.json();
          setTransactions(tData);
        }
      } else {
        setError("Failed to save some transaction entries. Please check the inputs.");
      }
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to communicate save request with backend API.");
    } finally {
      setLoading(false);
    }
  }

  // Filter transactions for the selected sheet date
  const dailyTransactions = transactions.filter((tx) => tx.date === selectedDate);

  // Compute stats for selected date
  const dailyMorningTotal = dailyTransactions.reduce((sum, tx) => sum + Number(tx.morningQuantity || 0), 0);
  const dailyEveningTotal = dailyTransactions.reduce((sum, tx) => sum + Number(tx.eveningQuantity || 0), 0);
  const dailyRevenueTotal = dailyTransactions.reduce((sum, tx) => sum + Number(tx.totalPrice || 0), 0);

  // Helper to get row total price
  const getRowTotalPrice = (custId: string, customer: ICustomer) => {
    const input = getRowInput(custId, customer);
    const selectedItem = items.find((i) => i._id === input.itemId);
    if (!selectedItem) return 0;
    return (Number(input.morningQuantity || 0) + Number(input.eveningQuantity || 0)) * selectedItem.pricePerUnit;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 text-black pb-12">
      {/* Header Title Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/60 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-green-555/10 text-green-700 rounded-xl inline-flex">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </span>
            Daily Log Sheets
          </h1>
          <p className="text-sm text-slate-455 font-medium mt-1">Record, modify, and audit product distributions grouped by date.</p>
        </div>

        {/* Date Selector and toolbar */}
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 px-3 py-1">
            <span className="text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="font-bold bg-white text-xs text-slate-700 focus:outline-none cursor-pointer outline-none"
            />
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3.5 py-2 hover:bg-slate-50 border border-slate-100 rounded-xl transition duration-150 font-bold text-xs text-slate-600 cursor-pointer"
            title="Reload sheet data"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
            </svg>
            Sync List
          </button>
        </div>
      </div>

      {/* Global Toast Alerts Feedback */}
      {successMessage && (
        <div className="p-4 bg-emerald-50/80 border border-emerald-150 text-emerald-800 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 animate-in fade-in duration-200">
          <span className="p-1 bg-emerald-100 text-emerald-700 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          {successMessage}
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-50/80 border border-rose-150 text-rose-800 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 animate-in fade-in duration-200">
          <span className="p-1 bg-rose-100 text-rose-700 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </span>
          {error}
        </div>
      )}

      {/* Dynamic Summary Cards Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="border-l-4 border-slate-400 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between transition hover:shadow-md duration-200">
          <div>
            <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">Sheet Date</span>
            <span className="text-lg font-black text-slate-800 mt-1 block">{selectedDate}</span>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 text-slate-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <div className="border-l-4 border-amber-500 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between transition hover:shadow-md duration-200">
          <div>
            <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">Morning Quantity</span>
            <span className="text-xl font-black text-amber-600 mt-1 block">{dailyMorningTotal.toFixed(1)} Liters</span>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707" />
            </svg>
          </div>
        </div>

        <div className="border-l-4 border-indigo-500 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between transition hover:shadow-md duration-200">
          <div>
            <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">Evening Quantity</span>
            <span className="text-xl font-black text-indigo-600 mt-1 block">{dailyEveningTotal.toFixed(1)} Liters</span>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21" />
            </svg>
          </div>
        </div>

        <div className="border-l-4 border-emerald-500 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between transition hover:shadow-md duration-200">
          <div>
            <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">Estimated Revenue</span>
            <span className="text-xl font-black text-emerald-600 mt-1 block">₹{dailyRevenueTotal.toFixed(2)}</span>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Daily Log Table Sheet */}
      <div className="bg-white rounded-2xl border border-slate-250/60 shadow-sm overflow-hidden">
        <div className="p-5 bg-slate-50/70 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-2">
            Daily Entry Sheet
            <span className="px-2.5 py-0.5 bg-slate-200 text-slate-650 rounded-full text-[10px] font-bold">
              {dailyTransactions.length} of {customers.length} Logged
            </span>
          </h3>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs font-semibold flex flex-col items-center justify-center gap-2">
            <svg className="w-6 h-6 animate-spin text-slate-350" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
            </svg>
            Synchronizing logs...
          </div>
        ) : customers.length === 0 ? (
          <div className="p-16 text-center text-slate-450 text-xs font-semibold">
            No customers registered yet. Please add clients in the Customer Directory.
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center text-rose-500 text-xs font-bold">
            No products configured. Please add products/dairy-items in the registry first.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/30">
                  <th className="table-header-cell border-b border-slate-100/60 py-3.5 px-5">Client Info</th>
                  <th className="table-header-cell border-b border-slate-100/60 py-3.5 px-5">Allocation / Item</th>
                  <th className="table-header-cell border-b border-slate-100/60 py-3.5 px-5">Morning Qty</th>
                  <th className="table-header-cell border-b border-slate-100/60 py-3.5 px-5">Evening Qty</th>
                  <th className="table-header-cell border-b border-slate-100/60 py-3.5 px-5">Computed Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/70">
                {customers.map((cust) => {
                  const matchedTx = dailyTransactions.find((tx) => tx.customerId === Number(cust._id));

                  if (!isEditingSheet) {
                    // View Mode: Render read-only text fields
                    return (
                      <tr key={cust._id} className="hover:bg-slate-50/30 transition bg-emerald-50/10">
                        <td className="table-body-cell py-4 px-5">
                          <p className="font-bold text-slate-900 leading-tight">{cust.name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{cust.phone}</p>
                        </td>
                        <td className="table-body-cell py-4 px-5 text-xs font-medium text-slate-700">
                          {matchedTx ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-full text-[9px] font-extrabold uppercase tracking-wide inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Logged
                              </span>
                              <span className="font-bold text-slate-700">
                                {matchedTx.itemName || "Buffalo Milk"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                (₹{matchedTx.itemPrice || 0}/{matchedTx.itemUnit || "Liter"})
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No distribution logged</span>
                          )}
                        </td>
                        <td className="table-body-cell py-4 px-5 text-xs font-bold text-slate-700">
                          {matchedTx ? (
                            <div className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3" />
                              </svg>
                              {matchedTx.morningQuantity} {matchedTx.itemUnit || "L"}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="table-body-cell py-4 px-5 text-xs font-bold text-slate-700">
                          {matchedTx ? (
                            <div className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21" />
                              </svg>
                              {matchedTx.eveningQuantity} {matchedTx.itemUnit || "L"}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="table-body-cell py-4 px-5 text-xs font-black text-slate-900">
                          {matchedTx ? `₹${matchedTx.totalPrice.toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    );
                  } else {
                    // Edit/Input Mode: Render editable input forms
                    const rInput = getRowInput(cust._id, cust);
                    const rowPrice = getRowTotalPrice(cust._id, cust);

                    return (
                      <tr key={cust._id} className="hover:bg-slate-50/20 transition">
                        <td className="table-body-cell py-4 px-5">
                          <p className="font-bold text-slate-800 leading-tight">{cust.name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{cust.phone}</p>
                        </td>
                        <td className="table-body-cell py-4 px-5">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-150 rounded-full text-[9px] font-extrabold uppercase tracking-wide inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              Pending
                            </span>
                            <select
                              value={rInput.itemId}
                              onChange={(e) => handleRowInputChange(cust._id, "itemId", e.target.value)}
                              className="bg-white hover:bg-slate-50 border border-slate-200 focus:border-green-600 focus:ring-4 focus:ring-green-500/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition duration-155 outline-none shadow-sm cursor-pointer"
                            >
                              {items.map((item) => (
                                <option key={item._id} value={item._id}>
                                  {item.name} (₹{item.pricePerUnit}/{item.unit})
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="table-body-cell py-4 px-5">
                          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 rounded-lg px-2 py-1 max-w-[85px] focus-within:ring-4 focus-within:ring-green-500/10 focus-within:border-green-600 focus-within:bg-white transition duration-150 shadow-sm">
                            <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3" />
                            </svg>
                            <input
                              type="number"
                              value={rInput.morningQuantity}
                              onChange={(e) => handleRowInputChange(cust._id, "morningQuantity", e.target.value)}
                              className="w-full bg-transparent border-none outline-none font-bold text-xs text-slate-800 text-center"
                              min="0"
                              step="0.1"
                            />
                          </div>
                        </td>
                        <td className="table-body-cell py-4 px-5">
                          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 rounded-lg px-2 py-1 max-w-[85px] focus-within:ring-4 focus-within:ring-green-500/10 focus-within:border-green-600 focus-within:bg-white transition duration-150 shadow-sm">
                            <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21" />
                            </svg>
                            <input
                              type="number"
                              value={rInput.eveningQuantity}
                              onChange={(e) => handleRowInputChange(cust._id, "eveningQuantity", e.target.value)}
                              className="w-full bg-transparent border-none outline-none font-bold text-xs text-slate-800 text-center"
                              min="0"
                              step="0.1"
                            />
                          </div>
                        </td>
                        <td className="table-body-cell py-4 px-5 text-xs font-bold text-slate-700">
                          ₹{rowPrice.toFixed(2)}
                        </td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bulk Actions Footer Toolbar */}
        <div className="p-5 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
          {dailyTransactions.length === 0 ? (
            <button
              onClick={handleSaveAllTransactions}
              className="bg-green-600 hover:bg-green-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition duration-200 shadow-md hover:shadow active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Add to Database
            </button>
          ) : !isEditingSheet ? (
            <button
              onClick={() => setIsEditingSheet(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition duration-200 shadow-md hover:shadow active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Sheet
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsEditingSheet(false);
                  loadData();
                }}
                className="px-5 py-2.5 border border-slate-350 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition duration-150 cursor-pointer text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAllTransactions}
                className="bg-green-600 hover:bg-green-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition duration-200 shadow-md hover:shadow active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
