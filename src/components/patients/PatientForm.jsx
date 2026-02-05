import { useState, useEffect } from 'react';
import { 
  User, 
  FileText, 
  MapPin, 
  Activity, 
  Thermometer,
  Heart,
  Wind,
  Droplet,
  Save,
  X
} from 'lucide-react';
import FormInput, { Select, TextArea, Toggle } from '../ui/FormInput';
import Button from '../ui/Button';
import { WARDS, PATIENT_STATUS } from '../../config/constants';

/**
 * PatientForm Component
 * Form for adding or editing patient data
 * 
 * @param {object} patient - Existing patient data (for edit mode)
 * @param {function} onSubmit - Submit handler
 * @param {function} onCancel - Cancel handler
 * @param {boolean} loading - Loading state
 */
export function PatientForm({
  patient = null,
  onSubmit,
  onCancel,
  loading = false,
}) {
  const isEditing = !!patient?.id;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    fileNumber: '',
    age: '',
    sex: 'M',
    ward: '',
    bed: '',
    diagnosis: '',
    status: 'stable',
    notes: '',
    vitals: {
      hr: '',
      bp: '',
      temp: '',
      rr: '',
      spo2: '',
    },
  });

  const [errors, setErrors] = useState({});
  const [showVitals, setShowVitals] = useState(false);

  // Initialize form with existing patient data
  useEffect(() => {
    if (patient) {
      setFormData({
        name: patient.name || '',
        fileNumber: patient.fileNumber || '',
        age: patient.age?.toString() || '',
        sex: patient.sex || 'M',
        ward: patient.ward || '',
        bed: patient.bed || '',
        diagnosis: patient.diagnosis || '',
        status: patient.status || 'stable',
        notes: patient.notes || '',
        vitals: {
          hr: patient.vitals?.hr?.toString() || '',
          bp: patient.vitals?.bp || '',
          temp: patient.vitals?.temp?.toString() || '',
          rr: patient.vitals?.rr?.toString() || '',
          spo2: patient.vitals?.spo2?.toString() || '',
        },
      });
      // Show vitals if any exist
      if (patient.vitals && Object.values(patient.vitals).some(v => v)) {
        setShowVitals(true);
      }
    }
  }, [patient]);

  // Handle input change
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear error on change
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Handle vitals change
  const handleVitalsChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      vitals: {
        ...prev.vitals,
        [field]: value,
      },
    }));
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.fileNumber.trim()) {
      newErrors.fileNumber = 'File number is required';
    }

    if (!formData.age || isNaN(formData.age) || formData.age < 0 || formData.age > 150) {
      newErrors.age = 'Valid age is required';
    }

    if (!formData.ward) {
      newErrors.ward = 'Ward is required';
    }

    if (!formData.bed.trim()) {
      newErrors.bed = 'Bed number is required';
    }

    if (!formData.diagnosis.trim()) {
      newErrors.diagnosis = 'Diagnosis is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    // Clean vitals data (remove empty values, convert to numbers)
    const cleanVitals = {};
    Object.entries(formData.vitals).forEach(([key, value]) => {
      if (value !== '' && value !== null) {
        if (key === 'bp') {
          cleanVitals[key] = value;
        } else {
          const num = parseFloat(value);
          if (!isNaN(num)) {
            cleanVitals[key] = num;
          }
        }
      }
    });

    const submitData = {
      ...formData,
      age: parseInt(formData.age),
      vitals: Object.keys(cleanVitals).length > 0 ? cleanVitals : null,
    };

    onSubmit(submitData);
  };

  // Ward options
  const wardOptions = Object.entries(WARDS).map(([key, ward]) => ({
    value: key,
    label: ward.name,
  }));

  // Status options
  const statusOptions = Object.entries(PATIENT_STATUS).map(([key, status]) => ({
    value: key,
    label: status.label,
  }));

  // Sex options
  const sexOptions = [
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' },
  ];

  return (
    <form className="patient-form" onSubmit={handleSubmit}>
      {/* Basic Information Section */}
      <section className="form-section">
        <h3 className="form-section-title">
          <User size={18} />
          Patient Information
        </h3>

        <div className="form-grid">
          <FormInput
            id="name"
            label="Full Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
            required
            placeholder="Enter patient name"
          />

          <FormInput
            id="fileNumber"
            label="File Number"
            value={formData.fileNumber}
            onChange={(e) => handleChange('fileNumber', e.target.value)}
            error={errors.fileNumber}
            required
            placeholder="e.g., MRN123456"
          />

          <FormInput
            id="age"
            label="Age"
            type="number"
            min="0"
            max="150"
            value={formData.age}
            onChange={(e) => handleChange('age', e.target.value)}
            error={errors.age}
            required
            placeholder="Years"
          />

          <Select
            id="sex"
            label="Sex"
            value={formData.sex}
            onChange={(e) => handleChange('sex', e.target.value)}
            options={sexOptions}
          />
        </div>
      </section>

      {/* Location Section */}
      <section className="form-section">
        <h3 className="form-section-title">
          <MapPin size={18} />
          Location
        </h3>

        <div className="form-grid">
          <Select
            id="ward"
            label="Ward"
            value={formData.ward}
            onChange={(e) => handleChange('ward', e.target.value)}
            options={wardOptions}
            error={errors.ward}
            required
            placeholder="Select ward"
          />

          <FormInput
            id="bed"
            label="Bed"
            value={formData.bed}
            onChange={(e) => handleChange('bed', e.target.value)}
            error={errors.bed}
            required
            placeholder="e.g., 12A"
          />

          <Select
            id="status"
            label="Status"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            options={statusOptions}
          />
        </div>
      </section>

      {/* Diagnosis Section */}
      <section className="form-section">
        <h3 className="form-section-title">
          <FileText size={18} />
          Clinical Information
        </h3>

        <TextArea
          id="diagnosis"
          label="Diagnosis"
          value={formData.diagnosis}
          onChange={(e) => handleChange('diagnosis', e.target.value)}
          error={errors.diagnosis}
          required
          rows={2}
          placeholder="Primary diagnosis and relevant conditions"
        />

        <TextArea
          id="notes"
          label="Notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={3}
          placeholder="Additional notes (optional)"
        />
      </section>

      {/* Vitals Section */}
      <section className="form-section">
        <div className="form-section-header">
          <h3 className="form-section-title">
            <Activity size={18} />
            Vital Signs
          </h3>
          <Toggle
            id="showVitals"
            label="Include vitals"
            checked={showVitals}
            onChange={(e) => setShowVitals(e.target.checked)}
          />
        </div>

        {showVitals && (
          <div className="vitals-grid">
            <FormInput
              id="hr"
              label="Heart Rate"
              type="number"
              min="0"
              max="300"
              value={formData.vitals.hr}
              onChange={(e) => handleVitalsChange('hr', e.target.value)}
              placeholder="bpm"
              leftIcon={<Heart size={16} />}
            />

            <FormInput
              id="bp"
              label="Blood Pressure"
              value={formData.vitals.bp}
              onChange={(e) => handleVitalsChange('bp', e.target.value)}
              placeholder="120/80"
              leftIcon={<Activity size={16} />}
            />

            <FormInput
              id="temp"
              label="Temperature"
              type="number"
              step="0.1"
              min="30"
              max="45"
              value={formData.vitals.temp}
              onChange={(e) => handleVitalsChange('temp', e.target.value)}
              placeholder="°C"
              leftIcon={<Thermometer size={16} />}
            />

            <FormInput
              id="rr"
              label="Respiratory Rate"
              type="number"
              min="0"
              max="60"
              value={formData.vitals.rr}
              onChange={(e) => handleVitalsChange('rr', e.target.value)}
              placeholder="/min"
              leftIcon={<Wind size={16} />}
            />

            <FormInput
              id="spo2"
              label="SpO₂"
              type="number"
              min="0"
              max="100"
              value={formData.vitals.spo2}
              onChange={(e) => handleVitalsChange('spo2', e.target.value)}
              placeholder="%"
              leftIcon={<Droplet size={16} />}
            />
          </div>
        )}
      </section>

      {/* Form Actions */}
      <div className="form-actions">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          <X size={18} />
          Cancel
        </Button>

        <Button
          type="submit"
          variant="primary"
          loading={loading}
        >
          <Save size={18} />
          {isEditing ? 'Save Changes' : 'Add Patient'}
        </Button>
      </div>
    </form>
  );
}

export default PatientForm;
