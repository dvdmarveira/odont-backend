const Case = require("../models/Case");
const ActivityLog = require("../models/ActivityLog");
const logger = require("../utils/logger");
const { AppError } = require("../middleware/error");
const asyncHandler = require("express-async-handler");

// Criar novo caso
exports.createCase = asyncHandler(async (req, res) => {
  const { title, description, type } = req.body;

  try {
    const newCase = new Case({
      title,
      description,
      type,
      responsible: req.user.id,
      createdBy: req.user.id,
    });

    await newCase.save();
    await ActivityLog.create({
      userId: req.user.id,
      action: "Caso criado",
      details: newCase._id,
    });

    res.status(201).json(newCase);
  } catch (error) {
    logger.error("Erro ao criar caso:", error);
    res.status(500).json({ msg: "Erro no servidor" });
  }
});

// Listar todos os casos com filtros
exports.getAllCases = asyncHandler(async (req, res) => {
  const queryObj = { ...req.query };
  const excludedFields = ["page", "sort", "limit", "fields"];
  excludedFields.forEach((el) => delete queryObj[el]);

  let query = Case.find(queryObj);

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

  const cases = await query;

  res.status(200).json({
    status: "success",
    results: cases.length,
    data: {
      cases,
    },
  });
});

// Buscar caso específico
exports.getCase = asyncHandler(async (req, res, next) => {
  const foundCase = await Case.findById(req.params.id)
    .populate("evidences")
    .populate("reports");

  if (!foundCase) {
    return next(new AppError("Caso não encontrado", 404));
  }

  // Registrar visualização no histórico
  foundCase.history.push({
    action: "visualização",
    user: req.user._id,
    details: `Caso visualizado por ${req.user.name}`,
    timestamp: Date.now(),
  });

  await foundCase.save();

  res.status(200).json({
    status: "success",
    data: {
      case: foundCase,
    },
  });
});

// Atualizar caso
exports.updateCase = asyncHandler(async (req, res, next) => {
  const updatedCase = await Case.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!updatedCase) {
    return next(new AppError("Caso não encontrado", 404));
  }

  // Registrar edição no histórico
  updatedCase.history.push({
    action: "edição",
    user: req.user._id,
    details: `Caso editado por ${req.user.name}`,
    timestamp: Date.now(),
  });

  await updatedCase.save();

  res.status(200).json({
    status: "success",
    data: {
      case: updatedCase,
    },
  });
});

// Atualizar status do caso
exports.updateCaseStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  if (
    !["pendente", "em_andamento", "finalizado", "arquivado"].includes(status)
  ) {
    return next(new AppError("Status inválido", 400));
  }

  const updatedCase = await Case.findByIdAndUpdate(
    req.params.id,
    { status },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedCase) {
    return next(new AppError("Caso não encontrado", 404));
  }

  // Registrar mudança de status no histórico
  updatedCase.history.push({
    action: "status_alterado",
    user: req.user._id,
    details: `Status alterado para ${status} por ${req.user.name}`,
    timestamp: Date.now(),
  });

  await updatedCase.save();

  res.status(200).json({
    status: "success",
    data: {
      case: updatedCase,
    },
  });
});

// Deletar caso
exports.deleteCase = asyncHandler(async (req, res, next) => {
  const caseToDelete = await Case.findById(req.params.id);

  if (!caseToDelete) {
    return next(new AppError("Caso não encontrado", 404));
  }

  // Verificar permissões
  if (
    caseToDelete.createdBy.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return next(
      new AppError("Você não tem permissão para deletar este caso", 403)
    );
  }

  await Case.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// Buscar casos por filtros avançados
exports.searchCases = asyncHandler(async (req, res) => {
  const { startDate, endDate, status, type, assignedTo, searchTerm } =
    req.query;

  const query = {};

  if (startDate && endDate) {
    query.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  if (status) {
    query.status = status;
  }

  if (type) {
    query.type = type;
  }

  if (assignedTo) {
    query.assignedTo = assignedTo;
  }

  if (searchTerm) {
    query.$or = [
      { title: { $regex: searchTerm, $options: "i" } },
      { description: { $regex: searchTerm, $options: "i" } },
    ];
  }

  const cases = await Case.find(query)
    .sort("-createdAt")
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email");

  res.status(200).json({
    status: "success",
    results: cases.length,
    data: {
      cases,
    },
  });
});
