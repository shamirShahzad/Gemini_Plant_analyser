require("dotenv").config();
const express = require("express");
const multer = require("multer");
const pdfkit = require("pdfkit");
const fs = require("fs");
const fsPromise = fs.promises;
const app = express();
const env = process.env;
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { json } = require("stream/consumers");

const upload = multer({
  dest: "/upload",
});

app.use(express.json({ limit: "10mb" }));

//Initialize Gemini AI
const genAI = new GoogleGenerativeAI(env.API_GEMINI);
app.use(express.static("public"));

//Routes
app.post("/analyze", async (req, res) => {
  res.json({ message: "Success" });
});
//download PDF
app.post("/download", (req, res) => {
  res.json({ message: "Success" });
});

app.get("/", (req, res) => res.send("Hello World!"));
app.listen(env.PORT, () =>
  console.log(`Example app listening on port ${port}!`)
);
