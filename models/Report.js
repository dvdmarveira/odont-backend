const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    case: {
      type: mongoose.Schema.ObjectId,
      ref: "Case",
      required: [true, "Laudo deve estar vinculado a um caso"],
    },
    title: {
      type: String,
      required: [true, "Título é obrigatório"],
    },
    template: {
      type: String,
      required: [true, "Modelo de laudo é obrigatório"],
      enum: ["identificação", "idade", "trauma", "geral"],
    },
    content: {
      introduction: {
        type: String,
        required: [true, "Introdução é obrigatória"],
      },
      methodology: {
        type: String,
        required: [true, "Metodologia é obrigatória"],
      },
      analysis: {
        type: String,
        required: [true, "Análise é obrigatória"],
      },
      conclusion: {
        type: String,
        required: [true, "Conclusão é obrigatória"],
      },
      references: [String],
    },
    attachments: [
      {
        evidenceId: {
          type: mongoose.Schema.ObjectId,
          ref: "Evidence",
        },
        description: String,
        page: Number,
      },
    ],
    status: {
      type: String,
      enum: ["rascunho", "revisão", "finalizado"],
      default: "rascunho",
    },
    version: {
      type: Number,
      default: 1,
    },
    previousVersions: [
      {
        content: {
          type: mongoose.Schema.Types.Mixed,
          required: true,
        },
        modifiedBy: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        modifiedAt: {
          type: Date,
          default: Date.now,
        },
        version: Number,
        comments: String,
      },
    ],
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    reviewedBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    reviewDate: Date,
    history: [
      {
        action: {
          type: String,
          required: true,
          enum: ["criação", "edição", "revisão", "finalização"],
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
reportSchema.pre(/^find/, function (next) {
  this.populate({
    path: "createdBy",
    select: "name email",
  }).populate({
    path: "reviewedBy",
    select: "name email",
  });
  next();
});

module.exports = mongoose.model("Report", reportSchema);
