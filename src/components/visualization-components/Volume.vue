<script setup lang="ts">
import {onMounted, onBeforeUnmount, ref, watch} from 'vue';
import '@kitware/vtk.js/Rendering/Profiles/Volume';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkVolume          from '@kitware/vtk.js/Rendering/Core/Volume';
import vtkVolumeMapper    from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
import vtkRenderWindow    from '@kitware/vtk.js/Rendering/Core/RenderWindow';
import vtkRenderer        from '@kitware/vtk.js/Rendering/Core/Renderer';
import vtkImageData  from '@kitware/vtk.js/Common/DataModel/ImageData'

import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkImageResliceMapper from '@kitware/vtk.js/Rendering/Core/ImageResliceMapper';
import vtkPlane from '@kitware/vtk.js/Common/DataModel/Plane';
import { SlabTypes } from '@kitware/vtk.js/Rendering/Core/ImageResliceMapper/Constants';

const vtkContainer = ref<HTMLElement>();

const props = defineProps<{ 
    imageData : vtkImageData | undefined,
    brainAtlas: vtkImageData | undefined,        
}>()

let fullRenderWindow : vtkFullScreenRenderWindow;
let renderWindow: vtkRenderWindow;
let renderer: vtkRenderer;
let sliceRenderer: vtkRenderer;
let volumeActor: vtkVolume;
let volumeMapper: vtkVolumeMapper;
let imageActor: vtkImageSlice;
let imageMapper: vtkImageResliceMapper;
let imageSlicePlane: vtkPlane;

const atlasVisbility = ref<boolean>(true);
const imageVisbility = ref<boolean>(true);

watch(()=> props.brainAtlas, setupBrainAtlas)

function setupBrainAtlas(){
  if (imageMapper && props.brainAtlas) {
    imageMapper.setInputData(props.brainAtlas);
    const imc = props.brainAtlas.getCenter();
    imageSlicePlane.setOrigin(imc);

    //imageActor.setScale(1.15,1.15,1.15)
    //imageActor.setOrientation(-10,0,0)
    //let pos = imageActor.getPosition()
    //imageActor.setPosition(pos[0], pos[1], pos[2]+5)

    render()
  }
}

watch(()=> props.imageData, setupVolumeData)

function setupVolumeData(){
    if(props.imageData){
        volumeMapper.setInputData(props.imageData);
        renderer.resetCamera(props.imageData.getBounds())
        render();
    }
}

function setVisiblities(){
  if (volumeActor && volumeMapper) {
    volumeActor.setVisibility(imageVisbility.value);
    render();
  }
  if (imageActor && imageMapper) {
    imageActor.setVisibility(atlasVisbility.value);
    render();
  }
}

function render(){
    if (renderWindow && props.imageData && props.brainAtlas) {
        renderWindow.render();
    }
}

onMounted(()=>{
    fullRenderWindow = vtkFullScreenRenderWindow.newInstance({
        container: vtkContainer.value,
    });

    volumeActor = vtkVolume.newInstance();
    volumeMapper = vtkVolumeMapper.newInstance();        
    volumeActor.setMapper(volumeMapper);

    imageActor = vtkImageSlice.newInstance();
    imageMapper = vtkImageResliceMapper.newInstance();        
    imageActor.setMapper(imageMapper); 

    imageSlicePlane = vtkPlane.newInstance();
    imageSlicePlane.setNormal(0, 1, 0);
    imageMapper.setSlicePlane(imageSlicePlane);
    imageMapper.setSlabType(SlabTypes.MAX);

    renderer = fullRenderWindow.getRenderer();
    renderWindow = fullRenderWindow.getRenderWindow();

    sliceRenderer = vtkRenderer.newInstance({ background: [0, 0, 0] });
    renderWindow.addRenderer(sliceRenderer)

    sliceRenderer.setLayer(0);
    renderer.setLayer(1);

    renderWindow.setNumberOfLayers(2);

    sliceRenderer.setActiveCamera(renderer.getActiveCamera());

    renderWindow.getInteractor().onAnimation(() => {
        sliceRenderer.setActiveCamera(renderer.getActiveCamera());
        imageSlicePlane.setNormal(renderer.getActiveCamera().getDirectionOfProjection());
    });

    renderer.setBackground(0,0,0)

    renderer.addVolume(volumeActor);
    sliceRenderer.addActor(imageActor);

    // create color and opacity transfer functions
    const ctfun = vtkColorTransferFunction.newInstance();
    ctfun.addRGBPoint(-30, 0.647, 0, 0.149);
    ctfun.addRGBPoint(0, 0.968, 0.972, 0.678);
    ctfun.addRGBPoint(30, 0, 0.407, 0.215);

    const ofun = vtkPiecewiseFunction.newInstance();
    ofun.addPoint(-20, 1.0);
    ofun.addPoint(0, 0.0);
    ofun.addPoint(20, 1.0);

    volumeActor.getProperty().setRGBTransferFunction(0, ctfun);
    volumeActor.getProperty().setScalarOpacity(0, ofun);
    volumeActor.getProperty().setScalarOpacityUnitDistance(0, 4.5);
    volumeActor.getProperty().setInterpolationTypeToFastLinear();

    imageActor.getProperty().setOpacity(0.5);

    setupBrainAtlas()
    setupVolumeData()
})

onBeforeUnmount(() => {
    volumeActor.delete();
    volumeMapper.delete();
    fullRenderWindow.delete();
});
</script>

<template>
    <div class="position-relative w-100 h-100">
        <div class="position-absolute w-100 d-flex justify-content-between align-items-center text-light p-2">
            <div class="w-333 text-start"></div>
            <div class="w-333 text-center">
                <h3 class="">Volume</h3>
            </div>
            <div class="w-333 d-flex flex-column justify-content-start align-items-end text-light">
                <div class="form-check-reverse form-switch">
                    <label class="form-check-label" for="atlasCheck">Atlas</label>
                    <input class="form-check-input" role="switch" id="atlasCheck" type="checkbox" v-model="atlasVisbility" @change="setVisiblities"/>
                </div>
                <div class="form-check-reverse form-switch">
                    <label class="form-check-label" for="zscoreCheck">Z-scores</label>
                    <input class="form-check-input" role="switch" id="zscoreCheck" type="checkbox" v-model="imageVisbility" @change="setVisiblities"/>
                </div>
            </div>
        </div>
        <div class="w-100 h-100" ref="vtkContainer"/>    
    </div>
</template>

<style scoped>

</style>
