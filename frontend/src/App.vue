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

      <!-- 机能先锋过渡幕布层（固定视口定位，不受滚动条位置影响，始终保持视口绝对垂直居中） -->
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
          <div class="tech-brand-block">
            <!-- 左侧机能立柱结构线 -->
            <div class="tech-spine"></div>

            <div class="tech-typography">
              <!-- 机能遥测微标 -->
              <div class="tech-telemetry">
                <span class="telemetry-dot"></span>
                <span class="telemetry-code">SYS // TRANSIT_STAGE</span>
              </div>

              <!-- 第一行：ANSHEN -->
              <div class="line-mask">
                <div class="tech-line line-anshen">ANSHEN</div>
              </div>

              <!-- 第二行：VOLUNTEER -->
              <div class="line-mask">
                <div class="tech-line line-volunteer">
                  <span>VOLUNTEER</span>
                </div>
              </div>

              <!-- 底部机能扫描刻度尺 -->
              <div class="tech-rule"></div>
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

/* 
 * 过渡页面幕布层：
 * 使用 position: fixed 锁定浏览器可视窗口 (100vw × 100dvh)，
 * 彻底脱离文档流滚动位置影响，确保文字在任何滚动高度下始终保持屏幕上下绝对居中。
 */
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

/* 内部对齐容器：上下绝对居中，水平靠左对齐 */
.blank-inner {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 clamp(24px, 6vw, 72px);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

/* ==================== 机能先锋 (Techwear Avant-Garde) 视觉与零流量 GPU 动画 ==================== */
.tech-brand-block {
  display: flex;
  align-items: stretch;
  gap: 18px;
  text-align: left;
  user-select: none;
}

/* 左侧机能结构立柱 */
.tech-spine {
  width: 6px;
  background: #012030;
  position: relative;
  transform-origin: top center;
  animation: spineDeploy 240ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.tech-spine::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 36%;
  background: #45C4B0;
}

.tech-typography {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

/* 顶部机能状态微标 */
.tech-telemetry {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  opacity: 0;
  animation: telemetryFadeIn 200ms ease-out 40ms forwards;
}

.telemetry-dot {
  width: 7px;
  height: 7px;
  background: #45C4B0;
  border: 1.5px solid #012030;
  animation: dotPulse 600ms steps(2, start) infinite;
}

.telemetry-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  color: #13678A;
}

/* 裁切遮罩：实现机械快门式上浮切入 */
.line-mask {
  overflow: hidden;
  padding: 2px 6px 4px 0;
}

.tech-line {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-weight: 900;
  line-height: 0.94;
  text-transform: uppercase;
  will-change: transform;
  backface-visibility: hidden;
}

/* 第一行：ANSHEN */
.line-anshen {
  font-size: clamp(2.6rem, 6.5vw, 4.8rem);
  letter-spacing: 0.06em;
  color: #012030;
  text-shadow: 3px 3px 0px #DAFDBA;
  transform: translate3d(0, 110%, 0);
  animation: shutterSliceUp 260ms cubic-bezier(0.16, 1, 0.3, 1) 25ms forwards;
}

/* 第二行：VOLUNTEER（反色机能装甲块） */
.line-volunteer {
  margin-top: 6px;
  font-size: clamp(2.2rem, 5.5vw, 4.1rem);
  letter-spacing: 0.04em;
  color: #DAFDBA;
  background: #012030;
  padding: 4px 16px 6px 12px;
  border-right: 8px solid #45C4B0;
  box-shadow: 4px 4px 0px #13678A;
  transform: translate3d(0, 115%, 0);
  animation: shutterSliceUp 280ms cubic-bezier(0.16, 1, 0.3, 1) 80ms forwards;
}

/* 底部机能扫描横线 */
.tech-rule {
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, #012030 70%, #45C4B0 70%);
  margin-top: 12px;
  transform-origin: left center;
  transform: scaleX(0);
  animation: ruleSweep 300ms cubic-bezier(0.16, 1, 0.3, 1) 110ms forwards;
}

@keyframes shutterSliceUp {
  0% {
    transform: translate3d(-12px, 110%, 0) skewX(-6deg);
  }
  100% {
    transform: translate3d(0, 0, 0) skewX(0deg);
  }
}

@keyframes spineDeploy {
  0% {
    transform: scaleY(0);
  }
  100% {
    transform: scaleY(1);
  }
}

@keyframes ruleSweep {
  0% {
    transform: scaleX(0);
  }
  100% {
    transform: scaleX(1);
  }
}

@keyframes telemetryFadeIn {
  from {
    opacity: 0;
    transform: translate3d(-8px, 0, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes dotPulse {
  0%, 100% {
    background-color: #45C4B0;
  }
  50% {
    background-color: #DAFDBA;
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

  .tech-brand-block {
    gap: 12px;
  }

  .tech-spine {
    width: 4px;
  }

  .line-volunteer {
    padding: 3px 12px 5px 10px;
    border-right-width: 6px;
  }

  .footer {
    padding: 16px 10px;
    margin-top: 20px;
    font-size: 0.82rem;
  }
}
</style>
