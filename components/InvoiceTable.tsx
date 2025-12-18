
import React, { useState } from 'react';
import { Search, Eye, Trash2, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { Invoice } from '../types';

interface InvoiceTableProps {
  invoices: Invoice[];
  onView: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (id: string) => void;
}

const InvoiceTable: React.FC<InvoiceTableProps> = ({ invoices, onView, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
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
    .filter(inv => 
      inv.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return 0;
    });

  const SortIcon = ({ field }: { field: keyof Invoice }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cerca per fornitore o numero..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-blue-600 transition" onClick={() => handleSort('date')}>
                <div className="flex items-center gap-1">Data <SortIcon field="date" /></div>
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-blue-600 transition" onClick={() => handleSort('vendor')}>
                <div className="flex items-center gap-1">Fornitore <SortIcon field="vendor" /></div>
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-blue-600 transition" onClick={() => handleSort('invoiceNumber')}>
                <div className="flex items-center gap-1">N. Fattura <SortIcon field="invoiceNumber" /></div>
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-blue-600 transition text-right" onClick={() => handleSort('amount')}>
                <div className="flex items-center justify-end gap-1">Importo <SortIcon field="amount" /></div>
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredInvoices.length > 0 ? (
              filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50 transition group">
                  <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                    {new Date(invoice.date).toLocaleDateString('it-IT')}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                    {invoice.vendor}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {invoice.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right tabular-nums">
                    {invoice.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })} {invoice.currency}
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onView(invoice)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Visualizza"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => onEdit(invoice)}
                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        title="Modifica"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        onClick={() => onDelete(invoice.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Elimina"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                  Nessuna fattura trovata
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
