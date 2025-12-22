
import React, { useState } from 'react';
import { Search, Eye, Trash2, ChevronDown, ChevronUp, Edit3, CheckCircle2, AlertCircle, Filter } from 'lucide-react';
import { Invoice } from '../types';

interface InvoiceTableProps {
  invoices: Invoice[];
  onView: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (id: string) => void;
}

const InvoiceTable: React.FC<InvoiceTableProps> = ({ invoices, onView, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'verified'>('all');
  const [sortField, setSortField] = useState<keyof Invoice>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof Invoice) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredInvoices = invoices
    .filter(inv => {
      const termMatch = inv.vendor.toLowerCase().includes(searchTerm.toLowerCase()) || inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch = statusFilter === 'all' || inv.status === statusFilter;
      return termMatch && statusMatch;
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      if (typeof aValue === 'string' && typeof bValue === 'string') return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      if (typeof aValue === 'number' && typeof bValue === 'number') return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      return 0;
    });

  const SortIcon = ({ field }: { field: keyof Invoice }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 bg-slate-50/30 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Cerca fornitore, n. fattura..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-4">
           <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              {(['all', 'draft', 'verified'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {s === 'all' ? 'Tutto' : s === 'draft' ? 'Bozze' : 'Verificati'}
                </button>
              ))}
           </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/20">
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-blue-600" onClick={() => handleSort('date')}>
                <div className="flex items-center gap-2">Data <SortIcon field="date" /></div>
              </th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-blue-600" onClick={() => handleSort('vendor')}>
                <div className="flex items-center gap-2">Fornitore <SortIcon field="vendor" /></div>
              </th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Stato</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right" onClick={() => handleSort('amount')}>
                <div className="flex items-center justify-end gap-2">Importo <SortIcon field="amount" /></div>
              </th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredInvoices.length > 0 ? (
              filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-blue-50/30 transition-all group">
                  <td className="px-8 py-5 text-xs font-bold text-slate-500 tabular-nums">
                    {new Date(invoice.date).toLocaleDateString('it-IT')}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">{invoice.vendor}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">N. {invoice.invoiceNumber}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      invoice.status === 'verified' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600 ring-1 ring-amber-100'
                    }`}>
                      {invoice.status === 'verified' ? <CheckCircle2 size={12}/> : <AlertCircle size={12}/>}
                      {invoice.status === 'verified' ? 'Verificato' : 'Bozza'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right tabular-nums">
                    <span className="text-sm font-black text-slate-900">{invoice.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })} {invoice.currency}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => onView(invoice)} className="p-2.5 bg-white shadow-sm border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 rounded-xl transition-all" title="Visualizza">
                        <Eye size={18} />
                      </button>
                      <button onClick={() => onEdit(invoice)} className="p-2.5 bg-white shadow-sm border border-slate-200 text-slate-600 hover:text-amber-600 hover:border-amber-200 rounded-xl transition-all" title="Revisiona">
                        <Edit3 size={18} />
                      </button>
                      <button onClick={() => onDelete(invoice.id)} className="p-2.5 bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 rounded-xl transition-all" title="Elimina">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-8 py-24 text-center">
                  <div className="flex flex-col items-center gap-4 text-slate-300">
                    <Search size={48} strokeWidth={1.5} />
                    <p className="text-sm font-bold uppercase tracking-widest">Nessuna fattura trovata</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoiceTable;
