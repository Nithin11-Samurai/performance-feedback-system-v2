const asyncHandler = require('../utils/asyncHandler');
const certificationService = require('../services/certificationService');

// file_path is stored as just the filename; build the client-facing URL here
// rather than in the service layer, since the URL is an HTTP-layer concern.
function withFileUrl(cert) {
  if (!cert) return cert;
  return { ...cert, file_url: cert.file_path ? `/uploads/certificates/${cert.file_path}` : null };
}

// GET /api/certifications/:userId
const listCertifications = asyncHandler(async (req, res) => {
  const certifications = await certificationService.listCertifications(req.user, req.params.userId);
  res.json({ success: true, data: { certifications: certifications.map(withFileUrl) } });
});

// POST /api/certifications/:userId  (multipart/form-data, field: certificateFile)
const createCertification = asyncHandler(async (req, res) => {
  const cert = await certificationService.createCertification(req.user, req.params.userId, req.body, req.file);
  res.status(201).json({ success: true, message: 'Certification added successfully', data: { certification: withFileUrl(cert) } });
});

// PATCH /api/certifications/:userId/:certId  (multipart/form-data, optional new file)
const updateCertification = asyncHandler(async (req, res) => {
  const cert = await certificationService.updateCertification(
    req.user,
    req.params.userId,
    req.params.certId,
    req.body,
    req.file
  );
  res.json({ success: true, message: 'Certification updated successfully', data: { certification: withFileUrl(cert) } });
});

// DELETE /api/certifications/:userId/:certId
const deleteCertification = asyncHandler(async (req, res) => {
  await certificationService.deleteCertification(req.user, req.params.userId, req.params.certId);
  res.json({ success: true, message: 'Certification removed' });
});

module.exports = { listCertifications, createCertification, updateCertification, deleteCertification };
