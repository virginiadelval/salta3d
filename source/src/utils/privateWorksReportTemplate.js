import { jsPDF } from 'jspdf'
import { imgLogo } from './logoBase64'

export default async (plans, smp, searchVal, searchType) => {
  const doc = new jsPDF()
  let y = 46 // Start below the Page 1 banner height (38) + margin (8)

  const now = new Date()
  const fechaHora =
    now.toLocaleDateString('es-AR') + ' ' +
    now.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    })

  // Helper: check page overflow and add a new page if needed
  const addPageIfNeeded = (neededHeight = 0) => {
    if (y + neededHeight > 270) {
      doc.addPage()
      y = 20
      drawPageHeader()
    }
  }

  // Draw header for subsequent pages
  const drawPageHeader = () => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(100, 100, 100)
    doc.text('Reporte de Obras Privadas', 15, 11)

    doc.setDrawColor(0, 65, 116) // Official Dark Blue
    doc.setLineWidth(0.4)
    doc.line(15, 13, 195, 13)
    y = 20 // Set y after the header line
  }

  // Draw page 1 banner
  const drawHeaderBanner = () => {
    // Blue background banner (RGB 0, 65, 116 - Official Dark Blue)
    doc.setFillColor(0, 65, 116)
    doc.rect(0, 0, 210, 38, 'F')

    // Add White Logo
    doc.addImage(imgLogo, 'PNG', 170, 7, 25, 24)

    // Title text in white bold
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(255, 255, 255)
    doc.text('REPORTE DE OBRAS PRIVADAS', 15, 17)

    // Metadata line
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    const metaPrefix = `Municipio de la Ciudad de Salta   |   Fecha de Consulta: ${fechaHora}`
    doc.text(metaPrefix, 15, 30)
  }

  // Draw Warning (Aviso Legal) in a styled gray box
  const drawAvisoLegal = () => {
    doc.setFillColor(242, 244, 244) // light grey
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(45, 45, 45) // brand charcoal

    const textWidth = 172
    const rawText = "AVISO LEGAL: La información presentada en este reporte se genera a partir de la integración de capas catastrales de obras privadas vigentes. Este documento tiene carácter de consulta técnica y de orientación informativa; no constituye un certificado final de obra ni reemplaza los instrumentos oficiales ni el control de la Dirección de Obras Privadas del Municipio de la Ciudad de Salta."

    const lines = doc.splitTextToSize(rawText, textWidth)
    const lineHeight = 4
    const padding = 4
    const boxHeight = lines.length * lineHeight + padding * 2

    // Draw box background
    doc.rect(15, y, 180, boxHeight, 'F')

    // Draw thick left border (grey)
    doc.setFillColor(120, 120, 120)
    doc.rect(15, y, 2.5, boxHeight, 'F')

    // Draw text
    let textY = y + padding + 3
    lines.forEach(line => {
      doc.text(line, 19.5, textY)
      textY += lineHeight
    })

    y += boxHeight + 8
  }

  // Draw Section Header
  const drawSectionHeader = (title) => {
    addPageIfNeeded(20)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(40, 89, 172) // brand blue
    doc.text(title.toUpperCase(), 15, y)

    // Fine underline
    doc.setDrawColor(40, 89, 172)
    doc.setLineWidth(0.5)
    doc.line(15, y + 1.5, 195, y + 1.5)

    y += 7
  }

  // Draw a standard table row matching the official design
  const drawGridRow = (label, value) => {
    const normLabel = label.normalize('NFC')
    const normValue = value.normalize('NFC')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    const labelLines = doc.splitTextToSize(normLabel, 54)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const valLines = doc.splitTextToSize(normValue, 114)

    const lineHeight = 4.5
    const padding = 3
    const rowHeight = Math.max(labelLines.length * lineHeight, valLines.length * lineHeight) + padding * 2

    addPageIfNeeded(rowHeight)

    // Shade left column background (light gray)
    doc.setFillColor(242, 244, 244)
    doc.rect(15, y, 60, rowHeight, 'F')

    // Draw borders
    doc.setDrawColor(210, 210, 210)
    doc.setLineWidth(0.2)
    doc.rect(15, y, 60, rowHeight, 'D')
    doc.rect(75, y, 120, rowHeight, 'D')

    // Label text (vertically centered)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40, 89, 172) // brand blue
    let labelY = y + (rowHeight - labelLines.length * lineHeight) / 2 + 3
    labelLines.forEach(line => {
      doc.text(line, 18, labelY)
      labelY += lineHeight
    })

    // Value text (vertically centered)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(45, 45, 45) // brand charcoal
    let valY = y + (rowHeight - valLines.length * lineHeight) / 2 + 3
    valLines.forEach(line => {
      doc.text(line, 78, valY)
      valY += lineHeight
    })

    y += rowHeight
  }

  // Draw Page Numbering and thin line on all pages
  const addPageNumbers = () => {
    const totalPages = doc.internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      
      // Bottom footer line
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.2)
      doc.line(15, 282, 195, 282)

      doc.text(`Página ${i} de ${totalPages}`, 170, 287)
      doc.text('IDEMSa - CPUA - Municipalidad de la Ciudad de Salta', 15, 287)
    }
  }

  // --- Start Generation ---
  drawHeaderBanner()
  drawAvisoLegal()

  // 1. Draw Search Metadata Section
  drawSectionHeader('INFORMACIÓN DE CONSULTA')
  const queryLabel = searchType === 'catastro' ? 'Nomenclatura Catastral' : 'Expediente Consultado'
  drawGridRow(queryLabel, searchVal || '-')
  drawGridRow('Fecha de Emisión', now.toLocaleDateString('es-AR'))
  y += 6

  // 2. Draw Plans Section
  if (plans && plans.length > 0) {
    plans.forEach((plan, index) => {
      drawSectionHeader(`PLANO REGISTRADO #${index + 1}`)
      drawGridRow('Expediente N°', plan.expediente || '-')
      drawGridRow('Catastro', plan.catastro || '-')
      drawGridRow('Plano N°', plan.plano || '-')
      drawGridRow('Fecha Aprobación', plan.fecha_aprobacion || '-')
      drawGridRow('Estado del Trámite', plan.estado || '-')
      drawGridRow('Categoría de Obra', plan.categoria || '-')
      drawGridRow('Domicilio Declarado', plan.domicilio || '-')
      drawGridRow('Profesional Firmante', plan.profesional || '-')
      if (plan.finca && plan.finca !== '-') {
        drawGridRow('Finca', plan.finca)
      }
      y += 6
    })
  } else {
    drawSectionHeader('PLANOS REGISTRADOS')
    addPageIfNeeded(12)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9.5)
    doc.setTextColor(120, 120, 120)
    doc.text('No se encontraron planos aprobados registrados para esta búsqueda.', 15, y + 4)
    y += 10
  }

  // Apply page numbers to all generated pages
  addPageNumbers()

  // Save the document
  doc.save(`Reporte_Obras_Privadas_${smp || searchVal || 'Consulta'}.pdf`)
}
