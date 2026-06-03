import { showToast } from './toast.js';

let examData = null;
let questions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let timerInterval = null;
let timeLeft = 0;
let subjectRanges = {};
let isMultiSubject = false;
let isSubmitting = false;
let tabSwitchCount = 0;
let windowBlurCount = 0;
let devToolsOpen = false;
let rightClickCount = 0;
let copyAttempts = 0;

const MAX_TAB_SWITCHES = 2;
const MAX_WINDOW_BLURS = 2;
const MAX_RIGHT_CLICKS = 3;
const MAX_COPY_ATTEMPTS = 2;

const CALCULATOR_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Economics', 'Accounting'];

document.addEventListener('DOMContentLoaded', () => {
  localStorage.removeItem('resultData');
  userAnswers = {};

  examData = JSON.parse(localStorage.getItem('examData'));
  if (!examData ||!examData.questions) {
    showToast('No exam data found. Redirecting...', 'error');
    setTimeout(() => window.location.href = 'cbt-exam.html', 1500);
    return;
  }

  document.getElementById('examTitle').textContent = examData.exam;
  questions = examData.questions;
  timeLeft = examData.timeInSeconds;

  buildSubjectRanges();
  isMultiSubject = Object.keys(subjectRanges).length > 1;

  if (questions.length === 0) {
    showToast('No questions found. Redirecting...', 'error');
    setTimeout(() => window.location.href = 'cbt-exam.html', 1500);
    return;
  }

  startTimer();
  setupEventListeners();
  buildSubjectTabs();
  buildQuestionNav();
  showQuestion(0);
  setupFooterDrag();
  setupCalculator();
  setupStrongAntiCheat();
});

function buildSubjectRanges() {
  subjectRanges = {};
  let currentSubject = null;
  let startIndex = 0;

  questions.forEach((q, idx) => {
    if (q.subject!== currentSubject) {
      if (currentSubject) {
        subjectRanges[currentSubject].count = idx - startIndex;
      }
      currentSubject = q.subject;
      startIndex = idx;
      subjectRanges[currentSubject] = { start: idx, count: 0 };
    }
  });
  if (currentSubject) {
    subjectRanges[currentSubject].count = questions.length - startIndex;
  }
}

function setupEventListeners() {
  document.getElementById('prevBtn').onclick = prevQuestion;
  document.getElementById('nextBtn').onclick = nextQuestion;
  document.getElementById('submitBtn').onclick = showSubmitModal;
  document.getElementById('submitNo').onclick = () =>
    document.getElementById('submitModal').classList.remove('active');
  document.getElementById('submitYes').onclick = () => submitExam(false);
}

function buildSubjectTabs() {
  const tabsDiv = document.getElementById('subjectTabs');
  if (!isMultiSubject) {
    tabsDiv.style.display = 'none';
    return;
  }
  tabsDiv.style.display = 'flex';
  tabsDiv.innerHTML = '';

  Object.entries(subjectRanges).forEach(([subject, range]) => {
    const tab = document.createElement('button');
    tab.className = 'subject-tab';

    const answeredCount = getAnsweredCountForSubject(subject);
    const isComplete = answeredCount === range.count && range.count > 0;

    tab.innerHTML = `
      ${subject}
      ${isComplete? '<div class="subject-check"></div>' : ''}
    `;
    tab.onclick = () => showQuestion(range.start);
    tabsDiv.appendChild(tab);
  });
}

function getAnsweredCountForSubject(subject) {
  const range = subjectRanges[subject];
  let count = 0;
  for (let i = range.start; i < range.start + range.count; i++) {
    if (userAnswers[String(i)]!== undefined) count++;
  }
  return count;
}

function buildQuestionNav() {
  updateQuestionNavForSubject(questions[currentQuestionIndex].subject);
}

function updateQuestionNavForSubject(subject) {
  const nav = document.getElementById('questionNav');
  const range = subjectRanges[subject];
  nav.innerHTML = '';

  for (let i = 0; i < range.count; i++) {
    const globalIdx = range.start + i;
    const btn = document.createElement('button');
    btn.className = 'q-nav-btn';
    btn.textContent = i + 1;
    btn.onclick = () => {
      showQuestion(globalIdx);
      document.getElementById('questionFooter').classList.remove('expanded');
    };

    if (userAnswers[String(globalIdx)]!== undefined) btn.classList.add('answered');
    if (globalIdx === currentQuestionIndex) btn.classList.add('current');

    nav.appendChild(btn);
  }
}

function showQuestion(index) {
  if (!questions[index]) return;
  currentQuestionIndex = index;
  const q = questions[index];
  const range = subjectRanges[q.subject];
  const qInSubject = index - range.start + 1;

  document.getElementById('questionCounter').textContent =
    `Question ${qInSubject} of ${range.count}`;
  document.getElementById('questionSubject').textContent = q.subject;
  document.getElementById('questionText').textContent = q.question;

  const imgDiv = document.getElementById('questionImage');
  if (q.image) {
    imgDiv.style.display = 'block';
    imgDiv.querySelector('img').src = q.image;
  } else {
    imgDiv.style.display = 'none';
  }

  const needsCalc = CALCULATOR_SUBJECTS.includes(q.subject);
  document.getElementById('calcBtn').style.display = needsCalc? 'flex' : 'none';

  const optionsDiv = document.getElementById('optionsContainer');
  optionsDiv.innerHTML = '';
  const letters = ['A', 'B', 'C', 'D'];
  q.options.forEach((opt, idx) => {
    const qid = String(index); // Use index as key
    const optDiv = document.createElement('div');
    optDiv.className = 'option';
    if (userAnswers[qid] === idx) optDiv.classList.add('selected');
    optDiv.innerHTML = `
      <div class="option-letter">${letters[idx]}</div>
      <div class="option-circle"></div>
      <label>${opt}</label>
    `;
    optDiv.onclick = () => selectAnswer(qid, idx);
    optionsDiv.appendChild(optDiv);
  });

  if (isMultiSubject) {
    document.querySelectorAll('.subject-tab').forEach((tab, i) => {
      tab.classList.remove('active');
      const subject = Object.keys(subjectRanges)[i];
      const r = subjectRanges[subject];
      if (index >= r.start && index < r.start + r.count) {
        tab.classList.add('active');
      }
    });
  }

  updateQuestionNavForSubject(q.subject);

  const isLastOverall = index === questions.length - 1;
  document.getElementById('nextBtn').textContent = isLastOverall? 'Submit' : 'Next';
  document.getElementById('nextBtn').onclick = isLastOverall? showSubmitModal : nextQuestion;
}

function selectAnswer(qid, answerIdx) {
  userAnswers[qid] = parseInt(answerIdx);
  buildSubjectTabs();
  showQuestion(currentQuestionIndex);
}

function prevQuestion() {
  if (currentQuestionIndex > 0) showQuestion(currentQuestionIndex - 1);
}

function nextQuestion() {
  if (currentQuestionIndex < questions.length - 1) {
    showQuestion(currentQuestionIndex + 1);
  }
}

function startTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      submitExam(true);
    }
  }, 1000);
}

function updateTimerDisplay() {
  const hrs = Math.floor(timeLeft / 3600);
  const mins = Math.floor((timeLeft % 3600) / 60);
  const secs = timeLeft % 60;
  document.getElementById('timer').textContent =
    `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function showSubmitModal() {
  document.getElementById('submitModal').classList.add('active');
}

function submitExam(autoSubmitted = false, reason = '') {
  if (isSubmitting) return;
  isSubmitting = true;
  clearInterval(timerInterval);

  let score = 0;
  questions.forEach((q, idx) => {
    if (userAnswers[String(idx)] === Number(q.answer)) score++;
  });

  const resultData = {
    answers: userAnswers,
    examData: examData,
    questions: questions,
    timeLeft: timeLeft,
    score: score,
    total: questions.length,
    autoSubmitted: autoSubmitted,
    cheatingDetected: autoSubmitted && reason? true : false,
    reason: reason,
    timestamp: Date.now()
  };

  localStorage.setItem('resultData', JSON.stringify(resultData));
  localStorage.removeItem('examData');
  window.location.replace('result.html');
}

function setupFooterDrag() {
  const footer = document.getElementById('questionFooter');
  const handle = document.getElementById('footerHandle');
  handle.addEventListener('click', () => {
    footer.classList.toggle('expanded');
  });
}

function setupCalculator() {
  const calcBtn = document.getElementById('calcBtn');
  const calcModal = document.getElementById('calcModal');
  const calcCloseBtn = document.getElementById('calcCloseBtn');
  const calcDisplay = document.getElementById('calcDisplay');

  calcBtn.onclick = () => calcModal.classList.add('active');
  calcCloseBtn.onclick = () => calcModal.classList.remove('active');

  let calcValue = '';
  document.querySelectorAll('.calc-btn-sm').forEach(btn => {
    btn.onclick = () => {
      const val = btn.dataset.val;
      if (val === 'C') {
        calcValue = '';
      } else if (val === '=') {
        try {
          if (/^[\d+\-*/().\s]+$/.test(calcValue)) {
            calcValue = Function('"use strict";return (' + calcValue + ')')().toString();
          } else {
            calcValue = 'Error';
          }
        } catch {
          calcValue = 'Error';
        }
      } else {
        calcValue += val;
      }
      calcDisplay.textContent = calcValue || '0';
    };
  });
}

function setupStrongAntiCheat() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden &&!isSubmitting) {
      tabSwitchCount++;
      const remaining = MAX_TAB_SWITCHES - tabSwitchCount;
      const message = remaining > 0
    ? `⚠Tab switch detected (${tabSwitchCount}/${MAX_TAB_SWITCHES}). ${remaining} more allowed.`
        : `Maximum tab switches exceeded. Submitting exam...`;
      showToast(message, 'error');

      if (tabSwitchCount >= MAX_TAB_SWITCHES) {
        setTimeout(() => submitExam(true, 'Tab switching limit exceeded'), 1500);
      }
    } else if (!document.hidden &&!isSubmitting && tabSwitchCount > 0) {
      showToast('✓ Welcome back to exam', 'success');
    }
  });

  window.addEventListener('blur', () => {
    if (!isSubmitting) {
      windowBlurCount++;
      const remaining = MAX_WINDOW_BLURS - windowBlurCount;
      const message = remaining > 0
    ? `⚠Window switch detected (${windowBlurCount}/${MAX_WINDOW_BLURS}). ${remaining} more allowed.`
        : `Maximum window switches exceeded. Submitting exam...`;
      showToast(message, 'error');

      if (windowBlurCount >= MAX_WINDOW_BLURS) {
        setTimeout(() => submitExam(true, 'Window switching limit exceeded'), 1500);
      }
    }
  });

  window.addEventListener('focus', () => {
    if (!isSubmitting && (tabSwitchCount > 0 || windowBlurCount > 0)) {
      showToast('✓ Focus returned to exam', 'success');
    }
  });

  window.addEventListener('pagehide', () => {
    if (!isSubmitting) {
      const { score, total } = calculateScore();
      const payload = JSON.stringify({
        answers: userAnswers,
        examData: examData,
        questions: questions,
        timeLeft: timeLeft,
        score: score,
        total: total,
        autoSubmitted: true,
        cheatingDetected: true,
        reason: 'Page unload/tab closed',
        timestamp: Date.now()
      });
      localStorage.setItem('resultData', payload);
      localStorage.removeItem('examData');
    }
  });

  document.addEventListener('contextmenu', e => {
    e.preventDefault();
    rightClickCount++;
    if (rightClickCount >= MAX_RIGHT_CLICKS) {
      showToast('Right-click abuse detected. Submitting exam...', 'error');
      setTimeout(() => submitExam(true, 'Excessive right-click attempts'), 1000);
    } else {
      showToast(`Right-click disabled (${rightClickCount}/${MAX_RIGHT_CLICKS})`, 'error');
    }
    return false;
  });

  document.addEventListener('keydown', e => {
    const blocked =
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) ||
      (e.ctrlKey && ['u', 'U', 's', 'S', 'p', 'P'].includes(e.key)) ||
      (e.altKey && e.key === 'Tab') ||
      e.key === 'PrintScreen';

    if (blocked) {
      e.preventDefault();
      showToast('This action is disabled during exam', 'error');
      return false;
    }
  });

  document.body.style.userSelect = 'none';
  document.body.style.webkitUserSelect = 'none';
  document.body.style.mozUserSelect = 'none';
  document.body.style.msUserSelect = 'none';

  ['copy', 'cut', 'paste'].forEach(evt => {
    document.addEventListener(evt, e => {
      e.preventDefault();
      copyAttempts++;
      if (copyAttempts >= MAX_COPY_ATTEMPTS) {
        showToast('Copy/paste abuse detected. Submitting exam...', 'error');
        setTimeout(() => submitExam(true, 'Copy/paste attempts'), 1000);
      } else {
        showToast(`${evt.charAt(0).toUpperCase() + evt.slice(1)} disabled (${copyAttempts}/${MAX_COPY_ATTEMPTS})`, 'error');
      }
      return false;
    });
  });

  document.addEventListener('dragstart', e => {
    e.preventDefault();
    return false;
  });

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement &&!isSubmitting) {
      showToast('⚠Fullscreen exit detected', 'warning');
    }
  });

  document.addEventListener('mousedown', (e) => {
    if (e.button === 1) {
      e.preventDefault();
      showToast('Opening new tabs is not allowed', 'error');
      return false;
    }
  });

  setInterval(() => {
    const threshold = 160;
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;

    if ((widthThreshold || heightThreshold) &&!devToolsOpen) {
      devToolsOpen = true;
      showToast('Developer tools detected. Submitting exam...', 'error');
      setTimeout(() => submitExam(true, 'Developer tools opened'), 1500);
    }
  }, 500);

  let element = new Image();
  Object.defineProperty(element, 'id', {
    get: function() {
      if (!isSubmitting &&!devToolsOpen) {
        devToolsOpen = true;
        showToast('Console access detected. Submitting exam...', 'error');
        setTimeout(() => submitExam(true, 'Console opened'), 1000);
      }
    }
  });
  console.log(element);

  history.pushState(null, null, location.href);
  window.addEventListener('popstate', () => {
    history.pushState(null, null, location.href);
    showToast('Back navigation disabled during exam', 'error');
  });
}

function calculateScore() {
  let score = 0;
  questions.forEach((q, idx) => {
    if (userAnswers[String(idx)] === Number(q.answer)) score++;
  });
  return { score, total: questions.length };
}