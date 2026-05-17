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

document.addEventListener('DOMContentLoaded', () => {
  calculateScore();
  renderScore();
  renderReview();
  setupFilters();
  setupButtons();
});

function calculateScore() {
  correct = 0;
  wrong = 0;
  unanswered = 0;

  questions.forEach((q, idx) => {
    const qid = String(q.id!== undefined && q.id!== null? q.id : idx);
    const userAns = answers[qid];
    const correctAns = Number(q.answer);

    if (userAns === undefined || userAns === null || userAns === '') {
      unanswered++;
    } else if (Number(userAns) === correctAns) {
      correct++;
    } else {
      wrong++;
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

function renderReview(filter = 'all') {
  const list = document.getElementById('reviewList');
  list.innerHTML = '';

  questions.forEach((q, idx) => {
    const qid = String(q.id!== undefined && q.id!== null? q.id : idx);
    const userAns = answers[qid];
    const correctAns = Number(q.answer);
    const isAnswered = userAns!== undefined && userAns!== null && userAns!== '';
    const isCorrect = isAnswered && Number(userAns) === correctAns;

    if (filter === 'correct' &&!isCorrect) return;
    if (filter === 'wrong' && (isCorrect ||!isAnswered)) return;
    if (filter === 'unanswered' && isAnswered) return;

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

function setupFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderReview(btn.dataset.filter);
    };
  });
}

function setupButtons() {
  document.getElementById('homeBtn').onclick = () => {
    localStorage.removeItem('resultData');
    window.location.href = 'home.html';
  };

  document.getElementById('retryBtn').onclick = () => {
    localStorage.removeItem('resultData');
    const page = mode === 'PRACTICE'? 'pract.html' : 'exam.html';
    window.location.href = page;
  };
}