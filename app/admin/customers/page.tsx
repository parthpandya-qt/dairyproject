"use client";
import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { ICustomer, IDairyItem } from "@/types";

export default function CustomersAdminPage() {
  // Customers & Items List and UI States
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [items, setItems] = useState<IDairyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Add Customer Input Form States
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [morningQuantity, setMorningQuantity] = useState<string>("");
  const [eveningQuantity, setEveningQuantity] = useState<string>("");
  const [itemId, setItemId] = useState<string>("");
  const [openingBalance, setOpeningBalance] = useState<string>("0");

  // Edit Customer Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editId, setEditId] = useState<string>("");
  const [editName, setEditName] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");
  const [editAddress, setEditAddress] = useState<string>("");
  const [editMorningQuantity, setEditMorningQuantity] = useState<string>("");
  const [editEveningQuantity, setEditEveningQuantity] = useState<string>("");
  const [editItemId, setEditItemId] = useState<string>("");
  const [editOpeningBalance, setEditOpeningBalance] = useState<string>("0");

  // Load customer profiles automatically when dashboard renders
  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    try {
      const [cRes, iRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/auth/dairy-items")
      ]);
      if (!cRes.ok || !iRes.ok) throw new Error("Failed to pull customer profiles or products registry.");
      const cData: ICustomer[] = await cRes.json();
      const iData: IDairyItem[] = await iRes.json();
      setCustomers(cData);
      setItems(iData);
      if (iData.length > 0) {
        setItemId(iData[0]._id.toString());
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred loading customers.");
    } finally {
      setLoading(false);
    }
  }

  // Handler: Submitting New Customer Profile
  async function handleAddCustomer(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          morningQuantity: Number(morningQuantity),
          eveningQuantity: Number(eveningQuantity),
          itemId: itemId || null,
          openingBalance: Number(openingBalance),
        }),
      });

      const result = await res.json();

      if (res.ok) {
        setSuccessMessage(`"${name.trim()}" successfully registered as a new client!`);
        setName("");
        setPhone("");
        setAddress("");
        setMorningQuantity("");
        setEveningQuantity("");
        setItemId(items[0]?._id?.toString() || "");
        setOpeningBalance("0");
        fetchCustomers(); // Refresh list
      } else {
        setError(result.error || "Could not register new customer profile.");
      }
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to link with backend API endpoint.");
    }
  }

  // Open Edit Modal with Customer Data
  function handleOpenEditModal(cust: ICustomer) {
    setEditId(cust._id);
    setEditName(cust.name);
    setEditPhone(cust.phone);
    setEditAddress(cust.address);
    setEditMorningQuantity(cust.morningQuantity?.toString() || "0");
    setEditEveningQuantity(cust.eveningQuantity?.toString() || "0");
    setEditItemId(cust.itemId?.toString() || "");
    setEditOpeningBalance(cust.openingBalance?.toString() || "0");
    setIsEditModalOpen(true);
    setError("");
    setSuccessMessage("");
  }

  // Handler: Saving Edited Customer Profile
  async function handleSaveCustomer(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    try {
      const res = await fetch(`/api/customers/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim(),
          address: editAddress.trim(),
          morningQuantity: Number(editMorningQuantity),
          eveningQuantity: Number(editEveningQuantity),
          itemId: editItemId || null,
          openingBalance: Number(editOpeningBalance),
        }),
      });

      const result = await res.json();

      if (res.ok) {
        setSuccessMessage(`"${editName.trim()}" details successfully updated!`);
        setIsEditModalOpen(false);
        fetchCustomers(); // Refresh list
      } else {
        setError(result.error || "Could not update customer profile.");
      }
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to save changes to backend API endpoint.");
    }
  }

  // Handler: Removing customer profile
  async function handleDeleteCustomer(customerId: string, customerName: string) {
    if (!confirm(`Are you absolutely sure you want to permanently delete customer "${customerName}"?`)) {
      return;
    }

    setError("");
    setSuccessMessage("");

    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSuccessMessage(`"${customerName}" was successfully removed.`);
        fetchCustomers(); // Refresh list
      } else {
        const result = await res.json();
        setError(result.error || "Failed to delete customer profile.");
      }
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to communicate deletion request with server.");
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 text-black pb-12">
      {/* Title Header Layout */}
      <div className="border-b border-slate-200/50 pb-6 select-none">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <span className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-2xl inline-flex border border-emerald-500/20">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </span>
          Customer Directory
        </h1>
        <p className="text-xs sm:text-sm text-slate-450 font-semibold mt-2">Register, monitor, or remove customer accounts from the core database registry.</p>
      </div>

      {/* Global Alerts Feedback */}
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

      {/* Core Split Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Side: Operations Panel */}
        <div className="card-premium space-y-5">
          <h2 className="text-base font-extrabold border-b border-slate-100 pb-3 text-slate-800 flex items-center gap-2 tracking-tight">
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-500/10">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </span>
            Register Customer
          </h2>
          
          <form onSubmit={handleAddCustomer} className="space-y-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Customer Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="form-input-field text-xs sm:text-sm" 
                placeholder="e.g. Ramesh Kumar" 
                required 
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Phone Number</label>
              <input 
                type="tel" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                className="form-input-field text-xs sm:text-sm" 
                placeholder="e.g. +91 9876543210" 
                required 
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Delivery Address</label>
              <textarea 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
                className="form-input-field text-xs sm:text-sm min-h-[80px] py-2 resize-none" 
                placeholder="e.g. House 42, Vijay Nagar, Indore" 
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Morning Qty</label>
                <input 
                  type="number"
                  value={morningQuantity} 
                  onChange={(e) => setMorningQuantity(e.target.value)}
                  className="form-input-field text-xs sm:text-sm" 
                  placeholder="e.g. 1.5"
                  min="0"
                  step="0.1"
                  required 
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Evening Qty</label>
                <input 
                  type="number"
                  value={eveningQuantity} 
                  onChange={(e) => setEveningQuantity(e.target.value)}
                  className="form-input-field text-xs sm:text-sm" 
                  placeholder="e.g. 1.5"
                  min="0"
                  step="0.1"
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Allocated Item</label>
                <select 
                  value={itemId} 
                  onChange={(e) => setItemId(e.target.value)} 
                  className="form-input-field text-xs sm:text-sm font-semibold cursor-pointer bg-white"
                  required
                >
                  <option value="" disabled>Select Product</option>
                  {items.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name} ({item.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Opening Bal (₹)</label>
                <input 
                  type="number"
                  value={openingBalance} 
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="form-input-field text-xs sm:text-sm font-bold" 
                  placeholder="e.g. 500"
                  min="0"
                  required 
                />
              </div>
            </div>

            <button type="submit" className="w-full btn-primary text-xs tracking-wider uppercase font-extrabold py-3 mt-2 shadow-md">
              Add Customer
            </button>
          </form>
        </div>

        {/* Right Side: Registry Listing */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] overflow-hidden">
          <div className="p-5 bg-slate-50/40 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-2">
              Customer Registry Directory
              <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200/50 text-slate-600 rounded-full text-[10px] font-black">
                {customers.length} Clients
              </span>
            </h3>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-400 text-xs font-semibold flex flex-col items-center justify-center gap-2">
              <svg className="w-6 h-6 animate-spin text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Synchronizing customer list...
            </div>
          ) : customers.length === 0 ? (
            <div className="p-16 text-center text-slate-450 text-xs font-semibold select-none">
              No customers registered. Use the left panel to register your first client.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/30">
                    <th className="table-header-cell py-3.5 px-5">Client Info</th>
                    <th className="table-header-cell py-3.5 px-5">Daily Allocation</th>
                    <th className="table-header-cell py-3.5 px-5">Delivery Address</th>
                    <th className="table-header-cell py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((cust) => (
                    <tr key={cust._id} className="hover:bg-slate-50/15 transition-colors duration-150">
                      <td className="table-body-cell py-4 px-5">
                        <p className="font-extrabold text-slate-900 leading-tight tracking-tight">{cust.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">{cust.phone}</p>
                        <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg text-[10px] font-bold mt-2">
                          <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                          Bal: ₹{cust.openingBalance || 0}
                        </div>
                      </td>
                      <td className="table-body-cell py-4 px-5 text-xs font-semibold text-slate-700">
                        <div className="space-y-1.5">
                          <div className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <span className={cust.itemId && !items.some(i => i._id === cust.itemId?.toString()) ? 'text-slate-400 line-through' : ''}>
                              {cust.itemName || "No item allocated"}
                            </span>
                            {cust.itemId && !items.some(i => i._id === cust.itemId?.toString()) && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-450 border border-slate-200 rounded text-[9px] font-bold normal-case select-none">
                                Deleted
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 font-bold text-slate-600">
                            <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                            </svg>
                            Morn: {cust.morningQuantity} {cust.itemUnit || "L"}
                          </div>
                          <div className="flex items-center gap-1.5 font-bold text-slate-600">
                            <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                            </svg>
                            Eve: {cust.eveningQuantity} {cust.itemUnit || "L"}
                          </div>
                        </div>
                      </td>
                      <td className="table-body-cell py-4 px-5 text-slate-600 text-xs leading-relaxed max-w-[180px] truncate" title={cust.address}>
                        {cust.address}
                      </td>
                      <td className="table-body-cell py-4 px-5 text-right">
                        <div className="flex justify-end gap-2 flex-wrap sm:flex-nowrap">
                          <button 
                            onClick={() => handleOpenEditModal(cust)}
                            className="text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/80 font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center transition cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5 mr-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteCustomer(cust._id, cust.name)}
                            className="text-rose-600 hover:text-rose-700 bg-rose-50/50 hover:bg-rose-50 border border-rose-100 font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center transition cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5 mr-1 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                          <Link 
                            href={`/admin/ledger?customerId=${cust._id}`}
                            className="text-emerald-600 hover:text-emerald-700 bg-emerald-50/55 hover:bg-emerald-50 border border-emerald-100 font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center transition cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5 mr-1 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Ledger
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Customer Modal Overlay */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center select-none">
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <span className="p-1.5 bg-emerald-50 border border-emerald-500/10 text-emerald-600 rounded-lg">
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </span>
                Edit Customer Details
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold cursor-pointer transition outline-none leading-none"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Customer Name</label>
                <input 
                  type="text" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)} 
                  className="form-input-field text-xs sm:text-sm" 
                  required 
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Phone Number</label>
                <input 
                  type="tel" 
                  value={editPhone} 
                  onChange={(e) => setEditPhone(e.target.value)} 
                  className="form-input-field text-xs sm:text-sm" 
                  required 
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Delivery Address</label>
                <textarea 
                  value={editAddress} 
                  onChange={(e) => setEditAddress(e.target.value)} 
                  className="form-input-field text-xs sm:text-sm min-h-[80px] py-2 resize-none" 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Morning Qty</label>
                  <input 
                    type="number"
                    value={editMorningQuantity} 
                    onChange={(e) => setEditMorningQuantity(e.target.value)}
                    className="form-input-field text-xs sm:text-sm" 
                    min="0"
                    step="0.1"
                    required 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Evening Qty</label>
                  <input 
                    type="number"
                    value={editEveningQuantity} 
                    onChange={(e) => setEditEveningQuantity(e.target.value)}
                    className="form-input-field text-xs sm:text-sm" 
                    min="0"
                    step="0.1"
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Allocated Item</label>
                  <select 
                    value={editItemId} 
                    onChange={(e) => setEditItemId(e.target.value)} 
                    className="form-input-field text-xs sm:text-sm font-semibold cursor-pointer bg-white"
                    required
                  >
                    <option value="" disabled>Select Product</option>
                    {editItemId && !items.some((item) => item._id === editItemId) && (
                      <option value={editItemId} disabled>
                        {customers.find((c) => c._id === editId)?.itemName || "Current Item"} (Deleted)
                      </option>
                    )}
                    {items.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name} ({item.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Opening Bal (₹)</label>
                  <input 
                    type="number"
                    value={editOpeningBalance} 
                    onChange={(e) => setEditOpeningBalance(e.target.value)}
                    className="form-input-field text-xs sm:text-sm font-bold" 
                    min="0"
                    required 
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl transition duration-150 cursor-pointer text-center text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 btn-primary text-xs tracking-wider uppercase font-extrabold cursor-pointer shadow-md hover:shadow transition duration-200"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
