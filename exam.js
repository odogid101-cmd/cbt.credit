let examData = null;
let questions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let timerInterval = null;
let timeLeft = 0;
let subjectRanges = {};
let isMultiSubject = false;

document.addEventListener('DOMContentLoaded', () => {
  examData = JSON.parse(localStorage.getItem('examData'));
  if (!examData ||!examData.questions) {
    alert('No exam data found. Redirecting...');
    window.location.href = 'cbt-exam.html';
    return;
  }

  document.getElementById('examTitle').textContent = `${examData.exam} Exam`;

  questions = examData.questions;
  buildSubjectRanges();

  isMultiSubject = Object.keys(subjectRanges).length > 1;

  if (questions.length === 0) {
    alert('No questions found. Redirecting...');
    window.location.href = 'cbt-exam.html';
    return;
  }

  timeLeft = examData.timeInSeconds;
  startTimer();
  setupEventListeners();
  buildSubjectTabs();
  buildQuestionNav();
  showQuestion(0);
});

// 1. Use q.subject instead of q.topic
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
  document.getElementById('submitYes').onclick = submitExam;
}

function buildSubjectTabs() {
  const tabsDiv = document.getElementById('subjectTabs');

  if (!isMultiSubject) {
    tabsDiv.style.display = 'none';
    return;
  }

  tabsDiv.style.display = 'flex';
  tabsDiv.innerHTML = '';

  // 2. Use subject instead of topic for tabs
  Object.entries(subjectRanges).forEach(([subject, range]) => {
    const tab = document.createElement('button');
    tab.className = 'subject-tab';
    tab.innerHTML = `${subject} <span class="count">[${range.count}]</span>`;
    tab.onclick = () => showQuestion(range.start);
    tabsDiv.appendChild(tab);
  });
}

function buildQuestionNav() {
  const nav = document.getElementById('questionNav');
  nav.innerHTML = '';
  questions.forEach((q, idx) => {
    const btn = document.createElement('button');
    btn.className = 'q-nav-btn';
    btn.textContent = idx + 1;
    btn.onclick = () => showQuestion(idx);
    nav.appendChild(btn);
  });
}

function showQuestion(index) {
  if (!questions[index]) return;
  currentQuestionIndex = index;
  const q = questions[index];

  document.getElementById('questionCounter').textContent =
    `Question ${index + 1} of ${questions.length}`;

  // 3. Show subject, not topic
  document.getElementById('questionSubject').textContent = q.subject;

  document.getElementById('questionText').textContent = q.question;

  const optionsDiv = document.getElementById('optionsContainer');
  optionsDiv.innerHTML = '';
  q.options.forEach((opt, idx) => {
    const qid = String(q.id);
    const optDiv = document.createElement('div');
    optDiv.className = 'option';
    if (userAnswers[qid] === idx) optDiv.classList.add('selected');
    optDiv.innerHTML = `
      <input type="radio" name="option" ${userAnswers[qid] === idx? 'checked' : ''}>
      <label>${opt}</label>
    `;
    optDiv.onclick = () => selectAnswer(qid, idx);
    optionsDiv.appendChild(optDiv);
  });

  if (isMultiSubject) {
    document.querySelectorAll('.subject-tab').forEach((tab, i) => {
      tab.classList.remove('active');
      const subject = Object.keys(subjectRanges)[i];
      const range = subjectRanges[subject];
      if (index >= range.start && index < range.start + range.count) {
        tab.classList.add('active');
      }
    });
  }

  document.querySelectorAll('.q-nav-btn').forEach((btn, i) => {
    btn.classList.remove('current', 'answered');
    if (userAnswers[String(questions[i].id)]!== undefined) btn.classList.add('answered');
    if (i === index) btn.classList.add('current');
  });
}

function selectAnswer(qid, answerIdx) {
  userAnswers[String(qid)] = parseInt(answerIdx);
  showQuestion(currentQuestionIndex);
}

function prevQuestion() {
  if (currentQuestionIndex > 0) showQuestion(currentQuestionIndex - 1);
}

function nextQuestion() {
  if (currentQuestionIndex < questions.length - 1) showQuestion(currentQuestionIndex + 1);
}

function startTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      submitExam();
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

function submitExam() {
  clearInterval(timerInterval);
  let score = 0;
  questions.forEach(q => {
    const qid = String(q.id);
    if (userAnswers[qid] === Number(q.answer)) score++;
  });

  localStorage.setItem('resultData', JSON.stringify({
    answers: userAnswers,
    examData: examData,
    questions: questions,
    timeLeft: timeLeft
  }));

  localStorage.removeItem('examData');
  window.location.href = 'result.html';
}