const { JSDOM } = require("jsdom");
const fs = require("fs");
const { Canvas } = require("canvas");

// Read the excalidraw file
const excalidrawData = JSON.parse(fs.readFileSync("architecture.excalidraw", "utf-8"));

const { window } = new JSDOM(`<!DOCTYPE html><html><body><canvas id="canvas"></canvas></body></html>`, {
  pretendToBeVisual: true,
  resources: "usable"
});

global.window = window;
global.document = window.document;
global.HTMLCanvasElement = window.HTMLCanvasElement;
global.Canvas = Canvas;

// Use Excalidraw's renderToCanvas
const { renderToCanvas } = require("@excalidraw/excalidraw");

const canvas = window.document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const elements = excalidrawData.elements;
const appState = excalidrawData.appState || { viewBackgroundColor: "#ffffff" };

renderToCanvas({
  elements,
  appState,
  canvas,
  scale: 2
}).then(() => {
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync("architecture.png", buffer);
  console.log("Exported architecture.png");
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
