<script setup lang="ts">
defineOptions({ name: "AppButton" });

withDefaults(
  defineProps<{
    type?: "button" | "submit";
    loading?: boolean;
    disabled?: boolean;
  }>(),
  {
    type: "button",
    loading: false,
    disabled: false,
  },
);
</script>

<template>
  <button :type="type" :disabled="disabled || loading" class="btn-primary">
    <span v-if="loading" class="spinner"></span>
    <span v-else>
      <slot />
    </span>
  </button>
</template>

