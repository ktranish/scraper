const express = require("express");
const puppeteer = require("puppeteer")
const prettier = require("prettier");

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json()); // Middleware to parse JSON bodies

app.get("/", (_, res) => {
  res.send("Hello World!")
})

app.get("/scrape", async (req, res) => {
  // Extract the url parameter from the query string
  const url = req.query.url;

  // Ensure that the URL parameter is provided
  if (!url) {
    return res.status(400).send("URL parameter is missing.");
  }

  let browser;

  try{
    // Launch a new Puppeteer browser instance
    browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate to the provided URL
    await page.goto(url);

    // Get the entire HTML content of the page
    const htmlContent = await page.content();

    let formattedHtml;
    try {
      // Attempt to format the HTML using Prettier
      formattedHtml = await prettier.format(htmlContent, { parser: "html" });
    } catch {
      // Fallback to unformatted HTML if formatting fails
      formattedHtml = htmlContent;
    }

    // Set Content-Type to text/plain to ensure raw HTML is displayed as text
    res.set("Content-Type", "text/plain");

    // Return the HTML content directly as the response
    res.status(200).send(formattedHtml);
  }
  catch(error){
    console.error("Error scraping the page:", error);
    res.status(500).send("Failed to scrape the page. Please try again later.");
  }
  finally{
    if (browser) {
      await browser.close(); // Ensure the browser is closed even if an error occurs
    }
  }
})

app.post("/extract", async (req, res) => {
  const { html, selectors } = req.body;

  if (!html || !selectors || !Array.isArray(selectors) || selectors.length === 0) {
    return res.status(400).send("HTML content and a list of selectors are required.");
  }

  try {
    // Load the HTML into Cheerio
    const $ = cheerio.load(html);

    // Object to hold the extracted data for each selector
    const extractedData = {};

    // Loop through each selector and extract the corresponding data
    selectors.forEach((selector) => {
      extractedData[selector] = [];
      $(selector).each((_, element) => {
        extractedData[selector].push($(element).text());
      });
    });

    // Return the extracted data
    res.status(200).json({ extractedData });
  } catch (error) {
    console.error("Error extracting data:", error);
    res.status(500).send("Failed to extract data. Please try again later.");
  }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});
