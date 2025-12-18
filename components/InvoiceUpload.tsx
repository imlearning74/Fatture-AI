
import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Invoice } from '../types';
import { extractInvoiceData } from '../geminiService';

interface InvoiceUploadProps {
  onClose: () => void;
  onSuccess: (invoice: Invoice) => void;
}

const InvoiceUpload: React.FC<InvoiceUploadProps> = ({ onClose, onSuccess }) => {
  const [status, setStatus] = useState<'idle' | 'reading' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:application/pdf;base64, prefix
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setStatus('error');
      setErrorMessage('Solo file PDF sono supportati.');
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
        setTimeout(() => onSuccess(newInvoice), 1000);
      } else {
        setStatus('error');
        setErrorMessage("L'AI non è riuscita a estrarre i dati correttamente. Riprova con un file più leggibile.");
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage("Errore durante l'elaborazione del file.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800">Carica Fattura</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          {status === 'idle' && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-xl p-10 flex flex-col items-center justify-center gap-4 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition group"
            >
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition duration-300">
                <Upload size={32} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-700">Trascina o clicca per caricare</p>
                <p className="text-sm text-slate-500">Formato PDF (max 10MB)</p>
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
            <div className="flex flex-col items-center justify-center py-10 gap-6">
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
              <div className="text-center">
                <p className="font-bold text-lg text-slate-800">
                  {status === 'reading' ? 'Lettura file...' : 'Analisi AI in corso...'}
                </p>
                <p className="text-sm text-slate-500 max-w-[250px] mx-auto mt-2">
                  Stiamo estraendo fornitore, data, importo e numero fattura per te.
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-green-600">
              <CheckCircle2 className="w-16 h-16" />
              <div className="text-center">
                <p className="font-bold text-lg text-slate-800">Fattura Elaborata!</p>
                <p className="text-sm text-slate-500">I dati sono stati estratti con successo.</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <AlertCircle className="w-16 h-16 text-red-500" />
              <div className="text-center">
                <p className="font-bold text-lg text-slate-800">Si è verificato un errore</p>
                <p className="text-sm text-red-500 mt-1">{errorMessage}</p>
              </div>
              <button 
                onClick={() => setStatus('idle')}
                className="mt-4 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition font-medium"
              >
                Riprova
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceUpload;
