import { showToast } from './toast.js';

const subjects = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
  'Government', 'Economics', 'Literature', 'Geography', 'Commerce',
  'Accounting', 'Agricultural Science'
];

const questionOptions = [5, 10, 20, 40];
let selectedData = {};
let practiceSettings = {
  hours: 1,
  minutes: 30,
  examMode: 'JAMB UTME'
};

let tempPickerValue = null;
let currentPickerType = null;
let currentSubject = null;

const examPrefixes = {
  'WAEC': 'waec',
  'JAMB UTME': 'jamb',
  'POST UTME': 'postutme',
  'NECO': 'neco'
};

const questionCache = {};

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
    "***": questions.filter(q => q.qDiff === "***"),
    "**": questions.filter(q => q.qDiff === "**"),
    "*": questions.filter(q => q.qDiff === "*")
  };

  let n3 = Math.round(totalNeeded * 0.5);
  let n2 = Math.round(totalNeeded * 0.3);
  let n1 = totalNeeded - n3 - n2;

  let selected = [
    ...pickRandom(byDiff["***"], Math.min(n3, byDiff["***"].length)),
    ...pickRandom(byDiff["**"], Math.min(n2, byDiff["**"].length)),
    ...pickRandom(byDiff["*"], Math.min(n1, byDiff["*"].length))
  ];

  if (selected.length < totalNeeded) {
    const remaining = questions.filter(q => !selected.includes(q));
    selected = [...selected, ...pickRandom(remaining, totalNeeded - selected.length)];
  }

  return selected.sort(() => 0.5 - Math.random());
}

async function startPractice() {
  const selectedSubjects = Object.entries(selectedData)
    .filter(([_, data]) => data.checked)
    .map(([subject, data]) => ({ subject, questions: data.questions }));

  if (selectedSubjects.length === 0) {
    showToast('Please select at least 1 subject', 'error');
    return;
  }

  let allSelectedQuestions = [];

  for (const { subject, questions } of selectedSubjects) {
    const allQuestions = await loadQuestions(subject, practiceSettings.examMode);
    if (allQuestions.length === 0) continue;

    const pickedTopics = pickTopics(allQuestions);
    const topicQuestions = allQuestions.filter(q => pickedTopics.includes(q.topic));
    const picked = pickQuestionsByDifficulty(topicQuestions, questions);

    const tagged = picked.map(q => ({ ...q, subject: subject }));
    allSelectedQuestions = [...allSelectedQuestions, ...tagged];
  }

  if (allSelectedQuestions.length === 0) {
    showToast('No questions available for selected subjects', 'error');
    return;
  }

  allSelectedQuestions = allSelectedQuestions.map((q, i) => ({
    ...q,
    id: q.id !== undefined ? q.id : i
  }));

  const totalSeconds = (practiceSettings.hours * 3600) + (practiceSettings.minutes * 60);

  const examData = {
    exam: practiceSettings.examMode,
    subjects: selectedSubjects.map(s => s.subject),
    questions: allSelectedQuestions,
    totalQuestions: allSelectedQuestions.length,
    timeInSeconds: totalSeconds,
    mode: 'PRACTICE'
  };

  localStorage.setItem('examData', JSON.stringify(examData));
  hideConfirmModal();
  showToast('Starting practice...', 'success');

  setTimeout(() => {
    window.location.href = 'exam.html';
  }, 800);
}

document.addEventListener('DOMContentLoaded', () => {
  renderSubjects();
  setupEventListeners();
  updateSettingsUI();
});

function renderSubjects() {
  const container = document.getElementById('subjectList');
  if (!container) return;
  container.innerHTML = '';

  subjects.forEach(subject => {
    if (!selectedData[subject]) {
      selectedData[subject] = { checked: false, questions: 10 };
    }

    const div = document.createElement('div');
    div.className = 'subject-item';
    div.innerHTML = `
      <div class="subject-check">
        <input type="checkbox" id="check-${subject}" ${selectedData[subject].checked ? 'checked' : ''}>
        <label for="check-${subject}">${subject}</label>
      </div>
      <div class="subject-field" id="btn-${subject}">
        ${selectedData[subject].questions} Qs
      </div>
    `;
    container.appendChild(div);

    document.getElementById(`check-${subject}`).onchange = (e) => {
      toggleSubject(subject, e.target.checked);
    };
    document.getElementById(`btn-${subject}`).onclick = () => {
      openPicker('questions', subject);
    };
  });
}

function setupEventListeners() {
  document.getElementById('proceedBtn').addEventListener('click', showConfirmModal);
  document.getElementById('hoursField').addEventListener('click', () => openPicker('hours'));
  document.getElementById('minutesField').addEventListener('click', () => openPicker('minutes'));
  document.getElementById('examModeField').addEventListener('click', () => openPicker('examMode'));
  document.getElementById('pickerCloseBtn').addEventListener('click', closePicker);
  document.getElementById('pickerSetBtn').addEventListener('click', confirmPicker);
  document.getElementById('cancelBtn').addEventListener('click', hideConfirmModal);
  document.getElementById('startBtn').addEventListener('click', startPractice);
}

function updateSettingsUI() {
  document.getElementById('hoursValue').textContent = `${practiceSettings.hours} Hr`;
  document.getElementById('minutesValue').textContent = `${practiceSettings.minutes} Mins`;
  document.getElementById('examModeValue').textContent = practiceSettings.examMode;
}

function toggleSubject(subject, checked) {
  selectedData[subject].checked = checked;
}

function openPicker(type, subject = null) {
  currentPickerType = type;
  currentSubject = subject;
  const modal = document.getElementById('pickerModal');
  const title = document.getElementById('pickerTitle');
  const list = document.getElementById('pickerList');
  list.innerHTML = '';

  if (type === 'examMode') {
    title.textContent = 'Select Exam Mode';
    tempPickerValue = practiceSettings.examMode;
    ['WAEC', 'JAMB UTME', 'POST UTME', 'NECO'].forEach(mode => {
      addPickerOption(list, mode, mode === tempPickerValue);
    });
  } else if (type === 'hours') {
    title.textContent = 'Select Hours';
    tempPickerValue = practiceSettings.hours;
    [0, 1, 2, 3, 4].forEach(h => {
      addPickerOption(list, `${h} Hr`, h === tempPickerValue);
    });
  } else if (type === 'minutes') {
    title.textContent = 'Select Minutes';
    tempPickerValue = practiceSettings.minutes;
    [0, 15, 30, 45].forEach(m => {
      addPickerOption(list, `${m} Mins`, m === tempPickerValue);
    });
  } else if (type === 'questions') {
    title.textContent = `Questions for ${subject}`;
    tempPickerValue = selectedData[subject].questions;
    questionOptions.forEach(q => {
      addPickerOption(list, `${q} Questions`, q === tempPickerValue);
    });
  }
  modal.style.display = 'flex';
}

function addPickerOption(container, value, selected) {
  const div = document.createElement('div');
  div.className = `picker-item ${selected ? 'selected' : ''}`;
  div.textContent = value;
  div.onclick = () => setPicker(value);
  container.appendChild(div);
}

function setPicker(value) {
  tempPickerValue = value;
  document.querySelectorAll('.picker-item').forEach(opt => {
    opt.classList.toggle('selected', opt.textContent === value);
  });
}

function confirmPicker() {
  if (currentPickerType === 'examMode') {
    practiceSettings.examMode = tempPickerValue;
  } else if (currentPickerType === 'hours') {
    practiceSettings.hours = parseInt(tempPickerValue);
  } else if (currentPickerType === 'minutes') {
    practiceSettings.minutes = parseInt(tempPickerValue);
  } else if (currentPickerType === 'questions') {
    selectedData[currentSubject].questions = parseInt(tempPickerValue);
    renderSubjects();
  }
  updateSettingsUI();
  closePicker();
}

function closePicker() {
  document.getElementById('pickerModal').style.display = 'none';
}

function showConfirmModal() {
  const selected = Object.entries(selectedData).filter(([_, d]) => d.checked);
  if (selected.length === 0) {
    showToast('Please select at least 1 subject', 'error');
    return;
  }
  const details = document.getElementById('confirmDetails');
  const subjectsText = selected.map(([s, d]) => `${s}: ${d.questions} Qs`).join('<br>');
  details.innerHTML = `
    <p><strong>Exam:</strong> ${practiceSettings.examMode}</p>
    <p><strong>Time:</strong> ${practiceSettings.hours}h ${practiceSettings.minutes}m</p>
    <p><strong>Subjects:</strong><br>${subjectsText}</p>
  `;
  document.getElementById('confirmModal').style.display = 'flex';
}

function hideConfirmModal() {
  document.getElementById('confirmModal').style.display = 'none';
}
