const mongoose = require("mongoose");

const evidenceSchema = new mongoose.Schema(
  {
    case: {
      type: mongoose.Schema.ObjectId,
      ref: "Case",
      required: [true, "Evidência deve estar vinculada a um caso"],
    },
    type: {
      type: String,
      required: [true, "Tipo de evidência é obrigatório"],
      enum: ["imagem", "documento", "relato", "outro"],
    },
    title: {
      type: String,
      required: [true, "Título é obrigatório"],
    },
    description: {
      type: String,
      required: [true, "Descrição é obrigatória"],
    },
    category: {
      type: String,
      required: [true, "Categoria é obrigatória"],
      enum: [
        "radiografia",
        "fotografia",
        "laudo_anterior",
        "depoimento",
        "outro",
      ],
    },
    files: [
      {
        filename: String,
        originalName: String,
        path: String,
        mimetype: String,
        size: Number,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    metadata: {
      date: Date,
      location: String,
      equipment: String,
      additionalInfo: mongoose.Schema.Types.Mixed,
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    history: [
      {
        action: {
          type: String,
          required: true,
          enum: ["criação", "edição", "visualização", "exclusão"],
        },
        user: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
          required: true,
        },
        details: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Middleware para popular referências importantes
evidenceSchema.pre(/^find/, function (next) {
  this.populate({
    path: "createdBy",
    select: "name email",
  });
  next();
});

module.exports = mongoose.model("Evidence", evidenceSchema);
