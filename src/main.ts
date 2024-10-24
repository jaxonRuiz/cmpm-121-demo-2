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

class CursorCommand implements Displayable {
  public point: Point;
  constructor(point: Point) {
    this.point = point;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.font = "32px monospace";
    ctx.fillStyle = "black";
    ctx.fillText("*", this.point.x - 8, this.point.y + 16);
  }
}

// initializing global variables
const commands: Displayable[] = [];
let currentLine: LineCommand;
let cursor: CursorCommand | null = null;
let cursorActive: boolean = false;
const redoCommands: Displayable[] = [];
let lineWidth: number = 5;
const bus = new EventTarget();

// ================ DOM setup ================
const APP_NAME = "Paint World";
const app = document.querySelector<HTMLDivElement>("#app")!;
const title = document.createElement("h1")!;
const toolbar_container = document.createElement("div")!;
toolbar_container.classList.add("toolbar-container");
const slider_container = document.createElement("div")!;
slider_container.classList.add("slider-container");
document.title = APP_NAME;
title.innerHTML = APP_NAME;

// setting up canvas
const paint_canvas = document.createElement("canvas")!;
const ctx = paint_canvas.getContext("2d")!;
paint_canvas.width = 256;
paint_canvas.height = 256;
paint_canvas.style.cursor = "none";
ctx.fillStyle = "white";

// adding clear button
const clearButton = document.createElement("button")!;
clearButton.innerHTML = "Clear";
toolbar_container.append(clearButton);
clearButton.addEventListener("click", () => {
  clearCommand();
});

// adding undo button
const undoButton = document.createElement("button")!;
undoButton.innerHTML = "Undo";
toolbar_container.append(undoButton);
undoButton.addEventListener("click", () => {
  undoCommand();
});

// adding redo button
const redoButton = document.createElement("button")!;
redoButton.innerHTML = "Redo";
toolbar_container.append(redoButton);
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
slider_container.append(slider);

slider.oninput = () => {
  lineWidth = parseInt(slider.value);
  brushSizeLabel.innerHTML = `Brush Size: ${lineWidth}`;
};

// adding elements to the app
app.append(title);
app.append(paint_canvas);
app.append(toolbar_container);
app.append(slider_container);
app.append(brushSizeLabel);

// ================ Canvas Events ================
paint_canvas.addEventListener("mousedown", (e) => {
  cursor = new CursorCommand({ x: e.offsetX, y: e.offsetY });
  cursorActive = true;
  currentLine = new LineCommand(cursor.point, lineWidth);
  commands.push(currentLine);
  bus.dispatchEvent(new Event("drawing-changed"));
});

paint_canvas.addEventListener("mousemove", (e) => {
  cursor = new CursorCommand({ x: e.offsetX, y: e.offsetY });
  if (cursorActive) {
    currentLine.drag(cursor.point);
    bus.dispatchEvent(new Event("drawing-changed"));
  } else {
    bus.dispatchEvent(new Event("tool-moved"));
  }
});

paint_canvas.addEventListener("mouseup", () => {
  cursorActive = false;
});

paint_canvas.addEventListener("mouseenter", (e) => {
  cursor = new CursorCommand({ x: e.offsetX, y: e.offsetY });
  bus.dispatchEvent(new Event("tool-moved"));
});

paint_canvas.addEventListener("mouseleave", () => {
  cursor = null;
  bus.dispatchEvent(new Event("tool-moved"));
});

bus.addEventListener("drawing-changed", redrawCommand);
bus.addEventListener("tool-moved", redrawCommand);

// ================ Command Functions ================
function undoCommand() {
  if (commands.length > 0) {
    redoCommands.push(commands.pop()!);
    bus.dispatchEvent(new Event("drawing-changed"));
  }
}

function redoCommand() {
  if (redoCommands.length > 0) {
    commands.push(redoCommands.pop()!);
    bus.dispatchEvent(new Event("drawing-changed"));
  }
}

function clearCommand() {
  commands.splice(0, commands.length);
  redoCommands.splice(0, redoCommands.length);
  bus.dispatchEvent(new Event("drawing-changed"));
}

function redrawCommand() {
  ctx.clearRect(0, 0, paint_canvas.width, paint_canvas.height);
  for (const command of commands) {
    command.draw(ctx);
  }

  if (cursor && !cursorActive) {
    cursor.draw(ctx);
  }
}
