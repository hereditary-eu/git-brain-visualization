<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Slicer from './visualization-components/Slicer.vue'
import Volume from './visualization-components/Volume.vue'
import { MedicalPlanes } from '../utils/consts'

import vtkLiteHttpDataAccessHelper from '@kitware/vtk.js/IO/Core/DataAccessHelper/LiteHttpDataAccessHelper';
// @ts-nocheck
import { niftiReadImage } from "@itk-wasm/image-io"
import vtkITKHelper from '@kitware/vtk.js/Common/DataModel/ITKHelper';
import { vtkImageData } from '@kitware/vtk.js/Common/DataModel/ImageData'

import niftiImage from '../assets/test_data/niftiOut_mi2-12.nii.gz'

const imageData = ref<vtkImageData>();

onMounted(() => {
    loadNifti()
});

async function loadNifti() {
    fetch(niftiImage)
        .then((res)=>res.blob())
        .then((data)=>{
            niftiReadImage(new File([data], 'niftiOut_mi2.nii')).then(({ image: itkImage, webWorker })=>{
                webWorker.terminate();
                imageData.value = Object.freeze(vtkITKHelper.convertItkToVtkImage(itkImage));
            })
            
        })    
}


</script>

<template>
    <div class="d-flex flex-column rounded justify-content-between align-items-stretch overflow-hidden">
        <div class="d-flex flex-row justify-content-between align-items-stretch p-0 w-100 h-100">
            <Slicer :image-data="imageData" :plane="MedicalPlanes.sagittal" class="w-100 h-100 border-end" ref="sagittalPlane"></Slicer>
            <Slicer :image-data="imageData" :plane="MedicalPlanes.coronal" class="w-100 h-100 border-start border-end" ref="coronalPlane"></Slicer>
            <Slicer :image-data="imageData" :plane="MedicalPlanes.axial" class="w-100 h-100 border-start border-end" ref="axialPlane"></Slicer>
            <Volume :image-data="imageData" class="w-100 h-100 border-start"></Volume>
        </div>
    </div>
</template>

<style scoped>

</style>
