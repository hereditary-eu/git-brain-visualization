<script setup lang="ts">
import { Modalities } from '../../App.vue'
import numeral from 'numeral'

defineProps<{ distribution: {[name:number]:{percentage:number, color:string}},
                            modality: Modalities
}>()

const emit = defineEmits<{
  (e: 'onModalitySelect', value: Modalities | undefined): void
}>()

const onModalitySelect = (value:Modalities)=>emit('onModalitySelect', value)

</script>

<template>
    <div class="d-flex flex-row align-items-center justify-content-center w-100 h-100">
        <div class="w-100" v-if="Object.keys(distribution).length == 0">
            <h2>No modality contributions loaded</h2>
        </div>
        <div v-else class="d-flex flex-row h-100 w-100">
            <div class="d-flex align-items-center justify-content-center overflow-hidden modality"
                 v-for="(distProperties, key) in distribution" 
                 :class="{'active': modality == key}"
                    :style="{'background-color': distProperties.color, width:`${distProperties.percentage*100}%`}" 
                    @click="onModalitySelect(Number(key))"
                    :title="`${Modalities[key]} contribution is: ${numeral(distProperties.percentage*100).format('0.[00]')}%`">
                {{ Modalities[key] }}
            </div>
        </div>
    </div>
</template>

<style lang="scss">
@import "../node_modules/bootstrap/scss/bootstrap";

.modality:hover {
    border: 2px solid color-mix(in srgb, $info, transparent 25%) !important;
}

</style>
