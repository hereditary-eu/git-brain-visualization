<script setup lang="ts">
import {onMounted, watchEffect, unref, ref, onBeforeUnmount} from 'vue';

import '@kitware/vtk.js/Rendering/Profiles/Geometry';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkActor           from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper          from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkConeSource      from '@kitware/vtk.js/Filters/Sources/ConeSource';
import vtkRenderWindow    from '@kitware/vtk.js/Rendering/Core/RenderWindow';
import vtkRenderer        from '@kitware/vtk.js/Rendering/Core/Renderer';
import vtkImageData  from '@kitware/vtk.js/Common/DataModel/ImageData'

import { MedicalPlanes } from '../../utils/consts'

const props = defineProps<{ imageData: vtkImageData | undefined, plane: MedicalPlanes}>()

const title = ref<string>(props.plane == MedicalPlanes.axial ? 'Axial' :
                          props.plane == MedicalPlanes.coronal ? 'Coronal' :
                          props.plane == MedicalPlanes.sagittal ? 'Sagittal' : '')

interface Context {
    genericRenderWindow : vtkFullScreenRenderWindow,
    renderWindow: vtkRenderWindow,
    renderer: vtkRenderer,
    coneSource: vtkConeSource,
    actor: vtkActor,
    mapper: vtkMapper,
}

const vtkContainer = ref<HTMLElement>();
const context = ref<Context>();

watchEffect(() => {
  if (context.value) {
    context.value.renderWindow.render();
  }
});

onMounted(()=>{
    if (!context.value) {
        const genericRenderWindow = vtkFullScreenRenderWindow.newInstance({
            container: vtkContainer.value,
        });
        const coneSource = vtkConeSource.newInstance({ height: 1.0 });

        const mapper = vtkMapper.newInstance();
        mapper.setInputConnection(coneSource.getOutputPort());

        const actor = vtkActor.newInstance();
        actor.setMapper(mapper);

        const renderer = genericRenderWindow.getRenderer();
        const renderWindow = genericRenderWindow.getRenderWindow();

        renderer.addActor(actor);
        renderer.resetCamera();
        renderWindow.render();

        context.value = {
            "genericRenderWindow":genericRenderWindow,
            "renderWindow":renderWindow,
            "renderer":renderer,
            "coneSource":coneSource,
            "actor":actor,
            "mapper":mapper,
        };
  }
})

onBeforeUnmount(() => {
  if (context.value) {
    const { genericRenderWindow, coneSource, actor, mapper } = context.value;
    actor.delete();
    mapper.delete();
    coneSource.delete();
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
