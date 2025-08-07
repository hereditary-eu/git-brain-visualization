<script setup lang="ts">
import {onMounted, watch, ref, onBeforeUnmount} from 'vue';
import '@kitware/vtk.js/Rendering/Profiles/Geometry';

import Constants from '@kitware/vtk.js/Rendering/Core/ImageMapper/Constants';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkImageSlice           from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkImageMapper     from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkRenderWindow    from '@kitware/vtk.js/Rendering/Core/RenderWindow';
import vtkRenderer        from '@kitware/vtk.js/Rendering/Core/Renderer';
import vtkImageData  from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';

import vtkInteractorStyleImage from '@kitware/vtk.js/Interaction/Style/InteractorStyleImage';
//import IRenderWindowInteractorEvent from '@kitware/vtk.js/Rendering/Core/RenderWindowInteractor';

import numeral from 'numeral';

const { SlicingMode } = Constants;

import { MedicalPlanes } from '../../utils/consts'
import Outline from '../../vtk-derivatives/Outline';
import { Resolve } from '@kitware/vtk.js/Rendering/Core/Mapper/CoincidentTopologyHelper';

const props = defineProps<{ imageData: vtkImageData | undefined, 
                            brainAtlas: vtkImageData | undefined,
                            plane: MedicalPlanes,
                            maxValue: number}>()

const title = ref<string>(props.plane == MedicalPlanes.axial ? 'Axial' :
                          props.plane == MedicalPlanes.coronal ? 'Coronal' :
                          props.plane == MedicalPlanes.sagittal ? 'Sagittal' : '')

const currentSlice = ref<string>("0")

let fullRenderWindow : vtkFullScreenRenderWindow;
let renderWindow: vtkRenderWindow;
let renderer: vtkRenderer;
let imageActor: vtkImageSlice;
let atlasActor: vtkImageSlice;
let imageMapper: vtkImageMapper;
let atlasMapper: vtkImageMapper;
let imageOutline: Outline;
let atlasOutline: Outline;

const vtkContainer = ref<HTMLElement>();

const atlasVisbility = ref<boolean>(true);
const imageVisbility = ref<boolean>(true);

watch(()=> props.brainAtlas, setupBrainAtlas)

function setupBrainAtlas(){
  if (atlasMapper && props.brainAtlas) {
    atlasMapper.setInputData(props.brainAtlas)
    atlasOutline.setInputData(props.brainAtlas)

    atlasActor.setScale(1.15,1.15,1.15)
    atlasActor.setOrientation(-10,0,0)
    let pos = atlasActor.getPosition()
    atlasActor.setPosition(pos[0], pos[1], pos[2]+5)
  }
}

watch(()=> props.imageData, setupImageData);

function setupImageData(){
  if (props.imageData) {
    imageMapper.setInputData(props.imageData);
    imageOutline.setInputData(props.imageData);

    imageActor.getProperty().setColorWindow(props.maxValue+props.maxValue);
    imageActor.getProperty().setColorLevel(0);

    alignCamera(imageMapper)
  }
}

function alignCamera(mapper:vtkImageMapper){
  const camera = renderer.getActiveCamera();
    const position = camera.getFocalPoint();
    // offset along the slicing axis
    const normal = mapper.getSlicingModeNormal();
    position[0] += normal[0];
    position[1] += normal[1];
    position[2] += normal[2];
    camera.setPosition(...position);
    switch (mapper.getSlicingMode()) {
      case SlicingMode.X:
        camera.setViewUp([0, 0, 1]);
        break;
      case SlicingMode.Y:
        camera.setViewUp([0, 0, 1]);
        break;
      case SlicingMode.Z:
        camera.setViewUp([0, -1, 0]);
        break;
      default:
    }
    camera.setParallelProjection(true);
    renderer.resetCamera();

    renderWindow.render();
}

function setVisiblities(){
  if (imageActor && imageMapper) {
    imageActor.setVisibility(imageVisbility.value);
    renderWindow.render();
  }
  if (atlasActor && atlasMapper) {
    atlasActor.setVisibility(atlasVisbility.value);
    renderWindow.render();
  }
}

onMounted(()=>{
  fullRenderWindow = vtkFullScreenRenderWindow.newInstance({
      container: vtkContainer.value,
  });

  imageMapper = vtkImageMapper.newInstance();
  imageMapper.setSliceAtFocalPoint(true);
  imageMapper.setSlicingMode(props.plane == MedicalPlanes.sagittal ? SlicingMode.X :
                        props.plane == MedicalPlanes.axial ? SlicingMode.Z :
                        props.plane == MedicalPlanes.coronal ? SlicingMode.Y : SlicingMode.X);

  atlasMapper = vtkImageMapper.newInstance();
  atlasMapper.setSliceAtFocalPoint(true);
  atlasMapper.setSlicingMode(props.plane == MedicalPlanes.sagittal ? SlicingMode.X :
                        props.plane == MedicalPlanes.axial ? SlicingMode.Z :
                        props.plane == MedicalPlanes.coronal ? SlicingMode.Y : SlicingMode.X);

  imageMapper.setResolveCoincidentTopology(Resolve.PolygonOffset);
  imageMapper.setRelativeCoincidentTopologyLineOffsetParameters(0, -66000);
  imageMapper.setRelativeCoincidentTopologyPolygonOffsetParameters(0, -66000);
  imageMapper.setRelativeCoincidentTopologyPointOffsetParameters(0, -66000);
  imageMapper.setResolveCoincidentTopology(Resolve.PolygonOffset);
  atlasMapper.setRelativeCoincidentTopologyLineOffsetParameters(-1, -1);
  atlasMapper.setRelativeCoincidentTopologyPolygonOffsetParameters(-1, -1);
  atlasMapper.setRelativeCoincidentTopologyPointOffsetParameters(-1, -1);

  const rgb = vtkColorTransferFunction.newInstance();
  rgb.addRGBPoint(-30, 0.647, 0, 0.149);
  rgb.addRGBPoint(0, 0.968, 0.972, 0.678);
  rgb.addRGBPoint(30, 0, 0.407, 0.215);

  const ofun = vtkPiecewiseFunction.newInstance();
  ofun.addPoint(-5, 1);
  ofun.addPoint(0, 0);
  ofun.addPoint(5, 1);

  imageActor = vtkImageSlice.newInstance();
  imageActor.getProperty().setRGBTransferFunction(0, rgb);
  imageActor.getProperty().setPiecewiseFunction(0, ofun);
  imageActor.setMapper(imageMapper);     

  atlasActor = vtkImageSlice.newInstance();
  atlasActor.setMapper(atlasMapper);     

  imageOutline = new Outline()
  atlasOutline = new Outline()

  renderer = fullRenderWindow.getRenderer();
  renderWindow = fullRenderWindow.getRenderWindow();

  renderer.addActor(atlasActor);
  renderer.addActor(imageActor);
  // renderer.addActor(imageOutline.actor);
  // renderer.addActor(atlasOutline.actor);

  renderer.setBackground(0,0,0)

  const iStyle = vtkInteractorStyleImage.newInstance();
  const interactor = renderWindow.getInteractor()
  interactor.setInteractorStyle(iStyle);
  interactor.onMouseWheel(()=>{
    currentSlice.value = numeral(imageMapper.getSlice()).format('0.[00]')
  })

  setupBrainAtlas()
  setupImageData()
})

onBeforeUnmount(() => {
    imageActor.delete();
    imageMapper.delete();
    atlasActor.delete();
    atlasMapper.delete();
    fullRenderWindow.delete();
});
</script>

<template>
  <div class="position-relative w-100 h-100">
    <div class="position-absolute w-100 d-flex justify-content-between align-items-center text-light p-2">
      <div class="w-333 text-start"></div>
      <div class="w-333 text-center">
        <h3>{{ title }}</h3>
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
        <div class="d-flex flex-row">
          <div>Current slice:</div>
          <div>{{ currentSlice }}</div>
        </div>
      </div>
    </div>
    <div class="w-100 h-100" ref="vtkContainer"/>    
  </div>
</template>

<style scoped>
  
</style>
