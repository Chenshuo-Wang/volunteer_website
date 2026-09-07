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
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(69, 196, 176, 0.3);
  box-shadow: 0 4px 20px rgba(1, 32, 48, 0.06);
}

.nav-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
}

.logo {
  font-size: 1.2rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  color: #012030;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-item {
  font-weight: 600;
  color: #13678A;
  text-decoration: none;
  font-size: 0.95rem;
  padding: 6px 12px;
  border-radius: 8px;
  transition: all 0.2s;
}

.nav-item:hover, .router-link-active {
  color: #012030;
  background: #DAFDBA;
}

.admin-link {
  color: #13678A;
  font-weight: 700;
}

.admin-link:hover {
  color: #012030;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-logout {
  background: none;
  border: 1px solid rgba(19, 103, 138, 0.3);
  color: #13678A;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-logout:hover {
  background: #DAFDBA;
  color: #012030;
  border-color: #45C4B0;
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
