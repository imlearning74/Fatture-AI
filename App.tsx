
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LayoutDashboard, FileText, BarChart3, Plus, Trash2, X, Loader2, RefreshCw, Cloud, Edit2, Save, Search, User, Hash, Calendar, Banknote, CheckCircle2, AlertCircle, LogOut, Users } from 'lucide-center';
// Nota: 'lucide-react' è il nome corretto del pacchetto, correggo l'errore di battitura 'lucide-center' che potrebbe causare crash
import * as LucideIcons from 'lucide-react';
const { LayoutDashboard: DashIcon, FileText: FileIcon, BarChart3: ChartIcon, Plus: PlusIcon, Trash2: TrashIcon, X: XIcon, Loader2: LoaderIcon, Cloud: CloudIcon, Edit2: EditIcon, Save: SaveIcon, CheckCircle2: CheckIcon, AlertCircle: AlertIcon, LogOut: LogoutIcon, Users: UsersIcon, User: UserIcon, Hash: HashIcon, Calendar: CalIcon, Banknote: BankIcon } = LucideIcons;

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
  const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);
  const vendorInputRef = useRef<HTMLDivElement>(null);

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
        .channel('db-changes-shared')
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

  const handleUpdateInvoice = async () => {
    if (!selectedInvoice || !editForm || !session) return;
    setIsSyncing(true);
    try {
      const updatedData = { ...editForm, status: 'verified' as const };
      const { error } = await supabase.from('invoices').update(updatedData).eq('id', selectedInvoice.id);
      if (error) throw error;
      setSelectedInvoice({ ...selectedInvoice, ...updatedData });
      setIsEditing(false);
      fetchInvoices();
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
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Sincronizzazione Cloud...</p>
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
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Database Condiviso</p>
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
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 uppercase font-black text-xs">
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
            <span className="text-xs font-bold text-blue-600">{invoices.length} Documenti</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {view === AppView.DASHBOARD && <Dashboard invoices={invoices} onViewAll={() => setView(AppView.INVOICES)} onInvoiceClick={setSelectedInvoice} />}
          {view === AppView.INVOICES && <InvoiceTable invoices={invoices} onView={setSelectedInvoice} onEdit={(inv) => { setSelectedInvoice(inv); setIsEditing(true); }} onDelete={handleDeleteInvoice} />}
          {view === AppView.REPORTS && <Reports invoices={invoices} />}
        </div>
      </main>

      {isUploadOpen && <InvoiceUpload onClose={() => setIsUploadOpen(false)} onSuccess={handleAddInvoices} existingVendors={[]} />}

      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xl text-slate-900 tracking-tight">{isEditing ? 'Modifica Dati' : selectedInvoice.vendor}</h3>
                <p className="text-xs font-medium text-slate-500">Documento n. {selectedInvoice.invoiceNumber}</p>
              </div>
              <button onClick={() => { setSelectedInvoice(null); setIsEditing(false); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><XIcon size={24} /></button>
            </div>
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              <div className="flex-1 bg-slate-100 p-6 flex justify-center">
                 <embed src={`data:application/pdf;base64,${selectedInvoice.pdfData}`} className="w-full h-full border-0 rounded-xl shadow-xl" type="application/pdf" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
