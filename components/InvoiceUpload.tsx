
import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, CheckCircle2, AlertCircle, FileWarning, ShieldAlert } from 'lucide-react';
import { Invoice } from '../types';
import { extractInvoiceData } from '../geminiService';

interface InvoiceUploadProps {
  onClose: () => void;
  onSuccess: (invoice: Invoice) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const InvoiceUpload: React.FC<InvoiceUploadProps> = ({ onClose, onSuccess }) => {
  const [status, setStatus] = useState<'idle' | 'reading' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [errorType, setErrorType] = useState<'validation' | 'processing' | 'ai'>('validation');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      reader.onerror = () => reject(new Error("Errore hardware o di sistema durante la lettura del file."));
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset stati
    setErrorMessage('');
    
    // Validazione tipo file
    if (file.type !== 'application/pdf') {
      setStatus('error');
      setErrorType('validation');
      setErrorMessage(`Formato "${file.type || 'sconosciuto'}" non supportato. Carica esclusivamente file PDF.`);
      return;
    }

    // Validazione dimensione
    if (file.size > MAX_FILE_SIZE) {
      setStatus('error');
      setErrorType('validation');
      setErrorMessage(`Il file è troppo grande (${(file.size / (1024 * 1024)).toFixed(1)}MB). Il limite massimo è 10MB.`);
      return;
    }

    try {
      setStatus('reading');
      const base64 = await readFileAsBase64(file);
      
      setStatus('processing');
      const data = await extractInvoiceData(base64);

      if (data) {
        const newInvoice: Invoice = {
          id: crypto.randomUUID(),
          ...data,
          pdfData: base64,
          fileName: file.name,
          createdAt: Date.now()
        };
        setStatus('success');
        // Piccolo delay per mostrare lo stato di successo
        setTimeout(() => onSuccess(newInvoice), 800);
      } else {
        setStatus('error');
        setErrorType('ai');
        setErrorMessage("L'intelligenza artificiale non è riuscita a trovare dati validi in questa fattura. Assicurati che il testo sia nitido e non protetto da password.");
      }
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorType('processing');
      setErrorMessage(err.message || "Si è verificato un problema tecnico durante l'elaborazione. Riprova tra poco.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Nuova Fattura</h3>
            <p className="text-xs text-slate-500 font-medium">Analisi istantanea con Gemini AI</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          {status === 'idle' && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center gap-5 hover:border-blue-500 hover:bg-blue-50/30 cursor-pointer transition-all group relative overflow-hidden"
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
          )}

          {(status === 'reading' || status === 'processing') && (
            <div className="flex flex-col items-center justify-center py-12 gap-8">
              <div className="relative">
                <Loader2 className="w-20 h-20 text-blue-600 animate-spin" strokeWidth={1.5} />
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-10 h-10 bg-blue-50 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="text-center">
                <h4 className="font-black text-xl text-slate-900 tracking-tight">
                  {status === 'reading' ? 'Lettura in corso...' : 'Analisi Intelligente...'}
                </h4>
                <p className="text-sm text-slate-500 max-w-[280px] mx-auto mt-3 leading-relaxed">
                  {status === 'reading' 
                    ? 'Preparazione del documento per l\'elaborazione cloud.' 
                    : 'Gemini sta estraendo fornitore, importi e date dai dati grezzi.'}
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center justify-center py-12 gap-5 text-emerald-600 animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center shadow-inner">
                <CheckCircle2 size={48} />
              </div>
              <div className="text-center">
                <h4 className="font-black text-xl text-slate-900 tracking-tight">Completato!</h4>
                <p className="text-sm text-slate-500 mt-2 font-medium">I dati sono pronti per l'archiviazione.</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-8 animate-in slide-in-from-top-4 duration-300">
              <div className={`w-20 h-20 ${errorType === 'validation' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'} rounded-full flex items-center justify-center mb-6 shadow-sm`}>
                {errorType === 'validation' ? <FileWarning size={40} /> : <ShieldAlert size={40} />}
              </div>
              <div className="text-center px-4">
                <h4 className="font-black text-lg text-slate-900 tracking-tight">Oops! Qualcosa non va</h4>
                <div className={`mt-3 p-4 rounded-xl text-sm font-medium leading-relaxed ${errorType === 'validation' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                  {errorMessage}
                </div>
              </div>
              <div className="flex gap-3 mt-8 w-full">
                <button 
                  onClick={() => setStatus('idle')}
                  className="flex-1 py-3.5 bg-slate-900 text-white rounded-2xl transition-all font-bold text-sm shadow-lg shadow-slate-200 hover:shadow-xl active:scale-95"
                >
                  Riprova
                </button>
                <button 
                  onClick={onClose}
                  className="px-6 py-3.5 bg-slate-100 text-slate-600 rounded-2xl transition-all font-bold text-sm hover:bg-slate-200"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}
        </div>
        
        {status === 'idle' && (
          <div className="px-8 pb-8">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Loader2 size={16} className="animate-spin-slow" />
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                <span className="font-bold text-slate-700 block mb-0.5">Suggerimento AI</span>
                Il sistema funziona meglio con documenti PDF testuali. Se la fattura è una foto sfuocata o un PDF protetto, l'estrazione potrebbe fallire.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceUpload;

