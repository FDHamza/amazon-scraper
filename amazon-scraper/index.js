const puppeteer = require("puppeteer");

const checkPriceCondition = (price, condition) => {
  const priceValue = parseFloat(price.replace(/[^0-9.]/g, ""));
  const operator = condition.slice(-1);
  const conditionValue = parseFloat(condition.slice(0, -1));

  console.log(`Checking price: ${priceValue} against condition: ${condition}`);

  if (operator === "<") {
    return priceValue < conditionValue;
  } else if (operator === ">") {
    return priceValue > conditionValue;
  }
  return false;
};

const isValidCondition = (condition) => {
  return /^[0-9]+(\.[0-9]+)?[<>]$/.test(condition);
};

const simplifyLink = (url) => {
  if (url.includes("/sspa/click")) {
    return null;
  }
  let match = url.match(/\/dp\/(\w+)/) || url.match(/\/gp\/product\/(\w+)/);
  if (match) {
    return `https://www.amazon.com/dp/${match[1]}`;
  }
  return url.split('?')[0];
};

async function searchAmazon(page, searchTerm, priceCondition) {
  console.log(`Searching Amazon for: ${searchTerm}`);
  await page.goto("https://www.amazon.com/", { waitUntil: "networkidle2" });

  await page.waitForSelector("#twotabsearchtextbox");

  await page.type("#twotabsearchtextbox", searchTerm);
  await Promise.all([
    page.click("input#nav-search-submit-button"),
    page.waitForNavigation(),
  ]);

  const products = await page.$$eval(".s-main-slot .s-result-item", (items) =>
    items
      .map((item) => {
        const titleElement = item.querySelector("h2 a span");
        const priceElement = item.querySelector(".a-price .a-offscreen");
        const linkElement = item.querySelector("h2 a");
        const ratingElement = item.querySelector(".a-icon-alt");

        if (!titleElement || !priceElement || !linkElement || !ratingElement) {
          console.log("Skipped an item due to missing elements.");
          return null;
        }

        const rating = parseFloat(ratingElement.innerText.split(" ")[0]);

        return {
          title: titleElement.innerText.trim(),
          price: priceElement.innerText.trim(),
          link: linkElement.href,
          rating: rating,
        };
      })
      .filter(Boolean)
  );

  console.log("Products found:", products.length);

  const filteredProducts = products.filter((p) =>
    checkPriceCondition(p.price, priceCondition)
  );

  console.log(
    "Filtered products matching price condition:",
    filteredProducts.length
  );

  filteredProducts.sort((a, b) => b.rating - a.rating);

  const topRatedProducts = filteredProducts
    .map((product) => ({
      ...product,
      link: simplifyLink(product.link),
    }))
    .filter((product) => product.link !== null)
    .slice(0, 5);

  return topRatedProducts;
}

async function main() {
  const searchTerm = process.argv[2];
  const priceCondition = process.argv[3];

  if (!searchTerm) {
    console.error("Please provide a search term as the second argument.");
    process.exit(1);
  }
  if (!priceCondition || !isValidCondition(priceCondition)) {
    console.error(
      "Please provide a valid price condition as the third argument (e.g., 20< or 30>)."
    );
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--start-maximized"],
  });

  try {
    const page = await browser.newPage();
    const results = await searchAmazon(page, searchTerm, priceCondition);

    if (results.length === 0) {
      console.log("No products found matching the criteria.");
    } else {
      results.forEach((result, index) => {
        console.log(`Item ${index + 1}:`);
        console.log(`Title: ${result.title}`);
        console.log(`Price: ${result.price}`);
        console.log(`Rating: ${result.rating} stars`);
        console.log(`Link: ${result.link}`);
        console.log("----------------------------------");
      });
    }
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);