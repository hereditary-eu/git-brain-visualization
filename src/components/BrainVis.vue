<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import Slicer from './visualization-components/Slicer.vue'
import Volume from './visualization-components/Volume.vue'
import { MedicalPlanes } from '../utils/consts'
import { Modalities } from '../App.vue'
// @ts-nocheck
import { readImage, readImageFileSeries, niftiReadImage } from "@itk-wasm/image-io"
import { InterfaceTypes, runPipeline, setPipelinesBaseUrl } from 'itk-wasm'
import vtkITKHelper from '@kitware/vtk.js/Common/DataModel/ITKHelper';
import { vtkImageData } from '@kitware/vtk.js/Common/DataModel/ImageData'
import { handleFileDrop } from '../utils/io';

const props = defineProps<{activeComponent: string | undefined,
                            components: Array<string>,
                            modality: number | undefined,
                            maxValue: number,
                            
}>()

const imageData = ref<vtkImageData>();

const niftisLoading = ref<boolean>(false);

interface ComponentImageMap {
    [modality: number] : {
        [component: string] : vtkImageData
    }
}

const niftiImages : ComponentImageMap = {}

const brainAtlas = ref<vtkImageData>();

onMounted(() => {
    loadAtlas()
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

async function loadDefaultNiftis() {
    niftisLoading.value = true;
    let dataUrlTemplate = '../assets/data/neuro/niftiOut_miX.nii.gz'

    // Assuming you have a File or Blob (e.g., from a file input)
    // let switchData = false;
    // let url = switchData ? 'niftiOut_mi2-1.nii.gz' : 'niftiOut_mi2.nii.gz'
    // fetch(`../assets/data/neuro/${url}`)
    //     .then((res)=>{
    //         return res.blob()
    //     })
    //     .then((data)=>{
    //         return readImage(new File([data],'bla.nii.gz'))
    //     })
    //     .then(({image})=>{
    //         console.log(image.size)
    //     })

    let dataUrlsComponents : Array<{modality: number, url:string}> = new Array<{modality: number, url:string}>();
    props.components.forEach((d:string)=>{
        [1,2,3].forEach((modality)=>{
            dataUrlsComponents.push({'modality': modality,
                'url':new URL(dataUrlTemplate.replace("X",String(modality+1)), import.meta.url).href
            })
        })
    })

    let dataPromises = dataUrlsComponents.map((dataUrlComponent)=>{
        return fetch(dataUrlComponent.url)
            .then((res)=>{
                return {'modality':dataUrlComponent.modality, 'dataPromise':res.blob()}
            })
            
    })

    // Currently the niftiReadImage is done sequentially in the promises because doing them all at once will not load the data properly, I think it spawns too many workers or
    // ITK internally doesn't like asynchronous image reading
    Promise.all(dataPromises).then((dataArrays : {'modality':Modalities,'dataPromise':Promise<Blob>}[])=>{
        return dataArrays.reduce((p : Promise<any>, res: {'modality':Modalities,'dataPromise':Promise<Blob>})=>{
            return p.then(() => res.dataPromise.then((data)=>{ 
                        return readImage(new File([data], `nifti_${res.modality}.nii.gz`))
                    })    
                    .then(({ image: itkImage, webWorker })=>{
                        webWorker.terminate();
                        if(itkImage){
                            if(!niftiImages[res.modality]){
                                niftiImages[res.modality] = {} as {[component : string] : vtkImageData}
                            }

                            // handle 4d image here
                            console.log(itkImage.size)
                            for(let i = 0; i<itkImage.size[3]; i++){
                                const args = [
                                    'extract-volume',           // pipeline name
                                    '--extract-dimensions', '3',
                                    '--direction', '3',
                                    '--index', String(i)
                                ]

                                const inputs = [{ type: InterfaceTypes.Image, data: itkImage }]
                                const outputs = [{ type: InterfaceTypes.Image }]
                                runPipeline('extract-volume', args, outputs, inputs).then((results)=>{
                                    console.log(results)
                                })
                                webWorker?.terminate()
                            }
                            

                            return
                            //return niftiImages[res.modality][res.component] = Object.freeze(vtkITKHelper.convertItkToVtkImage(itkImage))
                        }
                    })
                        )
        },Promise.resolve())
    })
    .then(()=>{
        if(props.activeComponent && props.modality){
            imageData.value = niftiImages[props.modality][props.activeComponent]
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
       props.modality > 0 &&
        !niftisLoading.value){
        if(niftiImages[props.modality]){
            if(niftiImages[props.modality][props.activeComponent]){
                imageData.value = niftiImages[props.modality][props.activeComponent]
            }
        }
    }
})

function loadNifti(e:DragEvent){
    let files : Array<File> = []

    if(e.dataTransfer){
        files = handleFileDrop(e.dataTransfer)
    }
  
    readImage(files[0])
        .then(({ image: itkImage, webWorker })=>{
            webWorker.terminate();
            if(itkImage && props.modality && props.activeComponent){
                if(!niftiImages[props.modality]){
                    niftiImages[props.modality] = {} as {[component : string] : vtkImageData}
                }
                return niftiImages[props.modality][props.activeComponent] = Object.freeze(vtkITKHelper.convertItkToVtkImage(itkImage))
            }
        })
}
</script>

<template>
    <div v-if="niftisLoading"><h2>Brain resting state networks loading...</h2></div>
    <div v-else-if="props.modality == undefined || props.modality == 0 || props.activeComponent == undefined"> 
        <h2 v-if="props.modality == undefined || props.modality == 0">No brain modality selected, please select above.</h2>
        <h2 v-if="props.activeComponent == undefined">No component selected, please select above.</h2>
    </div>
    <div v-else-if="!imageData" @drop.prevent="loadNifti" @dragenter.prevent @dragover.prevent class="d-flex flex-column justify-content-center align-items-center">
        <h2>This modality/component combination doesn't exist in the current brain data, drag and drop the modality 4D brain data here to load.</h2>
        <button class="btn btn-success" @click="loadDefaultNiftis">Or press here to load the example set.</button>
    </div>
    <div v-else class="d-flex flex-column rounded justify-content-between align-items-stretch overflow-hidden">
        <div class="d-flex flex-row justify-content-between align-items-stretch p-0 w-100 h-100">
            <Slicer :image-data="imageData" :brain-atlas="brainAtlas" :plane="MedicalPlanes.sagittal" class="w-100 h-100 border-end" :maxValue="props.maxValue" ref="sagittalPlane"></Slicer>
            <Slicer :image-data="imageData" :brain-atlas="brainAtlas" :plane="MedicalPlanes.coronal" class="w-100 h-100 border-start border-end" :maxValue="props.maxValue" ref="coronalPlane"></Slicer>
            <Slicer :image-data="imageData" :brain-atlas="brainAtlas" :plane="MedicalPlanes.axial" class="w-100 h-100 border-start border-end" :maxValue="props.maxValue" ref="axialPlane"></Slicer>
            <Volume :image-data="imageData" :brain-atlas="brainAtlas" class="w-100 h-100 border-start"></Volume>
        </div>
    </div>
</template>

<style scoped>

</style>
