import { showToast } from './toast.js';

const API_BASE = ''; // Set your Flask URL here, e.g. 'https://cbt-credit-zxgb.onrender.com'
const DEFAULT_AVATAR = 'https://i.postimg.cc/JhG5Z8V8/1000323583-removebg-preview.png';

const resultData = JSON.parse(localStorage.getItem('resultData'));
const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');

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
let activeQuestionIdx = null;
let activeQuestionDBId = null;
let replyToCommentId = null;

document.addEventListener('DOMContentLoaded', () => {
  loadProfilePic();
  calculateScore();
  renderScore();
  renderSubjectTabs();
  renderQuestions();
  setupFilters();
  setupButtons();
  setupCommentDrawer();
  saveResultToServer();

  setTimeout(() => {
    localStorage.removeItem('resultData');
    localStorage.removeItem('examData');
  }, 1000);
});

function loadProfilePic() {
  if (currentUser.profile_pic) {
    document.getElementById('userProfilePic').src = currentUser.profile_pic;
  }
  document.getElementById('profileBtn').onclick = () => {
    window.location.href = 'profile.html';
  };
}

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
      <div class="review-actions">
        <button class="action-btn comment-btn" data-idx="${idx}">💬 Comments</button>
        <button class="action-btn report-btn" data-idx="${idx}">⚠️ Report</button>
      </div>
    `;
    list.appendChild(item);
  });

  document.querySelectorAll('.comment-btn').forEach(btn => {
    btn.onclick = () => openComments(Number(btn.dataset.idx));
  });
  document.querySelectorAll('.report-btn').forEach(btn => {
    btn.onclick = () => openReport(Number(btn.dataset.idx));
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

function setupCommentDrawer() {
  document.getElementById('closeComment').onclick = () => {
    document.getElementById('commentDrawer').classList.remove('open');
    replyToCommentId = null;
    activeQuestionDBId = null;
  };

  document.getElementById('sendComment').onclick = sendComment;
  document.getElementById('commentText').onkeypress = e => {
    if (e.key === 'Enter') sendComment();
  };

  document.getElementById('cancelReport').onclick = () => {
    document.getElementById('reportModal').classList.remove('open');
  };
  document.getElementById('submitReport').onclick = submitReport;
}

async function openComments(questionIdx) {
  activeQuestionIdx = questionIdx;
  activeQuestionDBId = questions[questionIdx].question_id || null;
  replyToCommentId = null;
  document.getElementById('commentDrawer').classList.add('open');
  document.getElementById('commentText').placeholder = 'Add a comment...';
  await loadComments();
}

async function loadComments() {
  if (!currentUser.user_id) {
    showToast('Login to view comments', 'error');
    return;
  }

  const q = questions[activeQuestionIdx];

  // If we don't have a DB ID yet, we can't load. Just show empty
  if (!activeQuestionDBId &&!q.question_id) {
    renderComments([]);
    return;
  }

  const qid = activeQuestionDBId || q.question_id;

  try {
    const res = await fetch(`${API_BASE}/question/comments/${qid}?user_id=${currentUser.user_id}`);
    const comments = await res.json();
    if (res.ok) {
      renderComments(comments);
    } else {
      showToast('Failed to load comments', 'error');
    }
  } catch (e) {
    showToast('Failed to load comments', 'error');
  }
}

function renderComments(comments) {
  const list = document.getElementById('commentList');
  list.innerHTML = '';

  if (comments.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:20px;">No comments yet. Be the first!</div>';
    return;
  }

  const parents = comments.filter(c =>!c.parent_comment_id);
  parents.forEach(c => {
    list.appendChild(createCommentEl(c));
    const replies = comments.filter(r => r.parent_comment_id === c.comment_id);
    replies.forEach(r => list.appendChild(createCommentEl(r, true)));
  });
}

function createCommentEl(c, isReply = false) {
  const el = document.createElement('div');
  el.className = `comment-item ${isReply? 'reply' : ''}`;
  el.innerHTML = `
    <img class="comment-avatar" src="${c.profile_pic || DEFAULT_AVATAR}" alt="">
    <div class="comment-body">
      <div class="comment-user">${c.username}</div>
      <div class="comment-text">${c.comment_text}</div>
      <div class="comment-actions">
        <button class="c-action like-btn ${c.user_reaction === 'like'? 'active' : ''}" data-id="${c.comment_id}" data-type="like">
          👍 ${c.likes}
        </button>
        <button class="c-action dislike-btn ${c.user_reaction === 'dislike'? 'active' : ''}" data-id="${c.comment_id}" data-type="dislike">
          👎 ${c.dislikes}
        </button>
        <button class="c-action reply-btn" data-id="${c.comment_id}" data-user="${c.username}">Reply</button>
      </div>
    </div>
  `;

  el.querySelector('.like-btn').onclick = () => reactComment(c.comment_id, 'like');
  el.querySelector('.dislike-btn').onclick = () => reactComment(c.comment_id, 'dislike');
  el.querySelector('.reply-btn').onclick = () => {
    replyToCommentId = c.comment_id;
    document.getElementById('commentText').placeholder = `Replying to ${c.username}...`;
    document.getElementById('commentText').focus();
  };
  return el;
}

async function sendComment() {
  const text = document.getElementById('commentText').value.trim();
  if (!text ||!currentUser.user_id) {
    showToast('Login required', 'error');
    return;
  }

  const q = questions[activeQuestionIdx];

  try {
    const res = await fetch(`${API_BASE}/question/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_id: activeQuestionDBId || q.question_id || null,
        user_id: currentUser.user_id,
        text: text,
        parent_comment_id: replyToCommentId,
        question_text: q.question,
        subject: q.subject,
        exam: exam
      })
    });
    const data = await res.json();

    if (res.ok) {
      document.getElementById('commentText').value = '';
      replyToCommentId = null;
      document.getElementById('commentText').placeholder = 'Add a comment...';
      activeQuestionDBId = data.question_id; // Update with real DB ID
      questions[activeQuestionIdx].question_id = data.question_id; // Cache it
      await loadComments();
    } else {
      showToast(data.error || 'Failed to post comment', 'error');
    }
  } catch (e) {
    showToast('Failed to post comment', 'error');
  }
}

async function reactComment(commentId, type) {
  if (!currentUser.user_id) return;
  try {
    await fetch(`${API_BASE}/comment/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comment_id: commentId,
        user_id: currentUser.user_id,
        type: type
      })
    });
    await loadComments();
  } catch (e) {
    showToast('Failed to react', 'error');
  }
}

function openReport(questionIdx) {
  activeQuestionIdx = questionIdx;
  activeQuestionDBId = questions[questionIdx].question_id || null;
  document.getElementById('reportModal').classList.add('open');
  document.getElementById('reportReason').value = '';
}

async function submitReport() {
  const reason = document.getElementById('reportReason').value.trim();
  if (!reason ||!currentUser.user_id) {
    showToast('Login required', 'error');
    return;
  }

  const q = questions[activeQuestionIdx];

  try {
    const res = await fetch(`${API_BASE}/question/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_id: activeQuestionDBId || q.question_id || null,
        user_id: currentUser.user_id,
        reason: reason,
        question_text: q.question,
        subject: q.subject,
        exam: exam
      })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Report submitted', 'success');
      document.getElementById('reportModal').classList.remove('open');
      activeQuestionDBId = data.question_id;
      questions[activeQuestionIdx].question_id = data.question_id;
    } else {
      showToast(data.error || 'Failed to submit report', 'error');
    }
  } catch (e) {
    showToast('Failed to submit report', 'error');
  }
}

async function saveResultToServer() {
  if (!currentUser.user_id) return;
  try {
    await fetch(`${API_BASE}/history/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUser.user_id,
        score: correct,
        total_questions: questions.length
      })
    });
  } catch (e) {
    console.log('Could not save history');
  }
}