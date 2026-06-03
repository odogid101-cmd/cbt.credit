import { showToast } from './toast.js';

const subjects = {
  JAMB: ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government', 'Literature', 'Geography', 'Agriculture'],
  WAEC: ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government', 'Literature', 'Geography', 'Agriculture'],
  NECO: ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government', 'Literature', 'Geography', 'Agriculture'],
  'POST-UTME': ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government', 'Literature']
};

let currentExam = '';
let currentLimit = 0;
let selectedSubjects = [];
let challengeType = '';

const examPrefixes = {
  'WAEC': 'waec',
  'JAMB': 'jamb',
  'POST-UTME': 'postutme',
  'NECO': 'neco'
};

const questionCache = {};

const examCards = document.querySelectorAll('.exam-card');
const subjectModal = document.getElementById('subjectModal');
const challengeModal = document.getElementById('challengeModal');
const instructionModal = document.getElementById('instructionModal');

const subjectList = document.getElementById('subjectList');
const subjectCounter = document.getElementById('subjectCounter');
const subjectError = document.getElementById('subjectError');
const modalExamType = document.getElementById('modalExamType');
const subjectModalTitle = document.getElementById('subjectModalTitle');

const instructionTitle = document.getElementById('instructionTitle');
const instructionContent = document.getElementById('instructionContent');

// Open exam cards
examCards.forEach(card => {
  card.addEventListener('click', () => {
    const exam = card.dataset.exam;
    const limit = parseInt(card.dataset.limit);

    if (exam === 'CHALLENGE') {
      challengeModal.classList.add('active');
      return;
    }

    openSubjectModal(exam, limit);
  });
});

function openSubjectModal(exam, limit) {
  currentExam = exam;
  currentLimit = limit;
  selectedSubjects = [];

  subjectModal.classList.add('active');
  subjectModalTitle.textContent = `Select ${limit} Subject${limit > 1? 's' : ''}`;
  modalExamType.textContent = exam + ' CBT';
  updateCounter();
  renderSubjects();
}

function renderSubjects() {
  const list = subjects[currentExam] || [];
  subjectList.innerHTML = '';

  list.forEach((sub, idx) => {
    const isEnglish = sub === 'English' && currentExam === 'JAMB';
    const row = document.createElement('div');
    row.className = `subject-item-row ${isEnglish? 'locked' : ''}`;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `sub-${idx}`;
    checkbox.value = sub;
    checkbox.checked = isEnglish;
    checkbox.disabled = isEnglish;

    if (isEnglish &&!selectedSubjects.includes(sub)) selectedSubjects.push(sub);

    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        if (selectedSubjects.length >= currentLimit) {
          e.target.checked = false;
          subjectError.textContent = `You can only select ${currentLimit} subjects`;
          setTimeout(() => subjectError.textContent = '', 2000);
          return;
        }
        selectedSubjects.push(sub);
      } else {
        selectedSubjects = selectedSubjects.filter(s => s!== sub);
      }
      updateCounter();
    });

    const label = document.createElement('label');
    label.htmlFor = `sub-${idx}`;
    label.textContent = sub;

    row.appendChild(checkbox);
    row.appendChild(label);
    subjectList.appendChild(row);
  });
}

function updateCounter() {
  subjectCounter.textContent = `${selectedSubjects.length}/${currentLimit}`;
}

// Subject modal buttons
document.getElementById('subjectCloseBtn').onclick = () => {
  subjectModal.classList.remove('active');
};

document.getElementById('subjectProceedBtn').onclick = () => {
  if (selectedSubjects.length!== currentLimit) {
    subjectError.textContent = `Please select exactly ${currentLimit} subject${currentLimit > 1? 's' : ''}`;
    setTimeout(() => subjectError.textContent = '', 2000);
    return;
  }
  subjectModal.classList.remove('active');
  showInstructions();
};

// Challenge modal
document.getElementById('challengeCloseBtn').onclick = () => {
  challengeModal.classList.remove('active');
};

document.querySelectorAll('#challengeModal.picker-item').forEach(item => {
  item.addEventListener('click', function() {
    document.querySelectorAll('#challengeModal.picker-item').forEach(i => i.classList.remove('selected'));
    this.classList.add('selected');
    challengeType = this.dataset.type;
  });
});

document.getElementById('challengeProceedBtn').onclick = () => {
  if (!challengeType) {
    showToast('Please select a challenge type', 'error');
    return;
  }
  challengeModal.classList.remove('active');
  const limit = challengeType === 'JAMB'? 4 : 1;
  openSubjectModal(challengeType, limit);
};

// Instructions
function showInstructions() {
  instructionModal.classList.add('active');
  instructionTitle.textContent = currentExam + ' CBT Instructions';

  const totalQuestions = currentLimit === 1? 50 : 180;
  const duration = currentLimit === 1? '1 hour' : '2 hours';

  let html = `
    <p><strong>Selected Subjects:</strong> ${selectedSubjects.join(', ')}</p>
    <ul>
      <li>Total Questions: ${totalQuestions} questions</li>
      <li>Duration: ${duration}</li>
    </ul>
  `;

  instructionContent.innerHTML = html;
}

document.getElementById('instructionCloseBtn').onclick = () => {
  instructionModal.classList.remove('active');
};

document.getElementById('instructionStartBtn').onclick = () => {
  instructionModal.classList.remove('active');
  startExam();
};

// Load questions from files - same as practice.js
async function loadQuestions(subject, examMode) {
  const cacheKey = `${examMode}_${subject}`;
  if (questionCache[cacheKey]) return questionCache[cacheKey];

  const prefix = examPrefixes[examMode];
  const subjectKey = subject.toLowerCase().replace(/\s/g, '');

  const fileName = `./${prefix}${subjectKey}.js`;
  const exportName = `${prefix}${subjectKey}`;

  try {
    const module = await import(fileName);
    questionCache[cacheKey] = module[exportName] || [];
    return questionCache[cacheKey];
  } catch (err) {
    console.error(`Failed to load ${fileName}:`, err);
    showToast(`Failed to load ${examMode} ${subject} questions`, 'error');
    return [];
  }
}

function pickRandom(arr, n) {
  return [...arr].sort(() => 0.5 - Math.random()).slice(0, n);
}

function pickTopics(questions) {
  const topics = [...new Set(questions.map(q => q.topic))];
  const byTopicDiff = { "___": [], "__": [], "*": [] };

  topics.forEach(topic => {
    const q = questions.find(x => x.topic === topic);
    if (q && byTopicDiff[q.topicDiff]) byTopicDiff[q.topicDiff].push(topic);
  });

  return [
   ...pickRandom(byTopicDiff["___"], Math.min(2, byTopicDiff["___"].length)),
   ...pickRandom(byTopicDiff["__"], Math.min(3, byTopicDiff["__"].length)),
   ...pickRandom(byTopicDiff["*"], Math.min(2, byTopicDiff["*"].length))
  ];
}

function pickQuestionsByDifficulty(questions, totalNeeded) {
  const byDiff = {
    "***": questions.filter(q => q.qDiff === "***"), // hardest
    "**": questions.filter(q => q.qDiff === "**"), // harder
    "*": questions.filter(q => q.qDiff === "*") // hard
  };

  let n3 = Math.round(totalNeeded * 0.5); // 50% hardest
  let n2 = Math.round(totalNeeded * 0.3); // 30% harder
  let n1 = totalNeeded - n3 - n2; // 20% hard

  let selected = [
   ...pickRandom(byDiff["***"], Math.min(n3, byDiff["***"].length)),
   ...pickRandom(byDiff["**"], Math.min(n2, byDiff["**"].length)),
   ...pickRandom(byDiff["*"], Math.min(n1, byDiff["*"].length))
  ];

  if (selected.length < totalNeeded) {
    const remaining = questions.filter(q =>!selected.includes(q));
    selected = [...selected,...pickRandom(remaining, totalNeeded - selected.length)];
  }

  return selected.sort(() => 0.5 - Math.random());
}

// Start exam - matches exam.js format
async function startExam() {
  showToast('Loading questions...', 'success');

  let allSelectedQuestions = [];
  const questionsPerSubject = currentLimit === 1? 50 : 45; // 45*4=180 for JAMB

  for (const subject of selectedSubjects) {
    const allQuestions = await loadQuestions(subject, currentExam);
    if (allQuestions.length === 0) continue;

    const pickedTopics = pickTopics(allQuestions);
    const topicQuestions = allQuestions.filter(q => pickedTopics.includes(q.topic));
    const picked = pickQuestionsByDifficulty(topicQuestions, questionsPerSubject);

    const tagged = picked.map(q => ({...q, subject: subject }));
    allSelectedQuestions = [...allSelectedQuestions,...tagged];
  }

  if (allSelectedQuestions.length === 0) {
    showToast('No questions available for selected subjects', 'error');
    return;
  }

  allSelectedQuestions = allSelectedQuestions.map((q, i) => ({
   ...q,
    id: q.id!== undefined? q.id : i
  }));

  const examData = {
    exam: currentExam,
    subjects: selectedSubjects,
    questions: allSelectedQuestions,
    totalQuestions: allSelectedQuestions.length,
    timeInSeconds: currentLimit === 1? 3600 : 7200,
    mode: 'EXAM'
  };

  localStorage.setItem('examData', JSON.stringify(examData));
  showToast('Starting exam...', 'success');

  setTimeout(() => {
    window.location.href = 'exam.html';
  }, 800);
}

// Close modals on overlay click
[subjectModal, challengeModal, instructionModal].forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });
});