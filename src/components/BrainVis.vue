<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import Slicer from './visualization-components/Slicer.vue'
import Volume from './visualization-components/Volume.vue'
import { MedicalPlanes } from '../utils/consts'
import { Modalities } from '../App.vue'
// @ts-nocheck
import { niftiReadImage } from "@itk-wasm/image-io"
import vtkITKHelper from '@kitware/vtk.js/Common/DataModel/ITKHelper';
import { vtkImageData } from '@kitware/vtk.js/Common/DataModel/ImageData'

const props = defineProps<{activeComponent: string | undefined,
                            components: Array<string>,
                            modality: Modalities,
                            maxValue: number,
                            
}>()

const imageData = ref<vtkImageData>();

const niftisLoading = ref<boolean>(false);

interface ComponentImageMap {
    [component: string] : {
        [key in Modalities] : vtkImageData
    }
}

const niftiImages : ComponentImageMap = {}

const brainAtlas = ref<vtkImageData>();

onMounted(() => {
    loadAtlas().then(()=>{
        loadNiftis()
    })
});

async function loadAtlas() {
    return fetch('../assets/data/neuro/brain-atlas-volume.nii')
          .then((res)=>res.blob())
          .then((data)=>{
            return niftiReadImage(new File([data], `brain-atlas-volume.nii`))
          })    
          .then(({ image: itkImage, webWorker })=>{
            webWorker.terminate();
            if(itkImage){
              brainAtlas.value = Object.freeze(vtkITKHelper.convertItkToVtkImage(itkImage))
            }
          })
}

async function loadNiftis() {
    niftisLoading.value = true;
    let dataUrlTemplate = '../assets/data/neuro/niftiOut_miX-Y.nii.gz'

    let dataUrlsComponents : Array<{component:string, modality: Modalities, url:string}> = new Array<{component:string, modality: Modalities, url:string}>();
    props.components.forEach((d:string)=>{
        [Modalities.DMN,Modalities.ECN,Modalities.SNI].forEach((modality)=>{ // How to properly iterate over typescript that will be properly transpile?
            dataUrlsComponents.push({'component':d, 
                         'modality': modality,
                         'url':new URL(dataUrlTemplate.replace("Y",String(d)).replace("X",String(modality)), import.meta.url).href
                        })
        })
    })

    let dataPromises = dataUrlsComponents.map((dataUrlComponent)=>{
        return fetch(dataUrlComponent.url)
            .then((res)=>{
                return {'component': dataUrlComponent.component, 'modality':dataUrlComponent.modality, 'dataPromise':res.blob()}
            })
            
    })

    // Currently the niftiReadImage is done sequentially in the promises because doing them all at once will not load the data properly, I think it spawns too many workers or
    // ITK internally doesn't like asynchronous image reading
    Promise.all(dataPromises).then((dataArrays : {'component':string,'modality':Modalities,'dataPromise':Promise<Blob>}[])=>{
        return dataArrays.reduce((p : Promise<any>, res: {'component':string,'modality':Modalities,'dataPromise':Promise<Blob>})=>{
            return p.then(() => res.dataPromise.then((data)=>{ 
                                                return niftiReadImage(new File([data], `nifti_${res.modality}_${res.component}.nii.gz`))
                                            })    
                                            .then(({ image: itkImage, webWorker })=>{
                                                webWorker.terminate();
                                                if(itkImage){
                                                    if(!niftiImages[res.component]){
                                                        niftiImages[res.component] = {} as {[key in Modalities] : vtkImageData}
                                                    }
                                                    return niftiImages[res.component][res.modality] = Object.freeze(vtkITKHelper.convertItkToVtkImage(itkImage))
                                                }
                                            })
                        )
        },Promise.resolve())
    })
    .then(()=>{
        if(props.activeComponent && props.modality){
            imageData.value = niftiImages[props.activeComponent][props.modality]
        } 
    })  
    .finally(()=>{
        niftisLoading.value = false;
    })
}

watch(()=>{ return {'activeComponent':props.activeComponent,
           'modality':props.modality}}, ()=>{
    if(props.activeComponent && 
       typeof props.modality !== 'undefined' && 
       [Modalities.DMN,Modalities.ECN,Modalities.SNI].includes(props.modality) &&
        !niftisLoading.value){
        imageData.value = niftiImages[props.activeComponent][props.modality]
    }
})


</script>

<template>
    <div v-if="niftisLoading"><h2>Brain resting state networks loading...</h2></div>
    <div v-else class="d-flex flex-column rounded justify-content-between align-items-stretch overflow-hidden">
        <div class="d-flex flex-row justify-content-between align-items-stretch p-0 w-100 h-100">
            <Slicer :image-data="imageData" :brain-atlas="brainAtlas" :plane="MedicalPlanes.sagittal" class="w-100 h-100 border-end" :maxValue="props.maxValue" ref="sagittalPlane"></Slicer>
            <Slicer :image-data="imageData" :brain-atlas="brainAtlas" :plane="MedicalPlanes.coronal" class="w-100 h-100 border-start border-end" :maxValue="props.maxValue" ref="coronalPlane"></Slicer>
            <Slicer :image-data="imageData" :brain-atlas="brainAtlas" :plane="MedicalPlanes.axial" class="w-100 h-100 border-start border-end" :maxValue="props.maxValue" ref="axialPlane"></Slicer>
            <Volume :image-data="imageData" class="w-100 h-100 border-start"></Volume>
        </div>
    </div>
</template>

<style scoped>

</style>
