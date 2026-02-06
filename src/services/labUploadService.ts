import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { storage, db } from '@/config/firebase'
import { v4 as uuidv4 } from 'uuid'

export async function uploadLabImage(
  patientId: string,
  imageFile: File,
  onProgress: (percent: number) => void = () => {}
): Promise<{ scanId: string; uploadComplete: boolean }> {
  const scanId = uuidv4()
  const extension = imageFile.name.split('.').pop() || 'jpg'
  const storagePath = `lab_uploads/${patientId}/${scanId}.${extension}`

  const resultRef = doc(db, 'patients', patientId, 'labs', scanId)
  await setDoc(resultRef, {
    status: 'uploading',
    fileName: imageFile.name,
    fileSize: imageFile.size,
    createdAt: serverTimestamp(),
  })

  const storageRef = ref(storage, storagePath)
  const uploadTask = uploadBytesResumable(storageRef, imageFile)

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        onProgress(Math.round(progress))
      },
      async (error) => {
        await setDoc(resultRef, { status: 'upload_failed', error: error.message }, { merge: true })
        reject(error)
      },
      async () => {
        resolve({ scanId, uploadComplete: true })
      }
    )
  })
}
