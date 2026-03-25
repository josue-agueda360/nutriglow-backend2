import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));

app.get("/", (req, res) => {
  res.json({ ok: true, mensaje: "Backend activo" });
});

app.post("/analizar-comida", async (req, res) => {
  try {
    console.log("Petición recibida en /analizar-comida");

    const { imageBase64 } = req.body;

    if (!imageBase64) {
      console.log("No se recibió imageBase64");
      return res.status(400).json({
        error: "No se recibió la imagen en base64.",
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "Falta configurar OPENAI_API_KEY en las variables de entorno.",
      });
    }

    console.log("Imagen recibida correctamente");
    console.log("Enviando imagen a OpenAI...");

const prompt = `
Analiza la imagen.

Si la imagen contiene comida o bebida, responde SOLO con JSON válido usando este formato exacto:
{
  "nombreComida": "string",
  "tipoComida": "string",
  "calorias": "string",
  "carbohidratos": "string",
  "proteina": "string",
  "grasas": "string"
}

Reglas:
- nombreComida en español
- tipoComida debe ser: Desayuno, Almuerzo, Cena o Snack
- calorias con formato como "450 kcal"
- carbohidratos con formato como "35 g"
- proteina con formato como "18 g"
- grasas con formato como "12 g"

Si NO hay comida o bebida visible en la imagen, responde SOLO con este JSON exacto:
{
  "nombreComida": "No identificada",
  "tipoComida": "Snack",
  "calorias": "0 kcal",
  "carbohidratos": "0 g",
  "proteina": "0 g",
  "grasas": "0 g"
}

No escribas texto antes ni después del JSON.
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: prompt,
              },
              {
                type: "input_image",
                image_url: `data:image/jpeg;base64,${imageBase64}`,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    console.log("JSON recibido:", data);

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Error al consultar OpenAI",
        detalle: data,
      });
    }

const texto = data.output_text?.trim() || "";
console.log("Texto devuelto por IA:", texto);

let resultado;

try {
  resultado = JSON.parse(texto);
} catch (e) {
  // Intentar rescatar un JSON aunque venga con texto extra
  const match = texto.match(/\{[\s\S]*\}/);

  if (match) {
    try {
      resultado = JSON.parse(match[0]);
    } catch (_) {
      return res.status(500).json({
        error: "La IA no devolvió JSON válido.",
        respuesta_cruda: texto,
      });
    }
  } else {
    return res.status(400).json({
      error: "No se detectó comida claramente en la imagen o la IA respondió en formato no válido.",
      respuesta_cruda: texto,
    });
  }
}
    console.log("Enviando resultado a Flutter...");
    return res.json(resultado);
  } catch (error) {
    console.log("Error interno:", error.message);
    return res.status(500).json({
      error: "Error interno del servidor",
      detalle: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
