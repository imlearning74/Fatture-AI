
import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as LucideIcons from 'lucide-react';

// Added Zap to the destructuring to fix line 238 error
const { 
  LayoutDashboard: DashIcon, 
  FileText: FileIcon, 
  BarChart3: ChartIcon, 
  Plus: PlusIcon, 
  Trash2: TrashIcon, 
  X: XIcon, 
  Loader2: LoaderIcon, 
  Cloud: CloudIcon, 
  Edit2: EditIcon, 
  Save: SaveIcon, 
  CheckCircle2: CheckIcon, 
  AlertCircle: AlertIcon, 
  LogOut: LogoutIcon,
  Search: SearchIcon,
  Calendar: CalIcon,
  Banknote: BankIcon,
  Hash: HashIcon,
  ChevronRight: ChevronRightIcon,
  Zap
} = LucideIcons;

import { Invoice, AppView } from './types';
import { supabase } from './lib/supabase';
import InvoiceTable from './components/InvoiceTable';
import InvoiceUpload from './components/InvoiceUpload';
import Reports from './components/Reports';
import Dashboard from './components/Dashboard';
import { Auth } from './components/Auth';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Invoice>>({});
  const [vendorSuggestions, setVendorSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Generazione dinamica del Blob URL per sbloccare la selezione testo nel PDF
  const pdfUrl = useMemo(() => {
    if (!selectedInvoice?.pdfData) return null;
    try {
      const binaryString = atob(selectedInvoice.pdfData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      return URL.createObjectURL(blob);
    } catch (e) {
      console.error("Errore PDF:", e);
      return null;
    }
  }, [selectedInvoice?.id]); // Rigenera solo se cambia fattura

  useEffect(() => {
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
  }, [pdfUrl]);

  // Intellisense: Lista fornitori unici da fatture verificate
  const allVerifiedVendors = useMemo(() => {
    const vendors = invoices
      .filter(inv => inv.status === 'verified')
      .map(inv => inv.vendor)
      .filter(v => v && v !== "FORNITORE SCONOSCIUTO");
    return Array.from(new Set(vendors)).sort();
  }, [invoices]);

  // Chiudi suggerimenti al clic esterno
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const draftInvoices = useMemo(() => invoices.filter(inv => inv.status === 'draft'), [invoices]);
  const verifiedInvoices = useMemo(() => invoices.filter(inv => inv.status === 'verified'), [invoices]);
  
  const nextDraft = useMemo(() => {
    if (!selectedInvoice) return null;
    return draftInvoices.find(inv => inv.id !== selectedInvoice.id) || null;
  }, [draftInvoices, selectedInvoice]);

  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };
    initSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchInvoices();
      const channel = supabase
        .channel('db-changes-main')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => fetchInvoices())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [session]);

  const fetchInvoices = async () => {
    if (!session) return;
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.from('invoices').select('*').order('date', { ascending: false });
      if (error) throw error;
      if (data) setInvoices(data as Invoice[]);
    } finally { setIsSyncing(false); }
  };

  const handleAddInvoices = async (newInvoices: Invoice[]) => {
    if (!session?.user?.id) return;
    try {
      const invoicesWithUser = newInvoices.map(inv => ({ ...inv, user_id: session.user.id }));
      const { error } = await supabase.from('invoices').insert(invoicesWithUser);
      if (error) throw error;
      setIsUploadOpen(false);
      fetchInvoices();
    } catch (e: any) { alert(e.message); }
  };

  const startEditing = (invoice: Invoice) => {
    setEditForm({
      vendor: invoice.vendor === "FORNITORE SCONOSCIUTO" ? "" : invoice.vendor,
      invoiceNumber: invoice.invoiceNumber === "DA COMPILARE" ? "" : invoice.invoiceNumber,
      date: invoice.date,
      amount: invoice.amount,
      currency: invoice.currency
    });
    setSelectedInvoice(invoice);
    setIsEditing(true);
  };

  const handleUpdateInvoice = async () => {
    if (!selectedInvoice || !editForm || !session) return;
    setIsSyncing(true);
    try {
      const updatedData = { ...editForm, status: 'verified' as const };
      const { error } = await supabase.from('invoices').update(updatedData).eq('id', selectedInvoice.id);
      if (error) throw error;
      setSelectedInvoice({ ...selectedInvoice, ...updatedData, status: 'verified' });
      setIsEditing(false);
      fetchInvoices();
    } catch (e: any) { alert("Salvataggio fallito"); } finally { setIsSyncing(false); }
  };

  const handleVendorChange = (val: string) => {
    setEditForm(prev => ({ ...prev, vendor: val }));
    if (val.length > 0) {
      const filtered = allVerifiedVendors.filter(v => v.toLowerCase().includes(val.toLowerCase()));
      setVendorSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center bg-slate-900"><LoaderIcon className="animate-spin text-blue-500" size={48}/></div>;
  if (!session) return <Auth />;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-6">
          <h1 className="text-xl font-bold flex items-center gap-2"><FileIcon className="text-blue-400" /> InvoiceAI</h1>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">Sincronizzazione Attiva</p>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <button onClick={() => setView(AppView.DASHBOARD)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${view === AppView.DASHBOARD ? 'bg-blue-600 shadow-lg' : 'text-slate-300 hover:bg-slate-800'}`}><DashIcon size={20} /> Dashboard</button>
          <button onClick={() => setView(AppView.INVOICES)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${view === AppView.INVOICES ? 'bg-blue-600 shadow-lg' : 'text-slate-300 hover:bg-slate-800'}`}><FileIcon size={20} /> Archivio</button>
          <button onClick={() => setView(AppView.REPORTS)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${view === AppView.REPORTS ? 'bg-blue-600 shadow-lg' : 'text-slate-300 hover:bg-slate-800'}`}><ChartIcon size={20} /> Analisi</button>
        </nav>
        <div className="p-4"><button onClick={() => setIsUploadOpen(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg"><PlusIcon size={20} /> Carica File</button></div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-lg font-bold text-slate-800">{view}</h2>
          <div className="flex items-center gap-3 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full">
            <CloudIcon size={14} className="text-blue-400" /><span className="text-xs font-bold text-blue-600">{invoices.length} File</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          {view === AppView.DASHBOARD && <Dashboard invoices={invoices} onViewAll={() => setView(AppView.INVOICES)} onInvoiceClick={setSelectedInvoice} />}
          {view === AppView.INVOICES && <InvoiceTable invoices={invoices} onView={setSelectedInvoice} onEdit={startEditing} onDelete={(id) => supabase.from('invoices').delete().eq('id', id)} />}
          {view === AppView.REPORTS && <Reports invoices={invoices} />}
        </div>
      </main>

      {isUploadOpen && <InvoiceUpload onClose={() => setIsUploadOpen(false)} onSuccess={handleAddInvoices} verifiedExamples={verifiedInvoices} />}

      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-7xl h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${selectedInvoice.status === 'verified' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                  {selectedInvoice.status === 'verified' ? <CheckIcon size={24} /> : <AlertIcon size={24} />}
                </div>
                <div><h3 className="font-bold text-xl text-slate-900 tracking-tight">{isEditing ? 'Revisione Dati' : selectedInvoice.vendor}</h3><p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{selectedInvoice.status} • {selectedInvoice.fileName}</p></div>
              </div>
              <button onClick={() => { setSelectedInvoice(null); setIsEditing(false); }} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><XIcon size={24} /></button>
            </div>
            
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              <div className="flex-1 bg-slate-800 p-6 flex justify-center overflow-hidden">
                {pdfUrl ? (
                  <iframe 
                    src={`${pdfUrl}#view=FitH`} 
                    className="w-full h-full border-0 rounded-2xl shadow-2xl bg-white" 
                    title="Invoice PDF Preview"
                  />
                ) : <div className="flex flex-col items-center justify-center text-white/20 gap-4"><LoaderIcon className="animate-spin" size={48} /><p className="font-bold">Caricamento...</p></div>}
              </div>

              <div className="w-full lg:w-[420px] bg-white border-l border-slate-100 p-8 flex flex-col overflow-y-auto">
                <div className="flex-1">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-2"><Zap size={12}/> Estrazione Intelligente</h4>
                  
                  {isEditing ? (
                    <div className="space-y-6">
                      <div className="space-y-1.5 relative" ref={suggestionsRef}>
                        <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">Fornitore</label>
                        <input 
                          type="text" 
                          value={editForm.vendor} 
                          onChange={(e) => handleVendorChange(e.target.value)}
                          onFocus={() => editForm.vendor && handleVendorChange(editForm.vendor)}
                          className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" 
                          placeholder="Cerca o inserisci fornitore..."
                        />
                        {showSuggestions && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[60] overflow-hidden">
                             <div className="p-1.5 max-h-[220px] overflow-y-auto custom-scrollbar">
                                {vendorSuggestions.map((v, i) => (
                                  <button key={i} onClick={() => { setEditForm({ ...editForm, vendor: v }); setShowSuggestions(false); }} className="w-full text-left px-4 py-3 hover:bg-blue-50 rounded-xl text-xs font-bold text-slate-700 transition-colors flex items-center justify-between group">
                                    {v} <ChevronRightIcon size={12} className="opacity-0 group-hover:opacity-100 text-blue-500" />
                                  </button>
                                ))}
                             </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">Numero Fattura</label>
                        <input type="text" value={editForm.invoiceNumber} onChange={(e) => setEditForm({...editForm, invoiceNumber: e.target.value})} className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">Data</label>
                        <input type="date" value={editForm.date} onChange={(e) => setEditForm({...editForm, date: e.target.value})} className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">Totale {selectedInvoice.currency}</label>
                        <input type="number" step="0.01" value={editForm.amount} onChange={(e) => setEditForm({...editForm, amount: parseFloat(e.target.value) || 0})} className="w-full px-4 py-4 bg-blue-50 border border-blue-100 rounded-2xl text-xl font-black text-blue-600 outline-none" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-10">
                      <DetailItem label="Fornitore" value={selectedInvoice.vendor} icon={<FileIcon size={14}/>} />
                      <DetailItem label="N. Documento" value={selectedInvoice.invoiceNumber} icon={<HashIcon size={14}/>} />
                      <DetailItem label="Data" value={new Date(selectedInvoice.date).toLocaleDateString()} icon={<CalIcon size={14}/>} />
                      <DetailItem label="Totale" value={`${selectedInvoice.amount.toLocaleString()} ${selectedInvoice.currency}`} icon={<BankIcon size={14}/>} isAmount />
                    </div>
                  )}
                </div>

                <div className="pt-8 border-t border-slate-100 mt-8 flex flex-col gap-3">
                  {isEditing ? (
                    <button onClick={handleUpdateInvoice} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"><SaveIcon size={18} /> Salva e Apprendi</button>
                  ) : (
                    <button onClick={() => startEditing(selectedInvoice)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-800 transition-all flex items-center justify-center gap-2"><EditIcon size={18} /> Correggi Dati</button>
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

const DetailItem: React.FC<{ label: string; value: string; icon: React.ReactNode; isAmount?: boolean }> = ({ label, value, icon, isAmount }) => (
  <div className="group">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2 group-hover:text-blue-500 transition-colors">{icon} {label}</span>
    <span className={`${isAmount ? 'text-4xl font-black text-blue-600' : 'text-sm font-bold text-slate-800'} block`}>{value}</span>
  </div>
);

export default App;
