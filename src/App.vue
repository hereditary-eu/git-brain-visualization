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
import GutVis, { BlockDataFormat } from './components/GutVis.vue'
import HorizontalBarChart from './components/visualization-components/HorizontalBarChart.vue'
import { csvParse, dsvFormat, extent, schemePastel1, scaleOrdinal } from 'd3'

import modalityContributionsFile from './assets/data/Modality_contributions.txt?raw'
import gutComponentsFile from './assets/data/gut/gut-microbiota-lica-results.csv?raw'
import { handleFileDrop } from './utils/io'

const ssv = dsvFormat(" ");
const PRESENTATION = ref<boolean>(import.meta.env.VITE_PRESENTATION)

// Load modality contributions
const modalityColor = scaleOrdinal([0,1,2,3],schemePastel1);

const modalityContributions = ref<{[component:string]:{[modality:number]:{percentage:number, color:string}}}>({})

const modalityContribution = ref<{[name:number]:{percentage:number, color:string}}>({})

let gutXRange = ref<Array<String>|undefined>(undefined)

let gutBlockData = ref<BlockDataFormat[][]|undefined>(undefined)

let components : Array<string> = [];

let maxGutComponentValue = 1

const activeComponent = ref<string | undefined>(undefined)

const currentModality = ref<number | undefined>(undefined)

const modalities = ref<Map<number, number|string>>(new Map<number, number | string>())

function setActive(component : string){
  activeComponent.value = component
  setContributions()
}

function setContributions(){
  if(activeComponent.value){
    modalityContribution.value = modalityContributions.value[activeComponent.value] ? modalityContributions.value[activeComponent.value] : {} 
  }
}

function loadExampleGutMicroBiota(){
  gutBlockData.value = Array.from(csvParse(gutComponentsFile, (row:any,rowIndex:number,columns)=>{
    gutXRange.value = columns;
    return Object.entries(row).map(([key,val])=>{
      return {
        x: String(key),
        y: String(rowIndex+1), 
        value: Number(val), 
        text:''
      }
    })
  }))

  components = gutBlockData.value.map((d:any)=>d[0].y)
  maxGutComponentValue = Math.max(...(extent(gutBlockData.value.flat().map((d:any)=>d.value)).map((d:any)=>Math.abs(d))))
}

function loadGutMicroBiota(e:DragEvent){
  let files : Array<File> = []

  if(e.dataTransfer){
    files = handleFileDrop(e.dataTransfer)
  }
  
  const reader = new FileReader();

  reader.addEventListener(
    "load",
    () => {
      if(reader.result && typeof reader.result === "string"){
        gutBlockData.value = Array.from(csvParse(reader.result, (row:any,rowIndex:number,columns)=>{
          gutXRange.value = columns;
          return Object.entries(row).map(([key,val])=>{
            return {
              x: String(key),
              y: String(rowIndex+1), 
              value: Number(val), 
              text:''
            }
          })
        }))

        components = gutBlockData.value.map((d:any)=>d[0].y)
        maxGutComponentValue = Math.max(...(extent(gutBlockData.value.flat().map((d:any)=>d.value)).map((d:any)=>Math.abs(d))))
      }
    },
    false,
  );

  if (files[0]) {
    reader.readAsText(files[0]);
  }

  
}

function loadExampleModalityContributions(){
  ssv.parseRows(modalityContributionsFile, (row:Array<string>, rowIndex:number)=>{
    modalities.value.set(rowIndex,rowIndex == 0 ? 'Microbiota':rowIndex);
    row.forEach((column:string,i:number)=>{
      if(!modalityContributions.value[String(i+1)]){
        modalityContributions.value[String(i+1)] = {}
      }
      modalityContributions.value[String(i+1)][rowIndex] = {percentage:Number(column), color:modalityColor(rowIndex) as string};
      
    })
    
    return {}
  })
}

function loadModalityContribution(e:DragEvent){
  let files : Array<File> = []

  if(e.dataTransfer){
    files = handleFileDrop(e.dataTransfer)
  }
  
  const reader = new FileReader();

  reader.addEventListener(
    "load",
    () => {
      if(reader.result && typeof reader.result === "string"){
        ssv.parseRows(reader.result, (row:Array<string>, rowIndex:number)=>{
          modalities.value.set(rowIndex,rowIndex == 0 ? 'Microbiota':rowIndex);
          row.forEach((column:string,i:number)=>{
            if(!modalityContributions.value[String(i+1)]){
              modalityContributions.value[String(i+1)] = {}
            }
            modalityContributions.value[String(i+1)][rowIndex] = {percentage:Number(column), color:modalityColor(rowIndex) as string};
           
          })
          
          return {}
        })
      }
    },
    false,
  );

  if (files[0]) {
    reader.readAsText(files[0]);
  }
}
</script>

<template>
  <div class="d-flex flex-column p-1 h-50 w-100">
    <div class="d-flex justify-content-center align-items-center h-100 p-0 card">
      <div class="w-100" v-if="!gutBlockData" @drop.prevent="loadGutMicroBiota" @dragenter.prevent @dragover.prevent>
        <h2>No gut-microbiota LICA data loaded. Drag and drop a LICA csv file here.</h2>
        <button class="btn btn-success" @click="loadExampleGutMicroBiota">Or press here to load the example set.</button>
        <div class="d-flex flex-column justify-content-center align-items-center mt-2"> 
          <h4>Example file: </h4>
          <table class="table w-25">
            <thead>
              <tr>
                <th scope="col">gut-microbiota name #1</th>
                <th scope="col">...</th>
                <th scope="col">gut-microbiota name #n</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>0.01</td>
                <td>…</td>
                <td>-0.01</td>
              </tr>
              <tr>
                <td>⋮</td>
                <td>⋱</td>
                <td>⋮</td>
              </tr>
              <tr>
                <td>4.1</td>
                <td>…</td>
                <td>-4.1</td>
              </tr>
            </tbody>
          </table>
          <div>Where the first (header) row contains all gut-microbiota names and the rest of the rows represent the components</div>
        </div>
      </div>
      <GutVis v-else :class="{'active':currentModality==0}" 
            @on-active="(value)=>{if(value){ setActive(value) }}" 
            :activeComponent="activeComponent" 
            :blockData="gutBlockData" 
            :xRange="gutXRange" 
            :yRange="[...Array(25).keys()].map((d:any)=>String(d+1))" 
            :max="maxGutComponentValue" 
            class="flex-grow-1"/>
    </div>
    
  </div>
  <div class="d-flex flex-row h-10 w-100">
    <div class="flex-shrink-1 h-100 p-1">
      <div class="d-flex align-items-center h-100 p-2 card">
        <div class="w-100">
          <strong>Selected component:</strong>
          <select class="form-select form-select-sm py-0 w-100" v-model="activeComponent" @change="setContributions">
            <option disabled selected :value="undefined" id="undefined">{{ (components.length == 0) ? "No data loaded, drop LICA gut-microbiota results above.": "Select a component here or by clicking the rows above." }}</option>
            <option v-for="c in components" :value="c" :id="c">{{ c }}</option>
          </select>
        </div>
        <div class="w-100">
          <strong>Selected modality:</strong>
          <select class="form-select form-select-sm  py-0 w-100" v-model="currentModality">
            <option disabled selected :value="undefined" id="undefined">{{ (modalities.size == 0) ? "No modalities loaded, drop modality contribution on the right.": "Select a modality here or on the right by clicking." }}</option>
            <option v-for="([index, modality]) in modalities" :value="index" :id="String(index)">{{ modality }}</option>
          </select>
        </div>
      </div>
    </div>
    <div class="flex-grow-1 h-100 p-1">
      <div class="d-flex justify-content-center align-items-center flex-column h-100 p-0 card overflow-hidden">
        <div class="d-flex flex-row w-100 justify-content-around align-items-center h-100" v-if="Object.keys(modalityContributions).length == 0" @drop.prevent="loadModalityContribution" @dragenter.prevent @dragover.prevent>
          <h2 class="m-0">No modality contributions loaded. Drag and drop a contribution file here.</h2>
          <button class="btn btn-success" @click="loadExampleModalityContributions">Or press here to load the example set.</button>
          <div class="d-flex flex-row justify-content-center align-items-center"> 
            <h4 class="mb-0 me-5">Example file: </h4>
            <table style="font-size:0.6rem;" class="table table-sm w-25">
              <thead>
                <tr>
                  <th scope="col" class="no-border"></th>
                  <th scope="col" style="white-space: nowrap;">Components →</th>
                  <th scope="col"></th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="white-space: nowrap;" class="no-border"><b>Modalities ↓</b></td>
                  <td>0.01</td>
                  <td>…</td>
                  <td>-0.01</td>
                </tr>
                <tr>
                  <td class="no-border"></td>
                  <td>⋮</td>
                  <td>⋱</td>
                  <td>⋮</td>
                </tr>
                <tr>
                  <td class="no-border"></td>
                  <td>4.1</td>
                  <td>…</td>
                  <td>-4.1</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <HorizontalBarChart v-else :distribution="modalityContribution" :modality="currentModality" :modalities="modalities" @onModalitySelect="(value:Modalities|undefined)=>currentModality=value?value:currentModality"/>
      </div>
    </div>
  </div>
  <div class="p-1 h-40 w-100">
    <BrainVis :class="{'active': Number(currentModality) > 0}" :activeComponent="activeComponent" :modality="currentModality" :components="components" :maxValue="maxGutComponentValue" class="d-flex justify-content-center align-items-center p-0 card h-100"/>
  </div>
  <div v-if="PRESENTATION" class="d-flex w-100 justify-content-between align-items-center flex-row position-absolute" style="z-index: 100; bottom:0%;" >
    <div></div>
    <div class="card p-2">
      <h1>Try it yourself: <b>https://edu.nl/3j7hg</b></h1>
    </div>
    <div></div>
  </div>
</template>

<style scoped>
  td.no-border,
  th.no-border {
    border-left: none;
    border-right: none;
    border-top: none;
    border-bottom: none;
  }
</style>
