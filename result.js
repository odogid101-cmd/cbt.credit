import { showToast } from './toast.js';

const resultData = JSON.parse(localStorage.getItem('resultData'));

if (!resultData) {
  alert('No result data found');
  window.location.href = 'home.html';
  throw new Error('No result data');
}

const { answers, examData, questions, timeLeft: savedTimeLeft } = resultData;
const { exam, subjects, mode, timeInSeconds } = examData;

let correct = 0;
let wrong = 0;
let unanswered = 0;
let timeSpent = 0;
let subjectStats = {};
let currentSubject = subjects[0];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  calculateScore();
  renderScore();
  renderSubjectTabs();
  renderQuestions();
  setupFilters();
  setupButtons();

  setTimeout(() => {
    localStorage.removeItem('resultData');
    localStorage.removeItem('examData');
    console.log('All exam data cleared');
  }, 1000);
});

function calculateScore() {
  correct = 0;
  wrong = 0;
  unanswered = 0;
  subjectStats = {};

  questions.forEach((q, idx) => {
    const qid = String(idx);
    const userAns = answers[qid];
    const correctAns = Number(q.answer);
    const subject = q.subject;

    if (!subjectStats[subject]) {
      subjectStats[subject] = { correct: 0, wrong: 0, unanswered: 0, total: 0 };
    }
    subjectStats[subject].total++;

    if (userAns === undefined || userAns === null || userAns === '') {
      unanswered++;
      subjectStats[subject].unanswered++;
    } else if (Number(userAns) === correctAns) {
      correct++;
      subjectStats[subject].correct++;
    } else {
      wrong++;
      subjectStats[subject].wrong++;
    }
  });

  const totalTime = timeInSeconds || 0;
  const timeLeft = savedTimeLeft || 0;
  timeSpent = Math.max(0, totalTime - timeLeft);
}

function renderScore() {
  const total = questions.length;
  const percent = total > 0? Math.round((correct / total) * 100) : 0;

  const modeText = mode === 'PRACTICE'? 'Practice' : 'CBT';
  document.getElementById('resultTitle').textContent =
    `${exam} - ${subjects.join(', ')} ${modeText}`;

  const circle = document.getElementById('scoreProgress');
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (circumference * percent) / 100;

  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = circumference;

  setTimeout(() => {
    circle.style.strokeDashoffset = offset;
  }, 100);

  let scoreColor;
  if (percent < 40) {
    scoreColor = '#ef4444';
  } else if (percent < 70) {
    scoreColor = '#f59e0b';
  } else {
    scoreColor = '#10b981';
  }
  circle.style.stroke = scoreColor;

  document.getElementById('scorePercent').textContent = `${percent}%`;
  document.getElementById('scorePercent').style.color = scoreColor;

  document.getElementById('correctCount').textContent = correct;
  document.getElementById('wrongCount').textContent = wrong;
  document.getElementById('unansweredCount').textContent = unanswered;
  document.getElementById('totalQuestions').textContent = total;

  const h = Math.floor(timeSpent / 3600);
  const m = Math.floor((timeSpent % 3600) / 60);
  const s = timeSpent % 60;
  document.getElementById('timeSpent').textContent =
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function renderSubjectTabs() {
  const tabsDiv = document.getElementById('subjectTabs');
  tabsDiv.innerHTML = '';

  subjects.forEach(subject => {
    const stats = subjectStats[subject];
    const percent = stats.total > 0? Math.round((stats.correct / stats.total) * 100) : 0;

    const tab = document.createElement('button');
    tab.className = 'subject-tab';
    if (subject === currentSubject) tab.classList.add('active');
    tab.innerHTML = `
      ${subject}
      <span class="subject-score-badge">${stats.correct}/${stats.total}</span>
    `;
    tab.onclick = () => {
      currentSubject = subject;
      document.querySelectorAll('.subject-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderQuestions();
    };
    tabsDiv.appendChild(tab);
  });
}

function setupFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderQuestions();
    };
  });
}

function renderQuestions() {
  const list = document.getElementById('reviewList');
  list.innerHTML = '';

  questions.forEach((q, idx) => {
    if (q.subject!== currentSubject) return;

    const qid = String(idx);
    const userAns = answers[qid];
    const correctAns = Number(q.answer);
    const isAnswered = userAns!== undefined && userAns!== null && userAns!== '';
    const isCorrect = isAnswered && Number(userAns) === correctAns;

    if (currentFilter === 'correct' &&!isCorrect) return;
    if (currentFilter === 'wrong' && (isCorrect ||!isAnswered)) return;
    if (currentFilter === 'unanswered' && isAnswered) return;

    const status =!isAnswered? 'unanswered' : isCorrect? 'correct' : 'wrong';
    const statusText =!isAnswered? 'Unanswered' : isCorrect? 'Correct' : 'Wrong';

    const item = document.createElement('div');
    item.className = `review-item ${status}`;
    item.innerHTML = `
      <div class="review-header">
        <div class="review-qnum">Question ${idx + 1}</div>
        <div class="review-status ${status}">${statusText}</div>
      </div>
      ${q.image? `<div class="review-image"><img src="${q.image}" alt="Question"></div>` : ''}
      <div class="review-question">${q.question}</div>
      <div class="review-options">
        ${q.options.map((opt, i) => `
          <div class="review-option ${i === correctAns? 'correct' : ''} ${Number(userAns) === i && i!== correctAns? 'selected' : ''}">
            <div class="option-badge">${String.fromCharCode(65 + i)}</div>
            <div>${opt}</div>
          </div>
        `).join('')}
      </div>
      ${q.explanation? `<div class="review-explanation"><strong>Explanation:</strong> ${q.explanation}</div>` : ''}
    `;
    list.appendChild(item);
  });
}

function setupButtons() {
  document.getElementById('homeBtn').onclick = () => {
    localStorage.removeItem('resultData');
    localStorage.removeItem('examData');
    window.location.href = 'home.html';
  };

  document.getElementById('retryBtn').onclick = () => {
    localStorage.removeItem('resultData');
    localStorage.removeItem('examData');
    const page = mode === 'PRACTICE'? 'cbt-pract.html' : 'cbt-exam.html';
    window.location.href = page;
  };
}