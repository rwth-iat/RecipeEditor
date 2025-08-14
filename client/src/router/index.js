import { createWebHistory, createRouter } from "vue-router";

import MasterRecipe from "../views/MasterRecipe.vue";
import GeneralRecipe from "../views/GeneralRecipe.vue";
const routes = [
  {
    path: "/editor",
    name: "Editor",
    component: GeneralRecipe,
  },
  { path: "/", component: GeneralRecipe },
  {
    path: "/master-recipe",
    name: "Master Recipe Editor",
    component: MasterRecipe,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
