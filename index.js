const express = require("express");
const puppeteer = require("puppeteer-extra");
const prettier = require("prettier");
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require("cheerio");

puppeteer.use(StealthPlugin());

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json()); // Middleware to parse JSON bodies

app.get("/", (_, res) => {
  res.send("Hello World!");
});

const launchBrowser = async () => {
  return puppeteer.launch({
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
  });
};

const formatHtml = async (htmlContent) => {
  try {
    return await prettier.format(htmlContent, { parser: "html" });
  } catch {
    return htmlContent; // Fallback to unformatted HTML if formatting fails
  }
};

const scrapePage = async (url) => {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(url);
  const htmlContent = await page.content();
  await browser.close();
  return htmlContent;
};

app.get("/scrape", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send("URL parameter is missing.");
  }

  try {
    const htmlContent = await scrapePage(url);
    const formattedHtml = await formatHtml(htmlContent);
    res.set("Content-Type", "text/plain");
    res.status(200).send(formattedHtml);
  } catch (error) {
    console.error("Error scraping the page:", error);
    res.status(500).send("Failed to scrape the page. Please try again later.");
  }
});

const extractData = async (url, selector) => {
  const htmlContent = await scrapePage(url);
  const $ = cheerio.load(htmlContent);
  const extractedData = [];
  $(selector).each((_, element) => {
    extractedData.push($(element).html());
  });
  return extractedData;
};

app.post("/extract", async (req, res) => {
  const { url, selector } = req.body;

  if (!url || !selector) {
    return res.status(400).send("URL and selector are required.");
  }

  try {
    const extractedData = await extractData(url, selector);
    res.status(200).send(extractedData.join());
  } catch (error) {
    console.error("Error extracting data:", error);
    res.status(500).send("Failed to extract data. Please try again later.");
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});