<script lang="ts">
enum RestingStateNetworkType {
  'DMN'=2,
  'ECN'=3,
  'SNI'=4
}

export { RestingStateNetworkType }
</script>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import Slicer from './visualization-components/Slicer.vue'
import Volume from './visualization-components/Volume.vue'
import { MedicalPlanes } from '../utils/consts'

import vtkLiteHttpDataAccessHelper from '@kitware/vtk.js/IO/Core/DataAccessHelper/LiteHttpDataAccessHelper';
// @ts-nocheck
import { niftiReadImage } from "@itk-wasm/image-io"
import vtkITKHelper from '@kitware/vtk.js/Common/DataModel/ITKHelper';
import { vtkImageData } from '@kitware/vtk.js/Common/DataModel/ImageData'

const props = defineProps<{activeComponent: string | undefined,
                            components: Array<string>,
                            restingStateNetwork: RestingStateNetworkType
                            
}>()

const imageData = ref<vtkImageData>();

const niftisLoading = ref<boolean>(false);

interface ComponentImageMap {
    [component: string] : {
        [key in RestingStateNetworkType] : vtkImageData
    }
}

const niftiImages : ComponentImageMap = {}

onMounted(() => {
    loadNiftis()
});

async function loadNiftis() {
    niftisLoading.value = true;
    let dataUrlTemplate = '../assets/data/neuro/niftiOut_miX-Y.nii.gz'

    let dataUrlsComponents : Array<{component:string, restingStateNetworkType: RestingStateNetworkType, url:string}> = new Array<{component:string, restingStateNetworkType: RestingStateNetworkType, url:string}>();
    props.components.forEach((d:string)=>{
        [RestingStateNetworkType.DMN,RestingStateNetworkType.ECN,RestingStateNetworkType.SNI].forEach((restingStateNetworkType)=>{ // How to properly iterate over typescript that will be properly transpile?
            dataUrlsComponents.push({'component':d, 
                         'restingStateNetworkType': restingStateNetworkType,
                         'url':new URL(dataUrlTemplate.replace("Y",String(d)).replace("X",String(restingStateNetworkType)), import.meta.url).href
                        })
        })
    })

    let dataPromises = dataUrlsComponents.map((dataUrlComponent)=>{
        return fetch(dataUrlComponent.url)
            .then((res)=>{
                return {'component': dataUrlComponent.component, 'restingStateNetworkType':dataUrlComponent.restingStateNetworkType, 'dataPromise':res.blob()}
            })
            
    })

    // Currently the niftiReadImage is done sequentially in the promises because doing them all at once will not load the data properly, I think it spawns too many workers or
    // ITK internally doesn't like asynchronous image reading
    Promise.all(dataPromises).then((dataArrays : {'component':string,'restingStateNetworkType':RestingStateNetworkType,'dataPromise':Promise<Blob>}[])=>{
        return dataArrays.reduce((p : Promise<any>, res: {'component':string,'restingStateNetworkType':RestingStateNetworkType,'dataPromise':Promise<Blob>})=>{
            return p.then(() => res.dataPromise.then((data)=>{ 
                                                return niftiReadImage(new File([data], `nifti_${res.restingStateNetworkType}_${res.component}.nii.gz`))
                                            })    
                                            .then(({ image: itkImage, webWorker })=>{
                                                webWorker.terminate();
                                                if(itkImage){
                                                    if(!niftiImages[res.component]){
                                                        niftiImages[res.component] = {} as {[key in RestingStateNetworkType] : vtkImageData}
                                                    }
                                                    return niftiImages[res.component][res.restingStateNetworkType] = Object.freeze(vtkITKHelper.convertItkToVtkImage(itkImage))
                                                }
                                            })
                        )
        },Promise.resolve())
    })
    .then(()=>{
        if(props.activeComponent && props.restingStateNetwork){
            imageData.value = niftiImages[props.activeComponent][props.restingStateNetwork]
        } 
    })  
    .finally(()=>{
        niftisLoading.value = false;
    })     
}

watch(()=>{ return {'activeComponent':props.activeComponent,
           'restingStateNetwork':props.restingStateNetwork}}, ()=>{
    if(props.activeComponent && typeof props.restingStateNetwork !== 'undefined'){
        imageData.value = niftiImages[props.activeComponent][props.restingStateNetwork]
    }
})


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
