import { ref, nextTick } from 'vue';

export const transitionState = ref('idle');
// 'idle': 常规状态
// 'to-blank': 阶段一：原有页面向左划出，空白过渡页面向左划入
// 'at-blank': 阶段二：处于空白过渡页面，等待新页面组件挂载及初始数据请求全部完成
// 'to-target': 阶段三：空白过渡页面向左划出，目标页面向左划入

export const isTransitioning = ref(false);

const SLIDE_DURATION = 300; // 划动过渡动画持续时间 (ms)
const MAX_LOAD_WAIT = 8000; // 极端网络异常下的最大安全等待上限 (ms)

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
async function waitForPageReady() {
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
}

export async function startSlideToBlank() {
  isTransitioning.value = true;
  transitionState.value = 'to-blank';
  await wait(SLIDE_DURATION);
  transitionState.value = 'at-blank';
}

export async function finishSlideToTarget() {
  // 阶段二仅在新页面（DOM 挂载 + 初始异步数据加载与渲染）完成后结束
  await waitForPageReady();
  transitionState.value = 'to-target';
  await wait(SLIDE_DURATION);
  resetTransition();
}

export function resetTransition() {
  transitionState.value = 'idle';
  isTransitioning.value = false;
}
