import type { UserSnippet } from '../../src/types/commands'
import { listSnippets, saveSnippet as dbSaveSnippet, deleteSnippet as dbDeleteSnippet } from './db'

export function getSnippets(): UserSnippet[] {
  return listSnippets()
}

export function upsertSnippet(snippet: UserSnippet): UserSnippet {
  dbSaveSnippet(snippet)
  return snippet
}

export function removeSnippet(id: string): void {
  dbDeleteSnippet(id)
}

export function findSnippetByName(name: string): UserSnippet | undefined {
  return listSnippets().find((s) => s.name === name)
}

export default {
  getSnippets,
  upsertSnippet,
  removeSnippet,
  findSnippetByName
}
