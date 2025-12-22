
export interface Invoice {
  id: string;
  invoiceNumber: string;
  vendor: string;
  date: string;
  amount: number;
  currency: string;
  pdfData: string; // Base64
  fileName: string;
  createdAt: number;
  status: 'draft' | 'verified';
}

export interface ExtractionResult {
  invoiceNumber: string;
  vendor: string;
  date: string;
  amount: number;
  currency: string;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  INVOICES = 'INVOICES',
  REPORTS = 'REPORTS'
}
