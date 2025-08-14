<script lang="ts">
interface TransformCorrection {
  position: Array<number>,
  rotation: Array<number>,
  scale: Array<number>,
}

export { type TransformCorrection } 
</script>

<script setup lang="ts">
import {onMounted, watch, ref, onBeforeUnmount, withDefaults, defineEmits, toRaw} from 'vue';
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

import InteractorStyleImageNoJump from '../../vtk-derivatives/InteractorStyleImageNoJump'
//import IRenderWindowInteractorEvent from '@kitware/vtk.js/Rendering/Core/RenderWindowInteractor';

import numeral from 'numeral';

import { MedicalPlanes } from '../../utils/consts'
import Outline from '../../vtk-derivatives/Outline';
import { Resolve } from '@kitware/vtk.js/Rendering/Core/Mapper/CoincidentTopologyHelper';
import numbro from 'numbro';

const { SlicingMode } = Constants;

const props = withDefaults(defineProps<{ imageData: vtkImageData | undefined, 
                            referenceAtlas: vtkImageData | undefined,
                            regionAtlas: vtkImageData | undefined,
                            plane: MedicalPlanes,
                            maxValue: number,
                            disableSlicing?: boolean,
                            atlasCorrection: TransformCorrection
                          }>(), {
                            disableSlicing: false
                          })

const title = ref<string>(props.plane == MedicalPlanes.axial ? 'Axial' :
                          props.plane == MedicalPlanes.coronal ? 'Coronal' :
                          props.plane == MedicalPlanes.sagittal ? 'Sagittal' : '')

const currentSlice = ref<string>("0")
const currentPos = ref<string>("0")

const settingsVisible = ref<boolean>(false)

let initialPosRefAtlas = [0,0,0]
let initialPosRegAtlas = [0,0,0]

const localTransformCorrection = ref<TransformCorrection>({
  position: [0,0,0],
  rotation: [0,0,0],
  scale: [1,1,1]
})

const emit = defineEmits<{
  (e: 'onTransformCorrection', value: TransformCorrection): void
}>()

let fullRenderWindow : vtkFullScreenRenderWindow;
let renderWindow: vtkRenderWindow;
let renderer: vtkRenderer;
let imageActor: vtkImageSlice;
let referenceAtlasActor: vtkImageSlice;
let regionAtlasActor: vtkImageSlice;
let imageMapper: vtkImageMapper;
let referenceAtlasMapper: vtkImageMapper;
let regionAtlasMapper: vtkImageMapper;
let imageOutline: Outline;
let atlasOutline: Outline;

const vtkContainer = ref<HTMLElement>();

const referenceAtlasVisbility = ref<boolean>(true);
const regionAtlasVisbility = ref<boolean>(false);
const imageVisbility = ref<boolean>(true);

watch(()=> props.referenceAtlas, setupReferenceAtlas)
watch(()=> props.regionAtlas, setupRegionAtlas)
watch(()=> props.atlasCorrection, changeTransformCorrection, {deep:true})

function setupReferenceAtlas(){
  if (referenceAtlasMapper && props.referenceAtlas) {
    referenceAtlasMapper.setInputData(props.referenceAtlas)

    initialPosRefAtlas = referenceAtlasActor.getPosition()

    referenceAtlasActor.setScale(props.atlasCorrection.scale[0],props.atlasCorrection.scale[1],props.atlasCorrection.scale[2])
    referenceAtlasActor.setOrientation(props.atlasCorrection.rotation[0],props.atlasCorrection.rotation[1],props.atlasCorrection.rotation[2])
    referenceAtlasActor.setPosition(initialPosRefAtlas[0]+props.atlasCorrection.position[0], 
                                 initialPosRefAtlas[1]+props.atlasCorrection.position[1], 
                                 initialPosRefAtlas[2]+props.atlasCorrection.position[2])
  }
}

function setupRegionAtlas(){
  if (regionAtlasMapper && props.regionAtlas) {
    regionAtlasMapper.setInputData(props.regionAtlas)

    initialPosRegAtlas = regionAtlasActor.getPosition()

    regionAtlasActor.setScale(props.atlasCorrection.scale[0],props.atlasCorrection.scale[1],props.atlasCorrection.scale[2])
    regionAtlasActor.setOrientation(props.atlasCorrection.rotation[0],props.atlasCorrection.rotation[1],props.atlasCorrection.rotation[2])
    regionAtlasActor.setPosition(initialPosRegAtlas[0]+props.atlasCorrection.position[0], 
                                 initialPosRegAtlas[1]+props.atlasCorrection.position[1], 
                                 initialPosRegAtlas[2]+props.atlasCorrection.position[2])

    //alignCamera(regionAtlasMapper)
  }
}

function changeTransformCorrection(){
  localTransformCorrection.value = props.atlasCorrection;
  referenceAtlasActor.setScale(props.atlasCorrection.scale[0],props.atlasCorrection.scale[1],props.atlasCorrection.scale[2])
    referenceAtlasActor.setOrientation(props.atlasCorrection.rotation[0],props.atlasCorrection.rotation[1],props.atlasCorrection.rotation[2])
    referenceAtlasActor.setPosition(initialPosRefAtlas[0]+props.atlasCorrection.position[0], 
                                 initialPosRefAtlas[1]+props.atlasCorrection.position[1], 
                                 initialPosRefAtlas[2]+props.atlasCorrection.position[2])
  regionAtlasActor.setScale(props.atlasCorrection.scale[0],props.atlasCorrection.scale[1],props.atlasCorrection.scale[2])
    regionAtlasActor.setOrientation(props.atlasCorrection.rotation[0],props.atlasCorrection.rotation[1],props.atlasCorrection.rotation[2])
    regionAtlasActor.setPosition(initialPosRegAtlas[0]+props.atlasCorrection.position[0], 
                                 initialPosRegAtlas[1]+props.atlasCorrection.position[1], 
                                 initialPosRegAtlas[2]+props.atlasCorrection.position[2])
  renderWindow.render()
}

watch(()=> props.imageData, setupImageData);

function setupImageData(){
  if (props.imageData) {
    imageMapper.setInputData(props.imageData);
    imageOutline.setInputData(props.imageData);

    imageActor.getProperty().setColorWindow(props.maxValue+props.maxValue);
    imageActor.getProperty().setColorLevel(0);

    alignCamera(imageMapper)
    setVisiblities();
    //renderWindow.render();
  }
}

function alignCamera(mapper:vtkImageMapper){
  const camera = renderer.getActiveCamera();
    const position = camera.getFocalPoint();
    // offset along the slicing axis
    const normal = mapper.getSlicingModeNormal();
    
    switch (mapper.getSlicingMode()) {
      case SlicingMode.X:
        position[0] += normal[0];
        position[1] += normal[1];
        position[2] += normal[2];
        camera.setPosition(...position);
        camera.setViewUp([0, 0, 1]);
        break;
      case SlicingMode.Y:
        position[0] += normal[0];
        position[1] += -normal[1];
        position[2] += normal[2];
        camera.setPosition(...position);
        camera.setViewUp([0, 0, 1]);
        break;
      case SlicingMode.Z:
        position[0] += normal[0];
        position[1] += normal[1];
        position[2] += -normal[2];
        camera.setPosition(...position);
        camera.setViewUp([0, -1, 0]);
        break;
      default:
    }
    camera.setParallelProjection(true);
    renderer.resetCamera();

    renderWindow.render();
}

function setVisiblities(type?:string){

    switch(type){
      case 'reference':
        regionAtlasVisbility.value = referenceAtlasVisbility.value ? false : regionAtlasVisbility.value;
      break;
      case 'region':
        referenceAtlasVisbility.value = regionAtlasVisbility.value ? false : referenceAtlasVisbility.value;
      break;
      default:
      break;
    }

  if (imageActor && imageMapper) {
    imageActor.setVisibility(imageVisbility.value);
    renderWindow.render();
  }
  if (referenceAtlasActor && referenceAtlasMapper) {
    referenceAtlasActor.setVisibility(referenceAtlasVisbility.value);
    renderWindow.render();
  }
  if (regionAtlasActor && regionAtlasMapper) {
    regionAtlasActor.setVisibility(regionAtlasVisbility.value);
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

  referenceAtlasMapper = vtkImageMapper.newInstance();
  referenceAtlasMapper.setSliceAtFocalPoint(true);
  referenceAtlasMapper.setSlicingMode(props.plane == MedicalPlanes.sagittal ? SlicingMode.X :
                        props.plane == MedicalPlanes.axial ? SlicingMode.Z :
                        props.plane == MedicalPlanes.coronal ? SlicingMode.Y : SlicingMode.X);

  regionAtlasMapper = vtkImageMapper.newInstance();
  regionAtlasMapper.setSliceAtFocalPoint(true);
  regionAtlasMapper.setSlicingMode(props.plane == MedicalPlanes.sagittal ? SlicingMode.X :
                        props.plane == MedicalPlanes.axial ? SlicingMode.Z :
                        props.plane == MedicalPlanes.coronal ? SlicingMode.Y : SlicingMode.X);

  imageMapper.setResolveCoincidentTopology(Resolve.PolygonOffset);
  imageMapper.setRelativeCoincidentTopologyLineOffsetParameters(0, -66000);
  imageMapper.setRelativeCoincidentTopologyPolygonOffsetParameters(0, -66000);
  imageMapper.setRelativeCoincidentTopologyPointOffsetParameters(0, -66000);
  imageMapper.setResolveCoincidentTopology(Resolve.PolygonOffset);
  referenceAtlasMapper.setRelativeCoincidentTopologyLineOffsetParameters(-1, -2);
  referenceAtlasMapper.setRelativeCoincidentTopologyPolygonOffsetParameters(-1, -2);
  referenceAtlasMapper.setRelativeCoincidentTopologyPointOffsetParameters(-1, -2);
  regionAtlasMapper.setRelativeCoincidentTopologyLineOffsetParameters(-1, -1);
  regionAtlasMapper.setRelativeCoincidentTopologyPolygonOffsetParameters(-1, -1);
  regionAtlasMapper.setRelativeCoincidentTopologyPointOffsetParameters(-1, -1);

  const rgb = vtkColorTransferFunction.newInstance();
  rgb.addRGBPoint(-30, 0.647, 0, 0.149);
  rgb.addRGBPoint(0, 0.968, 0.972, 0.678);
  rgb.addRGBPoint(30, 0, 0.407, 0.215);

  const ofun = vtkPiecewiseFunction.newInstance();
  ofun.addPoint(-2, 1);
  ofun.addPoint(0, 0);
  ofun.addPoint(2, 1);

  imageActor = vtkImageSlice.newInstance();
  imageActor.getProperty().setRGBTransferFunction(0, rgb);
  imageActor.getProperty().setPiecewiseFunction(0, ofun);
  imageActor.setMapper(imageMapper);     

  referenceAtlasActor = vtkImageSlice.newInstance();
  referenceAtlasActor.setMapper(referenceAtlasMapper);    
  
  regionAtlasActor = vtkImageSlice.newInstance();
  regionAtlasActor.setMapper(regionAtlasMapper);    

  imageOutline = new Outline()
  atlasOutline = new Outline()

  renderer = fullRenderWindow.getRenderer();
  renderWindow = fullRenderWindow.getRenderWindow();

  renderer.addActor(referenceAtlasActor);
  renderer.addActor(regionAtlasActor);
  renderer.addActor(imageActor);
  // renderer.addActor(imageOutline.actor);
  // renderer.addActor(atlasOutline.actor);

  renderer.setBackground(0,0,0)

  if(!props.disableSlicing){
    const iStyle = InteractorStyleImageNoJump.newInstance();
    const interactor = renderWindow.getInteractor()
    interactor.setInteractorStyle(iStyle);
    interactor.onMouseWheel(()=>{
      currentSlice.value = numbro(imageMapper.getSlice()).format({trimMantissa: true, mantissa: 4})
    })
    interactor.onMouseMove((e)=>{
      
    })
  }

  setupReferenceAtlas()
  setupRegionAtlas()
  setupImageData()
  changeTransformCorrection()
})

onBeforeUnmount(() => {
    imageActor.delete();
    imageMapper.delete();
    referenceAtlasActor.delete();
    referenceAtlasMapper.delete();
    regionAtlasActor.delete();
    regionAtlasMapper.delete();
    fullRenderWindow.delete();
});
</script>

<template>
  <div class="position-relative w-100 h-100">
    <div class="position-absolute w-100 d-flex justify-content-between align-items-start text-light p-2">
      <div class="w-40 text-start">
        <div class="d-flex flex-column">
          <img style="cursor: pointer; width: 25px;" src="../../assets/icons/gear.png" @click="settingsVisible=!settingsVisible"/>
          <h6 v-if="settingsVisible">Atlas correction:</h6>
        </div>
        <div v-show="settingsVisible">
          <div>Translate</div>
          <div class="input-group">
            <input class="form-control" type="number" step=0.1 v-model="localTransformCorrection.position[0]" @input="emit('onTransformCorrection',localTransformCorrection)"/>
            <input class="form-control" type="number" step=0.1 v-model="localTransformCorrection.position[1]" @input="emit('onTransformCorrection',localTransformCorrection)"/>
            <input class="form-control" type="number" step=0.1 v-model="localTransformCorrection.position[2]" @input="emit('onTransformCorrection',localTransformCorrection)"/>
          </div>
          <div>Rotation</div>
          <div class="input-group">

            <input class="form-control" type="number" step=0.1 v-model="localTransformCorrection.rotation[0]" @input="emit('onTransformCorrection',localTransformCorrection)"/>
            <input class="form-control" type="number" step=0.1 v-model="localTransformCorrection.rotation[1]" @input="emit('onTransformCorrection',localTransformCorrection)"/>
            <input class="form-control" type="number" step=0.1 v-model="localTransformCorrection.rotation[2]" @input="emit('onTransformCorrection',localTransformCorrection)"/>
          </div>
          <div>Scale</div>
          <div class="input-group">

            <input class="form-control" type="number" step=0.1 v-model="localTransformCorrection.scale[0]" @input="emit('onTransformCorrection',localTransformCorrection)"/>
            <input class="form-control" type="number" step=0.1 v-model="localTransformCorrection.scale[1]" @input="emit('onTransformCorrection',localTransformCorrection)"/>
            <input class="form-control" type="number" step=0.1 v-model="localTransformCorrection.scale[2]" @input="emit('onTransformCorrection',localTransformCorrection)"/>
          </div>
        </div>
      </div>
      <div class="w-20 text-center">
        <h3>{{ title }}</h3>
      </div>
      <div class="w-40 d-flex flex-column justify-content-start align-items-end text-light">
        <div class="form-check-reverse form-switch">
          <label class="form-check-label" for="atlasCheck">Colin27_T1_seg_MNI atlas</label>
          <input class="form-check-input" role="switch" id="atlasCheck" type="checkbox" v-model="referenceAtlasVisbility" @change="setVisiblities('reference')"/>
        </div>
        <div class="form-check-reverse form-switch">
          <label class="form-check-label" for="atlasCheck">Talairach region atlas</label>
          <input class="form-check-input" role="switch" id="atlasCheck" type="checkbox" v-model="regionAtlasVisbility" @change="setVisiblities('region')"/>
        </div>
        <div class="form-check-reverse form-switch">
          <label class="form-check-label" for="zscoreCheck">Z-scores</label>
          <input class="form-check-input" role="switch" id="zscoreCheck" type="checkbox" v-model="imageVisbility" @change="setVisiblities()"/>
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
