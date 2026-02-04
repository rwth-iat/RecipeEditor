import { ref } from 'vue'
import { useWorkspaceActions } from '@/shell/composables/useWorkspaceActions'

export function useRecipeWorkspace(storageKey) {
  const workspaceRef = ref(null)
  const actions = useWorkspaceActions(workspaceRef, storageKey)

  return {
    workspaceRef,
    ...actions
  }
}
