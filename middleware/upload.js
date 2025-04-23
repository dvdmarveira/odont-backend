const multer = require("multer");
const path = require("path");
const { AppError } = require("./error");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = "public/uploads/";

    switch (file.fieldname) {
      case "evidence":
        uploadPath += "evidences/";
        break;
      case "report":
        uploadPath += "reports/";
        break;
      case "dental_record":
        uploadPath += "dental_records/";
        break;
      default:
        uploadPath += "others/";
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        "Tipo de arquivo não suportado. Por favor, envie apenas imagens (JPG, PNG, GIF) ou documentos (PDF, DOC, DOCX).",
        400
      ),
      false
    );
  }
};

const limits = {
  fileSize: 5 * 1024 * 1024, // 5MB
  files: 10,
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: limits,
});

// Configurações específicas para diferentes tipos de upload
exports.uploadEvidence = upload.array("evidence", 10);
exports.uploadReport = upload.single("report");
exports.uploadDentalRecord = upload.array("dental_record", 5);

// Middleware para processar erros do Multer
exports.handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(
        new AppError("Arquivo muito grande. Tamanho máximo permitido: 5MB", 400)
      );
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return next(new AppError("Número máximo de arquivos excedido", 400));
    }
    return next(new AppError("Erro no upload do arquivo: " + err.message, 400));
  }
  next(err);
};
