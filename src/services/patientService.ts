import {
  createPatient,
  updatePatient,
  deletePatient,
  getPatient,
  getAllPatients,
} from '@/services/firebase/patients'
import type { PatientFormData } from '@/types'

/**
 * High-level patient CRUD operations.
 * Wraps the lower-level Firebase functions with a cleaner API
 * for use in workspace views (Acute mode, etc.).
 */
export const PatientService = {
  async getPatient(id: string) {
    return getPatient(id)
  },

  async getAllPatients() {
    return getAllPatients()
  },

  async addPatient(data: PatientFormData, userId: string) {
    return createPatient(data, userId)
  },

  async updatePatient(id: string, updates: Partial<PatientFormData>) {
    return updatePatient(id, updates)
  },

  async deletePatient(id: string) {
    return deletePatient(id)
  },
}
