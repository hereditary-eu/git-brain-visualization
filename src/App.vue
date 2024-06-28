<script setup lang="ts">
import BrainVis from './components/BrainVis.vue'
import GutVis from './components/GutVis.vue'
</script>

<template>
  <div class="p-1 w-50">
    <BrainVis class="p-0 card h-100"/>
  </div>
  <div class="d-flex flex-column p-1 w-50">
    <GutVis class="flex-grow-1 card"/>
    <div class="d-flex flex-shrink-1 justify-content-between align-items-center">
      <h2 class="ms-4 my-0">Gut-brain interplay</h2>
      <img class="w-25" alt="Hereditary logo" src="./assets/hereditary-horizontal.svg"/>
    </div>
  </div>
</template>

<style scoped>

</style>
