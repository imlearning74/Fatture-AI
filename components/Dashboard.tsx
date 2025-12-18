
import React from 'react';
import { Invoice } from '../types';
import { FileText, ArrowRight, Clock, ShieldCheck, Zap } from 'lucide-react';

interface DashboardProps {
  invoices: Invoice[];
  onViewAll: () => void;
  onInvoiceClick: (invoice: Invoice) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ invoices, onViewAll, onInvoiceClick }) => {
  const recentInvoices = [...invoices]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  const totalThisMonth = invoices
    .filter(inv => {
      const date = new Date(inv.date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Summary & Welcome */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-2xl font-bold mb-2">Bentornato nel tuo Archivio Smart</h3>
              <p className="text-blue-100 max-w-md">
                Gestisci le tue fatture con l'aiuto dell'intelligenza artificiale. Carica, estrai e analizza i tuoi dati in pochi secondi.
              </p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl font-bold">{totalThisMonth.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €</span>
                <span className="text-sm text-blue-200">spesi questo mese</span>
              </div>
            </div>
            <Zap className="absolute right-[-20px] bottom-[-20px] w-64 h-64 text-white/5" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock size={20} className="text-blue-600" />
                Caricamenti Recenti
              </h4>
              <button 
                onClick={onViewAll}
                className="text-blue-600 text-sm font-semibold hover:underline flex items-center gap-1"
              >
                Vedi tutto <ArrowRight size={14} />
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {recentInvoices.length > 0 ? (
                recentInvoices.map((inv) => (
                  <div 
                    key={inv.id} 
                    className="p-4 hover:bg-slate-50 transition flex items-center justify-between cursor-pointer"
                    onClick={() => onInvoiceClick(inv)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                        <FileText size={20} />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{inv.vendor}</div>
                        <div className="text-xs text-slate-500">N. {inv.invoiceNumber} • {new Date(inv.date).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{inv.amount.toLocaleString('it-IT')} €</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 italic">
                  Nessuna fattura recente.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Mini Stats & Info */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="text-emerald-400" />
              <h4 className="font-bold">Stato Archivio</h4>
            </div>
            <p className="text-xs text-slate-400 mb-4">I tuoi dati sono salvati localmente nel browser per massima privacy.</p>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Capacità Utilizzata</span>
                <span>Ottimale</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="w-[15%] h-full bg-emerald-400"></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-800 mb-4">Suggerimento AI</h4>
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <Zap size={20} />
              </div>
              <p className="text-sm text-slate-600">
                Assicurati che i PDF siano orientati correttamente e che i testi siano chiari per una migliore estrazione dei dati.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
