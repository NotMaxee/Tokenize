import * as config from "./config.js";
import * as ui from "./ui.js";
import * as utils from "./utils.js";
import * as tokenize from "./tokenize.js";
import * as adjustModal from "./adjustModal.js";

// Application initialization.

document.addEventListener("DOMContentLoaded", () => {

    // Initialize modules.
    ui.init();

    // UI elements - settings.
    ui.checkGenerateImmediately.onchange = updateGenerateImmediately;
    ui.checkDownloadImmediately.onchange = updateDownloadImmediately;

    ui.radioAdjustNever.onchange = updateAdjustToken;
    ui.radioAdjustAlways.onchange = updateAdjustToken;
    ui.radioAdjustNonSquare.onchange = updateAdjustToken;

    ui.inputBackgroundColour.onchange = updateDefaultTokenBackground;

    // UI elements - input / buttons.
    ui.inputFiles.onchange = handleInputFilesChange;

    ui.buttonGenerate.onclick = generateTokens;
    ui.buttonClearFiles.onclick = clearFiles;
    ui.buttonDownload.onclick = downloadTokens;
    ui.buttonDeleteTokens.onclick = deleteTokens;

    // UI elements - token adjustment.
    ui.rangeAdjust.oninput        = adjustModal.updateZoom;
    ui.canvasAdjust.onmousedown   = adjustModal.startGrab;
    ui.canvasAdjust.onmouseup     = adjustModal.stopGrab;
    ui.canvasAdjust.onmouseleave  = adjustModal.stopGrab;
    ui.buttonCancelAdjust.onclick = adjustModal.cancel;
    ui.buttonApplyAdjust.onclick  = adjustModal.apply;

    // UI elements - lightswitch.
    ui.buttonLightswitch.onclick = switchLights;

    // Apply preferred colour scheme on load.
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setColourTheme("dark");
    } else {
        setColourTheme("light");
    }

    console.log("Tokenize initialized. Let's get cooking!");
});

// UI handlers - settings.

function updateGenerateImmediately(e) {
    config.setGenerateTokensImmediately(ui.checkGenerateImmediately.checked);
}

function updateDownloadImmediately(e) {
    config.setDownloadTokensImmediately(ui.checkDownloadImmediately.checked);
}

function updateAdjustToken(e) {
    let radios = [ui.radioAdjustNever, ui.radioAdjustAlways, ui.radioAdjustNonSquare];

    for (let radio of radios) {
        if (radio.checked) {
            config.setAdjustTokenPositionMode(parseInt(radio.value));
            return;
        }
    }
}

function updateDefaultTokenBackground(e) {
    config.setDefaultTokenBackground(ui.inputBackgroundColour.value);
    ui.updateColourInput();
}

// UI handlers - input / buttons.

/**
 * Updates the file input info label and button states.
 */
function handleInputFilesChange(e) {
    ui.updateFileInputInfo();
    ui.updateButtonDisabledState();

    if (config.generateTokensImmediately) {
        generateTokens();
    }
}

/**
 * Generates tokens for every selected file.
 */
function generateTokens() {
    tokenize.generateTokens(ui.inputFiles.files);
}

/**
 * Clears all files from the file input and updates the UI.
 */
function clearFiles() {
    ui.inputFiles.value = "";
    ui.updateFileInputInfo();
    ui.updateButtonDisabledState();
}

/**
 * Starts a download for all generated tokens.
 */
function downloadTokens() {
    tokenize.downloadAllTokens();
}

/**
 * Deletes all generated tokens.
 */
function deleteTokens() {
    tokenize.deleteAllTokens();
}

/**
 * Switch between dark and light theme.
 */
function switchLights() {
    if (document.documentElement.getAttribute("data-theme") === "dark") {
        setColourTheme("light");
    } else {
        setColourTheme("dark");
    }
}

function setColourTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
}