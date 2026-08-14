import type { UserSnippet } from '../../src/types/commands'
import { listSnippets, saveSnippet as dbSaveSnippet, deleteSnippet as dbDeleteSnippet } from './db'

export function getAll(): UserSnippet[] {
  return listSnippets()
}

export function save(snippet: UserSnippet): UserSnippet {
  dbSaveSnippet(snippet)
  return snippet
}

export function remove(id: string): void {
  dbDeleteSnippet(id)
}

export { remove as delete }

export function findSnippetByName(name: string): UserSnippet | undefined {
  return listSnippets().find((s) => s.name === name)
}

export default {
  getAll,
  save,
  delete: remove,
  findSnippetByName
}
