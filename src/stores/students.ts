import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Student {
  id: string
  name: string
  email: string
  phone?: string
  program: string
  date: string
  initials: string
  status: 'active' | 'pending' | 'completed'
}

export const useStudentsStore = defineStore('students', () => {
  const students = ref<Student[]>([
    {
      id: 'STU-2026-02',
      name: 'Chet Chanthy',
      email: 'chet.ch@gmail.com',
      initials: 'CC',
      program: 'Web Development',
      date: '2026-07-13',
      status: 'active',
    },
    {
      id: 'STU-2026-01',
      name: 'Buntit Satan',
      email: 'buntit.s@gmail.com',
      initials: 'BS',
      program: 'Information Technology',
      date: '2026-07-13',
      status: 'active',
    },
    {
      id: 'STU-2026-03',
      name: 'Lina Dara',
      email: 'lina.d@gmail.com',
      initials: 'LD',
      program: 'Computer Science',
      date: '2026-07-12',
      status: 'pending',
    },
    {
      id: 'STU-2026-04',
      name: 'Srey Roth',
      email: 'srey.roth@gmail.com',
      initials: 'SR',
      program: 'Business Administration',
      date: '2026-07-11',
      status: 'completed',
    },
    {
      id: 'STU-2026-05',
      name: 'Vuthy Pich',
      email: 'vuthy.p@gmail.com',
      initials: 'VP',
      program: 'Graphic Design',
      date: '2026-07-10',
      status: 'active',
    },
  ])

  const total = computed(() => students.value.length)
  const active = computed(() => students.value.filter((s) => s.status === 'active').length)

  function getById(id: string) {
    return students.value.find((s) => s.id === id)
  }

  function create(payload: Omit<Student, 'id' | 'initials' | 'date'>) {
    const id = `STU-2026-${String(students.value.length + 1).padStart(2, '0')}`
    const student: Student = {
      ...payload,
      id,
      initials: payload.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      date: new Date().toISOString().slice(0, 10),
    }
    students.value.unshift(student)
    return student
  }

  function update(id: string, updates: Partial<Omit<Student, 'id' | 'initials' | 'date'>>) {
    const index = students.value.findIndex((s) => s.id === id)
    if (index === -1) return null

    const original = students.value[index]
    const updated: Student = {
      id: original.id,
      name: updates.name || original.name,
      email: updates.email || original.email,
      phone: updates.phone ?? original.phone,
      program: updates.program || original.program,
      date: original.date,
      initials: original.initials,
      status: updates.status || original.status,
    }
    updated.initials = updated.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    students.value[index] = updated
    return students.value[index]
  }

  function remove(id: string) {
    const index = students.value.findIndex((s) => s.id === id)
    if (index === -1) return false
    students.value.splice(index, 1)
    return true
  }

  return {
    students,
    total,
    active,
    getById,
    create,
    update,
    remove,
  }
})
