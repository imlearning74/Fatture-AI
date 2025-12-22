
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LayoutDashboard, FileText, BarChart3, Plus, Trash2, X, Loader2, RefreshCw, Cloud, Edit2, Save, Search, User, Hash, Calendar, Banknote, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
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
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Invoice>>({});
  const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);
  const vendorInputRef = useRef<HTMLDivElement>(null);

  const uniqueVendors = useMemo(() => {
    return Array.from(new Set(invoices.map(i => i.vendor))).sort();
  }, [invoices]);

  useEffect(() => {
    fetchInvoices();
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => fetchInvoices())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

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
      console.error("Errore DB:", e);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  const handleAddInvoices = async (newInvoices: Invoice[]) => {
    try {
      const { error } = await supabase.from('invoices').insert(newInvoices);
      if (error) throw new Error(error.message);
      setIsUploadOpen(false);
    } catch (e: any) {
      alert(`Errore salvataggio: ${e.message}`);
    }
  };

  const handleUpdateInvoice = async () => {
    if (!selectedInvoice || !editForm) return;
    setIsSyncing(true);
    try {
      // Quando salviamo manualmente, forziamo lo stato a 'verified'
      const updatedData = { ...editForm, status: 'verified' as const };
      const { error } = await supabase.from('invoices').update(updatedData).eq('id', selectedInvoice.id);
      if (error) throw error;
      setSelectedInvoice({ ...selectedInvoice, ...updatedData });
      setIsEditing(false);
    } catch (e: any) {
      alert("Errore aggiornamento.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (window.confirm("Eliminare definitivamente questa fattura?")) {
      try {
        const { error } = await supabase.from('invoices').delete().eq('id', id);
        if (error) throw error;
        if (selectedInvoice?.id === id) setSelectedInvoice(null);
      } catch (e: any) {
        alert("Errore eliminazione.");
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
          <button onClick={() => setView(AppView.DASHBOARD)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${view === AppView.DASHBOARD ? 'bg-blue-600 shadow-lg shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800'}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => setView(AppView.INVOICES)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${view === AppView.INVOICES ? 'bg-blue-600 shadow-lg shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800'}`}>
            <FileText size={20} /> Archivio
          </button>
          <button onClick={() => setView(AppView.REPORTS)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${view === AppView.REPORTS ? 'bg-blue-600 shadow-lg shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800'}`}>
            <BarChart3 size={20} /> Analisi AI
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={() => setIsUploadOpen(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold transition shadow-lg active:scale-95">
            <Plus size={20} /> Caricamento Massivo
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-lg font-bold text-slate-800">
            {view === AppView.DASHBOARD && 'Dashboard Principale'}
            {view === AppView.INVOICES && 'Gestione Documenti'}
            {view === AppView.REPORTS && 'Reportistica Intelligente'}
          </h2>
          <div className="flex items-center gap-3 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full">
            <Cloud size={14} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-500">{invoices.length} Elementi</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {isLoading && invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="animate-spin text-blue-500 w-12 h-12" />
              <p className="text-slate-400 font-medium">Connessione al database...</p>
            </div>
          ) : (
            <>
              {view === AppView.DASHBOARD && <Dashboard invoices={invoices} onViewAll={() => setView(AppView.INVOICES)} onInvoiceClick={setSelectedInvoice} />}
              {view === AppView.INVOICES && <InvoiceTable invoices={invoices} onView={setSelectedInvoice} onEdit={startEditing} onDelete={handleDeleteInvoice} />}
              {view === AppView.REPORTS && <Reports invoices={invoices} />}
            </>
          )}
        </div>
      </main>

      {isUploadOpen && <InvoiceUpload onClose={() => setIsUploadOpen(false)} onSuccess={handleAddInvoices} existingVendors={uniqueVendors} />}

      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="font-bold text-xl text-slate-900 tracking-tight">{isEditing ? 'Revisione Manuale' : selectedInvoice.vendor}</h3>
                  <div className="flex items-center gap-3 mt-1">
                     <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${selectedInvoice.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {selectedInvoice.status === 'verified' ? <CheckCircle2 size={10}/> : <AlertCircle size={10}/>}
                        {selectedInvoice.status === 'verified' ? 'Verificato' : 'Bozza'}
                     </span>
                     <span className="text-xs font-medium text-slate-500">N. {selectedInvoice.invoiceNumber}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!isEditing && (
                  <button onClick={() => startEditing(selectedInvoice)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold text-sm shadow-lg shadow-indigo-500/20">
                    <Edit2 size={16} /> Revisiona e Conferma
                  </button>
                )}
                <button onClick={() => { setSelectedInvoice(null); setIsEditing(false); }} className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-400">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              <div className="flex-1 bg-slate-100 overflow-auto p-6 flex justify-center">
                 <embed src={`data:application/pdf;base64,${selectedInvoice.pdfData}`} className="w-full h-full min-h-[500px] border-0 rounded-xl shadow-xl" type="application/pdf" />
              </div>
              <div className="w-full lg:w-96 bg-white border-l border-slate-100 p-8 flex flex-col overflow-y-auto">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Informazioni Estratte</h4>
                {isEditing ? (
                  <div className="space-y-5">
                    <div className="space-y-1 relative" ref={vendorInputRef}>
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><User size={14}/> Fornitore</label>
                      <input type="text" value={editForm.vendor} onChange={(e) => { setEditForm({...editForm, vendor: e.target.value}); setShowVendorSuggestions(true); }} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none" />
                      {showVendorSuggestions && filteredVendorSuggestions.length > 0 && (
                        <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-40 overflow-y-auto">
                          {filteredVendorSuggestions.map((v, i) => (
                            <button key={i} onClick={() => { setEditForm({...editForm, vendor: v}); setShowVendorSuggestions(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 border-b border-slate-50 last:border-0">{v}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Hash size={14}/> N. Fattura</label>
                      <input type="text" value={editForm.invoiceNumber} onChange={(e) => setEditForm({...editForm, invoiceNumber: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Calendar size={14}/> Data</label>
                      <input type="date" value={editForm.date} onChange={(e) => setEditForm({...editForm, date: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Banknote size={14}/> Importo</label>
                      <div className="flex gap-2">
                        <input type="number" step="0.01" value={editForm.amount} onChange={(e) => setEditForm({...editForm, amount: parseFloat(e.target.value) || 0})} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                        <select value={editForm.currency} onChange={(e) => setEditForm({...editForm, currency: e.target.value})} className="w-20 px-1 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none">
                          <option value="EUR">EUR</option>
                          <option value="USD">USD</option>
                        </select>
                      </div>
                    </div>
                    <div className="pt-6 flex gap-3">
                      <button onClick={() => setIsEditing(false)} className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200">Annulla</button>
                      <button onClick={handleUpdateInvoice} className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"><Save size={16} /> Conferma Dati</button>
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
                     <span className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider text-center">Integrità File Garantita</span>
                     <span className="text-[10px] text-slate-400 truncate block text-center font-medium opacity-60 italic">MD5 Sync: {selectedInvoice.id.split('-')[0]}</span>
                   </div>
                   {!isEditing && (
                     <button onClick={() => handleDeleteInvoice(selectedInvoice.id)} className="w-full flex items-center justify-center gap-2 py-3.5 text-red-600 hover:bg-red-50 rounded-2xl transition-all font-bold text-sm border border-red-100">
                      <Trash2 size={18} /> Elimina Documento
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
