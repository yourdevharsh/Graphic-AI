require("dotenv").config();
const express = require("express");

const limiter = require("./middlewares/rateLimiter");
const getCode = require("./services/llm/codeGenerator");
const hashPrompt = require("./middlewares/hashPrompt");
const checkKey = require("./middlewares/cacheCheck");
const db = require("./config/pgDbClient");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
});

app.post("/generate", limiter, hashPrompt, checkKey, async (req, res) => {
  // const { userPrompt } = req.body;
  // const generatedCode = await getCode(userPrompt);
  // res.send(generatedCode);
});

app.listen(3000, () => {
  console.log("running");
});
