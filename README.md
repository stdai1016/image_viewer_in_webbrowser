# Image Viewer in Web Browser

This userscript creates an image viewer in web browser.
It works on latest version of Firefox and Chrome.

## Installation

For running this userscript, you should have a userscript manager, e.g. [Tampermonkey](https://www.tampermonkey.net/).

To install the userscript, see the [image_viewer.user.js](./image_viewer.user.js) and open raw URL by click the *Raw* button at the top of the file. The userscript manager will ask if you would like to install it (or add new script in the manager and enter the source).

## Usage

Open image with web browser.

### Keyboard

* Arrow keys: scroll the window

* Rotate
  * Num 4 & Num 6: counter-clockwise and clockwise rotation
  * Num 5: reset the rotation

* Zoom
  * Num 7: fit to width
  * Num 8: fit to height
  * Num 9: fit in window
  * Num 0 & Numpad * : 100%
  * Key +: zoom in
  * Key -: zoom out

### Mouse

Click the screen to quickly zoom in/out a large image.

Click the hidden button at left-bottom to open the control panel;
click the background to close the panel.

## Updates

* v0.1.3 - Fixed problem of scrolling when rotating and scaling.
* v0.1.2 - Initial version.
