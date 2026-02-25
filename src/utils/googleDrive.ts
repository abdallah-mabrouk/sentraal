import { google } from 'googleapis'

// المفاتيح من Environment Variables
const GOOGLE_DRIVE_CLIENT_EMAIL = import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_EMAIL
const GOOGLE_DRIVE_PRIVATE_KEY = import.meta.env.VITE_GOOGLE_DRIVE_PRIVATE_KEY
const GOOGLE_DRIVE_FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID

// التحقق من وجود المفاتيح
if (!GOOGLE_DRIVE_CLIENT_EMAIL || !GOOGLE_DRIVE_PRIVATE_KEY || !GOOGLE_DRIVE_FOLDER_ID) {
  console.warn('⚠️ Google Drive credentials not configured')
}

// إنشاء auth client
const getAuthClient = () => {
  try {
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_DRIVE_CLIENT_EMAIL,
        private_key: GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    })
  } catch (error) {
    console.error('Failed to create Google Drive auth client:', error)
    throw new Error('Google Drive not configured')
  }
}

// إنشاء drive client
const getDriveClient = async () => {
  const auth = getAuthClient()
  return google.drive({ version: 'v3', auth })
}

/**
 * رفع صورة إلى Google Drive
 * @param file - الملف المراد رفعه
 * @param category - الفئة (profiles, products, services, receipts)
 * @param fileName - اسم الملف
 * @returns { url, fileId } - الرابط المباشر و ID الملف
 */
export async function uploadImage(
  file: File,
  category: 'profiles' | 'products' | 'services' | 'receipts',
  fileName: string
): Promise<{ url: string; fileId: string }> {
  try {
    const drive = await getDriveClient()

    // تحويل File إلى stream
    const buffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)

    // رفع الملف
    const response = await drive.files.create({
      requestBody: {
        name: `${category}/${fileName}`,
        parents: [GOOGLE_DRIVE_FOLDER_ID!],
      },
      media: {
        mimeType: file.type,
        body: Buffer.from(uint8Array),
      },
      fields: 'id',
    })

    const fileId = response.data.id!

    // جعل الملف عام (للوصول المباشر)
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    })

    // الرابط المباشر
    const url = `https://drive.google.com/uc?export=view&id=${fileId}`

    return { url, fileId }
  } catch (error: any) {
    console.error('Error uploading to Google Drive:', error)
    throw new Error(error.message || 'Failed to upload image')
  }
}

/**
 * حذف صورة من Google Drive
 * @param fileId - ID الملف
 */
export async function deleteImage(fileId: string): Promise<void> {
  try {
    const drive = await getDriveClient()
    await drive.files.delete({ fileId })
  } catch (error: any) {
    console.error('Error deleting from Google Drive:', error)
    // لا نرمي خطأ هنا حتى لا نوقف العملية إذا كان الملف محذوف مسبقاً
  }
}

/**
 * حذف الصور القديمة (أكثر من 30 يوم) من فئة receipts
 * @returns عدد الملفات المحذوفة
 */
export async function cleanupOldReceipts(): Promise<number> {
  try {
    const drive = await getDriveClient()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // البحث عن الملفات القديمة في مجلد receipts
    const response = await drive.files.list({
      q: `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and name contains 'receipts/' and createdTime < '${thirtyDaysAgo.toISOString()}'`,
      fields: 'files(id, name, createdTime)',
      pageSize: 100,
    })

    // حذف الملفات
    let deletedCount = 0
    const files = response.data.files || []

    for (const file of files) {
      try {
        await drive.files.delete({ fileId: file.id! })
        deletedCount++
      } catch (error) {
        console.error(`Failed to delete file ${file.id}:`, error)
      }
    }

    return deletedCount
  } catch (error: any) {
    console.error('Error cleaning up old receipts:', error)
    return 0
  }
}

/**
 * الحصول على معلومات الملف
 * @param fileId - ID الملف
 */
export async function getFileInfo(fileId: string) {
  try {
    const drive = await getDriveClient()
    const response = await drive.files.get({
      fileId,
      fields: 'id, name, size, createdTime, mimeType',
    })
    return response.data
  } catch (error: any) {
    console.error('Error getting file info:', error)
    throw new Error(error.message || 'Failed to get file info')
  }
}

/**
 * الحصول على حجم المجلد (إجمالي الصور المُرفوعة)
 */
export async function getFolderSize(): Promise<{ count: number; size: number }> {
  try {
    const drive = await getDriveClient()
    const response = await drive.files.list({
      q: `'${GOOGLE_DRIVE_FOLDER_ID}' in parents`,
      fields: 'files(size)',
      pageSize: 1000,
    })

    const files = response.data.files || []
    const totalSize = files.reduce((sum, file) => sum + parseInt(file.size || '0'), 0)

    return {
      count: files.length,
      size: totalSize,
    }
  } catch (error: any) {
    console.error('Error getting folder size:', error)
    return { count: 0, size: 0 }
  }
}

/**
 * تنسيق حجم الملف (bytes إلى MB/GB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
