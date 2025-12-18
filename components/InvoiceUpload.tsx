
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, X, Loader2, CheckCircle2, AlertCircle, FileWarning, ShieldAlert, Save, Edit3, Calendar, User, Hash, Banknote, Search } from 'lucide-react';
import { Invoice, ExtractionResult } from '../types';
import { extractInvoiceData } from '../geminiService';

interface InvoiceUploadProps {
  onClose: () => void;
  onSuccess: (invoice: Invoice) => void;
  existingVendors: string[];
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const InvoiceUpload: React.FC<InvoiceUploadProps> = ({ onClose, onSuccess, existingVendors }) => {
  const [status, setStatus] = useState<'idle' | 'reading' | 'processing' | 'review' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [errorType, setErrorType] = useState<'validation' | 'processing' | 'ai'>('validation');
  const [tempFile, setTempFile] = useState<{ name: string; base64: string } | null>(null);
  
  // Stato per i suggerimenti fornitori
  const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);
  const vendorInputRef = useRef<HTMLDivElement>(null);
  
  // Stato per i dati in fase di revisione
  const [reviewData, setReviewData] = useState<ExtractionResult>({
    invoiceNumber: '',
    vendor: '',
    date: '',
    amount: 0,
    currency: 'EUR'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chiudi suggerimenti quando clicchi fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (vendorInputRef.current && !vendorInputRef.current.contains(event.target as Node)) {
        setShowVendorSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (!result) {
          reject(new Error("Il file sembra vuoto o non leggibile."));
          return;
        }
        resolve(result.split(',')[1]);
      };
      reader.onerror = () => reject(new Error("Errore durante la lettura del file."));
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');
    
    if (file.type !== 'application/pdf') {
      setStatus('error');
      setErrorType('validation');
      setErrorMessage(`Formato "${file.type || 'sconosciuto'}" non supportato. Carica esclusivamente file PDF.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setStatus('error');
      setErrorType('validation');
      setErrorMessage(`Il file è troppo grande (${(file.size / (1024 * 1024)).toFixed(1)}MB). Il limite massimo è 10MB.`);
      return;
    }

    try {
      setStatus('reading');
      const base64 = await readFileAsBase64(file);
      setTempFile({ name: file.name, base64 });
      
      setStatus('processing');
      const data = await extractInvoiceData(base64);

      if (data) {
        setReviewData(data);
        setStatus('review');
      } else {
        setReviewData({
          invoiceNumber: '',
          vendor: '',
          date: new Date().toISOString().split('T')[0],
          amount: 0,
          currency: 'EUR'
        });
        setStatus('review');
      }
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorType('processing');
      setErrorMessage(err.message || "Si è verificato un problema tecnico durante l'elaborazione.");
    }
  };

  const handleSave = () => {
    if (!tempFile) return;
    
    if (!reviewData.vendor || !reviewData.date || reviewData.amount <= 0) {
      alert("Per favore, compila correttamente i campi obbligatori (Fornitore, Data, Importo).");
      return;
    }

    const newInvoice: Invoice = {
      id: crypto.randomUUID(),
      ...reviewData,
      pdfData: tempFile.base64,
      fileName: tempFile.name,
      createdAt: Date.now()
    };
    
    setStatus('success');
    setTimeout(() => onSuccess(newInvoice), 600);
  };

  const filteredVendorSuggestions = useMemo(() => {
    const input = reviewData.vendor?.toLowerCase() || '';
    if (!input) return existingVendors;
    return existingVendors.filter(v => v.toLowerCase().includes(input));
  }, [reviewData.vendor, existingVendors]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col ${status === 'review' ? 'w-full max-w-2xl' : 'w-full max-w-md'}`}>
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              {status === 'review' ? 'Revisione Dati Fattura' : 'Nuova Fattura'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {status === 'review' ? 'Verifica e correggi i dati estratti dall\'AI' : 'Analisi istantanea con Gemini AI'}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[80vh]">
          {status === 'idle' && (
            <div className="p-8">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center gap-5 hover:border-blue-500 hover:bg-blue-50/30 cursor-pointer transition-all group relative"
              >
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm">
                  <Upload size={36} />
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-800 text-lg">Seleziona Documento</p>
                  <p className="text-sm text-slate-500 mt-1">Trascina qui il tuo PDF o clicca per sfogliare</p>
                </div>
                <div className="mt-2 px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Max 10MB • PDF Only
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="application/pdf"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          )}

          {(status === 'reading' || status === 'processing') && (
            <div className="p-12 flex flex-col items-center justify-center gap-8">
              <div className="relative">
                <Loader2 className="w-20 h-20 text-blue-600 animate-spin" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <h4 className="font-black text-xl text-slate-900 tracking-tight">
                  {status === 'reading' ? 'Lettura in corso...' : 'Analisi AI in corso...'}
                </h4>
                <p className="text-sm text-slate-500 mt-2">
                  Stiamo estraendo i dati dal tuo documento.
                </p>
              </div>
            </div>
          )}

          {status === 'review' && (
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Fornitore con Autocompletamento */}
                <div className="space-y-2 relative" ref={vendorInputRef}>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <User size={14} className="text-blue-500" /> Fornitore
                  </label>
                  <div className="relative">
                    <input 
                      type="text"
                      value={reviewData.vendor}
                      onChange={(e) => {
                        setReviewData({...reviewData, vendor: e.target.value});
                        setShowVendorSuggestions(true);
                      }}
                      onFocus={() => setShowVendorSuggestions(true)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all pr-10"
                      placeholder="Cerca o inserisci fornitore"
                    />
                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  </div>
                  
                  {/* Menu Suggerimenti */}
                  {showVendorSuggestions && filteredVendorSuggestions.length > 0 && (
                    <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] max-h-48 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                      <div className="p-2 border-b border-slate-50 bg-slate-50/50">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Suggeriti dall'archivio</span>
                      </div>
                      {filteredVendorSuggestions.map((v, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setReviewData({...reviewData, vendor: v});
                            setShowVendorSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors border-b border-slate-50 last:border-0"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Numero Fattura */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Hash size={14} className="text-blue-500" /> Numero Fattura
                  </label>
                  <input 
                    type="text"
                    value={reviewData.invoiceNumber}
                    onChange={(e) => setReviewData({...reviewData, invoiceNumber: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                    placeholder="Es. FATT-2024-001"
                  />
                </div>

                {/* Data */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={14} className="text-blue-500" /> Data Documento
                  </label>
                  <input 
                    type="date"
                    value={reviewData.date}
                    onChange={(e) => setReviewData({...reviewData, date: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                  />
                </div>

                {/* Importo e Valuta */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Banknote size={14} className="text-blue-500" /> Importo Totale
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="number"
                      step="0.01"
                      value={reviewData.amount}
                      onChange={(e) => setReviewData({...reviewData, amount: parseFloat(e.target.value) || 0})}
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                    />
                    <select 
                      value={reviewData.currency}
                      onChange={(e) => setReviewData({...reviewData, currency: e.target.value})}
                      className="w-24 px-2 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex gap-4">
                <button 
                  onClick={() => setStatus('idle')}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl transition-all font-bold text-sm hover:bg-slate-200 active:scale-95"
                >
                  Cambia File
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl transition-all font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Conferma e Salva
                </button>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="p-12 flex flex-col items-center justify-center gap-5 text-emerald-600 animate-in zoom-in">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center shadow-inner">
                <CheckCircle2 size={48} />
              </div>
              <div className="text-center">
                <h4 className="font-black text-xl text-slate-900 tracking-tight">Archiviato!</h4>
                <p className="text-sm text-slate-500 mt-2 font-medium">Fattura salvata correttamente nel database cloud.</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="p-12 flex flex-col items-center justify-center">
              <div className={`w-20 h-20 ${errorType === 'validation' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'} rounded-full flex items-center justify-center mb-6`}>
                {errorType === 'validation' ? <FileWarning size={40} /> : <ShieldAlert size={40} />}
              </div>
              <div className="text-center">
                <h4 className="font-black text-lg text-slate-900 tracking-tight">Errore Caricamento</h4>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{errorMessage}</p>
              </div>
              <button 
                onClick={() => setStatus('idle')}
                className="mt-8 w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-lg hover:shadow-xl active:scale-95 transition-all"
              >
                Riprova
              </button>
            </div>
          )}
        </div>
        
        {status === 'idle' && (
          <div className="px-8 pb-8">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex gap-3">
              <Edit3 size={18} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                <span className="font-bold text-slate-700 block mb-0.5">Controllo Manuale</span>
                Dopo l'analisi automatica potrai revisionare e modificare ogni campo estratto per garantirti la massima precisione nell'archivio.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceUpload;

