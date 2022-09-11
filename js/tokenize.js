import * as ui from "./ui.js";
import * as utils from "./utils.js";
import * as config from "./config.js";
import * as adjustModal from "./adjustModal.js";

// Public variables and functions. /////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * A map of all generated tokens.
 * 
 * Format: UID: {uid: string, name: string, token: canvas, preview: element}
 */
export var tokens = {};

/**
 * Start generating tokens from the given list of files.
 * @param {*} files A list of File objects.
 */
export function generateTokens(files) {
  console.log(`Starting token generation for ${files.length} file(s).`);

  // Reset processing variables.
  file = null;
  step = null;

  // Load files.
  let tmp = [];
  for (let file of files) {
    tmp.push(file);
  }
  queue = tmp;
  total = queue.length;

  console.log("Starting to process the token queue.");
  processTokenQueue();

  ui.updateButtonDisabledState();

  if (config.downloadTokensImmediately) {
    downloadAllTokens();
  }
}

/**
 * Delete all generated tokens.
 */
export function deleteAllTokens() {
  console.log("Deleting all generated tokens.");

  while (Object.keys(tokens).length > 0) {
    deleteToken(Object.keys(tokens)[0]);
  }

  ui.updateButtonDisabledState();
}

/**
 * Download all generated tokens in a ZIP file.
 */
export function downloadAllTokens() {
  console.log("Downloading all generated tokens.");

  let tokens = getTokensAsList();
  if (tokens.length == 0) {
    return;
  }

  ui.lockUI(true);
  let max = tokens.length;
  let cur = 0;

  let name, token, base64;
  let usedNames = {};
  let zip = new JSZip();

  for (token of tokens) {
    if (token.name in usedNames) {
      name = `${token.name}-${usedNames[token.name]}.png`;
      usedNames[token.name] += 1;
    } else {
      name = `${token.name}.png`;
      usedNames[token.name] = 1;
    }

    base64 = token.image.toDataURL("image/png").split(",")[1];
    zip.file(name, base64, { base64: true });
  }

  ui.lockUI(false);

  zip.generateAsync({ type: "base64" }).then(function (base64) {
    let anchor = document.createElement("a");
    anchor.href = "data:application/zip;base64," + base64;
    anchor.download = "tokens.zip";
    anchor.click();
  });
}

/**
 * Returns a list of all existing tokens.
 * @returns An array of all existing tokens.
 */
export function getTokensAsList() {
  let list = [];
  for (let uid of Object.keys(tokens)) {
    list.push(tokens[uid]);
  }
  return list;
}

/**
 * Check whether any tokens have been generated.
 * @returns True if tokens exist, false if not.
 */
export function hasTokens() {
  return Object.keys(tokens).length > 0;
}

/**
 * Check if the tokenizer is filely busy.
 * @returns True if there are still files being processed.
 */
export function isBusy() {
  return (queue.length > 0 || file != null);
}

// Private variables and functions. ////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
var tokenID = 0;      // Last token ID.
var assets = null;    // Object that'll hold static assets.
var queue = [];       // List of files in queue for processing.
var total = 0;        // Amount of tokens being generated.
var name = null;      // Name of the token being processed.
var file = null;      // Current file being processed.
var step = null;      // Next processing step for current file. null when done.
var image = null;     // Canvas for the token image.

const DEFER = new Object();

/**
 * Selects the next tile to process, continues processing the current file
 * or stops processing if the token queue is empty.
 */
function processTokenQueue() {
  ui.lockUI(true);
  ui.showProgressbar(0, total);

  if (file == null && queue.length == 0) {
    console.log("Finished processing the entire token queue.");
    ui.hideProgressbar();
    ui.lockUI(false);
    ui.updateButtonDisabledState();
    return;
  } else if (file == null) {
    file = queue.shift();
    ui.showProgressbar(total - queue.length, total);
    name = utils.getFileNameWithoutExtension(file.name);
    step = stepLoadImage;
    image = null;
  }

  // Process token step.
  processTokenSteps();
}

/**
 * Process the active step for the current file.
 * 
 * Steps are asynchronous functions.
 */
function processTokenSteps() {

  // Handle no remaining steps.
  if (step == null || step == undefined) {
    console.log(`  ${name}: No step remaining. Resuming queue processing.`);
    file = null;
    step = null;
    processTokenQueue();
    return;
  }

  // Handle deferred step.
  if (step == DEFER) {
    console.log(`  ${name}: Next step is deferred. Waiting...`);
    return;
  }

  // Run the next step.
  let runner = step;
  step = null;
  console.log(`  ${name}: Processing step ${runner.name}.`);
  runner().then(resolveStep).catch(rejectStep);
}

/**
 * Success handler for step promises.
 */
function resolveStep(nextStep) {
  step = nextStep;
  processTokenSteps();
}

/**
 * Error handler for step promises.
 */
function rejectStep(error) {
  console.error(`  ${name}: An error occured: `, error);
  step = null;
  processTokenQueue();
}

// Processing Steps ////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Generates the base image canvas for the current file.
 */
async function stepLoadImage() {
  image = await utils.getCanvasFromFile(file);

  // Now that we have the base image we either manually adjust
  // its viewport or do it automatically. This depends on the
  // setting, and the image size.

  // 0 = never adjust, 1 = always adjust, 2 = adjust non-square
  if (config.adjustTokenPositionMode == 0) {
    return stepFitImage;
  } else if (config.adjustTokenPositionMode == 1) {
    return stepAdjustImage;
  } else if (config.adjustTokenPositionMode == 2) {

    // Up to ca. 5% difference between width and height is acceptable.
    let min = Math.min(image.width, image.height);
    let max = Math.max(image.width, image.height);

    let factor = min / max;
    let maxDiff = 0.05;
    if (factor < 1 - maxDiff || factor > 1 + maxDiff) {
      return stepAdjustImage;
    } else {
      return stepFitImage;
    }
  }

  processTokenQueue();
}

/**
 * Let the user manually adjust the image, then continue.
 * 
 * This is achieved by relinquishing.
 */
async function stepAdjustImage() {
  let applyCallback = function (adjustedImage) {
    image = adjustedImage;
    step = stepGenerateToken;
    processTokenQueue();
  }

  let cancelCallback = function () {
    step = stepFitImage;
    processTokenQueue();
  }

  adjustModal.setup(image, applyCallback, cancelCallback);
  adjustModal.show();

  // Return DEFER to indicate that the execution of the next
  // step is deferred. This will cause the queue to wait for
  // a manual call to processTokenQueue or processTokenSteps.

  return DEFER;
}

/**
 * Automatically fit the image within the token boundaries.
 */
async function stepFitImage() {
  let minW, minH;
  if (image.width > image.height) {
    minW = (image.width / image.height) * 512;
    minH = 512;
  } else {
    minW = 512;
    minH = (image.height / image.width) * 512;
  }

  // Rescale image to minimum size to fit within token boundaries.
  let temp = utils.createCanvas(image.width, image.height);
  let ctx = utils.createContext(temp);
  ctx.drawImage(image, 0, 0);

  let hermite = new Hermite();
  hermite.resample_single(temp, minW, minH, true);

  let cropped = utils.createCanvas(512, 512);
  ctx = utils.createContext(cropped);
  ctx.drawImage(temp, 256 - minW / 2, 256 - minH / 2);
  image = cropped;

  return stepGenerateToken;
}

/**
 * Generate the token object.
 */
async function stepGenerateToken() {
  await loadAssets();

  let blur = blurCanvas(image);

  // Generate base layer.
  let canvBase = utils.createCanvas(512, 512);
  let ctxBase = utils.createContext(canvBase);

  ctxBase.fillStyle = config.defaultTokenBackground;
  ctxBase.fillRect(0, 0, 512, 512);  

  ctxBase.globalCompositeOperation = "source-over";
  ctxBase.drawImage(image, 0, 0);

  ctxBase.globalCompositeOperation = "destination-out";
  ctxBase.drawImage(assets.eraseBase, 0, 0);

  // Generate inner border.
  let canvInner = utils.createCanvas(512, 512);
  let ctxInner = utils.createContext(canvInner);

  ctxInner.drawImage(blur, 0, 0);
  filterBorder(ctxInner, assets.shadingInner);

  ctxInner.globalCompositeOperation = "destination-out";
  ctxInner.drawImage(assets.eraseInner, 0, 0);

  // Generate outer border.
  let canvOuter = utils.createCanvas(512, 512);
  let ctxOuter = utils.createContext(canvOuter);

  ctxOuter.drawImage(blur, 0, 0);
  filterBorder(ctxOuter, assets.shadingOuter);

  // Combine borders.
  let canvBorder = utils.createCanvas(512, 512);
  let ctxBorder = utils.createContext(canvBorder);

  ctxBorder.drawImage(canvOuter, 0, 0);
  ctxBorder.drawImage(canvInner, 0, 0);

  ctxBorder.globalCompositeOperation = "destination-out";
  ctxBorder.drawImage(assets.eraseCenter, 0, 0);
  ctxBorder.drawImage(assets.eraseOuter, 0, 0);

  // Apply border to token base.
  ctxBase.globalCompositeOperation = "source-over";
  ctxBase.drawImage(canvBorder, 0, 0);

  // Update image with the final token.
  image = canvBase;

  return stepFinalizeToken
}

/**
 * Create the token object and a preview.
 */
async function stepFinalizeToken() {

  // Create token object.
  let token = {
    uid: getTokenUID(),
    name: name,
    image: image,
    preview: null
  };

  // Create token preview.
  token.preview = createTokenPreview(token);

  tokens[token.uid] = token;
  console.log(`  ${name}: Token completed.`);
}


// Helper Functions ////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

async function loadAssets() {
  if (assets != null) {
    return assets;
  }

  let tmp = {};
  tmp.eraseBase = await utils.getCanvasFromURL("data/token/erase_base.png");
  tmp.eraseInner = await utils.getCanvasFromURL("data/token/erase_inner.png");
  tmp.eraseOuter = await utils.getCanvasFromURL("data/token/erase_outer.png");
  tmp.eraseCenter = await utils.getCanvasFromURL("data/token/erase_center.png");
  tmp.shadingInner = await utils.getCanvasFromURL("data/token/shading_inner.png");
  tmp.shadingOuter = await utils.getCanvasFromURL("data/token/shading_outer.png");

  assets = tmp;
  return assets;
}

/**
 * Create a blurred copy of the given canvas.
 * @param {*} canvas The canvas to be blurred.
 * @returns A blurred copy of he given canvas.
 */
function blurCanvas(canvas) {
  let blurred = utils.createCanvas(canvas.width, canvas.height);
  let ctx = utils.createContext(blurred);
  ctx.filter = "blur(3px)";
  ctx.drawImage(canvas, 0, 0);
  return blurred;
}

function filter(ctx, canvas, filter, alpha) {
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = filter;
  ctx.drawImage(canvas, 0, 0);
}

function filterBorder(ctx, canvas) {
  filter(ctx, canvas, "color", 0.5);
  filter(ctx, canvas, "overlay", 0.9);
}

/**
 * Get an unused token ID.
 * @returns The token ID.
 */
function getTokenUID() {
  return `${tokenID++}`;
}

function createTokenPreview(token) {
  let container = document.createElement("div");
  container.id = `preview-token-${token.uid}`;
  container.classList.add("preview");

  let img = document.createElement("img");
  img.title = token.name;
  img.src = token.image.toDataURL("image/png");

  let buttonSave = document.createElement("button");
  buttonSave.classList.add("button");
  buttonSave.classList.add("is-info");
  buttonSave.textContent = "Save";
  buttonSave.onclick = () => downloadToken(token.uid);

  let buttonDelete = document.createElement("button");
  buttonDelete.classList.add("button");
  buttonDelete.classList.add("is-danger");
  buttonDelete.textContent = "Delete";
  buttonDelete.onclick = () => deleteToken(token.uid);

  container.appendChild(img);
  container.appendChild(buttonSave);
  container.appendChild(buttonDelete);

  ui.previewContainer.appendChild(container);
  return container;
}

function downloadToken(uid) {
  console.log(`Downloading token ${uid}.`);
  let token = tokens[uid];

  let anchor = document.createElement("a");
  anchor.href = token.image.toDataURL("image/png");
  anchor.download = token.name;
  anchor.click();
}

function deleteToken(uid) {
  console.log(`Deleting token ${uid}.`);
  let data = tokens[uid];

  data.preview.remove();
  delete tokens[uid];

  ui.updateButtonDisabledState();
}