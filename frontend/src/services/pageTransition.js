import { ref, nextTick } from 'vue';

// 一级页面幕布动画时长配置
const ENTER_CURTAIN_DURATION = 650; // 阶段一总时长：当前画面先延时模糊 (0~380ms) + 幕布切入 (220~650ms)
const FADE_OUT_DURATION = 450;      // 阶段三总时长：幕布平缓淡出到新画面 (ms)
const MIN_CURTAIN_HOLD = 380;       // 常规幕布优雅驻留视觉确认时间 (ms)
const INITIAL_CURTAIN_HOLD = 580;   // 首次进入/刷新幕布驻留时间，确保两行品牌字完全升起 (ms)

// 二级页面淡入淡出动画时长配置
const SUB_FADE_OUT_DURATION = 200;  // 二级页面淡出时长 (ms)
const SUB_FADE_IN_DURATION = 260;   // 二级页面淡入时长 (ms)

const MAX_LOAD_WAIT = 8000;         // 极端网络异常下的最大安全等待上限 (ms)
const SAFETY_AUTO_RESET = 4500;     // 极端路由异常下的自动重置保护 (ms)

function getInitialState() {
  if (typeof window === 'undefined') return 'idle';
  const path = window.location.pathname.split('?')[0].split('#')[0];
  const firstLevelPaths = ['/', '/events', '/shifts', '/profile', '/admin', '/login'];
  return firstLevelPaths.includes(path) ? 'curtain-initial' : 'idle';
}

const initialTransitionState = getInitialState();
export const transitionState = ref(initialTransitionState);
// 'idle': 常规静止状态
// --- 一级页面（幕布过渡） ---
// 'curtain-initial': 阶段一（初次进入/刷新专属）：幕布开屏全透起手，字迹迅速浮现，无旧画面模糊等待
// 'to-blank': 阶段一（常规切换）：当前画面先施加模糊 (blur)，随后过渡切入幕布
// 'at-blank': 阶段二：幕布停留，等待新页面组件挂载及初始数据请求全部完成
// 'to-target': 阶段三：幕布平滑淡出 (fade-out)，显露加载完成的新画面
// --- 二级页面（轻量淡入淡出过渡） ---
// 'sub-fade-out': 阶段一：当前页面平缓淡出并微幅上移
// 'sub-wait': 阶段二：透明态下切换路由并等待二级页面数据就绪
// 'sub-fade-in': 阶段三：二级目标页面平缓淡入并归位

export const isTransitioning = ref(initialTransitionState === 'curtain-initial');
let currentTransitionType = initialTransitionState === 'curtain-initial' ? 'curtain' : 'none';
let currentSessionId = 0;
let safetyTimer = null;

// ==================== 全局物理与事件交互彻底阻断机制 ====================
const SCROLL_KEYS = new Set([
  'Space', 'PageUp', 'PageDown', 'End', 'Home',
  'ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'Tab'
]);

function preventDefaultEvent(e) {
  if (e.cancelable) {
    e.preventDefault();
  }
  e.stopPropagation();
  return false;
}

function handleKeyDown(e) {
  if (SCROLL_KEYS.has(e.code) || SCROLL_KEYS.has(e.key)) {
    if (e.cancelable) {
      e.preventDefault();
    }
    e.stopPropagation();
    return false;
  }
}

let isInteractionsLocked = false;
let savedScrollY = 0;

export function updateLockedScrollPosition(newY = 0) {
  savedScrollY = newY;
}

function lockScrollPosition() {
  if (isInteractionsLocked && typeof window !== 'undefined') {
    window.scrollTo(0, savedScrollY);
  }
}

function lockAllInteractions() {
  if (typeof window === 'undefined' || isInteractionsLocked) return;
  isInteractionsLocked = true;
  savedScrollY = window.scrollY || window.pageYOffset || 0;

  document.documentElement.classList.add('is-navigating');
  document.body.classList.add('is-navigating');

  window.addEventListener('wheel', preventDefaultEvent, { passive: false, capture: true });
  window.addEventListener('touchmove', preventDefaultEvent, { passive: false, capture: true });
  window.addEventListener('keydown', handleKeyDown, { capture: true });
  window.addEventListener('scroll', lockScrollPosition, { passive: false, capture: true });
}

function unlockAllInteractions() {
  if (typeof window === 'undefined' || !isInteractionsLocked) return;
  isInteractionsLocked = false;

  document.documentElement.classList.remove('is-navigating');
  document.body.classList.remove('is-navigating');

  window.removeEventListener('wheel', preventDefaultEvent, { capture: true });
  window.removeEventListener('touchmove', preventDefaultEvent, { capture: true });
  window.removeEventListener('keydown', handleKeyDown, { capture: true });
  window.removeEventListener('scroll', lockScrollPosition, { capture: true });
}

if (initialTransitionState === 'curtain-initial') {
  lockAllInteractions();
  armSafetyTimer();
}

// 追踪当前正在进行中的 API 请求数量
let activeRequests = 0;
const idleResolvers = new Set();

export function onRequestStart() {
  activeRequests++;
}

export function onRequestEnd() {
  activeRequests = Math.max(0, activeRequests - 1);
  if (activeRequests === 0 && idleResolvers.size > 0) {
    idleResolvers.forEach((resolve) => resolve());
    idleResolvers.clear();
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nextFrame() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      window.requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 16);
    }
  });
}

function waitForRequestsIdle(timeoutMs) {
  if (activeRequests === 0) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      idleResolvers.delete(onIdle);
      resolve();
    }, timeoutMs);

    function onIdle() {
      clearTimeout(timer);
      idleResolvers.delete(onIdle);
      resolve();
    }

    idleResolvers.add(onIdle);
  });
}

/**
 * 等待新页面真正加载完成：
 * 1. 等待 Vue 组件挂载与 onMounted 钩子触发
 * 2. 若页面发起了 API 数据请求（含串行 await 请求链），等待所有请求响应完毕
 * 3. 等待 Vue 将响应数据渲染到 DOM 并完成下一帧绘制
 */
async function waitForPageReady(minHoldMs = 0) {
  const startTime = Date.now();

  // 确保新路由组件已完成 setup 与 onMounted 同步阶段执行
  await nextTick();
  await wait(0);

  // 循环等待所有在 onMounted 中发起的请求（兼容串行 await 请求链）
  while (activeRequests > 0) {
    const elapsed = Date.now() - startTime;
    const remaining = MAX_LOAD_WAIT - elapsed;
    if (remaining <= 0) break;

    await waitForRequestsIdle(remaining);
    // 给串行异步函数（如 await req1(); await req2();）及 Vue 状态更新留出微任务/帧窗口
    await nextTick();
    await wait(20);
  }

  // 确保最终数据已挂载到 DOM 并准备就绪
  await nextTick();
  await nextFrame();

  if (minHoldMs > 0) {
    const totalElapsed = Date.now() - startTime;
    if (totalElapsed < minHoldMs) {
      await wait(minHoldMs - totalElapsed);
    }
  }
}

function armSafetyTimer() {
  if (safetyTimer) clearTimeout(safetyTimer);
  safetyTimer = setTimeout(() => {
    if (isTransitioning.value) {
      resetTransition();
    }
  }, SAFETY_AUTO_RESET);
}

// 一级页面：启动模糊 + 幕布切入（带防重入锁）
export async function startSlideToBlank() {
  if (isTransitioning.value) return;
  const sessionId = ++currentSessionId;
  isTransitioning.value = true;
  lockAllInteractions();
  currentTransitionType = 'curtain';
  transitionState.value = 'to-blank';
  armSafetyTimer();

  await wait(ENTER_CURTAIN_DURATION);
  if (sessionId !== currentSessionId) return;
  transitionState.value = 'at-blank';
}

// 首次进入/刷新一级页面：直接以初始幕布起手，无需等待旧画面模糊
export function startInitialCurtain() {
  const sessionId = ++currentSessionId;
  isTransitioning.value = true;
  lockAllInteractions();
  currentTransitionType = 'curtain';
  transitionState.value = 'curtain-initial';
  armSafetyTimer();
}

// 二级页面：启动轻量淡出（带防重入锁）
export async function startSubPageFadeOut() {
  if (isTransitioning.value) return;
  const sessionId = ++currentSessionId;
  isTransitioning.value = true;
  lockAllInteractions();
  currentTransitionType = 'sub-fade';
  transitionState.value = 'sub-fade-out';
  armSafetyTimer();

  await wait(SUB_FADE_OUT_DURATION);
  if (sessionId !== currentSessionId) return;
  transitionState.value = 'sub-wait';
}

// 统一收尾：根据当前过渡类型执行幕布淡出或二级页面淡入
export async function finishSlideToTarget() {
  if (!isTransitioning.value) return;
  const sessionId = currentSessionId;

  if (currentTransitionType === 'sub-fade') {
    await waitForPageReady(0);
    if (sessionId !== currentSessionId) return;
    transitionState.value = 'sub-fade-in';
    await wait(SUB_FADE_IN_DURATION);
    if (sessionId !== currentSessionId) return;
    resetTransition();
    return;
  }

  // 一级页面幕布模式
  const holdMs = transitionState.value === 'curtain-initial' ? INITIAL_CURTAIN_HOLD : MIN_CURTAIN_HOLD;
  await waitForPageReady(holdMs);
  if (sessionId !== currentSessionId) return;
  transitionState.value = 'to-target';
  await wait(FADE_OUT_DURATION);
  if (sessionId !== currentSessionId) return;
  resetTransition();
}

export function resetTransition() {
  if (safetyTimer) {
    clearTimeout(safetyTimer);
    safetyTimer = null;
  }
  currentSessionId++;
  transitionState.value = 'idle';
  currentTransitionType = 'none';
  isTransitioning.value = false;
  unlockAllInteractions();
}
