<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <h2>欢迎使用校园志愿者报名系统</h2>
      <h3>使用须知</h3>
      <p>为了维护良好的报名环境，请同学们注意：</p>
      <ul>
        <li>请填写真实有效的个人信息，方便我们联系。</li>
        <li>请勿重复报名或填写无关信息。</li>
        <li>若报名后因故无法参加，请务必及时联系活动负责人说明情况，以便我们将名额留给其他同学。</li>
      </ul>
      <button @click="close">我已阅读并了解</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show: Boolean
});
const emit = defineEmits(['close']);

const close = () => {
  emit('close');
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(1, 32, 48, 0.65);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.modal-content {
  background: white;
  padding: 32px;
  border-radius: 2px;
  width: 90%;
  max-width: 500px;
  text-align: center;
  border: 3px solid #012030;
  box-shadow: 8px 8px 0px #012030;
}
h2 { color: #012030; font-weight: 800; }
h3 { color: #13678A; font-weight: 700; }
p, li { color: #012030; font-weight: 500; }
ul { text-align: left; margin: 20px; }
li { margin-bottom: 10px; }
button {
  padding: 12px 28px;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  background: #45C4B0;
  color: #012030;
  border: 2px solid #012030;
  border-radius: 2px;
  cursor: pointer;
  box-shadow: 3px 3px 0px #012030;
  transition: all 0.15s;
}
button:hover {
  background: #9AEBA3;
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0px #012030;
}
button:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0px #012030;
}
</style>