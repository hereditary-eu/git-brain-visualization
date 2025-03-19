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
import {onMounted, ref, watch} from 'vue';

import { select, 
         scaleBand,
         Selection,
         scaleSequential,
         interpolateRdYlGn,
         BaseType } from "d3";
import Tooltip from './Tooltip.vue'
import RangeLegend from './visualization-components/RangeLegend.vue'
import { TooltipData } from './Tooltip.vue'
import numeral from 'numeral'

const props = defineProps<{ blockData: Array<Array<BlockDataFormat>>, 
                            xRange: Array<string>,
                            yRange: Array<string>,
                            max: number,
                            activeComponent: string | undefined}>()

const emit = defineEmits<{
  (e: 'onActive', value: string | undefined): void
}>()

let width = 2018;
let height = 502;

let squareSize = 12

const plotContainer = ref<HTMLDivElement | null>(null)
const d3Content = ref<SVGSVGElement>()

const plotOffset = {x:15,y:150}

const legendSize = ref<[number,number]>([20,props.yRange.length*(squareSize+1.5)])

const tooltipPos = ref<Array<number>>([0,0])
const tooltipInfo = ref<TooltipData | null>(null)

const thresholdValues = ref<[number,number]>([-2.3,2.3])

const color = scaleSequential([-props.max,props.max], interpolateRdYlGn)

let svg:Selection<SVGSVGElement, any, null, any>;
let rows : Selection<SVGGElement | BaseType, Array<BlockDataFormat>, SVGGElement, any>;

function formatTooltipInfo(d:BlockDataFormat){
   return {
    "Component":{
      'text': d.y,
      'indent': 0
    },
    "Micro-biota":{
      'text': d.x,
      'indent': 0
    },
    "Z-score":{
      'text': numeral(d.value).format('0.[00]'),
      'indent': 0
    }
   } as TooltipData
}

watch(()=> props.activeComponent, (activeComponent)=>{
    rows
      .attr('class', (d:any)=>{
              return d[0].y == activeComponent ? "group-active-border" : "group-no-border"
            })

    rows
      .filter((d:any)=>d[0].y==activeComponent)
        .raise()
})

watch(thresholdValues, (tvalues)=>{
  rows
    .selectAll('rect')
      .attr("fill", (d:any) => { 
        return d.value > tvalues[0] && d.value < tvalues[1]  ? 'whitesmoke' :
               color(Number(d.value))
      })
})

onMounted(()=>{
  if(d3Content.value){
    svg = select<SVGSVGElement,any>(d3Content.value)
      .attr("preserveAspectRatio", "xMinYMin meet")
      .attr("viewBox", [0, 0, width, height]);

    select("#legend")
      .attr("transform", `translate(${width-legendSize.value[0]-10},${plotOffset.y})`)

    color.domain([-props.max,props.max])

    setupPlot()
  }
})

function setupPlot(){
  const x = scaleBand(props.xRange, [plotOffset.x, plotOffset.x+props.xRange.length*(squareSize+1.5)]);
  const y = scaleBand(props.yRange, [plotOffset.y, plotOffset.y+props.yRange.length*(squareSize+1.5)]);

  let columnGroups = svg.append('g')

  columnGroups
    .selectAll('g')
    .data(props.xRange)
    .join('g')
      .attr('id', (d:any)=>`${d.replace(/^[^a-z]+|[^\w:.-]+/gi, "")}-group`)
      .attr("transform", (d:any) => `translate(${x(d)},${y(props.yRange[0])})`)
      .append('rect')
        .attr("width", squareSize)
        .attr("height", (props.yRange.length)*(squareSize+1.5)-1.5)
        .attr("fill-opacity", 0)

  let rowGroup = svg.append('g')
  
  rows = rowGroup.selectAll('g')
    .data(props.blockData)
    .join("g")
      .attr("transform", (d:any) => `translate(0,${y(d[0].y)})`);
      
  rows.selectAll('rect')
    .data((d:any)=>d)
    .join('rect')
      .attr("transform", (d:any) => `translate(${x(d.x)},0)`)
      .attr("width", squareSize)
      .attr("height", squareSize)
      .attr("fill", (d:any) => { 
        return d.value > -2.3 && d.value < 2.3  ? 'whitesmoke' :
               color(Number(d.value))
      })
      .on('mouseover',function(this:any, e:any, d:any){
        let component = d.y
        tooltipPos.value = [e.offsetX, e.offsetY]
        tooltipInfo.value = formatTooltipInfo(d)

        select(`#${d.x.replace(/^[^a-z]+|[^\w:.-]+/gi, "")}-group`)
            .attr('class', (d:any)=>{
              return d ? "group-hover-border" : "group-no-border"
            })
            .raise()

        select(this)
            .attr('class', (d:any)=>{
              return d.value ? "rect-hover-border" : "rect-no-border"
            })
            .raise()

         select(this.parentNode)
            .attr('class', (d:any)=>{
              return d ? "group-hover-border" : 
                          component != props.activeComponent ? "group-no-border" : "group-active-border"
            })
            .raise()
      })
      .on("mousemove", (e:any)=>{
        tooltipPos.value = [e.offsetX, e.offsetY]
      })
      .on("mouseout", function(this:any,_,d:any){
        let component = d.y
        tooltipPos.value = [Number.MAX_VALUE, Number.MAX_VALUE]
        tooltipInfo.value = null
        select(this)
            .attr('class', "rect-no-border")
        
        select(`#${d.x.replace(/^[^a-z]+|[^\w:.-]+/gi, "")}-group`)
          .attr('class', "group-no-border")

        select(this.parentNode)
            .attr('class', props.activeComponent != component ? "group-no-border" : "group-active-border")
      })
      .on('click', function(this:any,_,d:any){
        emit('onActive',d.y)
      })

  let axesLabels = svg.append('g')
  
  // display row names
  axesLabels.append('g')
      .selectAll('text')
      .data(props.yRange)
      .join('text')
        .attr("text-anchor", "end")
        .style("user-select", "none")
        .style("font-size", "10px")
        .attr('transform', (d:string)=>{
          let yPos : number | undefined = y(d)
          yPos = yPos ? yPos : -100;
          return `translate(${plotOffset.x-2},${yPos+squareSize/2+3})`
        })
        .text((d:any)=>d)

  // display column names
  axesLabels.append('g')
      .selectAll('text')
      .data(props.xRange)
      .join('text')
        .attr("text-anchor", "start")
        .style("user-select", "none")
        .style("font-size", "10px")
        .attr('transform', (d:any)=>{
          let xPos : number | undefined = x(d)
          xPos = xPos ? xPos : -100;
          return `translate(${xPos+squareSize/2+2},${plotOffset.y-2}) rotate(-45)`
        })
        .text((d:any)=>d)

  axesLabels.append("text")
    .attr("x", width-75)
    .attr("y", height-5)
    .attr("fill", "currentColor")
    .attr("text-anchor", "end")
    .attr("class", "title")
    .style("font-size", "12px")
    .text(`Micro-biota →`)

    axesLabels.append("text")
    .attr("x", 5)
    .attr("y", height-5)
    .attr("fill", "currentColor")
    .attr("text-anchor", "start")
    .attr("class", "title")
    .style("font-size", "12px")
    .text(`↓ LICA components`)
}

// window.addEventListener("resize", ()=>{
//   if(plotContainer.value){
//     width = plotContainer.value.offsetWidth
//     height = plotContainer.value.offsetHeight
//   }

//   svg
//     .attr("viewBox", [0, 0, width, height]);
// });
</script>

<template>
 <div class="d-flex position-relative justify-content-center align-items-center flex-column w-100 h-100 p-2"> <!-- Add padding above the container so the width and height are properly calculated in the setup script-->
    <div ref="plotContainer" class="d-flex justify-content-center align-items-center flex-column w-100 h-100">
      <svg ref="d3Content">
        <RangeLegend id="legend" :value="[-2.3,2.3]" :size="legendSize" :insideOut="false" :color="color"  @onChange="(tValues)=>thresholdValues = tValues"/>
      </svg>
    </div>
    <Tooltip title="" :class="[tooltipInfo ? 'd-flex' : 'd-none']" :tooltipData="tooltipInfo" :position="tooltipPos"/>
  </div>
</template>

<style scoped>

</style>
