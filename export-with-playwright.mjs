import { chromium } from "playwright";
import fs from "fs";

const excalidrawData = JSON.parse(fs.readFileSync("architecture.excalidraw", "utf-8"));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on("console", msg => console.log("BROWSER:", msg.text()));
page.on("pageerror", err => console.log("PAGE ERROR:", err.message));

// Download Excalidraw library first
const libUrl = "https://cdn.jsdelivr.net/npm/@excalidraw/excalidraw@0.17.0/dist/excalidraw.production.min.js";
const libResponse = await fetch(libUrl);
const libCode = await libResponse.text();

const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 20px; background: #fff; }
    canvas { background: #fff; display: block; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
${libCode}
  </script>
  <script>
    console.log("Page script starting");
    const elements = ${JSON.stringify(excalidrawData.elements)};
    const appState = ${JSON.stringify(excalidrawData.appState || { viewBackgroundColor: "#ffffff" })};

    const canvas = document.createElement("canvas");
    canvas.id = "canvas";
    document.getElementById("app").appendChild(canvas);
    console.log("Canvas created, elements:", elements.length);

    function waitForExcalidraw() {
      return new Promise((resolve) => {
        const check = () => {
          if (window.ExcalidrawLib && window.ExcalidrawLib.renderToCanvas) {
            console.log("ExcalidrawLib found");
            resolve(window.ExcalidrawLib.renderToCanvas);
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });
    }

    waitForExcalidraw().then((renderToCanvas) => {
      console.log("Calling renderToCanvas");
      renderToCanvas({
        elements,
        appState,
        canvas,
        scale: 2
      }).then(() => {
        console.log("Render complete");
        window.renderDone = true;
      }).catch(err => {
        console.error("Render error:", err);
        window.renderError = err.message;
      });
    }).catch(err => {
      console.error("Load error:", err);
      window.loadError = err.message;
    });
  </script>
</body>
</html>
`;

await page.setContent(html, { waitUntil: "networkidle" });
console.log("Page loaded, waiting for render...");

await page.waitForFunction(() => window.renderDone === true || window.renderError || window.loadError, { timeout: 120000 });

const renderError = await page.evaluate(() => window.renderError);
const loadError = await page.evaluate(() => window.loadError);

if (renderError) throw new Error("Render error: " + renderError);
if (loadError) throw new Error("Load error: " + loadError);

console.log("Render done, taking screenshot...");

const canvas = await page.$("#canvas");
await canvas.screenshot({ path: "architecture.png", type: "png" });

await browser.close();
console.log("Exported architecture.png");
