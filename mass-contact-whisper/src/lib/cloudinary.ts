const CLOUD_NAME = 'diw6rekpm';
const UPLOAD_PRESET = 'Requests_images';

interface UploadResult {
  secure_url: string;
  public_id: string;
}

export async function uploadImages(files: File[]): Promise<{ urls: string[] }> {
  try {
    const urls = await Promise.all(
      files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('folder', 'requests');

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
          { method: 'POST', body: formData }
        );

        if (!response.ok) {
          throw new Error(`Upload failed: ${await response.text()}`);
        }

        const data = await response.json();
        return data.secure_url;
      })
    );

    return { urls };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}