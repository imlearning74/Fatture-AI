
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Invoice } from '../types';
import { Download, FileText, TrendingUp, Users } from 'lucide-react';

interface ReportsProps {
  invoices: Invoice[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const Reports: React.FC<ReportsProps> = ({ invoices }) => {
  // Aggregate data for bar chart (Monthly spending)
  const monthlyData = useMemo(() => {
    const data: Record<string, number> = {};
    invoices.forEach(inv => {
      const date = new Date(inv.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      data[key] = (data[key] || 0) + inv.amount;
    });

    return Object.entries(data)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [invoices]);

  // Aggregate data for pie chart (Vendor distribution)
  const vendorData = useMemo(() => {
    const data: Record<string, number> = {};
    invoices.forEach(inv => {
      data[inv.vendor] = (data[inv.vendor] || 0) + inv.amount;
    });

    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Show top 5
  }, [invoices]);

  const totalSpent = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const avgInvoice = invoices.length > 0 ? totalSpent / invoices.length : 0;
  const uniqueVendors = new Set(invoices.map(i => i.vendor)).size;

  const exportCSV = () => {
    const headers = ['ID', 'Data', 'Fornitore', 'Numero', 'Importo', 'Valuta'];
    const rows = invoices.map(inv => [
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
    link.setAttribute("download", `report_fatture_${new Date().toISOString().split('T')[0]}.csv`);
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
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-800">Analisi Spese</h3>
        <button 
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition text-sm font-medium"
        >
          <Download size={18} />
          Esporta CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={<TrendingUp className="text-blue-600" />} 
          label="Totale Speso" 
          value={`${totalSpent.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €`}
          sub="Basato su tutte le fatture"
        />
        <StatCard 
          icon={<FileText className="text-green-600" />} 
          label="Media Fattura" 
          value={`${avgInvoice.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €`}
          sub={`${invoices.length} documenti totali`}
        />
        <StatCard 
          icon={<Users className="text-purple-600" />} 
          label="Fornitori Attivi" 
          value={uniqueVendors.toString()}
          sub="Fornitori distinti trovati"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Trend */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h4 className="font-bold text-slate-800 mb-6">Andamento Mensile</h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
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
          <h4 className="font-bold text-slate-800 mb-6">Top Fornitori per Spesa</h4>
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
          <div className="grid grid-cols-2 gap-2 mt-4">
             {vendorData.map((v, i) => (
               <div key={v.name} className="flex items-center gap-2 text-xs">
                 <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                 <span className="text-slate-600 truncate max-w-[120px]">{v.name}</span>
                 <span className="font-bold text-slate-900">{v.value.toLocaleString('it-IT')} €</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string, sub: string }> = ({ icon, label, value, sub }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
    <div className="flex items-center gap-4 mb-4">
      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">{icon}</div>
      <span className="text-sm font-medium text-slate-500">{label}</span>
    </div>
    <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
    <div className="text-xs text-slate-400">{sub}</div>
  </div>
);

import { BarChart3 } from 'lucide-react';
export default Reports;
