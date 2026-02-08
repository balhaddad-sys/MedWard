import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  FileText,
  TrendingUp,
  BookOpen,
  ChevronRight,
  User,
  Plus,
  Search,
  Edit3,
  BarChart3,
  Send,
} from 'lucide-react'
import { clsx } from 'clsx'
import { usePatientStore } from '@/stores/patientStore'
import { triggerHaptic } from '@/utils/haptics'

export default function ClinicRoot() {
  const patients = usePatientStore((s) => s.patients)
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<'schedule' | 'notes' | 'trends' | 'education'>('schedule')
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [noteContent, setNoteContent] = useState('')
  const selectedPatient = patients.find((p) => p.id === selectedPatientId)

  // Mock schedule data
  const scheduleSlots = [
    { time: '09:00', name: 'Available', status: 'open' as const },
    { time: '09:30', name: 'Available', status: 'open' as const },
    { time: '10:00', name: 'Available', status: 'open' as const },
    { time: '10:30', name: 'Available', status: 'open' as const },
    { time: '11:00', name: 'Available', status: 'open' as const },
    { time: '11:30', name: 'Available', status: 'open' as const },
    { time: '13:00', name: 'Available', status: 'open' as const },
    { time: '13:30', name: 'Available', status: 'open' as const },
    { time: '14:00', name: 'Available', status: 'open' as const },
    { time: '14:30', name: 'Available', status: 'open' as const },
  ]

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Patient Selector */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <select
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-800 focus:ring-2 focus:ring-stone-400 focus:border-transparent appearance-none"
            value={selectedPatientId}
            onChange={(e) => {
              triggerHaptic('tap')
              setSelectedPatientId(e.target.value)
            }}
          >
            <option value="">Select patient...</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.lastName}, {p.firstName} — {p.primaryDiagnosis}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
        {[
          { id: 'schedule' as const, label: 'Schedule', Icon: Calendar },
          { id: 'notes' as const, label: 'Notes', Icon: FileText },
          { id: 'trends' as const, label: 'Trends', Icon: TrendingUp },
          { id: 'education' as const, label: 'Education', Icon: BookOpen },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              triggerHaptic('tap')
              setActiveSection(tab.id)
            }}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors touch',
              activeSection === tab.id
                ? 'bg-white text-stone-800 shadow-sm'
                : 'text-stone-400 hover:text-stone-600'
            )}
          >
            <tab.Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* SCHEDULE SECTION */}
      {activeSection === 'schedule' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-700">Today's Clinic</h3>
            <span className="text-xs text-stone-400">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>

          <div className="space-y-1">
            {scheduleSlots.map((slot, idx) => (
              <div
                key={idx}
                className={clsx(
                  'flex items-center gap-3 p-3 rounded-lg border transition-colors touch',
                  slot.status === 'open'
                    ? 'bg-white border-stone-200 hover:bg-stone-50'
                    : slot.status === 'completed'
                      ? 'bg-stone-50 border-stone-200 opacity-60'
                      : 'bg-blue-50 border-blue-200'
                )}
              >
                <div className="w-14 text-sm font-mono font-semibold text-stone-500">
                  {slot.time}
                </div>
                <div
                  className={clsx(
                    'h-2 w-2 rounded-full flex-shrink-0',
                    slot.status === 'open' ? 'bg-stone-300' : slot.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={clsx(
                      'text-sm',
                      slot.status === 'open' ? 'text-stone-400 italic' : 'text-stone-800 font-medium'
                    )}
                  >
                    {slot.name}
                  </p>
                </div>
                {slot.status === 'open' && (
                  <button
                    onClick={() => triggerHaptic('tap')}
                    className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 touch"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NOTES SECTION */}
      {activeSection === 'notes' && (
        <div className="space-y-4">
          {!selectedPatientId ? (
            <div className="text-center py-12">
              <FileText className="h-10 w-10 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-400 text-sm">Select a patient to write notes</p>
            </div>
          ) : (
            <>
              {/* Patient context */}
              {selectedPatient && (
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-stone-200">
                  <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-stone-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-800">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </p>
                    <p className="text-xs text-stone-400">
                      {selectedPatient.primaryDiagnosis} | MRN: {selectedPatient.mrn}
                    </p>
                  </div>
                </div>
              )}

              {/* Note Workspace */}
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-stone-400" />
                    <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      Clinic Note
                    </span>
                  </div>
                  <span className="text-xs text-stone-400">
                    Type . for SmartText
                  </span>
                </div>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Start typing your clinic note...&#10;&#10;Use .hpi, .ros, .pe for SmartText expansion"
                  className="w-full min-h-[300px] p-4 text-sm text-stone-800 leading-relaxed resize-none focus:outline-none placeholder:text-stone-300"
                  style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
                />
                <div className="flex items-center justify-between px-4 py-2 border-t border-stone-100 bg-stone-50">
                  <span className="text-xs text-stone-400">
                    {noteContent.length} characters
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => triggerHaptic('tap')}
                      className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-200 rounded-lg transition-colors touch"
                    >
                      Save Draft
                    </button>
                    <button
                      onClick={() => triggerHaptic('tap')}
                      className="px-3 py-1.5 text-xs font-medium bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors touch flex items-center gap-1"
                    >
                      <Send className="h-3 w-3" />
                      Finalize
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TRENDS SECTION */}
      {activeSection === 'trends' && (
        <div className="space-y-4">
          {!selectedPatientId ? (
            <div className="text-center py-12">
              <BarChart3 className="h-10 w-10 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-400 text-sm">Select a patient to view trends</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-stone-700">Lab & Vitals Trends</h3>
                <button
                  onClick={() => navigate('/labs')}
                  className="text-xs text-blue-700 font-medium touch"
                >
                  View All Labs
                </button>
              </div>

              {/* Trend placeholder cards */}
              <div className="grid gap-3">
                {['HbA1c', 'Creatinine', 'Blood Pressure', 'Weight'].map((metric) => (
                  <div
                    key={metric}
                    className="bg-white rounded-lg border border-stone-200 p-4 touch hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-stone-700">{metric}</span>
                      <TrendingUp className="h-4 w-4 text-stone-300" />
                    </div>
                    <div className="h-12 bg-stone-50 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-stone-400 italic">
                        Trend data from lab history
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* EDUCATION SECTION */}
      {activeSection === 'education' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-700">Patient Education</h3>
          </div>

          {!selectedPatientId ? (
            <div className="text-center py-12">
              <BookOpen className="h-10 w-10 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-400 text-sm">
                Select a patient to generate education materials
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {[
                { title: 'Condition Overview', desc: 'Plain-language summary of diagnosis' },
                { title: 'Medication Guide', desc: 'What each medication does and side effects' },
                { title: 'Lifestyle Recommendations', desc: 'Diet, exercise, and activity guidance' },
                { title: 'Follow-Up Plan', desc: 'When to come back and what to watch for' },
                { title: 'Emergency Signs', desc: 'When to seek immediate care' },
              ].map((item) => (
                <button
                  key={item.title}
                  onClick={() => triggerHaptic('tap')}
                  className="w-full flex items-center justify-between p-4 bg-white rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors text-left touch"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-800">{item.title}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{item.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-stone-300 flex-shrink-0" />
                </button>
              ))}

              <button
                onClick={() => triggerHaptic('tap')}
                className="w-full py-3 rounded-lg bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors touch flex items-center justify-center gap-2 min-h-[48px]"
              >
                <Send className="h-4 w-4" />
                Generate Patient Summary
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
