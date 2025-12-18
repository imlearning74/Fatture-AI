
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, BarChart3, Plus, Trash2, X, Loader2, RefreshCw, Cloud } from 'lucide-react';
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

  // Caricamento iniziale e Sottoscrizione Real-time
  useEffect(() => {
    fetchInvoices();

    // Sottoscrizione ai cambiamenti del database per collaborazione multi-utente
    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        (payload) => {
          console.log('Cambio rilevato nel DB:', payload);
          fetchInvoices(); // Ricarica i dati quando qualcuno modifica la tabella
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      
      // La lista verrà aggiornata automaticamente dal listener real-time
      setIsUploadOpen(false);
    } catch (e: any) {
      console.error("Errore nel salvataggio della fattura:", e);
      alert(`Errore: ${e.message}`);
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
        
        // Se l'eliminazione ha successo, il listener aggiornerà la UI
        if (selectedInvoice?.id === id) setSelectedInvoice(null);
      } catch (e: any) {
        console.error("Errore nell'eliminazione della fattura:", e);
        alert(`Errore durante l'eliminazione: ${e.message}`);
      }
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
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
                  onInvoiceClick={setSelectedInvoice}
                />
              )}
              {view === AppView.INVOICES && (
                <InvoiceTable 
                  invoices={invoices} 
                  onView={setSelectedInvoice} 
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
        />
      )}

      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <div>
                <h3 className="font-bold text-xl text-slate-900 tracking-tight">{selectedInvoice.vendor}</h3>
                <div className="flex items-center gap-3 mt-1">
                   <span className="text-xs font-medium text-slate-500">Doc n. {selectedInvoice.invoiceNumber}</span>
                   <span className="text-slate-300">•</span>
                   <span className="text-xs font-medium text-slate-500">Data: {selectedInvoice.date}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              <div className="flex-1 bg-slate-100 overflow-auto p-6 flex justify-center">
                 <embed
                    src={`data:application/pdf;base64,${selectedInvoice.pdfData}`}
                    className="w-full h-full min-h-[500px] border-0 rounded-xl shadow-xl shadow-slate-300/50"
                    type="application/pdf"
                  />
              </div>
              <div className="w-full lg:w-80 bg-white border-l border-slate-100 p-8 flex flex-col gap-8">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Dati Documento</h4>
                  <div className="space-y-6">
                    <DetailItem label="Fornitore" value={selectedInvoice.vendor} />
                    <DetailItem label="Numero Documento" value={selectedInvoice.invoiceNumber} />
                    <DetailItem label="Data Emissione" value={selectedInvoice.date} />
                    <DetailItem label="Importo Totale" value={`${selectedInvoice.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })} ${selectedInvoice.currency}`} isAmount />
                  </div>
                </div>
                <div className="mt-auto space-y-4">
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <span className="text-[10px] text-slate-400 font-bold block mb-1">FILE ORIGINALE</span>
                     <span className="text-xs text-slate-600 font-medium truncate block">{selectedInvoice.fileName}</span>
                   </div>
                   <button 
                    onClick={() => handleDeleteInvoice(selectedInvoice.id)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 text-red-600 hover:bg-red-50 rounded-2xl transition-all font-bold text-sm border border-red-100"
                  >
                    <Trash2 size={18} />
                    Elimina Definitivamente
                  </button>
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
    <span className={`${isAmount ? 'text-xl font-black text-blue-600' : 'text-sm font-semibold text-slate-800'} block break-words`}>
      {value}
    </span>
  </div>
);

export default App;
