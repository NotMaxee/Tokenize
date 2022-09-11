import { dispatch } from "./utils.js";
import * as ui from "./ui.js";

// Global settings.

/**
 * Whether to immediately generate tokens after selecting files.
 */
export var generateTokensImmediately = false;

/**
 * Whether to immediately download generated tokens after generating.
 */
export var downloadTokensImmediately = false;

/**
 * 0 = never, 1 = always, 2 = non-square
 */
export var adjustTokenPositionMode = 0;

/**
 * Hex colour code.
 */
export var defaultTokenBackground = "#000000";

// Functions.
export function setGenerateTokensImmediately(value) {
    generateTokensImmediately = value;
    console.log(`Generate immediately set to ${value}.`);
    ui.updateButtonDisabledState();
}

export function setDownloadTokensImmediately(value) {
    downloadTokensImmediately = value;
    console.log(`Download immediately set to ${value}.`);
    ui.updateButtonDisabledState();
}

export function setAdjustTokenPositionMode(value) {
    adjustTokenPositionMode = value;
    console.log(`Token adjustment mode set to ${value}.`);
}

export function setDefaultTokenBackground(value) {
    defaultTokenBackground = value;
    console.log(`Default token background colour set to ${value}.`);
}