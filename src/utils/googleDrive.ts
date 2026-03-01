// Google Drive via n8n
const N8N_URL = 'https://n8n.amabrouk.cfd'

/**
 * رفع صورة إلى Google Drive عبر n8n
 */
export async function uploadImage(
  file: File,
  folder: string,
  fileName: string
): Promise<{ url: string; fileId: string }> {
  try {
    const formData = new FormData()
    formData.append('data', file) // n8n expects 'data' as key
    formData.append('fileName', fileName)
    formData.append('folder', folder)

    const response = await fetch(`${N8N_URL}/webhook/upload-image`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to upload image')
    }

    const result = await response.json()
    
    return {
      url: `https://drive.google.com/uc?export=view&id=${result.fileId}`,
      fileId: result.fileId,
    }
  } catch (error: any) {
    console.error('Upload error:', error)
    throw error
  }
}

/**
 * حذف صورة من Google Drive عبر n8n
 */
export async function deleteImage(fileId: string): Promise<void> {
  try {
    const response = await fetch(`${N8N_URL}/webhook/delete-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileId }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to delete image')
    }
  } catch (error: any) {
    console.error('Delete error:', error)
    // Don't throw - image might already be deleted
  }
}
