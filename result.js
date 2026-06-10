import { showToast } from './toast.js';

const API_BASE = 'https://cbt-credit-zxgb.onrender.com';
const DEFAULT_AVATAR = 'https://i.postimg.cc/JhG5Z8V8/1000323583-removebg-preview.png';

const resultData = JSON.parse(localStorage.getItem('resultData'));
const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

if (!resultData || !resultData.questions || resultData.questions.length === 0) {
  alert('No exam data found. Please take an exam first.');
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
let sendingComment = false;

function getUserId() {
  return currentUser.user_id || currentUser.id || null;
}

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
    const pic = document.getElementById('userProfilePic');
    if (pic) pic.src = currentUser.profile_pic;
  }
  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn) {
    profileBtn.onclick = () => {
      window.location.href = 'profile.html';
    };
  }
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
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

  const modeText = mode === 'PRACTICE' ? 'Practice' : 'CBT';
  const titleEl = document.getElementById('resultTitle');
  if (titleEl) titleEl.textContent = `${exam} - ${subjects.join(', ')} ${modeText}`;

  const circle = document.getElementById('scoreProgress');
  if (circle) {
    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (circumference * percent) / 100;
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = circumference;
    setTimeout(() => {
      circle.style.strokeDashoffset = offset;
    }, 100);
    
    let scoreColor;
    if (percent < 40) scoreColor = '#ef4444';
    else if (percent < 70) scoreColor = '#f59e0b';
    else scoreColor = '#10b981';
    circle.style.stroke = scoreColor;
  }

  const percentEl = document.getElementById('scorePercent');
  if (percentEl) {
    percentEl.textContent = `${percent}%`;
    let scoreColor;
    if (percent < 40) scoreColor = '#ef4444';
    else if (percent < 70) scoreColor = '#f59e0b';
    else scoreColor = '#10b981';
    percentEl.style.color = scoreColor;
  }

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
  if (!tabsDiv) return;
  tabsDiv.innerHTML = '';

  subjects.forEach(subject => {
    const stats = subjectStats[subject];
    const tab = document.createElement('button');
    tab.className = 'subject-tab';
    if (subject === currentSubject) tab.classList.add('active');
    tab.innerHTML = `${subject}<span class="subject-score-badge">${stats.correct}/${stats.total}</span>`;
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
  if (!list) return;
  list.innerHTML = '';

  if (!questions || questions.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:20px;">No questions found</div>';
    return;
  }

  questions.forEach((q, idx) => {
    if (q.subject !== currentSubject) return;

    const qid = String(idx);
    const userAns = answers[qid];
    const correctAns = Number(q.answer);
    const isAnswered = userAns !== undefined && userAns !== null && userAns !== '';
    const isCorrect = isAnswered && Number(userAns) === correctAns;

    if (currentFilter === 'correct' && !isCorrect) return;
    if (currentFilter === 'wrong' && (isCorrect || !isAnswered)) return;
    if (currentFilter === 'unanswered' && isAnswered) return;

    const status = !isAnswered ? 'unanswered' : isCorrect ? 'correct' : 'wrong';
    const statusText = !isAnswered ? 'Unanswered' : isCorrect ? 'Correct' : 'Wrong';

    const item = document.createElement('div');
    item.className = `review-item ${status}`;
    item.innerHTML = `
      <div class="review-header">
        <div class="review-qnum">Question ${idx + 1}</div>
        <div class="review-status ${status}">${statusText}</div>
      </div>
      ${q.image ? `<div class="review-image"><img src="${q.image}" alt="Question"></div>` : ''}
      <div class="review-question">${q.question}</div>
      <div class="review-options">
        ${q.options.map((opt, i) => `
          <div class="review-option ${i === correctAns ? 'correct' : ''} ${Number(userAns) === i && i !== correctAns ? 'selected' : ''}">
            <div class="option-badge">${String.fromCharCode(65 + i)}</div>
            <div>${opt}</div>
          </div>
        `).join('')}
      </div>
      ${q.explanation ? `<div class="review-explanation"><strong>Explanation:</strong> ${q.explanation}</div>` : ''}
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
  const homeBtn = document.getElementById('homeBtn');
  if (homeBtn) {
    homeBtn.onclick = () => {
      localStorage.removeItem('resultData');
      localStorage.removeItem('examData');
      window.location.href = 'home.html';
    };
  }

  const retryBtn = document.getElementById('retryBtn');
  if (retryBtn) {
    retryBtn.onclick = () => {
      localStorage.removeItem('resultData');
      localStorage.removeItem('examData');
      const page = mode === 'PRACTICE' ? 'cbt-pract.html' : 'cbt-exam.html';
      window.location.href = page;
    };
  }
}

function setupCommentDrawer() {
  const closeBtn = document.getElementById('closeComment');
  if (closeBtn) {
    closeBtn.onclick = () => {
      document.getElementById('commentDrawer').classList.remove('open');
      replyToCommentId = null;
      activeQuestionDBId = null;
    };
  }

  const sendBtn = document.getElementById('sendComment');
  if (sendBtn) sendBtn.onclick = sendComment;

  const commentInput = document.getElementById('commentText');
  if (commentInput) {
    commentInput.onkeypress = e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendComment();
      }
    };
  }

  const cancelReportBtn = document.getElementById('cancelReport');
  if (cancelReportBtn) {
    cancelReportBtn.onclick = () => {
      document.getElementById('reportModal').classList.remove('open');
    };
  }

  const submitReportBtn = document.getElementById('submitReport');
  if (submitReportBtn) submitReportBtn.onclick = submitReport;
}

async function openComments(questionIdx) {
  const userId = getUserId();
  if (!userId) {
    showToast('Login required', 'error');
    setTimeout(() => window.location.href = 'login.html', 1000);
    return;
  }

  if (!questions[questionIdx]) {
    showToast('Question not found', 'error');
    return;
  }

  activeQuestionIdx = questionIdx;
  activeQuestionDBId = questions[questionIdx].question_id || (questionIdx + 1);
  replyToCommentId = null;
  document.getElementById('commentDrawer').classList.add('open');
  document.getElementById('commentText').placeholder = 'Add a comment...';
  await loadComments();
}

async function loadComments() {
  const userId = getUserId();
  if (!userId) {
    showToast('Login to view comments', 'error');
    return;
  }

  const q = questions[activeQuestionIdx];
  if (!q) return;

  const qid = activeQuestionDBId || q.question_id || (activeQuestionIdx + 1);

  try {
    const res = await fetch(`${API_BASE}/question/comments/${qid}?user_id=${userId}`, {
      mode: 'cors'
    });
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

  if (!Array.isArray(comments) || comments.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:20px;">No comments yet. Be the first!</div>';
    return;
  }

  const parents = comments.filter(c => !c.parent_comment_id);
  parents.forEach(c => {
    list.appendChild(createCommentEl(c));
    const replies = comments.filter(r => r.parent_comment_id === c.comment_id);
    replies.forEach(r => list.appendChild(createCommentEl(r, true)));
  });
}

function createCommentEl(c, isReply = false) {
  const el = document.createElement('div');
  el.className = `comment-item ${isReply ? 'reply' : ''}`;
  
  // Custom styled upvote and downvote image asset paths instead of text emojis
  const thumbUpImg = "https://i.postimg.cc/mD7t8vL1/thumb-up-gold.png"; 
  const thumbDownImg = "https://i.postimg.cc/XvYgZp0g/thumb-down-gold.png";

  el.innerHTML = `
    <img class="comment-avatar" src="${c.profile_pic || DEFAULT_AVATAR}" alt="">
    <div class="comment-body">
      <div class="comment-user">${c.username}</div>
      <div class="comment-text">${c.comment_text}</div>
      <div class="comment-actions">
        <button class="c-action like-btn ${c.user_reaction === 'like' ? 'active' : ''}" data-id="${c.comment_id}" data-type="like">
          <img src="${thumbUpImg}" alt="Like" style="width:14px; height:14px; vertical-align:middle; margin-right:4px;" /> ${c.likes}
        </button>
        <button class="c-action dislike-btn ${c.user_reaction === 'dislike' ? 'active' : ''}" data-id="${c.comment_id}" data-type="dislike">
          <img src="${thumbDownImg}" alt="Dislike" style="width:14px; height:14px; vertical-align:middle; margin-right:4px;" /> ${c.dislikes}
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
  if (sendingComment) return;
  
  const text = document.getElementById('commentText').value.trim();
  const userId = getUserId();

  if (!text) {
    showToast('Type a comment first', 'error');
    return;
  }

  if (!userId) {
    showToast('Login required', 'error');
    return;
  }

  const q = questions[activeQuestionIdx];
  if (!q) {
    showToast('Question data missing', 'error');
    return;
  }

  sendingComment = true;
  const qid = activeQuestionDBId || q.question_id || (activeQuestionIdx + 1);
  const correctOptionIndex = Number(q.answer);
  
  // Translate numeric choices (0,1,2,3) to standardized structural alphabetic keys (A,B,C,D)
  const optionKeys = ["A", "B", "C", "D"];
  const correctLetter = optionKeys[correctOptionIndex] || "A";

  const contextPayload = {
    question: q.question,
    optionA: q.options[0] || '',
    optionB: q.options[1] || '',
    optionC: q.options[2] || '',
    optionD: q.options[3] || '',
    picked_answer: correctLetter
  };
  
  try {
    const res = await fetch(`${API_BASE}/question/comment`, {
      method: 'POST',
      mode: 'cors',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        question_id: qid,
        user_id: userId,
        text: text,
        parent_comment_id: replyToCommentId,
        question_context: JSON.stringify(contextPayload)
      })
    });
    const data = await res.json();

    if (res.ok) {
      document.getElementById('commentText').value = '';
      replyToCommentId = null;
      document.getElementById('commentText').placeholder = 'Add a comment...';
      await loadComments();
      showToast('Comment posted', 'success');
    } else {
      showToast(data.error || 'Failed to post comment', 'error');
    }
  } catch (e) {
    showToast('Failed to post comment', 'error');
  } finally {
    sendingComment = false;
  }
}

async function reactComment(commentId, type) {
  const userId = getUserId();
  if (!userId) {
    showToast('Login required to react', 'error');
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/comment/react`, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comment_id: commentId,
        user_id: userId,
        type: type
      })
    });
    if (res.ok) {
      await loadComments();
    }
  } catch (e) {
    showToast('Failed to save reaction', 'error');
  }
}

function openReport(questionIdx) {
  const userId = getUserId();
  if (!userId) {
    showToast('Login to report', 'error');
    return;
  }
  if (!questions[questionIdx]) {
    showToast('Question not found', 'error');
    return;
  }
  activeQuestionIdx = questionIdx;
  activeQuestionDBId = questions[questionIdx].question_id || (questionIdx + 1);
  document.getElementById('reportModal').classList.add('open');
  document.getElementById('reportReason').value = '';
}

async function submitReport() {
  const reason = document.getElementById('reportReason').value.trim();
  const userId = getUserId();

  if (!reason || !userId) {
    showToast('Reason and login required', 'error');
    return;
  }

  const q = questions[activeQuestionIdx];
  if (!q) {
    showToast('Question data missing', 'error');
    return;
  }

  const qid = activeQuestionDBId || q.question_id || (activeQuestionIdx + 1);
  const correctOptionIndex = Number(q.answer);
  
  // Translate numeric choices (0,1,2,3) to standardized structural alphabetic keys (A,B,C,D)
  const optionKeys = ["A", "B", "C", "D"];
  const correctLetter = optionKeys[correctOptionIndex] || "A";

  const contextPayload = {
    question: q.question,
    optionA: q.options[0] || '',
    optionB: q.options[1] || '',
    optionC: q.options[2] || '',
    optionD: q.options[3] || '',
    picked_answer: correctLetter
  };

  try {
    const res = await fetch(`${API_BASE}/question/report`, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_id: qid,
        user_id: userId,
        reason: reason,
        question_context: JSON.stringify(contextPayload)
      })
    });
    if (res.ok) {
      showToast('Report submitted', 'success');
      document.getElementById('reportModal').classList.remove('open');
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || 'Failed to submit report', 'error');
    }
  } catch (e) {
    showToast('Failed to submit report', 'error');
  }
}

async function saveResultToServer() {
  const userId = getUserId();
  if (!userId) return;
  try {
    await fetch(`${API_BASE}/history/save`, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        score: correct,
        total_questions: questions.length
      })
    });
  } catch (e) {
    console.log('Could not save history');
  }
}
