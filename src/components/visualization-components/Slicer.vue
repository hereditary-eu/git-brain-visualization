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


const { SlicingMode } = Constants;

import { MedicalPlanes } from '../../utils/consts'

const props = defineProps<{ imageData: vtkImageData | undefined, 
                            brainAtlas: vtkImageData | undefined,
                            plane: MedicalPlanes,
                            maxValue: number}>()

const title = ref<string>(props.plane == MedicalPlanes.axial ? 'Axial' :
                          props.plane == MedicalPlanes.coronal ? 'Coronal' :
                          props.plane == MedicalPlanes.sagittal ? 'Sagittal' : '')

let fullRenderWindow : vtkFullScreenRenderWindow;
let renderWindow: vtkRenderWindow;
let renderer: vtkRenderer;
let imageActor: vtkImageSlice;
let atlasActor: vtkImageSlice;
let imageMapper: vtkImageMapper;
let atlasMapper: vtkImageMapper;

const vtkContainer = ref<HTMLElement>();

watch(()=> props.brainAtlas, ()=>{
  if (atlasMapper && props.brainAtlas) {
    atlasMapper.setInputData(props.brainAtlas)

    const camera = renderer.getActiveCamera();
    const position = camera.getFocalPoint();
    // offset along the slicing axis
    const normal = atlasMapper.getSlicingModeNormal();
    position[0] += normal[0];
    position[1] += normal[1];
    position[2] += normal[2];
    camera.setPosition(...position);
    switch (atlasMapper.getSlicingMode()) {
      case SlicingMode.X:
        camera.setViewUp([0, 1, 0]);
        break;
      case SlicingMode.Y:
        camera.setViewUp([1, 0, 0]);
        break;
      case SlicingMode.Z:
        camera.setViewUp([0, 1, 0]);
        break;
      default:
    }
    camera.setParallelProjection(true);
    renderer.resetCamera();

    renderWindow.render()
  }
})

watch(()=> props.imageData, setupImageData);

function setupImageData(){
  if (props.imageData) {
    imageMapper.setInputData(props.imageData);

    imageActor.getProperty().setColorWindow(props.maxValue+props.maxValue);
    imageActor.getProperty().setColorLevel(0);

    const camera = renderer.getActiveCamera();
    const position = camera.getFocalPoint();
    // offset along the slicing axis
    const normal = imageMapper.getSlicingModeNormal();
    position[0] += normal[0];
    position[1] += normal[1];
    position[2] += normal[2];
    camera.setPosition(...position);
    switch (imageMapper.getSlicingMode()) {
      case SlicingMode.X:
        camera.setViewUp([0, 1, 0]);
        break;
      case SlicingMode.Y:
        camera.setViewUp([1, 0, 0]);
        break;
      case SlicingMode.Z:
        camera.setViewUp([0, 1, 0]);
        break;
      default:
    }
    camera.setParallelProjection(true);
    renderer.resetCamera();

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

  renderer = fullRenderWindow.getRenderer();
  renderWindow = fullRenderWindow.getRenderWindow();

  renderer.addActor(atlasActor);
  renderer.addActor(imageActor);

  const iStyle = vtkInteractorStyleImage.newInstance();
  const interactor = renderWindow.getInteractor()
  interactor.setInteractorStyle(iStyle);
  interactor.onMouseWheel(()=>{
    //console.log(context.value?.mapper.getSlice())
  })
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
    <div class="position-absolute w-100 d-flex justify-content-between">
      <div/>
      <h3 class="text-light">{{ title }}</h3>
      <div/>
    </div>
    <div class="w-100 h-100" ref="vtkContainer"/>    
  </div>
</template>

<style scoped>

</style>
