<!-- Extra script to export definition of data format -->
<script lang="ts">
  interface BlockDataFormat {
    x: number | string | Date,
    y: number | string | Date,
    value: number | undefined,
    metaData: any,
    text: string,
  }

  export { type BlockDataFormat }
</script>

<script setup lang="ts">
import {onMounted, ref} from 'vue';

import { select, 
         scaleBand,
         Selection,
         scaleSequential,
         interpolateViridis } from "d3";
import Tooltip from './Tooltip.vue'
import { TooltipData } from './Tooltip.vue'

let svg:Selection<SVGSVGElement>;

const props = defineProps<{ blockData: Array<Array<BlockDataFormat>>, 
                            xRange: Array<string>,
                            yRange: Array<string>,
                            minMax: Array<number>}>()

let width = 1200;
let height = 450;

let squareSize = 12

const plotContainer = ref<HTMLDivElement | null>(null)
const d3Content = ref(null)

const plotOffset = {x:25,y:150}

const tooltipPos = ref<Array<number>>([0,0])
const tooltipInfo = ref<TooltipData | null>(null)

const color = scaleSequential(props.minMax, interpolateViridis);

function formatTooltipInfo(d:BlockDataFormat){

  let formattedTooltipData = {
    "Z-score":{
      'text': d.value,
      'indent': 0
    }
   }

  return formattedTooltipData
}

onMounted(()=>{
   if(plotContainer.value){
    width = plotContainer.value.offsetWidth
    height = plotContainer.value.offsetHeight
  }

  svg = select(d3Content.value)
      .attr("width", width)
      .attr("height", height)
      .attr("preserveAspectRatio", "xMinYMin meet")
      .attr("viewBox", [0, 0, width, height]);

   color.domain(props.minMax)

   updateVisuals()
})

function updateVisuals(){
  const x = scaleBand(props.xRange, [plotOffset.x, plotOffset.x+props.xRange.length*(squareSize+1.5)]);
  const y = scaleBand(props.yRange, [plotOffset.y, plotOffset.y+props.yRange.length*(squareSize+1.5)]);

  let rows = svg.selectAll('g')
    .data(props.blockData)
    .join("g")
      .attr("transform", (d:any) => `translate(0,${y(d[0].y)})`);
      
  let rowEntry = rows.selectAll('g')
    .data((d:any)=>d)
    .join('g')
      .attr("transform", (d:any) => `translate(${x(d.x)},0)`)
      .on('mouseover',function(this:any, e:any, d:any){
        tooltipPos.value = [e.offsetX, e.offsetY]
        tooltipInfo.value = formatTooltipInfo(d)
        select(this)
          .select('rect')
            .attr('class', (d:any)=>{
              return d.value ? "svg-hover-border" : "svg-no-border"
            })
      })
      .on("mousemove", (e:any)=>{
        tooltipPos.value = [e.offsetX, e.offsetY]
      })
      .on("mouseout", function(this:any,e:any){
        tooltipPos.value = [Number.MAX_VALUE, Number.MAX_VALUE]
        tooltipInfo.value = null
        select(this)
          .select('rect')
            .attr('class', "svg-no-border")
      })

  rowEntry.append('rect')
      .attr("width", squareSize)
      .attr("height", squareSize)
      .attr("fill", (d:any) => { 
        return d.value < 2.3 ? 'whitesmoke' :
               color(Number(d.value))
      })

  rowEntry.append('text')
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr('x', squareSize/2)
      .attr('y', squareSize/2+2)
      .attr('class','prevent-select svg-light')
      .text((d:any)=>d.text)

  let axesLabels = svg.append('g')
  
  // display row names
  axesLabels.append('g')
      .selectAll('text')
      .data(props.yRange)
      .join('text')
        .attr("text-anchor", "end")
        .style("user-select", "none")
        .style("font-size", "10px")
        .attr('transform', (d:any)=>`translate(${plotOffset.x-2},${y(d)+squareSize/2+3})`)
        .text((d:any,i:number)=>d)

  // display column names
  axesLabels.append('g')
      .selectAll('text')
      .data(props.xRange)
      .join('text')
        .attr("text-anchor", "start")
        .style("user-select", "none")
        .style("font-size", "10px")
        .attr('transform', (d:any)=>`translate(${x(d)+squareSize/2+2},${plotOffset.y-2}) rotate(-45) `)
        .text((d:any)=>d)
}

window.addEventListener("resize", ()=>{
  if(plotContainer.value){
    width = plotContainer.value.offsetWidth
    height = plotContainer.value.offsetHeight
  }

  svg
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]);
});
</script>

<template>
 <div class="d-flex position-relative justify-content-center align-items-center flex-column w-100 h-100 p-2"> <!-- Add padding above the container so the width and height are properly calculated in the setup script-->
    <div ref="plotContainer" class="d-flex justify-content-center align-items-center flex-column w-100 h-100">
      <svg ref="d3Content"></svg>
    </div>
    <Tooltip title="" :class="[tooltipInfo ? 'd-flex' : 'd-none']" :tooltipData="tooltipInfo" :position="tooltipPos"/>
  </div>
</template>

<style scoped>

</style>
