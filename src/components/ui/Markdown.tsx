import { Fragment, createElement } from 'react'
import { clsx } from 'clsx'

interface MarkdownProps {
  content: string
  className?: string
}

/** Parse inline markdown: **bold**, *italic*, `code`, and plain text. */
function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  // Match **bold**, *italic*, `code`
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let last = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index))
    }
    if (match[2]) {
      nodes.push(<strong key={match.index} className="font-semibold">{match[2]}</strong>)
    } else if (match[3]) {
      nodes.push(<em key={match.index}>{match[3]}</em>)
    } else if (match[4]) {
      nodes.push(
        <code key={match.index} className="px-1 py-0.5 bg-slate-100 text-slate-700 rounded text-[0.85em] font-mono">
          {match[4]}
        </code>
      )
    }
    last = match.index + match[0].length
  }

  if (last < text.length) {
    nodes.push(text.slice(last))
  }

  return nodes.length > 0 ? nodes : [text]
}

/**
 * Lightweight markdown renderer that converts a subset of markdown to React
 * elements. Supports headings (##), bold, italic, code, unordered lists (- / *),
 * ordered lists (1.), and horizontal rules (---).
 *
 * No dangerouslySetInnerHTML — all output is safe JSX.
 */
export function Markdown({ content, className }: MarkdownProps) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Empty line → spacing
    if (line.trim() === '') {
      i++
      continue
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} className="my-3 border-slate-200" />)
      i++
      continue
    }

    // Headings
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2].replace(/\*\*/g, '') // strip bold in headings
      const tag = `h${Math.min(level + 1, 6)}`
      const sizes: Record<number, string> = {
        1: 'text-base font-bold mt-4 mb-2',
        2: 'text-sm font-bold mt-3 mb-1.5',
        3: 'text-sm font-semibold mt-2 mb-1',
        4: 'text-sm font-medium mt-2 mb-1',
      }
      elements.push(
        createElement(tag, { key: i, className: clsx(sizes[level] || sizes[4], 'text-slate-800') }, ...parseInline(text))
      )
      i++
      continue
    }

    // Unordered list block
    if (/^\s*[-*]\s+/.test(line)) {
      const items: React.ReactNode[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const text = lines[i].replace(/^\s*[-*]\s+/, '')
        items.push(<li key={i} className="text-sm text-inherit">{parseInline(text)}</li>)
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-outside pl-5 space-y-0.5 my-1.5">
          {items}
        </ul>
      )
      continue
    }

    // Ordered list block
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: React.ReactNode[] = []
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        const text = lines[i].replace(/^\s*\d+[.)]\s+/, '')
        items.push(<li key={i} className="text-sm text-inherit">{parseInline(text)}</li>)
        i++
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-outside pl-5 space-y-0.5 my-1.5">
          {items}
        </ol>
      )
      continue
    }

    // Table block (lines starting with |)
    if (/^\|/.test(line.trim())) {
      const tableRows: string[][] = []
      while (i < lines.length && /^\|/.test(lines[i].trim())) {
        const row = lines[i].trim()
        // Skip separator rows like |---|---|
        if (/^\|[\s\-:|]+\|$/.test(row)) {
          i++
          continue
        }
        const cells = row
          .split('|')
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
          .map((c) => c.trim())
        if (cells.length > 0) tableRows.push(cells)
        i++
      }
      if (tableRows.length > 0) {
        const [header, ...body] = tableRows
        elements.push(
          <div key={`tbl-${i}`} className="overflow-x-auto my-2">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {header.map((cell, ci) => (
                    <th key={ci} className="text-left px-2 py-1.5 font-semibold text-slate-700">
                      {parseInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri} className="border-b border-slate-100">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-2 py-1.5 text-inherit">
                        {parseInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }

    // Paragraph
    elements.push(
      <p key={i} className="text-sm text-inherit my-1">
        {parseInline(line)}
      </p>
    )
    i++
  }

  return (
    <div className={clsx('space-y-0.5', className)}>
      {elements.map((el, idx) => (
        <Fragment key={idx}>{el}</Fragment>
      ))}
    </div>
  )
}
