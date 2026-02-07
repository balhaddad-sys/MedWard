import { useState } from 'react'
import { Pill, Search, AlertTriangle, BookOpen, ArrowRightLeft, Shield } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { callAI } from '@/services/ai/claude'
import { clsx } from 'clsx'

interface DrugResult {
  name: string
  content: string
  timestamp: Date
}

const categories = [
  { id: 'info', label: 'Drug Info', icon: <BookOpen className="h-3.5 w-3.5" /> },
  { id: 'interactions', label: 'Interactions', icon: <ArrowRightLeft className="h-3.5 w-3.5" /> },
  { id: 'safety', label: 'Safety', icon: <Shield className="h-3.5 w-3.5" /> },
]

const commonDrugs = [
  'Metformin', 'Lisinopril', 'Amlodipine', 'Metoprolol', 'Atorvastatin',
  'Omeprazole', 'Furosemide', 'Warfarin', 'Enoxaparin', 'Insulin',
  'Amoxicillin', 'Vancomycin', 'Piperacillin-Tazobactam', 'Ceftriaxone',
  'Morphine', 'Paracetamol', 'Aspirin', 'Clopidogrel',
]

export function DrugInfoPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('info')
  const [result, setResult] = useState<DrugResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<DrugResult[]>([])
  const [interactionDrugs, setInteractionDrugs] = useState<string[]>(['', ''])

  const handleSearch = async (drugName?: string) => {
    const drug = drugName || searchTerm.trim()
    if (!drug) return
    setLoading(true)
    try {
      let prompt = ''
      if (activeCategory === 'info') {
        prompt = `Provide concise clinical drug information for "${drug}" suitable for a ward doctor. Include:
1. **Class**: Pharmacological class
2. **Mechanism**: Brief mechanism of action
3. **Indications**: Common clinical indications
4. **Dosing**: Standard adult dosing (oral/IV as applicable)
5. **Renal/Hepatic Adjustment**: Key adjustments needed
6. **Common Side Effects**: Top 5
7. **Serious Adverse Effects**: Must-know serious effects
8. **Monitoring**: Key labs/parameters to monitor
9. **Key Interactions**: Top drug interactions
10. **Clinical Pearls**: Practical tips

Be concise and clinically focused.`
      } else if (activeCategory === 'interactions') {
        const drugs = interactionDrugs.filter(Boolean)
        if (drugs.length < 2) {
          prompt = `List the most clinically significant drug interactions for "${drug}". For each interaction, include the interacting drug, mechanism, clinical significance (major/moderate/minor), and management recommendation. Focus on the top 10 most relevant interactions for hospital settings.`
        } else {
          prompt = `Analyze the drug interaction between ${drugs.join(' and ')}. Include:
1. Interaction type and mechanism
2. Clinical significance (major/moderate/minor)
3. Expected effects
4. Management recommendations
5. Monitoring parameters
6. Alternative medications if contraindicated`
        }
      } else {
        prompt = `Provide a safety profile for "${drug}" focusing on:
1. **Contraindications**: Absolute and relative
2. **Black Box Warnings**: If any
3. **Pregnancy/Lactation**: Category and recommendations
4. **Overdose**: Signs, symptoms, and management
5. **High-Alert**: Is this a high-alert medication? Special precautions?
6. **Look-alike/Sound-alike**: Common confusion medications
7. **Storage**: Special storage requirements
Be concise and ward-relevant.`
      }

      const response = await callAI({ prompt, maxTokens: 2048 })
      const drugResult: DrugResult = {
        name: drug,
        content: response.content,
        timestamp: new Date(),
      }
      setResult(drugResult)
      setHistory((prev) => [drugResult, ...prev.filter((h) => h.name !== drug)].slice(0, 10))
    } catch {
      setResult({
        name: drug,
        content: 'Failed to retrieve drug information. Please check that the AI service is configured and try again.',
        timestamp: new Date(),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-ward-text flex items-center gap-2">
          <Pill className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" /> Drug Information
        </h1>
        <p className="text-sm text-ward-muted mt-1">AI-powered drug lookup, interactions, and safety information</p>
      </div>

      {/* Category tabs */}
      <Tabs tabs={categories} activeTab={activeCategory} onChange={setActiveCategory} />

      {/* Search */}
      <Card padding="sm">
        {activeCategory === 'interactions' ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-ward-muted flex-shrink-0" />
              <input
                type="text"
                className="input-field flex-1"
                placeholder="First drug..."
                value={interactionDrugs[0]}
                onChange={(e) => setInteractionDrugs([e.target.value, interactionDrugs[1]])}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-ward-muted flex-shrink-0" />
              <input
                type="text"
                className="input-field flex-1"
                placeholder="Second drug..."
                value={interactionDrugs[1]}
                onChange={(e) => setInteractionDrugs([interactionDrugs[0], e.target.value])}
                onKeyDown={handleKeyDown}
              />
            </div>
            <Button
              onClick={() => handleSearch(interactionDrugs.filter(Boolean).join(' + '))}
              loading={loading}
              icon={<Search className="h-4 w-4" />}
              className="w-full min-h-[44px]"
              disabled={interactionDrugs.filter(Boolean).length < 1}
            >
              Check Interactions
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-ward-muted flex-shrink-0" />
            <input
              type="text"
              className="input-field flex-1"
              placeholder="Search drug name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button
              onClick={() => handleSearch()}
              loading={loading}
              icon={<Search className="h-4 w-4" />}
              className="min-h-[44px]"
              disabled={!searchTerm.trim()}
            >
              <span className="hidden sm:inline">Search</span>
            </Button>
          </div>
        )}
      </Card>

      {/* Quick access drugs */}
      {!result && !loading && (
        <div>
          <h3 className="text-xs font-semibold text-ward-muted uppercase tracking-wider mb-2">Common Medications</h3>
          <div className="flex flex-wrap gap-1.5">
            {commonDrugs.map((drug) => (
              <button
                key={drug}
                onClick={() => {
                  setSearchTerm(drug)
                  if (activeCategory === 'interactions') {
                    if (!interactionDrugs[0]) {
                      setInteractionDrugs([drug, interactionDrugs[1]])
                    } else {
                      setInteractionDrugs([interactionDrugs[0], drug])
                    }
                  } else {
                    handleSearch(drug)
                  }
                }}
                className="px-2.5 py-1.5 text-xs font-medium bg-white border border-ward-border rounded-lg hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition-colors"
              >
                {drug}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <Card className="p-8">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full" />
            <p className="text-sm text-ward-muted">Looking up drug information...</p>
          </div>
        </Card>
      )}

      {/* Result */}
      {result && !loading && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Pill className="h-4 w-4 text-primary-600" />
              <CardTitle>{result.name}</CardTitle>
            </div>
            <Badge variant="info">{activeCategory === 'info' ? 'Drug Info' : activeCategory === 'interactions' ? 'Interactions' : 'Safety'}</Badge>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="text-sm text-ward-text whitespace-pre-wrap">{result.content}</p>
            </div>
            <div className="flex items-start gap-2 mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-800">
                AI-generated drug information. Always verify with official formulary, drug references, and clinical pharmacist before making prescribing decisions.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 0 && !loading && (
        <div>
          <h3 className="text-xs font-semibold text-ward-muted uppercase tracking-wider mb-2">Recent Lookups</h3>
          <div className="flex flex-wrap gap-1.5">
            {history.map((h) => (
              <button
                key={h.name + h.timestamp.toISOString()}
                onClick={() => {
                  setResult(h)
                  setSearchTerm(h.name)
                }}
                className={clsx(
                  'px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                  result?.name === h.name
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'bg-white border-ward-border hover:bg-gray-50'
                )}
              >
                {h.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
