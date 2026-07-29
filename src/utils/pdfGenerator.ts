import html2canvas from 'html2canvas-pro'
import jsPDF from 'jspdf'

export interface PDFOptions {
  element: HTMLElement
  filename: string
  scale?: number
  useCORS?: boolean
}

export async function generatePDFFromElement(options: PDFOptions): Promise<Blob> {
  const { element, filename: _filename, scale = 2, useCORS = true } = options

  try {
    // Capture the element as canvas
    // html2canvas-pro supports modern CSS (oklab, oklch, color-mix, etc.)
    // Use standard rendering with CORS support for cross-origin images
    const canvas = await html2canvas(element, {
      scale,
      useCORS,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true,
    })

    // Create PDF
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    // Calculate dimensions to fit A4
    const imgWidth = 210 // A4 width in mm
    const pageHeight = 297 // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    const _heightLeft = pageHeight

    // Add image to PDF (centered)
    const x = (imgWidth - (canvas.width * imgWidth) / canvas.width) / 2
    const y = 0

    pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight)

    // Return as blob
    return new Blob([pdf.output('blob')], { type: 'application/pdf' })
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('Failed to generate PDF')
  }
}

export async function generateCardPDF(
  cardElement: HTMLElement,
  studentId: string
): Promise<Blob> {
  return generatePDFFromElement({
    element: cardElement,
    filename: `ID_Card_${studentId}.pdf`,
    scale: 3, // Higher scale for better quality
  })
}
