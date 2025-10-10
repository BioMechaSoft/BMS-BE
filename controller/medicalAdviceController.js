// Get all unique symptoms, names, and medicine names as a single list
export const getAllSuggestions = catchAsyncErrors(async (req, res, next) => {
  const advices = await MedicalAdvice.find({}, { name: 1, symptoms: 1, type: 1, route: 1, dose: 1, frequency: 1, duration: 1 });
  let suggestions = [];
  advices.forEach(advice => {
    if (advice.name) suggestions.push(advice.name);
    if (Array.isArray(advice.symptoms)) suggestions.push(...advice.symptoms);
    if (advice.type) suggestions.push(advice.type);
    if (advice.route) suggestions.push(advice.route);
    if (advice.dose) suggestions.push(advice.dose);
    if (advice.frequency) suggestions.push(advice.frequency);
    if (advice.duration) suggestions.push(advice.duration);
  });
  // Clean up, deduplicate, and sort
  suggestions = Array.from(new Set(suggestions.filter(Boolean).map(s => s.trim()))).sort();
  res.status(200).json({ success: true, suggestions });
});
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { MedicalAdvice } from "../models/medicalAdviceSchema.js";
import { Message } from "../models/messageSchema.js";

export const createMedicalAdvice = catchAsyncErrors(async (req, res, next) => {
  const { name, symptoms, type, route, desese_description } = req.body;
  if (!name) return next(new ErrorHandler("Name is required", 400));

  const advice = await MedicalAdvice.create({
    name,
    symptoms: Array.isArray(symptoms) ? symptoms : symptoms ? [symptoms] : [],
    type,
    route,
    desese_description,
  });

  // create an internal message/log for this change
  try { await Message.create({ firstName: 'System', lastName: '', email: 'system@local', phone: '', message: `Medicine added: ${advice.name}`, sentAt: new Date() }); } catch(e){ }

  res.status(201).json({ success: true, advice });
});

export const getAllMedicalAdvice = catchAsyncErrors(async (req, res, next) => {
  // pagination: ?page=1&limit=10
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const total = await MedicalAdvice.countDocuments();
  const advices = await MedicalAdvice.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
  const totalPages = Math.ceil(total / limit) || 0;

  res.status(200).json({ success: true, advices, total, page, totalPages });
});

export const getMedicalAdviceById = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const advice = await MedicalAdvice.findById(id);
  if (!advice) return next(new ErrorHandler("Medical advice not found", 404));
  res.status(200).json({ success: true, advice });
});

export const updateMedicalAdvice = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const payload = { ...req.body };
  if (payload.symptoms && !Array.isArray(payload.symptoms)) {
    payload.symptoms = [payload.symptoms];
  }
  const updated = await MedicalAdvice.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });
  if (!updated) return next(new ErrorHandler("Medical advice not found", 404));
  res.status(200).json({ success: true, advice: updated, message: "Updated!" });
});

export const deleteMedicalAdvice = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const advice = await MedicalAdvice.findById(id);
  if (!advice) return next(new ErrorHandler("Medical advice not found", 404));
  await advice.deleteOne();
  try { await Message.create({ firstName: 'System', lastName: '', email: 'system@local', phone: '', message: `Medicine deleted: ${advice.name}`, sentAt: new Date() }); } catch(e){ }
  res.status(200).json({ success: true, message: "Deleted!" });
});

// Search by name, symptom, type, or route. Query params: q (general), name, symptom, type, route
export const searchMedicalAdvice = catchAsyncErrors(async (req, res, next) => {
  const { q, name, symptom, type, route } = req.query;
  const query = {};
  if (q) {
    const regex = new RegExp(q, "i");
    query.$or = [
      { name: regex },
      { desese_description: regex },
      { type: regex },
      { route: regex },
      { symptoms: { $elemMatch: { $regex: regex } } },
    ];
  }
  if (name) query.name = new RegExp(name, "i");
  if (symptom) query.symptoms = { $elemMatch: { $regex: new RegExp(symptom, "i") } };
  if (type) query.type = new RegExp(type, "i");
  if (route) query.route = new RegExp(route, "i");

  // pagination support for search as well
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  const total = await MedicalAdvice.countDocuments(query);
  const advices = await MedicalAdvice.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
  const totalPages = Math.ceil(total / limit) || 0;
  // always return a 200 with results and pagination metadata (empty array if none)
  res.status(200).json({ success: true, advices, total, page, totalPages });
});

// Bulk insert: accepts an array of advice objects in request body
export const bulkCreateMedicalAdvice = catchAsyncErrors(async (req, res, next) => {
  const items = req.body;
  if (!Array.isArray(items) || items.length === 0) return next(new ErrorHandler('Request body must be a non-empty array', 400));

  // Normalize items
  const normalized = items.map(it => ({
    name: it.name || it.Name || "",
    symptoms: Array.isArray(it.symptoms) ? it.symptoms : (it.symptoms ? (typeof it.symptoms === 'string' ? it.symptoms.split(',').map(s=>s.trim()).filter(Boolean) : [it.symptoms]) : []),
    type: it.type || it.Type || "",
    route: it.route || it.Route || "",
    desese_description: it.desese_description || it.desese_description || it.description || it.deseseDescription || "",
  })).filter(i => i.name);

  if (!normalized.length) return next(new ErrorHandler('No valid items to insert', 400));

  // Insert many, continue on errors (ordered: false)
  const result = await MedicalAdvice.insertMany(normalized, { ordered: false });
  res.status(201).json({ success: true, inserted: result.length, result });
});
