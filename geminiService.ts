
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractionResult, Invoice } from "./types";

export const extractInvoiceData = async (base64Pdf: string, examples: Invoice[] = []): Promise<ExtractionResult | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Costruiamo il contesto degli esempi per "insegnare" all'IA
    let examplesContext = "";
    if (examples.length > 0) {
      examplesContext = "\nEcco alcuni esempi di fatture verificate precedentemente dallo stesso utente per aiutarti a capire il formato e i fornitori abituali:\n" + 
        examples.map(ex => `- Fornitore: ${ex.vendor}, Numero: ${ex.invoiceNumber}, Data: ${ex.date}, Importo: ${ex.amount} ${ex.currency}`).join("\n");
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Pdf,
            },
          },
          {
            text: `Analizza questa fattura ed estrai i seguenti dati in formato JSON: numero fattura (invoiceNumber), fornitore (vendor), data della fattura in formato YYYY-MM-DD (date), importo totale numerico (amount), e valuta (currency). Sii preciso.${examplesContext}`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            invoiceNumber: { type: Type.STRING },
            vendor: { type: Type.STRING },
            date: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            currency: { type: Type.STRING },
          },
          required: ["invoiceNumber", "vendor", "date", "amount", "currency"],
        },
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as ExtractionResult;
  } catch (error) {
    console.error("Errore durante l'estrazione AI:", error);
    return null;
  }
};
