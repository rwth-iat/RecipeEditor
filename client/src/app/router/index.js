import { createWebHistory, createRouter } from "vue-router";

import GeneralRecipe from "@/features/general-recipe/pages/GeneralRecipePage.vue";
import MasterRecipe from "@/features/master-recipe/pages/MasterRecipePage.vue";

const routes = [
  {
    path: "/general-recipe-editor",
    name: "General Recipe Editor",
    component: GeneralRecipe,
  },
  {
    path: "/master-recipe-editor",
    name: "Master Recipe Editor",
    component: MasterRecipe,
  },
  { path: "/", component: GeneralRecipe },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
