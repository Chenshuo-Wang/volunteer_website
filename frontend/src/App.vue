<template>
  <!-- 全局绝对物理阻断护盾：在一切动画过渡期间全屏覆盖，彻底拦截任何点击、滑动、拖拽与手势 -->
  <div 
    v-if="isTransitioning" 
    class="global-interaction-shield" 
    aria-hidden="true"
    @wheel.prevent.stop
    @touchmove.prevent.stop
    @touchstart.prevent.stop
    @mousedown.prevent.stop
    @click.prevent.stop
    @dblclick.prevent.stop
    @contextmenu.prevent.stop
  ></div>

  <Navbar />
  <div class="main-content" :class="{ 'is-navigating': isTransitioning }">
    <!-- 页面切换视口 -->
    <div class="route-slider-viewport">
      <!-- 页面视图主体内容 -->
      <div 
        class="stage-content"
        :class="{
          'content-blur-out': transitionState === 'to-blank',
          'content-at-blank': transitionState === 'at-blank' || transitionState === 'curtain-initial',
          'content-reveal': transitionState === 'to-target',
          'sub-page-fade-out': transitionState === 'sub-fade-out',
          'sub-page-wait': transitionState === 'sub-wait',
          'sub-page-fade-in': transitionState === 'sub-fade-in'
        }"
      >
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </div>

      <!-- 一级页面专属：极简机能过渡幕布层（二级页面切换时不挂载） -->
      <div 
        v-if="isCurtainVisible" 
        class="stage-blank"
        :class="{
          'curtain-enter': transitionState === 'to-blank',
          'curtain-initial': transitionState === 'curtain-initial',
          'curtain-hold': transitionState === 'at-blank',
          'curtain-fade-out': transitionState === 'to-target'
        }"
        aria-hidden="true"
      >
        <div class="blank-inner">
          <div class="minimal-brand-type">
            <div class="line-mask">
              <span class="type-line line-1">ANSHEN</span>
            </div>
            <div class="line-mask">
              <span class="type-line line-2">VOLUNTEER<span class="brand-dot">.</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <footer class="swiss-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <span class="footer-mark">ANSHEN VOLUNTEER<span class="brand-dot">.</span></span>
        <span class="footer-sub">CAMPUS CIVIC DISPATCH &amp; ARCHIVE</span>
      </div>
      <div class="footer-meta">
        <span>EDITION // 2026</span>
        <span class="meta-sep">/</span>
        <span>校园志愿者服务平台</span>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue';
import Navbar from './components/Navbar.vue';
import { transitionState, isTransitioning } from './services/pageTransition';

const isCurtainVisible = computed(() =>
  ['to-blank', 'at-blank', 'curtain-initial', 'to-target'].includes(transitionState.value)
);
</script>

<style scoped>
/* 全局绝对物理阻断护盾：最高层级阻断一切点击、悬停、右键与手势穿透 */
.global-interaction-shield {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  z-index: 999999;
  background: transparent;
  pointer-events: auto !important;
  touch-action: none !important;
  user-select: none !important;
  -webkit-user-select: none !important;
  cursor: default !important;
}

.main-content {
  flex: 1;
  padding: 0;
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
  overflow-x: hidden;
}

/* 导航过渡中时禁止干扰点击 */
.main-content.is-navigating {
  pointer-events: none;
}

/* 页面切换视口 */
.route-slider-viewport {
  position: relative;
  width: 100%;
  max-width: 100vw;
  min-height: calc(100vh - 150px);
  min-height: calc(100dvh - 150px);
  overflow-x: hidden;
  overflow-y: visible;
  box-sizing: border-box;
}

/* 页面主体内容层 */
.stage-content {
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  will-change: filter, transform, opacity;
  backface-visibility: hidden;
  transform: translate3d(0, 0, 0);
}

/* ==================== 一级页面过渡：Blur 模糊 + 幕布切入 ==================== */
.stage-content.content-blur-out {
  animation: screenBlurOut 380ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  pointer-events: none;
}

.stage-content.content-at-blank {
  opacity: 0;
  filter: none;
  pointer-events: none;
}

.stage-content.content-reveal {
  opacity: 1;
  filter: none;
  pointer-events: none;
}

@keyframes screenBlurOut {
  0% {
    filter: blur(0px);
    transform: scale(1);
  }
  100% {
    filter: blur(12px);
    transform: scale(0.985);
  }
}

/* ==================== 二级页面专属：轻量淡出与淡入动画 ==================== */
.stage-content.sub-page-fade-out {
  animation: subPageFadeOut 200ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
  pointer-events: none;
}

.stage-content.sub-page-wait {
  opacity: 0;
  pointer-events: none;
}

.stage-content.sub-page-fade-in {
  animation: subPageFadeIn 260ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  pointer-events: none;
}

@keyframes subPageFadeOut {
  0% {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
  100% {
    opacity: 0;
    transform: translate3d(0, -6px, 0);
  }
}

@keyframes subPageFadeIn {
  0% {
    opacity: 0;
    transform: translate3d(0, 8px, 0);
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

/* 过渡页面幕布层：固定于视口 (100vw × 100dvh)，不受页面滚动条影响，整体上下与左右居中，全屏物理阻断点击 */
.stage-blank {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  box-sizing: border-box;
  z-index: 120;
  pointer-events: auto;
  cursor: default;
  background-color: var(--bg-color);
  will-change: opacity;
  backface-visibility: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 阶段一（初次进入/刷新专属）：幕布开屏即完全呈现，字迹快速优雅升起 */
.stage-blank.curtain-initial {
  opacity: 1;
}

.stage-blank.curtain-initial .type-line {
  animation: lineRise 380ms cubic-bezier(0.16, 1, 0.3, 1) 60ms forwards;
}

.stage-blank.curtain-initial .line-2 {
  animation-delay: 140ms;
}

/* 阶段一（常规切换 220~650ms）：待当前画面模糊铺垫后，平缓切入幕布 */
.stage-blank.curtain-enter {
  opacity: 0;
  animation: curtainFadeIn 430ms cubic-bezier(0.22, 1, 0.36, 1) 220ms forwards;
}

/* 阶段二：幕布保持完全不透明，等待新页面加载就绪并优雅驻留 */
.stage-blank.curtain-hold {
  opacity: 1;
}

/* 阶段三：幕布平缓淡出，显露底层新画面 */
.stage-blank.curtain-fade-out {
  opacity: 1;
  animation: curtainFadeOut 450ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.stage-blank.curtain-fade-out .type-line {
  transform: translate3d(0, 0, 0);
  animation: none;
}

@keyframes curtainFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes curtainFadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

/* 视口整体居中容器 */
.blank-inner {
  width: 100%;
  max-width: 1020px;
  margin: 0 auto;
  padding: 0 clamp(24px, 6vw, 48px);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 文本块整体居中，内部字段保持严格靠左对齐 */
.minimal-brand-type {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  user-select: none;
}

.brand-dot {
  color: #45C4B0;
  display: inline-block;
  margin-left: 2px;
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
  animation: lineRise 380ms cubic-bezier(0.16, 1, 0.3, 1) 260ms forwards;
}

.line-2 {
  animation-delay: 340ms;
}

@keyframes lineRise {
  from {
    transform: translate3d(0, 105%, 0);
  }
  to {
    transform: translate3d(0, 0, 0);
  }
}

/* 瑞士排印版权栏页脚 */
.swiss-footer {
  border-top: var(--hairline);
  margin-top: 64px;
  padding: 28px 0;
  background-color: var(--bg-color);
}

.footer-inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 clamp(20px, 4vw, 48px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.footer-brand {
  display: flex;
  align-items: baseline;
  gap: 14px;
  flex-wrap: wrap;
}

.footer-mark {
  font-size: 0.85rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--c-dark);
}

.footer-sub {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  color: var(--text-subtle);
}

.footer-meta {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 10px;
}

.meta-sep {
  color: var(--text-subtle);
}

/* 手机移动端全面适配 */
@media (max-width: 768px) {
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

  .swiss-footer {
    margin-top: 40px;
    padding: 22px 0;
  }

  .footer-inner {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
