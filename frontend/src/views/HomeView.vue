<template>
  <div class="home-container">
    <div class="hero-section glass-panel">
      <h1>👋 欢迎来到校园志愿星火</h1>
      <p class="subtitle">连接爱心，服务校园，记录你的每一份贡献</p>
      
      <div class="action-buttons">
        <router-link to="/events" class="btn-primary">浏览活动</router-link>
        <router-link to="/shifts" class="btn-secondary">周常岗位</router-link>
      </div>
    </div>

    <div class="features-grid">
      <div class="feature-card glass-panel">
        <div class="icon">📅</div>
        <h3>轻松报名</h3>
        <p>一键报名各类校园活动，实时查看剩余名额。</p>
      </div>
      <div class="feature-card glass-panel">
        <div class="icon">⏱️</div>
        <h3>时长记录</h3>
        <p>自动累计志愿服务时长，生成你的专属志愿履历。</p>
      </div>
      <div class="feature-card glass-panel">
        <div class="icon">🏆</div>
        <h3>荣誉激励</h3>
        <p>参与更多活动，解锁志愿成就，成为校园之星。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
  padding: 40px 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.hero-section {
  text-align: center;
  padding: 60px 40px;
  width: 100%;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(69, 196, 176, 0.3);
  box-shadow: 0 8px 32px rgba(1, 32, 48, 0.08);
}

h1 {
  font-size: 2.5rem;
  background: linear-gradient(135deg, #012030 0%, #13678A 55%, #45C4B0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 16px;
}

.subtitle {
  font-size: 1.25rem;
  color: #13678A;
  margin-bottom: 32px;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  width: 100%;
}

.feature-card {
  padding: 30px;
  text-align: center;
  transition: transform 0.3s, border-color 0.3s, box-shadow 0.3s;
  border: 1px solid rgba(69, 196, 176, 0.25);
}

.feature-card:hover {
  transform: translateY(-5px);
  border-color: #45C4B0;
  box-shadow: 0 12px 28px rgba(1, 32, 48, 0.1);
}

.icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

h3 {
  color: #012030;
  margin-bottom: 8px;
}

p {
  color: #13678A;
  font-size: 0.95rem;
}
</style>
