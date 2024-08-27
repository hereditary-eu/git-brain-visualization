<script setup lang="ts">
import { ref } from 'vue'
import BrainVis from './components/BrainVis.vue'
import { RestingStateNetworkType } from './components/BrainVis.vue'
import GutVis from './components/GutVis.vue'
import { dsvFormat, extent } from 'd3'

import subjectMicrobiotaDataFile from './assets/data/gut/HBS_ 30perfiltered_abs_extendedLICA_189.txt?raw'
import gutComponentsFile from './assets/data/gut/niftiOut_mi1.txt?raw'

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

let components : Array<string> = gutComponents.map((d:any)=>d[0].y)

const maxGutComponentValue = Math.max(...(extent(gutComponents.flat().map((d:any)=>d.value)).map((d:any)=>Math.abs(d))))

const activeComponent = ref<string | undefined>(undefined)

const currentRestingStateNetwork = ref<RestingStateNetworkType>(RestingStateNetworkType.DMN)

function setActive(component : string){
  activeComponent.value = component
}

</script>

<template>
  <div class="d-flex flex-column p-1 h-45 w-100">
    <!-- <div class="d-flex flex-shrink-1 justify-content-between align-items-center">
      <h2 class="ms-4 my-0">Gut-brain interplay</h2>
      <img class="h-25" alt="Hereditary logo" src="./assets/hereditary.svg"/>
    </div> -->
    <GutVis @on-active="(value)=>setActive(value)" :activeComponent="activeComponent" :blockData="gutComponents" :xRange="subjectMicrobiotaData.columns.slice(1)" :yRange="[...Array(25).keys()].map((d:any)=>String(d+1))" :max="maxGutComponentValue" class="flex-grow-1 card"/>
  </div>
  <div class="d-flex flex-row h-10 w-100">
    <div class="flex-shrink-1 h-100 p-1">
      <div class="d-flex align-items-center h-100 p-2 card">
        <h2>Active component</h2>
        <h3>{{ activeComponent }}</h3>
      </div>
    </div>
    <div class="flex-grow-1 h-100 p-1">
      <div class="d-flex justify-content-center align-items-center flex-column h-100 p-2 card">
        <h2>Modality contribution placeholder</h2>
      </div>
    </div>
  </div>
  <div class="p-1 h-45 w-100">
    <BrainVis :activeComponent="activeComponent" :restingStateNetwork="currentRestingStateNetwork" :components="components" class="p-0 card h-100"/>
  </div>
  
</template>

<style scoped>

</style>
