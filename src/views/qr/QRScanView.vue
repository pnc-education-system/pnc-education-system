<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { QrcodeStream } from 'vue-qrcode-reader'
import { useToast } from '@/composables/useToast'
import { cardsApi } from '@/services/api/cards'

const router = useRouter()
const { showErrorToast, showSuccessToast } = useToast()

const isScanning = ref(true)
const isVerifying = ref(false)
const errorMessage = ref('')
const cameraError = ref('')
const lastScannedToken = ref('')

onMounted(() => {
  // Request camera permissions when component mounts
  requestCameraPermission()
})

onUnmounted(() => {
  // Clean up when component unmounts
  isScanning.value = false
})

async function requestCameraPermission() {
  try {
    // Check if camera is available
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    stream.getTracks().forEach(track => track.stop())
    cameraError.value = ''
  } catch (error: unknown) {
    console.error('Camera permission error:', error)
    cameraError.value = 'Unable to access camera. Please ensure camera permissions are granted.'
    isScanning.value = false
  }
}

async function onDetect(detectedCodes: Array<{ rawValue: string }>) {
  if (detectedCodes.length === 0 || !isScanning.value || isVerifying.value) {
    return
  }

  const token = detectedCodes[0]?.rawValue
  if (!token) {
    return
  }

  // Prevent duplicate scans of the same token
  if (token === lastScannedToken.value) {
    return
  }

  lastScannedToken.value = token
  await verifyQRToken(token)
}

async function verifyQRToken(token: string) {
  isVerifying.value = true
  isScanning.value = false
  errorMessage.value = ''

  try {
    // Call the backend verification endpoint
    const student = await cardsApi.verifyQrToken(token)

    if (student && student.id) {
      showSuccessToast('QR verified successfully', 'Success')
      
      // Navigate to student profile edit page
      router.push(`/students/${student.id}/edit`)
    } else {
      throw new Error('Invalid response from server')
    }
  } catch (error: unknown) {
    console.error('QR verification error:', error)
    
    // Handle different error scenarios
    const axiosError = error as { response?: { status?: number; data?: { message?: string; success?: boolean } }; code?: string; message?: string }
    
    if (axiosError.response?.status === 404) {
      errorMessage.value = 'Invalid or unknown QR token.'
      showErrorToast('Invalid QR token', 'Verification Failed')
    } else if (axiosError.response?.status === 400) {
      errorMessage.value = axiosError.response.data?.message || 'Invalid QR token.'
      showErrorToast('Invalid QR code', 'Verification Failed')
    } else if (axiosError.response?.status === 401) {
      errorMessage.value = 'Authentication required. Please log in again.'
      showErrorToast('Authentication required', 'Error')
    } else if (axiosError.code === 'ECONNABORTED' || axiosError.message?.includes('timeout')) {
      errorMessage.value = 'Request timed out. Please try again.'
      showErrorToast('Request timeout', 'Error')
    } else if (!axiosError.response) {
      errorMessage.value = 'Network error. Please check your connection.'
      showErrorToast('Network error', 'Error')
    } else {
      errorMessage.value = axiosError.response.data?.message || 'An unexpected error occurred.'
      showErrorToast('Verification failed', 'Error')
    }

    // Allow scanning again after error
    setTimeout(() => {
      isScanning.value = true
      lastScannedToken.value = ''
    }, 2000)
  } finally {
    isVerifying.value = false
  }
}

function onCameraInitError(error: unknown) {
  console.error('Camera init error:', error)
  cameraError.value = 'Unable to initialize camera. Please check camera permissions.'
  isScanning.value = false
}

function restartScanning() {
  errorMessage.value = ''
  lastScannedToken.value = ''
  isScanning.value = true
  cameraError.value = ''
  requestCameraPermission()
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-6 py-4">
      <h1 class="text-2xl font-semibold text-gray-900">QR Scanner</h1>
      <p class="text-sm text-gray-600 mt-1">Scan a student QR code to view their profile</p>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex items-center justify-center p-6">
      <div class="w-full max-w-md">
        <!-- Camera Error -->
        <div v-if="cameraError" class="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
          <div class="flex items-start">
            <svg class="w-6 h-6 text-red-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 class="text-sm font-medium text-red-800">Camera Error</h3>
              <p class="text-sm text-red-700 mt-1">{{ cameraError }}</p>
            </div>
          </div>
          <button
            @click="restartScanning"
            class="mt-4 w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>

        <!-- Scanner Container -->
        <div v-else class="bg-white rounded-xl shadow-lg overflow-hidden">
          <div class="relative">
            <!-- QR Scanner -->
            <QrcodeStream
              v-if="isScanning"
              @detect="onDetect"
              @camera-on-error="onCameraInitError"
              class="w-full h-80 object-cover"
            />

            <!-- Loading Overlay -->
            <div
              v-if="isVerifying"
              class="absolute inset-0 bg-black/50 flex items-center justify-center"
            >
              <div class="text-center">
                <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mb-4"></div>
                <p class="text-white font-medium">Verifying QR code...</p>
              </div>
            </div>

            <!-- Scanning Paused -->
            <div
              v-if="!isScanning && !isVerifying && !cameraError"
              class="absolute inset-0 bg-black/50 flex items-center justify-center"
            >
              <div class="text-center">
                <p class="text-white font-medium mb-4">Scanning paused</p>
                <button
                  @click="restartScanning"
                  class="bg-white text-gray-900 py-2 px-6 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Resume Scanning
                </button>
              </div>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="errorMessage" class="bg-red-50 border-t border-red-200 p-4">
            <div class="flex items-start">
              <svg class="w-5 h-5 text-red-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-sm text-red-700">{{ errorMessage }}</p>
            </div>
          </div>

          <!-- Instructions -->
          <div v-if="isScanning && !cameraError" class="bg-blue-50 border-t border-blue-200 p-4">
            <div class="flex items-start">
              <svg class="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="text-sm text-blue-700">
                <p class="font-medium">Point camera at QR code</p>
                <p class="mt-1">Ensure the QR code is well-lit and centered in the frame</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Manual Entry Fallback -->
        <div class="mt-6 text-center">
          <p class="text-sm text-gray-600 mb-2">Having trouble scanning?</p>
          <button
            @click="router.push('/students')"
            class="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Go to Student List
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
