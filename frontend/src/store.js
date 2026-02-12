import { reactive } from 'vue';

export const store = reactive({
  user: JSON.parse(localStorage.getItem('user')) || null,

  login(userData) {
    this.user = userData;
    localStorage.setItem('user', JSON.stringify(userData));
  },

  logout() {
    this.user = null;
    localStorage.removeItem('user');
  },

  updateUser(newData) {
    this.user = { ...this.user, ...newData };
    localStorage.setItem('user', JSON.stringify(this.user));
  }
});
