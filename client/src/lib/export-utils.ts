// Utilitários de exportação com lazy loading dinâmico
// Reduz o bundle inicial do Agent.tsx

export async function exportToPDF(content: string, prompt?: string, chartContainer?: HTMLElement | null) {
  const [{ jsPDF }, html2canvas] = await Promise.all([
    import("jspdf"),
    import("html2canvas").then(m => m.default)
  ]);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;

  doc.setFontSize(16);
  doc.setTextColor(31, 51, 77);
  doc.text("Arcádia Agent - Resultado", margin, 20);

  let currentY = 30;

  if (prompt) {
    doc.setFontSize(10);
    doc.setTextColor(90, 108, 125);
    doc.text("Tarefa:", margin, currentY);
    currentY += 7;
    const promptLines = doc.splitTextToSize(prompt, maxWidth);
    doc.text(promptLines, margin, currentY);
    currentY += promptLines.length * 5 + 10;
  }

  doc.setFontSize(12);
  doc.setTextColor(31, 51, 77);
  doc.text("Resposta:", margin, currentY);
  currentY += 8;

  const textContent = content.replace(/__CHART_DATA__[\s\S]*?__END_CHART_DATA__/g, "").trim();
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(textContent, maxWidth);
  doc.text(lines, margin, currentY);
  currentY += lines.length * 5 + 10;

  // Verifica se há dados de gráfico e captura
  const chartDataMatch = content.match(/__CHART_DATA__([\s\S]*?)__END_CHART_DATA__/);
  if (chartDataMatch && chartContainer) {
    try {
      const canvas = await html2canvas(chartContainer, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      const imgData = canvas.toDataURL("image/png");
      const imgWidth = maxWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (currentY + imgHeight > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        currentY = margin;
      }

      doc.addImage(imgData, "PNG", margin, currentY, imgWidth, imgHeight);
    } catch (e) {
      console.error("Error capturing chart:", e);
    }
  }

  doc.save("arcadia-resultado.pdf");
}

export async function exportToWord(content: string, prompt?: string) {
  const { Document, Packer, Paragraph, TextRun } = await import("docx");
  const { saveAs } = await import("file-saver");

  const paragraphs = [];

  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: "Arcádia Agent - Resultado", bold: true, size: 32 })],
    })
  );

  if (prompt) {
    paragraphs.push(
      new Paragraph({ children: [] }),
      new Paragraph({
        children: [new TextRun({ text: "Tarefa: ", bold: true }), new TextRun({ text: prompt })],
      })
    );
  }

  paragraphs.push(
    new Paragraph({ children: [] }),
    new Paragraph({
      children: [new TextRun({ text: "Resposta:", bold: true })],
    })
  );

  content.split("\n").forEach((line) => {
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: line })] }));
  });

  const doc = new Document({
    sections: [{ properties: {}, children: paragraphs }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "arcadia-resultado.docx");
}

export async function exportToText(content: string, prompt?: string) {
  const { saveAs } = await import("file-saver");
  const textContent = prompt ? `Tarefa: ${prompt}\n\nResposta:\n${content}` : content;
  const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
  saveAs(blob, "arcadia-resultado.txt");
}

export async function exportToCSV(content: string) {
  const { saveAs } = await import("file-saver");
  const lines = content.split("\n");
  let csvContent = "";

  for (const line of lines) {
    if (line.includes("|")) {
      const cells = line
        .split("|")
        .map((cell) => cell.trim())
        .filter((cell) => cell && !cell.match(/^[-:]+$/));
      if (cells.length > 0) {
        csvContent += cells.map((cell) => `"${cell.replace(/"/g, """)}"`).join(",") + "\n";
      }
    } else if (line.includes("\t")) {
      csvContent +=
        line
          .split("\t")
          .map((cell) => `"${cell.trim().replace(/"/g, """)}"`)
          .join(",") + "\n";
    } else if (line.trim()) {
      csvContent += `"${line.replace(/"/g, """)}"\n`;
    }
  }

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  saveAs(blob, "arcadia-resultado.csv");
}
