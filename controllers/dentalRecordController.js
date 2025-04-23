const DentalRecord = require("../models/DentalRecord");
const ActivityLog = require("../models/ActivityLog");
const logger = require("../utils/logger");
const { AppError } = require("../middleware/error");
const asyncHandler = require("express-async-handler");

exports.createDentalRecord = asyncHandler(async (req, res) => {
  const { patientName, isIdentified, dentalData } = req.body;

  try {
    const record = new DentalRecord({
      patientName,
      isIdentified,
      dentalData,
      registeredBy: req.user.id,
    });

    await record.save();
    await ActivityLog.create({
      userId: req.user.id,
      action: "Registro odonto-legal criado",
      details: record._id,
    });

    res.status(201).json(record);
  } catch (error) {
    logger.error("Erro ao criar registro odonto-legal:", error);
    res.status(500).json({ msg: "Erro no servidor" });
  }
});

exports.searchDentalRecords = async (req, res) => {
  const { query } = req.query;

  try {
    const records = await DentalRecord.find({ $text: { $search: query } });
    res.json(records);
  } catch (error) {
    logger.error("Erro ao buscar registros odonto-legais:", error);
    res.status(500).json({ msg: "Erro no servidor" });
  }
};

// Listar todos os registros
exports.getAllDentalRecords = asyncHandler(async (req, res) => {
  const queryObj = { ...req.query };
  const excludedFields = ["page", "sort", "limit", "fields"];
  excludedFields.forEach((el) => delete queryObj[el]);

  let query = DentalRecord.find(queryObj);

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

  const dentalRecords = await query;

  res.status(200).json({
    status: "success",
    results: dentalRecords.length,
    data: {
      dentalRecords,
    },
  });
});

// Buscar registro específico
exports.getDentalRecord = asyncHandler(async (req, res, next) => {
  const dentalRecord = await DentalRecord.findById(req.params.id)
    .populate("radiographs")
    .populate("photographs")
    .populate({
      path: "matchCases.case",
      select: "title status",
    });

  if (!dentalRecord) {
    return next(new AppError("Registro odontológico não encontrado", 404));
  }

  // Registrar visualização no histórico
  dentalRecord.history.push({
    action: "visualização",
    user: req.user._id,
    details: `Registro visualizado por ${req.user.name}`,
    timestamp: Date.now(),
  });

  await dentalRecord.save();

  res.status(200).json({
    status: "success",
    data: {
      dentalRecord,
    },
  });
});

// Atualizar registro
exports.updateDentalRecord = asyncHandler(async (req, res, next) => {
  const dentalRecord = await DentalRecord.findById(req.params.id);

  if (!dentalRecord) {
    return next(new AppError("Registro odontológico não encontrado", 404));
  }

  // Verificar permissões
  if (
    dentalRecord.createdBy.toString() !== req.user._id.toString() &&
    req.user.role !== "admin" &&
    req.user.role !== "perito"
  ) {
    return next(
      new AppError("Você não tem permissão para editar este registro", 403)
    );
  }

  // Atualizar campos
  Object.keys(req.body).forEach((key) => {
    dentalRecord[key] = req.body[key];
  });

  // Registrar edição no histórico
  dentalRecord.history.push({
    action: "edição",
    user: req.user._id,
    details: `Registro editado por ${req.user.name}`,
    timestamp: Date.now(),
  });

  await dentalRecord.save();

  res.status(200).json({
    status: "success",
    data: {
      dentalRecord,
    },
  });
});

// Buscar registros por características dentais
exports.searchByDentalCharacteristics = asyncHandler(async (req, res) => {
  const { teethStatus, treatments, generalCharacteristics } = req.body;

  let query = {};

  if (teethStatus && teethStatus.length > 0) {
    query["dentalCharacteristics.teeth"] = {
      $elemMatch: {
        status: { $in: teethStatus },
      },
    };
  }

  if (treatments && treatments.length > 0) {
    query["dentalCharacteristics.teeth"] = {
      $elemMatch: {
        treatments: { $in: treatments },
      },
    };
  }

  if (generalCharacteristics) {
    Object.keys(generalCharacteristics).forEach((key) => {
      if (generalCharacteristics[key]) {
        query[`dentalCharacteristics.generalCharacteristics.${key}`] = {
          $regex: generalCharacteristics[key],
          $options: "i",
        };
      }
    });
  }

  const dentalRecords = await DentalRecord.find(query)
    .sort("-createdAt")
    .populate("radiographs")
    .populate("photographs");

  res.status(200).json({
    status: "success",
    results: dentalRecords.length,
    data: {
      dentalRecords,
    },
  });
});

// Comparar registros
exports.compareDentalRecords = asyncHandler(async (req, res, next) => {
  const { recordId1, recordId2 } = req.params;

  const record1 = await DentalRecord.findById(recordId1);
  const record2 = await DentalRecord.findById(recordId2);

  if (!record1 || !record2) {
    return next(new AppError("Um ou mais registros não encontrados", 404));
  }

  // Algoritmo simples de comparação (pode ser melhorado com IA)
  let matchScore = 0;
  let matchDetails = [];

  // Comparar dentes
  record1.dentalCharacteristics.teeth.forEach((tooth1) => {
    const tooth2 = record2.dentalCharacteristics.teeth.find(
      (t) => t.number === tooth1.number
    );

    if (tooth2) {
      if (tooth1.status === tooth2.status) {
        matchScore += 1;
        matchDetails.push(
          `Dente ${tooth1.number}: Status igual (${tooth1.status})`
        );
      }

      const commonTreatments = tooth1.treatments.filter((t) =>
        tooth2.treatments.includes(t)
      );
      matchScore += commonTreatments.length * 0.5;
      if (commonTreatments.length > 0) {
        matchDetails.push(
          `Dente ${
            tooth1.number
          }: Tratamentos em comum (${commonTreatments.join(", ")})`
        );
      }
    }
  });

  // Comparar características gerais
  const gc1 = record1.dentalCharacteristics.generalCharacteristics;
  const gc2 = record2.dentalCharacteristics.generalCharacteristics;

  if (gc1.occlusion === gc2.occlusion) {
    matchScore += 1;
    matchDetails.push(`Oclusão igual: ${gc1.occlusion}`);
  }

  if (gc1.palate === gc2.palate) {
    matchScore += 1;
    matchDetails.push(`Palato igual: ${gc1.palate}`);
  }

  const commonAnomalies = gc1.anomalies.filter((a) =>
    gc2.anomalies.includes(a)
  );
  matchScore += commonAnomalies.length * 0.5;
  if (commonAnomalies.length > 0) {
    matchDetails.push(`Anomalias em comum: ${commonAnomalies.join(", ")}`);
  }

  // Normalizar pontuação para percentual
  const maxPossibleScore =
    record1.dentalCharacteristics.teeth.length * 2 + // status + treatments
    2 + // occlusion + palate
    Math.max(gc1.anomalies.length, gc2.anomalies.length) * 0.5;

  const matchPercentage = (matchScore / maxPossibleScore) * 100;

  // Registrar comparação no histórico de ambos os registros
  const comparisonDetails = `Comparação realizada: Score ${matchPercentage.toFixed(
    2
  )}%`;

  [record1, record2].forEach((record) => {
    record.history.push({
      action: "comparação",
      user: req.user._id,
      details: comparisonDetails,
      timestamp: Date.now(),
    });
  });

  await Promise.all([record1.save(), record2.save()]);

  res.status(200).json({
    status: "success",
    data: {
      matchScore: matchPercentage.toFixed(2),
      matchDetails,
      record1: record1._id,
      record2: record2._id,
    },
  });
});
