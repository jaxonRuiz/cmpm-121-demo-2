import "./style.css";

// ================ Interfaces and Objects ================
interface Point {
  x: number;
  y: number;
}

interface Displayable {
  draw(ctx: CanvasRenderingContext2D): void;
}

// I tried SO hard to implement it without a class. im giving up on that though
class LineCommand implements Displayable {
  private points: Point[];
  private width: number;
  constructor(start: Point, width: number) {
    this.points = [start];
    this.width = width;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.points.length > 1) {
      ctx.lineWidth = this.width;
      ctx.beginPath();
      const { x, y } = this.points[0];
      ctx.moveTo(x, y);
      for (const { x, y } of this.points) {
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  drag(point: Point) {
    this.points.push(point);
  }
}

// initializing global variables
const commands: Displayable[] = [];
let currentLine: LineCommand;
const cursor = { active: false, x: 0, y: 0 };
const redoCommands: Displayable[] = [];
let lineWidth: number = 5;

// ================ DOM setup ================
const APP_NAME = "Paint World";
const app = document.querySelector<HTMLDivElement>("#app")!;
const title = document.createElement("h1")!;
const toolbar_container = document.createElement("div")!;
const slider_container = document.createElement("div")!;
document.title = APP_NAME;
title.innerHTML = APP_NAME;

// setting up canvas
const paint_canvas = document.createElement("canvas")!;
const ctx = paint_canvas.getContext("2d")!;
paint_canvas.width = 256;
paint_canvas.height = 256;
paint_canvas.style.cursor = "crosshair";
ctx.fillStyle = "white";

// adding clear button
const clearButton = document.createElement("button")!;
clearButton.innerHTML = "Clear";
clearButton.addEventListener("click", () => {
  clearCommand();
});

// adding undo button
const undoButton = document.createElement("button")!;
undoButton.innerHTML = "Undo";
undoButton.addEventListener("click", () => {
  undoCommand();
});

// adding redo button
const redoButton = document.createElement("button")!;
redoButton.innerHTML = "Redo";
redoButton.addEventListener("click", () => {
  redoCommand();
});

// adding brush slider
const slider = document.createElement("input");
const brushSizeLabel = document.createElement("label");
brushSizeLabel.innerHTML = `Brush Size: ${lineWidth}`;
slider.type = "range";
slider.min = "1";
slider.max = "10";
slider.value = lineWidth.toString();
slider.classList.add("brush-slider");

slider.oninput = () => {
  lineWidth = parseInt(slider.value);
  brushSizeLabel.innerHTML = `Brush Size: ${lineWidth}`;
};

// adding elements to the app
app.append(title);
app.append(paint_canvas);
app.append(toolbar_container);
toolbar_container.append(clearButton);
toolbar_container.append(undoButton);
toolbar_container.append(redoButton);
toolbar_container.append(slider_container);
slider_container.append(slider);
slider_container.append(document.createElement("br"));
slider_container.append(brushSizeLabel);

// ================ Canvas Events ================
paint_canvas.addEventListener("mousedown", (e) => {
  cursor.active = true;
  cursor.x = e.offsetX;
  cursor.y = e.offsetY;

  currentLine = new LineCommand({ x: cursor.x, y: cursor.y }, lineWidth);
  commands.push(currentLine);
  paint_canvas.dispatchEvent(new Event("drawing-changed"));
});

paint_canvas.addEventListener("mousemove", (e) => {
  if (cursor.active) {
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
    currentLine.drag({ x: cursor.x, y: cursor.y });
    paint_canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

paint_canvas.addEventListener("mouseup", () => {
  cursor.active = false;
});

paint_canvas.addEventListener("drawing-changed", () => {
  console.log("Drawing changed");
  redrawCommand();
});

// ================ Command Functions ================
function undoCommand() {
  if (commands.length > 0) {
    redoCommands.push(commands.pop()!);
    paint_canvas.dispatchEvent(new Event("drawing-changed"));
  }
}

function redoCommand() {
  if (redoCommands.length > 0) {
    commands.push(redoCommands.pop()!);
    paint_canvas.dispatchEvent(new Event("drawing-changed"));
  }
}

function clearCommand() {
  commands.splice(0, commands.length);
  redoCommands.splice(0, redoCommands.length);
  paint_canvas.dispatchEvent(new Event("drawing-changed"));
}

function redrawCommand() {
  ctx.clearRect(0, 0, paint_canvas.width, paint_canvas.height);
  for (const command of commands) {
    command.draw(ctx);
  }
}
