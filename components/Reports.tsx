
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Invoice } from '../types';
import { Download, FileText, TrendingUp, Users, Filter, BarChart3, Calendar } from 'lucide-react';

interface ReportsProps {
  invoices: Invoice[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

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

  const months = [
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

  // Dati aggregati per andamento mensile (sulle fatture filtrate)
  const monthlyData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredInvoices.forEach(inv => {
      const date = new Date(inv.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      data[key] = (data[key] || 0) + inv.amount;
    });

    return Object.entries(data)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredInvoices]);

  // Dati aggregati per distribuzione fornitori (sulle fatture filtrate)
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
      `"${inv.vendor}"`,
      inv.invoiceNumber,
      inv.amount,
      inv.currency
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(',') + "\n"
      + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `report_filtrato_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <BarChart3 className="text-slate-300 w-16 h-16 mb-4" />
        <p className="text-slate-500 font-medium">Carica almeno una fattura per visualizzare i report.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Analisi Spese</h3>
          <p className="text-sm text-slate-500">Analizza i tuoi dati con filtri personalizzati</p>
        </div>
        <button 
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition text-sm font-medium shadow-sm"
        >
          <Download size={18} />
          Esporta Vista Corrente
        </button>
      </div>

      {/* Sezione Filtri */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
            <Users size={14} /> Fornitore
          </label>
          <select 
            value={filterVendor}
            onChange={(e) => setFilterVendor(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Tutti i fornitori</option>
            {uniqueVendors.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="w-32">
          <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
            <Calendar size={14} /> Anno
          </label>
          <select 
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Tutti</option>
            {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="w-40">
          <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
            <Calendar size={14} /> Mese
          </label>
          <select 
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Tutti i mesi</option>
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <button 
          onClick={() => { setFilterVendor('all'); setFilterYear('all'); setFilterMonth('all'); }}
          className="p-2 text-slate-400 hover:text-blue-600 transition text-sm flex items-center gap-1"
        >
          Reset
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={<TrendingUp className="text-blue-600" />} 
          label="Totale Vista" 
          value={`${totalSpent.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €`}
          sub={`Su ${filteredInvoices.length} fatture filtrate`}
        />
        <StatCard 
          icon={<FileText className="text-green-600" />} 
          label="Media Vista" 
          value={`${avgInvoice.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €`}
          sub="Valore medio documenti"
        />
        <StatCard 
          icon={<Users className="text-purple-600" />} 
          label="Fornitori Coinvolti" 
          value={filteredVendorsCount.toString()}
          sub="Fornitori unici nel filtro"
        />
      </div>

      {filteredInvoices.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Monthly Trend */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-800 mb-6">Andamento Mensile Filtrato</h4>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}} 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Vendor Split */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-800 mb-6 flex items-center justify-between">
              Top Fornitori 
              <span className="text-xs font-normal text-slate-400">Primi 5</span>
            </h4>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={vendorData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {vendorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 gap-2 mt-4">
               {vendorData.map((v, i) => (
                 <div key={v.name} className="flex items-center justify-between text-xs p-1.5 hover:bg-slate-50 rounded">
                   <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full shrink-0" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                     <span className="text-slate-600 truncate max-w-[180px] font-medium">{v.name}</span>
                   </div>
                   <span className="font-bold text-slate-900 tabular-nums">{v.value.toLocaleString('it-IT')} €</span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-20 text-center rounded-2xl border border-slate-200 shadow-sm text-slate-500">
          <Filter className="mx-auto mb-4 text-slate-300" size={48} />
          <p className="font-medium">Nessun dato corrisponde ai filtri selezionati.</p>
          <button 
            onClick={() => { setFilterVendor('all'); setFilterYear('all'); setFilterMonth('all'); }}
            className="mt-4 text-blue-600 hover:underline text-sm font-semibold"
          >
            Rimuovi tutti i filtri
          </button>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string, sub: string }> = ({ icon, label, value, sub }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition duration-300">
    <div className="flex items-center gap-4 mb-4">
      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">{icon}</div>
      <span className="text-sm font-bold text-slate-500 uppercase tracking-tight">{label}</span>
    </div>
    <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
    <div className="text-xs text-slate-400 font-medium">{sub}</div>
  </div>
);

export default Reports;

