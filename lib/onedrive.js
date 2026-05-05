/**
 * Utility for OneDrive / Microsoft Graph API interaction.
 * Runs on the server side.
 */

const TENANT_ID = process.env.MS_GRAPH_TENANT_ID;
const CLIENT_ID = process.env.MS_GRAPH_CLIENT_ID;
const CLIENT_SECRET = process.env.MS_GRAPH_CLIENT_SECRET;
const USER_EMAIL = process.env.MS_GRAPH_USER_EMAIL || 'admin@dowa-tht.co.th';

/**
 * Gets an access token using Client Credentials flow.
 */
async function getAccessToken() {
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Missing Microsoft Graph credentials in environment variables');
  }

  const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'client_credentials',
    scope: 'https://graph.microsoft.com/.default',
  });

  const response = await fetch(url, {
    method: 'POST',
    body: body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to get access token: ${data.error_description || data.error}`);
  }

  return data.access_token;
}

/**
 * Uploads a file to a specific folder in OneDrive.
 * @param {Buffer | ArrayBuffer} fileBuffer - The file content.
 * @param {string} fileName - The name of the file to save as.
 * @param {string} folderPath - The path in OneDrive (relative to root).
 */
export async function uploadToOneDrive(fileBuffer, fileName, folderPath = 'Apps/Dowa-IT-System') {
  const token = await getAccessToken();
  
  // Clean path and build URL
  const cleanPath = folderPath.startsWith('/') ? folderPath.slice(1) : folderPath;
  const url = `https://graph.microsoft.com/v1.0/users/${USER_EMAIL}/drive/root:/${cleanPath}/${fileName}:/content`;

  const response = await fetch(url, {
    method: 'PUT',
    body: fileBuffer,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`OneDrive upload failed: ${data.error?.message || response.statusText}`);
  }

  return {
    id: data.id,
    name: data.name,
    webUrl: data.webUrl,
    path: data.parentReference.path + '/' + data.name,
  };
}

/**
 * Deletes a file from OneDrive using its item ID.
 * @param {string} itemId - The ID of the item to delete.
 */
export async function deleteFromOneDrive(itemId) {
  const token = await getAccessToken();
  const url = `https://graph.microsoft.com/v1.0/users/${USER_EMAIL}/drive/items/${itemId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    const data = await response.json().catch(() => ({}));
    throw new Error(`OneDrive delete failed: ${data.error?.message || response.statusText}`);
  }

  return { success: true };
}

/**
 * Fetches a file from OneDrive as a Buffer.
 * @param {string} filePathOrId - The path or ID of the file.
 */
export async function getOneDriveFileContent(filePathOrId) {
  const token = await getAccessToken();
  let url;
  
  if (filePathOrId.startsWith('/drive/root:') || filePathOrId.includes('/')) {
    const cleanPath = filePathOrId.startsWith('/') ? filePathOrId.slice(1) : filePathOrId;
    url = `https://graph.microsoft.com/v1.0/users/${USER_EMAIL}/drive/root:/${cleanPath}:/content`;
  } else {
    url = `https://graph.microsoft.com/v1.0/users/${USER_EMAIL}/drive/items/${filePathOrId}/content`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`OneDrive fetch failed: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
