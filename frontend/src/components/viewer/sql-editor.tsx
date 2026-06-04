import { useMemo, useRef } from 'react'
import type { KeyboardEventHandler } from 'react'

type TokenType = 'text' | 'keyword' | 'string' | 'number' | 'comment' | 'function'

type Token = {
  type: TokenType
  value: string
}

const KEYWORDS: ReadonlySet<string> = new Set([
    'select',
    'from',
    'where',
    'group',
    'by',
    'order',
    'limit',
    'offset',
    'join',
    'left',
    'right',
    'inner',
    'outer',
    'full',
    'cross',
    'on',
    'as',
    'and',
    'or',
    'not',
    'in',
    'is',
    'null',
    'like',
    'ilike',
    'distinct',
    'union',
    'all',
    'with',
    'case',
    'when',
    'then',
    'else',
    'end',
    'true',
    'false',
    'having',
    'into',
    'insert',
    'update',
    'delete',
    'create',
    'table',
    'view',
    'values',
    'returning',
    'cast',
    'between',
    'exists',
])

function isAlphaNumericUnderscore(char: string): boolean {
  const code = char.charCodeAt(0)
  return (
    (code >= 48 && code <= 57) || // 0-9
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) || // a-z
    char === '_'
  )
}

function isDigit(char: string): boolean {
  const code = char.charCodeAt(0)
  return code >= 48 && code <= 57
}

function tokenizeSql(sql: string): Token[] {
  const tokens: Token[] = []
  let index = 0

  while (index < sql.length) {
    const ch = sql[index]
    const next = sql[index + 1]

    if (ch === '-' && next === '-') {
      const start = index
      index += 2
      while (index < sql.length && sql[index] !== '\n') index++
      tokens.push({ type: 'comment', value: sql.slice(start, index) })
      continue
    }

    if (ch === '/' && next === '*') {
      const start = index
      index += 2
      while (index < sql.length) {
        if (sql[index] === '*' && sql[index + 1] === '/') {
          index += 2
          break
        }
        index++
      }
      tokens.push({ type: 'comment', value: sql.slice(start, index) })
      continue
    }

    if (ch === "'") {
      const start = index
      index++
      while (index < sql.length) {
        if (sql[index] === "'") {
          if (sql[index + 1] === "'") {
            index += 2
            continue
          }
          index++
          break
        }
        index++
      }
      tokens.push({ type: 'string', value: sql.slice(start, index) })
      continue
    }

    if (isDigit(ch)) {
      const start = index
      index++
      while (index < sql.length && (isDigit(sql[index]) || sql[index] === '.')) index++
      tokens.push({ type: 'number', value: sql.slice(start, index) })
      continue
    }

    if (isAlphaNumericUnderscore(ch) && !isDigit(ch)) {
      const start = index
      index++
      while (index < sql.length && isAlphaNumericUnderscore(sql[index])) index++
      const word = sql.slice(start, index)
      const wordLower = word.toLowerCase()

      let nextNonWhitespaceIndex = index
      while (nextNonWhitespaceIndex < sql.length && /\s/.test(sql[nextNonWhitespaceIndex])) {
        nextNonWhitespaceIndex++
      }

      if (KEYWORDS.has(wordLower)) {
        tokens.push({ type: 'keyword', value: word })
      } else if (sql[nextNonWhitespaceIndex] === '(') {
        tokens.push({ type: 'function', value: word })
      } else {
        tokens.push({ type: 'text', value: word })
      }
      continue
    }

    tokens.push({ type: 'text', value: ch })
    index++
  }

  return tokens
}

function tokenClass(tokenType: TokenType): string {
  switch (tokenType) {
    case 'keyword':
      return 'text-[#cf222e] dark:text-[#ff7b72]'
    case 'string':
      return 'text-[#0a3069] dark:text-[#a5d6ff]'
    case 'number':
      return 'text-[#8250df] dark:text-[#d2a8ff]'
    case 'comment':
      return 'text-[#6e7781] dark:text-[#8b949e]'
    case 'function':
      return 'text-[#8250df] dark:text-[#d2a8ff]'
    default:
      return ''
  }
}

export function SqlEditor({
  value,
  onChange,
  onKeyDown,
  rows,
  placeholder,
  className,
}: {
  value: string
  onChange: (next: string) => void
  onKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>
  rows?: number
  placeholder?: string
  className?: string
}) {
  const preRef = useRef<HTMLPreElement | null>(null)

  const tokens = useMemo(() => tokenizeSql(value), [value])

  return (
    <div
      className={[
        'relative w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm',
        'dark:border-[#30363d] dark:bg-[#0d1117]',
        'focus-within:ring-2 focus-within:ring-slate-400 dark:focus-within:ring-slate-600',
        className,
      ].join(' ')}
    >
      <pre
        ref={preRef}
        aria-hidden="true"
        className={[
          'sql-editor-pre pointer-events-none absolute inset-0 overflow-auto px-3 py-2',
          'font-mono text-xs leading-5 text-[#24292f] dark:text-[#c9d1d9]',
          'whitespace-pre-wrap break-words',
        ].join(' ')}
      >
        {tokens.map((t, i) => (
          <span key={i} className={tokenClass(t.type)}>
            {t.value}
          </span>
        ))}
      </pre>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onScroll={(e) => {
          if (!preRef.current) return
          preRef.current.scrollTop = e.currentTarget.scrollTop
          preRef.current.scrollLeft = e.currentTarget.scrollLeft
        }}
        rows={rows}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        className={[
          'relative z-10 w-full resize-y bg-transparent px-3 py-2',
          'font-mono text-xs leading-5',
          'text-transparent caret-[#24292f] dark:caret-[#c9d1d9]',
          'placeholder:text-slate-400 dark:placeholder:text-slate-500',
          'focus:outline-none',
        ].join(' ')}
        placeholder={placeholder}
      />
    </div>
  )
}
