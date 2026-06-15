import { NO_SERIES_DOC_MAPPING } from './noSeriesMapping.js'
import { supabase } from './supabase.js'
import { calculateNextNo } from './noSeriesRuntime.js'

const FALLBACK_LINKED_FORM = 'ไม่ผูกกับเอกสาร'

const toDateObject = (value = new Date()) => {
  if (value === null || value === undefined || value === '') {
    return new Date()
  }
  const date = value instanceof Date ? new Date(value) : new Date(value)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

const toDateOnly = (value = new Date()) => {
  return toDateObject(value).toISOString().split('T')[0]
}

const replaceFormatTokens = (format, date) => {
  const d = toDateObject(date)
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = String(d.getFullYear())

  return format
    .replace('YYYY', yyyy)
    .replace('YY', yy)
    .replace('MM', mm)
}

const getSequenceFromDocNo = (docNo, hashCount) => {
  if (!docNo || hashCount <= 0) return 0
  const suffix = String(docNo).replace(/[^0-9]/g, '').slice(-hashCount)
  return parseInt(suffix, 10) || 0
}

export function generateNextNo(format, lastNo, date = new Date()) {
  const replacedFormat = replaceFormatTokens(format, date)
  const hashCount = (format.match(/#/g) || []).length

  if (hashCount === 0) return replacedFormat

  const prefixPart = replacedFormat.replace(/#/g, '')
  const nextNum = lastNo && String(lastNo).startsWith(prefixPart)
    ? getSequenceFromDocNo(lastNo, hashCount) + 1
    : 1

  return `${prefixPart}${String(nextNum).padStart(hashCount, '0')}`
}

async function getSeriesHeader(client, code) {
  const { data, error } = await client
    .from('no_series')
    .select('*')
    .eq('code', code)
    .maybeSingle()

  if (error) throw error
  return data
}

async function getActiveSeriesLine(client, code, workingDate) {
  const { data, error } = await client
    .from('no_series_lines')
    .select('*')
    .eq('series_code', code)
    .lte('starting_date', toDateOnly(workingDate))
    .order('starting_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

async function getLatestPersistedDocNo(client, tableName, colName, prefixPart) {
  if (!tableName || !colName) return null

  const { data, error } = await client
    .from(tableName)
    .select(colName)
    .like(colName, `${prefixPart}%`)
    .order(colName, { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data?.[colName] || null
}

export async function resolveNoSeriesContext(code, workingDate = new Date(), supabaseClient = null) {
  const client = supabaseClient || supabase
  const [header, line] = await Promise.all([
    getSeriesHeader(client, code),
    getActiveSeriesLine(client, code, workingDate)
  ])

  if (!header && !line) return null

  const formatToUse = line?.format || header?.format || `${code}-YYMM-###`
  const linkedForm = header?.linked_form || FALLBACK_LINKED_FORM
  const mapping = NO_SERIES_DOC_MAPPING[linkedForm] || NO_SERIES_DOC_MAPPING[code] || NO_SERIES_DOC_MAPPING[FALLBACK_LINKED_FORM]
  const replacedFormat = replaceFormatTokens(formatToUse, workingDate)
  const hashCount = (formatToUse.match(/#/g) || []).length
  const prefixPart = replacedFormat.replace(/#/g, '')

  return {
    code,
    workingDate: toDateObject(workingDate),
    header,
    line,
    lineId: line?.id || null,
    headerId: header?.id || null,
    formatToUse,
    linkedForm,
    mapping,
    replacedFormat,
    hashCount,
    prefixPart,
    lastNoUsed: line?.last_no_used || header?.last_no_used || null,
    isLegacy: !line
  }
}

export async function peekNextNo(code, workingDate = new Date(), supabaseClient = null) {
  const client = supabaseClient || supabase
  const context = await resolveNoSeriesContext(code, workingDate, client)

  if (!context) return null
  if (context.hashCount === 0) {
    return {
      nextNo: context.replacedFormat,
      series: context.line || context.header,
      header: context.header,
      line: context.line,
      lineId: context.lineId,
      isLegacy: context.isLegacy
    }
  }

  const persistedDocNo = await getLatestPersistedDocNo(
    client,
    context.mapping?.tableName,
    context.mapping?.colName,
    context.prefixPart
  )

  const nextNoState = calculateNextNo({
    prefixPart: context.prefixPart,
    hashCount: context.hashCount,
    persistedDocNo,
    lastNoUsed: context.lastNoUsed,
    startingNo: context.line?.starting_no || null,
  })

  return {
    nextNo: nextNoState.nextNo,
    series: context.line || context.header,
    header: context.header,
    line: context.line,
    lineId: context.lineId,
    linkedForm: context.linkedForm,
    persistedDocNo,
    lastNoUsed: context.lastNoUsed,
    startingNo: context.line?.starting_no || null,
    source: nextNoState.source,
    isLegacy: context.isLegacy
  }
}

export async function getNextNo(code, workingDate = new Date(), supabaseClient = null) {
  return peekNextNo(code, workingDate, supabaseClient)
}

export async function updateLastNo(code, no, workingDate = new Date(), supabaseClient = null) {
  const client = supabaseClient || supabase
  const context = await resolveNoSeriesContext(code, workingDate, client)

  if (!context) return

  if (context.headerId) {
    await client
      .from('no_series')
      .update({
        last_no_used: no,
        last_date_used: toDateOnly(workingDate)
      })
      .eq('id', context.headerId)
  }

  if (context.lineId) {
    await client
      .from('no_series_lines')
      .update({
        last_no_used: no,
        last_date_used: toDateObject(workingDate).toISOString()
      })
      .eq('id', context.lineId)
  }
}
