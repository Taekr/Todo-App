/**
 * My Tasks - Todo List App (Step 4: 다크 모드 & 고급 기능)
 */

// LocalStorage 저장 키
const STORAGE_KEY = 'my_tasks_data';
const STORAGE_THEME_KEY = 'my_tasks_theme';

// 카테고리 레이블 매핑
const CATEGORY_LABELS = {
  work: '업무',
  personal: '개인',
  study: '공부'
};

// 상태 관리 (State)
let todos = [];
let currentFilter = 'all'; // 'all' | 'work' | 'personal' | 'study'
let searchQuery = '';
let editingTodoId = null;

// DOM 요소 참조
const todoForm = document.getElementById('todoForm');
const categorySelect = document.getElementById('categorySelect');
const todoInput = document.getElementById('todoInput');
const todoList = document.getElementById('todoList');
const emptyMessage = document.getElementById('emptyMessage');
const filterButtonGroup = document.getElementById('filterButtonGroup');
const searchInput = document.getElementById('searchInput');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const themeToggle = document.getElementById('themeToggle');

// 헤더 및 대시보드 통계 DOM 요소
const remainingBadge = document.getElementById('remainingBadge');
const todayCountBadge = document.getElementById('todayCountBadge');
const progressBarFill = document.getElementById('progressBarFill');
const progressSummary = document.getElementById('progressSummary');
const statWork = document.getElementById('statWork');
const statPersonal = document.getElementById('statPersonal');
const statStudy = document.getElementById('statStudy');

/**
 * 테마(다크/라이트) 초기화 및 동기화
 */
function initTheme() {
  const savedTheme = localStorage.getItem(STORAGE_THEME_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;

  applyTheme(isDark);

  themeToggle.addEventListener('click', () => {
    const willBeDark = !document.body.classList.contains('dark-mode');
    applyTheme(willBeDark);
    localStorage.setItem(STORAGE_THEME_KEY, willBeDark ? 'dark' : 'light');
  });
}

function applyTheme(isDark) {
  const iconSpan = themeToggle.querySelector('.theme-icon');
  if (isDark) {
    document.body.classList.add('dark-mode');
    iconSpan.textContent = '☀️';
    themeToggle.title = '라이트 모드로 전환';
  } else {
    document.body.classList.remove('dark-mode');
    iconSpan.textContent = '🌙';
    themeToggle.title = '다크 모드로 전환';
  }
}

/**
 * 오늘 날짜 판별 유틸리티
 */
function isToday(timestamp) {
  if (!timestamp) return false;
  const target = new Date(timestamp);
  const now = new Date();
  return (
    target.getFullYear() === now.getFullYear() &&
    target.getMonth() === now.getMonth() &&
    target.getDate() === now.getDate()
  );
}

/**
 * 상대 시간 포맷팅 함수
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const diffInSeconds = Math.floor((now - timestamp) / 1000);

  if (diffInSeconds < 60) return '방금 전';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return '어제';
  if (diffInDays < 7) return `${diffInDays}일 전`;

  const date = new Date(timestamp);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

/**
 * LocalStorage에서 데이터 불러오기
 */
function loadTodos() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    const parsed = rawData ? JSON.parse(rawData) : [];
    todos = parsed.map((item) => ({
      ...item,
      category: item.category || 'work',
      createdAt: item.createdAt || Date.now()
    }));
  } catch (error) {
    console.error('LocalStorage 로드 실패:', error);
    todos = [];
  }
}

/**
 * LocalStorage에 데이터 저장
 */
function saveTodos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (error) {
    console.error('LocalStorage 저장 실패:', error);
  }
}

/**
 * 대시보드 통계 및 배지 갱신
 */
function updateDashboard() {
  const totalCount = todos.length;
  const completedCount = todos.filter((t) => t.isCompleted).length;
  const remainingCount = totalCount - completedCount;
  const percentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  // 진행률 게이지 및 요약
  progressBarFill.style.width = `${percentage}%`;
  progressSummary.textContent = `${completedCount}/${totalCount} 완료 (${percentage}%)`;

  // 헤더 배지: 남은 할 일 & 오늘 등록 개수
  remainingBadge.textContent = `남은 일 ${remainingCount}개`;
  const todayCount = todos.filter((t) => isToday(t.createdAt)).length;
  todayCountBadge.textContent = `오늘 등록 ${todayCount}개`;

  // 카테고리별 미니 통계
  const getCategoryStat = (cat) => {
    const catTodos = todos.filter((t) => t.category === cat);
    const catCompleted = catTodos.filter((t) => t.isCompleted).length;
    return `${catCompleted}/${catTodos.length}`;
  };

  statWork.textContent = getCategoryStat('work');
  statPersonal.textContent = getCategoryStat('personal');
  statStudy.textContent = getCategoryStat('study');
}

/**
 * 필터 버튼 UI 동기화
 */
function updateFilterUI() {
  const filterBtns = filterButtonGroup.querySelectorAll('.btn-filter');
  filterBtns.forEach((btn) => {
    if (btn.dataset.filter === currentFilter) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

/**
 * 화면 렌더링
 */
function render() {
  updateDashboard();
  updateFilterUI();

  // 1. 카테고리 필터링
  let filteredTodos = todos.filter((todo) => {
    if (currentFilter === 'all') return true;
    return todo.category === currentFilter;
  });

  // 2. 실시간 검색어 필터링
  if (searchQuery) {
    filteredTodos = filteredTodos.filter((todo) =>
      todo.text.toLowerCase().includes(searchQuery)
    );
  }

  // 목록 컨테이너 초기화
  todoList.innerHTML = '';

  // 빈 목록 상태 메시지 처리
  if (filteredTodos.length === 0) {
    if (searchQuery) {
      emptyMessage.textContent = `'${searchQuery}'에 대한 검색 결과가 없습니다.`;
    } else if (currentFilter !== 'all') {
      emptyMessage.textContent = `'${CATEGORY_LABELS[currentFilter]}' 카테고리에 할 일이 없습니다.`;
    } else {
      emptyMessage.textContent = '할 일이 없습니다. 추가해보세요!';
    }
    emptyMessage.classList.add('visible');
  } else {
    emptyMessage.classList.remove('visible');
  }

  // 할 일 항목 생성
  filteredTodos.forEach((todo) => {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.isCompleted ? 'completed' : ''}`;
    li.dataset.id = todo.id;

    if (editingTodoId === todo.id) {
      renderEditMode(li, todo);
    } else {
      renderNormalMode(li, todo);
    }

    todoList.appendChild(li);
  });
}

/**
 * 일반 모드 렌더링
 */
function renderNormalMode(li, todo) {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'todo-checkbox';
  checkbox.checked = todo.isCompleted;

  const badge = document.createElement('span');
  badge.className = `category-badge category-${todo.category}`;
  badge.textContent = CATEGORY_LABELS[todo.category] || '기타';

  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'todo-content';
  contentWrapper.title = '더블클릭하여 수정';

  const spanText = document.createElement('span');
  spanText.className = 'todo-text';
  spanText.textContent = todo.text;

  const spanTime = document.createElement('span');
  spanTime.className = 'todo-time';
  spanTime.textContent = formatRelativeTime(todo.createdAt);

  contentWrapper.appendChild(spanText);
  contentWrapper.appendChild(spanTime);

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'btn btn-delete';
  deleteBtn.innerHTML = '&times;';
  deleteBtn.setAttribute('aria-label', '할 일 삭제');

  li.appendChild(checkbox);
  li.appendChild(badge);
  li.appendChild(contentWrapper);
  li.appendChild(deleteBtn);
}

/**
 * 인라인 편집 모드 렌더링
 */
function renderEditMode(li, todo) {
  const editContainer = document.createElement('div');
  editContainer.className = 'edit-container';

  const editSelect = document.createElement('select');
  editSelect.className = 'edit-category-select';
  ['work', 'personal', 'study'].forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = CATEGORY_LABELS[cat];
    if (cat === todo.category) opt.selected = true;
    editSelect.appendChild(opt);
  });

  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.className = 'edit-input';
  editInput.value = todo.text;
  editInput.maxLength = 100;

  const btnGroup = document.createElement('div');
  btnGroup.className = 'edit-btn-group';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn btn-save';
  saveBtn.textContent = '저장';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn-cancel';
  cancelBtn.textContent = '취소';

  btnGroup.appendChild(saveBtn);
  btnGroup.appendChild(cancelBtn);

  editContainer.appendChild(editSelect);
  editContainer.appendChild(editInput);
  editContainer.appendChild(btnGroup);

  li.appendChild(editContainer);

  requestAnimationFrame(() => {
    editInput.focus();
    editInput.select();
  });

  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit(todo.id, editInput.value, editSelect.value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  });

  saveBtn.addEventListener('click', () => {
    saveEdit(todo.id, editInput.value, editSelect.value);
  });

  cancelBtn.addEventListener('click', () => {
    cancelEdit();
  });
}

/**
 * 인라인 수정 저장
 */
function saveEdit(id, newText, newCategory) {
  const trimmed = newText.trim();
  if (!trimmed) {
    alert('할 일 내용을 입력해주세요.');
    return;
  }

  const target = todos.find((t) => t.id === id);
  if (target) {
    target.text = trimmed;
    target.category = newCategory;
    target.updatedAt = Date.now();
    saveTodos();
  }

  editingTodoId = null;
  render();
}

/**
 * 인라인 수정 취소
 */
function cancelEdit() {
  editingTodoId = null;
  render();
}

/**
 * 할 일 추가
 */
function addTodo(text, category) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const validCategories = ['work', 'personal', 'study'];
  const safeCategory = validCategories.includes(category) ? category : 'work';

  const newTodo = {
    id: 'todo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    text: trimmed,
    category: safeCategory,
    isCompleted: false,
    createdAt: Date.now()
  };

  todos.unshift(newTodo);
  saveTodos();
  render();
}

/**
 * 완료 상태 토글
 */
function toggleTodo(id) {
  const target = todos.find((t) => t.id === id);
  if (target) {
    target.isCompleted = !target.isCompleted;
    saveTodos();
    render();
  }
}

/**
 * 개별 삭제
 */
function deleteTodo(id, element) {
  if (element) {
    element.classList.add('fade-out');
    setTimeout(() => {
      todos = todos.filter((t) => t.id !== id);
      saveTodos();
      render();
    }, 200);
  } else {
    todos = todos.filter((t) => t.id !== id);
    saveTodos();
    render();
  }
}

/**
 * 완료된 항목 일괄 삭제
 */
function clearCompleted() {
  const completedItems = todos.filter((t) => t.isCompleted);
  if (completedItems.length === 0) {
    alert('삭제할 완료된 항목이 없습니다.');
    return;
  }

  if (confirm(`완료된 ${completedItems.length}개의 항목을 모두 삭제하시겠습니까?`)) {
    todos = todos.filter((t) => !t.isCompleted);
    saveTodos();
    render();
  }
}

/**
 * 카테고리 필터 변경 유틸리티
 */
function setCategoryFilter(filterName) {
  if (currentFilter !== filterName) {
    currentFilter = filterName;
    editingTodoId = null;
    render();
  }
}

/**
 * 키보드 단축키 핸들러
 * - Alt+N: 새 할 일 입력창 포커스
 * - Alt+1, 2, 3, 4: 카테고리 필터 전환 (전체, 업무, 개인, 공부)
 */
function initKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (!e.altKey) return;

    // Alt+N
    if (e.code === 'KeyN' || e.key.toLowerCase() === 'n') {
      e.preventDefault();
      todoInput.focus();
      return;
    }

    // Alt+1 (전체)
    if (e.code === 'Digit1' || e.key === '1') {
      e.preventDefault();
      setCategoryFilter('all');
      return;
    }

    // Alt+2 (업무)
    if (e.code === 'Digit2' || e.key === '2') {
      e.preventDefault();
      setCategoryFilter('work');
      return;
    }

    // Alt+3 (개인)
    if (e.code === 'Digit3' || e.key === '3') {
      e.preventDefault();
      setCategoryFilter('personal');
      return;
    }

    // Alt+4 (공부)
    if (e.code === 'Digit4' || e.key === '4') {
      e.preventDefault();
      setCategoryFilter('study');
      return;
    }
  });
}

/**
 * 이벤트 바인딩
 */
function initEvents() {
  // 폼 제출
  todoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = todoInput.value;
    const category = categorySelect.value;
    if (text.trim()) {
      addTodo(text, category);
      todoInput.value = '';
      todoInput.focus();
    }
  });

  // 실시간 검색
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    render();
  });

  // 카테고리 필터 클릭
  filterButtonGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-filter');
    if (!btn) return;
    setCategoryFilter(btn.dataset.filter);
  });

  // 완료 항목 일괄 삭제 버튼
  clearCompletedBtn.addEventListener('click', clearCompleted);

  // 할 일 목록 클릭 및 더블클릭
  todoList.addEventListener('click', (e) => {
    const item = e.target.closest('.todo-item');
    if (!item) return;
    const id = item.dataset.id;

    if (e.target.closest('.btn-delete')) {
      deleteTodo(id, item);
      return;
    }

    if (e.target.classList.contains('todo-checkbox')) {
      toggleTodo(id);
    }
  });

  todoList.addEventListener('dblclick', (e) => {
    const content = e.target.closest('.todo-content');
    if (!content) return;
    const item = content.closest('.todo-item');
    if (!item) return;

    editingTodoId = item.dataset.id;
    render();
  });

  // 키보드 단축키 활성화
  initKeyboardShortcuts();
}

/**
 * 애플리케이션 초기화
 */
function init() {
  initTheme();
  loadTodos();
  render();
  initEvents();
}

// DOM 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', init);
