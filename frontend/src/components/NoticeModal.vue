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
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.modal-content {
  background: white;
  padding: 30px;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  text-align: center;
}
ul { text-align: left; margin: 20px; }
li { margin-bottom: 10px; }
button {
  padding: 12px 25px;
  font-size: 1em;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
</style>