import { createWebHistory, createRouter } from 'vue-router'

import MasterRecipe from '../views/MasterRecipe.vue'
import GeneralRecipe from '../views/GeneralRecipe.vue'
const routes = [
  { path: '/', component: GeneralRecipe },
  { path: '/master-recipe', component: MasterRecipe },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
