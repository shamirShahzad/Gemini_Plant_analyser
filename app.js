require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const pdfkit = require("pdfkit");
const fs = require("fs");
const fsPromise = fs.promises;
const app = express();
const env = process.env;
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { json } = require("stream/consumers");
const { error } = require("console");

const upload = multer({
  dest: "upload/",
});

app.use(express.json({ limit: "10mb" }));

//Initialize Gemini AI
const genAI = new GoogleGenerativeAI(env.API_GEMINI);
app.use(express.static("public"));

//Routes
app.post("/analyze", upload.single("image"), async (req, res) => {
  const file = req.file;
  try {
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const imagePath = file.path;
    const ImageData = await fsPromise.readFile(imagePath, {
      encoding: "base64",
    });
    //use gemini ai to analyze image
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });
    const results = await model.generateContent([
      "Analyze this plant image and provide detailed analysis of it's species, health and care recommendations, it's charcteristics, care instructions, and any interesting facts. Please provide the response in plain text without using markdown formatting",
      {
        inlineData: {
          mimeType: req.file.mimetype,
          data: ImageData,
        },
      },
    ]);
    const plantInfo = results.response.text();
    // remove uploaded image
    await fsPromise.unlink(imagePath);
    res.json({
      results: plantInfo,
      image: `data:${req.file.mimetype};base64,${ImageData}`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
//download PDF
app.post("/download", express.json(), async (req, res) => {
  const { result, image } = req.body;
  try {
    //genrate pdf report
    const reportsDir = path.join(__dirname, "reports");
    await fsPromise.mkdir(reportsDir, { recursive: true });
    const filename = `plant_report_${Date.now()}.pdf`;
    const filePath = path.join(reportsDir, filename);
    const writeStream = fs.createWriteStream(filePath);
    const doc = new pdfkit();
    doc.pipe(writeStream);
    doc.fontSize(24).text("Plant Report", {
      align: "center",
    });
    doc.moveDown();
    doc.fontSize(24).text(`Date:${new Date().toLocaleDateString()}`);
    doc.moveDown();
    doc.fontSize(18).text(result, {
      align: "justify",
    });
    if (image) {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      doc.moveDown();
      doc.image(buffer, {
        fit: [300, 300],
        align: "center",
        valign: "center",
      });
    }
    doc.end();
    //Wait for pdf to be written
    await new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });
    res.download(filePath, (err) => {
      if (err) {
        res.status(500).json({ error: "Error downloading the PDF report" });
      }
      fsPromise.unlink(filePath);
    });
  } catch (error) {
    console.error("Error Getting pdf report", error);
    res
      .status(500)
      .json({ error: "An error occured while creating the pdf report" });
  }
});

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.listen(env.PORT, () =>
  console.log(`Example app listening on port ${env.PORT}!`)
);
