/**
 * Azure Blob Storage helper.
 *
 * Handles:
 *   - Uploading files
 *   - Downloading private files
 *   - Deleting files
 */

const {
  BlobServiceClient,
} = require('@azure/storage-blob');

const crypto = require('crypto');
const path = require('path');

const connectionString =
  process.env.AZURE_STORAGE_CONNECTION_STRING;

const containerName =
  process.env.AZURE_STORAGE_CONTAINER || 'uploads';

if (!connectionString) {
  throw new Error(
    'AZURE_STORAGE_CONNECTION_STRING is not configured'
  );
}

const blobServiceClient =
  BlobServiceClient.fromConnectionString(
    connectionString
  );

const containerClient =
  blobServiceClient.getContainerClient(
    containerName
  );

/**
 * Upload a Multer file to Azure Blob Storage.
 *
 * @param {Object} file Multer file object
 * @param {string} folder Blob folder, e.g. "avatars"
 * @returns {Promise<string>} Blob path
 */
async function uploadFile(file, folder) {
  if (!file?.buffer) {
    throw new Error(
      'No file buffer provided for Blob Storage upload'
    );
  }

  await containerClient.createIfNotExists();

  const ext = path
    .extname(file.originalname || '')
    .toLowerCase();

  const fileName =
    `${crypto.randomUUID()}${ext}`;

  const blobPath =
    `${folder}/${fileName}`;

  const blockBlobClient =
    containerClient.getBlockBlobClient(
      blobPath
    );

  await blockBlobClient.uploadData(
    file.buffer,
    {
      blobHTTPHeaders: {
        blobContentType:
          file.mimetype ||
          'application/octet-stream',
      },
    }
  );

  return blobPath;
}

/**
 * Download a private Blob Storage file.
 *
 * Returns a readable stream plus content metadata
 * so Express can stream the file to the browser.
 *
 * @param {string} blobPath
 * @returns {Promise<Object>}
 */
async function downloadFile(blobPath) {
  if (!blobPath) {
    throw new Error(
      'Blob path is required'
    );
  }

  const blockBlobClient =
    containerClient.getBlockBlobClient(
      blobPath
    );

  const properties =
    await blockBlobClient.getProperties();

  const downloadResponse =
    await blockBlobClient.download();

  return {
    stream: downloadResponse.readableStreamBody,
    contentType:
      properties.contentType ||
      'application/octet-stream',
    contentLength:
      properties.contentLength,
  };
}

/**
 * Delete a Blob Storage file.
 *
 * Failure to delete an old file should not
 * normally break the main application operation.
 *
 * @param {string} blobPath
 */
async function deleteFile(blobPath) {
  if (!blobPath) {
    return;
  }

  const blockBlobClient =
    containerClient.getBlockBlobClient(
      blobPath
    );

  try {
    await blockBlobClient.deleteIfExists();
  } catch (err) {
    console.error(
      'Failed to delete Blob Storage file:',
      blobPath,
      err.message
    );
  }
}

module.exports = {
  uploadFile,
  downloadFile,
  deleteFile,
};