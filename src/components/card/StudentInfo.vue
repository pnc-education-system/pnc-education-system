<script setup lang="ts">
import { computed } from 'vue'
import type { Student } from '@/types/card'

const props = defineProps<{
  student: Student
  editable?: boolean
}>()

const emit = defineEmits<{
  'update:student': [value: Student]
}>()

const updateField = (field: keyof Student, value: string) => {
  emit('update:student', { ...props.student, [field]: value })
}
</script>

<template>
  <div>
    <h3 class="text-sm font-bold text-gray-800 mb-3">Student Information</h3>
    <div class="space-y-3">
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">Student Name</label>
        <input
          v-if="editable"
          type="text"
          :value="student.name"
          @input="updateField('name', ($event.target as HTMLInputElement).value)"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p v-else class="text-sm font-medium text-gray-800">{{ student.name }}</p>
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">Student ID</label>
        <input
          v-if="editable"
          type="text"
          :value="student.studentId"
          @input="updateField('studentId', ($event.target as HTMLInputElement).value)"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p v-else class="text-sm font-medium text-gray-800">{{ student.studentId }}</p>
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">Status</label>
        <select
          v-if="editable"
          :value="student.status"
          @change="updateField('status', ($event.target as HTMLSelectElement).value as any)"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Inactive">Inactive</option>
          <option value="Graduated">Graduated</option>
        </select>
        <span v-else class="inline-block px-2 py-1 rounded-full text-xs font-medium" :class="{
          'bg-green-100 text-green-700': student.status === 'Active',
          'bg-orange-100 text-orange-700': student.status === 'Pending',
          'bg-red-100 text-red-700': student.status === 'Inactive',
          'bg-purple-100 text-purple-700': student.status === 'Graduated'
        }">{{ student.status }}</span>
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">Batch</label>
        <input
          v-if="editable"
          type="text"
          :value="student.batch"
          @input="updateField('batch', ($event.target as HTMLInputElement).value)"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p v-else class="text-sm font-medium text-gray-800">{{ student.batch }}</p>
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">Academic Year</label>
        <input
          v-if="editable"
          type="text"
          :value="student.year"
          @input="updateField('year', ($event.target as HTMLInputElement).value)"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p v-else class="text-sm font-medium text-gray-800">{{ student.year }}</p>
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">School</label>
        <input
          v-if="editable"
          type="text"
          :value="student.school"
          @input="updateField('school', ($event.target as HTMLInputElement).value)"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p v-else class="text-sm font-medium text-gray-800">{{ student.school }}</p>
      </div>
    </div>
  </div>
</template>
