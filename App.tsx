
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LayoutDashboard, FileText, BarChart3, Plus, Trash2, X, Loader2, RefreshCw, Cloud, Edit2, Save, Search, User, Hash, Calendar, Banknote, ChevronRight } from 'lucide-react';
import { Invoice, AppView } from './types';
import { supabase } from './lib/supabase';
import InvoiceTable from './components/InvoiceTable';
import InvoiceUpload from './components/InvoiceUpload';
import Reports from './components/Reports';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Stato per la modifica della fattura selezionata
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Invoice>>({});
  const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);
  const vendorInputRef = useRef<HTMLDivElement>(null);

  // Calcola i fornitori univoci per l'autocompletamento
  const uniqueVendors = useMemo(() => {
    return Array.from(new Set(invoices.map(i => i.vendor))).sort();
  }, [invoices]);

  // Caricamento iniziale e Sottoscrizione Real-time
  useEffect(() => {
    fetchInvoices();

    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        (payload) => {
          fetchInvoices(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Gestione click esterno per suggerimenti fornitori in edit mode
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (vendorInputRef.current && !vendorInputRef.current.contains(event.target as Node)) {
        setShowVendorSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchInvoices = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      if (data) setInvoices(data as Invoice[]);
    } catch (e: any) {
      console.error("Errore nel caricamento delle fatture:", e);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  const handleAddInvoice = async (invoice: Invoice) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .insert([invoice]);

      if (error) throw new Error(error.message);
      setIsUploadOpen(false);
    } catch (e: any) {
      console.error("Errore nel salvataggio della fattura:", e);
      alert(`Errore: ${e.message}`);
    }
  };

  const handleUpdateInvoice = async () => {
    if (!selectedInvoice || !editForm) return;

    setIsSyncing(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .update(editForm)
        .eq('id', selectedInvoice.id);

      if (error) throw error;
      
      setSelectedInvoice({ ...selectedInvoice, ...editForm } as Invoice);
      setIsEditing(false);
    } catch (e: any) {
      console.error("Errore nell'aggiornamento:", e);
      alert("Errore durante l'aggiornamento dei dati.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questa fattura definitivamente dal database condiviso?")) {
      try {
        const { error } = await supabase
          .from('invoices')
          .delete()
          .eq('id', id);

        if (error) throw error;
        if (selectedInvoice?.id === id) setSelectedInvoice(null);
      } catch (e: any) {
        console.error("Errore nell'eliminazione della fattura:", e);
        alert(`Errore durante l'eliminazione: ${e.message}`);
      }
    }
  };

  const startEditing = (invoice: Invoice) => {
    setEditForm({
      vendor: invoice.vendor,
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.date,
      amount: invoice.amount,
      currency: invoice.currency
    });
    setSelectedInvoice(invoice);
    setIsEditing(true);
  };

  // Logica suggerimenti: mostra tutto se il campo è vuoto, altrimenti filtra
  const filteredVendorSuggestions = useMemo(() => {
    const input = editForm.vendor?.toLowerCase() || '';
    if (!input) return uniqueVendors;
    return uniqueVendors.filter(v => v.toLowerCase().includes(input));
  }, [editForm.vendor, uniqueVendors]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileText className="text-blue-400" />
            InvoiceAI
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Cloud Sync Attivo</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button
            onClick={() => setView(AppView.DASHBOARD)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              view === AppView.DASHBOARD ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          <button
            onClick={() => setView(AppView.INVOICES)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              view === AppView.INVOICES ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FileText size={20} />
            Archivio
          </button>
          <button
            onClick={() => setView(AppView.REPORTS)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              view === AppView.REPORTS ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <BarChart3 size={20} />
            Analisi AI
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => setIsUploadOpen(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold transition shadow-lg shadow-blue-900/20 active:scale-95"
          >
            <Plus size={20} />
            Carica Fattura
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800">
              {view === AppView.DASHBOARD && 'Dashboard Principale'}
              {view === AppView.INVOICES && 'Gestione Documenti'}
              {view === AppView.REPORTS && 'Reportistica Intelligente'}
            </h2>
            {isSyncing && <RefreshCw size={14} className="animate-spin text-blue-500" />}
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full">
              <Cloud size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-500">
                {invoices.length} {invoices.length === 1 ? 'Elemento' : 'Elementi'}
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {isLoading && invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="animate-spin text-blue-500 w-12 h-12" />
              <p className="text-slate-400 font-medium">Connessione al database cloud...</p>
            </div>
          ) : (
            <>
              {view === AppView.DASHBOARD && (
                <Dashboard 
                  invoices={invoices} 
                  onViewAll={() => setView(AppView.INVOICES)}
                  onInvoiceClick={(inv) => { setSelectedInvoice(inv); setIsEditing(false); }}
                />
              )}
              {view === AppView.INVOICES && (
                <InvoiceTable 
                  invoices={invoices} 
                  onView={(inv) => { setSelectedInvoice(inv); setIsEditing(false); }} 
                  onEdit={startEditing}
                  onDelete={handleDeleteInvoice} 
                />
              )}
              {view === AppView.REPORTS && <Reports invoices={invoices} />}
            </>
          )}
        </div>
      </main>

      {isUploadOpen && (
        <InvoiceUpload 
          onClose={() => setIsUploadOpen(false)} 
          onSuccess={handleAddInvoice} 
          existingVendors={uniqueVendors}
        />
      )}

      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <div className="flex-1">
                <h3 className="font-bold text-xl text-slate-900 tracking-tight">{isEditing ? 'Modifica Dati' : selectedInvoice.vendor}</h3>
                <div className="flex items-center gap-3 mt-1">
                   <span className="text-xs font-medium text-slate-500">Doc n. {selectedInvoice.invoiceNumber}</span>
                   <span className="text-slate-300">•</span>
                   <span className="text-xs font-medium text-slate-500">Data: {selectedInvoice.date}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!isEditing && (
                  <button 
                    onClick={() => startEditing(selectedInvoice)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold text-sm shadow-lg shadow-blue-500/20"
                  >
                    <Edit2 size={16} />
                    Modifica Dati
                  </button>
                )}
                <button 
                  onClick={() => { setSelectedInvoice(null); setIsEditing(false); }}
                  className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-400 hover:text-slate-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              <div className="flex-1 bg-slate-100 overflow-auto p-6 flex justify-center">
                 <embed
                    src={`data:application/pdf;base64,${selectedInvoice.pdfData}`}
                    className="w-full h-full min-h-[500px] border-0 rounded-xl shadow-xl shadow-slate-300/50"
                    type="application/pdf"
                  />
              </div>
              
              <div className="w-full lg:w-96 bg-white border-l border-slate-100 p-8 flex flex-col overflow-y-auto">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Dati Documento</h4>
                
                {isEditing ? (
                  <div className="space-y-5">
                    {/* EDIT FORNITORE */}
                    <div className="space-y-1 relative" ref={vendorInputRef}>
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><User size={14}/> Fornitore</label>
                      <div className="relative">
                        <input 
                          type="text"
                          value={editForm.vendor}
                          onChange={(e) => { setEditForm({...editForm, vendor: e.target.value}); setShowVendorSuggestions(true); }}
                          onFocus={() => setShowVendorSuggestions(true)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                        />
                      </div>
                      {showVendorSuggestions && filteredVendorSuggestions.length > 0 && (
                        <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] max-h-48 overflow-y-auto">
                          {filteredVendorSuggestions.map((v, i) => (
                            <button
                              key={i}
                              onClick={() => { setEditForm({...editForm, vendor: v}); setShowVendorSuggestions(false); }}
                              className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors border-b border-slate-50 last:border-0"
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Hash size={14}/> N. Fattura</label>
                      <input 
                        type="text"
                        value={editForm.invoiceNumber}
                        onChange={(e) => setEditForm({...editForm, invoiceNumber: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Calendar size={14}/> Data</label>
                      <input 
                        type="date"
                        value={editForm.date}
                        onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Banknote size={14}/> Importo</label>
                      <div className="flex gap-2">
                        <input 
                          type="number"
                          step="0.01"
                          value={editForm.amount}
                          onChange={(e) => setEditForm({...editForm, amount: parseFloat(e.target.value) || 0})}
                          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                        />
                        <select 
                          value={editForm.currency}
                          onChange={(e) => setEditForm({...editForm, currency: e.target.value})}
                          className="w-20 px-1 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="EUR">EUR</option>
                          <option value="USD">USD</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-6 flex gap-3">
                      <button 
                        onClick={() => setIsEditing(false)}
                        className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all"
                      >
                        Annulla
                      </button>
                      <button 
                        onClick={handleUpdateInvoice}
                        className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                      >
                        <Save size={16} /> Salva Dati
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <DetailItem label="Fornitore" value={selectedInvoice.vendor} />
                    <DetailItem label="Numero Documento" value={selectedInvoice.invoiceNumber} />
                    <DetailItem label="Data Emissione" value={selectedInvoice.date} />
                    <DetailItem label="Importo Totale" value={`${selectedInvoice.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })} ${selectedInvoice.currency}`} isAmount />
                  </div>
                )}

                <div className="mt-auto pt-8 space-y-4">
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <span className="text-[10px] text-slate-400 font-bold block mb-1 uppercase">File Originale</span>
                     <span className="text-xs text-slate-600 font-medium truncate block">{selectedInvoice.fileName}</span>
                   </div>
                   {!isEditing && (
                     <button 
                      onClick={() => handleDeleteInvoice(selectedInvoice.id)}
                      className="w-full flex items-center justify-center gap-2 py-3.5 text-red-600 hover:bg-red-50 rounded-2xl transition-all font-bold text-sm border border-red-100"
                    >
                      <Trash2 size={18} />
                      Elimina Definitivamente
                    </button>
                   )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailItem: React.FC<{ label: string; value: string; isAmount?: boolean }> = ({ label, value, isAmount }) => (
  <div>
    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">{label}</span>
    <span className={`${isAmount ? 'text-2xl font-black text-blue-600' : 'text-sm font-semibold text-slate-800'} block break-words`}>
      {value}
    </span>
  </div>
);

export default App;

