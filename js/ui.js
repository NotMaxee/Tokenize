import * as config from "./config.js";
import { getElement } from "./utils.js";
import * as tokenize from "./tokenize.js";

// UI Element variables
export var inputFiles;
export var inputFilesInfo;
export var checkGenerateImmediately;
export var checkDownloadImmediately;
export var radioAdjustNever;
export var radioAdjustAlways;
export var radioAdjustNonSquare;
export var inputBackgroundColour;
export var buttonGenerate;
export var buttonClearFiles;
export var buttonDownload;
export var buttonDeleteTokens;
export var previewContainer;

export var modalAdjust;
export var canvasAdjust;
export var rangeAdjust;
export var buttonCancelAdjust;
export var buttonApplyAdjust;

export var progressbar;

// Internal variables
var uiLocked = false;

/**
 * Initialize the UI module; registering all UI elements.
 */
export function init() {

    // Register UI elements.
    inputFiles = getElement("input-files");
    inputFilesInfo = getElement("input-files-info");

    checkGenerateImmediately = getElement("check-generate-immediately");
    checkDownloadImmediately = getElement("check-download-immediately");

    radioAdjustNever = getElement("radio-adjust-never");
    radioAdjustAlways = getElement("radio-adjust-always");
    radioAdjustNonSquare = getElement("radio-adjust-non-square");

    inputBackgroundColour = getElement("input-background-colour");

    buttonGenerate = getElement("button-generate");
    buttonClearFiles = getElement("button-clear-files");
    buttonDownload = getElement("button-download");
    buttonDeleteTokens = getElement("button-delete-tokens");

    previewContainer = getElement("preview-container");

    modalAdjust = getElement("modal-adjust");
    canvasAdjust = getElement("canvas-adjust");
    rangeAdjust = getElement("range-adjust");
    buttonCancelAdjust = getElement("button-cancel-adjust");
    buttonApplyAdjust = getElement("button-apply-adjust");

    progressbar = getElement("progress");

    // Update states.
    updateButtonDisabledState();
    updateCheckedStates();
    updateFileInputInfo();
}

document.addEventListener("DOMContentLoaded", init);

/**
 * Update the disabled state for buttons based on settings and app state.
 */
export function updateButtonDisabledState() {

    // Generation is allowed when files have been selected and
    // auto-generation is disabled.
    buttonGenerate.disabled = uiLocked || config.generateTokensImmediately || inputFiles.files.length == 0;

    // Clearing files is allowed when files have been selected.
    buttonClearFiles.disabled = uiLocked || inputFiles.files.length == 0;

    // Downloading tokens is allowed when tokens have been generated
    // and auto-download is disabled.
    buttonDownload.disabled = uiLocked || !tokenize.hasTokens() || config.downloadTokensImmediately;

    // Deleting tokens is allowed when tokens have been generated.
    buttonDeleteTokens.disabled = uiLocked || !tokenize.hasTokens();
}

/**
 * Lock all UI elements.
 * @param {*} locked The locked state.
 */
export function lockUI(locked) {
    uiLocked = locked;
    updateButtonDisabledState();
}

/**
 * Update the checked states for UI elements.
 */
function updateCheckedStates() {

    // Checkboxes.
    checkGenerateImmediately.checked = config.generateTokensImmediately;
    checkDownloadImmediately.checked = config.downloadTokensImmediately;

    // Update radio buttons.
    radioAdjustNever.checked = config.adjustTokenPositionMode == 0;
    radioAdjustAlways.checked = config.adjustTokenPositionMode == 1;
    radioAdjustNonSquare.checked = config.adjustTokenPositionMode == 2;

    // Update background colour input.
    inputBackgroundColour.value = config.defaultTokenBackground;

}

/**
 * Update the file input info label.
 */
export function updateFileInputInfo() {
    if (inputFiles.files.length == 0) {
        inputFilesInfo.textContent = "No files selected.";
    } else {
        let files = [];
        for (let file of inputFiles.files) {
            files.push(file.name);
        }
        inputFilesInfo.textContent = files.join(", ");
    }
}

export function showProgressbar(current, maximum) {
    progressbar.classList.remove("invisible");
    progressbar.value = current;
    progressbar.max = maximum;
}

export function hideProgressbar() {
    progressbar.classList.add("invisible");
}