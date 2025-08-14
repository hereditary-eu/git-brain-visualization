import macro from '@kitware/vtk.js/macros';
import vtkInteractorStyleImage from '@kitware/vtk.js/Interaction/Style/InteractorStyleImage';
import { States } from '@kitware/vtk.js/Rendering/Core/InteractorStyle/Constants';

function vtkInteractorStyleImageNoJump(publicAPI, model) {
  vtkInteractorStyleImage.extend(publicAPI, model);

  const superHandleMouseMove = publicAPI.handleMouseMove;
  publicAPI.handleMouseMove = (callData) => {
    if (model.state === States.IS_SLICE) return;
    superHandleMouseMove(callData);
  };
}

export const newInstance = macro.newInstance(vtkInteractorStyleImageNoJump, 'vtkInteractorStyleImageNoJump');
export default { newInstance, extend: vtkInteractorStyleImageNoJump };