<script setup lang="ts">
import BrainVis from './components/BrainVis.vue'
import GutVis from './components/GutVis.vue'
import { dsvFormat, extent } from 'd3'
import { BlockDataFormat } from './components/GutVis.vue'

import modalityContributionsFile from './assets/test_data/niftiOut_mi1.txt?raw'
import subjectMicrobiotaDataFile from './assets/test_data/ModalityInput/HBS_ 30perfiltered_abs_extendedLICA_189.txt?raw'
import gutComponentsFile from './assets/test_data/niftiOut_mi1.txt?raw'

const ssv = dsvFormat(" ");

//const modalityContributions = ssv.parseRows(modalityContributionsFile)
const subjectMicrobiotaData = ssv.parse(subjectMicrobiotaDataFile)
let gutComponents = ssv.parseRows(gutComponentsFile, (row:any,rowIndex:number)=>{
  return row.map((d:any,columnIndex:number)=>{
    return {
      x: subjectMicrobiotaData.columns[rowIndex+1], // Plus one because the first column is PEPnumber (patient number)
      y: String(columnIndex+1), 
      value: Number(d), 
      text:''
    }
  })
})

gutComponents = gutComponents[0].map((_:any, colIndex:number) => gutComponents.map((row:any) => row[colIndex])); // transpose

const minMaxGutComponents = extent(gutComponents.flat().map((d:any)=>d.value))

</script>

<template>
  <div class="d-flex flex-column p-1 h-50 w-100">
    <!-- <div class="d-flex flex-shrink-1 justify-content-between align-items-center">
      <h2 class="ms-4 my-0">Gut-brain interplay</h2>
      <img class="h-25" alt="Hereditary logo" src="./assets/hereditary.svg"/>
    </div> -->
    <GutVis :blockData="gutComponents" :xRange="subjectMicrobiotaData.columns.slice(1)" :yRange="[...Array(25).keys()].map((d:any)=>String(d+1))" :minMax="minMaxGutComponents" class="flex-grow-1 card"/>
  </div>
  <div class="p-1 h-50 w-100">
    <BrainVis class="p-0 card h-100"/>
  </div>
  
</template>

<style scoped>

</style>
