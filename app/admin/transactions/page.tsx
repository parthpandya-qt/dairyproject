"use client";
import { useState, useEffect } from "react";
import { ICustomer, IDairyItem, ITransaction, IExtraItem } from "@/types";

// Helper to check if customer was created after selectedDate
function isCreatedAfter(createdAtStr: string | Date | undefined, dateStr: string): boolean {
  if (!createdAtStr) return false;
  try {
    const createdDate = new Date(createdAtStr);
    if (isNaN(createdDate.getTime())) return false;
    const cy = createdDate.getFullYear();
    const cm = String(createdDate.getMonth() + 1).padStart(2, '0');
    const cd = String(createdDate.getDate()).padStart(2, '0');
    const createdDateStr = `${cy}-${cm}-${cd}`;
    return createdDateStr > dateStr;
  } catch {
    return false;
  }
}

export default function TransactionsAdminPage() {
  // Lists & Load States
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [extraItems, setExtraItems] = useState<IExtraItem[]>([]);
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
  const [modalQuantity, setModalQuantity] = useState<string>("0");

  useEffect(() => {
    loadData();

    const handleDbUpdate = () => {
      loadData();
    };
    window.addEventListener("dairy-db-update", handleDbUpdate);
    return () => {
      window.removeEventListener("dairy-db-update", handleDbUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter transactions and extra items for the selected sheet date and active customers only
  const activeCustomerIds = new Set(customers.map((c) => Number(c._id)));
  const dailyTransactions = transactions.filter((tx) => tx.date === selectedDate && activeCustomerIds.has(tx.customerId));
  const dailyExtraItems = extraItems.filter((ei) => ei.date === selectedDate && activeCustomerIds.has(ei.customerId));
  const isLogged = dailyTransactions.length > 0;

  // Local current date YYYY-MM-DD
  const todayDateStr = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  })();
  const isPastDate = selectedDate < todayDateStr;

  // Auto-initialize edit quantities when selectedDate, customers, transactions, extraItems, or items change
  useEffect(() => {
    if (isEditing) return; // Don't overwrite active user edits

    const editMap: Record<string, { morning: string; evening: string; itemId: string }> = {};
    
    // 1. Populate default transactions
    dailyTransactions.forEach((tx) => {
      if (tx._id) {
        editMap[tx._id] = {
          morning: tx.morningQuantity.toString(),
          evening: tx.eveningQuantity.toString(),
          itemId: tx.itemId.toString()
        };
      }
    });

    // 2. Populate extra items
    dailyExtraItems.forEach((ei) => {
      if (ei._id) {
        editMap[ei._id] = {
          morning: ei.quantity.toString(),
          evening: "0",
          itemId: ei.itemId.toString()
        };
      }
    });

    // 3. Populate pending default transactions
    if (!isPastDate) {
      customers.forEach((cust) => {
        const hasTx = dailyTransactions.some((tx) => tx.customerId === Number(cust._id));
        const hasActiveDefaultItem = items.some((i) => i._id === cust.itemId?.toString());
        if (!hasTx && !isCreatedAfter(cust.createdAt, selectedDate) && hasActiveDefaultItem) {
          editMap[`new_${cust._id}`] = {
            morning: (cust.morningQuantity || 0).toString(),
            evening: (cust.eveningQuantity || 0).toString(),
            itemId: cust.itemId?.toString() || items[0]?._id || ""
          };
        }
      });
    }

    setEditedQuantities(editMap);
  }, [selectedDate, customers, transactions, extraItems, items, isPastDate, isEditing]);

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

    dailyExtraItems.forEach((ei) => {
      if (ei._id) {
        editMap[ei._id] = {
          morning: ei.quantity.toString(),
          evening: "0",
          itemId: ei.itemId.toString()
        };
      }
    });

    if (!isPastDate) {
      customers.forEach((cust) => {
        const hasTx = dailyTransactions.some((tx) => tx.customerId === Number(cust._id));
        const hasActiveDefaultItem = items.some((i) => i._id === cust.itemId?.toString());
        if (!hasTx && !isCreatedAfter(cust.createdAt, selectedDate) && hasActiveDefaultItem) {
          editMap[`new_${cust._id}`] = {
            morning: (cust.morningQuantity || 0).toString(),
            evening: (cust.eveningQuantity || 0).toString(),
            itemId: cust.itemId?.toString() || items[0]?._id || ""
          };
        }
      });
    }

    setEditedQuantities(editMap);
    setIsEditing(true);
  }

  async function handleSaveChanges() {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const promises: Promise<Response>[] = [];

      // 1. Update existing default transactions
      dailyTransactions.forEach((tx) => {
        const editData = editedQuantities[tx._id!] || { 
          morning: tx.morningQuantity.toString(), 
          evening: tx.eveningQuantity.toString(), 
          itemId: tx.itemId.toString() 
        };
        const selectedItem = items.find((i) => i._id === editData.itemId) || 
                             (tx.itemId?.toString() === editData.itemId && tx.itemName ? {
                                _id: tx.itemId.toString(),
                                name: tx.itemName,
                                pricePerUnit: Number(tx.pricePerUnit || tx.itemPrice || 0),
                                unit: tx.itemUnit || "Liter"
                             } : items[0]);
        const morningQty = Number(editData.morning || 0);
        const eveningQty = Number(editData.evening || 0);
        const totalPrice = selectedItem ? (morningQty + eveningQty) * selectedItem.pricePerUnit : 0;

        promises.push(
          fetch(`/api/transactions/${tx._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerId: tx.customerId,
              itemId: editData.itemId,
              date: selectedDate,
              morningQuantity: morningQty,
              eveningQuantity: eveningQty,
              totalPrice: totalPrice,
              pricePerUnit: selectedItem?.pricePerUnit
            })
          })
        );
      });

      // 2. Update or delete existing extra items
      dailyExtraItems.forEach((ei) => {
        const editData = editedQuantities[ei._id!] || {
          morning: ei.quantity.toString(),
          evening: "0",
          itemId: ei.itemId.toString()
        };
        const quantity = Number(editData.morning || 0);

        if (quantity === 0) {
          promises.push(
            fetch(`/api/extra-items/${ei._id}`, {
              method: "DELETE"
            })
          );
        } else {
          const selectedItem = items.find((i) => i._id === editData.itemId) || 
                               (ei.itemId?.toString() === editData.itemId && ei.itemName ? {
                                  _id: ei.itemId.toString(),
                                  name: ei.itemName,
                                  pricePerUnit: Number(ei.pricePerUnit || ei.itemPrice || 0),
                                  unit: ei.itemUnit || "Liter"
                               } : items[0]);
          const totalPrice = selectedItem ? quantity * selectedItem.pricePerUnit : 0;

          promises.push(
            fetch(`/api/extra-items/${ei._id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                customerId: ei.customerId,
                itemId: editData.itemId,
                date: selectedDate,
                quantity: quantity,
                totalPrice: totalPrice,
                pricePerUnit: selectedItem?.pricePerUnit
              })
            })
          );
        }
      });

      // 3. Create new default transactions if not past date
      if (!isPastDate) {
        customers.forEach((cust) => {
          const hasTx = dailyTransactions.some((tx) => tx.customerId === Number(cust._id));
          const hasActiveDefaultItem = items.some((i) => i._id === cust.itemId?.toString());
          if (!hasTx && !isCreatedAfter(cust.createdAt, selectedDate) && hasActiveDefaultItem) {
            const editKey = `new_${cust._id}`;
            const editData = editedQuantities[editKey] || {
              morning: (cust.morningQuantity || 0).toString(),
              evening: (cust.eveningQuantity || 0).toString(),
              itemId: cust.itemId?.toString() || items[0]?._id || ""
            };
            const morningQty = Number(editData.morning || 0);
            const eveningQty = Number(editData.evening || 0);

            const selectedItem = items.find((i) => i._id === editData.itemId) || 
                                 (cust.itemName ? {
                                    _id: cust.itemId?.toString() || "",
                                    name: cust.itemName,
                                    pricePerUnit: Number(cust.itemPrice || 0),
                                    unit: cust.itemUnit || "Liter"
                                 } : items[0]);
            const totalPrice = selectedItem ? (morningQty + eveningQty) * selectedItem.pricePerUnit : 0;

            promises.push(
              fetch("/api/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  customerId: Number(cust._id),
                  itemId: editData.itemId,
                  date: selectedDate,
                  morningQuantity: morningQty,
                  eveningQuantity: eveningQty,
                  totalPrice: totalPrice,
                  pricePerUnit: selectedItem?.pricePerUnit
                })
              })
            );
          }
        });
      }

      const responses = await Promise.all(promises);
      const allOk = responses.every((r) => r.ok);

      if (allOk) {
        setSuccessMessage("Daily sheet records successfully updated!");
        setIsEditing(false);
        // Reload transactions and extra items
        const [tRes, eRes] = await Promise.all([
          fetch("/api/transactions"),
          fetch("/api/extra-items")
        ]);
        if (tRes.ok && eRes.ok) {
          const tData = await tRes.json();
          const eData = await eRes.json();
          setTransactions(tData);
          setExtraItems(eData);
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
      const promises = customers
        .filter((cust) => !isCreatedAfter(cust.createdAt, selectedDate) && items.some((i) => i._id === cust.itemId?.toString()))
        .map((cust) => {
        const selectedItem = items.find((itm) => itm._id === cust.itemId?.toString()) || 
                             (cust.itemName ? {
                                _id: cust.itemId?.toString() || "",
                                name: cust.itemName,
                                pricePerUnit: Number(cust.itemPrice || 0),
                                unit: cust.itemUnit || "Liter"
                             } : items[0]);
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
            pricePerUnit: selectedItem?.pricePerUnit
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
      const qty = Number(modalQuantity || 0);
      const totalPrice = selectedItem ? qty * selectedItem.pricePerUnit : 0;

      const res = await fetch("/api/extra-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: Number(modalCustomer._id),
          itemId: modalItemId,
          date: selectedDate,
          quantity: qty,
          totalPrice: totalPrice,
          pricePerUnit: selectedItem?.pricePerUnit
        })
      });

      if (res.ok) {
        setSuccessMessage(`Extra item successfully added for "${modalCustomer.name}"!`);
        // Reload transactions and extra items
        const [tRes, eRes] = await Promise.all([
          fetch("/api/transactions"),
          fetch("/api/extra-items")
        ]);
        if (tRes.ok && eRes.ok) {
          const tData = await tRes.json();
          const eData = await eRes.json();
          setTransactions(tData);
          setExtraItems(eData);
        }
      } else {
        setError("Failed to add extra item.");
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
    setModalQuantity("0");
    setIsModalOpen(true);
  }

  async function loadData() {
    setLoading(true);
    setError("");
    setIsEditing(false);
    try {
      const [cRes, iRes, tRes, eRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/auth/dairy-items"),
        fetch("/api/transactions"),
        fetch("/api/extra-items"),
      ]);

      if (!cRes.ok || !iRes.ok || !tRes.ok || !eRes.ok) {
        throw new Error("Failed to synchronize admin directory datasets.");
      }

      const [cData, iData, tData, eData] = await Promise.all([
        cRes.json(),
        iRes.json(),
        tRes.json(),
        eRes.json(),
      ]);

      setCustomers(cData);
      setItems(iData);
      setTransactions(tData);
      setExtraItems(eData);
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



  return (
    <div className="max-w-6xl mx-auto space-y-8 text-black pb-12">
      {/* Header Title Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/50 pb-6 select-none">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-2xl inline-flex border border-emerald-500/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </span>
            Daily Log Sheets
          </h1>
          <p className="text-xs sm:text-sm text-slate-455 font-semibold mt-2">
            Input delivery quantity logs, fetch dynamic sheets, or save entries to database tables.
          </p>
        </div>

        {/* Date Selector and Refresh Button */}
        <div className="flex items-center gap-3 bg-white border border-slate-100 p-2 sm:p-2.5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.015)] self-start md:self-auto">
          <div className="flex items-center gap-2 px-3 py-1">
            <span className="text-slate-400">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="font-bold bg-white text-xs sm:text-sm text-slate-700 focus:outline-none cursor-pointer outline-none"
            />
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl transition duration-150 font-bold text-xs cursor-pointer select-none"
            title="Reload sheet data"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-500" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Sync
          </button>
        </div>
      </div>

      {/* Global Toast Alerts Feedback */}
      {successMessage && (
        <div className="p-4 bg-emerald-50/60 border border-emerald-150 text-emerald-800 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 animate-in fade-in duration-200">
          <span className="p-1 bg-emerald-100/80 text-emerald-700 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          {successMessage}
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-50/60 border border-rose-150 text-rose-800 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 animate-in fade-in duration-200">
          <span className="p-1 bg-rose-100/80 text-rose-700 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </span>
          {error}
        </div>
      )}

      {/* Daily Log Table Sheet */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] overflow-hidden">
        <div className="p-5 bg-slate-50/40 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-2">
            Daily Entry Sheet
            <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200/50 text-slate-600 rounded-full text-[10px] font-black">
              {new Set(dailyTransactions.map((tx) => tx.customerId)).size} of {customers.length} Logged
            </span>
          </h3>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-450 text-xs font-semibold flex flex-col items-center justify-center gap-2 select-none">
            <svg className="w-6 h-6 animate-spin text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Synchronizing logs...
          </div>
        ) : customers.length === 0 ? (
          <div className="p-16 text-center text-slate-455 text-xs font-semibold select-none">
            No customers registered yet. Please add clients in the Customer Directory.
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center text-rose-600 text-xs font-bold select-none">
            No products configured. Please add products/dairy-items in the registry first.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/30">
                  <th className="table-header-cell py-3.5 px-5">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Customer
                    </div>
                  </th>
                  <th className="table-header-cell py-3.5 px-5">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      Items
                    </div>
                  </th>
                  <th className="table-header-cell py-3.5 px-5">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                      </svg>
                      Morning Qty
                    </div>
                  </th>
                  <th className="table-header-cell py-3.5 px-5">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                      </svg>
                      Evening Qty
                    </div>
                  </th>
                  <th className="table-header-cell py-3.5 px-5">
                    <div className="flex items-center gap-1.5">
                      Extra Items
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((cust) => {
                  const isFutureCustomer = isCreatedAfter(cust.createdAt, selectedDate);
                  const hasActiveDefaultItem = items.some((i) => i._id === cust.itemId?.toString());

                  let defaultRows: any[] = [];
                  let extraRows: any[] = [];

                  if (isFutureCustomer) {
                    defaultRows = [{
                      _id: "",
                      itemId: "",
                      itemName: "",
                      itemPrice: 0,
                      pricePerUnit: 0,
                      itemUnit: "",
                      morningQuantity: 0,
                      eveningQuantity: 0,
                      isPlaceholder: true,
                      isFutureCustomer: true
                    }];
                  } else {
                    const defaultTx = dailyTransactions.find((tx) => tx.customerId === Number(cust._id));
                    if (defaultTx) {
                      defaultRows = [{
                        ...defaultTx,
                        itemId: defaultTx.itemId?.toString(),
                        isPlaceholder: false
                      }];
                    } else {
                      if (isPastDate || !hasActiveDefaultItem) {
                        defaultRows = [{
                          _id: "",
                          itemId: cust.itemId?.toString() || "",
                          itemName: cust.itemName,
                          itemPrice: cust.itemPrice,
                          pricePerUnit: cust.itemPrice,
                          itemUnit: cust.itemUnit,
                          morningQuantity: 0,
                          eveningQuantity: 0,
                          isPlaceholder: true
                        }];
                      } else {
                        defaultRows = [{
                          _id: `new_${cust._id}`,
                          itemId: cust.itemId?.toString() || "",
                          itemName: cust.itemName,
                          itemPrice: cust.itemPrice,
                          pricePerUnit: cust.itemPrice,
                          itemUnit: cust.itemUnit,
                          morningQuantity: cust.morningQuantity || 0,
                          eveningQuantity: cust.eveningQuantity || 0,
                          isPlaceholder: false
                        }];
                      }
                    }

                    const custExtras = dailyExtraItems.filter((ei) => ei.customerId === Number(cust._id));
                    extraRows = custExtras.map((ei) => ({
                      ...ei,
                      itemId: ei.itemId?.toString(),
                      isPlaceholder: false
                    }));
                  }

                  const isRowActive = isLogged && dailyTransactions.some(t => t.customerId === Number(cust._id));

                  return (
                    <tr key={cust._id} className={`hover:bg-slate-50/15 transition duration-150 ${isRowActive ? "bg-emerald-50/5" : ""}`}>
                      <td className="table-body-cell py-4 px-5 align-middle">
                        <p className="font-extrabold text-slate-900 leading-tight tracking-tight">{cust.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">{cust.phone}</p>
                      </td>

                      <td className="table-body-cell py-4 px-5 align-middle">
                        <div className="flex flex-col gap-3">
                          {defaultRows.map((row, idx) => {
                            const defaultItem = items.find((i) => i._id === cust.itemId?.toString()) || 
                                                (cust.itemName ? {
                                                   _id: cust.itemId?.toString() || "",
                                                   name: cust.itemName,
                                                   pricePerUnit: Number(cust.itemPrice || 0),
                                                   unit: cust.itemUnit || "Liter"
                                                } : items[0]);
                            const item = items.find((i) => i._id === row.itemId) || 
                                         items.find((i) => i.name === row.itemName) || 
                                         (row.itemName ? {
                                            _id: row.itemId?.toString() || "",
                                            name: row.itemName,
                                            pricePerUnit: Number(row.pricePerUnit || row.itemPrice || 0),
                                            unit: row.itemUnit || "Liter",
                                            isDeleted: true
                                         } : items[0]);
                            if (row.isPlaceholder) {
                              if ('isFutureCustomer' in row && row.isFutureCustomer) {
                                return (
                                  <div key={idx} className="h-9 flex items-center text-slate-400 text-xs">-</div>
                                );
                              }
                              return (
                                <div key={idx} className="h-9 flex items-center text-slate-400 italic text-xs font-semibold select-none">
                                  No default logs (Configured: {defaultItem?.name})
                                </div>
                              );
                            }
                            const isNew = row._id && row._id.startsWith('new_');
                            return (
                              <div key={idx} className="h-9 flex items-center gap-2 text-xs font-semibold text-slate-700">
                                <span 
                                  className={`px-2 py-0.5 border rounded-lg text-[9px] font-black uppercase tracking-wider inline-flex items-center justify-center mr-1 select-none ${
                                    !isNew
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {!isNew ? 'Logged' : 'Pending'}
                                </span>
                                <span className={`font-extrabold ${item && 'isDeleted' in item ? 'text-slate-450 line-through' : 'text-slate-750'}`}>
                                  {item?.name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  (₹{item?.pricePerUnit}/{item?.unit})
                                </span>
                                {item && 'isDeleted' in item && (
                                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-455 border border-slate-200 rounded text-[9px] font-black select-none">
                                    Deleted
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      <td className="table-body-cell py-4 px-5 align-middle">
                        <div className="flex flex-col gap-3">
                          {defaultRows.map((row, idx) => {
                            if (row.isPlaceholder) {
                              return (
                                <div key={idx} className="h-9 flex items-center text-slate-400 text-xs">-</div>
                              );
                            }
                            if (isEditing || !isLogged) {
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
                                  className="h-9 border border-slate-200 rounded-xl px-3 text-xs w-24 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200 shadow-sm"
                                />
                              );
                            }
                            return (
                              <div key={idx} className="h-9 flex items-center text-xs font-extrabold text-slate-800">
                                {row.morningQuantity} L
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      <td className="table-body-cell py-4 px-5 align-middle">
                        <div className="flex flex-col gap-3">
                          {defaultRows.map((row, idx) => {
                            if (row.isPlaceholder) {
                              return (
                                <div key={idx} className="h-9 flex items-center text-slate-400 text-xs">-</div>
                              );
                            }
                            if (isEditing || !isLogged) {
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
                                  className="h-9 border border-slate-200 rounded-xl px-3 text-xs w-24 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200 shadow-sm"
                                />
                              );
                            }
                            return (
                              <div key={idx} className="h-9 flex items-center text-xs font-extrabold text-slate-800">
                                {row.eveningQuantity} L
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      <td className="table-body-cell py-4 px-5 align-middle">
                        <div className="flex flex-col gap-2.5">
                          {isEditing || !isLogged ? (
                            extraRows.length === 0 ? null : (
                              <div className="flex flex-col gap-2">
                                {extraRows.map((row, idx) => {
                                  const txId = row._id || "";
                                  const txEdit = editedQuantities[txId] || {
                                    morning: row.quantity.toString(),
                                    evening: "0",
                                    itemId: row.itemId || ""
                                  };
                                  const item = items.find((i) => i._id === row.itemId) || 
                                               items.find((i) => i.name === row.itemName) || 
                                               { name: row.itemName || "Extra Item", unit: row.itemUnit || "Liter" };
                                  return (
                                    <div key={idx} className="flex items-center gap-2 bg-slate-50/40 border border-slate-100 p-2 rounded-xl">
                                      <span className="text-[10px] font-extrabold text-slate-600 truncate max-w-[85px] select-none" title={item.name}>
                                        {item.name}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={txEdit.morning}
                                          onChange={(e) => setEditedQuantities({
                                            ...editedQuantities,
                                            [txId]: { ...txEdit, morning: e.target.value, evening: "0" }
                                          })}
                                          className="h-8 border border-slate-200 rounded-lg px-2 text-xs w-16 text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                                        />
                                        <span className="text-[9px] text-slate-400 font-bold select-none">{item.unit || "L"}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )
                          ) : (
                            <div className="flex flex-col gap-1.5 items-start">
                              {extraRows.map((row, idx) => {
                                const item = items.find((i) => i._id === row.itemId) || 
                                             items.find((i) => i.name === row.itemName) || 
                                             { name: row.itemName || "Extra Item", unit: row.itemUnit || "Liter" };
                                return (
                                  <div key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50/50 text-amber-800 border border-amber-100 rounded-xl text-[10px] font-extrabold shadow-sm select-none">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    <span>{item.name}:</span>
                                    <span className="text-amber-700">{row.quantity} {item.unit || "L"}</span>
                                  </div>
                                );
                              })}
                              
                              {!isCreatedAfter(cust.createdAt, selectedDate) && (
                                <button
                                  onClick={() => handleOpenAddExtraModal(cust)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50/60 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 border border-emerald-100 hover:border-emerald-200 rounded-xl transition duration-150 font-bold text-[10px] cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] select-none w-fit"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                                  </svg>
                                  Add Extra
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bulk Actions Footer Toolbar */}
        <div className="p-5 bg-slate-50/40 border-t border-slate-100 flex justify-end gap-3 select-none">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs tracking-wider uppercase px-5 py-2.5 rounded-xl transition duration-200 cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChanges}
                className="btn-primary text-xs tracking-wider uppercase font-extrabold px-6 py-2.5 flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
                Save Logs
              </button>
            </>
          ) : isLogged ? (
            <button
              onClick={handleStartEditing}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl transition duration-200 shadow-sm hover:shadow active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Log Sheet
            </button>
          ) : (
            <button
              onClick={handleSaveChanges}
              className="btn-primary text-xs tracking-wider uppercase font-extrabold px-6 py-2.5 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              Log Today's Sheets
            </button>
          )}
        </div>
      </div>

      {/* Add Extra Item Modal */}
      {isModalOpen && modalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] w-full max-w-md p-6 space-y-6 mx-4 transform transition-all animate-in zoom-in-95 duration-200 text-slate-800">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 select-none">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span className="p-1.5 bg-emerald-50 border border-emerald-500/10 text-emerald-600 rounded-lg">
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                </span>
                Add Extra Product
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition p-1 hover:bg-slate-50 rounded-lg cursor-pointer leading-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content / Form */}
            <form onSubmit={handleAddExtraItem} className="space-y-4">
              {modalCustomer && (
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl flex items-center gap-3">
                  <span className="p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-500/10 rounded-xl">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <div>
                    <p className="font-extrabold text-slate-900 text-sm">{modalCustomer.name}</p>
                    <p className="text-xs text-slate-500">{modalCustomer.phone} • {modalCustomer.address}</p>
                  </div>
                </div>
              )}

              {/* Product Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                  Select Product
                </label>
                <select
                  value={modalItemId}
                  onChange={(e) => setModalItemId(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 cursor-pointer"
                >
                  <option value="" disabled>-- Select a Product --</option>
                  {items.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name} (₹{item.pricePerUnit}/{item.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                  Quantity
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={modalQuantity}
                  onChange={(e) => setModalQuantity(e.target.value)}
                  required
                  className="form-input-field text-xs sm:text-sm"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 select-none">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs tracking-wider uppercase px-5 py-2.5 rounded-xl transition duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs tracking-wider uppercase font-extrabold px-6 py-2.5 flex items-center gap-1.5"
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
