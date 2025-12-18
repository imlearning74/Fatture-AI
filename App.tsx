
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, BarChart3, Plus, Trash2, X, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      if (data) setInvoices(data as Invoice[]);
    } catch (e: any) {
      console.error("Errore nel caricamento delle fatture:", e);
      // Non mostriamo alert qui per non disturbare l'utente all'avvio se il db è vuoto
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddInvoice = async (invoice: Invoice) => {
    try {
      // Inserimento nel database Supabase
      const { error } = await supabase
        .from('invoices')
        .insert([invoice]);

      if (error) {
        console.error("Errore Supabase:", error);
        throw new Error(error.message);
      }
      
      setInvoices(prev => [invoice, ...prev]);
      setIsUploadOpen(false);
    } catch (e: any) {
      console.error("Errore nel salvataggio della fattura:", e);
      alert(`Errore durante il salvataggio nel database: ${e.message || 'Controlla che la tabella invoices esista in Supabase.'}`);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questa fattura definitivamente dal database?")) {
      try {
        const { error } = await supabase
          .from('invoices')
          .delete()
          .eq('id', id);

        if (error) throw error;

        setInvoices(prev => prev.filter(inv => inv.id !== id));
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
          <p className="text-xs text-slate-400 mt-1">Database Cloud Attivo</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button
            onClick={() => setView(AppView.DASHBOARD)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              view === AppView.DASHBOARD ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          <button
            onClick={() => setView(AppView.INVOICES)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              view === AppView.INVOICES ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FileText size={20} />
            Fatture
          </button>
          <button
            onClick={() => setView(AppView.REPORTS)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              view === AppView.REPORTS ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <BarChart3 size={20} />
            Report e Analisi
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => setIsUploadOpen(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition"
          >
            <Plus size={20} />
            Nuova Fattura
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-lg font-semibold text-slate-800">
            {view === AppView.DASHBOARD && 'Panoramica'}
            {view === AppView.INVOICES && 'Archivio Fatture'}
            {view === AppView.REPORTS && 'Reportistica'}
          </h2>
          <div className="flex items-center gap-4">
            {isLoading && <Loader2 className="animate-spin text-blue-500" size={18} />}
            <span className="text-sm text-slate-500">
              {invoices.length} {invoices.length === 1 ? 'fattura' : 'fatture'} nel cloud
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {isLoading && invoices.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin text-blue-500 w-12 h-12" />
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{selectedInvoice.vendor}</h3>
                <p className="text-sm text-slate-500">Fattura n. {selectedInvoice.invoiceNumber} • {selectedInvoice.date}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              <div className="flex-1 bg-slate-100 overflow-auto p-4 flex justify-center">
                 <embed
                    src={`data:application/pdf;base64,${selectedInvoice.pdfData}`}
                    className="w-full h-full min-h-[500px] border-0"
                    type="application/pdf"
                  />
              </div>
              <div className="w-full lg:w-80 bg-white border-l border-slate-200 p-6 flex flex-col gap-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Dettagli</h4>
                  <div className="space-y-4">
                    <DetailItem label="Fornitore" value={selectedInvoice.vendor} />
                    <DetailItem label="N. Fattura" value={selectedInvoice.invoiceNumber} />
                    <DetailItem label="Data" value={selectedInvoice.date} />
                    <DetailItem label="Importo" value={`${selectedInvoice.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })} ${selectedInvoice.currency}`} />
                    <DetailItem label="File Originale" value={selectedInvoice.fileName} />
                  </div>
                </div>
                <div className="mt-auto">
                   <button 
                    onClick={() => handleDeleteInvoice(selectedInvoice.id)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-red-600 hover:bg-red-50 rounded-lg transition border border-red-200"
                  >
                    <Trash2 size={18} />
                    Elimina Fattura
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

const DetailItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <span className="text-xs text-slate-500 block">{label}</span>
    <span className="font-medium text-slate-900 block break-words">{value}</span>
  </div>
);

export default App;

