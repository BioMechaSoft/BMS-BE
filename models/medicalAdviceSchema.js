import mongoose from "mongoose";

const medicalAdviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Disease name is required!"],
      trim: true,
    },
    symptoms: {
      type: [String],
      default: [],
    },
    type: {
      type: String,
      trim: true,
    },
    route: {
      type: String,
      trim: true,
    },
    dose: {
      type: String,
      trim: true,
    },
    frequency: {
      type: String,
      trim: true,
    },
    duration: {
      type: String,
      trim: true,
    },
    desese_description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export const MedicalAdvice = mongoose.model("MedicalAdvice", medicalAdviceSchema);
