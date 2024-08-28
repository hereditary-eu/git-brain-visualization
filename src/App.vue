<script lang="ts">
enum Modalities {
  'Microbiota'=1,
  'DMN'=2,
  'ECN'=3,
  'SNI'=4
}

export { Modalities }
</script>

<script setup lang="ts">
import { ref } from 'vue'
import BrainVis from './components/BrainVis.vue'
import GutVis from './components/GutVis.vue'
import HorizontalBarChart from './components/visualization-components/HorizontalBarChart.vue'
import { dsvFormat, extent, schemePastel1, scaleOrdinal } from 'd3'

import modalityContributionsFile from './assets/data/Modality_contributions.txt?raw'
import subjectMicrobiotaDataFile from './assets/data/gut/HBS_ 30perfiltered_abs_extendedLICA_189.txt?raw'
import gutComponentsFile from './assets/data/gut/niftiOut_mi1.txt?raw'

const ssv = dsvFormat(" ");

const modalityColor = scaleOrdinal([0,1,2,3],schemePastel1);

const modalityContributions : {[component:string]:{[modality:number]:{percentage:number, color:string}}}= {}
ssv.parseRows(modalityContributionsFile, (row:Array<string>, rowIndex:number)=>{
  row.forEach((column:string,i:number)=>{
    if(!modalityContributions[String(i+1)]){
      modalityContributions[String(i+1)] = {}
    }
    modalityContributions[String(i+1)][rowIndex+1] = {percentage:Number(column), color:modalityColor(rowIndex) as string};
  })
  
  return {}
})

const modalityContribution = ref<{[name:number]:{percentage:number, color:string}}>({})


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

const currentModality = ref<Modalities>(Modalities.DMN)

function setActive(component : string){
  activeComponent.value = component
  setContributions()
}

function setContributions(){
  if(activeComponent.value){
    modalityContribution.value = modalityContributions[activeComponent.value]
  }
}

</script>

<template>
  <div class="d-flex flex-column p-1 h-45 w-100">
    <!-- <div class="d-flex flex-shrink-1 justify-content-between align-items-center">
      <h2 class="ms-4 my-0">Gut-brain interplay</h2>
      <img class="h-25" alt="Hereditary logo" src="./assets/hereditary.svg"/>
    </div> -->
    <GutVis :class="{'active':currentModality==Modalities.Microbiota}" @on-active="(value)=>{if(value){ setActive(value) }}" :activeComponent="activeComponent" :blockData="gutComponents" :xRange="subjectMicrobiotaData.columns.slice(1)" :yRange="[...Array(25).keys()].map((d:any)=>String(d+1))" :max="maxGutComponentValue" class="flex-grow-1 card"/>
  </div>
  <div class="d-flex flex-row h-10 w-100">
    <div class="flex-shrink-1 h-100 p-1">
      <div class="d-flex align-items-center h-100 p-2 card">
        <div>
          <strong>Selected component:</strong>
          <div :class="{'text-danger':!activeComponent}">{{ activeComponent ? activeComponent : "Select a component by clicking the rows above." }}</div>
        </div>
        <div>
          <strong>Selected modality:</strong>
          <div>{{ currentModality ? Modalities[currentModality] : "Select a modality by clicking the regions to the right." }}</div>
        </div>
      </div>
    </div>
    <div class="flex-grow-1 h-100 p-1">
      <div class="d-flex justify-content-center align-items-center flex-column h-100 p-0 card overflow-hidden">
        <HorizontalBarChart :distribution="modalityContribution" :modality="currentModality" @onModalitySelect="(value:Modalities|undefined)=>currentModality=value?value:currentModality"/>
      </div>
    </div>
  </div>
  <div class="p-1 h-45 w-100">
    <BrainVis :class="{'active':[Modalities.DMN,Modalities.ECN,Modalities.SNI].includes(currentModality)}" :activeComponent="activeComponent" :modality="currentModality" :components="components" class="d-flex justify-content-center align-items-center p-0 card h-100"/>
  </div>
  
</template>

<style scoped>

</style>
