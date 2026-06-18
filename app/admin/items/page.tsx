"use client";
import { useState, useEffect, FormEvent } from "react";
import { IDairyItem } from "@/types";

export default function DairyItemsAdminPage() {
  // Inventory Listing and UI States
  const [items, setItems] = useState<IDairyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Add Item Input Form States
  const [name, setName] = useState<string>(" ");
  const [pricePerUnit, setPricePerUnit] = useState<string>("");
  const [unit, setUnit] = useState<string>("Liter");

  // Edit Item Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editId, setEditId] = useState<string>("");
  const [editName, setEditName] = useState<string>("");
  const [editPricePerUnit, setEditPricePerUnit] = useState<string>("");
  const [editUnit, setEditUnit] = useState<string>("Liter");

  // Load product list automatically when dashboard page renders
  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    try {
      const res = await fetch("/api/auth/dairy-items");
      if (!res.ok) throw new Error("Failed to pull database items inventory.");
      const data: IDairyItem[] = await res.json();
      setItems(data);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  // Handler: Submitting New Stock Items
  async function handleAddItem(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!name.trim()) {
      setError("Please specify a valid product title.");
      return;
    }

    try {
      const res = await fetch("/api/auth/dairy-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          pricePerUnit: Number(pricePerUnit),
          unit
        }),
      });

      const result = await res.json();

      if (res.ok) {
        setSuccessMessage(`"${name.trim()}" added successfully to core directory assets!`);
        setName("");
        setPricePerUnit("");
        setUnit("Liter");
        fetchItems(); // Instantly refresh table listing array
      } else {
        setError(result.error || "Could not register target dairy item.");
      }
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to link with backend API endpoint.");
    }
  }

  // Open Edit Modal with Item Data
  function handleOpenEditModal(item: IDairyItem) {
    setEditId(item._id);
    setEditName(item.name);
    setEditPricePerUnit(item.pricePerUnit.toString());
    setEditUnit(item.unit);
    setIsEditModalOpen(true);
    setError("");
    setSuccessMessage("");
  }

  // Handler: Saving Edited Stock Item
  async function handleSaveItem(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    try {
      const res = await fetch(`/api/auth/dairy-items/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          pricePerUnit: Number(editPricePerUnit),
          unit: editUnit
        }),
      });

      const result = await res.json();

      if (res.ok) {
        setSuccessMessage(`"${editName.trim()}" details successfully updated!`);
        setIsEditModalOpen(false);
        fetchItems(); // Refresh listing
      } else {
        setError(result.error || "Could not update dairy item.");
      }
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to save changes to backend API endpoint.");
    }
  }

  // Handler: Dropping Assets out of Inventory
  async function handleDeleteItem(itemId: string, itemName: string) {
    if (!confirm(`Are you absolutely sure you want to remove "${itemName}" from the catalog?`)) {
      return;
    }

    setError("");
    setSuccessMessage("");

    try {
      const res = await fetch(`/api/auth/dairy-items/${itemId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSuccessMessage(`"${itemName}" successfully removed from inventory listings.`);
        fetchItems(); // Trigger state re-fetch to draw updated items array
      } else {
        const result = await res.json();
        setError(result.error || "Failed to execute drop process on server side.");
      }
    } catch (err: unknown) {
      console.error(err);
      setError("Network validation dropped during transaction loop.");
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 text-black pb-12">
      {/* Title Header Layout */}
      <div className="border-b border-slate-200/60 pb-6">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <span className="p-2 bg-amber-500/10 text-amber-600 rounded-xl inline-flex">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </span>
          Dairy Products Catalog
        </h1>
        <p className="text-sm text-slate-450 font-medium mt-1">Configure pricing rates, designations, and units for stock inventory assets.</p>
      </div>

      {/* Global Alerts Feedback */}
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

      {/* Core Split Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Module Form Block */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/85 shadow-sm space-y-4">
          <h2 className="text-lg font-bold border-b pb-2 text-slate-800 flex items-center gap-2 tracking-tight">
            <span className="p-1 bg-amber-50 text-amber-600 rounded-lg">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
            </span>
            Add New Item
          </h2>
          
          <form onSubmit={handleAddItem} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Product Title</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="form-input-field text-sm" 
                placeholder="e.g. Buffalo Ghee, Fresh Paneer" 
                required 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Price per Unit (₹)</label>
              <input 
                type="number" 
                value={pricePerUnit} 
                onChange={(e) => setPricePerUnit(e.target.value)} 
                className="form-input-field text-sm font-bold" 
                placeholder="e.g. 65" 
                min="0" 
                required 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Selling Metric Unit</label>
              <select 
                value={unit} 
                onChange={(e) => setUnit(e.target.value)} 
                className="form-input-field text-sm font-semibold cursor-pointer bg-white"
              >
                <option value="Liter">Liter (L)</option>
                <option value="Kg">Kilogram (Kg)</option>
                <option value="Packet">Packet (Pkt)</option>
              </select>
            </div>

            <button type="submit" className="w-full btn-primary text-sm font-bold bg-amber-600 hover:bg-amber-700 cursor-pointer shadow-md hover:shadow active:scale-[0.98]">
              Add to Catalog
            </button>
          </form>
        </div>

        {/* Dynamic Interactive Data Inventory Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/85 shadow-sm overflow-hidden">
          <div className="p-5 bg-slate-50/70 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">
              Asset Registry 
              <span className="px-2.5 py-0.5 bg-slate-200 text-slate-650 rounded-full text-[10px] font-bold ml-2">
                {items.length} Products
              </span>
            </h3>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-400 text-xs font-semibold flex flex-col items-center justify-center gap-2">
              <svg className="w-6 h-6 animate-spin text-slate-350" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Synchronizing catalog inventory...
            </div>
          ) : items.length === 0 ? (
            <p className="p-16 text-center text-slate-450 text-xs font-semibold">No products in inventory. Fill out the form on the left to start.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/30">
                    <th className="table-header-cell border-b border-slate-100 py-3.5 px-5">Item Designation Name</th>
                    <th className="table-header-cell border-b border-slate-100 py-3.5 px-5">Pricing Unit Metrics</th>
                    <th className="table-header-cell border-b border-slate-100 py-3.5 px-5 text-right">Operational Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150/40">
                  {items.map((item) => (
                    <tr key={item._id as string} className="hover:bg-slate-50/30 transition duration-150">
                      <td className="table-body-cell py-4 px-5 font-bold text-slate-900 flex items-center gap-2">
                        {item.name}
                        {item.isDefaultItem ? (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200/60 rounded-full text-[9px] font-bold inline-flex">
                            Default
                          </span>
                        ) : null}
                      </td>
                      <td className="table-body-cell py-4 px-5 text-xs text-slate-700 font-bold">
                        ₹{item.pricePerUnit} <span className="text-[10px] text-slate-400 font-medium">/ per {item.unit}</span>
                      </td>
                      <td className="table-body-cell py-4 px-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleOpenEditModal(item)}
                            className="text-slate-650 bg-white hover:bg-slate-50 border border-slate-200/80 font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center transition cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5 mr-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item._id as string, item.name)}
                            className="text-rose-650 hover:text-rose-750 bg-rose-50/50 hover:bg-rose-50/80 border border-rose-100 font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center transition cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5 mr-1 text-rose-450" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove
                          </button>
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

      {/* Edit Dairy Item Modal Overlay */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b bg-slate-50/80 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                <span className="p-1 bg-amber-50 text-amber-600 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </span>
                Edit Dairy Item
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold cursor-pointer transition outline-none"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Product Title</label>
                <input 
                  type="text" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)} 
                  className="form-input-field text-sm" 
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Price per Unit (₹)</label>
                <input 
                  type="number" 
                  value={editPricePerUnit} 
                  onChange={(e) => setEditPricePerUnit(e.target.value)} 
                  className="form-input-field text-sm font-bold" 
                  min="0"
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Selling Metric Unit</label>
                <select 
                  value={editUnit} 
                  onChange={(e) => setEditUnit(e.target.value)} 
                  className="form-input-field text-sm font-semibold cursor-pointer bg-white"
                >
                  <option value="Liter">Liter (L)</option>
                  <option value="Kg">Kilogram (Kg)</option>
                  <option value="Packet">Packet (Pkt)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-650 font-bold rounded-xl transition duration-150 cursor-pointer text-center text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 btn-primary text-sm font-bold bg-amber-600 hover:bg-amber-700 cursor-pointer shadow-md hover:shadow transition duration-200"
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
