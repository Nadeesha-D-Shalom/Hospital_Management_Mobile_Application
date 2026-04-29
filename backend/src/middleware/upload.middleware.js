const multer = require('multer');
const fs = require('fs');
const path = require('path');

const doctorImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(__dirname, '..', '..', 'uploads', 'doctor-images');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const name = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
    cb(null, name);
  },
});

const doctorImageFileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, JPG, or PNG files are allowed'), false);
  }
};

const doctorImageUpload = multer({
  storage: doctorImageStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: doctorImageFileFilter,
});

const reportFileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(__dirname, '..', '..', 'uploads', 'appointment-reports');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const name = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
    cb(null, name);
  },
});

const reportFileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, JPG, PNG, or PDF files are allowed'), false);
  }
};

const reportFileUpload = multer({
  storage: reportFileStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: reportFileFilter,
});

module.exports = {
  doctorImageUpload,
  reportFileUpload,
};
