import fs from "fs";
import { JSDOM } from "jsdom";
import { Canvas } from "canvas";
import { renderToCanvas } from "@excalidraw/excalidraw";

const excalidrawData = JSON.parse(fs.readFileSync("architecture.excalidraw", "utf-8"));

const { window } = new JSDOM(`<!DOCTYPE html><html><body><canvas id="canvas"></canvas></body></html>`, {
  pretendToBeVisual: true,
  resources: "usable"
});

global.window = window;
global.document = window.document;
global.HTMLCanvasElement = window.HTMLCanvasElement;
global.Canvas = Canvas;

const canvas = window.document.getElementById("canvas");
const elements = excalidrawData.elements;
const appState = excalidrawData.appState || { viewBackgroundColor: "#ffffff" };

await renderToCanvas({
  elements,
  appState,
  canvas,
  scale: 2
});

const buffer = canvas.toBuffer("image/png");
fs.writeFileSync("architecture.png", buffer);
console.log("Exported architecture.png");
