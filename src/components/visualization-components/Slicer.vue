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


const { SlicingMode } = Constants;

import { MedicalPlanes } from '../../utils/consts'

const props = defineProps<{ imageData: vtkImageData | undefined, 
                            plane: MedicalPlanes
                            maxValue: number}>()

const title = ref<string>(props.plane == MedicalPlanes.axial ? 'Axial' :
                          props.plane == MedicalPlanes.coronal ? 'Coronal' :
                          props.plane == MedicalPlanes.sagittal ? 'Sagittal' : '')

interface Context {
    genericRenderWindow : vtkFullScreenRenderWindow,
    renderWindow: vtkRenderWindow,
    renderer: vtkRenderer,
    actor: vtkImageSlice,
    mapper: vtkImageMapper,
}

const vtkContainer = ref<HTMLElement>();
const context = ref<Context>();

watch(()=> props.imageData, ()=>{
  if (context.value && props.imageData) {
    context.value.mapper.setInputData(props.imageData);

    context.value.actor.getProperty().setColorWindow(props.maxValue+props.maxValue);
    context.value.actor.getProperty().setColorLevel(0);

    const camera = context.value.renderer.getActiveCamera();
    const position = camera.getFocalPoint();
    // offset along the slicing axis
    const normal = context.value.mapper.getSlicingModeNormal();
    position[0] += normal[0];
    position[1] += normal[1];
    position[2] += normal[2];
    camera.setPosition(...position);
    switch (context.value.mapper.getSlicingMode()) {
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
    context.value.renderer.resetCamera();
    context.value.renderWindow.render();
  }
});

onMounted(()=>{
    if (!context.value) {
        const genericRenderWindow = vtkFullScreenRenderWindow.newInstance({
            container: vtkContainer.value,
        });

        const mapper = vtkImageMapper.newInstance();
        mapper.setSliceAtFocalPoint(true);
        mapper.setSlicingMode(props.plane == MedicalPlanes.sagittal ? SlicingMode.X :
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

        const actor = vtkImageSlice.newInstance();
        actor.getProperty().setRGBTransferFunction(0, rgb);
        actor.getProperty().setPiecewiseFunction(0, ofun);
        actor.setMapper(mapper);     

        const renderer = genericRenderWindow.getRenderer();
        const renderWindow = genericRenderWindow.getRenderWindow();

        renderer.addActor(actor);

        const iStyle = vtkInteractorStyleImage.newInstance();
        renderWindow.getInteractor().setInteractorStyle(iStyle);

        context.value = {
            "genericRenderWindow":genericRenderWindow,
            "renderWindow":renderWindow,
            "renderer":renderer,
            "actor":actor,
            "mapper":mapper,
        };
  }
})

onBeforeUnmount(() => {
  if (context.value) {
    const { genericRenderWindow, actor, mapper } = context.value;
    actor.delete();
    mapper.delete();
    genericRenderWindow.delete();
    context.value = undefined;
  }
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
