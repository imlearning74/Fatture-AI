
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractionResult } from "./types";

export const extractInvoiceData = async (base64Pdf: string): Promise<ExtractionResult | null> => {
  try {
    // Initialize GoogleGenAI strictly using process.env.API_KEY as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      // Follow the recommended contents structure with parts as per guidelines
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Pdf,
            },
          },
          {
            text: "Analizza questa fattura ed estrai i seguenti dati in formato JSON: numero fattura (invoiceNumber), fornitore (vendor), data della fattura in formato YYYY-MM-DD (date), importo totale numerico (amount), e valuta (currency). Sii preciso.",
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

    // Directly access text property from response (not as a method)
    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as ExtractionResult;
  } catch (error) {
    console.error("Errore durante l'estrazione AI:", error);
    return null;
  }
};
