
import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as LucideIcons from 'lucide-react';

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
  ChevronRight: ChevronRightIcon
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

  // Calcoliamo quante bozze rimangono oltre a quella eventualmente selezionata
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
      } catch (e) {
        console.error("Errore Auth:", e);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

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
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      if (data) setInvoices(data as Invoice[]);
    } catch (e: any) {
      console.error("Errore DB:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddInvoices = async (newInvoices: Invoice[]) => {
    if (!session?.user?.id) return;
    try {
      const invoicesWithUser = newInvoices.map(inv => ({
        ...inv,
        user_id: session.user.id
      }));
      
      const { error } = await supabase.from('invoices').insert(invoicesWithUser);
      if (error) throw new Error(error.message);
      setIsUploadOpen(false);
      fetchInvoices();
    } catch (e: any) {
      alert(`Errore: ${e.message}`);
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

  const goToNextDraft = () => {
    if (nextDraft) {
      setSelectedInvoice(nextDraft);
      setIsEditing(false);
      setEditForm({});
    } else {
      setSelectedInvoice(null);
    }
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
    } catch (e: any) {
      alert("Errore durante il salvataggio.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleVerifyDirectly = async (invoice: Invoice) => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('invoices').update({ status: 'verified' }).eq('id', invoice.id);
      if (error) throw error;
      setSelectedInvoice({ ...invoice, status: 'verified' });
      fetchInvoices();
    } catch (e: any) {
      alert("Errore durante la verifica.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (window.confirm("Eliminare definitivamente questa fattura?")) {
      try {
        const { error } = await supabase.from('invoices').delete().eq('id', id);
        if (error) throw error;
        
        if (nextDraft) {
          goToNextDraft();
        } else {
          setSelectedInvoice(null);
        }
        fetchInvoices();
      } catch (e: any) {
        alert("Errore eliminazione.");
      }
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setInvoices([]);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 gap-4">
        <LoaderIcon className="animate-spin text-blue-500 w-12 h-12" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Accesso in corso...</p>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileIcon className="text-blue-400" />
            InvoiceAI
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Cloud Sync</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button onClick={() => setView(AppView.DASHBOARD)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${view === AppView.DASHBOARD ? 'bg-blue-600 shadow-lg' : 'text-slate-300 hover:bg-slate-800'}`}>
            <DashIcon size={20} /> Dashboard
          </button>
          <button onClick={() => setView(AppView.INVOICES)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${view === AppView.INVOICES ? 'bg-blue-600 shadow-lg' : 'text-slate-300 hover:bg-slate-800'}`}>
            <FileIcon size={20} /> Archivio
          </button>
          <button onClick={() => setView(AppView.REPORTS)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${view === AppView.REPORTS ? 'bg-blue-600 shadow-lg' : 'text-slate-300 hover:bg-slate-800'}`}>
            <ChartIcon size={20} /> Analisi
          </button>
        </nav>

        <div className="p-4 space-y-3">
          <button onClick={() => setIsUploadOpen(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold transition shadow-lg active:scale-95">
            <PlusIcon size={20} /> Carica File
          </button>
          
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 uppercase font-black text-[10px]">
                {session?.user?.email?.[0]}
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest truncate">{session?.user?.email}</p>
                <button onClick={handleLogout} className="text-[9px] font-bold text-red-400 hover:text-red-300 transition-colors uppercase mt-0.5 flex items-center gap-1">
                  <LogoutIcon size={10}/> Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-lg font-bold text-slate-800">
            {view === AppView.DASHBOARD && 'Dashboard'}
            {view === AppView.INVOICES && 'Archivio Documenti'}
            {view === AppView.REPORTS && 'Analisi Spese'}
          </h2>
          <div className="flex items-center gap-3 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full">
            <CloudIcon size={14} className="text-blue-400" />
            <span className="text-xs font-bold text-blue-600">{invoices.length} File</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {view === AppView.DASHBOARD && <Dashboard invoices={invoices} onViewAll={() => setView(AppView.INVOICES)} onInvoiceClick={setSelectedInvoice} />}
          {view === AppView.INVOICES && <InvoiceTable invoices={invoices} onView={setSelectedInvoice} onEdit={startEditing} onDelete={handleDeleteInvoice} />}
          {view === AppView.REPORTS && <Reports invoices={invoices} />}
        </div>
      </main>

      {isUploadOpen && <InvoiceUpload onClose={() => setIsUploadOpen(false)} onSuccess={handleAddInvoices} verifiedExamples={verifiedInvoices} />}

      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${selectedInvoice.status === 'verified' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                  {selectedInvoice.status === 'verified' ? <CheckIcon size={24} /> : <AlertIcon size={24} />}
                </div>
                <div>
                  <h3 className="font-bold text-xl text-slate-900 tracking-tight">
                    {isEditing ? 'Modifica Dati' : selectedInvoice.vendor}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Documento {selectedInvoice.status === 'verified' ? 'Verificato' : 'Bozza'} n. {selectedInvoice.invoiceNumber}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!isEditing && selectedInvoice.status === 'draft' && selectedInvoice.vendor !== "FORNITORE SCONOSCIUTO" && (
                  <button onClick={() => handleVerifyDirectly(selectedInvoice)} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center gap-2">
                    <CheckIcon size={18} /> Approva Rapido
                  </button>
                )}
                <button onClick={() => { setSelectedInvoice(null); setIsEditing(false); }} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-all"><XIcon size={24} /></button>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              <div className="flex-1 bg-slate-200 p-6 flex justify-center overflow-hidden">
                 <embed src={`data:application/pdf;base64,${selectedInvoice.pdfData}`} className="w-full h-full border-0 rounded-2xl shadow-2xl" type="application/pdf" />
              </div>

              <div className="w-full lg:w-[400px] bg-white border-l border-slate-100 p-8 flex flex-col overflow-y-auto">
                <div className="flex-1">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8">Dati Estratti</h4>
                  
                  {isEditing ? (
                    <div className="space-y-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><FileIcon size={12}/> Fornitore</label>
                        <input type="text" value={editForm.vendor} onChange={(e) => setEditForm({...editForm, vendor: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><HashIcon size={12}/> Numero Fattura</label>
                        <input type="text" value={editForm.invoiceNumber} onChange={(e) => setEditForm({...editForm, invoiceNumber: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><CalIcon size={12}/> Data Emissione</label>
                        <input type="date" value={editForm.date} onChange={(e) => setEditForm({...editForm, date: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><BankIcon size={12}/> Importo ({selectedInvoice.currency})</label>
                        <input type="number" step="0.01" value={editForm.amount} onChange={(e) => setEditForm({...editForm, amount: parseFloat(e.target.value) || 0})} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black text-blue-600 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-10">
                      <DetailItem label="Fornitore" value={selectedInvoice.vendor} icon={<FileIcon size={14}/>} />
                      <DetailItem label="N. Documento" value={selectedInvoice.invoiceNumber} icon={<HashIcon size={14}/>} />
                      <DetailItem label="Data Emissione" value={new Date(selectedInvoice.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })} icon={<CalIcon size={14}/>} />
                      <DetailItem label="Importo Totale" value={`${selectedInvoice.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })} ${selectedInvoice.currency}`} icon={<BankIcon size={14}/>} isAmount />
                    </div>
                  )}
                </div>

                <div className="pt-8 border-t border-slate-100 mt-8 space-y-3">
                  {isEditing ? (
                    <div className="flex flex-col gap-3">
                      <button onClick={handleUpdateInvoice} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                        <SaveIcon size={16} /> Salva e Verifica
                      </button>
                      <button onClick={() => setIsEditing(false)} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Annulla</button>
                    </div>
                  ) : (
                    <>
                      {selectedInvoice.status === 'verified' && nextDraft && (
                        <button onClick={goToNextDraft} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 animate-bounce-slow">
                          Prossima Bozza <ChevronRightIcon size={16} />
                        </button>
                      )}
                      
                      {selectedInvoice.status === 'draft' && (
                        <button onClick={() => startEditing(selectedInvoice)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                          <EditIcon size={16} /> {selectedInvoice.vendor === "FORNITORE SCONOSCIUTO" ? "Compila Manualmente" : "Modifica Dati"}
                        </button>
                      )}

                      {nextDraft && (
                         <button onClick={goToNextDraft} className="w-full py-3 bg-blue-50 text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center gap-2">
                           Salta alla prossima bozza <ChevronRightIcon size={14} />
                         </button>
                      )}

                      <button onClick={() => handleDeleteInvoice(selectedInvoice.id)} className="w-full py-4 bg-white text-red-500 border border-red-100 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2">
                        <TrashIcon size={16} /> Elimina Documento
                      </button>
                    </>
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
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2 group-hover:text-blue-500 transition-colors">
      {icon} {label}
    </span>
    <span className={`${isAmount ? 'text-3xl font-black text-blue-600' : 'text-sm font-bold text-slate-800'} block break-words`}>
      {value}
    </span>
  </div>
);

export default App;
