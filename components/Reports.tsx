
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Invoice } from '../types';
import { Download, FileText, TrendingUp, Users, Filter, BarChart3, Calendar, RotateCcw } from 'lucide-react';

interface ReportsProps {
  invoices: Invoice[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const MONTH_NAMES = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
];

const Reports: React.FC<ReportsProps> = ({ invoices }) => {
  const [filterVendor, setFilterVendor] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');

  // Estrai opzioni uniche per i filtri basate su TUTTE le fatture
  const uniqueVendors = useMemo(() => 
    Array.from(new Set(invoices.map(i => i.vendor))).sort(), 
    [invoices]
  );
  
  const uniqueYears = useMemo(() => 
    Array.from(new Set(invoices.map(i => new Date(i.date).getFullYear().toString()))).sort((a, b) => b.localeCompare(a)), 
    [invoices]
  );

  const monthsOptions = [
    { value: '1', label: 'Gennaio' }, { value: '2', label: 'Febbraio' },
    { value: '3', label: 'Marzo' }, { value: '4', label: 'Aprile' },
    { value: '5', label: 'Maggio' }, { value: '6', label: 'Giugno' },
    { value: '7', label: 'Luglio' }, { value: '8', label: 'Agosto' },
    { value: '9', label: 'Settembre' }, { value: '10', label: 'Ottobre' },
    { value: '11', label: 'Novembre' }, { value: '12', label: 'Dicembre' }
  ];

  // Filtra le fatture in base ai criteri selezionati
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const d = new Date(inv.date);
      const yearMatch = filterYear === 'all' || d.getFullYear().toString() === filterYear;
      const monthMatch = filterMonth === 'all' || (d.getMonth() + 1).toString() === filterMonth;
      const vendorMatch = filterVendor === 'all' || inv.vendor === filterVendor;
      return yearMatch && monthMatch && vendorMatch;
    });
  }, [invoices, filterYear, filterMonth, filterVendor]);

  // Dati aggregati per andamento mensile con NOMI DEI MESI
  const monthlyData = useMemo(() => {
    const data: Record<string, { total: number, sortKey: string }> = {};
    
    filteredInvoices.forEach(inv => {
      const date = new Date(inv.date);
      const year = date.getFullYear();
      const monthIdx = date.getMonth();
      // Creiamo un nome leggibile come "Gen 24"
      const label = `${MONTH_NAMES[monthIdx]} ${year.toString().slice(-2)}`;
      const sortKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      
      if (!data[label]) {
        data[label] = { total: 0, sortKey };
      }
      data[label].total += inv.amount;
    });

    return Object.entries(data)
      .map(([name, info]) => ({ name, total: info.total, sortKey: info.sortKey }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filteredInvoices]);

  // Dati aggregati per distribuzione fornitori
  const vendorData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredInvoices.forEach(inv => {
      data[inv.vendor] = (data[inv.vendor] || 0) + inv.amount;
    });

    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); 
  }, [filteredInvoices]);

  const totalSpent = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const avgInvoice = filteredInvoices.length > 0 ? totalSpent / filteredInvoices.length : 0;
  const filteredVendorsCount = new Set(filteredInvoices.map(i => i.vendor)).size;

  const exportCSV = () => {
    const headers = ['ID', 'Data', 'Fornitore', 'Numero', 'Importo', 'Valuta'];
    const rows = filteredInvoices.map(inv => [
      inv.id,
      inv.date,
      `"${inv.vendor.replace(/"/g, '""')}"`,
      inv.invoiceNumber,
      inv.amount,
      inv.currency
    ]);
    
    const csvContent = "\uFEFF" + headers.join(',') + "\n" + rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `report_fatture_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
          <BarChart3 className="text-slate-300 w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Nessun dato disponibile</h3>
        <p className="text-slate-500 max-w-sm text-center px-6">
          Carica la tua prima fattura per sbloccare i report dettagliati e l'analisi dell'andamento spese.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Analisi Spese</h3>
          <p className="text-slate-500 mt-1">Dati basati su {filteredInvoices.length} documenti filtrati</p>
        </div>
        <button 
          onClick={exportCSV}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Download size={18} />
          Esporta CSV
        </button>
      </div>

      {/* Pannello Filtri - Migliorato visivamente */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold">
          <Filter size={18} className="text-blue-600" />
          Filtra i risultati
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Users size={13} /> Fornitore
            </label>
            <select 
              value={filterVendor}
              onChange={(e) => setFilterVendor(e.target.value)}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="all">Tutti i fornitori</option>
              {uniqueVendors.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar size={13} /> Anno
            </label>
            <select 
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="all">Tutti gli anni</option>
              {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar size={13} /> Mese
            </label>
            <select 
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="all">Tutti i mesi</option>
              {monthsOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button 
              onClick={() => { setFilterVendor('all'); setFilterYear('all'); setFilterMonth('all'); }}
              className="h-11 px-4 text-slate-400 hover:text-blue-600 transition-colors text-sm font-bold flex items-center gap-2 group"
            >
              <RotateCcw size={16} className="group-hover:rotate-[-45deg] transition-transform" />
              Reset filtri
            </button>
          </div>
        </div>
      </div>

      {/* Riepilogo Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={<TrendingUp className="text-blue-600" />} 
          label="Totale Filtrato" 
          value={`${totalSpent.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €`}
          color="blue"
        />
        <StatCard 
          icon={<FileText className="text-emerald-600" />} 
          label="Valore Medio" 
          value={`${avgInvoice.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €`}
          color="emerald"
        />
        <StatCard 
          icon={<Users className="text-amber-600" />} 
          label="Fornitori Attivi" 
          value={filteredVendorsCount.toString()}
          color="amber"
        />
      </div>

      {filteredInvoices.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Grafico Andamento Mensile */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h4 className="font-bold text-slate-900 text-lg">Andamento Mensile</h4>
              <div className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider rounded-full">
                Trend temporale
              </div>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} 
                    dy={15}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12}} 
                    tickFormatter={(value) => `${value}€`}
                  />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}} 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'}}
                    formatter={(value: number) => [`${value.toLocaleString('it-IT')} €`, 'Totale']}
                  />
                  <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grafico Distribuzione Fornitori */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h4 className="font-bold text-slate-900 text-lg">Distribuzione Fornitori</h4>
              <div className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider rounded-full">
                Concentrazione
              </div>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={vendorData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {vendorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                    formatter={(value: number) => [`${value.toLocaleString('it-IT')} €`, 'Spesa']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-6">
               {vendorData.map((v, i) => (
                 <div key={v.name} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors">
                   <div className="flex items-center gap-3 overflow-hidden">
                     <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                     <span className="text-slate-700 font-semibold text-sm truncate">{v.name}</span>
                   </div>
                   <span className="font-bold text-slate-900 text-sm tabular-nums shrink-0 ml-4">
                    {v.value.toLocaleString('it-IT')} €
                   </span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-24 text-center rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Filter className="text-slate-300" size={32} />
          </div>
          <h4 className="text-lg font-bold text-slate-900 mb-2">Nessun risultato trovato</h4>
          <p className="text-slate-500 mb-6">Prova a modificare i parametri di ricerca o azzera i filtri.</p>
          <button 
            onClick={() => { setFilterVendor('all'); setFilterYear('all'); setFilterMonth('all'); }}
            className="px-6 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-bold text-sm"
          >
            Azzera tutti i filtri
          </button>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string, color: 'blue' | 'emerald' | 'amber' }> = ({ icon, label, value, color }) => {
  const colorClasses = {
    blue: "from-blue-50 to-white text-blue-600",
    emerald: "from-emerald-50 to-white text-emerald-600",
    amber: "from-amber-50 to-white text-amber-600"
  };

  return (
    <div className={`bg-gradient-to-b ${colorClasses[color]} p-7 rounded-3xl border border-slate-200 shadow-sm group hover:shadow-md transition-all duration-300`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center border border-white/50 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</span>
      </div>
      <div className="text-2xl font-black text-slate-900 tracking-tight">{value}</div>
    </div>
  );
};

export default Reports;
