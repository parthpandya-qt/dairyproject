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

  // Edit Log Sheet State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedQuantities, setEditedQuantities] = useState<Record<string, { morning: string; evening: string; itemId: string }>>({});

  // Add Extra Item Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalCustomer, setModalCustomer] = useState<ICustomer | null>(null);
  const [modalItemId, setModalItemId] = useState<string>("");
  const [modalMorningQty, setModalMorningQty] = useState<string>("0");
  const [modalEveningQty, setModalEveningQty] = useState<string>("0");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter transactions for the selected sheet date
  const dailyTransactions = transactions.filter((tx) => tx.date === selectedDate);
  const isLogged = dailyTransactions.length > 0;

  const todayStr = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  })();
  const isPastDate = selectedDate < todayStr;

  function handleStartEditing() {
    const editMap: Record<string, { morning: string; evening: string; itemId: string }> = {};
    dailyTransactions.forEach((tx) => {
      if (tx._id) {
        editMap[tx._id] = {
          morning: tx.morningQuantity.toString(),
          evening: tx.eveningQuantity.toString(),
          itemId: tx.itemId.toString()
        };
      }
    });
    setEditedQuantities(editMap);
    setIsEditing(true);
  }

  async function handleSaveChanges() {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const promises = dailyTransactions.map((tx) => {
        const editData = editedQuantities[tx._id!] || { 
          morning: tx.morningQuantity.toString(), 
          evening: tx.eveningQuantity.toString(), 
          itemId: tx.itemId.toString() 
        };
        const selectedItem = items.find((i) => i._id === editData.itemId) || items[0];
        const morningQty = Number(editData.morning || 0);
        const eveningQty = Number(editData.evening || 0);
        const txPrice = tx.pricePerUnit !== undefined && tx.pricePerUnit !== null && Number(tx.pricePerUnit) > 0
          ? Number(tx.pricePerUnit)
          : (selectedItem ? selectedItem.pricePerUnit : 0);
        const totalPrice = txPrice * (morningQty + eveningQty);

        if (morningQty === 0 && eveningQty === 0) {
          return fetch(`/api/transactions/${tx._id}`, {
            method: "DELETE"
          });
        }

        return fetch(`/api/transactions/${tx._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: tx.customerId,
            itemId: editData.itemId,
            date: selectedDate,
            morningQuantity: morningQty,
            eveningQuantity: eveningQty,
            totalPrice: totalPrice,
            pricePerUnit: txPrice
          })
        });
      });

      const responses = await Promise.all(promises);
      const allOk = responses.every((r) => r.ok);

      if (allOk) {
        setSuccessMessage("Daily sheet records successfully updated!");
        setIsEditing(false);
        const res = await fetch("/api/transactions");
        if (res.ok) {
          const tData = await res.json();
          setTransactions(tData);
        }
      } else {
        setError("Failed to update some transaction entries. Please check the inputs.");
      }
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to communicate update request with backend API.");
    } finally {
      setLoading(false);
    }
  }

  async function saveDefaultsSilently(): Promise<boolean> {
    try {
      const promises = customers.map((cust) => {
        const selectedItem = items.find((itm) => itm._id === cust.itemId?.toString()) || items[0];
        const morningQty = cust.morningQuantity || 0;
        const eveningQty = cust.eveningQuantity || 0;
        const calculatedPrice = selectedItem
          ? (morningQty + eveningQty) * selectedItem.pricePerUnit
          : 0;

        return fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: Number(cust._id),
            itemId: selectedItem?._id || "",
            date: selectedDate,
            morningQuantity: morningQty,
            eveningQuantity: eveningQty,
            totalPrice: calculatedPrice,
            pricePerUnit: selectedItem?.pricePerUnit || 0
          }),
        });
      });

      const responses = await Promise.all(promises);
      return responses.every((r) => r.ok);
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  async function handleAddExtraItem(e: React.FormEvent) {
    e.preventDefault();
    if (!modalCustomer) return;

    setLoading(true);
    setError("");
    setSuccessMessage("");
    setIsModalOpen(false);

    try {
      // 1. If date has no logged sheet defaults, save them first
      if (!isLogged) {
        const savedOk = await saveDefaultsSilently();
        if (!savedOk) {
          setError("Failed to save daily defaults before adding extra item.");
          setLoading(false);
          return;
        }
      }

      // 2. Add extra item transaction
      const selectedItem = items.find((i) => i._id === modalItemId) || items[0];
      const morningQty = Number(modalMorningQty || 0);
      const eveningQty = Number(modalEveningQty || 0);
      const totalPrice = selectedItem ? (morningQty + eveningQty) * selectedItem.pricePerUnit : 0;

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: Number(modalCustomer._id),
          itemId: modalItemId,
          date: selectedDate,
          morningQuantity: morningQty,
          eveningQuantity: eveningQty,
          totalPrice: totalPrice,
          pricePerUnit: selectedItem?.pricePerUnit || 0
        })
      });

      if (res.ok) {
        setSuccessMessage(`Extra item successfully added for "${modalCustomer.name}"!`);
        // Reload transactions
        const tRes = await fetch("/api/transactions");
        if (tRes.ok) {
          const tData = await tRes.json();
          setTransactions(tData);
        }
      } else {
        setError("Failed to add extra item transaction.");
      }
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to communicate with server.");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenAddExtraModal(cust: ICustomer) {
    setModalCustomer(cust);
    setModalItemId(items[0]?._id || "");
    setModalMorningQty("0");
    setModalEveningQty("0");
    setIsModalOpen(true);
  }

  async function loadData() {
    setLoading(true);
    setError("");
    setIsEditing(false);
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
    setIsEditing(false);
  }

  // Bulk Save Handler (Saves the daily sheet based on customer defaults)
  async function handleSaveAllTransactions() {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const promises = customers.map((cust) => {
        const selectedItem = items.find((itm) => itm._id === cust.itemId?.toString()) || items[0];
        const morningQty = cust.morningQuantity || 0;
        const eveningQty = cust.eveningQuantity || 0;
        const calculatedPrice = selectedItem
          ? (morningQty + eveningQty) * selectedItem.pricePerUnit
          : 0;

        return fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: Number(cust._id),
            itemId: selectedItem?._id || "",
            date: selectedDate,
            morningQuantity: morningQty,
            eveningQuantity: eveningQty,
            totalPrice: calculatedPrice,
            pricePerUnit: selectedItem?.pricePerUnit || 0
          }),
        });
      });

      const responses = await Promise.all(promises);
      const allOk = responses.every((r) => r.ok);

      if (allOk) {
        setSuccessMessage("Daily sheet records successfully saved!");
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

  // Compute stats for selected date (either from saved transactions or customer default allocations)
  const dailyMorningTotal = isLogged
    ? dailyTransactions.reduce((sum, tx) => sum + Number(tx.morningQuantity || 0), 0)
    : (isPastDate
        ? 0
        : customers.reduce((sum, cust) => sum + Number(cust.morningQuantity || 0), 0)
      );

  const dailyEveningTotal = isLogged
    ? dailyTransactions.reduce((sum, tx) => sum + Number(tx.eveningQuantity || 0), 0)
    : (isPastDate
        ? 0
        : customers.reduce((sum, cust) => sum + Number(cust.eveningQuantity || 0), 0)
      );

  const dailyRevenueTotal = isLogged
    ? dailyTransactions.reduce((sum, tx) => sum + Number(tx.totalPrice || 0), 0)
    : (isPastDate
        ? 0
        : customers.reduce((sum, cust) => {
            const item = items.find((i) => i._id === cust.itemId?.toString()) || items[0];
            if (!item) return sum;
            return sum + (Number(cust.morningQuantity || 0) + Number(cust.eveningQuantity || 0)) * item.pricePerUnit;
          }, 0)
      );

  return (
    <div className="max-w-6xl mx-auto space-y-8 text-black pb-12">
      {/* Header Title Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/60 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl inline-flex">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </span>
            Daily Log Sheets
          </h1>
          <p className="text-sm text-slate-450 font-medium mt-1">
            Input delivery quantity logs, fetch dynamic sheets, or save entries to database tables.
          </p>
        </div>

        {/* Date Selector and Refresh Button */}
        <div className="flex items-center gap-3 bg-white border border-slate-200/80 p-2.5 rounded-2xl shadow-sm self-start md:self-auto">
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
            </svg>
          </div>
        </div>

        <div className="border-l-4 border-emerald-500 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between transition hover:shadow-md duration-200">
          <div>
            <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">Revenue</span>
            <span className="text-xl font-black text-emerald-600 mt-1 block">₹{dailyRevenueTotal.toFixed(2)}</span>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
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
                  <th className="table-header-cell border-b border-slate-200/60 py-3.5 px-5">Customer</th>
                  <th className="table-header-cell border-b border-slate-200/60 py-3.5 px-5">Items</th>
                  <th className="table-header-cell border-b border-slate-200/60 py-3.5 px-5">Morning Qty</th>
                  <th className="table-header-cell border-b border-slate-200/60 py-3.5 px-5">Evening Qty</th>
                  <th className="table-header-cell border-b border-slate-200/60 py-3.5 px-5">Extra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/70">
                {customers.map((cust) => {
                  const custTxs = dailyTransactions.filter((tx) => tx.customerId === Number(cust._id));

                  const rowsToRender = isLogged
                    ? (custTxs.length > 0 
                        ? custTxs.map(tx => ({
                            _id: tx._id,
                            itemId: tx.itemId?.toString(),
                            itemName: tx.itemName,
                            morningQuantity: tx.morningQuantity,
                            eveningQuantity: tx.eveningQuantity,
                            pricePerUnit: tx.pricePerUnit,
                            isPlaceholder: false
                          }))
                        : [{
                            _id: "",
                            itemId: cust.itemId?.toString() || "",
                            itemName: cust.itemName,
                            morningQuantity: 0,
                            eveningQuantity: 0,
                            pricePerUnit: 0,
                            isPlaceholder: true
                          }]
                      )
                    : (isPastDate
                        ? [{
                            _id: "",
                            itemId: cust.itemId?.toString() || "",
                            itemName: cust.itemName,
                            morningQuantity: 0,
                            eveningQuantity: 0,
                            pricePerUnit: 0,
                            isPlaceholder: true
                          }]
                        : [{
                            _id: "",
                            itemId: cust.itemId?.toString() || "",
                            itemName: cust.itemName,
                            morningQuantity: cust.morningQuantity || 0,
                            eveningQuantity: cust.eveningQuantity || 0,
                            pricePerUnit: 0,
                            isPlaceholder: false
                          }]
                      );

                  return (
                    <tr key={cust._id} className={`hover:bg-slate-50/30 transition ${isLogged ? "bg-emerald-50/10" : ""}`}>
                      <td className="table-body-cell py-4 px-5 align-middle">
                        <p className="font-bold text-slate-900 leading-tight">{cust.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{cust.phone}</p>
                      </td>

                      <td className="table-body-cell py-4 px-5 align-middle">
                        <div className="flex flex-col gap-3">
                          {rowsToRender.map((row, idx) => {
                            const defaultItem = items.find((i) => i._id === cust.itemId?.toString()) || items[0];
                            const item = items.find((i) => i._id === row.itemId) || items.find((i) => i.name === row.itemName) || items[0];
                            const displayPrice = row.pricePerUnit !== undefined && row.pricePerUnit !== null && Number(row.pricePerUnit) > 0
                              ? Number(row.pricePerUnit)
                              : (item?.pricePerUnit || 0);
                            if (row.isPlaceholder) {
                              return (
                                <div key={idx} className="h-9 flex items-center text-slate-400 text-xs">-</div>
                              );
                            }
                            return (
                              <div key={idx} className="h-9 flex items-center gap-2 text-xs font-medium text-slate-700">
                                <span className="font-bold text-slate-700">
                                  {item?.name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  (₹{displayPrice}/{item?.unit})
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      <td className="table-body-cell py-4 px-5 align-middle">
                        <div className="flex flex-col gap-3">
                          {rowsToRender.map((row, idx) => {
                            if (row.isPlaceholder) {
                              return (
                                <div key={idx} className="h-9 flex items-center text-slate-400 text-xs">-</div>
                              );
                            }
                            if (isEditing) {
                              const txId = row._id || "";
                              const txEdit = editedQuantities[txId] || {
                                morning: row.morningQuantity.toString(),
                                evening: row.eveningQuantity.toString(),
                                itemId: row.itemId || ""
                              };
                              return (
                                <input
                                  key={idx}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={txEdit.morning}
                                  onChange={(e) => setEditedQuantities({
                                    ...editedQuantities,
                                    [txId]: { ...txEdit, morning: e.target.value }
                                  })}
                                  className="h-9 border border-slate-200 rounded-xl px-3 text-xs w-24 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                              );
                            }
                            const item = items.find((i) => i._id === row.itemId) || items.find((i) => i.name === row.itemName) || items[0];
                            return (
                              <div key={idx} className="h-9 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                                </svg>
                                {row.morningQuantity} {item?.unit || "L"}
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      <td className="table-body-cell py-4 px-5 align-middle">
                        <div className="flex flex-col gap-3">
                          {rowsToRender.map((row, idx) => {
                            if (row.isPlaceholder) {
                              return (
                                <div key={idx} className="h-9 flex items-center text-slate-400 text-xs">-</div>
                              );
                            }
                            if (isEditing) {
                              const txId = row._id || "";
                              const txEdit = editedQuantities[txId] || {
                                morning: row.morningQuantity.toString(),
                                evening: row.eveningQuantity.toString(),
                                itemId: row.itemId || ""
                              };
                              return (
                                <input
                                  key={idx}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={txEdit.evening}
                                  onChange={(e) => setEditedQuantities({
                                    ...editedQuantities,
                                    [txId]: { ...txEdit, evening: e.target.value }
                                  })}
                                  className="h-9 border border-slate-200 rounded-xl px-3 text-xs w-24 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                              );
                            }
                            const item = items.find((i) => i._id === row.itemId) || items.find((i) => i.name === row.itemName) || items[0];
                            return (
                              <div key={idx} className="h-9 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                                </svg>
                                {row.eveningQuantity} {item?.unit || "L"}
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      <td className="table-body-cell py-4 px-5 align-middle">
                        {!isEditing && (
                          <button
                            onClick={() => handleOpenAddExtraModal(cust)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 rounded-xl transition duration-150 font-bold text-xs cursor-pointer shadow-sm hover:shadow"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                            </svg>
                            Add Extra
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bulk Actions Footer Toolbar */}
        <div className="p-5 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="border border-slate-200 hover:bg-slate-50 text-slate-655 font-bold text-sm px-6 py-2.5 rounded-xl transition duration-200 cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChanges}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition duration-200 shadow-md hover:shadow active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </button>
            </>
          ) : isLogged ? (
            <button
              onClick={handleStartEditing}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition duration-200 shadow-md hover:shadow active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Log Sheet
            </button>
          ) : (
            <button
              onClick={handleSaveAllTransactions}
              className="bg-green-600 hover:bg-green-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition duration-200 shadow-md hover:shadow active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Add to Database
            </button>
          )}
        </div>
      </div>

      {/* Add Extra Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-md p-6 space-y-6 mx-4 transform transition-all animate-in zoom-in-95 duration-200 text-slate-800">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                </span>
                Add Extra Item
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-655 transition p-1 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content / Form */}
            <form onSubmit={handleAddExtraItem} className="space-y-4">
              {modalCustomer && (
                <div className="bg-slate-50/80 border border-slate-100 p-3.5 rounded-2xl">
                  <p className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest">Customer</p>
                  <p className="font-bold text-slate-800 mt-0.5">{modalCustomer.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{modalCustomer.phone}</p>
                </div>
              )}

              {/* Product Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">
                  Select Product
                </label>
                <select
                  value={modalItemId}
                  onChange={(e) => setModalItemId(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="" disabled>-- Select a Product --</option>
                  {items.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name} (₹{item.pricePerUnit}/{item.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">
                    Morning Qty
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={modalMorningQty}
                    onChange={(e) => setModalMorningQty(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">
                    Evening Qty
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={modalEveningQty}
                    onChange={(e) => setModalEveningQty(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-655 font-bold text-sm px-5 py-2.5 rounded-xl transition duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition duration-200 shadow-md hover:shadow active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  Add Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
