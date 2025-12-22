
import React from 'react';
import { Invoice } from '../types';
import { FileText, ArrowRight, Clock, ShieldCheck, Zap, Globe, AlertCircle, CheckCircle2 } from 'lucide-react';

interface DashboardProps {
  invoices: Invoice[];
  onViewAll: () => void;
  onInvoiceClick: (invoice: Invoice) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ invoices, onViewAll, onInvoiceClick }) => {
  const recentInvoices = [...invoices]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  const draftsCount = invoices.filter(i => i.status === 'draft').length;
  const verifiedCount = invoices.filter(i => i.status === 'verified').length;

  const totalThisMonth = invoices
    .filter(inv => {
      const date = new Date(inv.date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Card Spesa Totale */}
        <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[32px] p-10 text-white shadow-2xl relative overflow-hidden group">
          <div className="relative z-10">
            <h3 className="text-3xl font-black mb-3 tracking-tight">Gestione Massiva</h3>
            <p className="text-blue-100 max-w-sm text-sm leading-relaxed font-medium">
              Analisi AI automatica per migliaia di documenti simultaneamente. Revisiona le bozze per garantire dati certi al 100%.
            </p>
            <div className="mt-10 flex items-baseline gap-3">
              <span className="text-5xl font-black tracking-tighter tabular-nums">
                {totalThisMonth.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €
              </span>
              <span className="text-xs font-bold text-blue-200 uppercase tracking-widest">Mese Corrente</span>
            </div>
          </div>
          <Zap className="absolute right-[-20px] bottom-[-20px] w-72 h-72 text-white/5 group-hover:scale-110 transition-transform duration-700" />
        </div>

        {/* Status Verifiche */}
        <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
           <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                <AlertCircle size={14} className="text-amber-500" /> Da Verificare
              </h4>
              <div className="text-4xl font-black text-slate-900 tabular-nums">{draftsCount}</div>
              <p className="text-xs font-medium text-slate-500 mt-2">Documenti in stato di bozza</p>
           </div>
           <button onClick={onViewAll} className="mt-8 py-3 bg-amber-50 text-amber-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-100 transition-all">
             Vedi Bozze
           </button>
        </div>

        {/* Verificati */}
        <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
           <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" /> Verificati
              </h4>
              <div className="text-4xl font-black text-slate-900 tabular-nums">{verifiedCount}</div>
              <p className="text-xs font-medium text-slate-500 mt-2">Dati confermati nel sistema</p>
           </div>
           <div className="mt-8 flex items-center gap-2 pt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Database Cloud Sincro</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between">
            <h4 className="font-black text-slate-800 flex items-center gap-3">
              <Clock size={20} className="text-blue-600" />
              Ultime Acquisizioni
            </h4>
            <button onClick={onViewAll} className="text-blue-600 text-xs font-black uppercase tracking-widest hover:bg-blue-50 px-4 py-2 rounded-xl transition-all flex items-center gap-2">
              Vedi Tutto <ArrowRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {recentInvoices.length > 0 ? (
              recentInvoices.map((inv) => (
                <div key={inv.id} className="p-6 hover:bg-slate-50 transition-all flex items-center justify-between cursor-pointer group" onClick={() => onInvoiceClick(inv)}>
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm ${
                      inv.status === 'verified' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      <FileText size={22} />
                    </div>
                    <div>
                      <div className="font-black text-slate-900 text-sm">{inv.vendor}</div>
                      <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wide flex items-center gap-2">
                        {inv.status === 'verified' ? <CheckCircle2 size={10}/> : <AlertCircle size={10}/>}
                        {inv.status === 'verified' ? 'Verificato' : 'Bozza'} • N. {inv.invoiceNumber}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-slate-900 tabular-nums">{inv.amount.toLocaleString('it-IT')} €</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{new Date(inv.date).toLocaleDateString('it-IT')}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-24 text-center">
                <FileText className="mx-auto mb-4 opacity-10" size={64} />
                <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">L'archivio è vuoto</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-xl">
             <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <ShieldCheck size={24} />
                </div>
                <h4 className="font-black text-lg tracking-tight">Integrità Dati</h4>
             </div>
             <p className="text-xs text-slate-400 mb-8 leading-relaxed font-medium">
               Per gestire migliaia di fatture, utilizza il caricamento cartella. I dati estratti rimarranno in sospeso fino alla tua conferma manuale.
             </p>
             <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="text-[10px] font-black text-blue-200 uppercase tracking-widest">Sincronizzazione</div>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                   <span className="text-[10px] font-bold">Attiva</span>
                </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
