<script lang="ts">
interface TooltipData {
  [key:string]:{
    text:string|number,
    indent:number
  },
}
export { type TooltipData }
</script>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ 
  title: string,
  tooltipData: TooltipData | null,
  position: Array<number>,
}>()

const tooltipTransform = computed(() => {
  let transform = 'translate(0px,0px)'
  let pos = props.position
  if(pos){
    transform = `translate(${pos[0]}px,${pos[1]}px)`
  }
  return transform
})
</script>

<template>
  <div class="card guttooltip shadow p-2 align-items-start flex-column" :style="{ 'transform': tooltipTransform }">
    <strong class="align-self-center"> {{ title }} </strong>
    <div class="d-flex justify-toolTipData-between align-items-start flex-row">
      <div class="d-flex align-items-start flex-column pe-2">
        <strong :class="[content.indent ? 'ps-2' : 'ps-0']" v-for="(content, attribute) in tooltipData?tooltipData:{}" :key="attribute">{{ attribute }}</strong>
      </div>
      <div class="d-flex align-items-start flex-column">
        <div v-for="val in Object.values(tooltipData?tooltipData:{})" :key="val.text">{{ val.text }}</div>
      </div>
    </div>
  </div>
</template>

<style>
.guttooltip {
  position:absolute!important;
  top:20px;
  left:10px;
  z-index: 999;
  font-size: 0.8rem;
}
</style>