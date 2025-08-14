<script setup lang="ts">
import { onMounted, ref, watch, toRaw } from 'vue';
import Slicer from './visualization-components/Slicer.vue'
import { TransformCorrection } from './visualization-components/Slicer.vue'
import Volume from './visualization-components/Volume.vue'
import { MedicalPlanes } from '../utils/consts'
import { Modalities } from '../App.vue'
// @ts-nocheck
import { readImage, niftiReadImage } from "@itk-wasm/image-io"

import vtkITKHelper from '@kitware/vtk.js/Common/DataModel/ITKHelper';
import { vtkImageData } from '@kitware/vtk.js/Common/DataModel/ImageData'
import { handleFileDrop } from '../utils/io';


import brainLabelFile from '../assets/data/neuro/region-labels.tsv?raw'
import { scaleOrdinal, schemeAccent, tsvParseRows, rgb } from 'd3';
import vtkLookupTable from '@kitware/vtk.js/Common/Core/LookupTable';

const props = defineProps<{activeComponent: string | undefined,
                            components: Array<string>,
                            modality: number | undefined,
                            maxValue: number,
                            
}>()

const imageData = ref<vtkImageData>();

const niftisLoading = ref<boolean>(false);

const atlasCorrection = ref<TransformCorrection>({'position':[0,-6.5,8],
                                                      'rotation':[11.5,0,0],
                                                      'scale':[1,1,1] 
})

function onTransformCorrection(newTransformCorrection : TransformCorrection){
    atlasCorrection.value = structuredClone(toRaw(newTransformCorrection));
}

interface ComponentImageMap {
    [modality: number] : {
        [component: string] : vtkImageData
    }
}

const niftiImages : ComponentImageMap = {}

const referenceAtlas = ref<vtkImageData>();
const regionAtlas = ref<vtkImageData>();

const brainLabels = ref<Map<string, string>>()

brainLabels.value = new Map((tsvParseRows(brainLabelFile, (row:any,_:number)=>{
    return [String(row[0]),row[1]]
})))

const lut = vtkLookupTable.newInstance()
let lutTable : Array<Array<number>> = []
const colorMap = scaleOrdinal(schemeAccent)
colorMap.domain(brainLabels.value.keys())
brainLabels.value.forEach((_, key)=>{
    const c = colorMap(key)
    const crgb = rgb(c)
    lutTable.push([Number(key),crgb.r,crgb.g,crgb.b,1])
})
lut.setTable(lutTable)

onMounted(() => {
    loadAtlases()
    .then((atlases)=>{
        referenceAtlas.value = atlases.reference;
        regionAtlas.value = atlases.region; 
        return atlases
    })
    //.then(registerAtlases)
});

async function loadAtlases() {
    return fetch('../assets/data/neuro/brain-atlas-volume-registered.nii.gz')
            .then((res)=>res.blob())
            .then((data)=>{
                return niftiReadImage(new File([data], `brain-atlas-volume.nii.gz`))
            })    
            .then(({ image: itkImage, webWorker })=>{
                webWorker.terminate();
                return {reference: Object.freeze(vtkITKHelper.convertItkToVtkImage(itkImage)), region: undefined}
                //return {reference: itkImage, region: undefined}
            })
            .then((atlases : {reference: vtkImageData | undefined, region: vtkImageData | undefined})=>{
                return fetch('../assets/data/neuro/harvard-registered.nii.gz')
                .then((res)=>res.blob())
                .then((data)=>{
                    return niftiReadImage(new File([data], `harvard-registered.nii.gz`))
                })    
                .then(({ image: itkImage, webWorker })=>{
                    webWorker.terminate();
                    atlases.region = Object.freeze(vtkITKHelper.convertItkToVtkImage(itkImage))
                    //atlases.region = itkImage
                    return atlases
                })
            })
}

// async function downSampleImage(
//   image : Image,
//   shrinkFactors = [4, 4, 4]
// ): Promise<Image> {
//   const { downsampled: imageDownsampled } = await downsampleBinShrink(image, {
//     shrinkFactors,
//   });  
//   return imageDownsampled;
// }

// async function registerAtlases(atlases:{reference: Image, region: Image}){
//     // REGISTRATION NOT WORKING SINCE THE ITK-WASM PACKAGE IS FULL OF BUGS
//     const defaultParameters = await defaultParameterMap("translation", {numberOfResolutions: 2 })

//     defaultParameters.webWorker.terminate()

//     const downSampledReference = await downSampleImage(atlases.reference)
//     const downSampledRegion = await downSampleImage(atlases.region)

//     let options : ElastixOptions = {
//         fixed: downSampledReference,
//         moving: downSampledRegion,
//         initialTransform: undefined,
//         initialTransformParameterObject: undefined,
//     }

//     const elastixResults = await elastix(defaultParameters.parameterMap, options)

//     referenceAtlas.value = Object.freeze(vtkITKHelper.convertItkToVtkImage(atlases.reference))
//     regionAtlas.value = Object.freeze(vtkITKHelper.convertItkToVtkImage(elastixResults.result))

//     return;
// }

async function loadDefaultNiftis() {
    niftisLoading.value = true;
    let dataUrlTemplate = '../assets/data/neuro/niftiOut_miX.nii.gz'

    let dataUrlsComponents : Array<{modality: number, url:string}> = new Array<{modality: number, url:string}>();
    [1,2,3].forEach((modality)=>{
        dataUrlsComponents.push({'modality': modality,
            'url':new URL(dataUrlTemplate.replace("X",String(modality+1)), import.meta.url).href
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
                    .then(({ image: itkImage4D, webWorker })=>{
                        webWorker.terminate();

                        if(!niftiImages[res.modality]){
                            niftiImages[res.modality] = {} as {[component : string] : vtkImageData}
                        }

                        for(let index=0; index<itkImage4D.size[3]; index++){
                            niftiImages[res.modality][index+1] = Object.freeze(extract3DNifti(itkImage4D,index));
                        }
                        
                        return;
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
    if(props.activeComponent && typeof props.modality !== 'undefined' && props.modality > 0 && !niftisLoading.value){
        imageData.value = undefined;
        if(niftiImages[props.modality]){
            if(niftiImages[props.modality][props.activeComponent]){
                imageData.value = niftiImages[props.modality][props.activeComponent]
            }
        }
    }
})

function loadNifti(e:DragEvent){
    niftisLoading.value = true;
    let files : Array<File> = []

    if(e.dataTransfer){
        files = handleFileDrop(e.dataTransfer)
    }
  
    readImage(files[0])
        .then(({ image: itkImage4D, webWorker })=>{
            webWorker.terminate();
            if(itkImage4D && props.modality && props.activeComponent){
                if(!niftiImages[props.modality]){
                    niftiImages[props.modality] = {} as {[component : string] : vtkImageData}
                }

                for(let index=0; index<itkImage4D.size[3]; index++){
                    niftiImages[props.modality][index] = Object.freeze(extract3DNifti(itkImage4D,index));
                }
            }
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

function extract3DNifti(itkImage4D:any, index:number){
    const [sizeX, sizeY, sizeZ, _] = itkImage4D.size  
    const pixelsPerSlice = sizeX * sizeY * sizeZ    
    const start = index * pixelsPerSlice
    // Extract pixel values for that slice
    const sliceData = itkImage4D.data?.slice(start, start + pixelsPerSlice)

    // Make a new 2D itk-wasm Image
    const itkImage3D = {
        imageType: {
            dimension: 3,
            componentType: itkImage4D.imageType.componentType,
            pixelType: itkImage4D.imageType.pixelType,
            components: itkImage4D.imageType.components,
        },
        origin: [itkImage4D.origin[0], itkImage4D.origin[1], itkImage4D.origin[2]],
        spacing: [itkImage4D.spacing[0], itkImage4D.spacing[1], itkImage4D.spacing[2]],
        direction: [
            itkImage4D.direction[0], itkImage4D.direction[1], itkImage4D.direction[2],
            itkImage4D.direction[4], itkImage4D.direction[5], itkImage4D.direction[6],
            itkImage4D.direction[8], itkImage4D.direction[9], itkImage4D.direction[10],
        ],
        size: [sizeX, sizeY, sizeZ],
        data: sliceData
    }
    return vtkITKHelper.convertItkToVtkImage(itkImage3D)
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
            <Slicer :image-data="imageData"
                    :reference-atlas="referenceAtlas" 
                    :region-atlas="regionAtlas" 
                    :atlas-correction="atlasCorrection"
                    :plane="MedicalPlanes.sagittal" 
                    class="w-100 h-100 border-end" 
                    :maxValue="props.maxValue" 
                    :region-labels="brainLabels"
                    :lut="lut"
                    @on-transform-correction="onTransformCorrection"
                    ref="sagittalPlane"></Slicer>
            <Slicer :image-data="imageData" 
                    :reference-atlas="referenceAtlas" 
                    :region-atlas="regionAtlas" 
                    :atlas-correction="atlasCorrection"
                    :plane="MedicalPlanes.coronal" 
                    class="w-100 h-100 border-start border-end" 
                    :maxValue="props.maxValue" 
                    :region-labels="brainLabels"
                    :lut="lut"
                    @on-transform-correction="onTransformCorrection"
                    ref="coronalPlane"></Slicer>
            <Slicer :image-data="imageData" 
                    :reference-atlas="referenceAtlas" 
                    :region-atlas="regionAtlas" 
                    :atlas-correction="atlasCorrection"
                    :plane="MedicalPlanes.axial" 
                    class="w-100 h-100 border-start border-end" 
                    :maxValue="props.maxValue"
                    :region-labels="brainLabels"
                    :lut="lut"
                    @on-transform-correction="onTransformCorrection" 
                    ref="axialPlane"></Slicer>
            <Volume :image-data="imageData" 
                    :atlas-correction="atlasCorrection"
                    :brain-atlas="referenceAtlas" class="w-100 h-100 border-start"></Volume>
        </div>
    </div>
</template>

<style scoped>

</style>
