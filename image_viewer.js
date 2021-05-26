/** Image Viewer
 *  This userscript is an image viewer in webbrowser.
 *  It will modify the ImageDocument.
 *  Works on last verson of Firefox and Chrome (not well).
 */

// ==UserScript==
// @name         Image Viewer
// @description  Image viewer in webbrowser
// @include      *.bmp*
// @include      *.gif*
// @include      *.jpg*
// @include      *.jpeg*
// @include      *.png*
// @include      *.webp*
// @version      0.1.2
// @license      MIT
// @grant        GM_addStyle
// ==/UserScript==

/* jshint esversion: 6 */

(function () {
  'use strict';
  if (!document.contentType.startsWith('image/')) return;

  // ==========
  const SCALE_MAX = 4;
  const SCALE_MIN = 0.1;
  const SCALE_SETP_SIZE = 0.1;
  const COLOR = '#55C';
  // css - rotate
  const WHEEL_RADIUS = 200;
  const HANDLE_RADIUS = 35;
  const DIRECT_SIZE = 40;
  // css - scale
  const BTN_SIZE = 40;

  function atan360 (x, y) {
    let deg = Math.atan(y / x) * 180 / Math.PI;
    if (x < 0) deg += 180;
    if (deg < 0) deg += 360;
    return deg;
  }

  function round (num, digit = 0) {
    return Math.round(
      (num + Number.EPSILON) * Math.pow(10, digit)) / Math.pow(10, digit);
  }

  // pos: [x, y]
  function rotate2D (pos, rad) {
    const x = pos[0] * Math.cos(rad) - pos[1] * Math.sin(rad);
    const y = pos[0] * Math.sin(rad) + pos[1] * Math.cos(rad);
    return [x, y];
  }

  function rotatedSize (size, rad) {
    let [iw, ih] = size;
    const points = [[0, 0], [iw, 0], [iw, ih], [0, ih]].map(p => {
      // p[0] -= iw / 2;
      // p[1] -= ih / 2;
      p = rotate2D(p, rad);
      // p[0] += iw / 2;
      // p[1] += ih / 2;
      return p;
    });
    iw = Math.max(...points.map(p => p[0])) - Math.min(...points.map(p => p[0]));
    ih = Math.max(...points.map(p => p[1])) - Math.min(...points.map(p => p[1]));
    return [iw, ih];
  }

  function fitInScale (img, only = null) {
    let [iw, ih] = [img.naturalWidth, img.naturalHeight];
    [iw, ih] = rotatedSize([iw, ih],
      parseFloat(img.dataset.degree) * Math.PI / 180);
    const sw = round(img.parentElement.offsetWidth / iw, 6);
    const sh = round(img.parentElement.offsetHeight / ih, 6);
    switch (only) {
      case 'width':
        return sw;
      case 'height':
        return sh;
      default:
        return Math.min(sw, sh, 1);
    }
  }

  function newScaleByStep (scale, steps, stepSize = SCALE_SETP_SIZE) {
    let s = round(scale / stepSize, 6);
    s = ((steps < 0 ? Math.ceil(s) : Math.floor(s)) + steps) * stepSize;
    return Math.max(Math.min(round(s, 6), SCALE_MAX), SCALE_MIN);
  }

  // must set img.dataset.degree & img.dataset.scale & img.dataset.scrollTarget
  function applyTransform (img) {
    function parseTransform (transform) {
      const t = { translate: 0, scale: 1, rotate: 0 };
      (transform.match(/\w+\([-\w., %]+\)/g) || []).forEach(func => {
        const m = func.match(/(\w+)\(([-\w., %]+)\)/);
        t[m[1]] = m[2].search(',') < 0
          ? parseFloat(m[2])
          : m[2].split(',').map(s => parseFloat(s.trim()));
      });
      return t;
    }
    const transformOld = parseTransform(img.style.transform);

    const warp = img.parentElement;
    const [ww, wh] = [warp.offsetWidth, warp.offsetHeight];
    const rad = Math.PI / 180 * parseFloat(img.dataset.degree);
    const [iw, ih] = rotatedSize([img.naturalWidth, img.naturalHeight], rad)
      .map(v => round(v * parseFloat(img.dataset.scale)));
    const tx = ((iw >= ww ? iw : ww) - img.naturalWidth) / 2;
    const ty = ((ih >= wh ? ih : wh) - img.naturalHeight) / 2;

    // apply
    if (iw > ww || ih > wh) img.classList.remove('fit');
    else img.classList.add('fit');
    img.style.transform = null;
    img.setAttribute('style', img.style.cssText + 'transform:' +
      ` translate(${tx}px, ${ty}px)` +
      ` scale(${img.dataset.scale}) rotate(${rad}rad)`
    );

    // scroll
    if (img.dataset.scrollTarget.length) {
      const scrollLeftMax = warp.scrollLeftMax || Math.max(0, iw - warp.clientWidth);
      const scrollTopMax = warp.scrollTopMax || Math.max(0, ih - warp.clientHeight);

      let [dx, dy] = img.dataset.scrollTarget.split(',').map(parseFloat);
      [dx, dy] = rotate2D([dx, dy], rad);
      const scrollLeftP = 0.5 + dx / im.offsetWidth;
      const scrollTopP = 0.5 + dy / im.offsetHeight;

      const w = im.parentElement;
      w.scrollTo(scrollLeftP * scrollLeftMax,
        scrollTopP * scrollTopMax);
    }
  }

  // ==========

  GM_addStyle([
    'body {overflow:hidden}',
    '#img-warp {position:fixed; top:0;left:0;bottom:0;right:0; overflow:auto;}',
    '#img-warp img {margin:0}',
    '.hidden {display:none !important;}'
  ].join('\n'));
  const imWarp = document.createElement('div');
  document.body.insertBefore(imWarp, document.body.firstChild);
  imWarp.id = 'img-warp';
  let im = document.body.querySelector('img');
  imWarp.insertBefore(im.cloneNode(true), imWarp.firstChild);
  im.remove();
  im = document.body.querySelector('#img-warp img');
  ['class', 'width', 'height', 'style'].forEach(a => im.removeAttribute(a));
  im.dataset.degree = 0;
  im.dataset.scrollTarget = '';
  im.onclick = function (e) {
    if (im.classList.contains('fit')) {
      im.dataset.scrollTarget = `${e.offsetX},${e.offsetY}`;
      im.dataset.scale = 1;
    } else {
      im.dataset.scrollTarget = '';
      im.dataset.scale = fitInScale(im);
    }
  };
  im.onload = function (e) {
    im.classList.remove('hidden');
    console.debug(`natural size: ${im.naturalWidth}x${im.naturalHeight}`);
    im.dataset.scale = fitInScale(im);
  };
  (new MutationObserver(function (records) { applyTransform(im); })).observe(im,
    { attributes: true, attributeFilter: ['data-degree', 'data-scale'] });
  window.onresize = function () {
    if (im.classList.contains('fit')) im.dataset.scale = fitInScale(im);
    applyTransform(im);
  };
  document.onkeydown = function (e) {
    const STEP = 10;
    let preventDefault = true;
    switch (e.code) {
      case 'ArrowUp':
        imWarp.scrollTop -= STEP;
        break;
      case 'ArrowDown':
        imWarp.scrollTop += STEP;
        break;
      case 'ArrowLeft':
        imWarp.scrollLeft -= STEP;
        break;
      case 'ArrowRight':
        imWarp.scrollLeft += STEP;
        break;
      case 'Equal':
      case 'NumpadAdd':
        im.dataset.scale = newScaleByStep(parseFloat(im.dataset.scale), 1);
        break;
      case 'Minus':
      case 'NumpadSubtract':
        im.dataset.scale = newScaleByStep(parseFloat(im.dataset.scale), -1);
        break;
      case 'Dight4':
      case 'Numpad4':
        im.dataset.degree = parseFloat(im.dataset.degree) - 10;
        break;
      case 'Dight5':
      case 'Numpad5':
        im.dataset.degree = 0;
        break;
      case 'Dight6':
      case 'Numpad6':
        im.dataset.degree = parseFloat(im.dataset.degree) + 10;
        break;
      case 'Dight7':
      case 'Numpad7':
        im.dataset.scale = fitInScale(im, 'width');
        break;
      case 'Dight8':
      case 'Numpad8':
        im.dataset.scale = fitInScale(im, 'height');
        break;
      case 'Dight9':
      case 'Numpad9':
        im.dataset.scale = fitInScale(im);
        break;
      case 'Dight0':
      case 'Numpad0':
      case 'NumpadMultiply':
        im.dataset.scale = 1;
        break;
      default:
        preventDefault = false;
        console.debug(e.code);
    }
    if (preventDefault) e.preventDefault();
  };

  // ========== general & menu ==========
  const link = document.head.appendChild(document.createElement('link'));
  link.setAttribute('rel', 'stylesheet');
  link.setAttribute('href',
    'https://fonts.googleapis.com/css?family=Material+Icons+Outlined');

  GM_addStyle([
    '.input {position:fixed;opacity:0.8;}',
    '.input:hover,.input:focus-within {opacity: 1}',
    '.group {position:fixed;}',
    `.menu {width:60px; height:60px; background-color:${COLOR};`,
    '  left:20px; bottom:20px; border-radius:10px; opacity:0;',
    '  font-size: 40px; text-align:center; line-height: 64px;}',
    '.bg {position:fixed; width:auto; height:auto;',
    '  left:0; top:0; right:0; bottom:0}'
  ].join('\n'));

  const menu = document.body.appendChild(document.createElement('div'));
  menu.classList.add('input', 'menu', 'material-icons-outlined');
  menu.innerText = 'menu';
  menu.onclick = function () {
    document.querySelectorAll('.input,.group')
      .forEach(b => b.classList.toggle('hidden'));
  };
  const bg = document.body.insertBefore(document.createElement('div'), menu);
  bg.classList.add('input', 'bg', 'hidden');
  bg.onclick = function () {
    document.querySelectorAll('.input,.group')
      .forEach(b => b.classList.toggle('hidden'));
  };

  // ========== rotate ==========
  GM_addStyle([
    '.deg-group {position: fixed;',
    `  width:${WHEEL_RADIUS * 2}px; height:${WHEEL_RADIUS * 2}px;`,
    `  top:calc(50% - ${WHEEL_RADIUS}px); left:calc(50% - ${WHEEL_RADIUS}px);}`,
    '.deg-group > * {position:absolute}',
    '.deg-wheel {width:100%; height:100%; top:0; left:0; box-sizing:border-box;',
    `  border:${HANDLE_RADIUS * 2}px solid #CCC; border-radius:${WHEEL_RADIUS}px;}`,
    `.deg-wheel-handle {top:0; left:calc(50% - ${HANDLE_RADIUS}px);`,
    `  border: ${HANDLE_RADIUS}px solid ${COLOR}; width:0; height:0;`,
    `  border-radius:${HANDLE_RADIUS}px;}`,
    '.deg-val {display:table; text-align:center;',
    `  font-size:24px; color:${COLOR}; background-color:#FFF;`,
    `  top: calc(50% - ${DIRECT_SIZE}px); left: calc(50% - ${DIRECT_SIZE}px);`,
    `  width:${DIRECT_SIZE * 2}px; height:${DIRECT_SIZE * 2}px;`,
    `  line-height: ${DIRECT_SIZE * 2}px;}`,
    '.deg-val:after {content:"°"}'
  ].join('\n'));

  const degGroup = document.body.appendChild(document.createElement('div'));
  degGroup.classList.add('group', 'deg-group', 'hidden');

  const degWheel = degGroup.appendChild(document.createElement('div'));
  degWheel.classList.add('input', 'deg-wheel', 'hidden');
  degWheel.onclick = function (e) {
    if (e.target !== degWheel) return;
    const y = e.offsetX - degWheel.clientWidth / 2;
    const x = degWheel.clientHeight / 2 - e.offsetY;
    if (Math.sqrt(x * x + y * y) < degWheel.clientWidth / 2) return;
    const deg = atan360(x, y) + parseInt(im.dataset.degree);
    im.dataset.degree = Math.floor(deg < 360 ? deg : deg - 360);
  };
  const degHandle = degGroup.appendChild(document.createElement('div'));
  degHandle.classList.add('input', 'deg-wheel-handle', 'hidden');
  degHandle.setAttribute('draggable', 'true');
  function ondragover (e) {
    if (e.clientX === 0 || e.clientY === 0) return;
    const y = e.clientX - window.innerWidth / 2;
    const x = window.innerHeight / 2 - e.clientY;
    const deg = atan360(x, y);
    im.dataset.degree = Math.floor(deg);
  }
  degHandle.ondragstart = function (e) {
    const clone = document.querySelector('#degHandle_clone') || (function () {
      const c = degHandle.cloneNode(true);
      c.id = 'degHandle_clone';
      c.style.display = 'none';
      document.body.appendChild(c);
      return c;
    })();
    e.dataTransfer.setDragImage(clone, 0, 0);
    document.ondragover = ondragover;
  };
  degHandle.ondragend = function (e) { document.ondragover = null; };

  const degVal = degGroup.appendChild(document.createElement('div'));
  degVal.classList.add('input', 'deg-val', 'hidden');
  degVal.innerText = '0';
  (new MutationObserver(function (records) {
    degVal.innerText = im.dataset.degree;
    degVal.setAttribute('style', `transform:rotate(${-im.dataset.degree}deg);`);
    degGroup.setAttribute('style', `transform:rotate(${im.dataset.degree}deg);`);
  })).observe(document.querySelector('#img-warp img'),
    { attributes: true, attributeFilter: ['data-degree'] });

  GM_addStyle([
    `.dir-group {width:${DIRECT_SIZE * 4}px; height:${DIRECT_SIZE * 4}px;`,
    `  position:fixed; top:calc(50% - ${DIRECT_SIZE * 2}px);`,
    `  left:calc(50% - ${DIRECT_SIZE * 2}px);}`,
    '.dir-group>* {position:absolute; width:0; height:0; border-style:solid}',
    '.dir-up   {top: 0; left: 25%;',
    `  border-width: 0 ${DIRECT_SIZE}px ${DIRECT_SIZE}px ${DIRECT_SIZE}px;`,
    `  border-color:transparent transparent ${COLOR} transparent}`,
    '.dir-right{top:25%; right:0;',
    `  border-width: ${DIRECT_SIZE}px 0 ${DIRECT_SIZE}px ${DIRECT_SIZE}px;`,
    `  border-color: transparent transparent transparent ${COLOR};}`,
    '.dir-down {bottom: 0; left:25%;',
    `  border-width: ${DIRECT_SIZE}px ${DIRECT_SIZE}px 0 ${DIRECT_SIZE}px;`,
    `  border-color: ${COLOR} transparent transparent transparent}`,
    '.dir-left {top:25%; left:0;',
    `  border-width: ${DIRECT_SIZE}px ${DIRECT_SIZE}px ${DIRECT_SIZE}px 0;`,
    `  border-color: transparent ${COLOR} transparent transparent}`
  ].join('\n'));
  const direction = { up: 0, right: 90, down: 180, left: 270 };
  const dirGroup = document.body.appendChild(document.createElement('div'));
  dirGroup.classList.add('group', 'dir-group', 'hidden');
  for (const [n, deg] of Object.entries(direction)) {
    const b = dirGroup.appendChild(document.createElement('div'));
    b.classList.add('input', `dir-${n}`, 'hidden');
    b.onclick = function () {
      document.querySelector('#img-warp img').dataset.degree = deg;
    };
  }

  // ========== scale ==========
  GM_addStyle([
    '.scale-box {width:auto;bottom:20px;left:50%;transform:translateX(-50%);}',
    `.scale-box2 {width:auto; bottom:${BTN_SIZE + 30}px; left:50%;`,
    '  transform:translateX(-50%);}',
    '.scale-box *, .scale-box2 * {display:table-cell; position:static;',
    '  text-align:center; vertical-align:middle;}',
    `.scale-btn {width:${BTN_SIZE}px; height:${BTN_SIZE}px; font-size:32px;`,
    `  background-color:${COLOR};}`,
    '.scale-box2 .scale-btn {font-size: 24px;}',
    `.scale-val {width:80px; height:${BTN_SIZE}px; color:${COLOR}; border:0;`,
    '  font-size:24px; background-color:#FFF; -moz-appearance: textfield;}',
    '.scale-val::-webkit-outer-spin-button,',
    '.scale-val::-webkit-inner-spin-button {-webkit-appearance:none;margin:0;}'
  ].join('\n'));

  const scaleBox = document.body.appendChild(document.createElement('div'));
  scaleBox.classList.add('group', 'scale-box', 'hidden');
  const btnStep = { '-': -1, '+': 1 };
  for (const [txt, val] of Object.entries(btnStep)) {
    const b = scaleBox.appendChild(document.createElement('div'));
    b.classList.add('input', 'scale-btn', 'hidden');
    b.innerText = txt;
    b.onclick = function () {
      im.dataset.scale = newScaleByStep(parseFloat(im.dataset.scale), val);
    };
  }
  const btnMid = scaleBox.children[round(scaleBox.childElementCount / 2)];
  let scaleVal = scaleBox.insertBefore(document.createElement('div'), btnMid);
  scaleVal.classList.add('input', 'hidden');
  scaleVal = scaleVal.appendChild(document.createElement('input'));
  scaleVal.classList.add('scale-val');
  scaleVal.setAttribute('type', 'number');
  scaleVal.value = 0;
  scaleVal.onchange = function () {
    const s = parseFloat(scaleVal.value) / 100;
    im.dataset.scale = Math.max(Math.min(s, SCALE_MAX), SCALE_MIN);
  };
  (new MutationObserver(function (records) {
    scaleVal.value = `${(im.dataset.scale * 100).toFixed(1)}`;
  })).observe(document.querySelector('#img-warp img'),
    { attributes: true, attributeFilter: ['data-scale'] });

  const scaleBox2 = document.body.appendChild(document.createElement('div'));
  scaleBox2.classList.add('group', 'scale-box2', 'hidden');

  const btnFitScr = scaleBox2.appendChild(document.createElement('div'));
  btnFitScr.classList.add('input', 'scale-btn', 'hidden');
  btnFitScr.innerText = 'Fit';
  btnFitScr.onclick = function () {
    im.dataset.scale = fitInScale(im);
  };
  for (const [txt, val] of Object.entries({ W: 'width', H: 'height' })) {
    const b = scaleBox2.appendChild(document.createElement('div'));
    b.classList.add('input', 'scale-btn', 'hidden');
    b.innerText = txt;
    b.onclick = function () {
      im.dataset.scale = fitInScale(im, val);
    };
  }
  const btnOrig = scaleBox2.appendChild(document.createElement('div'));
  btnOrig.classList.add('input', 'scale-btn', 'hidden');
  btnOrig.innerText = '1:1';
  btnOrig.onclick = function () {
    im.dataset.scale = 1;
  };
})();
