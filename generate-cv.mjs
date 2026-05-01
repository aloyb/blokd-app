import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, Header, ImageRun, SectionType } from 'docx';
import fs from 'fs';

const doc = new Document({
  styles: {
    paragraph: {
      spacing: { line: 276 }
    }
  },
  sections: [{
    properties: {
      page: {
        size: { width: 800, height: 1100 }
      }
    },
    children: [
      // Header Section - Table with 2 columns
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
          insideH: { style: BorderStyle.NONE },
          insideV: { style: BorderStyle.NONE }
        },
        rows: [
          new TableRow({
            children: [
              // Left cell - Photo placeholder
              new TableCell({
                width: { size: 25, type: WidthType.PERCENTAGE },
                verticalAlign: "center",
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: "[PHOTO]",
                        size: 18,
                        color: "999999"
                      })
                    ]
                  })
                ]
              }),
              // Right cell - Name and summary
              new TableCell({
                width: { size: 75, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: "NAMA LENGKAP",
                        bold: true,
                        size: 36,
                        font: "Arial"
                      })
                    ]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: "Professional Summary - Deskripsi singkat tentang diri Anda, pengalaman, dan keahlian utama.",
                        size: 20,
                        font: "Arial"
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }),
      
      // Spacing
      new Paragraph({ children: [] }),
      new Paragraph({ children: [] }),
      
      // Middle Section - Education and Contact
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
          insideH: { style: BorderStyle.NONE },
          insideV: { style: BorderStyle.NONE }
        },
        rows: [
          new TableRow({
            children: [
              // Education - Left column
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "PENDIDIKAN",
                        bold: true,
                        size: 24,
                        font: "Arial"
                      })
                    ]
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "Nama Sekolah | Tahun Lulus",
                        bold: true,
                        size: 20,
                        font: "Arial"
                      })
                    ]
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "Jurusan: Nama Jurusan",
                        size: 20,
                        font: "Arial"
                      })
                    ]
                  })
                ]
              }),
              // Contact - Right column
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "KONTAK",
                        bold: true,
                        size: 24,
                        font: "Arial"
                      })
                    ]
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "📱 Telepon: +62-xxx-xxxx-xxxx",
                        size: 20,
                        font: "Arial"
                      })
                    ]
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "📧 Email: email@contoh.com",
                        size: 20,
                        font: "Arial"
                      })
                    ]
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "🌐 Website: www.contoh.com",
                        size: 20,
                        font: "Arial"
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }),
      
      // Divider line
      new Paragraph({
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" }
        },
        children: []
      }),
      
      // Spacing
      new Paragraph({ children: [] }),
      
      // Bottom Section - Skills and Experience
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
          insideH: { style: BorderStyle.NONE },
          insideV: { style: BorderStyle.NONE }
        },
        rows: [
          new TableRow({
            children: [
              // Skills - Left column
              new TableCell({
                width: { size: 35, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "KEMAMPUAN",
                        bold: true,
                        size: 24,
                        font: "Arial"
                      })
                    ]
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "• Skill 1",
                        size: 20,
                        font: "Arial"
                      })
                    ]
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "• Skill 2",
                        size: 20,
                        font: "Arial"
                      })
                    ]
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "• Skill 3",
                        size: 20,
                        font: "Arial"
                      })
                    ]
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "• Skill 4",
                        size: 20,
                        font: "Arial"
                      })
                    ]
                  }),
                  new Paragraph({ children: [] }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "PORTFOLIO",
                        bold: true,
                        size: 24,
                        font: "Arial"
                      })
                    ]
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "www.contoh.com",
                        size: 20,
                        font: "Arial",
                        color: "0000FF"
                      })
                    ]
                  })
                ]
              }),
              // Experience - Right column
              new TableCell({
                width: { size: 65, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "PENGALAMAN KERJA",
                        bold: true,
                        size: 24,
                        font: "Arial"
                      })
                    ]
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "Posisi - Nama Perusahaan (Jan 2023 - Jun 2023)",
                        bold: true,
                        size: 20,
                        font: "Arial"
                      })
                    ]
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "• Deskripsi pekerjaan 1",
                        size: 20,
                        font: "Arial"
                      })
                    ]
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "• Deskripsi pekerjaan 2",
                        size: 20,
                        font: "Arial"
                      })
                    ]
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "• Deskripsi pekerjaan 3",
                        size: 20,
                        font: "Arial"
                      })
                    ]
                  }),
                  new Paragraph({ children: [] }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "Posisi - Nama Perusahaan (Jul 2023 - Sekarang)",
                        bold: true,
                        size: 20,
                        font: "Arial"
                      })
                    ]
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "• Deskripsi pekerjaan 1",
                        size: 20,
                        font: "Arial"
                      })
                    ]
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "• Deskripsi pekerjaan 2",
                        size: 20,
                        font: "Arial"
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('./cv-template.docx', buffer);
  console.log('CV Template created: cv-template.docx');
});
