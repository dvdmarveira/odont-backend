const mongoose = require("mongoose");

const caseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Título é obrigatório"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Descrição é obrigatória"],
    },
    type: {
      type: String,
      required: [true, "Tipo é obrigatório"],
      enum: ["identificação", "idade", "trauma", "outro"],
    },
    status: {
      type: String,
      enum: ["pendente", "em_andamento", "finalizado", "arquivado"],
      default: "pendente",
    },
    assignedTo: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Caso deve ser atribuído a um perito"],
    },
    patient: {
      name: String,
      birthDate: Date,
      gender: {
        type: String,
        enum: ["masculino", "feminino", "outro", "não_informado"],
        default: "não_informado",
      },
      identification: String,
    },
    history: [
      {
        action: {
          type: String,
          required: true,
          enum: [
            "criação",
            "edição",
            "visualização",
            "status_alterado",
            "documento_anexado",
          ],
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
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual populate para evidências
caseSchema.virtual("evidences", {
  ref: "Evidence",
  foreignField: "case",
  localField: "_id",
});

// Virtual populate para laudos
caseSchema.virtual("reports", {
  ref: "Report",
  foreignField: "case",
  localField: "_id",
});

// Middleware para popular referências importantes
caseSchema.pre(/^find/, function (next) {
  this.populate({
    path: "assignedTo",
    select: "name email",
  }).populate({
    path: "createdBy",
    select: "name email",
  });
  next();
});

module.exports = mongoose.model("Case", caseSchema);
