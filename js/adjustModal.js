import * as ui from "./ui.js";
import * as utils from "./utils.js";

// Public variables and functions. /////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Show the modal.
 */
export function show() {
  ui.modalAdjust.classList.remove("invisible");
  document.body.style.overflow = "hidden";
}

/**
 * Hide the modal.
 */
export function hide() {
  ui.modalAdjust.classList.add("invisible");
  document.body.style.overflow = "auto";
}

/**
 * Reset the modal UI and state.
 */
export function reset() {
  let ctx = utils.createContext(ui.canvasAdjust);
  ctx.clearRect(0, 0, ui.canvasAdjust.width, ui.canvasAdjust.height);

  // Reset zoom
  ui.rangeAdjust.value = 0;
  zoom = 0;
}

/**
 * Apply the adjustments made and return control to the tokenizer.
 */
export function apply() {
  callbackApply(getAdjustedImage());
  hide();
}

/**
 * Cancel any adjustments made and return control to the tokenizer.
 */
export function cancel() {
  callbackCancel();
  hide();
}

/**
 * Set up the modal for a new image.
 * 
 * @param {*} image The image canvas to edit.
 * @param {*} applyCallback A function to call when apply is clicked. 
 *                           Must accept the adjusted image as its sole parameter.
 * @param {*} cancelCallback A function to call when cancel is clicked.
 */
export function setup(image, applyCallback, cancelCallback) {
  reset();

  image = image;
  callbackApply = applyCallback;
  callbackCancel = cancelCallback;

  handleNewImage(image);
}

/**
 * Update the zoom level of the token image.
 */
export function updateZoom(e) {
  handleZoom(ui.rangeAdjust.valueAsNumber);
}

/**
 * Start grabbing the token image.
 */
export function startGrab(e) {
  grab = { x: e.clientX, y: e.clientY };
  ui.canvasAdjust.addEventListener("mousemove", handleGrab, false);
}

/**
 * Stop grabbing the token image.
 */
export function stopGrab(e) {
  grab = { x: e.clientX, y: e.clientY };
  ui.canvasAdjust.removeEventListener("mousemove", handleGrab, false);
}

// Rudimentary touch support. //////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Event handler that processes new touches.
 * @param {*} e 
 * @returns 
 */
export function startTouch(e) {
  e.preventDefault();
  if (touchIdentifier != null) {
    return;
  }

  let touch = e.touches[0];
  touchIdentifier = touch.identifier;
  touchPos = {x: touch.clientX, y: touch.clientY};
  ui.canvasAdjust.addEventListener("touchmove", handleTouch);
}

/**
 * Event handler that processes ending touches.
 * @param {TouchEvent} e The touch event to process.
 */
export function stopTouch(e) {
  e.preventDefault();
  let touch = getTrackedTouchFromList(e.changedTouches);
  if (touch == null) { return; }

  touchIdentifier = null;
  touchPos = {x: 0, y: 0};
  ui.canvasAdjust.removeEventListener("touchmove", handleTouch);
}

// Private variables and functions. ////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
var callbackApply = null;
var callbackCancel = null;
var image;  // The base image.
var imageAdjusted; // The zoomed variant of the image.

var zoom = 0; // The current zoom (0% to 150%).
var grab = { x: 0, y: 0 };

// The touch system keeps track of multiple touches at a time,
// but for adjusting the image position we only care about one.
var touchIdentifier = null;
var touchPos = {x:0, y:0};

var rootX, rootY; // Root position of the token mask.
var offsetX, offsetY; // Current offset of the image from canvas root.
var minW, minH; // Minimum dimensions to fit image into token.

/**
 * Handle a new image being loaded into the dialog.
 * @param {*} newImage 
 */
function handleNewImage(newImage) {
  image = newImage;

  // Find the minimum width and height for the image
  // to fit inside the token. Allow the user to adjust
  // from there.
  if (image.width > image.height) {
    minW = (image.width / image.height) * 512;
    minH = 512;
  } else {
    minW = 512;
    minH = (image.height / image.width) * 512;
  }

  imageAdjusted = rescaleCanvas(image, minW, minH);

  // Calculate rootX and rootY and center the image on the canvas.
  let canvasW = ui.canvasAdjust.width;
  let canvasH = ui.canvasAdjust.height;
  rootX = canvasW / 2 - 256;
  rootY = canvasH / 2 - 256;
  offsetX = canvasW / 2 - minW / 2;
  offsetY = canvasH / 2 - minH / 2;

  updateCanvas();
}

/**
 * Get the currently tracked touch from a list of touches.
 * 
 * The tracked touch is identified using it the touchIdentifier var.
 * @param {*} touches A list of touches.
 * @returns The tracked touch, or null if it was not found.
 */
 function getTrackedTouchFromList(touches) {
  for (let i=0; i<touches.length; i++) {
    if (touches[i].identifier == touchIdentifier) {
      return touches[i];
    }
  }
  return null;
}

/**
 * Event handler that processes touch movement.
 * @param {TouchEvent} e The touch event to process.
 */
function handleTouch(e) {
  e.preventDefault();
  if (image == null) {
    return;
  }

  let touch = getTrackedTouchFromList(e.changedTouches);
  if (touch == null) { return; }

  offsetX += touch.clientX - touchPos.x;
  offsetY += touch.clientY - touchPos.y;
  touchPos = {x: touch.clientX, y: touch.clientY};

  // Ensure grabbing doesn't pull the image out of frame.
  sanitizeOffset();
  updateCanvas();
}


/**
 * Handle mouse movement while the adjustent canvas is grabbed.
 * @param {MouseEvent} e A mouse event.
 */
function handleGrab(e) {
  if (image == null) {
    return;
  }

  offsetX += e.clientX - grab.x;
  offsetY += e.clientY - grab.y;
  grab = { x: e.clientX, y: e.clientY };

  // Ensure grabbing doesn't pull the image out of frame.
  sanitizeOffset();
  updateCanvas();
}

/**
 * Helper function that ensures the position offset keeps the image
 * within the token boundaries.
 */
function sanitizeOffset() {
  offsetX = Math.min(rootX, Math.max(rootX + 512 - imageAdjusted.width, offsetX));
  offsetY = Math.min(rootY, Math.max(rootY + 512 - imageAdjusted.height, offsetY));
}

/**
 * Handle zoom changes.
 * @param {*} newZoom The new zoom value.
 */
function handleZoom(newZoom) {
  if (image == null) {
    return;
  }

  zoom = newZoom;
  let factor = (100 + zoom) / 100;

  // Rescale the image and update the image coordinates
  // to remain centered on the same point if possible.
  let wBefore = imageAdjusted.width;
  let hBefore = imageAdjusted.height;

  imageAdjusted = rescaleCanvas(image, minW * factor, minH * factor);

  let wDiff = imageAdjusted.width - wBefore;
  let hDiff = imageAdjusted.height - hBefore;

  // Readjust the offset iff the X / Y offset aren't on a border.
  offsetX -= wDiff / 2;
  offsetY -= hDiff / 2;

  sanitizeOffset();
  updateCanvas();
}

/**
 * Draw the current state on the canvas.
 */
function updateCanvas() {
  if (image == null) {
    return;
  }

  let context = utils.createContext(ui.canvasAdjust);
  context.clearRect(0, 0, ui.canvasAdjust.width, ui.canvasAdjust.height);
  context.drawImage(imageAdjusted, offsetX, offsetY);

  // Draw the mask.
  context.globalAlpha = 0.75;
  context.globalCompositeOperation = "source-over";
  context.drawImage(getCanvasMask(), 0, 0);
  context.globalAlpha = 1.0;
}

/**
 * Generates a mask for the adjust canvas.
 */
function getCanvasMask() {
  let w = ui.canvasAdjust.width;
  let h = ui.canvasAdjust.height;

  // Black overlay
  let base = utils.createCanvas(w, h);
  let baseCtx = utils.createContext(base);
  baseCtx.fillStyle = "black";
  baseCtx.fillRect(0, 0, w, h);

  // Token border (32px)
  let border = utils.createCanvas(w, h);
  let borderCtx = utils.createContext(border);
  drawCircle(borderCtx, w / 2, h / 2, 256, "black");

  // Token center
  let center = utils.createCanvas(w, h);
  let centerCtx = utils.createContext(center);
  drawCircle(centerCtx, w / 2, h / 2, 256 - 32, "black");

  // Delete the token border from the overlay with 50% opacity.
  baseCtx.globalAlpha = 0.5;
  baseCtx.globalCompositeOperation = "destination-out";
  baseCtx.drawImage(border, 0, 0);

  baseCtx.globalAlpha = 1.0;
  baseCtx.drawImage(center, 0, 0);

  return base;
}

/**
 * Draw a circle using a 2d context.
 * @param {*} context The context.
 * @param {*} centerX The center X of the circle.
 * @param {*} centerY The center Y of the circle.
 * @param {*} radius The radius of the circle.
 * @param {*} fill The colour the circle is filled with.
 */
function drawCircle(context, centerX, centerY, radius, fill) {
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
  context.fillStyle = fill;
  context.fill();
}

/**
 * Rescale a canvas to the desired width and height.
 * @param {*} image The canvas to be rescaled.
 * @param {*} width The desired width.
 * @param {*} height The desired height.
 * @returns A new canvas of the desired width and height.
 */
function rescaleCanvas(image, width, height) {
  let canvas = utils.createCanvas(width, height);
  let ctx = utils.createContext(canvas);

  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
}

/**
 * Get the adjusted token image based on the current modal settings.
 * @returns The adjusted token image.
 */
function getAdjustedImage() {
  let factor = (100 + zoom) / 100;
  let x = offsetX - rootX;
  let y = offsetY - rootY;

  let img = utils.createCanvas(image.width, image.height);
  let ctx = utils.createContext(img);
  ctx.drawImage(image, 0, 0);

  let hermite = new Hermite();
  hermite.resample_single(img, minW * factor, minH * factor, true);

  let canvas = utils.createCanvas(512, 512);
  ctx = utils.createContext(canvas);
  ctx.drawImage(img, x, y);
  
  return canvas;
}