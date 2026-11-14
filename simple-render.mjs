import fs from "fs";
import { createCanvas } from "canvas";

const excalidrawData = JSON.parse(fs.readFileSync("architecture.excalidraw", "utf-8"));
const elements = excalidrawData.elements;

// Create a large canvas
const width = 2000;
const height = 1400;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");

// White background
ctx.fillStyle = "#ffffff";
ctx.fillRect(0, 0, width, height);

// Simple rendering of basic elements
ctx.font = "16px Arial";
ctx.fillStyle = "#000000";
ctx.strokeStyle = "#000000";
ctx.lineWidth = 2;

for (const el of elements) {
  if (el.type === "rectangle") {
    ctx.strokeRect(el.x, el.y, el.width, el.height);
    if (el.text) {
      ctx.fillText(el.text, el.x + 10, el.y + 25);
    }
  } else if (el.type === "arrow" || el.type === "line") {
    ctx.beginPath();
    ctx.moveTo(el.x, el.y);
    // Excalidraw arrows have points
    if (el.points) {
      for (const pt of el.points) {
        ctx.lineTo(el.x + pt[0], el.y + pt[1]);
      }
    }
    ctx.stroke();
  } else if (el.type === "text") {
    ctx.fillText(el.text, el.x, el.y);
  } else if (el.type === "diamond") {
    // Draw diamond
    ctx.beginPath();
    ctx.moveTo(el.x + el.width/2, el.y);
    ctx.lineTo(el.x + el.width, el.y + el.height/2);
    ctx.lineTo(el.x + el.width/2, el.y + el.height);
    ctx.lineTo(el.x, el.y + el.height/2);
    ctx.closePath();
    ctx.stroke();
  }
}

// Title
ctx.font = "bold 28px Arial";
ctx.fillStyle = "#1a1a2e";
ctx.fillText("NEAR Value Intelligence — Architecture", 50, 50);
ctx.font = "18px Arial";
ctx.fillStyle = "#4a4a6a";
ctx.fillText("Follow the money. Verify the value.", 50, 85);

const buffer = canvas.toBuffer("image/png");
fs.writeFileSync("architecture.png", buffer);
console.log("Exported architecture.png (simple render)");
