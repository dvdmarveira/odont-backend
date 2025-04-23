const Report = require("../models/Report");
const Case = require("../models/Case");
const { AppError } = require("../middleware/error");
const asyncHandler = require("express-async-handler");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// Criar novo laudo
exports.createReport = asyncHandler(async (req, res) => {
  const newReport = await Report.create({
    ...req.body,
    createdBy: req.user._id,
  });

  // Atualizar o histórico do caso
  const relatedCase = await Case.findById(req.body.case);
  if (relatedCase) {
    relatedCase.history.push({
      action: "documento_anexado",
      user: req.user._id,
      details: `Laudo "${newReport.title}" criado por ${req.user.name}`,
      timestamp: Date.now(),
    });
    await relatedCase.save();
  }

  res.status(201).json({
    status: "success",
    data: {
      report: newReport,
    },
  });
});

// Listar todos os laudos
exports.getAllReports = asyncHandler(async (req, res) => {
  const queryObj = { ...req.query };
  const excludedFields = ["page", "sort", "limit", "fields"];
  excludedFields.forEach((el) => delete queryObj[el]);

  let query = Report.find(queryObj);

  // Ordenação
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    query = query.sort(sortBy);
  } else {
    query = query.sort("-createdAt");
  }

  // Paginação
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  query = query.skip(skip).limit(limit);

  const reports = await query.populate({
    path: "case",
    select: "title status",
  });

  res.status(200).json({
    status: "success",
    results: reports.length,
    data: {
      reports,
    },
  });
});

// Buscar laudo específico
exports.getReport = asyncHandler(async (req, res, next) => {
  const report = await Report.findById(req.params.id)
    .populate({
      path: "case",
      select: "title status",
    })
    .populate({
      path: "attachments.evidenceId",
      select: "title description files",
    });

  if (!report) {
    return next(new AppError("Laudo não encontrado", 404));
  }

  // Registrar visualização no histórico
  report.history.push({
    action: "visualização",
    user: req.user._id,
    details: `Laudo visualizado por ${req.user.name}`,
    timestamp: Date.now(),
  });

  await report.save();

  res.status(200).json({
    status: "success",
    data: {
      report,
    },
  });
});

// Atualizar laudo
exports.updateReport = asyncHandler(async (req, res, next) => {
  const report = await Report.findById(req.params.id);

  if (!report) {
    return next(new AppError("Laudo não encontrado", 404));
  }

  // Verificar permissões
  if (
    report.createdBy.toString() !== req.user._id.toString() &&
    req.user.role !== "admin" &&
    req.user.role !== "perito"
  ) {
    return next(
      new AppError("Você não tem permissão para editar este laudo", 403)
    );
  }

  // Salvar versão anterior
  report.previousVersions.push({
    content: report.content,
    modifiedBy: req.user._id,
    modifiedAt: Date.now(),
    version: report.version,
    comments: req.body.versionComments,
  });

  // Atualizar campos
  Object.keys(req.body).forEach((key) => {
    if (key !== "versionComments") {
      report[key] = req.body[key];
    }
  });

  report.version += 1;

  // Registrar edição no histórico
  report.history.push({
    action: "edição",
    user: req.user._id,
    details: `Laudo editado por ${req.user.name}`,
    timestamp: Date.now(),
  });

  await report.save();

  res.status(200).json({
    status: "success",
    data: {
      report,
    },
  });
});

// Finalizar laudo
exports.finalizeReport = asyncHandler(async (req, res, next) => {
  const report = await Report.findById(req.params.id);

  if (!report) {
    return next(new AppError("Laudo não encontrado", 404));
  }

  if (report.status === "finalizado") {
    return next(new AppError("Este laudo já está finalizado", 400));
  }

  // Verificar permissões
  if (req.user.role !== "admin" && req.user.role !== "perito") {
    return next(
      new AppError("Você não tem permissão para finalizar este laudo", 403)
    );
  }

  report.status = "finalizado";
  report.reviewedBy = req.user._id;
  report.reviewDate = Date.now();

  // Registrar finalização no histórico
  report.history.push({
    action: "finalização",
    user: req.user._id,
    details: `Laudo finalizado por ${req.user.name}`,
    timestamp: Date.now(),
  });

  await report.save();

  res.status(200).json({
    status: "success",
    data: {
      report,
    },
  });
});

// Exportar laudo para PDF
exports.exportReportToPDF = asyncHandler(async (req, res, next) => {
  const report = await Report.findById(req.params.id)
    .populate({
      path: "case",
      select: "title status patient",
    })
    .populate("createdBy", "name")
    .populate("reviewedBy", "name");

  if (!report) {
    return next(new AppError("Laudo não encontrado", 404));
  }

  const doc = new PDFDocument();
  const filename = `laudo-${report._id}-${Date.now()}.pdf`;
  const filePath = path.join("public/uploads/reports", filename);

  doc.pipe(fs.createWriteStream(filePath));

  // Cabeçalho
  doc.fontSize(20).text("LAUDO PERICIAL ODONTOLÓGICO", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text(`Título: ${report.title}`);
  doc.text(`Caso: ${report.case.title}`);
  doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`);
  doc.moveDown();

  // Conteúdo
  doc.fontSize(14).text("1. INTRODUÇÃO", { underline: true });
  doc.fontSize(12).text(report.content.introduction);
  doc.moveDown();

  doc.fontSize(14).text("2. METODOLOGIA", { underline: true });
  doc.fontSize(12).text(report.content.methodology);
  doc.moveDown();

  doc.fontSize(14).text("3. ANÁLISE", { underline: true });
  doc.fontSize(12).text(report.content.analysis);
  doc.moveDown();

  doc.fontSize(14).text("4. CONCLUSÃO", { underline: true });
  doc.fontSize(12).text(report.content.conclusion);
  doc.moveDown();

  if (report.content.references && report.content.references.length > 0) {
    doc.fontSize(14).text("5. REFERÊNCIAS", { underline: true });
    report.content.references.forEach((ref) => {
      doc.fontSize(12).text(`• ${ref}`);
    });
  }

  // Assinaturas
  doc.moveDown();
  doc
    .fontSize(12)
    .text(`Perito Responsável: ${report.createdBy.name}`, { align: "right" });
  if (report.reviewedBy) {
    doc.text(`Revisado por: ${report.reviewedBy.name}`, { align: "right" });
  }

  doc.end();

  res.status(200).json({
    status: "success",
    data: {
      pdfUrl: `/uploads/reports/${filename}`,
    },
  });
});
