const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");

exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      status: "error",
      message: "Você não está autenticado! Por favor, faça login.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: "error",
        message: "O usuário pertencente a este token não existe mais.",
      });
    }

    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        status: "error",
        message:
          "Usuário mudou a senha recentemente! Por favor, faça login novamente.",
      });
    }

    req.user = currentUser;
    next();
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: "Token inválido ou expirado!",
    });
  }
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "Você não tem permissão para realizar esta ação",
      });
    }
    next();
  };
};

exports.checkOwnership = (Model) =>
  asyncHandler(async (req, res, next) => {
    const doc = await Model.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({
        status: "error",
        message: "Documento não encontrado",
      });
    }

    if (doc.createdBy.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        status: "error",
        message: "Você não tem permissão para modificar este documento",
      });
    }

    req.document = doc;
    next();
  });

exports.logActivity = (action) =>
  asyncHandler(async (req, res, next) => {
    if (!req.document) return next();

    req.document.history.push({
      action,
      user: req.user._id,
      details: `${action} realizada por ${req.user.name}`,
      timestamp: Date.now(),
    });

    await req.document.save();
    next();
  });
