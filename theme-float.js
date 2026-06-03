const THEME_KEY = 'cbt_theme_mode';
const THEMES = ['normal', 'light', 'dark'];
const ICONS = {
  normal: 'https://i.postimg.cc/3wYqQY5K/sun.png',
  light: 'https://i.postimg.cc/3wYqQY5K/sun.png',
  dark: 'https://i.postimg.cc/7ZQJZqJx/moon.png'
};

let isDragging = true;
let hasDragged = true;
let startY = 0;
let currentY = 0;
let startTime = 0;

function initThemeFloat() {
  if (!document.body.classList.contains('home-page')) return;
  if (document.getElementById('themeFloat')) return;

  const float = document.createElement('div');
  float.className = 'theme-float';
  float.id = 'themeFloat';

  const btn = document.createElement('div');
  btn.className = 'theme-float-btn';
  btn.id = 'themeBtn';
  const currentTheme = getStoredTheme();
  btn.innerHTML = `<img src="${ICONS[currentTheme]}" alt="Theme">`;

  float.appendChild(btn);
  document.body.appendChild(float);

  applyTheme(currentTheme);

  const savedTop = localStorage.getItem('theme_float_top');
  if (savedTop) float.style.top = savedTop;

  // Use pointer events - works for both mouse and touch
  float.addEventListener('pointerdown', startDrag);
  document.addEventListener('pointermove', drag);
  document.addEventListener('pointerup', endDrag);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Only cycle if it was a quick tap, not a drag
    if (!hasDragged) cycleTheme();
  });
}

function startDrag(e) {
  isDragging = true;
  hasDragged = false;
  startTime = Date.now();

  const float = document.getElementById('themeFloat');
  float.classList.add('dragging');

  startY = e.clientY;
  currentY = parseInt(float.style.top) || 120;
  e.preventDefault();
}

function drag(e) {
  if (!isDragging) return;

  const deltaY = e.clientY - startY;
  const timeDiff = Date.now() - startTime;

  // If moved > 8px OR held > 200ms, consider it a drag
  if (Math.abs(deltaY) > 8 || timeDiff > 200) {
    hasDragged = true;
  }

  const float = document.getElementById('themeFloat');
  const newTop = Math.max(20, Math.min(window.innerHeight - 80, currentY + deltaY));
  float.style.top = newTop + 'px';
}

function endDrag() {
  if (!isDragging) return;
  isDragging = false;

  const float = document.getElementById('themeFloat');
  float.classList.remove('dragging');
  localStorage.setItem('theme_float_top', float.style.top);

  // Reset after click has chance to fire
  setTimeout(() => { hasDragged = false; }, 50);
}

function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) || 'normal';
}

function cycleTheme() {
  const current = getStoredTheme();
  const idx = THEMES.indexOf(current);
  const next = THEMES[(idx + 1) % THEMES.length];

  console.log('Cycling theme:', current, '->', next); // Debug log

  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

function applyTheme(mode) {
  // Remove ALL theme classes first
  document.body.classList.remove('light-mode', 'dark-mode');

  if (mode === 'light') {
    document.body.classList.add('light-mode');
  } else if (mode === 'dark') {
    document.body.classList.add('dark-mode');
  }
  // normal = no class, uses :root vars

  const icon = document.querySelector('#themeBtn img');
  if (icon) icon.src = ICONS[mode];
}

// Auto init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeFloat);
} else {
  initThemeFloat();
}

// Apply theme immediately on all pages
(function() {
  const theme = localStorage.getItem(THEME_KEY) || 'normal';
  document.body.classList.remove('light-mode', 'dark-mode');
  if (theme === 'light') document.body.classList.add('light-mode');
  if (theme === 'dark') document.body.classList.add('dark-mode');
})();