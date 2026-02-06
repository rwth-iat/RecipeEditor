<template>
  <div id="addElements" class="settings">
    <div class="dialog-header">
      <h3>Add {{ elementType }}</h3>
      <button class="close-btn" @click="$emit('close')" title="Close">
        <span class="icon--red">x</span>
      </button>
    </div>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  elementType: String
});

defineEmits(['close']);
</script>

<style lang="scss" scoped>
.settings {
  position: absolute;
  z-index: 5;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 370px;
  background: #23272f;
  border-radius: 16px;
  border: 1.5px solid #bfc9d1;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  padding: 24px 32px 24px 32px;
  justify-content: center;
  align-items: center;
  color: #f4f6fa;
  transition: box-shadow 0.2s, border 0.2s;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
  border-bottom: 1px solid #e0e4ea;
  padding-bottom: 8px;
}

.dialog-header h3 {
  color: #fff;
  font-weight: 700;
  font-size: 1.25rem;
  margin: 0;
  letter-spacing: 0.5px;
}

.close-btn {
  background: none;
  border: none;
  color: #e74c3c;
  font-size: 1.7rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 50%;
  transition: background 0.2s, box-shadow 0.2s;
  box-shadow: none;
  margin-left: 8px;
}

.close-btn:hover {
  background: #ffeaea;
  box-shadow: 0 2px 8px rgba(231,76,60,0.12);
}

:deep(.section-divider) {
  border-top: 1px solid #e0e4ea;
  margin: 20px 0 18px 0;
}

:deep(.dialog-form) {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
}

:deep(.row-flex) {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 0;
}

:deep(.icon-btn) {
  background: none;
  border: none;
  color: #007bff;
  font-size: 1.3rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 50%;
  transition: background 0.2s;
}

:deep(.icon-btn:hover) {
  background: #e0eaff;
}

:deep(.button) {
  margin-left: 0;
  margin-bottom: 0;
  padding: 10px 22px;
  font-size: 1.08rem;
  font-weight: 600;
  color: #fff;
  background-color: #28a745;
  border-radius: 7px;
  border: none;
  box-shadow: 0 2px 8px rgba(40,167,69,0.08);
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
}

:deep(.button:disabled) {
  background-color: #bfc9d1;
  color: #fff;
  cursor: not-allowed;
  box-shadow: none;
}

:deep(.button:hover:not(:disabled)) {
  background-color: #218838;
  box-shadow: 0 4px 16px rgba(40,167,69,0.13);
}

:deep(select),
:deep(input[type="file"]),
:deep(input[type="url"]),
:deep(input[type="text"]) {
  background-color: #fff;
  border: 1.2px solid #bfc9d1;
  border-radius: 5px;
  padding: 7px 10px;
  font-size: 1rem;
  color: #222;
  margin-top: 2px;
  margin-bottom: 2px;
  width: 100%;
  box-sizing: border-box;
  transition: border 0.2s;
}

:deep(select:focus),
:deep(input[type="file"]:focus),
:deep(input[type="url"]:focus),
:deep(input[type="text"]:focus) {
  border: 1.2px solid #007bff;
  outline: none;
}

:deep(label) {
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
  margin-top: 4px;
}

:deep(.processing-progress) {
  margin-top: 10px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 5px;
  border: 1px solid #dee2e6;
}

:deep(.progress-bar) {
  width: 100%;
  height: 20px;
  background-color: #e9ecef;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 10px;
}

:deep(.progress-fill) {
  height: 100%;
  background-color: #007bff;
  width: 0%;
  animation: progress-animation 2s ease-in-out infinite;
}

@keyframes progress-animation {
  0% { width: 0%; }
  50% { width: 70%; }
  100% { width: 100%; }
}

:deep(.processing-progress p) {
  margin: 0;
  color: #495057;
  font-weight: 500;
  text-align: center;
}

:deep(.uploader-section) {
  background: #2d323c;
  border: 1px solid #444a58;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  padding: 16px 18px 14px 18px;
  margin-top: 18px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

:deep(.uploader-section span) {
  font-size: 1rem;
  font-weight: 500;
  color: #f4f6fa;
  margin-bottom: 6px;
  text-align: left;
}

:deep(.uploader-section input[type="file"]) {
  background: #23272f;
  border: 1px solid #444a58;
  border-radius: 6px;
  padding: 7px 10px;
  font-size: 0.98rem;
  color: #f4f6fa;
  margin-bottom: 0;
  transition: border 0.2s, box-shadow 0.2s;
}

:deep(.uploader-section input[type="file"]:hover),
:deep(.uploader-section input[type="file"]:focus) {
  border: 1.5px solid #6ca0f6;
  box-shadow: 0 0 0 2px #23272f;
}

:deep(.uploader-section button) {
  margin-top: 8px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 18px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s, box-shadow 0.18s;
  box-shadow: 0 1px 4px rgba(59,130,246,0.08);
}

:deep(.uploader-section button:hover) {
  background: #2563eb;
  box-shadow: 0 2px 8px rgba(59,130,246,0.13);
}

:deep(.dialog-form label),
:deep(.dialog-form span),
:deep(.dialog-form select),
:deep(.dialog-form option),
:deep(.dialog-form input),
:deep(.dialog-form textarea) {
  color: #e0e4ea !important;
}

:deep(.dialog-form select) {
  background-color: #f4f6fa !important;
  color: #23272f !important;
  border: 1px solid #444a58;
}

:deep(.dialog-form input),
:deep(.dialog-form textarea) {
  background: #23272f;
  border: 1px solid #444a58;
  color: #e0e4ea;
}

:deep(.dialog-form select:focus),
:deep(.dialog-form input:focus),
:deep(.dialog-form textarea:focus) {
  border: 1.5px solid #6ca0f6;
  outline: none;
}

:deep(.dialog-form select option) {
  color: #23272f !important;
  background: #f4f6fa !important;
}
</style>
