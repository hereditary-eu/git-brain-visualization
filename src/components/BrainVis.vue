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

// Need to look into importing it dynamic
// import DMNImageUrl from '../assets/test_data/niftiOut_mi2-1.nii.gz'
// import DMNImageUrl from '../assets/test_data/niftiOut_mi2-2.nii.gz'
// import DMNImageUrl from '../assets/test_data/niftiOut_mi2-3.nii.gz'
// import DMNImageUrl from '../assets/test_data/niftiOut_mi2-4.nii.gz'
// import DMNImageUrl from '../assets/test_data/niftiOut_mi2-5.nii.gz'
// import DMNImageUrl from '../assets/test_data/niftiOut_mi2-6.nii.gz'
// import DMNImageUrl from '../assets/test_data/niftiOut_mi2-7.nii.gz'
// import DMNImageUrl from '../assets/test_data/niftiOut_mi2-8.nii.gz'
// import DMNImageUrl from '../assets/test_data/niftiOut_mi2-9.nii.gz'
// import DMNImageUrl from '../assets/test_data/niftiOut_mi2-10.nii.gz'
// import DMNImageUrl from '../assets/test_data/niftiOut_mi2-11.nii.gz'
import DMNImageUrl from '../assets/test_data/niftiOut_mi2-12.nii'
// import DMNImageUrl from '../assets/test_data/niftiOut_mi2-13.nii.gz'
// import DMNImageUrl from '../assets/test_data/niftiOut_mi2-14.nii.gz'
// import DMNImageUrl from '../assets/test_data/niftiOut_mi2-15.nii.gz'
// import DMNImageUrl from '../assets/test_data/niftiOut_mi2-16.nii.gz'
// import DMNImageUrl from '../assets/test_data/niftiOut_mi2-17.nii.gz'
// import DMNImageUrl from '../assets/test_data/niftiOut_mi2-18.nii.gz'
// import DMNImageUrl from '../assets/test_data/niftiOut_mi2-19.nii.gz'
// import DMNImageUrl from '../assets/test_data/niftiOut_mi2-20.nii.gz'
// import DMNImageUrl from '../assets/test_data/niftiOut_mi2-21.nii.gz'
// import DMNImageUrl from '../assets/test_data/niftiOut_mi2-22.nii.gz'
// import DMNImageUrl from '../assets/test_data/niftiOut_mi2-23.nii.gz'
// import DMNImageUrl from '../assets/test_data/niftiOut_mi2-24.nii.gz'
// import DMNImageUrl from '../assets/test_data/niftiOut_mi2-25.nii.gz'

// import ECNImageUrl from '../assets/test_data/niftiOut_mi3-X.nii.gz'
// import SNImageUrl from '../assets/test_data/niftiOut_mi4-X.nii.gz'

const props = defineProps<{activeComponent: string | undefined}>()

const imageData = ref<vtkImageData>();

const niftisLoading = ref<boolean>(false);

const niftiImages : Array<vtkImageData> = []

onMounted(() => {
    loadNiftis()
});

async function loadNiftis() {
    niftisLoading.value = true;
    let DMNUrl = '../assets/test_data/niftiOut_mi2-X.nii.gz'

    let testURL = DMNImageUrl

    let DMNUrls : Array<string | undefined> = [...Array(25).keys()].map((d:number)=>{
        return d == 11 ? testURL : undefined//new URL(DMNUrl.replace("X",String(d+1)), import.meta.url).href : undefined
    })
    let promises = DMNUrls.map((url:string | undefined)=>{
        return url ? fetch(url)
            .then((res)=>res.blob())
            .then((data)=>{
                return niftiReadImage(new File([data], 'bla'))    
            })   
            .then(({ image: itkImage, webWorker })=>{
                webWorker.terminate();
                if(itkImage){
                    return niftiImages.push(Object.freeze(vtkITKHelper.convertItkToVtkImage(itkImage)))
                }
            }) : undefined
    })

    Promise.all(promises).then(() => {
        console.log("retreived all niftis")
        niftisLoading.value = false;
        imageData.value = niftiImages[11]
    });
     
}


</script>

<template>
    <div v-if="niftisLoading">Brain resting state networks loading...</div>
    <div v-else class="d-flex flex-column rounded justify-content-between align-items-stretch overflow-hidden">
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
