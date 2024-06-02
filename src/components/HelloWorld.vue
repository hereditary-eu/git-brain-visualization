<script setup lang="ts">
import { ref, unref, onMounted, onBeforeUnmount, watchEffect } from 'vue';

import '@kitware/vtk.js/Rendering/Profiles/Geometry';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';

import vtkActor           from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper          from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkConeSource      from '@kitware/vtk.js/Filters/Sources/ConeSource';
import vtkRenderWindow from '@kitware/vtk.js/Rendering/Core/RenderWindow';
import vtkRenderer from '@kitware/vtk.js/Rendering/Core/Renderer';

interface Context {
  fullScreenRenderer : vtkFullScreenRenderWindow,
  renderWindow: vtkRenderWindow,
  renderer: vtkRenderer,
  coneSource: vtkConeSource,
  actor: vtkActor,
  mapper: vtkMapper,
}

const vtkContainer = ref<HTMLElement>();
const context = ref<Context>();
const coneResolution = ref(6);
const representation = ref(2);

function setConeResolution(res : any) {
  coneResolution.value = Number(res);
}

function setRepresentation(rep : any) {
  representation.value = Number(rep);
}

watchEffect(() => {
  const res = unref(coneResolution);
  const rep = unref(representation);
  if (context.value) {
    context.value.coneSource.setResolution(res);
    context.value.actor.getProperty().setRepresentation(rep);
    context.value.renderWindow.render();
  }
});

onMounted(() => {
  if (!context.value) {
    const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
      container: vtkContainer.value,
    });
    const coneSource = vtkConeSource.newInstance({ height: 1.0 });

    const mapper = vtkMapper.newInstance();
    mapper.setInputConnection(coneSource.getOutputPort());

    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);

    const renderer = fullScreenRenderer.getRenderer();
    const renderWindow = fullScreenRenderer.getRenderWindow();

    renderer.addActor(actor);
    renderer.resetCamera();
    renderWindow.render();

    context.value = {
      "fullScreenRenderer":fullScreenRenderer,
      "renderWindow":renderWindow,
      "renderer":renderer,
      "coneSource":coneSource,
      "actor":actor,
      "mapper":mapper,
    };
  }
});

onBeforeUnmount(() => {
  if (context.value) {
    const { fullScreenRenderer, coneSource, actor, mapper } = context.value;
    actor.delete();
    mapper.delete();
    coneSource.delete();
    fullScreenRenderer.delete();
    context.value = undefined;
  }
});
</script>

<template>
  <div>
    <div ref="vtkContainer" />
    <table class="controls">
      <tbody>
        <tr>
          <td>
            <select
              style="width: 100%"
              :value="representation"
              @change="setRepresentation(($event.target as HTMLSelectElement).value)"
            >
              <option value="0">Points</option>
              <option value="1">Wireframe</option>
              <option value="2">Surface</option>
            </select>
          </td>
        </tr>
        <tr>
          <td>
            <input
              type="range"
              min="4"
              max="80"
              :value="coneResolution"
              @input="setConeResolution(($event.target as HTMLSelectElement).value)"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
