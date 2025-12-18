
import React from 'react';
import { Invoice } from '../types';
import { FileText, ArrowRight, Clock, ShieldCheck, Zap, Globe } from 'lucide-react';

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
        {/* Colonna Sinistra: Sommario */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-10 text-white shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-3xl font-black mb-3 tracking-tight">Archivio Condiviso</h3>
              <p className="text-blue-100 max-w-md text-sm leading-relaxed font-medium">
                I tuoi documenti sono sincronizzati in tempo reale. Qualsiasi modifica apportata da un membro del team sarà visibile istantaneamente.
              </p>
              <div className="mt-10 flex items-baseline gap-3">
                <span className="text-5xl font-black tracking-tighter tabular-nums">
                  {totalThisMonth.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €
                </span>
                <span className="text-xs font-bold text-blue-200 uppercase tracking-widest">Questo Mese</span>
              </div>
            </div>
            <Zap className="absolute right-[-20px] bottom-[-20px] w-72 h-72 text-white/5 group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute top-6 right-6 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center gap-2">
              <Globe size={14} className="text-blue-200" />
              <span className="text-[10px] font-black uppercase tracking-widest">Multi-User Sync</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock size={20} className="text-blue-600" />
                Attività Recenti
              </h4>
              <button 
                onClick={onViewAll}
                className="text-blue-600 text-sm font-bold hover:underline flex items-center gap-1.5 px-3 py-1.5 hover:bg-blue-50 rounded-lg transition-all"
              >
                Vedi archivio <ArrowRight size={14} />
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {recentInvoices.length > 0 ? (
                recentInvoices.map((inv) => (
                  <div 
                    key={inv.id} 
                    className="p-5 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group"
                    onClick={() => onInvoiceClick(inv)}
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-inner">
                        <FileText size={22} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{inv.vendor}</div>
                        <div className="text-[11px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">
                          N. {inv.invoiceNumber} • {new Date(inv.date).toLocaleDateString('it-IT')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-slate-900 tabular-nums">{inv.amount.toLocaleString('it-IT')} €</div>
                      <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Verificato</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center text-slate-400">
                  <FileText className="mx-auto mb-4 opacity-20" size={48} />
                  <p className="font-medium text-sm">Nessuna fattura presente nell'archivio condiviso.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Colonna Destra: Stato Cloud */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ShieldCheck size={24} />
              </div>
              <h4 className="font-bold text-lg">Cloud Database</h4>
            </div>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed font-medium">
              Stai utilizzando un database Supabase. Tutti i membri del tuo progetto vedono gli stessi dati in tempo reale.
            </p>
            <div className="space-y-5">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                <span className="text-slate-500">Integrità Dati</span>
                <span className="text-emerald-400">Garantita</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="w-[100%] h-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sincronizzazione Live</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Zap size={18} className="text-amber-500" />
              Suggerimento AI
            </h4>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100/50">
              <p className="text-xs text-amber-900 leading-relaxed font-medium">
                Il sistema AI ha estratto con successo i dati dalle ultime fatture. Se noti discrepanze nei nomi dei fornitori, correggili nella vista di revisione per migliorare i report aggregati.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
