import "./style.css";

// Interfaces
interface Point {
  x: number;
  y: number;
};

interface Line {
  points: Point[];
}

// initializing variables
const APP_NAME = "Paint World";
const app = document.querySelector<HTMLDivElement>("#app")!;
const title = document.createElement("h1")!;
const toolbar_container = document.createElement("div")!;
document.title = APP_NAME;
title.innerHTML = APP_NAME;
let currentLine: Point[] = [];
const lines: Line[] = [];
const cursor = { active: false, x: 0, y: 0 };

// setting up canvas
const paint_canvas = document.createElement("canvas")!;
const ctx = paint_canvas.getContext("2d")!;
paint_canvas.width = 256;
paint_canvas.height = 256;
ctx.fillStyle = "white";

// adding clear button
const clearButton = document.createElement("button")!;
clearButton.innerHTML = "Clear";
clearButton.addEventListener("click", () => {
  paint_canvas.dispatchEvent(new Event("drawing-changed"));
  lines.splice(0, lines.length);
  ctx.clearRect(0, 0, paint_canvas.width, paint_canvas.height);
});

// adding elements to the app
app.append(title);
app.append(paint_canvas);
app.append(toolbar_container);
toolbar_container.append(clearButton);




// events
paint_canvas.addEventListener("mousedown", (e) => {
  cursor.active = true;
  cursor.x = e.offsetX;
  cursor.y = e.offsetY;
  currentLine = [];
  lines.push({ points: currentLine });
  currentLine.push({ x: cursor.x, y: cursor.y });
  paint_canvas.dispatchEvent(new Event("drawing-changed"));
});

paint_canvas.addEventListener("mousemove", (e) => {
  if (cursor.active) {
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
    currentLine.push({ x: cursor.x, y: cursor.y });
    paint_canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

paint_canvas.addEventListener("mouseup", () => {
  cursor.active = false;
});

paint_canvas.addEventListener("drawing-changed", () => {
  console.log("Drawing changed");
  redraw();
});

function redraw() {
  ctx.clearRect(0, 0, paint_canvas.width, paint_canvas.height);
  for (const line of lines) {
    if (line.points.length > 1) {
      ctx.beginPath();
      const { x, y } = line.points[0];
      ctx.moveTo(x, y);
      for (const { x, y } of line.points) {
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
}
