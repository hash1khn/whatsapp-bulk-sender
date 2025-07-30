const CLOUD_NAME = 'diw6rekpm';
const UPLOAD_PRESET = 'Requests_images';

interface UploadResult {
  secure_url: string;
  public_id: string;
}

export async function uploadImages(files: File[]): Promise<{ timestamp: string; urls: string[] }> {
  try {
    console.log(`Starting upload of ${files.length} files...`);
    const timestamp = Date.now().toString();
    console.log('Using timestamp:', timestamp);

    const uploadPromises = files.map(async (file, index) => {
      console.log(`Preparing file ${index + 1}/${files.length}:`, {
        name: file.name,
        type: file.type,
        size: file.size
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', `requests/${timestamp}`);

      console.log(`Uploading file ${index + 1} to Cloudinary...`);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Upload failed for file ${index + 1}:`, errorText);
        throw new Error(`Upload failed: ${errorText}`);
      }

      const data = await response.json();
      console.log(`File ${index + 1} uploaded successfully:`, data.secure_url);
      return data.secure_url;
    });

    console.log('Waiting for all uploads to complete...');
    const urls = await Promise.all(uploadPromises);
    console.log('All uploads completed successfully:', urls);

    return {
      timestamp,
      urls
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
} 