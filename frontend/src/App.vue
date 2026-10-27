<template>
  <Navbar />
  <div class="main-content" :class="{ 'is-navigating': isTransitioning }">
    <!-- 页面切换滑动视口 -->
    <div class="route-slider-viewport">
      <!-- 页面视图主体内容 -->
      <div 
        class="stage-content"
        :class="{
          'slide-out-left': transitionState === 'to-blank',
          'target-slide-in': transitionState === 'to-target',
          'at-blank-hidden': transitionState === 'at-blank'
        }"
      >
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </div>

      <!-- 极简机能过渡幕布层（固定视口定位，不受滚动条影响，保持视口上下绝对居中） -->
      <div 
        v-if="transitionState !== 'idle'" 
        class="stage-blank"
        :class="{
          'blank-slide-in': transitionState === 'to-blank',
          'blank-centered': transitionState === 'at-blank',
          'blank-slide-out': transitionState === 'to-target'
        }"
        aria-hidden="true"
      >
        <div class="blank-inner">
          <div class="minimal-brand-type">
            <div class="line-mask">
              <span class="type-line line-1">ANSHEN</span>
            </div>
            <div class="line-mask">
              <span class="type-line line-2">VOLUNTEER</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <footer class="footer">
    <p>© 2026 校园志愿者服务平台 | 让爱心点亮校园</p>
  </footer>
</template>

<script setup>
import Navbar from './components/Navbar.vue';
import { transitionState, isTransitioning } from './services/pageTransition';
</script>

<style scoped>
.main-content {
  flex: 1;
  padding: 20px 0;
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
  overflow-x: hidden;
}

/* 导航过渡中时禁止干扰点击 */
.main-content.is-navigating {
  pointer-events: none;
}

/* 页面切换滑动视口 */
.route-slider-viewport {
  position: relative;
  width: 100%;
  max-width: 100vw;
  min-height: calc(100vh - 170px);
  min-height: calc(100dvh - 170px);
  overflow-x: hidden;
  overflow-y: visible;
  box-sizing: border-box;
}

/* 页面主体内容层 */
.stage-content {
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  will-change: transform;
  backface-visibility: hidden;
  transform: translate3d(0, 0, 0);
}

/* 阶段一：原有页面向左划出到空白过渡页面 */
.stage-content.slide-out-left {
  animation: contentSlideOutLeft 300ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
  pointer-events: none;
}

/* 阶段二：过渡空白页面在中央停留时，隐藏并预备新页面 */
.stage-content.at-blank-hidden {
  opacity: 0;
  pointer-events: none;
}

/* 阶段三：加载完成后向左划出到目标页面 */
.stage-content.target-slide-in {
  animation: targetSlideInLeft 300ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
  pointer-events: none;
}

@keyframes contentSlideOutLeft {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(-100%, 0, 0);
  }
}

@keyframes targetSlideInLeft {
  from {
    transform: translate3d(100%, 0, 0);
    opacity: 1;
  }
  to {
    transform: translate3d(0, 0, 0);
    opacity: 1;
  }
}

/* 过渡页面幕布层：固定于视口 (100vw × 100dvh)，不受页面滚动条影响 */
.stage-blank {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  box-sizing: border-box;
  z-index: 90;
  pointer-events: none;
  background-color: var(--bg-color);
  will-change: transform;
  backface-visibility: hidden;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

/* 阶段一：空白过渡页面从右侧向左划入 */
.stage-blank.blank-slide-in {
  animation: blankSlideInLeft 300ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
}

/* 阶段二：空白过渡页面在中央停留 */
.stage-blank.blank-centered {
  transform: translate3d(0, 0, 0);
}

/* 阶段三：空白过渡页面向左划出，露出目标页面 */
.stage-blank.blank-slide-out {
  animation: blankSlideOutLeft 300ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
}

@keyframes blankSlideInLeft {
  from {
    transform: translate3d(100%, 0, 0);
  }
  to {
    transform: translate3d(0, 0, 0);
  }
}

@keyframes blankSlideOutLeft {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(-100%, 0, 0);
  }
}

/* 上下绝对居中、靠左对齐容器 */
.blank-inner {
  width: 100%;
  max-width: 1020px;
  margin: 0 auto;
  padding: 0 clamp(24px, 6vw, 48px);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

/* 极简机能排版：无冗余装饰，仅靠字重、紧凑字距与利落遮罩切入 */
.minimal-brand-type {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  user-select: none;
}

.line-mask {
  overflow: hidden;
}

.type-line {
  display: block;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: clamp(2.2rem, 5.5vw, 4rem);
  font-weight: 900;
  line-height: 0.96;
  letter-spacing: -0.03em;
  color: #012030;
  text-transform: uppercase;
  will-change: transform;
  transform: translate3d(0, 105%, 0);
  animation: lineRise 260ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.line-2 {
  animation-delay: 55ms;
}

@keyframes lineRise {
  from {
    transform: translate3d(0, 105%, 0);
  }
  to {
    transform: translate3d(0, 0, 0);
  }
}

.footer {
  text-align: center;
  padding: 20px;
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-top: 40px;
}

/* 手机移动端全面适配 */
@media (max-width: 768px) {
  .main-content {
    padding: 12px 0;
    width: 100%;
    overflow-x: hidden;
  }

  .route-slider-viewport {
    width: 100%;
    max-width: 100vw;
    min-height: calc(100vh - 130px);
    min-height: calc(100dvh - 130px);
  }

  .stage-content {
    width: 100%;
    max-width: 100vw;
    min-height: calc(100vh - 130px);
    min-height: calc(100dvh - 130px);
  }

  .footer {
    padding: 16px 10px;
    margin-top: 20px;
    font-size: 0.82rem;
  }
}
</style>
