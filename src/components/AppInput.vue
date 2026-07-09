<script setup lang="ts">
defineOptions({ name: "AppInput" });

withDefaults(
  defineProps<{
    id: string;
    label?: string;
    type?: string;
    modelValue: string;
    placeholder?: string;
    error?: string;
    autocomplete?: string;
    disabled?: boolean;
    required?: boolean;
  }>(),
  {
    type: "text",
    placeholder: "",
    error: "",
    autocomplete: "off",
    disabled: false,
    required: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  blur: [];
}>();

function onInput(e: Event) {
  const target = e.target as HTMLInputElement;
  emit("update:modelValue", target.value);
}
</script>

<template>
  <div class="input-group">
    <label v-if="label" :for="id" class="input-label">
      {{ label }}
    </label>
    <div class="input-wrapper" :class="{ 'input-error': !!error }">
      <!-- Leading icon -->
      <div v-if="$slots.leading" class="input-icon">
        <slot name="leading" />
      </div>

      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :disabled="disabled"
        :required="required"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${id}-error` : undefined"
        class="input-field"
        :class="{ 'has-leading': !!$slots.leading, 'has-trailing': !!$slots.trailing }"
        @input="onInput"
        @blur="emit('blur')"
      />

      <!-- Trailing icon -->
      <div v-if="$slots.trailing" class="input-trailing">
        <slot name="trailing" />
      </div>
    </div>

    <!-- Error -->
    <Transition name="err-fade">
      <span v-if="error" :id="`${id}-error`" class="error-text" role="alert">{{ error }}</span>
    </Transition>
  </div>
</template>

