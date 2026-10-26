import { ref, nextTick } from 'vue';

export const transitionState = ref('idle');
// 'idle': 常规状态
// 'to-blank': 阶段一：原有页面向左划出，空白过渡页面向左划入
// 'at-blank': 阶段二：处于空白过渡页面，等待页面加载完成
// 'to-target': 阶段三：空白过渡页面向左划出，目标页面向左划入

export const isTransitioning = ref(false);

const SLIDE_DURATION = 300; // 划动过渡动画持续时间 (ms)
const BLANK_LOAD_WAIT = 220; // 停留在空白过渡页面的加载时长 (ms)

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function startSlideToBlank() {
  isTransitioning.value = true;
  transitionState.value = 'to-blank';
  await wait(SLIDE_DURATION);
  transitionState.value = 'at-blank';
}

export async function finishSlideToTarget() {
  await nextTick();
  // 保持在过渡页面（暂时留做空白），等待加载完成
  await wait(BLANK_LOAD_WAIT);
  transitionState.value = 'to-target';
  await wait(SLIDE_DURATION);
  resetTransition();
}

export function resetTransition() {
  transitionState.value = 'idle';
  isTransitioning.value = false;
}
