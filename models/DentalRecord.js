const mongoose = require("mongoose");

const dentalRecordSchema = new mongoose.Schema(
  {
    patient: {
      name: String,
      birthDate: Date,
      gender: {
        type: String,
        enum: ["masculino", "feminino", "outro", "não_informado"],
        default: "não_informado",
      },
      identification: {
        type: String,
        unique: true,
        sparse: true,
      },
    },
    status: {
      type: String,
      enum: ["identificado", "não_identificado", "em_análise"],
      default: "em_análise",
    },
    dentalCharacteristics: {
      teeth: [
        {
          number: {
            type: Number,
            required: true,
            min: 11,
            max: 48,
          },
          status: {
            type: String,
            enum: [
              "presente",
              "ausente",
              "tratado",
              "cariado",
              "protese",
              "implante",
            ],
            required: true,
          },
          observations: String,
          treatments: [
            {
              type: String,
              enum: ["restauração", "canal", "coroa", "ponte", "outro"],
            },
          ],
        },
      ],
      generalCharacteristics: {
        occlusion: String,
        palate: String,
        anomalies: [String],
        other: String,
      },
    },
    radiographs: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Evidence",
      },
    ],
    photographs: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Evidence",
      },
    ],
    matchCases: [
      {
        case: {
          type: mongoose.Schema.ObjectId,
          ref: "Case",
        },
        matchScore: Number,
        matchDetails: String,
        matchDate: {
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
    history: [
      {
        action: {
          type: String,
          required: true,
          enum: ["criação", "edição", "identificação", "comparação"],
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

// Índices para otimização de busca
dentalRecordSchema.index({
  "patient.name": "text",
  "patient.identification": "text",
});
dentalRecordSchema.index({ status: 1 });
dentalRecordSchema.index({ "dentalCharacteristics.teeth.number": 1 });

// Middleware para popular referências importantes
dentalRecordSchema.pre(/^find/, function (next) {
  this.populate({
    path: "createdBy",
    select: "name email",
  });
  next();
});

module.exports = mongoose.model("DentalRecord", dentalRecordSchema);
