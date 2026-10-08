const COPIED_LABEL = 'Copied';
const COPY_FAILED_LABEL = 'Press Cmd/Ctrl+C';
const COPIED_RESET_MS = 1500;
const CLIP_THEME = { LIGHT: 'light', DARK: 'dark' };
const CLIP_VISIBLE_RATIO = 0.4;
const COOKS = [
  { name: 'claude', tone: 'claude' },
  { name: 'codex', tone: 'codex' },
  { name: 'gemini', tone: 'gemini' },
  { name: 'deepseek', tone: 'deepseek' },
  { name: 'kimi', tone: 'kimi' },
  { name: 'Qwen3.5-27B-Claude-4.6-Opus-Reasoning-Distilled', tone: 'qwen' },
  { name: 'jev', tone: 'jev' },
];
const COOK_INTERVAL_MS = 1900;
const COOK_SWAP_MS = 240;
const COOK_SWAPPING_CLASS = 'is-swapping';
const COOK_WRAPPING_CLASS = 'is-wrapping';
const COOK_MEASURING_CLASS = 'is-measuring';
const darkScheme = window.matchMedia('(prefers-color-scheme: dark)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function selectContents(element) {
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

async function copyTarget(button) {
  const target = document.getElementById(button.dataset.copyTarget);
  if (!target) return;
  const label = button.textContent;
  try {
    await navigator.clipboard.writeText(target.textContent.trim());
    button.textContent = COPIED_LABEL;
  } catch {
    selectContents(target);
    button.textContent = COPY_FAILED_LABEL;
  }
  setTimeout(() => {
    button.textContent = label;
  }, COPIED_RESET_MS);
}

document.querySelectorAll('[data-copy-target]').forEach((button) => {
  button.addEventListener('click', () => copyTarget(button));
});

function clipTheme() {
  return darkScheme.matches ? CLIP_THEME.DARK : CLIP_THEME.LIGHT;
}

function applyClipTheme(video) {
  const theme = clipTheme();
  const { clip } = video.dataset;
  const source = `videos/${clip}-${theme}.mp4`;
  if (video.getAttribute('src') === source) return;
  const shouldResume = !video.paused;
  video.poster = `videos/${clip}-${theme}.jpg`;
  video.src = source;
  if (shouldResume) video.play().catch(() => undefined);
}

function playWhenVisible(entries) {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.play().catch(() => undefined);
    else entry.target.pause();
  });
}

const clipVideos = document.querySelectorAll('video[data-clip]');
clipVideos.forEach(applyClipTheme);
darkScheme.addEventListener('change', () => clipVideos.forEach(applyClipTheme));

if (reducedMotion.matches) {
  clipVideos.forEach((video) => {
    video.controls = true;
  });
} else {
  const observer = new IntersectionObserver(playWhenVisible, { threshold: CLIP_VISIBLE_RATIO });
  clipVideos.forEach((video) => observer.observe(video));
}

/** How wide the name slot has to be for a name: its natural width, or the whole line when the name is longer. */
function cookWidth(element, name) {
  const probe = element.cloneNode();
  probe.removeAttribute('data-cook');
  probe.className = element.className.replace(COOK_SWAPPING_CLASS, '').replace(COOK_WRAPPING_CLASS, '');
  probe.textContent = name;
  Object.assign(probe.style, { position: 'absolute', visibility: 'hidden', width: 'auto', whiteSpace: 'nowrap' });
  element.parentElement.append(probe);
  const naturalWidth = probe.getBoundingClientRect().width;
  probe.remove();
  return Math.min(naturalWidth, element.parentElement.clientWidth);
}

/** Sizes the slot for a name, so the words after it move once, smoothly, instead of jumping with every letter count. */
function fitCook(element, { name, tone }) {
  const width = cookWidth(element, name);
  element.style.width = `${width}px`;
  element.classList.toggle(COOK_WRAPPING_CLASS, width >= element.parentElement.clientWidth);
  element.textContent = name;
  element.dataset.tone = tone;
}

/** Holds the tagline at the height of its longest name, so the page does not jump while names rotate. */
function reserveCookHeight(element, current) {
  const tagline = element.parentElement;
  tagline.style.minHeight = '';
  element.classList.add(COOK_MEASURING_CLASS);
  const tallest = Math.max(
    ...COOKS.map((cook) => {
      fitCook(element, cook);
      return tagline.offsetHeight;
    }),
  );
  fitCook(element, current);
  tagline.style.minHeight = `${tallest}px`;
  void element.offsetWidth;
  element.classList.remove(COOK_MEASURING_CLASS);
}

function rotateCooks(element) {
  let index = 0;
  reserveCookHeight(element, COOKS[index]);
  window.addEventListener('resize', () => reserveCookHeight(element, COOKS[index]));
  setInterval(() => {
    index = (index + 1) % COOKS.length;
    element.classList.add(COOK_SWAPPING_CLASS);
    setTimeout(() => {
      fitCook(element, COOKS[index]);
      setTimeout(() => element.classList.remove(COOK_SWAPPING_CLASS), COOK_SWAP_MS);
    }, COOK_SWAP_MS);
  }, COOK_INTERVAL_MS);
}

const cook = document.querySelector('[data-cook]');
if (cook) rotateCooks(cook);
