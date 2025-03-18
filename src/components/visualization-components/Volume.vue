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

interface Context {
    genericRenderWindow : vtkFullScreenRenderWindow,
    renderWindow: vtkRenderWindow,
    renderer: vtkRenderer,
    volume: vtkVolume,
    mapper: vtkVolumeMapper,
}

const vtkContainer = ref<HTMLElement>();
const context = ref<Context>();

const props = defineProps<{ imageData : vtkImageData | undefined}>()

watch(()=> props.imageData, ()=>{
    if(context.value && props.imageData){
        context.value.mapper.setInputData(props.imageData);
        context.value.renderer.resetCamera(props.imageData.getBounds())
        context.value.renderWindow.render();
    }
})

onMounted(()=>{
    if (!context.value) {
        const genericRenderWindow = vtkFullScreenRenderWindow.newInstance({
            container: vtkContainer.value,
        });

        const volume = vtkVolume.newInstance();
        const mapper = vtkVolumeMapper.newInstance();        
        volume.setMapper(mapper);

        const renderer = genericRenderWindow.getRenderer();
        const renderWindow = genericRenderWindow.getRenderWindow();

        renderer.addVolume(volume);
        renderer.resetCamera();

        // create color and opacity transfer functions
        const ctfun = vtkColorTransferFunction.newInstance();
        ctfun.addRGBPoint(-30, 0.647, 0, 0.149);
        ctfun.addRGBPoint(0, 0.968, 0.972, 0.678);
        ctfun.addRGBPoint(30, 0, 0.407, 0.215);

        const ofun = vtkPiecewiseFunction.newInstance();
        ofun.addPoint(-30, 1.0);
        ofun.addPoint(0, 0.0);
        ofun.addPoint(30, 1.0);

        volume.getProperty().setRGBTransferFunction(0, ctfun);
        volume.getProperty().setScalarOpacity(0, ofun);
        volume.getProperty().setScalarOpacityUnitDistance(0, 4.5);
        volume.getProperty().setInterpolationTypeToFastLinear();

        context.value = {
            "genericRenderWindow":genericRenderWindow,
            "renderWindow":renderWindow,
            "renderer":renderer,
            "volume":volume,
            "mapper":mapper,
        };
  }
})

onBeforeUnmount(() => {
  if (context.value) {
    const { genericRenderWindow, volume, mapper } = context.value;
    volume.delete();
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
            <h3 class="text-light">Volume</h3>
            <div/>
        </div>
        <div class="w-100 h-100" ref="vtkContainer"/>    
    </div>
</template>

<style scoped>

</style>
