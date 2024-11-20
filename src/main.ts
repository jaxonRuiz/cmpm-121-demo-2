import "./style.css";

// ================ Interfaces and Objects ================
interface Point {
  x: number;
  y: number;
}

interface Color {
  point: Point;
  darkness: number;
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
    this.color = `hsl(${hue}, ${saturation}%, ${darkness}%)`;
    console.log(this.color);
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
    ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${darkness}%)`;
    ctx.ellipse(
      this.point.x,
      this.point.y,
      lineWidth / 2,
      lineWidth / 2,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}

class StickerCommand implements Displayable {
  private point?: Point;
  private image: string;
  private fontOffset: number;
  private size;

  constructor(image: string, size: number = fontScale * lineWidth) {
    this.image = image;
    this.size = size;
    paint_ctx.font = `${this.size}px Arial`;
    this.fontOffset = paint_ctx.measureText(this.image).width / 2;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.point) {
      ctx.font = `${this.size}px Arial`;
      this.fontOffset = ctx.measureText(this.image).width / 2;

      ctx.fillText(
        this.image,
        this.point.x - this.fontOffset,
        this.point.y + this.fontOffset / 2
      );
    }
  }

  drag(point: Point) {
    // this.rotation += Math.PI / 180; // rotate 1 degree
    this.point = point;
    paint_ctx.fillText(
      this.image,
      this.point.x - this.fontOffset,
      this.point.y + this.fontOffset / 2
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
let hue: number = 0;
let saturation: number = 100;
let darkness: number = 50; // TODO rename to lightness, and all related functions
const colorSelectorPoint: Point = { x: hue, y: saturation };
const recentColors: Color[] = [];

// ================ DOM setup ================
const APP_NAME = "Paint World";
const app = document.querySelector<HTMLDivElement>("#app")!;
const title = document.createElement("h1")!;
const toolbar_container = document.createElement("div")!;
toolbar_container.classList.add("toolbar-container");
const slider_container = document.createElement("div")!;
slider_container.classList.add("slider-container");
const sticker_container = document.createElement("div")!;
const color_selector_container = document.createElement("div")!;
color_selector_container.classList.add("color-selector-container");
const color_selector = document.createElement("canvas")!;
const darkness_selector = document.createElement("input")!;
const color_demo = document.createElement("canvas");
const recently_used_colors = document.createElement("div");
document.title = APP_NAME;
title.innerHTML = APP_NAME;

// setting up canvas
const paint_canvas = document.createElement("canvas")!;
const paint_ctx = paint_canvas.getContext("2d")!;
paint_canvas.width = canvasWidth;
paint_canvas.height = canvasHeight;
paint_ctx.fillStyle = "black";
paint_ctx.font = `${fontScale}px Arial`;
paint_canvas.style.cursor = "none";

// ================ Toolbar Setup ================

// export function
function exportCanvas() {
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
}

// button setup function
function setupButton(
  name: string,
  container: HTMLDivElement,
  action: () => void
) {
  const button = document.createElement("button");
  button.innerHTML = name;
  container.append(button);
  button.addEventListener("click", action);
}

// adding buttons
const toolBarButtons = [
  { name: "Clear", action: clearCommand, container: toolbar_container },
  { name: "Undo", action: undoCommand, container: toolbar_container },
  { name: "Redo", action: redoCommand, container: toolbar_container },
  { name: "Export", action: exportCanvas, container: toolbar_container },
];
toolBarButtons.forEach(({ name, action, container }) =>
  setupButton(name, container, action)
);

// adding sticker buttons
function setupStickers() {
  sticker_container.innerHTML = "";
  for (const sticker of stickers) {
    setupButton(sticker, sticker_container, () => {
      currentSticker = new StickerCommand(sticker);
      bus.dispatchEvent(new Event("tool-moved"));
    });
  }
  setupButton("Add Sticker", sticker_container, () => {
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
scaleSlider.value = ((100 * lineWidth) / maxLineWidth).toString();
scaleSlider.classList.add("brush-slider");
slider_container.append(scaleSlider);
scaleSlider.oninput = () => {
  lineWidth = (maxLineWidth * parseInt(scaleSlider.value)) / 100; // scale to maxLineWidth
  brushSizeLabel.innerHTML = `Brush Size: x${lineWidth}`;
};

// adding color selector
color_selector.width = 100;
color_selector.height = 100;
color_selector_container.append(color_selector);
const color_ctx = color_selector.getContext("2d")!;

color_selector.addEventListener("mousedown", (e) => {
  colorSelectorPoint.x = e.offsetX;
  colorSelectorPoint.y = e.offsetY;
  bus.dispatchEvent(new Event("hue-saturation-changed"));
});

color_selector.addEventListener("mousemove", (e) => {
  if (e.buttons) {
    colorSelectorPoint.x = e.offsetX;
    colorSelectorPoint.y = e.offsetY;
    bus.dispatchEvent(new Event("hue-saturation-changed"));
  }
});

// adding darkness slider
darkness_selector.type = "range";
darkness_selector.min = "0";
darkness_selector.max = "100";
darkness_selector.value = darkness.toString();
darkness_selector.classList.add("darkness-slider");

color_selector_container.append(darkness_selector);
darkness_selector.oninput = () => {
  darkness = parseInt(darkness_selector.value);
  color_ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${darkness}%)`;
  bus.dispatchEvent(new Event("darkness-changed"));
};

// adding color demo
color_demo.width = 100;
color_demo.height = 100;
color_demo.style.border = "1px solid black";
color_selector_container.append(color_demo);

// adding elements to the app
app.append(title);
app.append(paint_canvas);
app.append(toolbar_container);
app.append(sticker_container);
app.append(slider_container);
app.append(brushSizeLabel);
app.append(document.createElement("br"));
app.append(document.createElement("br"));
app.append(color_selector_container);
app.append(document.createElement("br"));
app.append(recently_used_colors);

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
bus.addEventListener("drawing-changed", updateRecentlyUsedColors);
bus.addEventListener("tool-moved", redrawCommand);
bus.addEventListener("darkness-changed", updateColorSelector);
bus.addEventListener("hue-saturation-changed", updateColorSelector);

updateColorSelector();

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
  paint_ctx.clearRect(0, 0, paint_canvas.width, paint_canvas.height);
  for (const command of commands) {
    command.draw(paint_ctx);
  }

  if (currentSticker) {
    currentSticker.draw(paint_ctx);
  } else if (cursor && !currentLine) {
    cursor.draw(paint_ctx);
  }
}

function updateColorDemo() {
  const color_demo_ctx = color_demo.getContext("2d")!;
  color_demo_ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${darkness}%)`;
  color_demo_ctx.fillRect(0, 0, color_demo.width, color_demo.height);
}

function drawGradient() {
  for (let y = 0; y < color_selector.height; y++) {
    for (let x = 0; x < color_selector.width; x++) {
      const hue = (x / color_selector.width) * 360;
      const saturation = (y / color_selector.height) * 100;
      color_ctx.fillStyle = `hsl(${hue}, ${saturation}%, 50%)`;
      color_ctx.fillRect(x, y, 1, 1);
    }
  }
}

function drawColorSelector() {
  const selectorSize = 10;
  color_ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${darkness}%)`;
  color_ctx.beginPath();
  color_ctx.rect(
    colorSelectorPoint.x - selectorSize / 2,
    colorSelectorPoint.y - selectorSize / 2,
    selectorSize,
    selectorSize
  );
  color_ctx.stroke();
}

function updateColorSelector() {
  [hue, saturation] = calcColor(colorSelectorPoint);

  updateColorDemo();
  drawGradient();
  drawColorSelector();
}

function createColorUI(clr: Color) {
  const color_box = document.createElement("canvas");
  color_box.width = color_box.height = 20;

  const color_box_ctx = color_box.getContext("2d")!;
  const [h, s] = calcColor(clr.point);
  color_box_ctx.fillStyle = `hsl(${h}, ${s}%, ${clr.darkness}%)`;
  color_box_ctx.fillRect(0, 0, color_box.width, color_box.height);

  color_box.addEventListener("click", () => {
    colorSelectorPoint.x = clr.point.x;
    colorSelectorPoint.y = clr.point.y;
    bus.dispatchEvent(new Event("hue-saturation-changed"));
    // bus.dispatchEvent(new Event("darkness-changed"));
    // darkness-changed doesn't update the UI...
    darkness_selector.value = clr.darkness.toString();
  });

  return color_box;
}

function updateRecentlyUsedColors() {
  if (currentSticker !== null) return;

  // if color already exists
  if (
    recentColors.some((color) =>
      compare({ point: { ...colorSelectorPoint }, darkness }, color)
    )
  ) {
    recentColors.splice(
      recentColors.findIndex((color) =>
        compare({ point: { ...colorSelectorPoint }, darkness }, color)
      ),
      1
    );
    recentColors.unshift({ point: { ...colorSelectorPoint }, darkness });
  } else if (
    recentColors.length === 0 ||
    !compare({ point: { ...colorSelectorPoint }, darkness }, recentColors[0])
  ) {
    recentColors.unshift({ point: { ...colorSelectorPoint }, darkness });
  }

  // cap at 10 recent colors
  if (recentColors.length > 10) {
    recentColors.pop();
  }

  recently_used_colors.innerHTML = "";
  recentColors.forEach((color) => {
    recently_used_colors.append(createColorUI(color));
  });
}

// ================ utility functions ================
function calcColor(point: Point) {
  return [
    Math.floor((point.x / color_selector.width) * 360),
    Math.floor((point.y / color_selector.height) * 100),
  ];
}

function compare(a: Color, b: Color) {
  return (
    a.point.x === b.point.x &&
    a.point.y === b.point.y &&
    a.darkness === b.darkness
  );
}
