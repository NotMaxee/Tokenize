
/**
 * Dispatch a custom event with the given event name and details.
 * @param {*} event The name of the dispatched event.
 * @param {*} data The detail data of the dispatched event.
 */
export function dispatch(event, data) {
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
}

/**
 * Fetch an UI element by its ID and return it.
 * 
 * Raises an Error when the element is not found.
 * 
 * @param {*} id The element's ID.
 * @returns The element.
 */
export function getElement(id) {
    let element = document.getElementById(id);
    if (element == null) {
        throw new Error(`Unable to find element with ID \"${id}\"!`);
    }
    return element;
}

/**
 * Get the base name of a file without extension.
 * 
 * @param {*} filename The filename.
 * @returns The filename without the extension.
 */
export function getFileNameWithoutExtension(filename) {
    let parts = filename.split(".");
    if (parts.length > 1) {
        parts.pop();
    }
    return parts.join(".");
}

// Canvas Functions ////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Generate a canvas of the given width and height.
 * @param {*} width The canvas width.
 * @param {*} height The canvas height.
 * @returns The generated canvas.
 */
export function createCanvas(width, height) {
    let canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

/**
 * Get the 2D context for a canvas.
 * @param {*} canvas The canvas to get the 2d context for.
 * @returns The 2d context.
 */
export function createContext(canvas) {
    return canvas.getContext("2d");
}

// File Processing  ////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Read the content of a file and return its data URL.
 * @param {*} file The file to read.
 * @returns A promise that resolves to the data URL.
 */
async function readFileObject(file) {
    return new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Get an image from a URL.
 * @param {*} data The URL of an image.
 * @returns A promise that resolves to the loaded image.
 */
async function getImageFromURL(url) {
    return new Promise((resolve, reject) => {
        let img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

/**
 * Generate a canvas from an image.
 * @param {*} image The image to generate a canvas from.
 * @returns A canvas representing the image.
 */
function getCanvasFromImage(image) {
    let canvas = createCanvas(image.width, image.height);
    let ctx = createContext(canvas);
    ctx.drawImage(image, 0, 0);
    return canvas;
}

/**
 * Generate a canvas representing the image for the given file.
 * 
 * Raises an error if the file is not a valid image.
 * @param {File} file A file object representing an image.
 * @return A canvas representing the image.
 */
export async function getCanvasFromFile(file) {
    let url = await readFileObject(file);
    let img = await getImageFromURL(url);
    return getCanvasFromImage(img);
}

/**
 * Generate a canvas representing the image found under the URL.
 * 
 * Raises an error if the URL does not point to a valid image.
 * @param {*} url The URL to retrieve the image from.
 * @returns A canvas representing the image.
 */
export async function getCanvasFromURL(url) {
    let img = await getImageFromURL(url);
    return getCanvasFromImage(img);

}