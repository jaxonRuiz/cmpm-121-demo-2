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
  private color: string;
  constructor(start: Point, width: number) {
    this.points = [start];
    this.width = width;
    this.color = `hsl(${hue}, 100%, 50%)`;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = this.color;
    if (this.points.length > 0) {
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
    ctx.beginPath();
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.ellipse(this.point.x, this.point.y, lineWidth/2, lineWidth/2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

class StickerCommand implements Displayable {
  private point?: Point;
  private image: string;
  private fontOffset: number;
  private size;

  constructor( image: string, size: number = fontScale*lineWidth) {
    this.image = image;
    this.size = size;
    ctx.font = `${this.size}px Arial`;
    this.fontOffset = ctx.measureText(this.image).width / 2;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.point) {
      ctx.font = `${this.size}px Arial`;
    this.fontOffset = ctx.measureText(this.image).width / 2;
      
      ctx.fillText(
        this.image,
        this.point.x - this.fontOffset,
        this.point.y + this.fontOffset/2
      );
    }
  }

  drag(point: Point) {
    // this.rotation += Math.PI / 180; // rotate 1 degree
    this.point = point;
    ctx.fillText(
      this.image,
      this.point.x - this.fontOffset,
      this.point.y + this.fontOffset/2
    );
  }
}

// initializing global variables
const commands: Displayable[] = [];
let currentLine: LineCommand | null = null;
let cursor: CursorCommand | null = null;
let currentSticker: StickerCommand | null = null;
const redoCommands: Displayable[] = [];
let lineWidth: number = 5;
const maxLineWidth: number = 20;
const fontScale: number = 12;
// let fontOffset: number;
const stickers = ["🌎", "🪐", "⭐️"];
const bus = new EventTarget();
const canvasWidth = 256;
const canvasHeight = 256;
const exportScale = 4;

// ================ DOM setup ================
const APP_NAME = "Paint World";
const app = document.querySelector<HTMLDivElement>("#app")!;
const title = document.createElement("h1")!;
const toolbar_container = document.createElement("div")!;
toolbar_container.classList.add("toolbar-container");
const slider_container = document.createElement("div")!;
slider_container.classList.add("slider-container");
const sticker_container = document.createElement("div")!;
let hue: number = 0;
document.title = APP_NAME;
title.innerHTML = APP_NAME;

// setting up canvas
const paint_canvas = document.createElement("canvas")!;
const ctx = paint_canvas.getContext("2d")!;
paint_canvas.width = canvasWidth;
paint_canvas.height = canvasHeight;
ctx.fillStyle = "black";
ctx.font = `${fontScale}px Arial`;
paint_canvas.style.cursor = "none";

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

// adding sticker buttons
function setupStickers() {
  sticker_container.innerHTML = "";
  for (const sticker of stickers) {
    const stickerButton = document.createElement("button");
    stickerButton.innerHTML = sticker;
    sticker_container.append(stickerButton);
    stickerButton.addEventListener("click", () => {
      currentSticker = new StickerCommand(sticker);
      bus.dispatchEvent(new Event("tool-moved"));
    });
  }
  const customStickerButton = document.createElement("button"); 
  customStickerButton.innerHTML = "Add Sticker";
  sticker_container.append(customStickerButton);
  customStickerButton.addEventListener("click", () => {
    const stickerName = prompt("Enter sticker name:", ":D");
    if (stickerName) {
      stickers.push(stickerName);
      setupStickers();
    }
  });
}
setupStickers();

// adding brush slider
const scaleSlider = document.createElement("input");
const brushSizeLabel = document.createElement("label");
brushSizeLabel.innerHTML = `Brush/Sticker Size: x${lineWidth}`;
scaleSlider.type = "range";
scaleSlider.min = "1";
scaleSlider.max = "100";
scaleSlider.value = (100*lineWidth/maxLineWidth).toString();
scaleSlider.classList.add("brush-slider");
slider_container.append(scaleSlider);
scaleSlider.oninput = () => {
  lineWidth = maxLineWidth*parseInt(scaleSlider.value)/100; // scale to maxLineWidth
  brushSizeLabel.innerHTML = `Brush Size: x${lineWidth}`;
};

// adding hue slider
const hueSlider = document.createElement("input");
const hueLabel = document.createElement("label");
hueLabel.innerHTML = `Hue: ${hue}`;
hueSlider.type = "range";
hueSlider.min = "0";
hueSlider.max = "360";
hueSlider.value = "0";
hueSlider.classList.add("hue-slider");
hueSlider.oninput = () => {
  hue = parseInt(hueSlider.value);
  hueLabel.innerHTML = `Hue: ${hue}`;
};

// adding export button
const exportButton = document.createElement("button");
toolbar_container.append(exportButton);
exportButton.innerHTML = "Export";
exportButton.addEventListener("click", () => {
  const export_canvas = document.createElement("canvas")!;
  export_canvas.width = canvasWidth * exportScale;
  export_canvas.height = canvasHeight * exportScale;
  const export_ctx = export_canvas.getContext("2d")!;
  export_ctx.scale(exportScale, exportScale);

  for (const command of commands) {
    command.draw(export_ctx);
  }
  const link = document.createElement("a");
  link.download = "image.png";
  link.href = export_canvas.toDataURL();
  link.click();
});

// adding elements to the app
app.append(title);
app.append(paint_canvas);
app.append(toolbar_container);
app.append(sticker_container);
app.append(slider_container);
app.append(brushSizeLabel);
app.append(document.createElement("br"));
app.append(hueSlider);
app.append(hueLabel);


// ================ Canvas Events ================
paint_canvas.addEventListener("mousedown", (e) => {
  cursor = new CursorCommand({ x: e.offsetX, y: e.offsetY });
  if (currentSticker) {
    currentSticker.drag(cursor.point);
    bus.dispatchEvent(new Event("drawing-changed"));
  } else {
    currentLine = new LineCommand(cursor.point, lineWidth);
    commands.push(currentLine);
    currentLine.drag(cursor.point);
    bus.dispatchEvent(new Event("drawing-changed"));
  }
});

paint_canvas.addEventListener("mousemove", (e) => {
  cursor = new CursorCommand({ x: e.offsetX, y: e.offsetY });
  if (currentLine) {
    currentLine.drag(cursor.point);
    bus.dispatchEvent(new Event("drawing-changed"));
  } else if (currentSticker) {
    currentSticker.drag(cursor.point);
    bus.dispatchEvent(new Event("drawing-changed"));
  } else {
    bus.dispatchEvent(new Event("tool-moved"));
  }
});

paint_canvas.addEventListener("mouseup", () => {
  currentLine = null;
  if (currentSticker) {
    commands.push(currentSticker);
    currentSticker = null;
  }
  bus.dispatchEvent(new Event("tool-moved"));  
});

paint_canvas.addEventListener("mouseenter", (e) => {
  cursor = new CursorCommand({ x: e.offsetX, y: e.offsetY });
  bus.dispatchEvent(new Event("tool-moved"));
});

paint_canvas.addEventListener("mouseleave", () => {
  cursor = null;
  currentLine = null;
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

  if (currentSticker) {
    currentSticker.draw(ctx);
  } else if (cursor && !currentLine) {
    cursor.draw(ctx);
  }
}
