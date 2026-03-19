import { ref } from 'vue'
import { useWorkspaceActions } from '@/shell/composables/useWorkspaceActions'

export function useRecipeWorkspace() {
  const workspaceRef = ref(null)
  const actions = useWorkspaceActions(workspaceRef)

  return {
    workspaceRef,
    ...actions
  }
}
