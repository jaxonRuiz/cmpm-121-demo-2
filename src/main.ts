import "./style.css";

const APP_NAME = "Paint World";
const app = document.querySelector<HTMLDivElement>("#app")!;
const title = document.createElement("h1")!;

// setting up canvas
const canvas = document.createElement("canvas")!;
const ctx = canvas.getContext("2d")!;
ctx.fillStyle = "white";

document.title = APP_NAME;
title.innerHTML = APP_NAME;

app.append(title);
app.append(canvas);
