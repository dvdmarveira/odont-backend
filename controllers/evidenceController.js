const Evidence = require("../models/Evidence");
const Case = require("../models/Case");
const { AppError } = require("../middleware/error");
const asyncHandler = require("express-async-handler");

// Criar nova evidência
exports.createEvidence = asyncHandler(async (req, res) => {
  const files = req.files.map((file) => ({
    filename: file.filename,
    originalName: file.originalname,
    path: file.path,
    mimetype: file.mimetype,
    size: file.size,
  }));

  const newEvidence = await Evidence.create({
    ...req.body,
    files,
    createdBy: req.user._id,
  });

  // Atualizar o histórico do caso
  const relatedCase = await Case.findById(req.body.case);
  if (relatedCase) {
    relatedCase.history.push({
      action: "documento_anexado",
      user: req.user._id,
      details: `Evidência "${newEvidence.title}" anexada por ${req.user.name}`,
      timestamp: Date.now(),
    });
    await relatedCase.save();
  }

  res.status(201).json({
    status: "success",
    data: {
      evidence: newEvidence,
    },
  });
});

// Listar todas as evidências
exports.getAllEvidences = asyncHandler(async (req, res) => {
  const queryObj = { ...req.query };
  const excludedFields = ["page", "sort", "limit", "fields"];
  excludedFields.forEach((el) => delete queryObj[el]);

  let query = Evidence.find(queryObj);

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

  const evidences = await query.populate({
    path: "case",
    select: "title status",
  });

  res.status(200).json({
    status: "success",
    results: evidences.length,
    data: {
      evidences,
    },
  });
});

// Buscar evidência específica
exports.getEvidence = asyncHandler(async (req, res, next) => {
  const evidence = await Evidence.findById(req.params.id).populate({
    path: "case",
    select: "title status",
  });

  if (!evidence) {
    return next(new AppError("Evidência não encontrada", 404));
  }

  // Registrar visualização no histórico
  evidence.history.push({
    action: "visualização",
    user: req.user._id,
    details: `Evidência visualizada por ${req.user.name}`,
    timestamp: Date.now(),
  });

  await evidence.save();

  res.status(200).json({
    status: "success",
    data: {
      evidence,
    },
  });
});

// Atualizar evidência
exports.updateEvidence = asyncHandler(async (req, res, next) => {
  const evidence = await Evidence.findById(req.params.id);

  if (!evidence) {
    return next(new AppError("Evidência não encontrada", 404));
  }

  // Verificar permissões
  if (
    evidence.createdBy.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return next(
      new AppError("Você não tem permissão para editar esta evidência", 403)
    );
  }

  // Atualizar arquivos se houver novos
  if (req.files && req.files.length > 0) {
    const newFiles = req.files.map((file) => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
    }));
    evidence.files.push(...newFiles);
  }

  // Atualizar outros campos
  Object.keys(req.body).forEach((key) => {
    evidence[key] = req.body[key];
  });

  // Registrar edição no histórico
  evidence.history.push({
    action: "edição",
    user: req.user._id,
    details: `Evidência editada por ${req.user.name}`,
    timestamp: Date.now(),
  });

  await evidence.save();

  res.status(200).json({
    status: "success",
    data: {
      evidence,
    },
  });
});

// Deletar evidência
exports.deleteEvidence = asyncHandler(async (req, res, next) => {
  const evidence = await Evidence.findById(req.params.id);

  if (!evidence) {
    return next(new AppError("Evidência não encontrada", 404));
  }

  // Verificar permissões
  if (
    evidence.createdBy.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return next(
      new AppError("Você não tem permissão para deletar esta evidência", 403)
    );
  }

  await Evidence.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// Buscar evidências por caso
exports.getEvidencesByCase = asyncHandler(async (req, res) => {
  const evidences = await Evidence.find({ case: req.params.caseId })
    .sort("-createdAt")
    .populate("createdBy", "name email");

  res.status(200).json({
    status: "success",
    results: evidences.length,
    data: {
      evidences,
    },
  });
});
