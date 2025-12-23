
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractionResult, Invoice } from "./types";

export const extractInvoiceData = async (base64Pdf: string, examples: Invoice[] = []): Promise<ExtractionResult | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Costruiamo un contesto di apprendimento più "strutturale"
    let learningContext = "";
    if (examples.length > 0) {
      learningContext = "\n### APPRENDIMENTO MODELLI UTENTE (Pattern verificati) ###\n" + 
        "L'utente ha precedentemente verificato queste estrazioni. Usa questi dati per riconoscere i layout dei fornitori e i formati ricorrenti:\n" + 
        examples.map(ex => `[FORNITORE: ${ex.vendor}] -> Numero: ${ex.invoiceNumber}, Data: ${ex.date}, Totale: ${ex.amount}`).join("\n") +
        "\nSe riconosci uno di questi fornitori nel nuovo documento, applica lo stesso schema di estrazione logica.";
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
            text: `Agisci come un esperto contabile. Analizza questa fattura ed estrai i dati richiesti. 
            IMPORTANTE: Se il fornitore corrisponde a uno degli esempi forniti, segui rigorosamente quel modello di dati.${learningContext}

            Estrai in JSON:
            - invoiceNumber: numero univoco della fattura.
            - vendor: nome del fornitore (cerca di essere coerente con i nomi negli esempi).
            - date: data fattura (YYYY-MM-DD).
            - amount: totale numerico.
            - currency: valuta (es. EUR, USD).`,
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
