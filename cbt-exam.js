const subjects = [
  'English',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Economics',
  'Government',
  'Literature',
  'Geography',
  'Commerce',
  'Accounting',
  'Agricultural Science'
];

let currentExam = null;
let currentLimit = 0;
let selectedSubjects = [];
let challengeType = null;
let challengeTypeSelected = null;
let questionCache = {};

const examPrefixes = {
  'WAEC': 'Waec',
  'JAMB': 'Jamb',
  'POST-UTME': 'PostUtme',
  'NECO': 'Neco',
  'CHALLENGE': 'Jamb'
};

const instructions = {
  JAMB: `
    <strong>JAMB UTME Instructions</strong>
    <ul>
      <li>Total Questions: 180 Questions - 45 per subject</li>
      <li>Time Duration: 2 Hours</li>
      <li>Marking: +1 for correct, 0 for wrong</li>
      <li>No negative marking</li>
      <li>Calculator not allowed</li>
      <li>Do not refresh page during exam</li>
    </ul>
    <strong>Be Conscious:</strong> Manage your time. 40 seconds per question recommended.
  `,
  'POST-UTME': `
    <strong>POST UTME Instructions</strong>
    <ul>
      <li>Total Questions: 40 Questions</li>
      <li>Time Duration: 30 Minutes</li>
      <li>Marking varies by school</li>
      <li>Read questions carefully</li>
    </ul>
    <strong>Be Conscious:</strong> Each school has different format. Practice past questions.
  `,
  WAEC: `
    <strong>WAEC WASSCE Instructions</strong>
    <ul>
      <li>Total Questions: 50 Objective Questions</li>
      <li>Time Duration: 1 Hour</li>
      <li>Select only ONE subject</li>
      <li>Answer all questions</li>
    </ul>
    <strong>Be Conscious:</strong> WAEC is objective only. Read carefully.
  `,
  NECO: `
    <strong>NECO SSCE Instructions</strong>
    <ul>
      <li>Total Questions: 60 Objective Questions</li>
      <li>Time Duration: 1 Hour</li>
      <li>Objective + Theory + Practical</li>
      <li>All sections compulsory</li>
    </ul>
    <strong>Be Conscious:</strong> NECO is similar to WAEC. Practice both.
  `
};

const examTimeConfig = {
  JAMB: { timeInSeconds: 7200 },
  'POST-UTME': { timeInSeconds: 1800 },
  WAEC: { timeInSeconds: 3600 },
  NECO: { timeInSeconds: 3600 },
  CHALLENGE: { timeInSeconds: 3600 }
};

// Question count per subject
const questionCountPerSubject = {
  JAMB: {
    English: 60,
    default: 40
  },
  WAEC: {
    default: 50
  },
  NECO: {
    default: 60
  },
  'POST-UTME': {
    default: 40
  }
};

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.exam-card').forEach(card => {
    card.onclick = () => {
      const exam = card.dataset.exam;
      if (exam === 'CHALLENGE') {
        document.getElementById('challengeModal').classList.add('active');
      } else {
        currentExam = exam;
        currentLimit = parseInt(card.dataset.limit);
        openSubjectModal();
      }
    };
  });

  document.querySelectorAll('#challengeModal.picker-item').forEach(item => {
    item.onclick = () => {
      document.querySelectorAll('#challengeModal.picker-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
      challengeTypeSelected = item.dataset.type;
    };
  });

  document.getElementById('challengeCloseBtn').onclick = () => {
    document.getElementById('challengeModal').classList.remove('active');
    document.querySelectorAll('#challengeModal.picker-item').forEach(i => i.classList.remove('selected'));
    challengeTypeSelected = null;
  };

  document.getElementById('challengeProceedBtn').onclick = () => {
    if (!challengeTypeSelected) return;
    challengeType = challengeTypeSelected;
    currentExam = 'CHALLENGE';
    currentLimit = challengeType === 'JAMB'? 4 : 1;
    document.getElementById('challengeModal').classList.remove('active');
    document.querySelectorAll('#challengeModal.picker-item').forEach(i => i.classList.remove('selected'));
    challengeTypeSelected = null;
    openSubjectModal();
  };

  document.getElementById('subjectCloseBtn').onclick = closeSubjectModal;
  document.getElementById('subjectProceedBtn').onclick = proceedFromSubjects;

  document.getElementById('instructionCloseBtn').onclick = () => {
    document.getElementById('instructionModal').classList.remove('active');
  };

  document.getElementById('instructionStartBtn').onclick = startExam;
});

function openSubjectModal() {
  const isSingleSubject = currentExam === 'WAEC' || currentExam === 'NECO' ||
                         (currentExam === 'CHALLENGE' && (challengeType === 'WAEC' || challengeType === 'NECO'));

  selectedSubjects = isSingleSubject? [] : ['English'];
  document.getElementById('subjectError').textContent = '';

  const examName = currentExam === 'CHALLENGE'? `${challengeType} Challenge` : currentExam;
  document.getElementById('subjectModalTitle').textContent = `Select Subject${currentLimit > 1? 's' : ''} for ${examName}`;
  updateCounter();

  const list = document.getElementById('subjectList');
  list.innerHTML = '';

  subjects.forEach(sub => {
    const row = document.createElement('div');
    const isEnglish = sub === 'English';
    const shouldLock = isEnglish &&!isSingleSubject;

    row.className = `subject-item-row ${shouldLock? 'locked' : ''}`;
    row.innerHTML = `
      <input type="checkbox" id="sub-${sub}" value="${sub}" ${shouldLock? 'checked disabled' : ''}>
      <label for="sub-${sub}">${sub}</label>
    `;

    if (!shouldLock) {
      row.querySelector('input').onchange = (e) => handleSubjectCheck(e, sub);
    }

    list.appendChild(row);
  });

  document.getElementById('subjectModal').classList.add('active');
}

function handleSubjectCheck(e, subject) {
  const checked = e.target.checked;
  if (checked) {
    if (selectedSubjects.length >= currentLimit) {
      e.target.checked = false;
      return;
    }
    selectedSubjects.push(subject);
  } else {
    selectedSubjects = selectedSubjects.filter(s => s!== subject);
  }
  updateCounter();
  document.getElementById('subjectError').textContent = '';
}

function updateCounter() {
  document.getElementById('subjectCounter').textContent = `Selected: ${selectedSubjects.length}/${currentLimit}`;
}

function closeSubjectModal() {
  document.getElementById('subjectModal').classList.remove('active');
  selectedSubjects = [];
  if (currentExam === 'CHALLENGE') {
    document.getElementById('challengeModal').classList.add('active');
  }
}

function proceedFromSubjects() {
  if (selectedSubjects.length!== currentLimit) {
    const word = currentLimit === 1? 'subject' : 'subjects';
    document.getElementById('subjectError').textContent = `Select ${currentLimit} ${word} to continue`;
    return;
  }
  document.getElementById('subjectModal').classList.remove('active');
  openInstructionModal();
}

function openInstructionModal() {
  const examKey = currentExam === 'CHALLENGE'? challengeType : currentExam;
  document.getElementById('instructionTitle').textContent = `${examKey} CBT Instructions`;
  document.getElementById('instructionContent').innerHTML = instructions[examKey];
  document.getElementById('instructionModal').classList.add('active');
}

// Helper: pick random items
function pickRandom(arr, n) {
  return [...arr].sort(() => 0.5 - Math.random()).slice(0, n);
}

// Helper: pick topics by difficulty ___, __, *
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

// Helper: pick questions by difficulty ***, **, *
function pickQuestionsByDifficulty(questions, totalNeeded) {
  const byDiff = {
    "***": questions.filter(q => q.qDiff === "***"),
    "**": questions.filter(q => q.qDiff === "**"),
    "*": questions.filter(q => q.qDiff === "*")
  };

  let n3 = Math.round(totalNeeded * 0.5); // 50% hard
  let n2 = Math.round(totalNeeded * 0.3); // 30% medium
  let n1 = totalNeeded - n3 - n2; // 20% easy

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

async function startExam() {
  document.getElementById('instructionModal').classList.remove('active');

  const examKey = currentExam === 'CHALLENGE'? challengeType : currentExam;
  const allQuestions = [];

  for (const subject of selectedSubjects) {
    const questions = await loadQuestions(subject, examKey);
    if (questions.length === 0) continue;

    // Step 1: Pick topics using ___, __, *
    const pickedTopics = pickTopics(questions);
    const topicQuestions = questions.filter(q => pickedTopics.includes(q.topic));

    // Step 2: Get count for this subject
    let count = questionCountPerSubject[examKey]?.[subject] || questionCountPerSubject[examKey]?.default || 50;
    count = Math.min(count, topicQuestions.length);

    // Step 3: Pick questions using ***, **, *
    const picked = pickQuestionsByDifficulty(topicQuestions, count);

    // Step 4: Tag with subject
    const tagged = picked.map(q => ({...q, subject: subject }));
    allQuestions.push(...tagged);
  }

  if (allQuestions.length === 0) {
    alert('No questions found for selected subjects');
    return;
  }

  const timeConfig = examTimeConfig[examKey] || examTimeConfig.JAMB;

  const examData = {
    exam: examKey,
    subjects: selectedSubjects,
    questions: allQuestions.map((q, i) => ({
  ...q,
      id: q.id!== undefined? q.id : i
    })),
    totalQuestions: allQuestions.length,
    timeInSeconds: timeConfig.timeInSeconds,
    mode: 'CBT',
    limit: currentLimit
  };

  localStorage.setItem('examData', JSON.stringify(examData));
  window.location.href = 'exam.html';
}

async function loadQuestions(subject, examMode) {
  const cacheKey = `${examMode}_${subject}`;
  if (questionCache[cacheKey]) return questionCache[cacheKey];

  const prefix = examPrefixes[examMode];
  const fileName = `./${prefix}${subject.replace(/\s/g, '')}.js`;
  const exportName = `${prefix}${subject.replace(/\s/g, '')}`;

  try {
    const module = await import(fileName);
    questionCache[cacheKey] = module[exportName] || [];
    return questionCache[cacheKey];
  } catch (err) {
    console.error(`Failed to load ${fileName}:`, err);
    return [];
  }
}

function shuffleArray(arr) {
  return [...arr].sort(() => 0.5 - Math.random());
}

// Auto-open exam from URL param
const urlParams = new URLSearchParams(window.location.search);
const autoExam = urlParams.get('exam');
if (autoExam) {
  const examCard = document.querySelector(`.exam-card[data-exam="${autoExam}"]`);
  if (examCard) {
    setTimeout(() => {
      currentExam = autoExam;
      currentLimit = parseInt(examCard.dataset.limit);
      openSubjectModal();
    }, 300);
  }
}