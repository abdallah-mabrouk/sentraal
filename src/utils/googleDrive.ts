// Google Drive via Supabase Edge Function (Combined)
import { supabase } from '@/lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

/**
 * رفع صورة إلى Google Drive
 */
export async function uploadImage(
  file: File,
  folder: string,
  fileName: string
): Promise<{ url: string; fileId: string }> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)
    formData.append('fileName', fileName)

    const { data: { session } } = await supabase.auth.getSession()
    
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/google-drive?operation=upload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: formData,
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to upload image')
    }

    const result = await response.json()
    
    return {
      url: result.url,
      fileId: result.fileId,
    }
  } catch (error) {
    console.error('Upload error:', error)
    throw error
  }
}

/**
 * حذف صورة من Google Drive
 */
export async function deleteImage(fileId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/google-drive?operation=delete`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete image')
    }
  } catch (error) {
    console.error('Delete error:', error)
    throw error
  }
}
