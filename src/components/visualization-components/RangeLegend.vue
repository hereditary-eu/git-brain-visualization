<script setup lang="ts">
import {onMounted, ref, watch} from 'vue';

import { select, 
         Selection,
         brushY,
         scaleLinear} from "d3";

import { legend } from "../../utils/d3Utils"

const props = defineProps<{ color: any, // d3js scale function with color
                            value: [number, number],
                            size: [number, number],
                            insideOut: boolean
                          }>()

const emit = defineEmits<{
  (e: 'onChange', value: [number,number]): void
}>()

const container = ref<SVGGElement>()

let brushG : Selection<SVGGElement, any, any, any>;

const legendTickSpace = 0
const marginHandles = 3

// watch(()=> props.value, ()=>{
//   if(brushG){
//     drawLegend(brushG)
//   }
// })

function ramp(colorInterpolator : any, n = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = n;
  const context = canvas.getContext("2d");
  if(context){
    for (let i = 0; i < n; ++i) {
        context.fillStyle = colorInterpolator(i / (n - 1));
        context.fillRect(0, n-i, 1, 1);
    }
  }
  return canvas;
}

function drawLegend(g){
  g
  .selectAll("*").remove();

  g
  .call(legend, props.color, {'title': "z-score",'width': props.size[0], 'height':props.size[1], 'marginLeft': legendTickSpace, "marginRight":0, customRamp: ramp})
}

onMounted(()=>{
  if(container.value){
    let [width, height] = props.size

    let y = scaleLinear()
              .domain(props.color.domain())
              .range([height,0])

    brushG = select<SVGGElement,any>(container.value)

    let brush = brushY()
        .extent([[0, 0], [width-legendTickSpace, height]])
        .on("brush", brushed)
        .on("end", brushended);

    brushG
      .call(drawLegend)

    let gb = brushG 
      .append("g")
        .attr('transform', `translate(${legendTickSpace},0)`)
        .call(brush)
        .call(brush.move, [y(props.value[1]), y(props.value[0])]);

    brushG
      .select(".selection")
        .attr('fill-opacity', 1)
        .attr('fill', "whitesmoke")
        .attr('stroke-opacity', 0.0)
        .attr('stroke',"#000")

    brushG
      .selectAll(".handle--n,.handle--s")
        .attr('fill', "#0dcaf0")
        .attr('fill-opacity', 0.5)

    

    function brushed({selection} : {selection:any}) {
      if (selection) {
        emit('onChange',selection.map((v:number)=>y.invert(v)).reverse())
      }
    }

    function brushended({selection} : {selection:any}) {
      if (!selection) {
        gb.call(brush.move, [y(props.value[1]), y(props.value[0])]);
      }
    }
  }
})
</script>

<template>
  <g ref="container">
  </g>
</template>

<style scoped>

</style>
