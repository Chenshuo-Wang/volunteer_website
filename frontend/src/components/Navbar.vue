<template>
  <nav class="navbar glass-panel">
    <div class="container nav-content">
      <router-link to="/" class="logo">
        <span class="logo-icon">🌿</span>
        <span class="logo-text">志愿星火</span>
      </router-link>
      
      <div class="nav-links">
        <router-link to="/events" class="nav-item">活动</router-link>
        <router-link to="/shifts" class="nav-item">周常</router-link>
        
        <!-- 管理员入口 -->
        <router-link 
          v-if="store.user?.isAdmin" 
          to="/admin" 
          class="nav-item admin-link"
        >
          🛡️ 管理
        </router-link>
        
        <div v-if="store.user" class="user-menu">
          <router-link to="/profile" class="nav-item profile-link">
            👤 {{ store.user.name }}
          </router-link>
          <button @click="handleLogout" class="btn-logout">退出</button>
        </div>
        
        <router-link v-else to="/login" class="btn-primary login-btn">登录</router-link>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { store } from '../store';
import { useRouter } from 'vue-router';

const router = useRouter();

const handleLogout = () => {
  store.logout();
  router.push('/');
};
</script>

<style scoped>
.navbar {
  position: sticky;
  top: 10px;
  margin: 0 10px;
  z-index: 100;
  border-radius: 2px;
  background: #ffffff;
  border: 2px solid #012030;
  box-shadow: 4px 4px 0px #012030;
}

.nav-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
}

.logo {
  font-size: 1.25rem;
  font-weight: 900;
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: #012030;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-item {
  font-weight: 700;
  letter-spacing: 0.03em;
  color: #13678A;
  text-decoration: none;
  font-size: 0.95rem;
  padding: 6px 12px;
  border-radius: 2px;
  border: 1px solid transparent;
  transition: all 0.15s;
}

.nav-item:hover, .router-link-active {
  color: #012030;
  background: #DAFDBA;
  border: 1px solid #012030;
  box-shadow: 2px 2px 0px #012030;
}

.admin-link {
  color: #13678A;
  font-weight: 800;
}

.admin-link:hover {
  color: #012030;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-logout {
  background: #DAFDBA;
  border: 2px solid #012030;
  color: #012030;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  padding: 4px 10px;
  border-radius: 2px;
  box-shadow: 2px 2px 0px #012030;
  transition: all 0.15s;
}

.btn-logout:hover {
  background: #45C4B0;
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0px #012030;
}

.btn-logout:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0px #012030;
}

.login-btn {
  padding: 6px 16px;
  font-size: 0.9rem;
}

/* Mobile responsive */
@media (max-width: 640px) {
  .logo-text { font-size: 1rem; }
  
  .nav-links {
    gap: 6px;
  }
  
  .nav-item { 
    font-size: 0.85rem; 
    padding: 6px 6px; 
  }
  
  .profile-link {
    max-width: 80px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
