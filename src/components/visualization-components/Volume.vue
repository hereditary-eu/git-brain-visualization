<script setup lang="ts">
import {onMounted, onBeforeUnmount, ref, watch, render} from 'vue';
import '@kitware/vtk.js/Rendering/Profiles/Volume';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkVolume          from '@kitware/vtk.js/Rendering/Core/Volume';
import vtkVolumeMapper    from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
import vtkRenderWindow    from '@kitware/vtk.js/Rendering/Core/RenderWindow';
import vtkRenderer        from '@kitware/vtk.js/Rendering/Core/Renderer';
import vtkImageData  from '@kitware/vtk.js/Common/DataModel/ImageData'
import vtkImageMarchingCubes from '@kitware/vtk.js/Filters/General/ImageMarchingCubes';

import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageResliceMapper from '@kitware/vtk.js/Rendering/Core/ImageResliceMapper';
import vtkPlane from '@kitware/vtk.js/Common/DataModel/Plane';
import { SlabTypes } from '@kitware/vtk.js/Rendering/Core/ImageResliceMapper/Constants';

interface Context {
    fullRenderWindow : vtkFullScreenRenderWindow,
    renderWindow: vtkRenderWindow,
    renderer: vtkRenderer,
    volume: vtkVolume,
    mapper: vtkVolumeMapper,
}

const vtkContainer = ref<HTMLElement>();
const context = ref<Context>();

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
let atlasActor: vtkActor;
let imageActor: vtkImageSlice;
let imageMapper: vtkImageResliceMapper;
let imageSlicePlane: vtkPlane;
let atlasMapper: vtkMapper;
let atlasMarcher: vtkImageMarchingCubes;

watch(()=> props.brainAtlas, setupBrainAtlas)

function setupBrainAtlas(){
  if (imageMapper && props.brainAtlas) {
    imageMapper.setInputData(props.brainAtlas);
    const imc = props.brainAtlas.getCenter();
    imageSlicePlane.setOrigin(imc);

    imageActor.setScale(1.15,1.15,1.15)
    imageActor.setOrientation(-10,0,0)
    let pos = imageActor.getPosition()
    imageActor.setPosition(pos[0], pos[1], pos[2]+5)
  }
}

watch(()=> props.imageData, setupVolumeData)

function setupVolumeData(){
    if(props.imageData){
        volumeMapper.setInputData(props.imageData);
        renderer.resetCamera(props.imageData.getBounds())
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

    // atlasActor = vtkActor.newInstance();
    // atlasMapper = vtkMapper.newInstance();
    // atlasMarcher = vtkImageMarchingCubes.newInstance({
    //     contourValue: 94.8,
    //     computeNormals: true,
    //     mergePoints: true,
    // });

    // atlasActor.setMapper(atlasMapper);
    // atlasMapper.setInputConnection(atlasMarcher.getOutputPort());

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
    ofun.addPoint(-30, 1.0);
    ofun.addPoint(0, 0.0);
    ofun.addPoint(30, 1.0);

    volumeActor.getProperty().setRGBTransferFunction(0, ctfun);
    volumeActor.getProperty().setScalarOpacity(0, ofun);
    volumeActor.getProperty().setScalarOpacityUnitDistance(0, 4.5);
    volumeActor.getProperty().setInterpolationTypeToFastLinear();

    // atlasActor.getProperty().setOpacity(0.5);

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
        <div class="position-absolute w-100 d-flex justify-content-between text-light p-2">
            <div>
                <h3 class="">Volume</h3>
            </div>
        </div>
        <div class="w-100 h-100" ref="vtkContainer"/>    
    </div>
</template>

<style scoped>

</style>
