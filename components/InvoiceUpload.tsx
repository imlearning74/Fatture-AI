
import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, CheckCircle2, FileWarning, Files, FolderOpen, PlayCircle, FileText, Trash2, AlertTriangle } from 'lucide-react';
import { Invoice, ExtractionResult } from '../types';
import { extractInvoiceData } from '../geminiService';

interface InvoiceUploadProps {
  onClose: () => void;
  onSuccess: (invoices: Invoice[]) => void;
  verifiedExamples: Invoice[]; // Passiamo le fatture già verificate per l'apprendimento
}

interface FileProgress {
  id: string;
  name: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'error';
  error?: string;
  result?: ExtractionResult;
}

const InvoiceUpload: React.FC<InvoiceUploadProps> = ({ onClose, onSuccess, verifiedExamples }) => {
  const [queue, setQueue] = useState<FileProgress[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles: FileProgress[] = Array.from(files)
      .filter(f => f.type === 'application/pdf')
      .map(f => ({
        id: Math.random().toString(36).substr(2, 9),
        name: f.name,
        file: f,
        status: 'pending'
      }));
    setQueue(prev => [...prev, ...newFiles]);
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = () => reject(new Error("Errore lettura file"));
      reader.readAsDataURL(file);
    });
  };

  const processQueue = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    const updatedInvoices: Invoice[] = [];
    const updatedQueue = [...queue];

    for (let i = 0; i < updatedQueue.length; i++) {
      if (updatedQueue[i].status !== 'pending') continue;

      try {
        updatedQueue[i].status = 'processing';
        setQueue([...updatedQueue]);

        const base64 = await readFileAsBase64(updatedQueue[i].file);
        
        // Passiamo gli esempi verificati per l'apprendimento
        const data = await extractInvoiceData(base64, verifiedExamples.slice(0, 5));

        if (data) {
          updatedQueue[i].status = 'completed';
          updatedQueue[i].result = data;
          
          updatedInvoices.push({
            id: crypto.randomUUID(),
            ...data,
            pdfData: base64,
            fileName: updatedQueue[i].name,
            createdAt: Date.now(),
            status: 'draft'
          });
        } else {
          // SE L'IA FALLISCE, SALVIAMO COMUNQUE COME BOZZA VUOTA
          updatedQueue[i].status = 'partial';
          updatedQueue[i].error = "Dati non estratti - Compilazione manuale richiesta";
          
          updatedInvoices.push({
            id: crypto.randomUUID(),
            invoiceNumber: "DA COMPILARE",
            vendor: "FORNITORE SCONOSCIUTO",
            date: new Date().toISOString().split('T')[0],
            amount: 0,
            currency: "EUR",
            pdfData: base64,
            fileName: updatedQueue[i].name,
            createdAt: Date.now(),
            status: 'draft'
          });
        }
      } catch (err: any) {
        updatedQueue[i].status = 'error';
        updatedQueue[i].error = err.message;
      }
      setQueue([...updatedQueue]);
      await new Promise(r => setTimeout(r, 400));
    }

    if (updatedInvoices.length > 0) {
      onSuccess(updatedInvoices);
    }
    setIsProcessing(false);
  };

  const completedCount = queue.filter(f => f.status === 'completed' || f.status === 'partial').length;
  const errorCount = queue.filter(f => f.status === 'error').length;
  const pendingCount = queue.filter(f => f.status === 'pending' || f.status === 'processing').length;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in duration-300">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Importazione Intelligente</h3>
            <p className="text-sm text-slate-500 font-medium">L'IA impara dalle tue {verifiedExamples.length} fatture verificate.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div className="w-full lg:w-1/3 p-8 bg-slate-50/50 border-r border-slate-100 flex flex-col gap-6">
            <div onClick={() => fileInputRef.current?.click()} className="flex-1 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group text-center px-4">
              <Files className="text-slate-300 group-hover:text-blue-500 transition-colors" size={48} />
              <div>
                <p className="font-bold text-slate-800">Seleziona File</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Sempre salvati in bozza</p>
              </div>
            </div>
            
            <div onClick={() => folderInputRef.current?.click()} className="h-32 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-3 hover:border-indigo-500 hover:bg-indigo-50 transition-all cursor-pointer group text-center">
              <FolderOpen className="text-slate-300 group-hover:text-indigo-500 transition-colors" size={32} />
              <p className="font-bold text-slate-800 text-sm">Carica Cartella</p>
            </div>

            <input type="file" ref={fileInputRef} className="hidden" multiple accept="application/pdf" onChange={(e) => handleFiles(e.target.files)} />
            <input type="file" ref={folderInputRef} className="hidden" {...({ webkitdirectory: "", directory: "" } as any)} multiple onChange={(e) => handleFiles(e.target.files)} />

            {queue.length > 0 && !isProcessing && pendingCount > 0 && (
              <button onClick={processQueue} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95">
                <PlayCircle size={20} /> Avvia Analisi AI ({pendingCount})
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col p-8 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
               <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Coda di Elaborazione ({queue.length})</h4>
               <div className="flex gap-4">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5"><CheckCircle2 size={12}/> {completedCount} pronti</span>
                  {errorCount > 0 && <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest flex items-center gap-1.5"><FileWarning size={12}/> {errorCount} errori</span>}
               </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {queue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50">
                  <Upload size={48} strokeWidth={1.5} />
                  <p className="text-sm font-medium">Nessun file selezionato</p>
                </div>
              ) : (
                queue.map((item) => (
                  <div key={item.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm group hover:border-slate-200 transition-all">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        item.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 
                        item.status === 'partial' ? 'bg-amber-100 text-amber-600' :
                        item.status === 'error' ? 'bg-red-100 text-red-600' : 
                        item.status === 'processing' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {item.status === 'processing' ? <Loader2 size={18} className="animate-spin" /> : 
                         item.status === 'completed' ? <CheckCircle2 size={18} /> : 
                         item.status === 'partial' ? <AlertTriangle size={18} /> :
                         item.status === 'error' ? <FileWarning size={18} /> : <FileText size={18} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate pr-4">{item.name}</p>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">
                          {item.status === 'pending' && 'In attesa'}
                          {item.status === 'processing' && 'Analisi in corso...'}
                          {item.status === 'completed' && `${item.result?.vendor || 'Fornitore trovato'}`}
                          {item.status === 'partial' && <span className="text-amber-600 font-bold">IA Fallita: Salvata come bozza vuota</span>}
                          {item.status === 'error' && <span className="text-red-500">{item.error}</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {isProcessing && (
              <div className="mt-8 p-6 bg-blue-600 rounded-3xl text-white flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-4">
                  <Loader2 className="animate-spin" />
                  <div>
                    <p className="font-black text-sm tracking-tight">Apprendimento in corso...</p>
                    <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mt-0.5">I file saranno salvati in archivio automaticamente</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black tabular-nums">{Math.round((completedCount + errorCount) / queue.length * 100)}%</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceUpload;
