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
  background: #ffffff;
  border: 2px solid #012030;
  border-radius: 2px;
  box-shadow: 6px 6px 0px #012030;
}

h1 {
  font-size: 2.5rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #012030 0%, #13678A 55%, #45C4B0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 16px;
}

.subtitle {
  font-size: 1.25rem;
  font-weight: 600;
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
  background: #ffffff;
  border: 2px solid #012030;
  border-radius: 2px;
  box-shadow: 4px 4px 0px #012030;
  transition: transform 0.15s, box-shadow 0.15s, background-color 0.15s;
}

.feature-card:hover {
  transform: translate(-2px, -2px);
  background: #DAFDBA;
  box-shadow: 7px 7px 0px #012030;
}

.icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

h3 {
  color: #012030;
  font-weight: 800;
  letter-spacing: 0.02em;
  margin-bottom: 8px;
}

p {
  color: #13678A;
  font-weight: 500;
  font-size: 0.95rem;
}
</style>
